# PDF Extraction and ATS Checks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add zero-cost server PDF fallback and deterministic ATS checks to improve CV input quality before Gemini review.

**Architecture:** Keep browser PDF extraction as primary. Add an optional `/api/extract-pdf` fallback that parses PDFs in memory without storage. Add reusable deterministic ATS checks that run on CV text, file metadata, parse confidence, and optional JD, then display them in the form.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, `pdfjs-dist` 6.x, Vercel Functions free tier.

---

## File Structure

Create:

- `src/app/api/extract-pdf/route.ts` — server-side fallback PDF extraction route.
- `src/lib/cv-review/ats-checks.ts` — deterministic ATS checks.
- `src/components/cv-review/ats-checks-panel.tsx` — grouped ATS checks display.

Modify:

- `src/lib/cv-review/pdf-extraction.ts` — add `source: "client" | "server"` and shared constants.
- `src/components/cv-review/cv-review-form.tsx` — add server fallback button, file metadata state, ATS checks panel.
- `src/lib/cv-review/types.ts` — export ATS check types if preferred, or keep them in `ats-checks.ts`.
- `docs/handoff-cv-reviewer-mvp.md` — note phase completion.

---

### Task 1: Add shared extraction source and ATS checks

**Files:**
- Modify: `src/lib/cv-review/pdf-extraction.ts`
- Create: `src/lib/cv-review/ats-checks.ts`

- [ ] **Step 1: Update PDF extraction type**

In `src/lib/cv-review/pdf-extraction.ts`, update `PDFExtractionResult`:

```ts
export type PDFExtractionSource = "client" | "server";

export type PDFExtractionResult = {
  text: string;
  pageCount: number;
  characterCount: number;
  confidence: PDFParseConfidence;
  warnings: string[];
  preview: string;
  source: PDFExtractionSource;
};
```

Update client return object:

```ts
return {
  text,
  pageCount: pdf.numPages,
  characterCount,
  confidence,
  warnings,
  preview: text.slice(0, 600),
  source: "client",
};
```

Export helper functions so server route can reuse them:

```ts
export function getPDFParseConfidence(characterCount: number, averageCharsPerPage: number): PDFParseConfidence {
  if (characterCount >= 500 && averageCharsPerPage >= 100) return "good";
  if (characterCount >= 50) return "partial";
  return "poor";
}

export function getPDFParseWarnings(confidence: PDFParseConfidence, characterCount: number, averageCharsPerPage: number) {
  if (confidence === "good") {
    return ["PDF text extraction looks usable. Review extracted text before submitting."];
  }

  if (confidence === "partial") {
    return [
      `Only ${characterCount.toLocaleString()} characters were extracted. Some CV sections may be missing.`,
      "Review extracted text and paste missing content manually before submitting.",
    ];
  }

  return [
    "PDF text extraction found very little readable text.",
    `Average readable text is ${Math.round(averageCharsPerPage).toLocaleString()} characters per page. This PDF may be image-based or ATS-unfriendly.`,
    "Paste CV text manually for a better review.",
  ];
}
```

Replace internal calls to old private `getConfidence`/`getWarnings` with exported helpers.

- [ ] **Step 2: Create ATS checks helper**

Write `src/lib/cv-review/ats-checks.ts`:

