"use client";

import { useState } from "react";

type RewriteCardProps = {
  title: string;
  items: string[];
  emptyText?: string;
};

export function RewriteCard({ title, items, emptyText = "No rewrite examples provided." }: RewriteCardProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  async function handleCopy(item: string, index: number) {
    await navigator.clipboard.writeText(item);
    setCopiedIndex(index);
    window.setTimeout(() => setCopiedIndex((current) => (current === index ? null : current)), 1800);
  }

  return (
    <div className="rounded-2xl border border-cyan-400/20 bg-cyan-950/20 p-4">
      <h4 className="font-semibold text-cyan-100">{title}</h4>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-3 text-sm text-slate-300">
          {items.map((item, index) => (
            <li key={`${title}-${index}`} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 leading-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <p className="flex-1">{item}</p>
                <button
                  type="button"
                  onClick={() => void handleCopy(item, index)}
                  className="shrink-0 rounded-lg border border-cyan-400/30 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
                  aria-label={`Copy ${title} example ${index + 1}`}
                >
                  {copiedIndex === index ? "Copied" : "Copy"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-slate-500">{emptyText}</p>
      )}
    </div>
  );
}
