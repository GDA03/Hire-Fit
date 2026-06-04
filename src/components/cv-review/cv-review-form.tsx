"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { runATSChecks } from "@/lib/cv-review/ats-checks";
import { ATSChecksPanel } from "./ats-checks-panel";
import { extractTextFromPDF, type PDFExtractionResult } from "@/lib/cv-review/pdf-extraction";
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
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [fileStatus, setFileStatus] = useState("");
  const [fileError, setFileError] = useState("");
  const [extraction, setExtraction] = useState<PDFExtractionResult | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [serverExtracting, setServerExtracting] = useState(false);

  const atsChecks = useMemo(
    () =>
      runATSChecks({
        cvText: request.cvText,
        fileName: currentFile?.name,
        parseConfidence: extraction?.confidence,
        jobDescription: request.jobDescription,
      }),
    [currentFile?.name, extraction?.confidence, request.cvText, request.jobDescription],
  );

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileStatus("");
    setFileError("");
    setExtraction(null);
    setCurrentFile(file);

    if (file.type !== "application/pdf") {
      setFileError("Upload a PDF file only.");
      event.target.value = "";
      setCurrentFile(null);
      return;
    }

    if (file.size > MAX_CV_FILE_SIZE_BYTES) {
      setFileError("PDF must be 5MB or smaller.");
      event.target.value = "";
      setCurrentFile(null);
      return;
    }

    setExtracting(true);
    setFileStatus(`Extracting text from ${file.name}...`);

    try {
      const result = await extractTextFromPDF(file);

      setExtraction(result);
      setRequest((current) => ({ ...current, cvText: result.text }));
      setFileStatus(
        `Extracted ${result.characterCount.toLocaleString()} characters from ${result.pageCount.toLocaleString()} page${
          result.pageCount === 1 ? "" : "s"
        }.`,
      );
      setFileError(
        result.confidence === "poor"
          ? "PDF text extraction looks poor. Paste CV text manually for best results."
          : "",
      );
    } catch (error) {
      console.error(error);
      setFileError("Could not extract text from this PDF. Paste CV text manually instead.");
      setFileStatus("");
      setExtraction(null);
    } finally {
      setExtracting(false);
    }
  }

  async function handleServerExtraction() {
    if (!currentFile) return;

    setServerExtracting(true);
    setFileError("");
    setFileStatus(`Trying server extraction for ${currentFile.name}...`);

    try {
      const formData = new FormData();
      formData.append("file", currentFile);

      const response = await fetch("/api/extract-pdf", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error ?? "Server extraction failed.");

      setExtraction(data);
      setRequest((current) => ({ ...current, cvText: data.text }));
      setFileStatus(
        `Server extracted ${data.characterCount.toLocaleString()} characters from ${data.pageCount.toLocaleString()} page${
          data.pageCount === 1 ? "" : "s"
        }.`,
      );
      setFileError(
        data.confidence === "poor"
          ? "Server extraction still looks poor. Paste CV text manually for best results."
          : "",
      );
    } catch (error) {
      setFileError(
        error instanceof Error
          ? error.message
          : "Server extraction failed. Paste CV text manually instead.",
      );
    } finally {
      setServerExtracting(false);
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
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-cyan-950/20 md:p-8"
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-dashed border-cyan-400/50 bg-slate-950/70 p-5 lg:col-span-2">
          <label className="block space-y-2">
            <span className="font-semibold text-slate-100">Upload CV PDF</span>
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={handleFileChange}
              disabled={loading || extracting || serverExtracting}
              className="block w-full cursor-pointer rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-300 file:px-4 file:py-2 file:font-semibold file:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
          <p className="text-sm text-slate-400">
            Max 5MB. PDF extraction runs in your browser; pasted text remains editable.
          </p>
          {fileStatus && <p className="text-sm text-cyan-200">{fileStatus}</p>}
          {fileError && <p className="text-sm text-amber-200">{fileError}</p>}
          {extraction && <PDFExtractionPreview extraction={extraction} />}
          {currentFile &&
            (!extraction || extraction.confidence === "poor") && (
              <button
                type="button"
                onClick={handleServerExtraction}
                disabled={loading || extracting || serverExtracting}
                className="rounded-xl border border-cyan-300/40 px-4 py-2 text-sm font-bold text-cyan-100 transition hover:bg-cyan-300/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {serverExtracting ? "Trying server extraction..." : "Try server extraction"}
              </button>
            )}
        </div>

        <div className="lg:col-span-2">
          <ATSChecksPanel checks={atsChecks} />
        </div>

        <label className="space-y-2">
          <span className="font-semibold text-slate-100">Language</span>
          <select
            value={request.language}
            onChange={(event) =>
              setRequest((current) => ({ ...current, language: event.target.value as ReviewLanguage }))
            }
            disabled={loading}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 outline-none ring-cyan-400 focus:ring-2"
          >
            {LANGUAGES.map((language) => (
              <option key={language.value} value={language.value}>
                {language.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="font-semibold text-slate-100">Purpose</span>
          <select
            value={request.purpose}
            onChange={(event) =>
              setRequest((current) => ({ ...current, purpose: event.target.value as ReviewPurpose }))
            }
            disabled={loading}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 outline-none ring-cyan-400 focus:ring-2"
          >
            {PURPOSES.map((purpose) => (
              <option key={purpose.value} value={purpose.value}>
                {purpose.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="font-semibold text-slate-100">
            Target job role <span className="text-slate-500">optional</span>
          </span>
          <input
            value={request.jobRole ?? ""}
            onChange={(event) =>
              setRequest((current) => ({ ...current, jobRole: event.target.value }))
            }
            disabled={loading}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 outline-none ring-cyan-400 focus:ring-2"
            placeholder="Frontend Developer, Product Manager, Data Analyst..."
          />
        </label>

        <label className="space-y-2">
          <span className="font-semibold text-slate-100">
            Scholarship title <span className="text-slate-500">optional</span>
          </span>
          <input
            value={request.scholarshipTitle ?? ""}
            onChange={(event) =>
              setRequest((current) => ({ ...current, scholarshipTitle: event.target.value }))
            }
            disabled={loading}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 outline-none ring-cyan-400 focus:ring-2"
            placeholder="LPDP, Chevening, Fulbright..."
          />
        </label>

        <label className="space-y-2 lg:col-span-2">
          <span className="font-semibold text-slate-100">CV Text</span>
          <textarea
            value={request.cvText}
            onChange={(event) =>
              setRequest((current) => ({ ...current, cvText: event.target.value }))
            }
            minLength={50}
            required
            disabled={loading}
            className="h-72 w-full rounded-2xl border border-slate-700 bg-slate-950 p-4 text-sm text-slate-100 outline-none ring-cyan-400 focus:ring-2"
            placeholder="Paste CV text here, or upload a PDF above."
          />
        </label>

        <label className="space-y-2 lg:col-span-2">
          <span className="font-semibold text-slate-100">
            Job description <span className="text-slate-500">optional</span>
          </span>
          <textarea
            value={request.jobDescription ?? ""}
            onChange={(event) =>
              setRequest((current) => ({ ...current, jobDescription: event.target.value }))
            }
            disabled={loading}
            className="h-44 w-full rounded-2xl border border-slate-700 bg-slate-950 p-4 text-sm text-slate-100 outline-none ring-cyan-400 focus:ring-2"
            placeholder="Paste target job description to unlock job-fit and missing-keyword analysis."
          />
        </label>

        <button
          disabled={loading || extracting || serverExtracting || request.cvText.trim().length < 50}
          className="rounded-2xl bg-cyan-300 px-6 py-4 font-bold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60 lg:col-span-2"
        >
          {loading ? "Analyzing CV..." : extracting || serverExtracting ? "Extracting PDF..." : "Review my CV"}
        </button>
      </div>
    </form>
  );
}

function PDFExtractionPreview({ extraction }: { extraction: PDFExtractionResult }) {
  const confidenceClass = {
    good: "bg-emerald-400/15 text-emerald-200 ring-emerald-400/30",
    partial: "bg-amber-400/15 text-amber-200 ring-amber-400/30",
    poor: "bg-red-400/15 text-red-200 ring-red-400/30",
  }[extraction.confidence];

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold uppercase ring-1 ${confidenceClass}`}
        >
          {extraction.confidence} parse
        </span>
        <span className="text-xs text-slate-400">
          {extraction.source} · {extraction.characterCount.toLocaleString()} chars ·{" "}
          {extraction.pageCount.toLocaleString()} page{extraction.pageCount === 1 ? "" : "s"}
        </span>
      </div>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-300">
        {extraction.warnings.map((warning) => (
          <li key={warning}>{warning}</li>
        ))}
      </ul>
      {extraction.preview && (
        <details className="mt-4 rounded-xl border border-slate-800 bg-slate-900/80 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-slate-200">
            Preview extracted text
          </summary>
          <p className="mt-3 whitespace-pre-wrap text-xs leading-6 text-slate-400">
            {extraction.preview}
          </p>
        </details>
      )}
    </div>
  );
}

