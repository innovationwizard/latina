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

async function uploadToLeonardo(imageBuffer, extension) {
  // Step 1: Get upload URL
  const initResponse = await fetch(`${BASE_URL}/init-image`, {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${LEONARDO_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ extension }),
  });

  if (!initResponse.ok) {
    throw new Error('Failed to initialize upload');
  }

  const initData = await initResponse.json();
  const { url: uploadUrl, id: imageId } = initData.uploadInitImage;

  // Step 2: Upload image to pre-signed URL
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': `image/${extension}`,
    },
    body: imageBuffer,
  });

  if (!uploadResponse.ok) {
    throw new Error('Failed to upload image');
  }

  return imageId;
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
    // Verify API key is configured
    if (!LEONARDO_API_KEY) {
      return NextResponse.json(
        { error: 'Leonardo API key not configured' },
        { status: 500 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('image');

    if (!file) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload a JPG or PNG image.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 100MB.' },
        { status: 400 }
      );
    }

    // Get image data
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Get image dimensions (rough estimate from file type)
    // For production, you might want to use sharp or jimp to get exact dimensions
    const extension = file.type.split('/')[1];
    
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

    return NextResponse.json({ enhancedUrl });

  } catch (error) {
    console.error('Enhancement error:', error);
    return NextResponse.json(
      { error: error.message || 'Enhancement failed' },
      { status: 500 }
    );
  }
}