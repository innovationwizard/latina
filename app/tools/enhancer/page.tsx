"use client";

import Enhancer from "../../Enhancer";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function EnhancerToolPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-light text-gray-900 mb-2">Render Assistant</h1>
          <p className="text-sm text-gray-500">Enhance proposal images with AI</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <Enhancer />
        </div>
      </div>
    </div>
  );
}


