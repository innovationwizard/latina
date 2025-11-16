# Database Setup Guide

This application uses PostgreSQL (AWS RDS) for data persistence.

## Database Schema

The schema is defined in `lib/db/schema.sql`. It includes:

- **projects** - Core project entity tracking workflow states
- **site_visits** - Measurements, photos, and notes from on-site visits
- **images** - Original uploads and enhanced versions (stored in S3)
- **quotes** - Quote calculations linked to projects
- **design_files** - Links to design files (Rhino, SketchUp, Canva, etc.)
- **client_reviews** - Track revision rounds and client feedback

## Workflow States

Projects progress through these states:
1. `lead` - Initial inquiry
2. `scheduled` - Visit scheduled
3. `site_visit` - Site visit completed
4. `design_phase` - Design work in progress
5. `client_review` - Awaiting client feedback
6. `quotation` - Quote being prepared
7. `technical_drawings` - Production drawings being created
8. `manufacturing` - In workshop
9. `installation` - Installation phase
10. `completed` - Project complete

## Environment Variables

Add these to your `.env.local` file:

```bash
# Database (AWS RDS PostgreSQL)
DB_HOST=your-rds-endpoint.region.rds.amazonaws.com
DB_PORT=5432
DB_NAME=latina
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_SSL=true

# AWS S3 (all 5 buckets required)
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_UPLOAD_BUCKET=latina-uploads
S3_IMAGES_BUCKET=latina-images
LEONARDO_S3_BUCKET=latina-leonardo-images
S3_DESIGNS_BUCKET=latina-designs
S3_NOT_IMAGES_BUCKET=latina-not-images

# Leonardo AI
LEONARDO_API_KEY=your-leonardo-api-key

# Authentication
AUTH_SECRET=your-very-long-random-secret-key-minimum-32-characters
```

## Quick Setup Checklist

✅ **See `docs/database-setup-guide.md` for complete step-by-step instructions**

1. **Create AWS RDS PostgreSQL instance** (see detailed guide)
   - Recommended: db.t3.micro or larger
   - Enable public access if needed (or use VPC)
   - Note the endpoint, port, and credentials

2. **Configure Security Group**
   - Allow inbound PostgreSQL (port 5432) from your IP or application

3. **Create database and run schema**
   ```bash
   # Create database
   psql -h your-rds-endpoint -U your-user -d postgres -c "CREATE DATABASE latina;"
   
   # Run schema
   psql -h your-rds-endpoint -U your-user -d latina -f lib/db/schema.sql
   ```

4. **Set environment variables** (see below)

5. **Test the connection**
   - The app will automatically test the connection on first API call
   - Check logs for any connection errors

## Database Migrations

For future schema changes, create migration files in `lib/db/migrations/` and apply them manually or with a migration tool.

