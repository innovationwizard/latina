import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { S3_BUCKETS, S3_REGION, getS3Url } from '@/lib/s3-utils';

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
const hasExplicitCreds =
  Boolean(process.env.AWS_ACCESS_KEY_ID) && Boolean(process.env.AWS_SECRET_ACCESS_KEY);

// Log bucket configuration for debugging
console.log('S3 Bucket Configuration:');
console.log(`  UPLOADS: ${S3_BUCKETS.UPLOADS}`);
console.log(`  LEONARDO: ${S3_BUCKETS.LEONARDO}`);
console.log(`  Region: ${S3_REGION}`);

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
    width: width, // Use the actual dimensions (already calculated to fit within 1024)
    height: height, // Use the actual dimensions (already calculated to fit within 1024)
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
    // 1. Get original image metadata to preserve aspect ratio
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    const originalWidth = metadata.width;
    const originalHeight = metadata.height;
    
    console.log(`Original dimensions: ${originalWidth}x${originalHeight}`);
    
    // 2. Calculate target dimensions that fit within 1024x1024 while preserving aspect ratio
    const maxDimension = 1024;
    const aspectRatio = originalWidth / originalHeight;
    
    let targetWidth, targetHeight;
    
    if (originalWidth <= maxDimension && originalHeight <= maxDimension) {
      // Image is already small enough, use original dimensions
      targetWidth = originalWidth;
      targetHeight = originalHeight;
    } else if (originalWidth > originalHeight) {
      // Landscape: width is the limiting factor
      targetWidth = maxDimension;
      targetHeight = Math.round(maxDimension / aspectRatio);
    } else {
      // Portrait or square: height is the limiting factor
      targetHeight = maxDimension;
      targetWidth = Math.round(maxDimension * aspectRatio);
    }
    
    // Ensure dimensions are multiples of 8 (Leonardo requirement)
    targetWidth = Math.floor(targetWidth / 8) * 8;
    targetHeight = Math.floor(targetHeight / 8) * 8;
    
    // Ensure minimum dimensions (at least 512 on the smaller side)
    if (targetWidth < 512) targetWidth = 512;
    if (targetHeight < 512) targetHeight = 512;
    
    // Re-ensure multiples of 8 after minimum check
    targetWidth = Math.floor(targetWidth / 8) * 8;
    targetHeight = Math.floor(targetHeight / 8) * 8;
    
    console.log(`Target dimensions (preserving aspect ratio): ${targetWidth}x${targetHeight}`);
    
    // 3. Resize and process the image
    console.log('Preprocessing image...');
    const processedBuffer = await image
      .resize(targetWidth, targetHeight, { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .jpeg({ quality: 85 })
      .toBuffer();
    
    // Verify actual output dimensions (may differ slightly due to fit: 'inside')
    const processedMetadata = await sharp(processedBuffer).metadata();
    const actualWidth = processedMetadata.width;
    const actualHeight = processedMetadata.height;
    
    // Use actual dimensions (rounded to multiples of 8) for Leonardo
    const finalWidth = Math.floor(actualWidth / 8) * 8;
    const finalHeight = Math.floor(actualHeight / 8) * 8;
    
    console.log(`Actual processed dimensions: ${actualWidth}x${actualHeight}`);
    console.log(`Final dimensions for Leonardo: ${finalWidth}x${finalHeight}`);

    console.log('Image processed, getting upload URL...');

    // 4. Get upload URL from Leonardo
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

    // Return imageId and actual dimensions (preserving aspect ratio)
    return {
      imageId,
      width: finalWidth,
      height: finalHeight,
    };
  } catch (error) {
    console.error('Upload error:', error);
    throw new Error(error.message);
  }
}