```ts
import type { PDFParseConfidence } from "./pdf-extraction";

export type ATSCheckSeverity = "info" | "warning" | "critical";

export type ATSCheck = {
  id: string;
  severity: ATSCheckSeverity;
  title: string;
  detail: string;
  suggestion: string;
};

export type ATSCheckInput = {
  cvText: string;
  fileName?: string;
  parseConfidence?: PDFParseConfidence;
  jobDescription?: string;
};

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/;
const LINKEDIN_RE = /linkedin\.com\//i;
const PORTFOLIO_RE = /(github\.com\/|behance\.net\/|dribbble\.com\/|portfolio|vercel\.app|netlify\.app)/i;
const SECTION_HEADINGS = ["experience", "education", "skills", "projects", "summary"];

export function runATSChecks(input: ATSCheckInput): ATSCheck[] {
  const text = input.cvText.trim();
  const lower = text.toLowerCase();
  const checks: ATSCheck[] = [];

  if (text.length < 50) {
    checks.push({
      id: "cv-too-short",
      severity: "critical",
      title: "CV text is too short",
      detail: "Less than 50 readable characters are available for review.",
      suggestion: "Paste the full CV text manually or upload an ATS-readable PDF.",
    });
  } else if (text.length < 500) {
    checks.push({
      id: "cv-low-text",
      severity: "warning",
      title: "CV text may be incomplete",
      detail: `Only ${text.length.toLocaleString()} characters are available for review.`,
      suggestion: "Review extracted text and paste missing sections before submitting.",
    });
  }

  if (input.parseConfidence === "poor") {
    checks.push({
      id: "poor-parse-confidence",
      severity: "critical",
      title: "PDF extraction confidence is poor",
      detail: "The PDF may be image-based or contain text that ATS systems cannot read reliably.",
      suggestion: "Use the server extraction fallback or paste text manually.",
    });
  }

  if (!EMAIL_RE.test(text)) {
    checks.push({
      id: "missing-email",
      severity: "critical",
      title: "Email not detected",
      detail: "Recruiters and ATS systems need a readable email address.",
      suggestion: "Add a professional email near the top of your CV.",
    });
  }

  if (!PHONE_RE.test(text)) {
    checks.push({
      id: "missing-phone",
      severity: "warning",
      title: "Phone number not detected",
      detail: "A phone number makes recruiter follow-up easier.",
      suggestion: "Add a reachable phone number with country code if applying internationally.",
    });
  }

  if (!LINKEDIN_RE.test(text) && !PORTFOLIO_RE.test(text)) {
    checks.push({
      id: "missing-professional-link",
      severity: "info",
      title: "Professional link not detected",
      detail: "No LinkedIn, GitHub, portfolio, or similar profile was found.",
      suggestion: "Add a relevant profile link if it strengthens your application.",
    });
  }

  const missingHeadings = SECTION_HEADINGS.filter((heading) => !lower.includes(heading));
  if (missingHeadings.length >= 3) {
    checks.push({
      id: "missing-section-headings",
      severity: "warning",
      title: "Common CV headings are missing",
      detail: `Missing or unreadable headings include: ${missingHeadings.join(", ")}.`,
      suggestion: "Use clear headings such as Summary, Experience, Education, Skills, and Projects.",
    });
  }

  if (input.fileName && !isProfessionalFileName(input.fileName)) {
    checks.push({
      id: "filename-professionalism",
      severity: "info",
      title: "Filename could be more professional",
      detail: `Current filename: ${input.fileName}`,
      suggestion: "Use a filename like Firstname-Lastname-CV.pdf or Firstname-Lastname-Resume.pdf.",
    });
  }

  const missingKeywords = getMissingJDKeywords(text, input.jobDescription);
  if (missingKeywords.length > 0) {
    checks.push({
      id: "missing-jd-keywords",
      severity: "warning",
      title: "Some job description keywords are missing",
      detail: `Potential missing terms: ${missingKeywords.slice(0, 8).join(", ")}.`,
      suggestion: "Add truthful evidence for relevant missing keywords if you have that experience.",
    });
  }

  return sortATSChecks(checks);
}

function isProfessionalFileName(fileName: string) {
  const clean = fileName.toLowerCase();
  if (/final|finalfinal|new|copy|scan|screenshot|untitled/.test(clean)) return false;
  return /cv|resume/.test(clean) && /^[a-z0-9._ -]+$/i.test(fileName);
}

function getMissingJDKeywords(cvText: string, jobDescription?: string) {
  if (!jobDescription?.trim()) return [];

  const cv = new Set(cvText.toLowerCase().split(/[^a-z0-9+#.]+/).filter((word) => word.length >= 4));
  const jdWords = jobDescription.toLowerCase().split(/[^a-z0-9+#.]+/).filter((word) => word.length >= 4);
  const uniqueJDWords = Array.from(new Set(jdWords));
  const stopWords = new Set(["with", "that", "this", "from", "have", "will", "your", "their", "they", "them", "work", "role", "team", "able"]);

  return uniqueJDWords.filter((word) => !stopWords.has(word) && !cv.has(word)).slice(0, 12);
}

function sortATSChecks(checks: ATSCheck[]) {
  const weight: Record<ATSCheckSeverity, number> = { critical: 0, warning: 1, info: 2 };
  return checks.sort((a, b) => weight[a.severity] - weight[b.severity]);
}
```

- [ ] **Step 3: Validate**

Run:

```powershell
rtk npm run lint
rtk npm run build
```

Expected: both PASS.

- [ ] **Step 4: Commit**

