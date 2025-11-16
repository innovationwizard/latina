'use client';

import { useState } from 'react';
import { ArrowLeft, Calculator } from 'lucide-react';
import Link from 'next/link';

export default function FurnitureQuotePage() {
  const [formData, setFormData] = useState({
    type: 'wardrobe' as const,
    width: '',
    height: '',
    depth: '',
    materialTier: 'mid' as const,
    addOns: [] as string[],
    complexity: 'moderate' as const,
  });

  const [result, setResult] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setResult(null);
    setError(null);
  };

  const handleAddOnToggle = (addon: string) => {
    setFormData((prev) => ({
      ...prev,
      addOns: prev.addOns.includes(addon)
        ? prev.addOns.filter((a) => a !== addon)
        : [...prev.addOns, addon],
    }));
    setResult(null);
  };

  const handleCalculate = async () => {
    setIsCalculating(true);
    setError(null);

    try {
      const response = await fetch('/api/quotes/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'furniture',
          width: parseFloat(formData.width),
          height: parseFloat(formData.height),
          depth: parseFloat(formData.depth),
          materialTier: formData.materialTier,
          addOns: formData.addOns,
          complexity: formData.complexity,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Calculation failed');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsCalculating(false);
    }
  };

  const addOns = [
    { id: 'lighting', label: 'Lighting' },
    { id: 'specialHardware', label: 'Special Hardware' },
    { id: 'customFinishes', label: 'Custom Finishes' },
    { id: 'softClose', label: 'Soft-Close Mechanisms' },
    { id: 'glassDoors', label: 'Glass Doors' },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <Link
            href="/quotes"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Quotes
          </Link>
          <h1 className="text-3xl font-light text-gray-900 mb-2">Furniture Quote</h1>
          <p className="text-sm text-gray-500">Calculate pricing for custom furniture pieces</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-light text-gray-900 mb-6">Specifications</h2>

              <div className="space-y-5">
                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Furniture Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => handleChange('type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                  >
                    <option value="wardrobe">Wardrobe</option>
                    <option value="kitchen">Kitchen</option>
                    <option value="bookshelf">Bookshelf</option>
                    <option value="table">Table</option>
                    <option value="cabinet">Cabinet</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                {/* Dimensions */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Width (cm)</label>
                    <input
                      type="number"
                      value={formData.width}
                      onChange={(e) => handleChange('width', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Height (cm)</label>
                    <input
                      type="number"
                      value={formData.height}
                      onChange={(e) => handleChange('height', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Depth (cm)</label>
                    <input
                      type="number"
                      value={formData.depth}
                      onChange={(e) => handleChange('depth', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Material Tier */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Material Tier
                  </label>
                  <select
                    value={formData.materialTier}
                    onChange={(e) => handleChange('materialTier', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                  >
                    <option value="basic">Basic</option>
                    <option value="mid">Mid-Range</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>

                {/* Complexity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Complexity
                  </label>
                  <select
                    value={formData.complexity}
                    onChange={(e) => handleChange('complexity', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                  >
                    <option value="simple">Simple</option>
                    <option value="moderate">Moderate</option>
                    <option value="complex">Complex</option>
                  </select>
                </div>

                {/* Add-ons */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Add-ons
                  </label>
                  <div className="space-y-2">
                    {addOns.map((addon) => (
                      <label
                        key={addon.id}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.addOns.includes(addon.id)}
                          onChange={() => handleAddOnToggle(addon.id)}
                          className="w-4 h-4 text-gray-600 border-gray-300 rounded focus:ring-gray-400"
                        />
                        <span className="text-sm text-gray-700">{addon.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={handleCalculate}
                disabled={isCalculating || !formData.width || !formData.height || !formData.depth}
                className="w-full mt-6 py-3 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-light"
              >
                {isCalculating ? (
                  <>Calculating...</>
                ) : (
                  <>
                    <Calculator className="w-4 h-4" />
                    Calculate Quote
                  </>
                )}
              </button>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Results */}
          <div>
            {result && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-6">
                <h2 className="text-lg font-light text-gray-900 mb-6">Quote Summary</h2>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Base (×{result.materialMultiplier.toFixed(1)} ×{result.complexityMultiplier.toFixed(1)})</span>
                    <span className="text-gray-900">${result.breakdown.base.toLocaleString()} MXN</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Volume</span>
                    <span className="text-gray-900">${result.breakdown.volume.toLocaleString()} MXN</span>
                  </div>
                  {result.breakdown.addOns > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Add-ons</span>
                      <span className="text-gray-900">${result.breakdown.addOns.toLocaleString()} MXN</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Labor</span>
                    <span className="text-gray-900">${result.breakdown.labor.toLocaleString()} MXN</span>
                  </div>
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <div className="flex justify-between">
                      <span className="text-base font-medium text-gray-900">Total</span>
                      <span className="text-2xl font-light text-gray-900">
                        ${result.total.toLocaleString()} MXN
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => window.print()}
                  className="w-full py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md transition-colors"
                >
                  Print / Export
                </button>
              </div>
            )}

            {!result && (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <p className="text-sm text-gray-400">Fill in the form and calculate to see quote</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

