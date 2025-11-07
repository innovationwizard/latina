import { NextResponse } from 'next/server';
import sharp from 'sharp';

// ============================================================================
// LEONARDO AI API CONFIGURATION
// ============================================================================

const LEONARDO_API_KEY = process.env.LEONARDO_API_KEY;
const BASE_URL = 'https://cloud.leonardo.ai/api/rest/v1';

const LEONARDO_CONFIG = {
  modelId: 'b24e16ff-06e3-43eb-8d33-4416c2d75876',
  init_strength: 0.3,
  guidance_scale: 7,
  prompt: 'professional interior design rendering, photorealistic materials and lighting, sharp details, maintain furniture proportions',
  negative_prompt: 'distorted, warped, incorrect proportions, blurry, cartoon, illustration, oversaturated',
  num_images: 1,
  alchemy: true,
  photoReal: false,
  scheduler: 'LEONARDO',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function uploadToLeonardo(imageBuffer, extension) {
  try {
    // Resize/compress image to reduce upload complexity
    console.log('Preprocessing image...');
    const processedBuffer = await sharp(imageBuffer)
      .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    
    console.log('Image processed, uploading to Leonardo...');

    // Step 1: Get upload URL
    const initResponse = await fetch(`${BASE_URL}/init-image`, {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${LEONARDO_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ extension: 'jpg' }), // Always use jpg after sharp processing
    });

    if (!initResponse.ok) {
      const errorData = await initResponse.json();
      throw new Error(`Failed to init upload: ${JSON.stringify(errorData)}`);
    }

    const initData = await initResponse.json();
    const { url: uploadUrl, id: imageId, fields } = initData.uploadInitImage;

    if (fields && Object.keys(fields).length > 0) {
      const estimatedPreDataBytes = Object.entries(fields).reduce((sum, [key, value]) => {
        return sum + Buffer.byteLength(String(key)) + Buffer.byteLength(String(value)) + 4;
      }, 0);
      console.log('Uploading via multipart POST. Estimated pre-data bytes:', estimatedPreDataBytes);

      const formData = new FormData();
      Object.entries(fields).forEach(([key, value]) => {
        formData.append(key, value);
      });
      formData.append(
        'file',
        new Blob([processedBuffer], { type: 'image/jpeg' }),
        'upload.jpg'
      );

      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok && uploadResponse.status !== 204) {
        const errorText = await uploadResponse.text();
        throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
      }
    } else {
      console.log('No multipart fields returned; using PUT upload.');

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: processedBuffer,
        headers: {
          'Content-Type': 'image/jpeg',
        },
      });

      if (!uploadResponse.ok && uploadResponse.status !== 204) {
        const errorText = await uploadResponse.text();
        throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
      }
    }

    console.log('Upload successful, waiting for processing...');
    
    // Wait for Leonardo to process
    await new Promise(resolve => setTimeout(resolve, 3000));

    return imageId;
    
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

async function generateEnhancedImage(imageId, width, height) {
  try {
    const response = await fetch(`${BASE_URL}/generations`, {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${LEONARDO_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        ...LEONARDO_CONFIG,
        init_image_id: imageId, // Back to using imageId, not URL
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
    
  } catch (error) {
    throw error;
  }
}

async function pollForCompletion(generationId) {
  const maxAttempts = 60;
  let attempts = 0;

  while (attempts < maxAttempts) {
    const response = await fetch(`${BASE_URL}/generations/${generationId}`, {
      headers: { 'authorization': `Bearer ${LEONARDO_API_KEY}` },
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

    await new Promise(resolve => setTimeout(resolve, 3000));
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
      { error: error.message },
      { status: 500 }
    );
  }
}

export const maxDuration = 60;
export const runtime = 'nodejs';
