import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// ============================================================================
// AWS S3 CONFIGURATION
// ============================================================================

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const S3_BUCKET = process.env.S3_BUCKET_NAME || 'latina-images';

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
  // Phoenix model = Best for photorealism
  modelId: 'b24e16ff-06e3-43eb-8d33-4416c2d75876',

  // INIT STRENGTH (0.0 - 1.0)
  // How much to CHANGE the image vs keep original
  // 0.2 = 80% original, 20% AI enhancement (very subtle)
  // 0.3 = 70% original, 30% AI enhancement (RECOMMENDED START)
  // 0.4 = 60% original, 40% AI enhancement (more creative)
  init_strength: 0.3,

  // GUIDANCE SCALE (1-30)
  // How closely AI follows your prompt
  // 5 = Loose interpretation (more natural)
  // 7 = Balanced (RECOMMENDED)
  // 10 = Strict adherence
  guidance_scale: 7,

  // PROMPT - Keep simple to preserve furniture proportions
  prompt: 'professional interior design rendering, photorealistic materials and lighting, sharp details, maintain furniture proportions',

  // NEGATIVE PROMPT - What you don't want
  negative_prompt: 'distorted, warped, incorrect proportions, blurry, cartoon, illustration, oversaturated',

  // NUMBER OF IMAGES
  num_images: 1,

  // ALCHEMY - Better quality, costs more credits
  // true = 5 credits per image
  // false = 1 credit per image
  alchemy: true,

  // PHOTO REAL
  photoReal: false,

  // SCHEDULER
  scheduler: 'LEONARDO',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function uploadToS3(imageBuffer, extension, originalFilename) {
  try {
    const key = `init/${Date.now()}-${originalFilename}`;
    
    console.log('Uploading to S3:', key);
    
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: imageBuffer,
      ContentType: `image/${extension}`,
    });

    await s3Client.send(command);
    
    const publicUrl = `https://${S3_BUCKET}.s3.us-east-2.amazonaws.com/${key}`;
    console.log('S3 upload successful:', publicUrl);
    
    return publicUrl;
    
  } catch (error) {
    console.error('S3 upload error:', error);
    throw new Error(`Failed to upload to S3: ${error.message}`);
  }
}

async function generateEnhancedImage(initImageUrl, width, height) {
  try {
    console.log('Calling Leonardo generations API...');
    
    const response = await fetch(`${BASE_URL}/generations`, {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${LEONARDO_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        ...LEONARDO_CONFIG,
        init_image_type: 'URL', // Use URL instead of uploaded image ID
        init_image_url: initImageUrl,
        width: Math.min(width, 2048),
        height: Math.min(height, 2048),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Leonardo generation error:', error);
      throw new Error(error.error || 'Generation failed');
    }

    const data = await response.json();
    console.log('Generation started:', data.sdGenerationJob.generationId);
    
    return data.sdGenerationJob.generationId;
    
  } catch (error) {
    console.error('generateEnhancedImage error:', error);
    throw error;
  }
}

async function pollForCompletion(generationId) {
  const maxAttempts = 60; // 3 minutes max
  let attempts = 0;

  console.log('Polling for generation completion...');

  while (attempts < maxAttempts) {
    try {
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

      console.log(`Poll attempt ${attempts + 1}: status = ${generation.status}`);

      if (generation.status === 'COMPLETE') {
        const imageUrl = generation.generated_images[0].url;
        console.log('Generation complete:', imageUrl);
        return imageUrl;
      }

      if (generation.status === 'FAILED') {
        throw new Error('Image generation failed');
      }

      // Wait 3 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 3000));
      attempts++;
      
    } catch (error) {
      console.error('Poll error:', error);
      throw error;
    }
  }

  throw new Error('Generation timed out after 3 minutes');
}

// ============================================================================
// API ROUTE HANDLER
// ============================================================================

export async function POST(request) {
  try {
    console.log('=== Starting enhancement request ===');
    
    // Verify all required environment variables
    if (!LEONARDO_API_KEY) {
      console.error('LEONARDO_API_KEY not configured');
      return NextResponse.json(
        { error: 'Leonardo API key not configured' },
        { status: 500 }
      );
    }

    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.error('AWS credentials not configured');
      return NextResponse.json(
        { error: 'AWS credentials not configured' },
        { status: 500 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('image');

    if (!file) {
      console.error('No image provided');
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    console.log('File received:', file.name, file.type, file.size, 'bytes');

    // Get image data
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Get file extension
    const extension = file.type === 'image/png' ? 'png' : 'jpg';
    console.log('Processing as extension:', extension);

    // Default dimensions - Leonardo maintains aspect ratio
    const width = 1024;
    const height = 768;

    // Upload to your S3 (bypasses Leonardo's broken upload)
    console.log('Uploading to S3...');
    const initImageUrl = await uploadToS3(buffer, extension, file.name);

    // Generate enhanced image using URL
    console.log('Starting Leonardo generation...');
    const generationId = await generateEnhancedImage(initImageUrl, width, height);

    // Wait for completion
    console.log('Waiting for generation to complete...');
    const enhancedUrl = await pollForCompletion(generationId);

    console.log('=== Enhancement complete ===');
    return NextResponse.json({ enhancedUrl });

  } catch (error) {
    console.error('Enhancement error:', error);
    return NextResponse.json(
      { error: error.message || 'Enhancement failed' },
      { status: 500 }
    );
  }
}

// Allow large file uploads
export const config = {
  api: {
    bodyParser: false,
    sizeLimit: '100mb',
  },
};
