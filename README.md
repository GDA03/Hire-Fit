# HireFit

Lightweight fullstack AI CV/JD fit reviewer pakai Gemini API.

## Features
- Upload CV PDF with browser-side text extraction.
- Paste/edit CV text manually.
- Paste Job Description.
- Gemini analysis via `/api/analyze`.
- Output match score, strengths, missing keywords, weak bullets, rewritten bullets, interview questions, dan 7-day prep plan.

## Stack
- Next.js App Router
- TypeScript
- Tailwind CSS
- `@google/generative-ai`
- `pdfjs-dist`
- No database untuk MVP

## Setup
```bash
npm install
copy .env.example .env.local
npm run dev
```

Isi `.env.local`:
```env
GEMINI_API_KEY=your_google_ai_studio_api_key_here
GEMINI_MODEL=gemini-1.5-flash
```

Buka:
```text
http://localhost:3000
```

## Verification
```bash
npm run lint
npm run build
```

## API Contract
### POST `/api/analyze`
Request:
```json
{
  "cvText": "CV text at least 50 characters",
  "jobDescription": "Job description at least 50 characters"
}
```

Response:
```json
{
  "matchScore": 78,
  "summary": "string",
  "strengths": ["string"],
  "missingKeywords": ["string"],
  "weakBullets": [
    { "original": "string", "issue": "string", "rewrite": "string" }
  ],
  "interviewQuestions": [
    { "question": "string", "whyItMatters": "string" }
  ],
  "prepPlan7Days": [
    { "day": 1, "focus": "string", "tasks": ["string"] }
  ]
}
```

## Handoff Notes
- PRD ada di `prd.md`.
- Main UI ada di `src/app/page.tsx`.
- Gemini API route ada di `src/app/api/analyze/route.ts`.
- PDF parsing berjalan client-side via `pdfjs-dist`; hasil ekstraksi masuk ke CV Text dan bisa diedit.
- Jangan commit `.env.local` atau API key.
- Kalau Gemini output invalid JSON, cek server log dan tighten prompt/parser.

## Known Limitations
- PDF hasil scan/image-only belum bisa diekstrak tanpa OCR.
- Belum ada auth/history.
- Output bergantung Gemini response quality.
- No rate limiting.

## Roadmap
1. OCR untuk scanned PDF.
2. Report export to PDF.
3. Saved history.
4. Role-specific templates.
5. Indonesian/English output toggle.
