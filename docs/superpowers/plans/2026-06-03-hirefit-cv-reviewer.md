# HireFit CV Reviewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a free-deploy-friendly HireFit AI CV Reviewer with rich form, strict Gemini JSON analysis, 12-section results, ATS warnings, priority plan, keyword insights, and before/after rewrites.

**Architecture:** Use frontend-first vertical slices on the existing Next.js 16 App Router app. Keep Phase 1 as a direct `/api/analyze` flow with browser-side PDF extraction and no auth, payment, storage, or review history. Split types, prompt helpers, validation, and UI into focused files so `page.tsx` stays small.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, `pdfjs-dist`, `@google/generative-ai`, Gemini default model `gemini-2.5-flash-lite`.

---

## File Structure

Create:

- `src/lib/cv-review/types.ts` — shared request/result types, purpose/language constants, section metadata.
- `src/lib/cv-review/validation.ts` — request validation, score helpers, JSON extraction helper.
- `src/lib/cv-review/prompt.ts` — strict Gemini prompt builder and JSON schema instructions.
- `src/components/cv-review/cv-review-form.tsx` — upload/manual text/form UI.
- `src/components/cv-review/score-circle.tsx` — overall score visual.
- `src/components/cv-review/section-accordion.tsx` — 12-section accordion.
- `src/components/cv-review/keyword-panel.tsx` — keyword groups and missing keywords.
- `src/components/cv-review/priority-plan.tsx` — ATS warnings and top fix list.
- `src/components/cv-review/rewrite-card.tsx` — before/after examples and copy button.
- `src/components/cv-review/result-view.tsx` — composed result UI.
- `.env.example` — free deployment env template.

Modify:

- `src/app/api/analyze/route.ts` — expanded request validation, default model, strict result prompt.
- `src/app/page.tsx` — landing page composition and API state.
- `src/app/layout.tsx` — metadata.
- `src/app/globals.css` — stable light theme and base styles.

Docs referenced:

- Next Route Handlers: `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`
- Design spec: `docs/superpowers/specs/2026-06-03-hirefit-cv-reviewer-design.md`

---

### Task 1: Add shared CV review types and helpers

**Files:**
- Create: `src/lib/cv-review/types.ts`
- Create: `src/lib/cv-review/validation.ts`

- [ ] **Step 1: Create shared types**

Write `src/lib/cv-review/types.ts`:

```ts
export const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "id", label: "Bahasa Indonesia" },
] as const;

export const PURPOSES = [
  { value: "job_seeking", label: "Job seeking" },
  { value: "job_scholarship", label: "Job seeking + scholarship" },
  { value: "internship", label: "Internship" },
  { value: "fresh_graduate", label: "Fresh graduate" },
  { value: "career_switch", label: "Career switch" },
] as const;

export type ReviewLanguage = (typeof LANGUAGES)[number]["value"];
export type ReviewPurpose = (typeof PURPOSES)[number]["value"];
export type SectionPriority = "high" | "medium" | "low";

export type AnalyzeRequest = {
  cvText: string;
  language: ReviewLanguage;
  purpose: ReviewPurpose;
  jobRole?: string;
  jobDescription?: string;
  scholarshipTitle?: string;
};

export type SectionResult = {
  score: number | null;
  analysis: string;
  whatWorks: string[];
  problemsFound: string[];
  actionPoints: string[];
  whyImportant: string;
  examples: string[];
  priority: SectionPriority;
};

export type KeywordResult = {
  jobTitles: string[];
  skills: string[];
  careerPaths: string[];
  professionalSummaryKeywords: string[];
  additionalKeywords: string[];
  missingKeywords: string[];
};

export type CareerRecommendationResult = {
  summary: string;
  recommendedRoles: string[];
  recommendedIndustries: string[];
  nextSteps: string[];
};

export type CVReviewResult = {
  overallScore: number;
  summary: string;
  atsWarnings: string[];
  priorityPlan: string[];
  sections: Record<SectionKey, SectionResult>;
  keywords: KeywordResult;
  careerRecommendation: CareerRecommendationResult;
  jobFit?: SectionResult;
  tailoredContent?: SectionResult;
  experienceMatch?: SectionResult;
};

export const SECTION_DEFINITIONS = [
  { key: "overallImpression", title: "Overall Impression" },
  { key: "contactInformation", title: "Contact Information" },
  { key: "relevantSkills", title: "Relevant Skills" },
  { key: "professionalSummary", title: "Professional Summary" },
  { key: "workExperience", title: "Work Experience" },
  { key: "achievements", title: "Achievements" },
  { key: "educationCertification", title: "Education & Certification" },
  { key: "organizationalActivity", title: "Organization & Volunteer" },
  { key: "writingConsistency", title: "Writing, Grammar & Formatting" },
  { key: "additionalSection", title: "Additional Sections" },
] as const;

export type SectionKey = (typeof SECTION_DEFINITIONS)[number]["key"];

export const MAX_CV_FILE_SIZE_BYTES = 5 * 1024 * 1024;
```

