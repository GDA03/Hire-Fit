# Repository Guidelines

## Project Overview

HireFit is a Next.js App Router application that reviews CVs against a target role or job description. Users paste CV text or upload a PDF, receive deterministic ATS checks, then get structured AI feedback, keyword gaps, career recommendations, and an actionable plan. Gemini is the primary model provider; OpenRouter is an optional fallback.

## Architecture & Data Flow

- `src/app/page.tsx` is the client landing page. `CVReviewForm` extracts PDF text in the browser, runs ATS checks, then submits `AnalyzeRequest` to `POST /api/cv-reviews` and navigates to `/results/{id}`.
- `POST /api/cv-reviews` validates input, stores a queued `ReviewState` in Upstash Redis, and publishes a QStash job to `/api/process-review`. Vercel preview can use `after()` as a fallback.
- `/api/process-review` verifies QStash signatures in production, runs `runGeminiAnalysis`, and persists `queued → processing → completed|failed` state. Redis records expire after seven days.
- `src/app/results/[id]/page.tsx` polls `/status` every three seconds, loads the full result when complete, supports retry, and requests/caches alternate-language translations.
- `src/lib/cv-review/` owns domain types, request/model-output validation, prompts, AI provider fallback, Redis persistence, PDF extraction, ATS checks, and translation. Keep business logic here rather than in route or presentation components.
- `src/app/api/analyze/route.ts` remains a synchronous/legacy endpoint and exports `runGeminiAnalysis` for the worker; the main UI uses the async review flow.
- PDF browser extraction uses `pdfjs-dist`; `/api/extract-pdf` is the server fallback and must stay on the Node.js runtime because the legacy PDF.js build is not Edge-compatible.

## Key Directories

- `src/app/`: layouts, landing/results pages, and route handlers.
- `src/components/cv-review/`: form, ATS panel, result composition, score, sections, keywords, actions, and priority-plan UI.
- `src/lib/cv-review/`: review domain and integrations; `types.ts` is the contract for request/state/result shapes.
- `public/`: static logos and assets. `public/hirefit-logo-showcase.html` is exploratory, not application logic.
- `docs/`: historical plans, specs, handoffs, and competitor research; confirm current source before following them.

## Development Commands

Use npm with the committed `package-lock.json`:

```bash
npm install
npm run dev       # next dev
npm run build     # next build
npm run start     # next start
npm run lint      # eslint
npm run test      # vitest run
```

For local setup, copy `.env.example` to `.env.local`, add credentials, then open `http://localhost:3000`. Do not commit any `.env*` file or secret.

## Code Conventions & Common Patterns

- Strict TypeScript. Use the `@/*` alias for imports from `src/*`; prefer explicit domain types from `src/lib/cv-review/types.ts`.
- Use functional React components and hooks. Mark browser-interactive modules with `"use client"`; keep layouts and server route handlers server-side unless browser APIs or client state require otherwise.
- Use Tailwind utility classes and existing global classes/design tokens in `src/app/globals.css`. Match the existing purple/teal palette, rounded-card visual language, and reduced-motion behavior.
- Validate and normalize external input with `validateAnalyzeRequest` or the relevant domain validator before persistence or model calls. Preserve limits: CV 50–60,000 characters, job description at most 30,000 characters, PDF at most 5 MB.
- Route handlers return `NextResponse.json` with 400 for validation, 404 for missing reviews, 409 for invalid review state, and 502 for provider failures where existing routes use those mappings. Log internal errors, return public-safe model messages.
- Read environment variables through `readEnv` in `src/lib/env.ts`; it trims values and removes BOM characters, preventing Windows-copied secrets from breaking `Headers` or `URL`.
- AI output is requested as JSON and passed through `extractJsonObject`; preserve result shape, scores, and ordering during translation. Do not fabricate CV experience, skills, metrics, employers, or credentials.
- Keep async state transitions explicit and persist each transition. Avoid moving Redis/QStash/model calls into client components.

## Important Files

- `src/app/layout.tsx`: root metadata, Geist fonts, global CSS, and document shell.
- `src/app/page.tsx`: landing page and review submission state.
- `src/app/results/[id]/page.tsx`: polling, retry, translation, and result rendering.
- `src/app/api/cv-reviews/route.ts`: review creation and job dispatch.
- `src/app/api/process-review/route.ts`: signed background worker.
- `src/lib/cv-review/types.ts`: request, status, result, section, language, and size-limit contracts.
- `src/lib/cv-review/validation.ts`: request and model JSON validation.
- `src/lib/cv-review/model.ts`: Gemini/OpenRouter provider order, model selection, timeout, and public errors.
- `src/lib/cv-review/store.ts`: Redis state persistence and seven-day TTL.
- `src/components/cv-review/cv-review-form.tsx`: PDF/manual input and ATS pre-check flow.
- `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`: framework, TypeScript, lint, and Tailwind/PostCSS configuration.

## Runtime/Tooling Preferences

- Next.js `16.2.7`, React `19.2.4`, TypeScript `5`, Tailwind CSS `4`, and Vitest `4.1.8` are pinned by the lockfile ranges.
- Use Node.js `>=20.9.0`; Node 24 matches the Vercel project configuration. No Bun, pnpm, or yarn lockfile is present.
- `next.config.ts` scopes Turbopack to the project root. Do not add Edge runtime to PDF extraction routes.
- Required baseline env: `GEMINI_API_KEY`, `GEMINI_MODEL`. Analysis provider order defaults to `Gemini → Groq → OpenRouter`; set `GROQ_API_KEY`, `GROQ_MODELS`, and `AI_PROVIDER_ORDER` to configure it. Async production flow also needs QStash and Redis variables. Optional translation/provider settings include `OPENROUTER_API_KEY`, provider/model lists, timeouts, `NEXT_PUBLIC_APP_URL`, QStash signing keys, and Upstash/KV aliases; see source `readEnv(...)` calls before adding variables.

## Testing & QA

- Automated coverage is minimal: `src/lib/env.test.ts` is the only test file and covers BOM stripping, trimming, missing values, and `Headers`/`URL` compatibility. Run it with `npm run test` or `npx vitest run src/lib/env.test.ts`.
- There is no Vitest config, coverage threshold, integration suite, browser suite, fixture set, or dedicated typecheck script. `npm run lint` and `npm run build` are project-wide checks.
- For UI/API changes, manually exercise PDF upload, invalid PDF/file handling, poor-parse server fallback, pasted CV submission, ATS updates, optional job-description fields, result polling, failure/retry, language translation, and long model output.
- Treat `README.md`, `prd.md`, `HANDOFF.md`, and older `docs/superpowers/` plans as historical where they conflict with `src/`. In particular, their old synchronous `/api/analyze` contract, Gemini 1.5 model, and “no database” claims do not describe the current async Redis/QStash flow.

## Next.js Agent Rule

This project uses a Next.js version with breaking changes. Before changing Next.js APIs or conventions, read the relevant guide in `node_modules/next/dist/docs/` and follow its deprecation notices.
