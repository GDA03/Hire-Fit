# PDF Parsing Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make PDF upload more reliable by replacing CDN worker setup with project-bundled PDF.js worker config, adding parse confidence, and showing extracted text preview while keeping manual paste fallback.

**Architecture:** Keep extraction client-side for this phase to avoid storage/server complexity. Move PDF extraction into a focused helper under `src/lib/cv-review/pdf-extraction.ts`, then make `CVReviewForm` consume structured extraction results with confidence and warnings.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, `pdfjs-dist` 6.x.

---

## Task 1: Extract PDF parsing helper

**Files:**
- Create: `src/lib/cv-review/pdf-extraction.ts`
- Modify: `src/components/cv-review/cv-review-form.tsx`

Steps:

- [ ] Create `PDFExtractionResult` type with `text`, `pageCount`, `characterCount`, `confidence`, and `warnings`.
- [ ] Create `extractTextFromPDF(file: File): Promise<PDFExtractionResult>`.
- [ ] Configure PDF.js worker with bundled worker URL, not CDN:

```ts
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url,
).toString();
```

- [ ] Use `getDocument({ data: await file.arrayBuffer() })`.
- [ ] Loop all pages, call `getTextContent()`, join `item.str` values.
- [ ] Call `page.cleanup()` after each page.
- [ ] Compute confidence:
  - `good` if text length >= 500 and average chars/page >= 100.
  - `partial` if text length >= 50.
  - `poor` otherwise.
- [ ] Return warnings for poor/partial extraction.
- [ ] Update `CVReviewForm` to call helper.
- [ ] Keep manual text fallback editable.
- [ ] Run `rtk npm run lint` and `rtk npm run build`.
- [ ] Commit: `fix: improve client pdf text extraction`.

## Task 2: Improve PDF extraction UX

**Files:**
- Modify: `src/components/cv-review/cv-review-form.tsx`

Steps:

- [ ] Show page count and extracted character count.
- [ ] Show confidence badge: Good / Partial / Poor.
- [ ] Show first 600 characters as extracted preview.
- [ ] If confidence is poor, do not block user; tell user to paste CV manually.
- [ ] Keep submit disabled until `request.cvText.trim().length >= 50`.
- [ ] Run `rtk npm run lint` and `rtk npm run build`.
- [ ] Commit: `feat: show pdf parse confidence preview`.

## Self-Review

Spec coverage:

- Fixes PDF worker setup.
- Adds parse confidence.
- Adds extracted text preview.
- Keeps manual paste fallback.
- Does not add server upload/storage/auth/payment.

No placeholders remain. Type names are consistent across tasks.