async function backupUploadToS3(buffer, filename, mimeType, projectId = null) {
  // Original uploads go to latina-uploads bucket
  const bucketName = S3_BUCKETS.UPLOADS;
  
  // Validate bucket name
  if (!bucketName || bucketName === 'S3_UPLOAD_BUCKET' || bucketName.includes('S3_')) {
    console.error(`Invalid bucket name: ${bucketName}. Using fallback 'latina-uploads'`);
    const fallbackBucket = 'latina-uploads';
    console.log(`Using bucket: ${fallbackBucket}`);
  }
  
  const safeName = filename ? filename.replace(/[^a-zA-Z0-9._-]/g, '-') : 'upload.jpg';
  const prefix = projectId ? `uploads/${projectId}/originals` : 'uploads/originals';
  const key = `${prefix}/${Date.now()}-${safeName}`;

  const finalBucket = (bucketName && bucketName !== 'S3_UPLOAD_BUCKET' && !bucketName.includes('S3_')) 
    ? bucketName 
    : 'latina-uploads';
  
  console.log(`Uploading to bucket: ${finalBucket}, key: ${key}`);

  await s3Client.send(
    new PutObjectCommand({
      Bucket: finalBucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType || 'application/octet-stream',
    })
  );

  return {
    bucket: finalBucket,
    key,
    location: getS3Url(finalBucket, key),
  };
}

async function saveEnhancedImageToS3(imageUrl, projectId, filename) {
  try {
    // Download the enhanced image from Leonardo
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error('Failed to download enhanced image');
    }
    const buffer = Buffer.from(await response.arrayBuffer());

    // Enhanced images go to latina-leonardo-images bucket
    const bucketName = S3_BUCKETS.LEONARDO;
    const finalBucket = (bucketName && bucketName !== 'LEONARDO_S3_BUCKET' && !bucketName.includes('LEONARDO_S3')) 
      ? bucketName 
      : 'latina-leonardo-images';
    
    const safeName = filename ? filename.replace(/[^a-zA-Z0-9._-]/g, '-') : 'enhanced.jpg';
    const prefix = projectId ? `enhanced/${projectId}` : 'enhanced';
    const key = `${prefix}/${Date.now()}-${safeName}`;

    console.log(`Saving enhanced image to bucket: ${finalBucket}, key: ${key}`);

    await s3Client.send(
      new PutObjectCommand({
        Bucket: finalBucket,
        Key: key,
        Body: buffer,
        ContentType: 'image/jpeg',
      })
    );

    return {
      bucket: finalBucket,
      key,
      location: getS3Url(finalBucket, key),
    };
  } catch (error) {
    console.error('Error saving enhanced image to S3:', error);
    return null;
  }
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
    const projectId = formData.get('project_id');
    const siteVisitId = formData.get('site_visit_id');

    if (!file) {
      return NextResponse.json({ error: 'No image' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let originalS3Info = null;
    try {
      originalS3Info = await backupUploadToS3(buffer, file.name, file.type, projectId);
      if (originalS3Info) {
        console.log('Archived original upload to S3:', originalS3Info.location);
      }
    } catch (archiveError) {
      console.error('Failed to archive original upload:', archiveError);
    }

    console.log('Uploading to Leonardo...');
    const uploadResult = await uploadToLeonardo(buffer, 'jpg');
    const { imageId, width, height } = uploadResult;

    console.log(`Using dimensions: ${width}x${height} (preserving original aspect ratio)`);
    console.log('Starting generation...');
    const generationId = await generateEnhancedImage(imageId, width, height, mode);

    console.log('Polling...');
    const enhancedUrl = await pollForCompletion(generationId);

    // Save enhanced image to Leonardo S3 bucket
    let enhancedS3Info = null;
    if (projectId) {
      enhancedS3Info = await saveEnhancedImageToS3(enhancedUrl, projectId, file.name);
      if (enhancedS3Info) {
        console.log('Saved enhanced image to S3:', enhancedS3Info.location);
      }
    }

    return NextResponse.json({
      enhancedUrl,
      originalS3Url: originalS3Info?.location || null,
      enhancedS3Url: enhancedS3Info?.location || null,
      leonardoImageId: imageId,
      projectId: projectId || null,
      siteVisitId: siteVisitId || null,
    });
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
