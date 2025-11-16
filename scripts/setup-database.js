#!/usr/bin/env node
/**
 * Database Setup Script
 * 
 * This script helps you set up the latina database on your RDS instance.
 * 
 * Usage:
 *   node scripts/setup-database.js
 * 
 * Make sure you have your .env.local file configured with:
 *   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: 'postgres', // Connect to default database first
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function setup() {
  console.log('🚀 Starting database setup...\n');
  
  // Check required env vars
  const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    console.error('   Make sure .env.local file exists with DB_HOST, DB_USER, DB_PASSWORD');
    process.exit(1);
  }
  
  try {
    // Test connection
    console.log('📡 Testing connection to RDS instance...');
    await pool.query('SELECT NOW()');
    console.log('✅ Connected to RDS instance\n');
    
    // Check if database exists
    console.log('🔍 Checking if database exists...');
    const dbCheck = await pool.query(
      "SELECT 1 FROM pg_database WHERE datname = 'latina'"
    );
    
    if (dbCheck.rows.length > 0) {
      console.log('⚠️  Database "latina" already exists');
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise(resolve => {
        readline.question('Do you want to continue? This will run the schema. (y/n): ', resolve);
      });
      readline.close();
      
      if (answer.toLowerCase() !== 'y') {
        console.log('❌ Setup cancelled');
        await pool.end();
        process.exit(0);
      }
    } else {
      // Create database
      console.log('📦 Creating database "latina"...');
      await pool.query('CREATE DATABASE latina');
      console.log('✅ Database created\n');
    }
    
    // Close connection to postgres database
    await pool.end();
    
    // Connect to latina database
    console.log('🔌 Connecting to latina database...');
    const latinaPool = new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: 'latina',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    });
    
    // Check if tables already exist
    const tablesCheck = await latinaPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('projects', 'images', 'quotes')
    `);
    
    if (tablesCheck.rows.length > 0) {
      console.log('⚠️  Some tables already exist:', tablesCheck.rows.map(r => r.table_name).join(', '));
      console.log('   Running schema anyway (will fail on existing tables, but that\'s OK)\n');
    }
    
    // Read and execute schema
    console.log('📄 Reading schema file...');
    const schemaPath = path.join(__dirname, '../lib/db/schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found: ${schemaPath}`);
    }
    
    const schema = fs.readFileSync(schemaPath, 'utf8');
    console.log('⚙️  Executing schema...');
    
    // Execute schema (split by semicolons for better error handling)
    await latinaPool.query(schema);
    
    console.log('✅ Schema executed successfully\n');
    
    // Verify tables
    console.log('🔍 Verifying tables...');
    const tables = await latinaPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('📊 Tables created:', tables.rows.map(r => r.table_name).join(', '));
    console.log(`✅ Total: ${tables.rows.length} tables\n`);
    
    // Test a simple query
    console.log('🧪 Testing database...');
    const testResult = await latinaPool.query('SELECT COUNT(*) as count FROM projects');
    console.log(`✅ Database is ready! Projects table accessible (${testResult.rows[0].count} projects)\n`);
    
    await latinaPool.end();
    
    console.log('🎉 Database setup complete!');
    console.log('\nNext steps:');
    console.log('1. Make sure your .env.local has DB_NAME=latina');
    console.log('2. Test the connection: node scripts/test-connection.js');
    console.log('3. Start your app: npm run dev');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    
    if (error.message.includes('already exists')) {
      console.log('\n💡 Tip: Database or tables already exist. This is OK if you\'re re-running setup.');
    } else if (error.message.includes('password authentication')) {
      console.log('\n💡 Tip: Check your DB_USER and DB_PASSWORD in .env.local');
    } else if (error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Tip: Check your DB_HOST and security group settings');
    }
    
    process.exit(1);
  }
}

setup();

