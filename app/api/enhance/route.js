import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// ============================================================================
// LEONARDO AI API CONFIGURATION
// ============================================================================

const LEONARDO_API_KEY = process.env.LEONARDO_API_KEY;
const BASE_URL = 'https://cloud.leonardo.ai/api/rest/v1';

const CONTROLNET_CANNY_ID = '20660B5C-3A83-406A-B233-6AAD728A3267';
const LEGACY_STRUCTURE_MODEL_ID = 'ac614f96-1082-45bf-be9d-757f2d31c174';
const PROMPT =
  'ultra-realistic, photorealistic interior design render, 8k, sharp focus, realistic textures on all surfaces, rich wood grain, soft fabric, polished marble, realistic global illumination and soft shadows';
const NEGATIVE_PROMPT =
  'drawn, sketch, illustration, cartoon, blurry, distorted, warped, ugly, noisy, grainy, unreal';

const S3_UPLOAD_BUCKET = process.env.S3_UPLOAD_BUCKET || 'latina-uploads';
const S3_REGION = process.env.AWS_REGION || 'us-east-2';
const hasExplicitCreds =
  Boolean(process.env.AWS_ACCESS_KEY_ID) && Boolean(process.env.AWS_SECRET_ACCESS_KEY);

const s3Client = new S3Client({
  region: S3_REGION,
  credentials: hasExplicitCreds
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined,
});

function buildGenerationPayload(imageId, width, height, mode) {
  const isStructure = mode === 'structure';

  const payload = {
    prompt: PROMPT,
    negative_prompt: NEGATIVE_PROMPT,
    guidance_scale: 7,
    num_images: 1,
    scheduler: 'KLMS',
    init_image_id: imageId,
    width: Math.min(width, 1024),
    height: Math.min(height, 1024),
    init_strength: isStructure ? 0.4 : 0.7,
    alchemy: !isStructure,
  };

  if (isStructure) {
    payload.modelId = LEGACY_STRUCTURE_MODEL_ID;
    payload.controlNet = {
      controlnetModelId: CONTROLNET_CANNY_ID,
      initImageId: imageId,
      weight: 0.75,
      preprocessor: false,
    };
  } else {
    payload.photoReal = true;
  }

  return payload;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function uploadToLeonardo(imageBuffer, extension) {
  try {
    // 1. Process the image
    console.log('Preprocessing image...');
    const processedBuffer = await sharp(imageBuffer)
      .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    console.log('Image processed, getting upload URL...');

    // 2. Get upload URL from Leonardo
    const initResponse = await fetch(`${BASE_URL}/init-image`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${LEONARDO_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ extension: 'jpg' }),
    });

    if (!initResponse.ok) {
      const errorText = await initResponse.text();
      throw new Error(`Failed to init upload: ${initResponse.status} - ${errorText}`);
    }

    const initData = await initResponse.json();
    console.log('=== LEONARDO /init-image RESPONSE ===');
    console.log(JSON.stringify(initData, null, 2));
    console.log('===================================');

    if (!initData.uploadInitImage) {
      throw new Error('API Error: The /init-image response did not contain "uploadInitImage".');
    }

    const { url: uploadUrl, id: imageId, fields: fieldsString } = initData.uploadInitImage;

    if (typeof fieldsString !== 'string') {
      throw new Error("API Error: 'fields' was not a string. API may have changed.");
    }

    console.log("Parsing 'fields' string into JSON object...");
    const fieldsObject = JSON.parse(fieldsString);

    const formData = new FormData();
    let foundKeyField = false;

    console.log('--- Appending Fields to FormData ---');
    for (const [key, value] of Object.entries(fieldsObject)) {
      console.log(`   -> Appending field: "${key}"`);
      formData.append(key, value);

      if (key.toLowerCase() === 'key') {
        foundKeyField = true;
      }
    }
    console.log('-------------------------------------');

    if (!foundKeyField) {
      console.error('CRITICAL: The parsed "fields" object did not contain a "key".');
      throw new Error("Upload failed: Parsed fields did not return a 'key'.");
    }

    formData.append('file', new Blob([processedBuffer], { type: 'image/jpeg' }), 'upload.jpg');

    console.log('Uploading to S3 with all parsed fields...');
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!uploadResponse.ok && uploadResponse.status !== 204) {
      const errorText = await uploadResponse.text();
      throw new Error(`S3 Upload failed: ${uploadResponse.status} - ${errorText}`);
    }

    console.log('Upload successful, imageId:', imageId);

    await new Promise((resolve) => setTimeout(resolve, 3000));

    return imageId;
  } catch (error) {
    console.error('Upload error:', error);
    throw new Error(error.message);
  }
}

