"use client";

import { FormEvent, useState } from "react";

type Analysis = {
  matchScore: number;
  summary: string;
  strengths: string[];
  missingKeywords: string[];
  weakBullets: { original: string; issue: string; rewrite: string }[];
  interviewQuestions: { question: string; whyItMatters: string }[];
  prepPlan7Days: { day: number; focus: string; tasks: string[] }[];
};

export default function Home() {
  const [cvText, setCvText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState("");
  const [pdfStatus, setPdfStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [extractingPdf, setExtractingPdf] = useState(false);

  async function handlePdfUpload(file: File | undefined) {
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file.");
      return;
    }

    setError("");
    setPdfStatus(`Reading ${file.name}...`);
    setExtractingPdf(true);

    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
      const buffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
      const pageTexts = await Promise.all(
        Array.from({ length: pdf.numPages }, async (_, index) => {
          const page = await pdf.getPage(index + 1);
          const content = await page.getTextContent();
          return content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
        }),
      );
      const extractedText = pageTexts.join("\n\n").trim();
      if (extractedText.length < 50) {
        throw new Error("PDF text extraction produced too little text. Try copy-paste CV text manually.");
      }
      setCvText(extractedText);
      setPdfStatus(`Extracted ${extractedText.length.toLocaleString()} characters from ${file.name}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to extract PDF text.");
      setPdfStatus("");
    } finally {
      setExtractingPdf(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setAnalysis(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvText, jobDescription }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Analysis failed");
      setAnalysis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <section className="mx-auto max-w-6xl space-y-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">HireFit</p>
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">AI CV / JD Fit Reviewer</h1>
          <p className="max-w-2xl text-slate-300">Upload PDF CV atau paste text manual, lalu paste Job Description. Dapatkan match score, missing keywords, rewrite bullets, interview questions, dan 7-day prep plan.</p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-2xl border border-dashed border-cyan-400/50 bg-slate-900 p-4 lg:col-span-2">
            <label className="block space-y-2">
              <span className="font-semibold">Upload CV PDF</span>
              <input type="file" accept="application/pdf,.pdf" onChange={(event) => handlePdfUpload(event.target.files?.[0])} disabled={extractingPdf} className="block w-full cursor-pointer rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-300 file:px-4 file:py-2 file:font-semibold file:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60" />
            </label>
            <p className="text-sm text-slate-400">PDF diekstrak di browser. Text hasil ekstraksi tetap bisa diedit di field CV Text.</p>
            {pdfStatus && <p className="text-sm text-cyan-200">{pdfStatus}</p>}
          </div>

          <label className="space-y-2">
            <span className="font-semibold">CV Text</span>
            <textarea value={cvText} onChange={(e) => setCvText(e.target.value)} minLength={50} required className="h-80 w-full rounded-2xl border border-slate-700 bg-slate-900 p-4 text-sm outline-none ring-cyan-400 focus:ring-2" placeholder="Upload PDF CV or paste CV/resume text here..." />
          </label>
          <label className="space-y-2">
            <span className="font-semibold">Job Description</span>
            <textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} minLength={50} required className="h-80 w-full rounded-2xl border border-slate-700 bg-slate-900 p-4 text-sm outline-none ring-cyan-400 focus:ring-2" placeholder="Paste target job description here..." />
          </label>
          <button disabled={loading || extractingPdf} className="rounded-2xl bg-cyan-300 px-6 py-3 font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60 lg:col-span-2">
            {loading ? "Analyzing..." : extractingPdf ? "Extracting PDF..." : "Analyze Fit"}
          </button>
        </form>

        {error && <div className="rounded-2xl border border-red-500 bg-red-950/60 p-4 text-red-100">{error}</div>}

        {analysis && (
          <section className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Match Score</p>
                <h2 className="text-5xl font-black">{analysis.matchScore}/100</h2>
              </div>
              <p className="max-w-2xl text-slate-300">{analysis.summary}</p>
            </div>

            <ResultList title="Strengths" items={analysis.strengths} />
            <ResultList title="Missing Keywords" items={analysis.missingKeywords} />

            <ResultBlock title="Weak Bullets & Rewrites">
              {analysis.weakBullets.map((bullet, index) => (
                <div key={index} className="rounded-xl bg-slate-950 p-4">
                  <p className="text-sm text-slate-400">Original: {bullet.original}</p>
                  <p className="text-sm text-amber-200">Issue: {bullet.issue}</p>
                  <p className="text-cyan-100">Rewrite: {bullet.rewrite}</p>
                </div>
              ))}
            </ResultBlock>

            <ResultBlock title="Interview Prep Questions">
              {analysis.interviewQuestions.map((item, index) => (
                <div key={index} className="rounded-xl bg-slate-950 p-4">
                  <p className="font-semibold">{item.question}</p>
                  <p className="text-sm text-slate-400">Why it matters: {item.whyItMatters}</p>
                </div>
              ))}
            </ResultBlock>

            <ResultBlock title="7-Day Prep Plan">
              {analysis.prepPlan7Days.map((day) => (
                <div key={day.day} className="rounded-xl bg-slate-950 p-4">
                  <p className="font-semibold">Day {day.day}: {day.focus}</p>
                  <ul className="list-disc pl-5 text-sm text-slate-300">{day.tasks.map((task) => <li key={task}>{task}</li>)}</ul>
                </div>
              ))}
            </ResultBlock>
          </section>
        )}
      </section>
    </main>
  );
}

function ResultList({ title, items }: { title: string; items: string[] }) {
  return <ResultBlock title={title}><ul className="grid gap-2 md:grid-cols-2">{items.map((item) => <li key={item} className="rounded-xl bg-slate-950 p-3 text-sm">{item}</li>)}</ul></ResultBlock>;
}

function ResultBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="space-y-3"><h3 className="text-xl font-bold">{title}</h3><div className="space-y-3">{children}</div></div>;
}
