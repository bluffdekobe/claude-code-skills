"use client";

import { useState } from "react";
import { X, Copy, Check } from "lucide-react";
import { Business } from "@/lib/types";

interface Props {
  business: Business;
  onClose: () => void;
}

export default function PromptModal({ business, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(business.lovablePrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b p-5">
          <div>
            <h2 className="text-lg font-semibold">{business.name}</h2>
            <p className="text-sm text-gray-500">
              {business.category} · {business.address}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Prompt body */}
        <div className="p-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
            Lovable Prompt
          </p>
          <div className="rounded-xl bg-gray-50 p-4 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
            {business.lovablePrompt}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t px-5 py-4">
          <button
            onClick={copy}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "Copied!" : "Copy prompt"}
          </button>
        </div>
      </div>
    </div>
  );
}