```powershell
rtk git add src/lib/cv-review/pdf-extraction.ts src/lib/cv-review/ats-checks.ts
rtk git commit -m "feat: add deterministic ats checks"
```

---

### Task 2: Add server PDF extraction fallback API

**Files:**
- Create: `src/app/api/extract-pdf/route.ts`

- [ ] **Step 1: Create route**

Write `src/app/api/extract-pdf/route.ts`:

```ts
import { NextResponse } from "next/server";
import {
  getPDFParseConfidence,
  getPDFParseWarnings,
  MAX_SERVER_PDF_SIZE_BYTES,
  type PDFExtractionResult,
} from "@/lib/cv-review/pdf-extraction";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "PDF file is required." }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Upload a PDF file only." }, { status: 400 });
    }

    if (file.size > MAX_SERVER_PDF_SIZE_BYTES) {
      return NextResponse.json({ error: "PDF must be 5MB or smaller." }, { status: 400 });
    }

    const result = await extractServerPDF(file);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Server PDF extraction error", error);
    return NextResponse.json(
      { error: "Could not extract text from this PDF. Paste CV text manually instead." },
      { status: 500 },
    );
  }
}

async function extractServerPDF(file: File): Promise<PDFExtractionResult> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), disableWorker: true }).promise;
  const pageTexts: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    pageTexts.push(text);
    page.cleanup();
  }

  const text = pageTexts.filter(Boolean).join("\n\n").trim();
  const characterCount = text.length;
  const averageCharsPerPage = pdf.numPages > 0 ? characterCount / pdf.numPages : 0;
  const confidence = getPDFParseConfidence(characterCount, averageCharsPerPage);

  return {
    text,
    pageCount: pdf.numPages,
    characterCount,
    confidence,
    warnings: getPDFParseWarnings(confidence, characterCount, averageCharsPerPage),
    preview: text.slice(0, 600),
    source: "server",
  };
}
```

Also add this export to `src/lib/cv-review/pdf-extraction.ts`:

```ts
export const MAX_SERVER_PDF_SIZE_BYTES = 5 * 1024 * 1024;
```

- [ ] **Step 2: Validate**

Run:

```powershell
rtk npm run lint
rtk npm run build
```

Expected: both PASS.

- [ ] **Step 3: Commit**

```powershell
rtk git add src/app/api/extract-pdf/route.ts src/lib/cv-review/pdf-extraction.ts
rtk git commit -m "feat: add server pdf extraction fallback"
```

---

### Task 3: Wire ATS checks and server fallback into form

**Files:**
- Create: `src/components/cv-review/ats-checks-panel.tsx`
- Modify: `src/components/cv-review/cv-review-form.tsx`

- [ ] **Step 1: Create ATS checks panel**

Write `src/components/cv-review/ats-checks-panel.tsx`:

```tsx
import type { ATSCheck, ATSCheckSeverity } from "@/lib/cv-review/ats-checks";

export function ATSChecksPanel({ checks }: { checks: ATSCheck[] }) {
  if (checks.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
        Basic ATS checks passed. Review extracted text before submitting.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <div>
        <h3 className="font-bold text-slate-100">ATS quick checks</h3>
        <p className="mt-1 text-sm text-slate-400">Deterministic checks before AI review. Fix critical items first.</p>
      </div>
      <div className="space-y-3">
        {checks.map((check) => <ATSCheckItem key={check.id} check={check} />)}
      </div>
    </div>
  );
}

function ATSCheckItem({ check }: { check: ATSCheck }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${severityClass(check.severity)}`}>{check.severity}</span>
        <h4 className="font-semibold text-slate-100">{check.title}</h4>
      </div>
      <p className="mt-2 text-sm text-slate-300">{check.detail}</p>
      <p className="mt-2 text-sm text-cyan-200">{check.suggestion}</p>
    </div>
  );
}

