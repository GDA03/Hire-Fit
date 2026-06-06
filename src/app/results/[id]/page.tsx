"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { ResultView } from "@/components/cv-review";
import type { CVReviewResult } from "@/lib/cv-review/types";

type ReviewStatus = "queued" | "processing" | "completed" | "failed";

type ReviewStatusResponse = {
  id: string;
  status: ReviewStatus;
  error?: string;
};

type FullReviewResponse = ReviewStatusResponse & {
  result?: CVReviewResult;
};

const reviewSteps = [
  {
    label: "Queued safely",
    detail: "Review masuk antrean dan file/text sudah diterima.",
    icon: "📥",
  },
  {
    label: "Reading CV structure",
    detail: "Sistem cek section, panjang konten, formatting, dan ATS signals.",
    icon: "🔎",
  },
  {
    label: "Matching role context",
    detail: "AI cari keyword gap, bukti pengalaman, dan relevansi target role.",
    icon: "🧭",
  },
  {
    label: "Building action plan",
    detail: "Insight diringkas jadi score, warning, dan prioritas perbaikan.",
    icon: "✨",
  },
];

export default function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [review, setReview] = useState<FullReviewResponse | null>(null);
  const [error, setError] = useState("");
  const [pollCount, setPollCount] = useState(0);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    async function fetchJson<T>(url: string) {
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Review not found or expired.");
      }

      return data as T;
    }

    async function pollReview() {
      try {
        const statusData = await fetchJson<ReviewStatusResponse>(`/api/cv-reviews/${id}/status`);
        if (cancelled) return;

        setPollCount((count) => count + 1);

        if (statusData.status === "completed") {
          const fullData = await fetchJson<FullReviewResponse>(`/api/cv-reviews/${id}`);
          if (!cancelled) setReview(fullData);
          return;
        }

        setReview(statusData);

        if (statusData.status !== "failed") {
          timeoutId = setTimeout(pollReview, 3000);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load review status.");
        }
      }
    }

    pollReview();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [id]);

  const activeStep = useMemo(() => {
    if (review?.status === "queued") return Math.min(1, pollCount);
    if (review?.status === "processing") return Math.min(3, Math.max(1, pollCount));
    return 0;
  }, [pollCount, review?.status]);

  return (
    <main className="min-h-screen overflow-hidden text-slate-950">
      <nav className="sticky top-0 z-30 border-b border-white/70 bg-white/70 px-6 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="flex items-center gap-3 text-lg font-black tracking-tight hover:text-cyan-700">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-cyan-500/20">HF</span>
            HireFit
          </Link>
          <span className="rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-500 shadow-sm">Review {id}</span>
        </div>
      </nav>

      <section className="relative mx-auto max-w-6xl px-6 py-10">
        <div className="pointer-events-none absolute -left-10 top-20 h-44 w-44 rounded-full bg-cyan-300/30 blur-3xl animate-blob-drift" />
        <div className="pointer-events-none absolute right-8 top-36 h-40 w-40 rounded-full bg-pink-300/30 blur-3xl animate-blob-drift" />

        <div className="relative rounded-[2.25rem] border border-white/80 bg-white/75 p-5 shadow-2xl shadow-slate-900/10 backdrop-blur md:p-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.25em] text-cyan-700">Review result</p>
              <h1 className="mt-2 text-3xl font-black md:text-5xl">Structured CV analysis</h1>
            </div>
            {review && review.status !== "completed" && !error && (
              <p className="rounded-full bg-cyan-100 px-4 py-2 text-sm font-black text-cyan-800">Status: {review.status}</p>
            )}
          </div>

          <div className="mt-6">
            {error ? (
              <div className="rounded-3xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700">{error}</div>
            ) : review?.status === "failed" ? (
              <div className="rounded-3xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700">
                {review.error ?? "CV review failed. Please try again."}
              </div>
            ) : review?.status === "completed" && review.result ? (
              <ResultView result={review.result} />
            ) : (
              <ReviewWaiting activeStep={activeStep} />
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function ReviewWaiting({ activeStep }: { activeStep: number }) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-pink-50 p-6 text-slate-950 shadow-inner md:p-8">
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
        <div className="text-center lg:text-left">
          <div className="relative mx-auto mb-6 h-32 w-32 lg:mx-0">
            <div className="absolute inset-0 rounded-[2rem] bg-slate-950 shadow-2xl shadow-cyan-900/20 animate-floaty" />
            <div className="absolute inset-3 grid place-items-center rounded-[1.5rem] bg-white text-5xl">📄</div>
            <span className="absolute -right-2 top-5 h-6 w-6 rounded-full bg-pink-400 animate-orbit" />
            <span className="absolute bottom-3 left-0 h-5 w-5 rounded-full bg-amber-300 animate-orbit" style={{ animationDuration: "7s" }} />
          </div>
          <h2 className="text-3xl font-black">CV lagi di-review. Jangan bengong.</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Kami pecah prosesnya jadi beberapa tahap supaya kamu tahu apa yang sedang dikerjakan.
          </p>
          <div className="mt-6 overflow-hidden rounded-full bg-white shadow-inner">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-cyan-400 via-pink-400 to-amber-300 transition-all duration-700 ease-out"
              style={{ width: `${Math.max(18, ((activeStep + 1) / reviewSteps.length) * 100)}%` }}
            />
          </div>
        </div>

        <div className="space-y-4">
          {reviewSteps.map((step, index) => {
            const done = index < activeStep;
            const active = index === activeStep;
            return (
              <div
                key={step.label}
                className={`animate-pop-in flex gap-4 rounded-3xl border p-4 transition duration-300 ${
                  active
                    ? "border-cyan-300 bg-white shadow-xl shadow-cyan-900/10"
                    : done
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-white bg-white/60"
                }`}
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-xl ${active ? "bg-slate-950 text-white animate-floaty" : done ? "bg-emerald-200" : "bg-slate-100"}`}>
                  {done ? "✓" : step.icon}
                </div>
                <div>
                  <h3 className="font-black text-slate-950">{step.label}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{step.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