async function backupUploadToS3(buffer, filename, mimeType) {
  if (!S3_UPLOAD_BUCKET) {
    console.warn('S3_UPLOAD_BUCKET not configured; skipping archive backup.');
    return null;
  }

  const safeName = filename ? filename.replace(/[^a-zA-Z0-9._-]/g, '-') : 'upload.jpg';
  const key = `uploads/${Date.now()}-${safeName}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: S3_UPLOAD_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType || 'application/octet-stream',
    })
  );

  return {
    bucket: S3_UPLOAD_BUCKET,
    key,
    location: `s3://${S3_UPLOAD_BUCKET}/${key}`,
  };
}

async function generateEnhancedImage(imageId, width, height, mode) {
  try {
    const payload = buildGenerationPayload(imageId, width, height, mode);
    console.log('=== GENERATION PAYLOAD ===');
    console.log(JSON.stringify(payload, null, 2));
    console.log('==========================');

    const response = await fetch(`${BASE_URL}/generations`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${LEONARDO_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Generation Error:', error);
      throw new Error(JSON.stringify(error));
    }

    const data = await response.json();
    return data.sdGenerationJob.generationId;
  } catch (error) {
    throw error;
  }
}

async function pollForCompletion(generationId) {
  const maxAttempts = 60;
  let attempts = 0;

  while (attempts < maxAttempts) {
    const response = await fetch(`${BASE_URL}/generations/${generationId}`, {
      headers: { authorization: `Bearer ${LEONARDO_API_KEY}` },
    });

    if (!response.ok) throw new Error('Poll failed');

    const data = await response.json();
    const generation = data.generations_by_pk;

    if (generation.status === 'COMPLETE') {
      return generation.generated_images[0].url;
    }

    if (generation.status === 'FAILED') {
      throw new Error('Generation failed');
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));
    attempts++;
  }

  throw new Error('Timeout');
}

// ============================================================================
// API ROUTE
// ============================================================================

export async function POST(request) {
  try {
    console.log('=== Enhancement request ===');

    if (!LEONARDO_API_KEY) {
      return NextResponse.json({ error: 'API key missing' }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get('image');
    const modeValue = (formData.get('mode') || 'structure').toString();
    const mode = modeValue === 'surfaces' ? 'surfaces' : 'structure';

    if (!file) {
      return NextResponse.json({ error: 'No image' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    try {
      const archiveInfo = await backupUploadToS3(buffer, file.name, file.type);
      if (archiveInfo) {
        console.log('Archived original upload to S3:', archiveInfo.location);
      }
    } catch (archiveError) {
      console.error('Failed to archive original upload:', archiveError);
    }

    console.log('Uploading to Leonardo...');
    const imageId = await uploadToLeonardo(buffer, 'jpg');

    console.log('Starting generation...');
    const generationId = await generateEnhancedImage(imageId, 1024, 1024, mode);

    console.log('Polling...');
    const enhancedUrl = await pollForCompletion(generationId);

    return NextResponse.json({ enhancedUrl });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: error.message || 'Enhancement failed' },
      { status: 500 }
    );
  }
}

export const maxDuration = 60;
export const runtime = 'nodejs';
