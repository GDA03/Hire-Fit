# HireFit PDF Extraction and ATS Checks Design

Date: 2026-06-04

## Goal

Improve HireFit's CV input quality while staying compatible with zero-cost deployment. The next implementation phase should make PDF parsing more reliable without adding storage or paid infrastructure, then add deterministic ATS checks that run without extra AI calls.

## Context

Current HireFit production URL is:

```txt
https://hire-fit-one.vercel.app
```

Current state:

- Manual CV text flow works locally.
- Production deployment is READY.
- Browser PDF extraction exists and now shows parse confidence, warnings, character count, page count, and preview.
- PDF parsing can still be poor for image-based or unusual PDFs.
- No auth, payment, database, storage, or async review flow exists yet.

Project root must stay inside:

```txt
C:\Users\alber\Downloads\Ngoding\HireFit
```

## Chosen Approach

Use A-lite + D before B:

1. Keep browser PDF extraction as the primary path.
2. Add optional server-side PDF extraction only as a fallback when browser extraction is poor or fails.
3. Add deterministic ATS checks based on extracted/pasted text and file metadata.
4. Delay async review flow until input quality and ATS checks are stable.

This keeps the project free-tier friendly because most parsing stays in the browser, server parsing is user-triggered only, no files are stored, and deterministic checks cost no AI tokens.

## Non-Goals

This phase will not add:

- auth,
- database,
- saved history,
- background worker,
- review queue,
- payment,
- locked sections,
- persistent file storage,
- DOC/DOCX support.

## Architecture

### Client-first extraction

Default flow:

```txt
User uploads PDF
  -> browser PDF.js extracts text
  -> app shows parse confidence + preview
  -> user edits extracted text if needed
  -> user submits Gemini review
```

Browser extraction remains the fastest and cheapest path because it uses user device CPU and sends only extracted text to the API.

### Server fallback extraction

Fallback flow:

```txt
Browser extraction fails or confidence is poor
  -> app shows Try server extraction button
  -> POST /api/extract-pdf with multipart/form-data
  -> server parses file in memory
  -> server returns text + confidence + warnings
  -> app fills CV Text and preview
  -> user edits/submits Gemini review
```

Server extraction rules:

- Accept PDF only.
- Max file size 5MB.
- Parse in memory.
- Do not write to disk.
- Do not upload to Vercel Blob or external storage.
- Return extracted text only.
- Discard file after request completes.

### Deterministic ATS checks

ATS checks run after text is available and before Gemini review. They should run on the client and can also be reused server-side later.

Checks use cheap string/file heuristics only:

- missing email,
- missing phone,
- missing LinkedIn or portfolio link,
- missing common CV section headings,
- low extracted character count,
- very short CV,
- poor parse confidence,
- suspicious filename,
- missing target-role keywords from JD when JD exists,
- excessive repeated keywords.

These checks do not replace Gemini review. They add deterministic, explainable warnings and can be included in Gemini prompt context later.

## Data Types

```ts
export type PDFParseConfidence = "good" | "partial" | "poor";

export type PDFExtractionResult = {
  text: string;
  pageCount: number;
  characterCount: number;
  confidence: PDFParseConfidence;
  warnings: string[];
  preview: string;
  source: "client" | "server";
};

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
```

## API Design

### POST /api/extract-pdf

Request:

```http
POST /api/extract-pdf
Content-Type: multipart/form-data
Body: file=<PDF file>
```

Response success:

```json
{
  "text": "extracted text",
  "pageCount": 2,
  "characterCount": 4200,
  "confidence": "good",
  "warnings": ["PDF text extraction looks usable. Review extracted text before submitting."],
  "preview": "first 600 chars",
  "source": "server"
}
```

Response errors:

```json
{ "error": "Upload a PDF file only." }
{ "error": "PDF must be 5MB or smaller." }
{ "error": "Could not extract text from this PDF. Paste CV text manually instead." }
```

## UI Design

### PDF extraction card

The existing upload area should gain:

- parse source: client/server,
- parse confidence badge,
- page count,
- character count,
- extracted text preview,
- warnings,
- Try server extraction button when client extraction fails or confidence is poor.

### ATS checks panel

Show below PDF extraction preview or above CV Text.

Display groups:

- Critical issues first.
- Warnings second.
- Info last.

Each check shows:

- title,
- severity badge,
- detail,
- suggestion.

## Data Flow

1. User uploads PDF.
2. Client parser extracts text and creates `PDFExtractionResult` with source `client`.
3. App sets `cvText` from extraction result.
4. App runs `runATSChecks()` using extracted text, file name, parse confidence, and optional JD.
5. App displays extraction preview and ATS checks.
6. If client parse is poor or failed, user can click Try server extraction.
7. Server parser returns `PDFExtractionResult` with source `server`.
8. App replaces CV text if server extraction returns text.
9. App reruns ATS checks.
10. User submits Gemini review.

## Error Handling

- Invalid file type: show local error before parsing.
- File over 5MB: show local error before parsing.
- Client parse exception: show manual fallback and Try server extraction.
- Server parse exception: show manual fallback, keep any existing manually entered text.
- Poor parse: do not block user; warn and require at least 50 chars before submit.
- Empty ATS checks: show no panel, or show small success note that basic checks passed.

## Testing and Verification

Required validation:

- `rtk npm run lint` passes.
- `rtk npm run build` passes.
- Local browser test uploads a valid text PDF and shows parse metadata.
- Local browser test uploads invalid non-PDF and shows validation error.
- Local browser test uses poor parse PDF and shows Try server extraction.
- Local browser test confirms manual paste still enables submit.
- Local browser test confirms ATS checks update when CV text changes.

## Future Phase B: Async Review Flow

After this phase, implement async review flow:

- `POST /api/cv-reviews`,
- `GET /api/cv-reviews/:id`,
- `GET /api/cv-reviews/:id/status`,
- `PATCH /api/cv-reviews/:id/retry`,
- result route `/cv-reviewer/results/[id]`.

Do not start async flow until server fallback and deterministic checks are stable.

## Self-Review Notes

- Scope is focused on input quality and deterministic ATS checks.
- Zero-cost constraint is explicit: no storage, no database, no queue, no always-on server parsing.
- Server fallback is optional and user-triggered.
- Async review flow is documented as a future phase, not part of this phase.
- No placeholders remain.