- [ ] **Step 2: Create validation helpers**

Write `src/lib/cv-review/validation.ts`:

```ts
import { LANGUAGES, PURPOSES, type AnalyzeRequest } from "./types";

const languageValues = new Set(LANGUAGES.map((language) => language.value));
const purposeValues = new Set(PURPOSES.map((purpose) => purpose.value));

export function validateAnalyzeRequest(input: unknown): AnalyzeRequest {
  if (!input || typeof input !== "object") {
    throw new Error("Request body must be a JSON object.");
  }

  const body = input as Record<string, unknown>;
  const cvText = readString(body.cvText).trim();
  const language = readString(body.language);
  const purpose = readString(body.purpose);
  const jobRole = readOptionalString(body.jobRole);
  const jobDescription = readOptionalString(body.jobDescription);
  const scholarshipTitle = readOptionalString(body.scholarshipTitle);

  if (cvText.length < 50) {
    throw new Error("CV text must be at least 50 characters.");
  }

  if (cvText.length > 60_000) {
    throw new Error("CV text is too long. Please keep it under 60,000 characters.");
  }

  if (!languageValues.has(language as AnalyzeRequest["language"])) {
    throw new Error("Language must be English or Bahasa Indonesia.");
  }

  if (!purposeValues.has(purpose as AnalyzeRequest["purpose"])) {
    throw new Error("Review purpose is not supported.");
  }

  if (jobDescription && jobDescription.length > 30_000) {
    throw new Error("Job description is too long. Please keep it under 30,000 characters.");
  }

  return {
    cvText,
    language: language as AnalyzeRequest["language"],
    purpose: purpose as AnalyzeRequest["purpose"],
    jobRole,
    jobDescription,
    scholarshipTitle,
  };
}

export function extractJsonObject(text: string) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");

  if (first === -1 || last === -1 || last <= first) {
    throw new Error("Model response did not contain a JSON object.");
  }

  return JSON.parse(cleaned.slice(first, last + 1));
}

export function scoreTone(score: number | null) {
  if (score === null) return "neutral";
  if (score >= 85) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "warning";
  return "danger";
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readOptionalString(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
```

- [ ] **Step 3: Run lint**

Run:

```bash
rtk npm run lint
```

Expected: PASS or only pre-existing warnings unrelated to new files.

- [ ] **Step 4: Commit**

```bash
rtk git add src/lib/cv-review/types.ts src/lib/cv-review/validation.ts
rtk git commit -m "feat: add cv review shared types"
```

---

### Task 2: Add strict Gemini prompt and analyzer API

**Files:**
- Create: `src/lib/cv-review/prompt.ts`
- Modify: `src/app/api/analyze/route.ts`

- [ ] **Step 1: Create prompt builder**

Write `src/lib/cv-review/prompt.ts`:

```ts
import type { AnalyzeRequest } from "./types";

export function buildCVReviewPrompt(request: AnalyzeRequest) {
  const languageName = request.language === "id" ? "Bahasa Indonesia" : "English";
  const hasJobTarget = Boolean(request.jobRole || request.jobDescription);

  return `You are HireFit's expert ATS resume reviewer and recruiter coach.
Analyze the CV for ATS readiness, recruiter readability, and practical improvement.

Output language: ${languageName}.
Review purpose: ${request.purpose}.
Target role: ${request.jobRole ?? "Not provided"}.
Scholarship title: ${request.scholarshipTitle ?? "Not provided"}.
Job description provided: ${request.jobDescription ? "Yes" : "No"}.

