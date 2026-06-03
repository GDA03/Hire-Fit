# HireFit CV Reviewer MVP — Progress & Handoff

## Project root

All project work must stay inside:

```txt
C:\Users\alber\Downloads\Ngoding\HireFit
```

Do not use `C:\Users\alber` as the project root. Next/Turbopack is explicitly scoped to this project folder in `next.config.ts`.

## Current status

MVP is implemented and locally tested through the manual CV text flow.

Validated:

- `rtk npm run lint` passes.
- `rtk npm run build` passes.
- Local server runs at `http://localhost:3000` when no existing server blocks it.
- Manual flow works:
  - paste CV text,
  - choose language/purpose,
  - optional job role/JD,
  - submit to Gemini,
  - render AI review result.

Known limitation:

- PDF parsing is not reliable yet. This is expected for this milestone. Use manual paste flow for now.

## Environment

Local env file:

```txt
.env.local
```

Required values:

```env
GEMINI_API_KEY=<Google AI Studio API key>
GEMINI_MODEL=gemini-2.5-flash-lite
```

`.env.local` is ignored by git. Do not commit real API keys.

Template file exists:

```txt
.env.example
```

## Implemented features

### Frontend

- Landing page for HireFit AI CV Reviewer.
- Navigation anchors:
  - CV Reviewer
  - Features
  - FAQ
- Hero section with HireFit copy.
- CV review form:
  - PDF upload control,
  - 5MB max validation,
  - browser-side PDF extraction attempt,
  - manual CV text fallback,
  - language selector: English / Bahasa Indonesia,
  - purpose selector: Job seeking / Job seeking + scholarship / Internship / Fresh graduate / Career switch,
  - optional target job role,
  - optional scholarship title,
  - optional job description.
- Loading and error states:
  - extracting PDF,
  - analyzing CV,
  - invalid file type,
  - file too large,
  - poor PDF parse,
  - API/model error.
- Result UI:
  - overall score circle,
  - ATS readability notes,
  - Fix These 5 First priority plan,
  - 12-section accordion,
  - optional targeted sections when job role/JD exists,
  - keyword panel,
  - career recommendation panel,
  - rewrite/example cards with copy button and copied feedback.
- Education/FAQ sections.

### Backend/API

Endpoint:

```txt
POST /api/analyze
```

Request shape:

```ts
type AnalyzeRequest = {
  cvText: string;
  language: "en" | "id";
  purpose: "job_seeking" | "job_scholarship" | "internship" | "fresh_graduate" | "career_switch";
  jobRole?: string;
  jobDescription?: string;
  scholarshipTitle?: string;
};
```

Implemented validation:

- CV text required, minimum 50 characters.
- CV text maximum 60,000 characters.
- Job description maximum 30,000 characters.
- Language must be `en` or `id`.
- Purpose must be supported enum value.

Gemini setup:

- default model: `gemini-2.5-flash-lite`
- configurable via `GEMINI_MODEL`
- JSON response mode enabled:

```ts
generationConfig: { responseMimeType: "application/json" }
```

Prompt output includes:

- `overallScore`
- `summary`
- `atsWarnings`
- `priorityPlan`
- 10 core analysis sections
- keyword groups
- career recommendation
- optional `jobFit`, `tailoredContent`, `experienceMatch` when target role/JD exists

## Important files

```txt
src/app/page.tsx
```

Main page. Owns client state, calls `/api/analyze`, renders landing/form/result.

```txt
src/app/api/analyze/route.ts
```

Next Route Handler for Gemini analysis.

```txt
src/lib/cv-review/types.ts
```

Shared request/result types and constants.

```txt
src/lib/cv-review/validation.ts
```

Request validation, JSON extraction, score tone helper.

```txt
src/lib/cv-review/prompt.ts
```

Gemini prompt builder.

```txt
src/components/cv-review/cv-review-form.tsx
```

Upload/form/manual CV text component.

```txt
src/components/cv-review/result-view.tsx
src/components/cv-review/score-circle.tsx
src/components/cv-review/section-accordion.tsx
src/components/cv-review/keyword-panel.tsx
src/components/cv-review/priority-plan.tsx
src/components/cv-review/rewrite-card.tsx
```

Result display components.

```txt
next.config.ts
```

Contains Turbopack project-root scoping.

## Git status

Latest relevant commits:

```txt
805f273 fix: scope turbopack root to project folder
0c1f6e4 feat: finish cv reviewer MVP shell
05c74f1 fix: add copy controls to rewrite examples
908a113 feat: add cv review result UI
d9cb112 fix: align cv reviewer landing with task 3 plan
a7a3800 feat: add cv reviewer landing form
bfeaedb fix: tighten cv analysis json output
5a717a5 feat: expand cv analysis api
b6c0000 fix: harden cv review validation helpers
c66646c feat: add cv review shared types
49798bc Initial HireFit project
```

## What is not implemented yet

### Auth, history, and payment

Not implemented by design in this milestone:

- login,
- result history,
- persistent review storage,
- paid unlock,
- locked sections,
- payment link creation.

### Async review flow

Not implemented yet:

- review ID,
- `/api/cv-reviews`,
- status polling,
- retry endpoint,
- queue/rate limit,
- one active review guard.

### Robust file parsing

Not implemented yet:

- reliable PDF parsing,
- server-side extraction,
- DOC/DOCX parsing,
- parse confidence score,
- ATS parse preview based on deterministic parser output.

### Deterministic ATS checks

Currently ATS warnings are AI-generated. Deterministic checks not implemented yet:

- multi-column layout risk,
- image/icon/text-in-image risk,
- missing headings detector,
- weird symbols detector,
- filename professionalism check.

### Automated tests

No unit/integration/browser tests yet. Current validation is lint/build/manual browser flow.

## Recommended next steps

### Step 1 — Push current MVP

After confirming no secrets are staged:

```powershell
rtk git status --short
rtk git push -u origin main
```

### Step 2 — Deploy to Vercel free tier

Set Vercel environment variables:

```txt
GEMINI_API_KEY
GEMINI_MODEL=gemini-2.5-flash-lite
```

Then deploy. If using CLI, install Vercel CLI first:

```powershell
npm i -g vercel
```

### Step 3 — Fix PDF parsing

Preferred next implementation:

1. Keep manual paste as fallback.
2. Add better PDF parser strategy.
3. Show parse confidence and extracted text preview.
4. If client-side remains flaky, move extraction to server route.
5. Add DOC/DOCX later only after PDF is stable.

### Step 4 — Add review resource API

When MVP deploy works, add:

```txt
POST /api/cv-reviews
GET /api/cv-reviews/:id
GET /api/cv-reviews/:id/status
PATCH /api/cv-reviews/:id/retry
GET /api/cv-reviews/config
```

Start with in-memory or file-backed development store before adding database/auth.

### Step 5 — Add persistence/auth/payment later

After review resource API works:

1. Add database.
2. Add auth.
3. Add history page.
4. Add free/paid section config.
5. Add payment provider/link flow.

## Handoff notes

- Manual CV paste flow works and is current happy path.
- PDF upload UI exists but extraction is known weak point.
- Do not copy Dealls branding, assets, testimonials, or exact wording.
- Keep deployment cheap/free: use `gemini-2.5-flash-lite` unless quality forces upgrade.
- Keep project-scoped root inside `C:\Users\alber\Downloads\Ngoding\HireFit`.
