import { NextResponse } from 'next/server';

// ============================================================================
// LEONARDO AI API CONFIGURATION
// ============================================================================

const LEONARDO_API_KEY = process.env.LEONARDO_API_KEY;
const BASE_URL = 'https://cloud.leonardo.ai/api/rest/v1';

// ============================================================================
// LEONARDO SETTINGS - TUNE THESE FOR YOUR FURNITURE IMAGES
// ============================================================================

const LEONARDO_CONFIG = {
  // MODEL SELECTION
  // Phoenix model (b24e16ff-06e3-43eb-8d33-4416c2d75876) = Best for photorealism
  // Try these alternatives if Phoenix doesn't work well:
  // - Leonardo Kino XL: '5c232a9e-9061-4777-980a-ddc8e65647c6'
  // - Leonardo Vision XL: '5c232a9e-9061-4777-980a-ddc8e65647c6'
  modelId: 'b24e16ff-06e3-43eb-8d33-4416c2d75876',

  // INIT STRENGTH (0.0 - 1.0)
  // How much to CHANGE the image vs keep original
  // 0.2 = 80% original, 20% AI enhancement (very subtle)
  // 0.3 = 70% original, 30% AI enhancement (RECOMMENDED START)
  // 0.4 = 60% original, 40% AI enhancement (more creative)
  // 0.5 = 50/50 (may lose dimensional accuracy)
  // START WITH 0.3 and adjust if needed
  init_strength: 0.3,

  // GUIDANCE SCALE (1-30)
  // How closely AI follows your prompt
  // 5 = Loose interpretation (more natural)
  // 7 = Balanced (RECOMMENDED)
  // 10 = Strict adherence (may look artificial)
  // Lower = better for preserving furniture proportions
  guidance_scale: 7,

  // PROMPT
  // What you want the AI to enhance
  // CRITICAL: Keep it simple to preserve original design
  prompt: 'professional interior design rendering, photorealistic materials and lighting, sharp details, maintain furniture proportions',

  // NEGATIVE PROMPT  
  // What you DON'T want
  // Add unwanted artifacts here
  negative_prompt: 'distorted, warped, incorrect proportions, blurry, cartoon, illustration, oversaturated',

  // NUMBER OF IMAGES
  // Always 1 for production (costs 1 generation per image)
  num_images: 1,

  // ALCHEMY (true/false)
  // Advanced rendering engine - costs more credits but better quality
  // true = 5 credits per image
  // false = 1 credit per image
  // RECOMMENDED: true for client proposals
  alchemy: true,

  // PHOTO REAL (true/false)  
  // Specialized photorealism mode
  // Only works with specific models
  // RECOMMENDED: false initially, test later
  photoReal: false,

  // SCHEDULER
  // Generation algorithm
  // Options: 'LEONARDO', 'EULER_DISCRETE', 'DPM_SOLVER'
  // RECOMMENDED: Leave as LEONARDO
  scheduler: 'LEONARDO',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'];
const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB
const MAX_S3_POST_PRE_DATA_LENGTH = 20_480; // bytes, per AWS limit
const OPTIONAL_S3_FIELD_PREFIXES = [
  'content-type',
  'content-disposition',
  'cache-control',
  'success_action_status',
  'x-amz-meta',
];

async function uploadToLeonardo(imageBuffer, extension) {
  try {
    // Step 1: Get upload URL
    console.log('Requesting upload URL from Leonardo...');
    const initResponse = await fetch(`${BASE_URL}/init-image`, {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${LEONARDO_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ extension }),
    });

    if (!initResponse.ok) {
      const errorData = await initResponse.json();
      console.error('Leonardo init error:', errorData);
      throw new Error(`Failed to initialize upload: ${errorData.error || initResponse.statusText}`);
    }

    const initData = await initResponse.json();
    console.log('Got upload URL and image ID:', initData.uploadInitImage.id);
    
    const { url: uploadUrl, id: imageId, fields } = initData.uploadInitImage;

    const sanitizedFields = sanitizeUploadFields(fields);

    // Step 2: Upload using FormData if fields exist, otherwise direct PUT
    console.log('Uploading image...');
    
    if (sanitizedFields && sanitizedFields.withinLimit && sanitizedFields.entries.length > 0) {
      // S3 POST upload with fields
      const formData = new FormData();
      const fileBlob = new Blob([imageBuffer], { type: `image/${extension}` });

      sanitizedFields.entries.forEach(([key, value]) => {
        formData.append(key, value);
      });

      // Append file last per S3 requirements
      formData.append('file', fileBlob, `upload.${extension}`);
      
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok && uploadResponse.status !== 204) {
        const errorText = await uploadResponse.text();
        console.error('Upload error:', uploadResponse.status, errorText);
        throw new Error(`Failed to upload image: ${uploadResponse.statusText}`);
      }
    } else {
      if (sanitizedFields && !sanitizedFields.withinLimit) {
        console.warn('Upload fields exceed AWS limit; falling back to direct PUT.');
      }

      // Direct PUT upload (simpler)
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: imageBuffer,
        headers: {
          'Content-Type': `image/${extension}`,
        },
      });

      if (!uploadResponse.ok && uploadResponse.status !== 204) {
        const errorText = await uploadResponse.text();
        console.error('Upload error:', uploadResponse.status, errorText);
        throw new Error(`Failed to upload image: ${uploadResponse.statusText}`);
      }
    }

    console.log('Image uploaded successfully');
    
    // Wait a moment for Leonardo to process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return imageId;
    
  } catch (error) {
    console.error('uploadToLeonardo error:', error);
    throw new Error(`Upload failed: ${error.message}`);
  }
}