Rules:
- Return valid JSON only. No markdown. No code fences.
- Never fabricate experience, skills, metrics, employers, education, or credentials.
- Example rewrites must only use facts present in the CV.
- Scores must be integers from 0 to 100. Use null only if a section is truly not applicable.
- Use score rubric: 90-100 excellent, 75-89 good, 60-74 passable, 40-59 weak, 0-39 critical/missing.
- priorityPlan must contain exactly 5 high-impact fixes.
- atsWarnings must contain 3 to 6 concise warnings or confirmations.
- Each normal section must include 2-4 whatWorks, 2-4 problemsFound, 3-5 actionPoints, 1-3 examples.
- Include jobFit, tailoredContent, and experienceMatch only when target role or job description exists: ${hasJobTarget}.

Return this exact JSON shape:
{
  "overallScore": 0,
  "summary": "string",
  "atsWarnings": ["string"],
  "priorityPlan": ["string", "string", "string", "string", "string"],
  "sections": {
    "overallImpression": { "score": 0, "analysis": "string", "whatWorks": ["string"], "problemsFound": ["string"], "actionPoints": ["string"], "whyImportant": "string", "examples": ["string"], "priority": "high" },
    "contactInformation": { "score": 0, "analysis": "string", "whatWorks": ["string"], "problemsFound": ["string"], "actionPoints": ["string"], "whyImportant": "string", "examples": ["string"], "priority": "high" },
    "relevantSkills": { "score": 0, "analysis": "string", "whatWorks": ["string"], "problemsFound": ["string"], "actionPoints": ["string"], "whyImportant": "string", "examples": ["string"], "priority": "high" },
    "professionalSummary": { "score": 0, "analysis": "string", "whatWorks": ["string"], "problemsFound": ["string"], "actionPoints": ["string"], "whyImportant": "string", "examples": ["string"], "priority": "medium" },
    "workExperience": { "score": 0, "analysis": "string", "whatWorks": ["string"], "problemsFound": ["string"], "actionPoints": ["string"], "whyImportant": "string", "examples": ["string"], "priority": "high" },
    "achievements": { "score": 0, "analysis": "string", "whatWorks": ["string"], "problemsFound": ["string"], "actionPoints": ["string"], "whyImportant": "string", "examples": ["string"], "priority": "high" },
    "educationCertification": { "score": 0, "analysis": "string", "whatWorks": ["string"], "problemsFound": ["string"], "actionPoints": ["string"], "whyImportant": "string", "examples": ["string"], "priority": "medium" },
    "organizationalActivity": { "score": 0, "analysis": "string", "whatWorks": ["string"], "problemsFound": ["string"], "actionPoints": ["string"], "whyImportant": "string", "examples": ["string"], "priority": "low" },
    "writingConsistency": { "score": 0, "analysis": "string", "whatWorks": ["string"], "problemsFound": ["string"], "actionPoints": ["string"], "whyImportant": "string", "examples": ["string"], "priority": "medium" },
    "additionalSection": { "score": 0, "analysis": "string", "whatWorks": ["string"], "problemsFound": ["string"], "actionPoints": ["string"], "whyImportant": "string", "examples": ["string"], "priority": "low" }
  },
  "keywords": {
    "jobTitles": ["string"],
    "skills": ["string"],
    "careerPaths": ["string"],
    "professionalSummaryKeywords": ["string"],
    "additionalKeywords": ["string"],
    "missingKeywords": ["string"]
  },
  "careerRecommendation": {
    "summary": "string",
    "recommendedRoles": ["string"],
    "recommendedIndustries": ["string"],
    "nextSteps": ["string"]
  },
  "jobFit": { "score": 0, "analysis": "string", "whatWorks": ["string"], "problemsFound": ["string"], "actionPoints": ["string"], "whyImportant": "string", "examples": ["string"], "priority": "high" },
  "tailoredContent": { "score": 0, "analysis": "string", "whatWorks": ["string"], "problemsFound": ["string"], "actionPoints": ["string"], "whyImportant": "string", "examples": ["string"], "priority": "high" },
  "experienceMatch": { "score": 0, "analysis": "string", "whatWorks": ["string"], "problemsFound": ["string"], "actionPoints": ["string"], "whyImportant": "string", "examples": ["string"], "priority": "high" }
}

CV text:
${request.cvText}

Job description:
${request.jobDescription ?? "Not provided"}`;
}
```

- [ ] **Step 2: Replace analyzer route**

Write `src/app/api/analyze/route.ts`:

```ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { buildCVReviewPrompt } from "@/lib/cv-review/prompt";
import { extractJsonObject, validateAnalyzeRequest } from "@/lib/cv-review/validation";

const fallbackModel = "gemini-2.5-flash-lite";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const analyzeRequest = validateAnalyzeRequest(body);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY. Copy .env.example to .env.local and add a Google AI Studio key." },
        { status: 500 },
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL ?? fallbackModel });
    const result = await model.generateContent(buildCVReviewPrompt(analyzeRequest));
    const rawText = result.response.text();
    const parsed = extractJsonObject(rawText);

    return NextResponse.json(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to analyze CV.";
    const status = message.includes("must") || message.includes("too long") || message.includes("not supported") ? 400 : 500;

    console.error("CV analysis error", error);
    return NextResponse.json({ error: message }, { status });
  }
}
```

- [ ] **Step 3: Run lint**

Run:

```bash
rtk npm run lint
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
rtk git add src/lib/cv-review/prompt.ts src/app/api/analyze/route.ts
rtk git commit -m "feat: expand cv analysis api"
```

---

### Task 3: Build form component and landing shell

**Files:**
- Create: `src/components/cv-review/cv-review-form.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create form component**

Write `src/components/cv-review/cv-review-form.tsx`:

```tsx
"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { LANGUAGES, MAX_CV_FILE_SIZE_BYTES, PURPOSES, type AnalyzeRequest } from "@/lib/cv-review/types";

type CVReviewFormProps = {
  loading: boolean;
  onSubmit: (request: AnalyzeRequest) => Promise<void>;
};

