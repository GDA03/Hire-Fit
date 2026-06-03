"use client";

import { useState } from "react";
import { CVReviewForm, ResultView } from "@/components/cv-review";
import { AnalyzeRequest, CVReviewResult } from "@/lib/cv-review/types";

const features = [
  {
    title: "ATS readiness",
    description: "Checks structure, keywords, measurable impact, and recruiter-friendly formatting signals.",
  },
  {
    title: "Role-fit feedback",
    description: "Compares your CV against a target job description when provided and highlights missing evidence.",
  },
  {
    title: "Actionable next steps",
    description: "Returns prioritized fixes, section notes, and keyword suggestions you can apply immediately.",
  },
];

const faqs = [
  {
    question: "Do I need an account?",
    answer: "No. Paste your CV or upload a PDF and run a review without signing in.",
  },
  {
    question: "Can I review against a job post?",
    answer: "Yes. Add a job description to get role-fit analysis, keyword gaps, and tailored recommendations.",
  },
  {
    question: "Does HireFit rewrite my CV?",
    answer: "No. It gives targeted feedback and suggested improvements so you can keep your experience honest.",
  },
];

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
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <nav className="border-b border-slate-200 bg-white/85 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="text-lg font-black tracking-tight">HireFit</div>
          <div className="hidden items-center gap-6 text-sm text-slate-600 sm:flex">
            <a href="#review" className="hover:text-cyan-700">Review CV</a>
            <a href="#preview" className="hover:text-cyan-700">What you get</a>
            <a href="#features" className="hover:text-cyan-700">Features</a>
            <a href="#faq" className="hover:text-cyan-700">FAQ</a>
          </div>
        </div>
      </nav>

      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div className="space-y-8">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-700">AI CV Reviewer</p>
            <h1 className="text-4xl font-black tracking-tight md:text-6xl">Make your CV fit the role without making things up.</h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-700">
              Upload a PDF or paste your CV, choose your review goal, and get structured feedback for ATS readiness, role fit, keywords, and next actions.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-2xl font-black text-cyan-700">12</p>
              <p className="text-sm text-slate-600">CV sections checked</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-2xl font-black text-cyan-700">2</p>
              <p className="text-sm text-slate-600">Languages supported</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-2xl font-black text-cyan-700">0</p>
              <p className="text-sm text-slate-600">Accounts required</p>
            </div>
          </div>

          <div id="preview" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-cyan-700">Preview</p>
            <ul className="space-y-3 text-sm text-slate-700">
              <li>• Overall ATS-style score and summary.</li>
              <li>• Section-by-section review with concrete action points.</li>
              <li>• Keyword gaps, career recommendations, and optional job-fit analysis.</li>
            </ul>
          </div>
        </div>

        <section id="review" className="space-y-5">
          <CVReviewForm loading={loading} onSubmit={handleReviewSubmit} />
          {error && <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-red-700">{error}</div>}
        </section>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-700">Review result</p>
              <h2 className="mt-2 text-2xl font-bold">Structured CV analysis will appear here.</h2>
            </div>
            {loading && <p className="text-sm text-cyan-700">Analyzing your CV...</p>}
          </div>

          <div className="mt-6">
            {analysis ? (
              <ResultView result={analysis} />
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">
                Submit your CV to generate the full review result.
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 pb-16">
        <div className="mb-8 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-700">Features</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">Focused review for faster CV improvements.</h2>
          <p className="mt-4 text-slate-700">HireFit turns your CV into a clear improvement checklist without inventing credentials or experience.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold">{feature.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-6xl px-6 pb-20">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-700">FAQ</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight">Common questions</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {faqs.map((faq) => (
              <article key={faq.question} className="rounded-2xl bg-slate-50 p-5">
                <h3 className="font-bold">{faq.question}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{faq.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
