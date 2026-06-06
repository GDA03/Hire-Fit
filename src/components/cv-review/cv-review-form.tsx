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
  locale?: "id" | "en";
  onSubmit: (request: AnalyzeRequest) => Promise<void>;
};

const formCopy = {
  id: {
    eyebrow: "Mulai review",
    title: "Kirim CV, lalu ikuti checkpoint-nya.",
    upload: "Upload CV PDF",
    uploadHelp: "Maks 5MB. Ekstraksi berjalan di browser; jika kurang bagus, fallback server tersedia.",
    language: "Bahasa hasil",
    purpose: "Tujuan review",
    role: "Target posisi",
    scholarship: "Nama beasiswa",
    optional: "opsional",
    cvText: "Teks CV",
    cvPlaceholder: "Paste teks CV di sini, atau upload PDF di atas.",
    jd: "Job description",
    jdPlaceholder: "Paste job description untuk analisis role-fit dan keyword gap.",
    submit: "Review CV saya",
    sending: "Mengirim ke reviewer...",
    extracting: "Membaca PDF...",
  },
  en: {
    eyebrow: "Start review",
    title: "Submit your CV, then follow each checkpoint.",
    upload: "Upload CV PDF",
    uploadHelp: "Max 5MB. Extraction runs in your browser; server fallback is available when needed.",
    language: "Output language",
    purpose: "Review purpose",
    role: "Target job role",
    scholarship: "Scholarship title",
    optional: "optional",
    cvText: "CV text",
    cvPlaceholder: "Paste CV text here, or upload a PDF above.",
    jd: "Job description",
    jdPlaceholder: "Paste target job description for role-fit and keyword-gap analysis.",
    submit: "Review my CV",
    sending: "Sending to reviewer...",
    extracting: "Reading PDF...",
  },
};

const fieldClass =
  "w-full rounded-2xl border border-indigo-100 bg-white p-3 text-sm font-semibold text-[#17152F] outline-none ring-[#D8D5FF] transition focus:-translate-y-0.5 focus:border-[#635BFF] focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60";

