'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download } from 'lucide-react';

type Image = {
  id: string;
  image_type: string;
  original_url: string | null;
  enhanced_url: string | null;
  filename: string | null;
  created_at: string;
};

export default function ProjectImagesPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);

  useEffect(() => {
    fetchImages();
  }, [projectId]);

  const fetchImages = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/images?project_id=${projectId}&image_type=enhanced`);
      const data = await response.json();
      
      // Get pairs of original and enhanced images
      const enhancedImages = data.images.filter((img: Image) => img.image_type === 'enhanced');
      const originalImages = data.images.filter((img: Image) => img.image_type === 'original');
      
      // Match enhanced with originals (simplified - in real app, you'd match by metadata or pairing)
      const pairs = enhancedImages.map((enhanced: Image) => {
        // Find corresponding original (this is simplified - you'd need proper pairing logic)
        const original = originalImages.find((orig: Image) => 
          orig.created_at <= enhanced.created_at
        );
        return {
          enhanced,
          original: original || null,
        };
      });
      
      setImages(pairs as any);
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <p className="text-gray-500">Loading images...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <Link
            href={`/projects/${projectId}`}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Project
          </Link>
          <h1 className="text-3xl font-light text-gray-900 mb-2">Image Comparison</h1>
          <p className="text-sm text-gray-500">Compare original uploads with enhanced versions</p>
        </div>

        {images.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No enhanced images found for this project</p>
          </div>
        ) : (
          <div className="space-y-8">
            {images.map((pair: any, index: number) => (
              <div key={pair.enhanced.id} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="mb-4 text-sm text-gray-500">
                  Image {index + 1} • {new Date(pair.enhanced.created_at).toLocaleDateString()}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Original */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-700">Original</h3>
                      {pair.original?.original_url && (
                        <a
                          href={pair.original.original_url}
                          download
                          className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </a>
                      )}
                    </div>
                    {pair.original?.original_url ? (
                      <img
                        src={pair.original.original_url}
                        alt="Original"
                        className="w-full rounded-lg border border-gray-200"
                      />
                    ) : (
                      <div className="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center text-sm text-gray-400">
                        Original not available
                      </div>
                    )}
                  </div>

                  {/* Enhanced */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-700">Enhanced</h3>
                      {pair.enhanced.enhanced_url && (
                        <a
                          href={pair.enhanced.enhanced_url}
                          download
                          className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </a>
                      )}
                    </div>
                    {pair.enhanced.enhanced_url ? (
                      <img
                        src={pair.enhanced.enhanced_url}
                        alt="Enhanced"
                        className="w-full rounded-lg border border-gray-200"
                      />
                    ) : (
                      <div className="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center text-sm text-gray-400">
                        Enhanced not available
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

