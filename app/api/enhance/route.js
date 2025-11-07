import { NextResponse } from 'next/server';
import sharp from 'sharp';

// ============================================================================
// LEONARDO AI API CONFIGURATION
// ============================================================================

const LEONARDO_API_KEY = process.env.LEONARDO_API_KEY;
const BASE_URL = 'https://cloud.leonardo.ai/api/rest/v1';

const LEONARDO_CONFIG = {
  modelId: 'b24e16ff-06e3-43eb-8d33-4416c2d75876',
  init_strength: 0.8,
  guidance_scale: 7,
  prompt:
    'professional interior design rendering, photorealistic materials and lighting, sharp details, maintain furniture proportions',
  negative_prompt:
    'distorted, warped, incorrect proportions, blurry, cartoon, illustration, oversaturated',
  num_images: 1,
  alchemy: true,
  photoReal: true,
  scheduler: 'LEONARDO',
};

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
      console.error(`Failed to init upload. Status: ${initResponse.status}, Body: ${errorText}`);
      throw new Error(`Failed to init upload: ${initResponse.status}`);
    }

    const initData = await initResponse.json();

    console.log('=== LEONARDO /init-image RESPONSE ===');
    console.log(JSON.stringify(initData, null, 2));
    console.log('===================================');

    if (!initData.uploadInitImage) {
      throw new Error(
        'Leonardo API Error: The /init-image response did not contain "uploadInitImage". See full response above.'
      );
    }

    const { url: uploadUrl, id: imageId, fields } = initData.uploadInitImage;

    if (!fields) {
      throw new Error('Leonardo API Error: "uploadInitImage" was present, but "fields" was missing.');
    }

    // 3. Filter ONLY for required fields (robust array-like handling)
    const requiredKeys = new Set([
      'policy',
      'x-amz-credential',
      'x-amz-date',
      'x-amz-signature',
      'x-amz-security-token',
      'key',
      'bucket',
      'content-type',
    ]);

    const formData = new FormData();
    let foundKeyField = false;

    console.log('--- Parsing Fields from Leonardo ---');
    const fieldPairs = Object.values(fields ?? {});

    if (fieldPairs.length === 0) {
      throw new Error('Leonardo API "fields" object was empty.');
    }

    for (const field of fieldPairs) {
      if (!Array.isArray(field) || field.length !== 2) {
        console.log('   -> Ignoring malformed field entry:', field);
        continue;
      }

      const [key, value] = field;
      if (typeof key !== 'string') {
        console.log('   -> Ignoring field with non-string key:', field);
        continue;
      }

      const lowerKey = key.toLowerCase();
      console.log(`Field: "${key}" (Checking as: "${lowerKey}")`);

      if (requiredKeys.has(lowerKey)) {
        formData.append(key, value);
        console.log('   -> Appending required field.');

        if (lowerKey === 'key') {
          foundKeyField = true;
        }
      } else {
        console.log('   -> Ignoring optional field.');
      }
    }

    console.log('-------------------------------------');

    if (!foundKeyField) {
      console.error('CRITICAL: Leonardo did not provide a "key" field in the fields object.');
      throw new Error("Upload failed: Leonardo's API did not return a 'key' field.");
    }

    // 4. Append file
    formData.append('file', new Blob([processedBuffer], { type: 'image/jpeg' }), 'upload.jpg');

    // 5. Upload to S3
    console.log('Uploading to S3 with filtered fields...');
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

async function generateEnhancedImage(imageId, width, height) {
  const response = await fetch(`${BASE_URL}/generations`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${LEONARDO_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      ...LEONARDO_CONFIG,
      init_image_id: imageId,
      width: Math.min(width, 1024),
      height: Math.min(height, 1024),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(JSON.stringify(error));
  }

  const data = await response.json();
  return data.sdGenerationJob.generationId;
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

    if (!file) {
      return NextResponse.json({ error: 'No image' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    console.log('Uploading to Leonardo...');
    const imageId = await uploadToLeonardo(buffer, 'jpg');

    console.log('Starting generation...');
    const generationId = await generateEnhancedImage(imageId, 1024, 1024);

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
