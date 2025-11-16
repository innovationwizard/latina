import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const S3_UPLOAD_BUCKET = process.env.S3_UPLOAD_BUCKET || 'latina-uploads';
const S3_REGION = process.env.AWS_REGION || 'us-east-2';

const s3Client = new S3Client({
  region: S3_REGION,
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined,
});

// GET /api/projects/[id]/files - Get all files for a project, optionally filtered by workflow step
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const { searchParams } = new URL(request.url);
    const workflowStep = searchParams.get('workflow_step');

    // Get files from both design_files and images tables
    let filesSql = `
      SELECT 
        id, project_id, workflow_step, file_name as filename, file_url as url,
        storage_type, s3_key, s3_bucket, mime_type, file_size as size,
        description, created_at, 'file' as source
      FROM design_files
      WHERE project_id = $1
    `;
    const params_array: any[] = [projectId];
    let paramIndex = 2;

    if (workflowStep) {
      filesSql += ` AND workflow_step = $${paramIndex}`;
      params_array.push(workflowStep);
      paramIndex++;
    }

    filesSql += ' ORDER BY created_at DESC';

    const filesResult = await query(filesSql, params_array);

    // Also get images
    let imagesSql = `
      SELECT 
        id, project_id, workflow_step, filename,
        COALESCE(original_url, enhanced_url) as url,
        s3_key, s3_bucket, mime_type, NULL as size,
        NULL as description, created_at, 'image' as source
      FROM images
      WHERE project_id = $1 AND image_type IN ('photo', 'file')
    `;
    const imagesParams: any[] = [projectId];
    let imgParamIndex = 2;

    if (workflowStep) {
      imagesSql += ` AND workflow_step = $${imgParamIndex}`;
      imagesParams.push(workflowStep);
    }

    imagesSql += ' ORDER BY created_at DESC';

    const imagesResult = await query(imagesSql, imagesParams);

    return NextResponse.json({
      files: filesResult.rows,
      images: imagesResult.rows,
    });
  } catch (error: any) {
    console.error('Error fetching files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/files - Upload a file for a project
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const workflowStep = formData.get('workflow_step') as string | null;
    const description = formData.get('description') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!workflowStep) {
      return NextResponse.json(
        { error: 'Missing required field: workflow_step' },
        { status: 400 }
      );
    }

    // Upload to S3
    const buffer = Buffer.from(await file.arrayBuffer());
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const s3Key = `projects/${projectId}/${workflowStep}/${timestamp}-${safeName}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_UPLOAD_BUCKET,
        Key: s3Key,
        Body: buffer,
        ContentType: file.type || 'application/octet-stream',
      })
    );

    const fileUrl = `https://${S3_UPLOAD_BUCKET}.s3.${S3_REGION}.amazonaws.com/${s3Key}`;

    // Determine if it's an image or file
    const isImage = file.type.startsWith('image/');

    if (isImage) {
      // Save to images table
      const sql = `
        INSERT INTO images (
          project_id, workflow_step, image_type, original_url,
          s3_key, s3_bucket, filename, mime_type
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const result = await query(sql, [
        projectId,
        workflowStep,
        'photo',
        fileUrl,
        s3Key,
        S3_UPLOAD_BUCKET,
        file.name,
        file.type,
      ]);

      return NextResponse.json({ file: result.rows[0], type: 'image' }, { status: 201 });
    } else {
      // Save to design_files table
      const sql = `
        INSERT INTO design_files (
          project_id, workflow_step, file_type, file_name,
          file_url, storage_type, s3_key, s3_bucket, mime_type, file_size, description
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;

      const result = await query(sql, [
        projectId,
        workflowStep,
        'document',
        file.name,
        fileUrl,
        's3',
        s3Key,
        S3_UPLOAD_BUCKET,
        file.type,
        file.size,
        description || null,
      ]);

      return NextResponse.json({ file: result.rows[0], type: 'file' }, { status: 201 });
    }
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file', details: error.message },
      { status: 500 }
    );
  }
}