function severityClass(severity: ATSCheckSeverity) {
  if (severity === "critical") return "bg-red-400/15 text-red-200";
  if (severity === "warning") return "bg-amber-400/15 text-amber-200";
  return "bg-cyan-400/15 text-cyan-200";
}
```

- [ ] **Step 2: Update form imports and state**

In `src/components/cv-review/cv-review-form.tsx`, add imports:

```ts
import { useMemo } from "react";
import { runATSChecks } from "@/lib/cv-review/ats-checks";
import { ATSChecksPanel } from "./ats-checks-panel";
```

Change React import to:

```ts
import { ChangeEvent, FormEvent, useMemo, useState } from "react";
```

Add state:

```ts
const [currentFile, setCurrentFile] = useState<File | null>(null);
const [serverExtracting, setServerExtracting] = useState(false);
const atsChecks = useMemo(
  () => runATSChecks({
    cvText: request.cvText,
    fileName: currentFile?.name,
    parseConfidence: extraction?.confidence,
    jobDescription: request.jobDescription,
  }),
  [currentFile?.name, extraction?.confidence, request.cvText, request.jobDescription],
);
```

In `handleFileChange`, after `const file = ...`, set current file:

```ts
setCurrentFile(file);
```

When invalid file type or size occurs, also reset current file:

```ts
setCurrentFile(null);
```

- [ ] **Step 3: Add server fallback function**

Add inside `CVReviewForm`:

```ts
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
    setFileStatus(`Server extracted ${data.characterCount.toLocaleString()} characters from ${data.pageCount.toLocaleString()} page${data.pageCount === 1 ? "" : "s"}.`);
    setFileError(data.confidence === "poor" ? "Server extraction still looks poor. Paste CV text manually for best results." : "");
  } catch (error) {
    setFileError(error instanceof Error ? error.message : "Server extraction failed. Paste CV text manually instead.");
  } finally {
    setServerExtracting(false);
  }
}
```

- [ ] **Step 4: Add button and panel to JSX**

Inside upload card after `{extraction && <PDFExtractionPreview extraction={extraction} />}` add:

```tsx
{currentFile && (!extraction || extraction.confidence === "poor") && (
  <button
    type="button"
    onClick={handleServerExtraction}
    disabled={loading || extracting || serverExtracting}
    className="rounded-xl border border-cyan-300/40 px-4 py-2 text-sm font-bold text-cyan-100 transition hover:bg-cyan-300/10 disabled:cursor-not-allowed disabled:opacity-60"
  >
    {serverExtracting ? "Trying server extraction..." : "Try server extraction"}
  </button>
)}

<ATSChecksPanel checks={atsChecks} />
```

Update `PDFExtractionPreview` source label:

```tsx
<span className="text-xs text-slate-400">
  {extraction.source} · {extraction.characterCount.toLocaleString()} chars · {extraction.pageCount.toLocaleString()} page{extraction.pageCount === 1 ? "" : "s"}
</span>
```

- [ ] **Step 5: Validate**

Run:

```powershell
rtk npm run lint
rtk npm run build
```

Expected: both PASS.

- [ ] **Step 6: Commit**

```powershell
rtk git add src/components/cv-review/cv-review-form.tsx src/components/cv-review/ats-checks-panel.tsx
rtk git commit -m "feat: show ats checks and server extraction fallback"
```

---

### Task 4: Runtime verification and docs

**Files:**
- Modify: `docs/handoff-cv-reviewer-mvp.md`

- [ ] **Step 1: Update handoff doc**

Add:

```md
## PDF and ATS checks phase

Implemented after MVP:

- client PDF extraction remains primary,
- server PDF extraction fallback exists at `POST /api/extract-pdf`,
- no file storage is used,
- deterministic ATS checks run before Gemini review,
- ATS checks cost no extra AI tokens,
- manual paste remains fallback.
```

- [ ] **Step 2: Runtime verify local app**

Run dev server:

```powershell
rtk npm run dev
```

In browser:

1. Upload valid PDF and confirm metadata/preview appears.
2. Upload invalid `.txt` and confirm `Upload a PDF file only.` appears.
3. Upload poor-parse PDF and click `Try server extraction`.
4. Paste CV text containing email/phone and confirm critical checks reduce.
5. Add job description and confirm missing JD keyword warning can appear.

- [ ] **Step 3: Final validation**

Run:

```powershell
rtk npm run lint
rtk npm run build
```

Expected: both PASS.

- [ ] **Step 4: Commit**

```powershell
rtk git add docs/handoff-cv-reviewer-mvp.md
rtk git commit -m "docs: update pdf ats checks handoff"
```

---

## Self-Review

Spec coverage:

- Server fallback API covered by Task 2.
- Deterministic ATS checks covered by Task 1 and Task 3.
- UI display covered by Task 3.
- No storage/database/auth/payment added.
- Runtime verification covered by Task 4.

Placeholder scan: no placeholders remain.

Type consistency: `PDFExtractionResult`, `PDFParseConfidence`, `PDFExtractionSource`, `ATSCheck`, `ATSCheckInput`, and `runATSChecks` are consistent across tasks.
