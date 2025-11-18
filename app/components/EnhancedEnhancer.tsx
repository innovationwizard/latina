'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Upload, Download, Loader2, Sparkles, Wand2, Palette, Sun, Plus } from 'lucide-react';
import MaterialReplacementTool from './MaterialReplacementTool';
import ColorReplacementTool from './ColorReplacementTool';
import LightingControlTool from './LightingControlTool';
import ElementAdditionTool from './ElementAdditionTool';

type EnhancementMode = 'general' | 'targeted' | 'color' | 'lighting' | 'elements';

export default function EnhancedEnhancer() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [mode, setMode] = useState<EnhancementMode>('general');
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [placementInstructions, setPlacementInstructions] = useState<string>('');
  const enhanceTimerRef = useRef<number | null>(null);

  const ALLOWED_FORMATS = ['image/jpeg', 'image/png'];
  const MAX_FILE_SIZE = 100 * 1024 * 1024;

  const validateFile = (file: File) => {
    if (!ALLOWED_FORMATS.includes(file.type)) {
      throw new Error('Solo se admiten archivos JPG y PNG');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('El archivo debe ser menor a 100MB');
    }
    return true;
  };

  const handleFile = useCallback((selectedFile: File) => {
    try {
      setError(null);
      setEnhancedImage(null);
      
      validateFile(selectedFile);
      
      setFile(selectedFile);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } catch (err: any) {
      setError(err.message);
      setFile(null);
      setPreview(null);
    }
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  }, [handleFile]);

  // General enhancement
  const enhanceImage = async () => {
    if (!file) return;
    
    setIsProcessing(true);
    enhanceTimerRef.current = Date.now();
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('mode', 'surfaces');

      const response = await fetch('/api/enhance', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'La mejora falló');
      }

      setEnhancedImage(data.enhancedUrl);
      if (enhanceTimerRef.current) {
        const elapsedSeconds = ((Date.now() - enhanceTimerRef.current) / 1000).toFixed(2);
        console.log(`Mejora completada en ${elapsedSeconds} segundos.`);
        enhanceTimerRef.current = null;
      }
    } catch (err: any) {
      setError(err.message);
      enhanceTimerRef.current = null;
    } finally {
      setIsProcessing(false);
    }
  };

  // Targeted enhancement with material replacement
  const handleTargetedEnhance = async (replacements: Array<{
    targetElement: string;
    fromMaterialId: string | null;
    toMaterialId: string;
  }>) => {
    if (!file) return;
    
    setIsProcessing(true);
    enhanceTimerRef.current = Date.now();
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('replacements', JSON.stringify(replacements));

      const response = await fetch('/api/enhance/targeted', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'La mejora dirigida falló');
      }

      setEnhancedImage(data.enhancedUrl);
      if (enhanceTimerRef.current) {
        const elapsedSeconds = ((Date.now() - enhanceTimerRef.current) / 1000).toFixed(2);
        console.log(`Mejora dirigida completada en ${elapsedSeconds} segundos.`);
        enhanceTimerRef.current = null;
      }
    } catch (err: any) {
      setError(err.message);
      enhanceTimerRef.current = null;
    } finally {
      setIsProcessing(false);
    }
  };

  // Color-only replacement
  const handleColorReplacement = async (replacements: Array<{
    targetElement: string;
    fromColor: string | null;
    toColor: string;
  }>) => {
    if (!file) return;
    
    setIsProcessing(true);
    enhanceTimerRef.current = Date.now();
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('replacements', JSON.stringify(replacements));

      const response = await fetch('/api/enhance/color', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'El cambio de color falló');
      }

      setEnhancedImage(data.enhancedUrl);
      if (enhanceTimerRef.current) {
        const elapsedSeconds = ((Date.now() - enhanceTimerRef.current) / 1000).toFixed(2);
        console.log(`Cambio de color completado en ${elapsedSeconds} segundos.`);
        enhanceTimerRef.current = null;
      }
    } catch (err: any) {
      setError(err.message);
      enhanceTimerRef.current = null;
    } finally {
      setIsProcessing(false);
    }
  };

  // Lighting modification
  const handleLightingModification = async (lightingConfig: {
    lightSources: Array<{
      type: string;
      position: { x: number; y: number; z: number };
      strength: number;
      warmth: number;
      color: string;
    }>;
    overallWarmth: number;
    overallBrightness: number;
  }) => {
    if (!file) return;
    
    setIsProcessing(true);
    enhanceTimerRef.current = Date.now();
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('lightingConfig', JSON.stringify(lightingConfig));

      const response = await fetch('/api/enhance/lighting', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'La modificación de iluminación falló');
      }

      setEnhancedImage(data.enhancedUrl);
      if (enhanceTimerRef.current) {
        const elapsedSeconds = ((Date.now() - enhanceTimerRef.current) / 1000).toFixed(2);
        console.log(`Modificación de iluminación completada en ${elapsedSeconds} segundos.`);
        enhanceTimerRef.current = null;
      }
    } catch (err: any) {
      setError(err.message);
      enhanceTimerRef.current = null;
    } finally {
      setIsProcessing(false);
    }
  };

  // Element addition
  const handleElementAddition = async () => {
    if (!file || selectedElementIds.length === 0) return;
    
    setIsProcessing(true);
    enhanceTimerRef.current = Date.now();
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('elements', JSON.stringify(selectedElementIds));
      if (placementInstructions) {
        formData.append('placement_instructions', placementInstructions);
      }

      const response = await fetch('/api/enhance/elements', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'La adición de elementos falló');
      }

      setEnhancedImage(data.enhancedUrl);
      if (enhanceTimerRef.current) {
        const elapsedSeconds = ((Date.now() - enhanceTimerRef.current) / 1000).toFixed(2);
        console.log(`Adición de elementos completada en ${elapsedSeconds} segundos.`);
        enhanceTimerRef.current = null;
      }
    } catch (err: any) {
      setError(err.message);
      enhanceTimerRef.current = null;
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadImage = async () => {
    if (!enhancedImage) return;

    try {
      const response = await fetch(enhancedImage);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `enhanced-${file?.name || 'image.jpg'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Error al descargar la imagen');
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setEnhancedImage(null);
    setError(null);
    setSelectedElementIds([]);
    setPlacementInstructions('');
  };

  return (
    <div className="w-full">
      {/* Mode Selection Tabs */}
      {!enhancedImage && (
        <div className="mb-6 border-b border-gray-200">
          <div className="flex gap-4">
            <button
              onClick={() => {
                setMode('general');
                reset();
              }}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                mode === 'general'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Mejora General
              </div>
            </button>
            <button
              onClick={() => {
                setMode('targeted');
                reset();
              }}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                mode === 'targeted'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4" />
                Reemplazo de Materiales
              </div>
            </button>
            <button
              onClick={() => {
                setMode('color');
                reset();
              }}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                mode === 'color'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Cambio de Color
              </div>
            </button>
            <button
              onClick={() => {
                setMode('lighting');
                reset();
              }}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                mode === 'lighting'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4" />
                Iluminación
              </div>
            </button>
            <button
              onClick={() => {
                setMode('elements');
                reset();
              }}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                mode === 'elements'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Agregar Elementos
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Upload Section */}
      {!enhancedImage && (
        <div className="space-y-6">
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
                  Arrastra tu imagen aquí
                </p>
                <p className="text-sm text-gray-400 mb-4">o</p>
                <span className="inline-block px-6 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors">
                  Explorar para subir
                </span>
                <p className="text-xs text-gray-400 mt-4">
                  JPG o PNG
                </p>
              </label>
            ) : (
              <div className="space-y-4">
                <img 
                  src={preview} 
                  alt="Vista previa" 
                  className="max-h-64 mx-auto rounded-lg shadow-sm"
                />
                <button
                  onClick={reset}
                  className="text-sm text-gray-500 hover:text-gray-700"
                  disabled={isProcessing}
                >
                  Cambiar imagen
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

          {/* General Mode: Simple Enhance Button */}
          {mode === 'general' && preview && !isProcessing && (
            <button
              onClick={enhanceImage}
              className="w-full py-3 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors text-sm font-light"
            >
              Mejorar Imagen
            </button>
          )}

          {/* Targeted Mode: Material Replacement Tool */}
          {mode === 'targeted' && preview && (
            <MaterialReplacementTool
              onEnhance={handleTargetedEnhance}
              isProcessing={isProcessing}
            />
          )}

          {/* Color Mode: Color Replacement Tool */}
          {mode === 'color' && preview && (
            <ColorReplacementTool
              onEnhance={handleColorReplacement}
              isProcessing={isProcessing}
            />
          )}

          {/* Lighting Mode: Lighting Control Tool */}
          {mode === 'lighting' && preview && (
            <LightingControlTool
              onEnhance={handleLightingModification}
              isProcessing={isProcessing}
            />
          )}

          {/* Elements Mode: Element Addition Tool */}
          {mode === 'elements' && preview && (
            <div className="space-y-4">
              <ElementAdditionTool
                onElementsChange={setSelectedElementIds}
                selectedElementIds={selectedElementIds}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instrucciones de Ubicación (Opcional)
                </label>
                <textarea
                  value={placementInstructions}
                  onChange={(e) => setPlacementInstructions(e.target.value)}
                  placeholder="Ej: Colocar la silla cerca de la ventana, el sofá frente a la chimenea..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Proporciona instrucciones específicas sobre dónde colocar los elementos en la imagen
                </p>
              </div>
              {selectedElementIds.length > 0 && !isProcessing && (
                <button
                  onClick={handleElementAddition}
                  className="w-full py-3 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors text-sm font-light"
                >
                  Agregar {selectedElementIds.length} Elemento{selectedElementIds.length > 1 ? 's' : ''} a la Imagen
                </button>
              )}
            </div>
          )}

          {/* Loading State */}
          {isProcessing && (
            <div className="text-center space-y-4 py-8">
              <div className="relative w-16 h-16 mx-auto">
                <Loader2 className="w-16 h-16 text-gray-400 animate-spin" />
              </div>
              <p className="text-gray-600 font-light">
                {mode === 'targeted' 
                  ? 'Aplicando cambios de materiales...' 
                  : mode === 'color'
                  ? 'Aplicando cambios de color...'
                  : mode === 'lighting'
                  ? 'Aplicando cambios de iluminación...'
                  : mode === 'elements'
                  ? 'Agregando elementos a la imagen...'
                  : 'Creando magia...'}
              </p>
              <p className="text-sm text-gray-400">
                Esto puede tomar varios segundos...
              </p>
            </div>
          )}
        </div>
      )}

      {/* Result Section */}
      {enhancedImage && (
        <div className="space-y-6">
          <h2 className="text-lg font-light text-gray-900">
            Imagen Mejorada
          </h2>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <img 
              src={enhancedImage} 
              alt="Mejorada" 
              className="w-full rounded-lg"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={downloadImage}
              className="flex-1 py-3 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors text-sm font-light flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Descargar
            </button>

            <button
              onClick={reset}
              className="flex-1 py-3 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md transition-colors"
            >
              Mejorar Otra Imagen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

