"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import {
  AnalyzeRequest,
  LANGUAGES,
  MAX_CV_FILE_SIZE_BYTES,
  PURPOSES,
  ReviewLanguage,
  ReviewPurpose,
} from "@/lib/cv-review/types";

type CVReviewFormProps = {
  loading: boolean;
  onSubmit: (request: AnalyzeRequest) => Promise<void>;
};

export function CVReviewForm({ loading, onSubmit }: CVReviewFormProps) {
  const [request, setRequest] = useState<AnalyzeRequest>({
    cvText: "",
    language: "en",
    purpose: "job_seeking",
    jobRole: "",
    jobDescription: "",
    scholarshipTitle: "",
  });
  const [fileStatus, setFileStatus] = useState("");
  const [fileError, setFileError] = useState("");
  const [extracting, setExtracting] = useState(false);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileStatus("");
    setFileError("");

    if (file.type !== "application/pdf") {
      setFileError("Upload a PDF file only.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_CV_FILE_SIZE_BYTES) {
      setFileError("PDF must be 5MB or smaller.");
      event.target.value = "";
      return;
    }

    setExtracting(true);
    setFileStatus(`Extracting text from ${file.name}...`);

    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

      const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
      const pages = await Promise.all(
        Array.from({ length: pdf.numPages }, async (_, index) => {
          const page = await pdf.getPage(index + 1);
          const content = await page.getTextContent();
          return content.items
            .map((item) => ("str" in item ? item.str : ""))
            .join(" ");
        }),
      );
      const cvText = pages.join("\n\n").trim();

      if (cvText.length < 50) {
        setFileError("PDF text looked too short. Paste CV text manually if extraction missed content.");
      }

      setRequest((current) => ({ ...current, cvText }));
      setFileStatus(`Extracted ${cvText.length.toLocaleString()} characters from ${file.name}.`);
    } catch {
      setFileError("Could not extract text from this PDF. Paste CV text manually instead.");
      setFileStatus("");
    } finally {
      setExtracting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({
      ...request,
      jobRole: request.jobRole?.trim() || undefined,
      jobDescription: request.jobDescription?.trim() || undefined,
      scholarshipTitle: request.scholarshipTitle?.trim() || undefined,
      cvText: request.cvText.trim(),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-cyan-950/20 md:p-8">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-dashed border-cyan-400/50 bg-slate-950/70 p-5 lg:col-span-2">
          <label className="block space-y-2">
            <span className="font-semibold text-slate-100">Upload CV PDF</span>
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={handleFileChange}
              disabled={loading || extracting}
              className="block w-full cursor-pointer rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-300 file:px-4 file:py-2 file:font-semibold file:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
          <p className="text-sm text-slate-400">Max 5MB. PDF extraction runs in your browser; pasted text remains editable.</p>
          {fileStatus && <p className="text-sm text-cyan-200">{fileStatus}</p>}
          {fileError && <p className="text-sm text-amber-200">{fileError}</p>}
        </div>

        <label className="space-y-2">
          <span className="font-semibold text-slate-100">Language</span>
          <select
            value={request.language}
            onChange={(event) => setRequest((current) => ({ ...current, language: event.target.value as ReviewLanguage }))}
            disabled={loading}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 outline-none ring-cyan-400 focus:ring-2"
          >
            {LANGUAGES.map((language) => (
              <option key={language.value} value={language.value}>{language.label}</option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="font-semibold text-slate-100">Purpose</span>
          <select
            value={request.purpose}
            onChange={(event) => setRequest((current) => ({ ...current, purpose: event.target.value as ReviewPurpose }))}
            disabled={loading}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 outline-none ring-cyan-400 focus:ring-2"
          >
            {PURPOSES.map((purpose) => (
              <option key={purpose.value} value={purpose.value}>{purpose.label}</option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="font-semibold text-slate-100">Target job role <span className="text-slate-500">optional</span></span>
          <input
            value={request.jobRole ?? ""}
            onChange={(event) => setRequest((current) => ({ ...current, jobRole: event.target.value }))}
            disabled={loading}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 outline-none ring-cyan-400 focus:ring-2"
            placeholder="Frontend Developer, Product Manager, Data Analyst..."
          />
        </label>

        <label className="space-y-2">
          <span className="font-semibold text-slate-100">Scholarship title <span className="text-slate-500">optional</span></span>
          <input
            value={request.scholarshipTitle ?? ""}
            onChange={(event) => setRequest((current) => ({ ...current, scholarshipTitle: event.target.value }))}
            disabled={loading}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 outline-none ring-cyan-400 focus:ring-2"
            placeholder="LPDP, Chevening, Fulbright..."
          />
        </label>

        <label className="space-y-2 lg:col-span-2">
          <span className="font-semibold text-slate-100">CV Text</span>
          <textarea
            value={request.cvText}
            onChange={(event) => setRequest((current) => ({ ...current, cvText: event.target.value }))}
            minLength={50}
            required
            disabled={loading}
            className="h-72 w-full rounded-2xl border border-slate-700 bg-slate-950 p-4 text-sm text-slate-100 outline-none ring-cyan-400 focus:ring-2"
            placeholder="Paste CV text here, or upload a PDF above."
          />
        </label>

        <label className="space-y-2 lg:col-span-2">
          <span className="font-semibold text-slate-100">Job description <span className="text-slate-500">optional</span></span>
          <textarea
            value={request.jobDescription ?? ""}
            onChange={(event) => setRequest((current) => ({ ...current, jobDescription: event.target.value }))}
            disabled={loading}
            className="h-44 w-full rounded-2xl border border-slate-700 bg-slate-950 p-4 text-sm text-slate-100 outline-none ring-cyan-400 focus:ring-2"
            placeholder="Paste target job description to unlock job-fit and missing-keyword analysis."
          />
        </label>

        <button
          disabled={loading || extracting || request.cvText.trim().length < 50}
          className="rounded-2xl bg-cyan-300 px-6 py-4 font-bold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60 lg:col-span-2"
        >
          {loading ? "Analyzing CV..." : extracting ? "Extracting PDF..." : "Review my CV"}
        </button>
      </div>
    </form>
  );
}