function sanitizeUploadFields(fields) {
  if (!fields) {
    return null;
  }

  const REQUIRED_KEYS = new Set([
    'policy',
    'x-amz-algorithm',
    'x-amz-credential',
    'x-amz-date',
    'x-amz-signature',
    'x-amz-security-token',
    'key',
    'bucket',
  ]);

  const requiredEntries = [];
  const optionalEntries = [];

  for (const [rawKey, rawValue] of Object.entries(fields)) {
    const key = rawKey;
    const lowerKey = key.toLowerCase();
    const valueString = typeof rawValue === 'string'
      ? rawValue.replace(/\s+/g, '')
      : String(rawValue ?? '');
    const bytes = Buffer.byteLength(key) + Buffer.byteLength(valueString) + 2;

    if (REQUIRED_KEYS.has(lowerKey)) {
      requiredEntries.push([key, valueString, bytes]);
    } else {
      optionalEntries.push([key, valueString, bytes]);
    }
  }

  let totalBytes = requiredEntries.reduce((acc, [, , bytes]) => acc + bytes, 0);

  const requiredWithinLimit = totalBytes <= MAX_S3_POST_PRE_DATA_LENGTH;

  const keptOptionalEntries = [];

  optionalEntries
    .sort((a, b) => a[2] - b[2])
    .forEach(([key, value, bytes]) => {
      const lowerKey = key.toLowerCase();
      const shouldDrop = OPTIONAL_S3_FIELD_PREFIXES.some((prefix) => lowerKey.startsWith(prefix));

      if (shouldDrop) {
        console.warn(`Dropping optional S3 field '${key}' (${bytes} bytes) to reduce payload.`);
        return;
      }

      if (totalBytes + bytes > MAX_S3_POST_PRE_DATA_LENGTH) {
        console.warn(`Skipping optional S3 field '${key}' to stay under pre-data limit.`);
        return;
      }

      keptOptionalEntries.push([key, value, bytes]);
      totalBytes += bytes;
    });

  console.log(`Upload field payload size: ${totalBytes} bytes (limit ${MAX_S3_POST_PRE_DATA_LENGTH}).`);

  const combinedEntries = [
    ...requiredEntries,
    ...keptOptionalEntries,
  ].map(([key, value]) => [key, value]);

  return {
    entries: combinedEntries,
    totalBytes,
    withinLimit: requiredWithinLimit && totalBytes <= MAX_S3_POST_PRE_DATA_LENGTH,
  };
}

async function generateEnhancedImage(imageId, width, height) {
  const response = await fetch(`${BASE_URL}/generations`, {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${LEONARDO_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      ...LEONARDO_CONFIG,
      init_image_id: imageId,
      width: Math.min(width, 2048), // Cap at 2048px
      height: Math.min(height, 2048),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Generation failed');
  }

  const data = await response.json();
  return data.sdGenerationJob.generationId;
}

async function pollForCompletion(generationId) {
  const maxAttempts = 60; // 3 minutes max (60 * 3 seconds)
  let attempts = 0;

  while (attempts < maxAttempts) {
    const response = await fetch(`${BASE_URL}/generations/${generationId}`, {
      headers: {
        'authorization': `Bearer ${LEONARDO_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to check generation status');
    }

    const data = await response.json();
    const generation = data.generations_by_pk;

    if (generation.status === 'COMPLETE') {
      return generation.generated_images[0].url;
    }

    if (generation.status === 'FAILED') {
      throw new Error('Image generation failed');
    }

    // Wait 3 seconds before next check
    await new Promise(resolve => setTimeout(resolve, 3000));
    attempts++;
  }

  throw new Error('Generation timed out');
}

// ============================================================================
// API ROUTE HANDLER
// ============================================================================

export async function POST(request) {
  try {
    console.log('=== Starting enhancement request ===');

    // Verify API key is configured
    if (!LEONARDO_API_KEY) {
      console.error('Leonardo API key not configured');
      return NextResponse.json(
        { error: 'Leonardo API key not configured' },
        { status: 500 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('image');

    if (!file) {
      console.error('No image provided in request');
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    console.log('File received:', file.name, file.type, file.size, 'bytes');

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      console.error('Unsupported file type:', file.type);
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload a JPG or PNG image.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      console.error('File too large:', file.size);
      return NextResponse.json(
        { error: 'File too large. Maximum size is 100MB.' },
        { status: 400 }
      );
    }

    // Get image data
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Get file extension (jpg or png)
    const extension = file.type === 'image/png' ? 'png' : 'jpg';

    console.log('Processing as extension:', extension);

    // Default dimensions - Leonardo will maintain aspect ratio
    const width = 1024;
    const height = 768;

    // Process image
    console.log('Uploading image to Leonardo...');
    const imageId = await uploadToLeonardo(buffer, extension);

    console.log('Generating enhanced image...');
    const generationId = await generateEnhancedImage(imageId, width, height);

    console.log('Waiting for completion...');
    const enhancedUrl = await pollForCompletion(generationId);

    console.log('Enhancement complete!');
    return NextResponse.json({ enhancedUrl });

  } catch (error) {
    console.error('Enhancement error:', error);
    return NextResponse.json(
      { error: error.message || 'Enhancement failed' },
      { status: 500 }
    );
  }
}