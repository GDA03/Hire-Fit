"use client";

import { use, useEffect, useMemo, useState } from "react";
import { ResultActions } from "@/components/cv-review/result-actions";
import { ResultView } from "@/components/cv-review";
import { BrandLink } from "@/components/site-brand";
import type { AnalyzeRequest, CVReviewResult, ReviewLanguage } from "@/lib/cv-review/types";

type ReviewStatus = "queued" | "processing" | "completed" | "failed";

type ReviewStatusResponse = {
  id: string;
  status: ReviewStatus;
  error?: string;
};

type FullReviewResponse = ReviewStatusResponse & {
  request?: AnalyzeRequest;
  result?: CVReviewResult;
  translations?: Partial<Record<ReviewLanguage, CVReviewResult>>;
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

const translationSteps = [
  {
    label: "Preparing translation",
    detail: "Mengambil hasil review yang sudah selesai tanpa review ulang CV.",
    icon: "🗂️",
  },
  {
    label: "Translating review content",
    detail: "AI menerjemahkan teks saja. Score, prioritas, dan urutan tetap sama.",
    icon: "🌐",
  },
  {
    label: "Saving cached result",
    detail: "Hasil terjemahan disimpan supaya toggle berikutnya instan dan tidak boros token.",
    icon: "💾",
  },
];

export default function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [review, setReview] = useState<FullReviewResponse | null>(null);
  const [error, setError] = useState("");
  const [pollCount, setPollCount] = useState(0);
  const [language, setLanguage] = useState<ReviewLanguage>("en");
  const [resultsByLanguage, setResultsByLanguage] = useState<Partial<Record<ReviewLanguage, CVReviewResult>>>({});
  const [translationError, setTranslationError] = useState("");
  const [translatingLanguage, setTranslatingLanguage] = useState<ReviewLanguage | null>(null);
  const [failedTranslationLanguage, setFailedTranslationLanguage] = useState<ReviewLanguage | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

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
          if (!cancelled) {
            const originalLanguage = fullData.request?.language ?? "en";
            setReview(fullData);
            setLanguage(originalLanguage);
            setResultsByLanguage({
              ...(fullData.result ? { [originalLanguage]: fullData.result } : {}),
              ...(fullData.translations ?? {}),
            });
          }
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
  }, [id, retryCount]);

  async function handleRetry() {
    setRetrying(true);
    setError("");
    setTranslationError("");

    try {
      const response = await fetch(`/api/cv-reviews/${id}/retry`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to retry CV review.");

      setReview({ id, status: "queued" });
      setPollCount(0);
      setResultsByLanguage({});
      setRetryCount((count) => count + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to retry CV review.");
    } finally {
      setRetrying(false);
    }
  }

  async function handleLanguageChange(nextLanguage: ReviewLanguage) {
    setTranslationError("");
    setFailedTranslationLanguage(null);

    if (resultsByLanguage[nextLanguage]) {
      setLanguage(nextLanguage);
      return;
    }

    setTranslatingLanguage(nextLanguage);
    try {
      const response = await fetch(`/api/cv-reviews/${id}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: nextLanguage }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to translate review.");

      setResultsByLanguage((current) => ({ ...current, [nextLanguage]: data.result as CVReviewResult }));
      setLanguage(nextLanguage);
    } catch (err) {
      setFailedTranslationLanguage(nextLanguage);
      setTranslationError(err instanceof Error ? err.message : "Failed to translate review.");
    } finally {
      setTranslatingLanguage(null);
    }
  }

  const activeStep = useMemo(() => {
    if (review?.status === "queued") return Math.min(1, pollCount);
    if (review?.status === "processing") return Math.min(3, Math.max(1, pollCount));
    return 0;
  }, [pollCount, review?.status]);

  const visibleResult = resultsByLanguage[language] ?? review?.result;

  return (
    <main className="min-h-screen overflow-hidden text-slate-950">
      <nav className="sticky top-0 z-30 border-b border-indigo-100/80 bg-white/72 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <BrandLink className="text-xl" />
          <span className="truncate rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-500 shadow-sm">Review {id}</span>
        </div>
      </nav>

      <section className="relative mx-auto max-w-6xl px-6 py-10 print:max-w-none print:px-0 print:py-0">
        <div className="pointer-events-none absolute -left-10 top-20 h-44 w-44 rounded-full bg-cyan-300/30 blur-3xl animate-blob-drift" />
        <div className="pointer-events-none absolute right-8 top-36 h-40 w-40 rounded-full bg-pink-300/30 blur-3xl animate-blob-drift" />
        <div className="pointer-events-none absolute left-1/3 top-8 h-28 w-28 rounded-full bg-[#635BFF]/15 blur-3xl animate-result-pulse" />

        <div className="relative rounded-[2.25rem] border border-white/80 bg-white/75 p-5 shadow-2xl shadow-slate-900/10 backdrop-blur md:p-8 print:border-0 print:bg-transparent print:p-0 print:shadow-none">
          <div className="hidden border-b border-slate-200 pb-4 mb-6 print:flex items-center justify-between">
            <BrandLink className="text-2xl" />
            <div className="text-right text-xs text-slate-500">
              <p className="font-bold text-slate-900">HireFit CV Review Report</p>
              <p>ID: {id}</p>
            </div>
          </div>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.25em] text-cyan-700">{language === "id" ? "Hasil review" : "Review result"}</p>
              <h1 className="mt-2 text-3xl font-black md:text-5xl">{language === "id" ? "Analisis CV terstruktur" : "Structured CV analysis"}</h1>
            </div>
            {review?.status === "completed" && visibleResult ? (
              <ResultActions language={language} onLanguageChange={handleLanguageChange} translatingLanguage={translatingLanguage} reviewId={id} />
            ) : review && !error ? (
              <p className="rounded-full bg-cyan-100 px-4 py-2 text-sm font-black text-cyan-800">Status: {review.status}</p>
            ) : null}
          </div>
          {translationError && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-600">
              <p>{translationError}</p>
              {failedTranslationLanguage && (
                <button
                  type="button"
                  onClick={() => handleLanguageChange(failedTranslationLanguage)}
                  disabled={Boolean(translatingLanguage)}
                  className="rounded-xl bg-[#635BFF] px-4 py-2 text-xs font-black text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Try translation again
                </button>
              )}
            </div>
          )}

          <div className="mt-6">
            {error ? (
              <div className="rounded-3xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700">{error}</div>
            ) : review?.status === "failed" ? (
              <div className="space-y-4 rounded-3xl border border-red-200 bg-red-50 p-5 font-semibold text-red-700">
                <p>{review.error ?? "CV review failed. Please try again."}</p>
                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={retrying}
                  className="rounded-2xl bg-[#635BFF] px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {retrying ? "Retrying..." : "Try again"}
                </button>
              </div>
            ) : translatingLanguage ? (
              <TranslationWaiting targetLanguage={translatingLanguage} />
            ) : review?.status === "completed" && visibleResult ? (
              <div className="space-y-6">
                <div id="review-result-content" className="space-y-6">
                  <ResultView result={visibleResult} language={language} />
                </div>
                <div className="flex justify-center pt-2">
                  <ResultActions language={language} onLanguageChange={handleLanguageChange} translatingLanguage={translatingLanguage} reviewId={id} />
                </div>
              </div>
            ) : (
              <ReviewWaiting activeStep={activeStep} />
            )}
          </div>
        </div>
      </section>

      <footer className="border-t border-indigo-100/80 bg-white/76 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-6 py-8 md:flex-row md:items-center md:justify-between">
          <div>
            <BrandLink className="text-lg" />
            <p className="mt-3 max-w-md text-sm font-semibold leading-6 text-slate-600">
              Personal portfolio project by Gerald. CV review UX, async processing, and ATS feedback in one flow.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm font-black text-slate-600">
            <a className="rounded-2xl border border-indigo-100 bg-white px-4 py-2 transition hover:border-[#635BFF] hover:text-[#635BFF]" href="https://github.com/GDA03" target="_blank" rel="noreferrer">GitHub</a>
            <a className="rounded-2xl border border-indigo-100 bg-white px-4 py-2 transition hover:border-[#635BFF] hover:text-[#635BFF]" href="https://www.linkedin.com/in/gdustin/" target="_blank" rel="noreferrer">LinkedIn</a>
            <a className="rounded-2xl border border-indigo-100 bg-white px-4 py-2 transition hover:border-[#635BFF] hover:text-[#635BFF]" href="https://portofolio-gerald.vercel.app/" target="_blank" rel="noreferrer">Portfolio</a>
          </div>
        </div>
      </footer>
    </main>
  );
}

function TranslationWaiting({ targetLanguage }: { targetLanguage: ReviewLanguage }) {
  const targetLabel = targetLanguage === "id" ? "Bahasa Indonesia" : "English";

  return (
    <div className="overflow-hidden rounded-[2rem] border border-indigo-100 bg-gradient-to-br from-[#F2F0FF] via-white to-cyan-50 p-6 text-slate-950 shadow-inner md:p-8">
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
        <div className="text-center lg:text-left">
          <div className="relative mx-auto mb-6 h-32 w-32 lg:mx-0">
            <div className="absolute inset-0 rounded-[2rem] bg-[#17152F] shadow-2xl shadow-indigo-900/20 animate-floaty" />
            <div className="absolute inset-3 grid place-items-center rounded-[1.5rem] bg-white text-5xl">🌐</div>
            <span className="absolute -right-2 top-5 h-6 w-6 rounded-full bg-[#635BFF] animate-orbit" />
            <span className="absolute bottom-3 left-0 h-5 w-5 rounded-full bg-teal-400 animate-orbit" style={{ animationDuration: "7s" }} />
          </div>
          <h2 className="text-3xl font-black">Translating to {targetLabel}</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Tunggu sebentar. Ini cuma translate hasil review yang sudah ada, bukan review ulang CV.
          </p>
          <div className="mt-6 overflow-hidden rounded-full bg-white shadow-inner">
            <div className="h-3 w-2/3 rounded-full bg-gradient-to-r from-[#635BFF] via-cyan-400 to-teal-400 transition-all duration-700 ease-out animate-result-pulse" />
          </div>
        </div>

        <div className="space-y-4">
          {translationSteps.map((step, index) => (
            <div
              key={step.label}
              className={`animate-pop-in flex gap-4 rounded-3xl border p-4 transition duration-300 ${
                index === 1 ? "border-indigo-300 bg-white shadow-xl shadow-indigo-900/10" : "border-white bg-white/60"
              }`}
              style={{ animationDelay: `${index * 90}ms` }}
            >
              <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-xl ${index === 1 ? "bg-[#17152F] text-white animate-floaty" : "bg-slate-100"}`}>
                {step.icon}
              </div>
              <div>
                <h3 className="font-black text-slate-950">{step.label}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{step.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
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
