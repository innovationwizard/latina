'use client';

import { useEffect, useMemo, useState } from 'react';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-provider-cognito-identity';

type GalleryImage = {
  key: string;
  url: string;
};

const cognitoPoolId = process.env.NEXT_PUBLIC_COGNITO_POOL_ID || '';
const bucketName = process.env.NEXT_PUBLIC_S3_BUCKET || '';
const region = process.env.NEXT_PUBLIC_S3_REGION || '';
const prefix = process.env.NEXT_PUBLIC_S3_PREFIX || '';

export const metadata = {
  title: 'Latina Uploads Gallery',
  description:
    'Securely browse thumbnails stored in your Latina uploads S3 bucket using Cognito Identity credentials.',
};

function buildClient() {
  if (!bucketName || !region || !cognitoPoolId) {
    return null;
  }

  return new S3Client({
    region,
    credentials: fromCognitoIdentityPool({
      clientConfig: { region },
      identityPoolId: cognitoPoolId,
    }),
  });
}

export default function GalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [message, setMessage] = useState<string>('Preparing to load gallery...');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const s3Client = useMemo(() => buildClient(), []);

  useEffect(() => {
    async function loadGallery() {
      if (!s3Client) {
        setError('Missing S3 configuration. Please verify environment variables.');
        return;
      }

      setIsLoading(true);
      setError(null);
      setMessage('Loading images...');

      try {
        const params: any = {
          Bucket: bucketName,
        };

        if (prefix) {
          params.Prefix = prefix.endsWith('/') ? prefix : `${prefix}/`;
        }

        const command = new ListObjectsV2Command(params);
        const response = await s3Client.send(command);

        if (!response.Contents || response.Contents.length === 0) {
          setImages([]);
          setMessage('No objects found in this bucket/prefix.');
          setIsLoading(false);
          return;
        }

        const newImages: GalleryImage[] = [];

        response.Contents.forEach((obj) => {
          const key = obj.Key;
          if (!key || key.endsWith('/') || !/\.(jpg|jpeg|png|gif|webp)$/i.test(key)) {
            return;
          }

          const encodedKey = key.split('/').map(encodeURIComponent).join('/');
          const url = `https://${bucketName}.s3.${region}.amazonaws.com/${encodedKey}`;
          newImages.push({ key, url });
        });

        if (newImages.length === 0) {
          setMessage('No images found in this bucket/prefix.');
        } else {
          setMessage(`Successfully loaded ${newImages.length} images.`);
        }

        setImages(newImages);
      } catch (err: any) {
        console.error('Error listing S3 objects:', err);
        setError(`Error: ${err?.message || 'Unknown error'}. Check console and AWS permissions.`);
      } finally {
        setIsLoading(false);
      }
    }

    loadGallery();
  }, [s3Client]);

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <div className="container mx-auto max-w-6xl p-4 md:p-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Latina Uploads Gallery
          </h1>
          <p className="text-gray-600 mb-6">
            Viewing archived uploads from your S3 bucket using Cognito Identity
            credentials configured in the environment.
          </p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <ReadOnlyField label="Cognito Pool ID" value={cognitoPoolId} />
            <ReadOnlyField label="S3 Bucket" value={bucketName} />
            <ReadOnlyField label="Region" value={region} />
            <ReadOnlyField label="Prefix" value={prefix || '(root)'} />
          </div>

          <Status message={message} error={error} isLoading={isLoading} />
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {images.map((image) => (
            <figure
              key={image.key}
              className="relative aspect-square overflow-hidden rounded-lg bg-gray-200 shadow"
            >
              <img
                src={image.url}
                alt={image.key}
                loading="lazy"
                className="h-full w-full object-cover object-center transition-transform duration-300 hover:scale-110"
                onError={(event) => {
                  const target = event.currentTarget;
                  target.alt = 'Error loading image';
                  target.src = 'https://placehold.co/300x300/ef4444/ffffff?text=Error';
                }}
              />
              <figcaption className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-1 text-[10px] text-gray-100">
                {image.key}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </div>
  );
}

type ReadOnlyFieldProps = {
  label: string;
  value: string;
};

function ReadOnlyField({ label, value }: ReadOnlyFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        type="text"
        value={value}
        readOnly
        className="mt-1 block w-full cursor-not-allowed rounded-md border border-gray-300 bg-gray-100 px-3 py-2 shadow-sm focus:outline-none sm:text-sm"
      />
    </div>
  );
}

type StatusProps = {
  message: string;
  error: string | null;
  isLoading: boolean;
};

function Status({ message, error, isLoading }: StatusProps) {
  if (error) {
    return <div className="mt-4 text-sm text-red-600">{error}</div>;
  }

  return (
    <div className="mt-4 text-sm text-gray-600">
      {isLoading ? 'Loading gallery…' : message}
    </div>
  );
}
