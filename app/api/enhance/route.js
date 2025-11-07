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
      const requiredEntries = [];
      const optionalEntries = [];
      const requiredKeys = new Set([
        'policy',
      const requiredOnlyPreData = preDataBytes;

        'x-amz-algorithm',
        'x-amz-credential',
        'x-amz-date',
        'x-amz-signature',
        'x-amz-security-token',
        'key',
        'bucket',
        'Content-Type',
      ]);

      for (const [key, value] of Object.entries(fields)) {
        const entry = [key, value];
        if (requiredKeys.has(key) || requiredKeys.has(key.toLowerCase())) {
          requiredEntries.push(entry);
        } else {
          optionalEntries.push(entry);
        }
      }

      let preDataBytes = requiredEntries.reduce((sum, [key, value]) => {
        return sum + Buffer.byteLength(String(key)) + Buffer.byteLength(String(value)) + 4;
      }, 0);

      let maxOptionalField = { key: '', bytes: 0 };
      let maxRequiredField = { key: '', bytes: 0 };

      requiredEntries.forEach(([key, value]) => {
        const bytes = Buffer.byteLength(String(key)) + Buffer.byteLength(String(value)) + 4;
        if (bytes > maxRequiredField.bytes) {
          maxRequiredField = { key, bytes };
        }
      });

      const includedOptionalEntries = [];
      optionalEntries
        .map(([key, value]) => ({ key, value, bytes: Buffer.byteLength(String(key)) + Buffer.byteLength(String(value)) + 4 }))
        .sort((a, b) => a.bytes - b.bytes)
        .forEach((entry) => {
          if (preDataBytes + entry.bytes <= 19_500) {
            includedOptionalEntries.push(entry);
            preDataBytes += entry.bytes;
          } else {
            console.warn(`Dropping optional field '${entry.key}' (${entry.bytes} bytes) to stay under pre-data limit.`);
          }
          if (entry.bytes > maxOptionalField.bytes) {
            maxOptionalField = entry;
          }
        });

      if (requiredEntries.length === 0) {
        console.warn('Leonardo did not return recognizable required fields.');
      }

      const boundary = `----LatinaUpload${Math.random().toString(16).slice(2)}`;
      const estimatePreFileBytes = (entries) => {
        const segments = entries
          .map(([key, value]) => `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`)
          .join('');
        const fileHeader = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="upload.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`;
        return Buffer.byteLength(segments + fileHeader);
      };

      console.log('Uploading via multipart POST. Estimated pre-data bytes:', preDataBytes);
      console.log('Required-only pre-data bytes:', requiredOnlyPreData);
      console.log('Estimated multipart pre-file bytes with boundary:', estimatePreFileBytes([
        ...requiredEntries,
        ...includedOptionalEntries.map(({ key, value }) => [key, value]),
      ]));
      if (maxRequiredField.key) {
        console.log(`Largest required field '${maxRequiredField.key}' sized ${maxRequiredField.bytes} bytes`);
      }
      if (maxOptionalField.key) {
        console.log(`Largest optional field '${maxOptionalField.key}' sized ${maxOptionalField.bytes} bytes`);
      }
      console.log(`Included optional fields: ${includedOptionalEntries.map(({ key }) => key).join(', ') || 'none'}`);

      const maxAllowed = 20_480;
      const formData = new FormData();
      [...requiredEntries, ...includedOptionalEntries.map(({ key, value }) => [key, value])].forEach(([key, value]) => {
        formData.append(key, value);
      });
      formData.append('file', new Blob([processedBuffer], { type: 'image/jpeg' }), 'upload.jpg');

      if (preDataBytes > maxAllowed) {
        console.warn(`Pre-data bytes ${preDataBytes} exceed threshold ${maxAllowed}. Retrying with required fields only.`);

        if (requiredOnlyPreData > maxAllowed) {
          console.error(`Required fields alone (${requiredOnlyPreData}) exceed AWS limit ${maxAllowed}. Aborting.`);
          throw new Error('Required fields exceed S3 pre-data size limit');
        }

        const requiredOnlyForm = new FormData();
        requiredEntries.forEach(([key, value]) => requiredOnlyForm.append(key, value));
        requiredOnlyForm.append('file', new Blob([processedBuffer], { type: 'image/jpeg' }), 'upload.jpg');

        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          body: requiredOnlyForm,
        });

        if (!uploadResponse.ok && uploadResponse.status !== 204) {
          const errorText = await uploadResponse.text();
          throw new Error(`Upload with required fields failed: ${uploadResponse.status} - ${errorText}`);
        }
        console.log('Upload succeeded with required fields only.');
      } else {
        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok && uploadResponse.status !== 204) {
          const errorText = await uploadResponse.text();
          throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
        }
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
