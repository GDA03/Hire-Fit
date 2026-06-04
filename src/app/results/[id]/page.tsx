"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
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

export default function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [review, setReview] = useState<FullReviewResponse | null>(null);
  const [error, setError] = useState("");

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

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <nav className="border-b border-slate-200 bg-white/85 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="text-lg font-black tracking-tight hover:text-cyan-700">
            HireFit
          </Link>
          <span className="text-sm text-slate-500">Review {id}</span>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-700">Review result</p>
              <h1 className="mt-2 text-2xl font-bold">Structured CV analysis</h1>
            </div>
            {review && review.status !== "completed" && !error && (
              <p className="text-sm text-cyan-700">Status: {review.status}</p>
            )}
          </div>

          <div className="mt-6">
            {error ? (
              <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-red-700">{error}</div>
            ) : review?.status === "failed" ? (
              <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-red-700">
                {review.error ?? "CV review failed. Please try again."}
              </div>
            ) : review?.status === "completed" && review.result ? (
              <ResultView result={review.result} />
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">
                <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-700" />
                <h2 className="text-xl font-bold text-slate-900">Analyzing your CV...</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Checking ATS readiness, keywords, section scores, and role-fit signals. Result appears here when ready.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
