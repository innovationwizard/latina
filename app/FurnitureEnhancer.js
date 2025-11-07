"use client";

import React, { useState, useCallback } from 'react';
import { Upload, Download, Loader2 } from 'lucide-react';

// ============================================================================
// MAIN COMPONENT: Furniture Proposal Image Enhancer
// ============================================================================

export default function FurnitureEnhancer() {
  // State management
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [enhancedImage, setEnhancedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  // File validation constants (easily extensible)
  const ALLOWED_FORMATS = ['image/jpeg', 'image/png'];
  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB in bytes
  
  // TODO: Add more formats here as needed
  // Example: const ALLOWED_FORMATS = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff'];

  // ============================================================================
  // FILE HANDLING
  // ============================================================================

  const validateFile = (file) => {
    if (!ALLOWED_FORMATS.includes(file.type)) {
      throw new Error('Only JPG and PNG files are supported');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File size must be less than 100MB');
    }
    return true;
  };

  const handleFile = useCallback((selectedFile) => {
    try {
      setError(null);
      setEnhancedImage(null);
      
      validateFile(selectedFile);
      
      setFile(selectedFile);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    } catch (err) {
      setError(err.message);
      setFile(null);
      setPreview(null);
    }
  }, []);

  // Drag and drop handlers
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleChange = useCallback((e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  }, [handleFile]);

  // ============================================================================
  // IMAGE ENHANCEMENT PROCESS
  // ============================================================================

  const enhanceImage = async () => {
    if (!file) return;
    
    setIsProcessing(true);
    setError(null);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('image', file);

      // Call our API route
      const response = await fetch('/api/enhance', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Enhancement failed');
      }

      setEnhancedImage(data.enhancedUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // ============================================================================
  // DOWNLOAD HANDLER
  // ============================================================================

  const downloadImage = async () => {
    if (!enhancedImage) return;

    try {
      const response = await fetch(enhancedImage);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `enhanced-${file.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download image');
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col">
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-2xl">
          
          {/* Step 1: Upload */}
          {!enhancedImage && (
            <div className="space-y-6">
              <h1 className="text-[3.75rem] font-bold text-center text-[#1d4ed8]">
                L A T I N A
              </h1>
              <p className="mt-2 text-lg font-light text-gray-500 text-center">
                AI Powered Image Enhancer
              </p>

              {/* Drop Zone */}
              <div
                className={`
                  relative border-2 border-dashed rounded-lg p-12 text-center
                  transition-all duration-200 ease-in-out
                  ${dragActive 
                    ? 'border-gray-400 bg-gray-50' 
                    : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
                  }
                `}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept=".jpg,.jpeg,.png"
                  onChange={handleChange}
                  disabled={isProcessing}
                />
                
                {!preview ? (
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg text-gray-600 mb-2">
                      Drop your image here
                    </p>
                    <p className="text-sm text-gray-400 mb-4">or</p>
                    <span className="inline-block px-6 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors">
                      Browse to upload
                    </span>
                    <p className="text-xs text-gray-400 mt-4">
                      JPG or PNG
                    </p>
                  </label>
                ) : (
                  <div className="space-y-4">
                    <img 
                      src={preview} 
                      alt="Preview" 
                      className="max-h-64 mx-auto rounded-lg shadow-sm"
                    />
                    <button
                      onClick={() => {
                        setFile(null);
                        setPreview(null);
                        setError(null);
                      }}
                      className="text-sm text-gray-500 hover:text-gray-700"
                      disabled={isProcessing}
                    >
                      Change image
                    </button>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}

              {/* Enhance Button */}
              {preview && !isProcessing && (
                <button
                  onClick={enhanceImage}
                  className="w-full py-4 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors text-lg font-light"
                >
                  Make the magic happen!
                </button>
              )}

              {/* Loading State */}
              {isProcessing && (
                <div className="text-center space-y-4 py-8">
                  {/* Simple loading animation - easily replaceable */}
                  <div className="relative w-16 h-16 mx-auto">
                    <Loader2 className="w-16 h-16 text-gray-400 animate-spin" />
                  </div>
                  <p className="text-gray-600 font-light">
                    Creating magic...
                  </p>
                  <p className="text-sm text-gray-400">
                    This may take 30-60 seconds
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Result */}
          {enhancedImage && (
            <div className="space-y-6">
              <h2 className="text-2xl font-light text-gray-800 text-center">
                Your Enhanced Image
              </h2>

              <div className="bg-white rounded-lg p-4 shadow-sm">
                <img 
                  src={enhancedImage} 
                  alt="Enhanced" 
                  className="w-full rounded-lg"
                />
              </div>

              {/* Download Button */}
              <button
                onClick={downloadImage}
                className="w-full py-4 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors text-lg font-light flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Download
              </button>

              {/* Start Over */}
              <button
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                  setEnhancedImage(null);
                  setError(null);
                }}
                className="w-full py-3 text-gray-600 hover:text-gray-800 transition-colors font-light"
              >
                Enhance another image
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 text-center text-sm">
        <span className="text-gray-400">Powered by </span>
        <span className="text-red-400">Artificial Intelligence Developments</span>
      </footer>
    </div>
  );
}