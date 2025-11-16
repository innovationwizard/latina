'use client';

import Link from 'next/link';
import { Calculator, ArrowLeft } from 'lucide-react';

export default function QuotesPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-light text-gray-900 mb-2">Quotes</h1>
          <p className="text-sm text-gray-500">Calculate pricing for space design and furniture pieces</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Space Design Quote */}
          <Link
            href="/quotes/space"
            className="group bg-white rounded-lg border border-gray-200 p-8 hover:border-gray-300 transition-colors"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-light text-gray-900 mb-2">Space Design</h2>
                <p className="text-sm text-gray-500">
                  Calculate pricing for interior space design projects
                </p>
              </div>
              <Calculator className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </div>
            <div className="mt-6 text-xs text-gray-400">
              Room type, area, scope, materials, and revisions
            </div>
          </Link>

          {/* Furniture Quote */}
          <Link
            href="/quotes/furniture"
            className="group bg-white rounded-lg border border-gray-200 p-8 hover:border-gray-300 transition-colors"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-light text-gray-900 mb-2">Furniture Piece</h2>
                <p className="text-sm text-gray-500">
                  Calculate pricing for custom furniture pieces
                </p>
              </div>
              <Calculator className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </div>
            <div className="mt-6 text-xs text-gray-400">
              Dimensions, material tier, complexity, and add-ons
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
