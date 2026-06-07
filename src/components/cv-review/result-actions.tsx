"use client";

import Link from "next/link";
import { useState } from "react";
import type { ReviewLanguage } from "@/lib/cv-review/types";

type ResultActionsProps = {
  language: ReviewLanguage;
  onLanguageChange: (language: ReviewLanguage) => void;
};

const copyText = {
  en: "Copy link",
  id: "Salin link",
};

export function ResultActions({ language, onLanguageChange }: ResultActionsProps) {
  const [copied, setCopied] = useState(false);

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

  return (
    <div className="flex flex-col gap-3 rounded-[1.5rem] border border-indigo-100 bg-white/82 p-3 shadow-sm backdrop-blur sm:flex-row sm:items-center">
      <div className="grid grid-cols-2 rounded-2xl bg-[#F2F0FF] p-1 text-xs font-black">
        <button
          type="button"
          onClick={() => onLanguageChange("en")}
          className={`rounded-xl px-3 py-2 transition ${language === "en" ? "bg-[#635BFF] text-white shadow-sm" : "text-slate-500 hover:text-[#635BFF]"}`}
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => onLanguageChange("id")}
          className={`rounded-xl px-3 py-2 transition ${language === "id" ? "bg-[#635BFF] text-white shadow-sm" : "text-slate-500 hover:text-[#635BFF]"}`}
        >
          ID
        </button>
      </div>
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