export function CVReviewForm({ loading, onSubmit }: CVReviewFormProps) {
  const [cvText, setCvText] = useState("");
  const [language, setLanguage] = useState<AnalyzeRequest["language"]>("id");
  const [purpose, setPurpose] = useState<AnalyzeRequest["purpose"]>("job_seeking");
  const [jobRole, setJobRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [scholarshipTitle, setScholarshipTitle] = useState("");
  const [pdfStatus, setPdfStatus] = useState("");
  const [error, setError] = useState("");
  const [extractingPdf, setExtractingPdf] = useState(false);

  async function handlePdfUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_CV_FILE_SIZE_BYTES) {
      setError("File maksimal 5MB. Pilih CV yang lebih kecil atau paste teks manual.");
      return;
    }

    if (file.type !== "application/pdf") {
      setError("Saat ini upload otomatis mendukung PDF. DOC/DOCX masuk fase backend berikutnya.");
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
        throw new Error("Teks CV terbaca terlalu sedikit. Paste isi CV manual agar analisis lebih akurat.");
      }
      setCvText(extractedText);
      setPdfStatus(`Extracted ${extractedText.length.toLocaleString()} characters from ${file.name}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membaca PDF.");
      setPdfStatus("");
    } finally {
      setExtractingPdf(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (cvText.trim().length < 50) {
      setError("CV text minimal 50 karakter.");
      return;
    }

    await onSubmit({
      cvText,
      language,
      purpose,
      jobRole: jobRole.trim() || undefined,
      jobDescription: jobDescription.trim() || undefined,
      scholarshipTitle: scholarshipTitle.trim() || undefined,
    });
  }

  const disabled = loading || extractingPdf;

  return (
    <form onSubmit={handleSubmit} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-2xl shadow-cyan-950/10 md:p-6">
      <div className="grid gap-5">
        <label className="rounded-2xl border border-dashed border-cyan-300 bg-cyan-50/60 p-4">
          <span className="block text-sm font-bold text-slate-900">Upload CV PDF</span>
          <input type="file" accept="application/pdf,.pdf" onChange={handlePdfUpload} disabled={disabled} className="mt-3 block w-full cursor-pointer rounded-xl border border-slate-200 bg-white p-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-600 file:px-4 file:py-2 file:font-semibold file:text-white disabled:cursor-not-allowed disabled:opacity-60" />
          <span className="mt-2 block text-xs text-slate-500">Max 5MB. PDF extraction runs in your browser. Manual text fallback available.</span>
        </label>

        {pdfStatus && <p className="rounded-xl bg-cyan-50 px-3 py-2 text-sm text-cyan-800">{pdfStatus}</p>}
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-800">Language</span>
            <select value={language} onChange={(event) => setLanguage(event.target.value as AnalyzeRequest["language"])} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none ring-cyan-400 focus:ring-2">
              {LANGUAGES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-800">Review purpose</span>
            <select value={purpose} onChange={(event) => setPurpose(event.target.value as AnalyzeRequest["purpose"])} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none ring-cyan-400 focus:ring-2">
              {PURPOSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
        </div>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-800">CV Text</span>
          <textarea value={cvText} onChange={(event) => setCvText(event.target.value)} required minLength={50} className="h-56 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-900 outline-none ring-cyan-400 focus:bg-white focus:ring-2" placeholder="Upload PDF or paste your CV/resume text here..." />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-800">Target job role (optional)</span>
            <input value={jobRole} onChange={(event) => setJobRole(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none ring-cyan-400 focus:ring-2" placeholder="Example: Frontend Developer" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-800">Scholarship title (optional)</span>
            <input value={scholarshipTitle} onChange={(event) => setScholarshipTitle(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none ring-cyan-400 focus:ring-2" placeholder="Example: LPDP, IISMA, Chevening" />
          </label>
        </div>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-800">Job description (optional, recommended)</span>
          <textarea value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} className="h-40 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-900 outline-none ring-cyan-400 focus:bg-white focus:ring-2" placeholder="Paste target job description for JD matching, missing keywords, and tailored content advice..." />
        </label>

        <button disabled={disabled} className="rounded-2xl bg-slate-950 px-6 py-4 text-base font-black text-white shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5 hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60">
          {loading ? "Analyzing CV..." : extractingPdf ? "Extracting PDF..." : "Review CV Sekarang"}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Replace landing page shell**

Write `src/app/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { CVReviewForm } from "@/components/cv-review/cv-review-form";
import type { AnalyzeRequest, CVReviewResult } from "@/lib/cv-review/types";

export default function Home() {
  const [analysis, setAnalysis] = useState<CVReviewResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAnalyze(request: AnalyzeRequest) {
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
      if (!response.ok) throw new Error(data.error ?? "Analysis failed");
      setAnalysis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <p className="text-xl font-black tracking-tight">HireFit</p>
        <div className="hidden items-center gap-6 text-sm font-semibold text-slate-600 md:flex">
          <a href="#review">CV Reviewer</a>
          <a href="#features">Features</a>
          <a href="#faq">FAQ</a>
        </div>
      </nav>

      <section id="review" className="mx-auto grid max-w-7xl gap-10 px-6 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div className="space-y-7 pt-4">
          <div className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-bold text-cyan-800">
            Analisis 12 aspek CV + rekomendasi perbaikan
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-black tracking-tight md:text-6xl">Cek kualitas CV dan kesiapan ATS dalam 1 menit.</h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-600">Upload CV, dapat skor, prioritas perbaikan, keyword yang kurang, dan contoh rewrite yang jujur berdasarkan isi CV kamu.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {["ATS score", "JD matching", "Before/after rewrite"].map((item) => (
              <div key={item} className="rounded-2xl border border-slate-200 bg-white p-4 font-bold shadow-sm">{item}</div>
            ))}
          </div>
        </div>

        <CVReviewForm loading={loading} onSubmit={handleAnalyze} />
      </section>

      {error && <section className="mx-auto max-w-7xl px-6"><div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div></section>}

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
          {analysis ? "Result UI will be added in Task 4." : "Your detailed CV review will appear here after analysis."}
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 3: Update metadata**

Modify `src/app/layout.tsx` metadata:

```ts
export const metadata: Metadata = {
  title: "HireFit — AI CV Reviewer",
  description: "Cek kualitas CV, kesiapan ATS, keyword, dan rekomendasi perbaikan dengan AI.",
};
```

- [ ] **Step 4: Run lint and build**

Run:

```bash
rtk npm run lint
rtk npm run build
```

Expected: both PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/cv-review/cv-review-form.tsx src/app/page.tsx src/app/layout.tsx
rtk git commit -m "feat: add cv reviewer landing form"
```

---

### Task 4: Build result UI components

**Files:**
- Create: `src/components/cv-review/score-circle.tsx`
- Create: `src/components/cv-review/section-accordion.tsx`
- Create: `src/components/cv-review/keyword-panel.tsx`
- Create: `src/components/cv-review/priority-plan.tsx`
- Create: `src/components/cv-review/rewrite-card.tsx`
- Create: `src/components/cv-review/result-view.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create score component**

Write `src/components/cv-review/score-circle.tsx`:

```tsx
import { scoreTone } from "@/lib/cv-review/validation";

export function ScoreCircle({ score }: { score: number }) {
  const tone = scoreTone(score);
  const color = tone === "excellent" ? "#059669" : tone === "good" ? "#0891b2" : tone === "warning" ? "#d97706" : "#dc2626";

  return (
    <div className="relative grid h-36 w-36 place-items-center rounded-full" style={{ background: `conic-gradient(${color} ${score}%, #e2e8f0 ${score}%)` }}>
      <div className="grid h-28 w-28 place-items-center rounded-full bg-white">
        <div className="text-center">
          <div className="text-4xl font-black text-slate-950">{score}%</div>
          <div className="text-xs font-bold uppercase tracking-widest text-slate-500">ATS Score</div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create rewrite card**

Write `src/components/cv-review/rewrite-card.tsx`:

```tsx
"use client";

export function RewriteCard({ example }: { example: string }) {
  async function copyExample() {
    await navigator.clipboard.writeText(example);
  }

  return (
    <div className="rounded-xl border border-cyan-100 bg-cyan-50 p-3 text-sm text-cyan-950">
      <p>{example}</p>
      <button type="button" onClick={copyExample} className="mt-3 rounded-lg bg-white px-3 py-1 text-xs font-bold text-cyan-800 shadow-sm">Copy</button>
    </div>
  );
}
```

- [ ] **Step 3: Create accordion**

Write `src/components/cv-review/section-accordion.tsx`:

```tsx
import { SECTION_DEFINITIONS, type SectionResult } from "@/lib/cv-review/types";
import { scoreTone } from "@/lib/cv-review/validation";
import { RewriteCard } from "./rewrite-card";

type SectionAccordionProps = {
  sections: Record<string, SectionResult>;
  extraSections?: Array<{ title: string; section: SectionResult }>;
};

export function SectionAccordion({ sections, extraSections = [] }: SectionAccordionProps) {
  const entries = [
    ...SECTION_DEFINITIONS.map((definition) => ({ title: definition.title, section: sections[definition.key] })),
    ...extraSections,
  ].filter((entry) => entry.section);

  return (
    <div className="space-y-3">
      {entries.map(({ title, section }) => <SectionItem key={title} title={title} section={section} />)}
    </div>
  );
}

function SectionItem({ title, section }: { title: string; section: SectionResult }) {
  const tone = scoreTone(section.score);
  const toneClass = tone === "excellent" ? "bg-emerald-100 text-emerald-800" : tone === "good" ? "bg-cyan-100 text-cyan-800" : tone === "warning" ? "bg-amber-100 text-amber-800" : tone === "danger" ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-700";

  return (
    <details className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" open={title === "Overall Impression"}>
      <summary className="flex cursor-pointer items-center justify-between gap-4 p-5">
        <div>
          <h3 className="text-lg font-black text-slate-950">{title}</h3>
          <p className="text-sm text-slate-500">Priority: {section.priority}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-black ${toneClass}`}>{section.score === null ? "N/A" : `${section.score}%`}</span>
      </summary>
      <div className="grid gap-5 border-t border-slate-100 p-5 md:grid-cols-2">
        <div className="md:col-span-2"><h4 className="font-bold">Analysis</h4><p className="mt-2 text-slate-600">{section.analysis}</p></div>
        <List title="What works" items={section.whatWorks} />
        <List title="Problems found" items={section.problemsFound} />
        <List title="Action points" items={section.actionPoints} />
        <div><h4 className="font-bold">Why it matters</h4><p className="mt-2 text-sm text-slate-600">{section.whyImportant}</p></div>
        {section.examples.length > 0 && <div className="md:col-span-2"><h4 className="mb-3 font-bold">Example rewrites</h4><div className="grid gap-3 md:grid-cols-2">{section.examples.map((example) => <RewriteCard key={example} example={example} />)}</div></div>}
      </div>
    </details>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return <div><h4 className="font-bold">{title}</h4><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">{items.map((item) => <li key={item}>{item}</li>)}</ul></div>;
}
```

- [ ] **Step 4: Create keyword panel and priority plan**

Write `src/components/cv-review/keyword-panel.tsx`:

```tsx
import type { KeywordResult } from "@/lib/cv-review/types";

export function KeywordPanel({ keywords }: { keywords: KeywordResult }) {
  const groups = [
    ["Job titles", keywords.jobTitles],
    ["Skills", keywords.skills],
    ["Career paths", keywords.careerPaths],
    ["Summary keywords", keywords.professionalSummaryKeywords],
    ["Additional keywords", keywords.additionalKeywords],
    ["Missing keywords", keywords.missingKeywords],
  ] as const;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-black">Keyword Insights</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {groups.map(([title, items]) => (
          <div key={title} className="rounded-2xl bg-slate-50 p-4">
            <h3 className="font-bold text-slate-900">{title}</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {items.length ? items.map((item) => <span key={item} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">{item}</span>) : <span className="text-sm text-slate-500">No items detected.</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

Write `src/components/cv-review/priority-plan.tsx`:

```tsx
export function PriorityPlan({ warnings, items }: { warnings: string[]; items: string[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Panel title="ATS Readability Notes" items={warnings} tone="amber" />
      <Panel title="Fix These 5 First" items={items} tone="cyan" />
    </div>
  );
}

function Panel({ title, items, tone }: { title: string; items: string[]; tone: "amber" | "cyan" }) {
  const boxClass = tone === "amber" ? "border-amber-200 bg-amber-50" : "border-cyan-200 bg-cyan-50";
  return (
    <div className={`rounded-3xl border p-6 ${boxClass}`}>
      <h2 className="text-xl font-black text-slate-950">{title}</h2>
      <ol className="mt-4 space-y-3">
        {items.map((item, index) => <li key={item} className="flex gap-3 text-sm text-slate-700"><span className="font-black text-slate-950">{index + 1}.</span><span>{item}</span></li>)}
      </ol>
    </div>
  );
}
```

- [ ] **Step 5: Create composed result view**

Write `src/components/cv-review/result-view.tsx`:

```tsx
import type { CVReviewResult, SectionResult } from "@/lib/cv-review/types";
import { KeywordPanel } from "./keyword-panel";
import { PriorityPlan } from "./priority-plan";
import { ScoreCircle } from "./score-circle";
import { SectionAccordion } from "./section-accordion";

export function ResultView({ result }: { result: CVReviewResult }) {
  const extraSections: Array<{ title: string; section: SectionResult }> = [];
  if (result.jobFit) extraSections.push({ title: "Job Fit", section: result.jobFit });
  if (result.tailoredContent) extraSections.push({ title: "Tailored Content", section: result.tailoredContent });
  if (result.experienceMatch) extraSections.push({ title: "Experience Match", section: result.experienceMatch });

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:flex md:items-center md:gap-8">
        <ScoreCircle score={result.overallScore} />
        <div className="mt-6 space-y-3 md:mt-0">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-cyan-700">HireFit Review Result</p>
          <h2 className="text-3xl font-black text-slate-950">Your CV scored {result.overallScore}%</h2>
          <p className="max-w-3xl text-slate-600">{result.summary}</p>
        </div>
      </div>

      <PriorityPlan warnings={result.atsWarnings} items={result.priorityPlan} />
      <SectionAccordion sections={result.sections} extraSections={extraSections} />
      <KeywordPanel keywords={result.keywords} />

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-black">Career Recommendation</h2>
        <p className="mt-3 text-slate-600">{result.careerRecommendation.summary}</p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <List title="Recommended roles" items={result.careerRecommendation.recommendedRoles} />
          <List title="Industries" items={result.careerRecommendation.recommendedIndustries} />
          <List title="Next steps" items={result.careerRecommendation.nextSteps} />
        </div>
      </div>
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return <div className="rounded-2xl bg-slate-50 p-4"><h3 className="font-bold">{title}</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">{items.map((item) => <li key={item}>{item}</li>)}</ul></div>;
}
```

- [ ] **Step 6: Render result in page**

In `src/app/page.tsx`, add import:

```ts
import { ResultView } from "@/components/cv-review/result-view";
```

Replace placeholder result section with:

```tsx
<section className="mx-auto max-w-7xl px-6 py-12">
  {analysis ? (
    <ResultView result={analysis} />
  ) : (
    <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
      Your detailed CV review will appear here after analysis.
    </div>
  )}
</section>
```

- [ ] **Step 7: Run lint and build**

Run:

```bash
rtk npm run lint
rtk npm run build
```

Expected: both PASS.

- [ ] **Step 8: Commit**

```bash
rtk git add src/components/cv-review src/app/page.tsx
rtk git commit -m "feat: add cv review result UI"
```

---

### Task 5: Add education sections, environment template, and final verification

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`
- Create: `.env.example`

- [ ] **Step 1: Add feature and FAQ sections**

In `src/app/page.tsx`, insert before `</main>`:

```tsx
<section id="features" className="mx-auto max-w-7xl px-6 py-12">
  <div className="grid gap-4 md:grid-cols-3">
    {[
      ["12-section review", "Contact, skills, summary, work experience, achievements, education, writing quality, keywords, and career direction."],
      ["JD-aware analysis", "Paste a job description to find missing keywords and improve role-specific positioning."],
      ["Actionable rewrites", "Get honest examples that improve wording without inventing fake experience."],
    ].map(([title, body]) => (
      <div key={title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
      </div>
    ))}
  </div>
</section>

<section id="faq" className="mx-auto max-w-4xl px-6 py-12">
  <div className="space-y-3 text-center">
    <p className="text-sm font-black uppercase tracking-[0.25em] text-cyan-700">FAQ</p>
    <h2 className="text-3xl font-black">CV ATS Checker basics</h2>
  </div>
  <div className="mt-8 space-y-3">
    {[
      ["Apa itu ATS checker?", "ATS checker membantu memperkirakan apakah struktur, keyword, dan isi CV mudah dibaca sistem screening otomatis."],
      ["Skor bagus berapa?", "Target aman adalah 70% ke atas, tapi CV tetap harus jelas untuk recruiter manusia."],
      ["Apakah HireFit menyimpan CV?", "Pada fase ini, teks CV dikirim untuk analisis langsung dan tidak disimpan sebagai riwayat."],
    ].map(([question, answer]) => (
      <details key={question} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <summary className="cursor-pointer font-bold">{question}</summary>
        <p className="mt-3 text-sm leading-6 text-slate-600">{answer}</p>
      </details>
    ))}
  </div>
</section>
```

- [ ] **Step 2: Set global light base**

Replace `src/app/globals.css` with:

```css
@import "tailwindcss";

:root {
  --background: #f8fafc;
  --foreground: #020617;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
}

a {
  transition: color 150ms ease;
}

a:hover {
  color: #0891b2;
}
```

- [ ] **Step 3: Add env example**

Write `.env.example`:

```env
GEMINI_API_KEY=your_google_ai_studio_key_here
GEMINI_MODEL=gemini-2.5-flash-lite
```

- [ ] **Step 4: Run full validation**

Run:

```bash
rtk npm run lint
rtk npm run build
```

Expected: both PASS.

- [ ] **Step 5: Manual verification**

Run app:

```bash
rtk npm run dev
```

Open `http://localhost:3000` and verify:

1. Landing page loads.
2. PDF upload rejects files over 5MB.
3. Manual CV text accepts at least 50 characters.
4. Language selector switches between English and Bahasa Indonesia.
5. Purpose selector works.
6. Job role/JD optional fields submit.
7. Without `GEMINI_API_KEY`, API shows setup error.
8. With valid `GEMINI_API_KEY`, result renders score, priority plan, warnings, accordions, keywords, and career recommendation.

- [ ] **Step 6: Commit**

```bash
rtk git add src/app/page.tsx src/app/globals.css .env.example
rtk git commit -m "feat: finish cv reviewer MVP shell"
```

---

## Self-Review

Spec coverage:

- FE-1 covered by Task 3.
- FE-2 covered by Task 4.
- FE-3 covered by Tasks 3, 4, and 5 manual checks.
- FE-4 covered by Task 4 priority plan, ATS warnings, keyword panel, rewrite cards, and Task 5 FAQ/education.
- BE-1 covered by Tasks 1 and 2.
- Deployment env/local validation covered by Task 5.
- Auth, payment, storage, review history, and active locks remain out of scope as required.

Placeholder scan: no TBD/TODO placeholders. Future phases are excluded by spec and not part of this plan.

Type consistency: `AnalyzeRequest`, `CVReviewResult`, `SectionResult`, `KeywordResult`, `CareerRecommendationResult`, `SECTION_DEFINITIONS`, `scoreTone`, `validateAnalyzeRequest`, `extractJsonObject`, and `buildCVReviewPrompt` names match across tasks.
