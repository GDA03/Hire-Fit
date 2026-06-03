# HireFit PRD

## Summary
HireFit adalah lightweight fullstack AI CV/JD fit reviewer. User upload PDF CV atau memasukkan CV text dan Job Description, lalu aplikasi memakai Gemini API untuk menghasilkan analisis kecocokan kandidat.

## Goals
- Membantu kandidat memahami fit CV terhadap JD.
- Memberi rewrite suggestion yang jujur, tidak mengarang pengalaman.
- Memberi interview prep dan 7-day prep plan.
- Tetap ringan: no database untuk MVP.

## Target User
- Job seeker entry-level sampai mid-level.
- Developer/student yang ingin review CV cepat.
- Career switcher yang ingin tahu gap skill.

## MVP Features
1. Upload PDF CV dengan browser-side text extraction.
2. Input/edit CV text manual.
3. Input Job Description text.
4. Submit ke API internal `/api/analyze`.
4. API memanggil Gemini.
5. Output JSON terstruktur:
   - match score 0-100
   - summary
   - strengths
   - missing keywords
   - weak CV bullets
   - rewritten bullet suggestions
   - interview prep questions
   - 7-day prep plan

## Non-Goals MVP
- User auth.
- Database/history.
- Payment.
- Multi-language optimization.

## Tech Stack
- Next.js App Router
- TypeScript
- Tailwind CSS
- Gemini API via `@google/generative-ai`
- PDF extraction via `pdfjs-dist`
- No DB

## Environment Variables
- `GEMINI_API_KEY`: API key dari Google AI Studio.
- `GEMINI_MODEL`: optional, default `gemini-1.5-flash`.

## API Contract
### POST `/api/analyze`
Request:
```json
{
  "cvText": "string, min 50 chars",
  "jobDescription": "string, min 50 chars"
}
```

Success response:
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

Error response:
```json
{ "error": "string" }
```

## Prompt Rules
- Act as expert technical recruiter and ATS resume reviewer.
- Never fabricate experience, skills, metrics, employers, or credentials.
- Suggest honest rewrites only from provided CV content.
- Return valid JSON only.

## Acceptance Criteria
- App runs with `npm run dev`.
- `npm run lint` passes.
- `.env.example` exists with Gemini env vars.
- `prd.md` and `README.md` document handoff.
- API key never committed.
- MVP works with PDF CV upload or pasted CV text plus pasted JD text.

## Roadmap
1. PDF/text file upload.
2. Saved analysis history.
3. Role templates: frontend, backend, data, PM.
4. Indonesian/English output toggle.
5. Export report to PDF.