export function CVReviewForm({ loading, onSubmit, locale = "en" }: CVReviewFormProps) {
  const text = formCopy[locale];
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
        }.` ,
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
        }.` ,
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

  const busy = loading || extracting || serverExtracting;

  return (
    <form
      onSubmit={handleSubmit}
      className="app-card animate-happy-pop overflow-hidden rounded-[2rem] bg-white p-4 md:p-6"
    >
      <div className="mb-6 rounded-[1.6rem] bg-[#17152F] p-5 text-white shadow-[0_8px_0_rgba(23,35,25,0.18)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#B9F4EA]">{text.eyebrow}</p>
            <h2 className="mt-2 text-2xl font-black">{text.title}</h2>
          </div>
          <div className="relative h-14 w-14 shrink-0 rounded-2xl bg-[#F2F0FF] text-2xl animate-soft-float">
            <span className="absolute inset-0 grid place-items-center">📄</span>
            <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-[#14B8A6]" />
          </div>
        </div>
        {busy && (
          <div className="mt-5 overflow-hidden rounded-full bg-white/10">
            <div className="h-2 w-2/3 rounded-full bg-[#14B8A6] animate-bar-breathe" />
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="relative space-y-4 overflow-hidden rounded-[1.6rem] border border-dashed border-[#A78BFA]/45 bg-[#F2F0FF]/60 p-5 lg:col-span-2">
          {(extracting || serverExtracting) && <div className="pointer-events-none absolute inset-0 scan-card" />}
          <label className="relative block space-y-2">
            <span className="font-black text-[#17152F]">{text.upload}</span>
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={handleFileChange}
              disabled={busy}
              className="block w-full cursor-pointer rounded-2xl border border-indigo-100 bg-white p-3 text-sm font-semibold text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-[#635BFF] file:px-4 file:py-2 file:font-black file:text-white disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
          <p className="relative text-sm font-semibold text-slate-600">{text.uploadHelp}</p>
          {fileStatus && <p className="relative animate-happy-pop rounded-2xl bg-teal-50 p-3 text-sm font-bold text-[#0F766E]">{fileStatus}</p>}
          {fileError && <p className="relative animate-happy-pop rounded-2xl bg-[#fff7d8] p-3 text-sm font-bold text-[#8a6500]">{fileError}</p>}
          {extraction && <PDFExtractionPreview extraction={extraction} />}
          {currentFile && (!extraction || extraction.confidence === "poor") && (
            <button
              type="button"
              onClick={handleServerExtraction}
              disabled={busy}
              className="relative rounded-2xl border border-indigo-100 bg-white px-4 py-2 text-sm font-black text-[#635BFF] transition hover:-translate-y-0.5 hover:bg-[#F2F0FF] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {serverExtracting ? "Trying server extraction..." : "Try server extraction"}
            </button>
          )}
        </div>

        <div className="lg:col-span-2">
          <ATSChecksPanel checks={atsChecks} />
        </div>

        <label className="space-y-2">
          <span className="font-black text-[#17152F]">{text.language}</span>
          <select
            value={request.language}
            onChange={(event) => setRequest((current) => ({ ...current, language: event.target.value as ReviewLanguage }))}
            disabled={loading}
            className={fieldClass}
          >
            {LANGUAGES.map((language) => (
              <option key={language.value} value={language.value}>{language.label}</option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="font-black text-[#17152F]">{text.purpose}</span>
          <select
            value={request.purpose}
            onChange={(event) => setRequest((current) => ({ ...current, purpose: event.target.value as ReviewPurpose }))}
            disabled={loading}
            className={fieldClass}
          >
            {PURPOSES.map((purpose) => (
              <option key={purpose.value} value={purpose.value}>{purpose.label}</option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="font-black text-[#17152F]">{text.role} <span className="font-semibold text-slate-400">{text.optional}</span></span>
          <input
            value={request.jobRole ?? ""}
            onChange={(event) => setRequest((current) => ({ ...current, jobRole: event.target.value }))}
            disabled={loading}
            className={fieldClass}
            placeholder="Frontend Developer, Product Manager, Data Analyst..."
          />
        </label>

        <label className="space-y-2">
          <span className="font-black text-[#17152F]">{text.scholarship} <span className="font-semibold text-slate-400">{text.optional}</span></span>
          <input
            value={request.scholarshipTitle ?? ""}
            onChange={(event) => setRequest((current) => ({ ...current, scholarshipTitle: event.target.value }))}
            disabled={loading}
            className={fieldClass}
            placeholder="LPDP, Chevening, Fulbright..."
          />
        </label>

        <label className="space-y-2 lg:col-span-2">
          <span className="font-black text-[#17152F]">{text.cvText}</span>
          <textarea
            value={request.cvText}
            onChange={(event) => setRequest((current) => ({ ...current, cvText: event.target.value }))}
            minLength={50}
            required
            disabled={loading}
            className={`${fieldClass} h-72 resize-y`}
            placeholder={text.cvPlaceholder}
          />
        </label>

        <label className="space-y-2 lg:col-span-2">
          <span className="font-black text-[#17152F]">{text.jd} <span className="font-semibold text-slate-400">{text.optional}</span></span>
          <textarea
            value={request.jobDescription ?? ""}
            onChange={(event) => setRequest((current) => ({ ...current, jobDescription: event.target.value }))}
            disabled={loading}
            className={`${fieldClass} h-44 resize-y`}
            placeholder={text.jdPlaceholder}
          />
        </label>

        <button
          disabled={loading || extracting || serverExtracting || request.cvText.trim().length < 50}
          className="app-button rounded-[1.35rem] bg-[#635BFF] px-6 py-4 font-black text-white transition duration-200 hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-60 lg:col-span-2"
        >
          {loading ? text.sending : extracting || serverExtracting ? text.extracting : `${text.submit} ✨`}
        </button>
      </div>
    </form>
  );
}

function PDFExtractionPreview({ extraction }: { extraction: PDFExtractionResult }) {
  const confidenceClass = {
    good: "bg-emerald-100 text-emerald-800 ring-emerald-300",
    partial: "bg-amber-100 text-amber-800 ring-amber-300",
    poor: "bg-red-100 text-red-800 ring-red-300",
  }[extraction.confidence];

  return (
    <div className="relative animate-pop-in rounded-3xl border border-white/80 bg-white/85 p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ring-1 ${confidenceClass}`}>
          {extraction.confidence} parse
        </span>
        <span className="text-xs font-semibold text-slate-500">
          {extraction.source} · {extraction.characterCount.toLocaleString()} chars · {extraction.pageCount.toLocaleString()} page{extraction.pageCount === 1 ? "" : "s"}
        </span>
      </div>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
        {extraction.warnings.map((warning) => (
          <li key={warning}>{warning}</li>
        ))}
      </ul>
      {extraction.preview && (
        <details className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <summary className="cursor-pointer text-sm font-black text-slate-800">Preview extracted text</summary>
          <p className="mt-3 whitespace-pre-wrap text-xs leading-6 text-slate-500">{extraction.preview}</p>
        </details>
      )}
    </div>
  );
}
