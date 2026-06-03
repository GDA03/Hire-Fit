"use client";

import { useState } from "react";
import { CVReviewForm } from "@/components/cv-review/cv-review-form";
import { AnalyzeRequest, CVReviewResult } from "@/lib/cv-review/types";

export default function Home() {
  const [analysis, setAnalysis] = useState<CVReviewResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleReviewSubmit(request: AnalyzeRequest) {
    setLoading(true);
    setError("");
    setAnalysis(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "CV review failed. Please try again.");
      }
      setAnalysis(data as CVReviewResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "CV review failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <nav className="border-b border-slate-900/80 bg-slate-950/80 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="text-lg font-black tracking-tight">HireFit</div>
          <div className="hidden items-center gap-6 text-sm text-slate-400 sm:flex">
            <a href="#review" className="hover:text-cyan-200">Review CV</a>
            <a href="#preview" className="hover:text-cyan-200">What you get</a>
          </div>
        </div>
      </nav>

      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div className="space-y-8">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">AI CV Reviewer</p>
            <h1 className="text-4xl font-black tracking-tight md:text-6xl">Make your CV fit the role without making things up.</h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-300">
              Upload a PDF or paste your CV, choose your review goal, and get structured feedback for ATS readiness, role fit, keywords, and next actions.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-2xl font-black text-cyan-200">12</p>
              <p className="text-sm text-slate-400">CV sections checked</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-2xl font-black text-cyan-200">2</p>
              <p className="text-sm text-slate-400">Languages supported</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-2xl font-black text-cyan-200">0</p>
              <p className="text-sm text-slate-400">Accounts required</p>
            </div>
          </div>

          <div id="preview" className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">Preview</p>
            <ul className="space-y-3 text-sm text-slate-300">
              <li>• Overall ATS-style score and summary.</li>
              <li>• Section-by-section review with concrete action points.</li>
              <li>• Keyword gaps, career recommendations, and optional job-fit analysis.</li>
            </ul>
          </div>
        </div>

        <section id="review" className="space-y-5">
          <CVReviewForm loading={loading} onSubmit={handleReviewSubmit} />
          {error && <div className="rounded-2xl border border-red-500/60 bg-red-950/50 p-4 text-red-100">{error}</div>}
        </section>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 md:p-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">Review result</p>
              <h2 className="mt-2 text-2xl font-bold">Structured CV analysis will appear here.</h2>
            </div>
            {loading && <p className="text-sm text-cyan-200">Analyzing your CV...</p>}
          </div>

          {analysis ? (
            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Task 4 placeholder</p>
              <p className="mt-2 text-lg font-semibold">Result received. Score: {analysis.overallScore}/100</p>
              <p className="mt-2 text-slate-300">{analysis.summary}</p>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-700 bg-slate-950/70 p-8 text-center text-slate-400">
              Submit your CV to generate the Task 4 result UI data.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
