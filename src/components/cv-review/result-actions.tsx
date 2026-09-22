"use client";

import Link from "next/link";
import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { downloadReviewPdf } from "@/lib/cv-review/download-pdf";
import type { ReviewLanguage } from "@/lib/cv-review/types";

type ResultActionsProps = {
  language: ReviewLanguage;
  onLanguageChange: (language: ReviewLanguage) => void;
  translatingLanguage?: ReviewLanguage | null;
  onDownloadPdf?: () => Promise<void> | void;
  reviewId?: string;
};

const copyText = {
  en: "Copy link",
  id: "Salin link",
};

const downloadText = {
  en: "Download PDF",
  id: "Unduh PDF",
};

const downloadingText = {
  en: "Generating PDF...",
  id: "Membuat PDF...",
};
export function ResultActions({
  language,
  onLanguageChange,
  translatingLanguage,
  onDownloadPdf,
  reviewId,
}: ResultActionsProps) {
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  async function handleShare() {
    const url = window.location.href;
    const shareData = {
      title: "HireFit CV Review",
      text: language === "id" ? "Lihat hasil review CV dari HireFit." : "View this HireFit CV review result.",
      url,
    };

    if (navigator.share) {
      await navigator.share(shareData);
      return;
    }

    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function handleDownloadPdf() {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      if (onDownloadPdf) {
        await onDownloadPdf();
      } else {
        const filename = reviewId ? `HireFit-Review-${reviewId}.pdf` : "HireFit-CV-Review.pdf";
        await downloadReviewPdf({ elementId: "review-result-content", filename });
      }
    } catch (err) {
      console.error("PDF download error:", err);
    } finally {
      setIsDownloading(false);
    }
  }
  return (
    <div className="no-print flex flex-col gap-3 rounded-[1.5rem] border border-indigo-100 bg-white/82 p-3 shadow-sm backdrop-blur sm:flex-row sm:items-center">
      <div className="grid grid-cols-2 rounded-2xl bg-[#F2F0FF] p-1 text-xs font-black">
        <button
          type="button"
          disabled={Boolean(translatingLanguage)}
          onClick={() => onLanguageChange("en")}
          className={`rounded-xl px-3 py-2 transition disabled:cursor-wait disabled:opacity-70 ${language === "en" ? "bg-[#635BFF] text-white shadow-sm" : "text-slate-500 hover:text-[#635BFF]"}`}
        >
          {translatingLanguage === "en" ? "..." : "EN"}
        </button>
        <button
          type="button"
          disabled={Boolean(translatingLanguage)}
          onClick={() => onLanguageChange("id")}
          className={`rounded-xl px-3 py-2 transition disabled:cursor-wait disabled:opacity-70 ${language === "id" ? "bg-[#635BFF] text-white shadow-sm" : "text-slate-500 hover:text-[#635BFF]"}`}
        >
          {translatingLanguage === "id" ? "..." : "ID"}
        </button>
      </div>
      <button
        type="button"
        onClick={() => void handleDownloadPdf()}
        disabled={isDownloading}
        className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-[#635BFF] to-[#7B73FF] px-4 py-2 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-indigo-500/20 disabled:cursor-wait disabled:opacity-75"
      >
        {isDownloading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{downloadingText[language]}</span>
          </>
        ) : (
          <>
            <FileDown className="h-4 w-4" />
            <span>{downloadText[language]}</span>
          </>
        )}
      </button>
      <button
        type="button"
        onClick={() => void handleShare()}
        className="rounded-2xl bg-[#17152F] px-4 py-2 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#635BFF]"
      >
        {copied ? (language === "id" ? "Tersalin" : "Copied") : copyText[language]}
      </button>
      <Link
        href="/"
        className="rounded-2xl border border-indigo-100 bg-white px-4 py-2 text-center text-sm font-black text-[#635BFF] transition hover:-translate-y-0.5 hover:bg-[#F2F0FF]"
      >
        {language === "id" ? "Kembali home" : "Back home"}
      </Link>
    </div>
  );
}
