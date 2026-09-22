@AGENTS.md

# HireFit — Dokumentasi Lengkap

> Portfolio project by Gerald. AI-powered CV/JD fit reviewer menggunakan Gemini API + async queue.
> GitHub: https://github.com/GDA03 | LinkedIn: https://linkedin.com/in/gdustin/ | Portfolio: https://portofolio-gerald.vercel.app/

---

## 1. Tech Stack

| Layer | Package | Versi |
|---|---|---|
| Framework | `next` | 16.2.7 |
| Language | TypeScript | ^5 |
| Styling | `tailwindcss` | ^4 (via `@tailwindcss/postcss`) |
| AI — Gemini | `@google/generative-ai` | ^0.24.1 |
| AI — Fallback | OpenRouter API (HTTP fetch) | — |
| PDF Parsing | `pdfjs-dist` | ^6.0.227 |
| Async Queue | `@upstash/qstash` | ^2.11.0 |
| State Store | `@upstash/redis` | ^1.38.0 |
| Animation | `motion` (Framer Motion v12) | ^12.40.0 |
| Icons | `lucide-react` | ^1.17.0 |
| ID Generation | `uuid` | ^14.0.0 |
| Testing | `vitest` | ^4.1.8 |
| Fonts | Geist Sans + Geist Mono (Google Fonts via `next/font`) | — |

**Next.js config** (`next.config.ts`): Turbopack enabled, root set ke project dir.

---

## 2. Struktur Direktori Lengkap

```
HireFit/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── analyze/
│   │   │   │   └── route.ts          # POST /api/analyze — sync Gemini (legacy, tetap dipakai internal)
│   │   │   ├── cv-reviews/
│   │   │   │   ├── route.ts          # POST /api/cv-reviews — buat review baru (async)
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts      # GET /api/cv-reviews/[id] — ambil full state
│   │   │   │       ├── status/       # GET /api/cv-reviews/[id]/status — cek status saja
│   │   │   │       ├── translate/    # POST /api/cv-reviews/[id]/translate — terjemahkan hasil
│   │   │   │       └── retry/        # POST /api/cv-reviews/[id]/retry — ulangi review gagal
│   │   │   ├── extract-pdf/
│   │   │   │   └── route.ts          # POST /api/extract-pdf — server-side PDF extraction
│   │   │   └── process-review/
│   │   │       └── route.ts          # POST /api/process-review — QStash worker endpoint
│   │   ├── results/
│   │   │   └── [id]/
│   │   │       └── page.tsx          # Client page hasil review dengan polling + language toggle
│   │   ├── globals.css               # Global CSS, design tokens, animasi custom
│   │   ├── icon.svg                  # Favicon
│   │   ├── layout.tsx                # Root layout (Geist font, metadata SEO)
│   │   └── page.tsx                  # Landing page + CVReviewForm
│   ├── components/
│   │   ├── cv-review/
│   │   │   ├── index.ts              # Barrel exports semua komponen cv-review
│   │   │   ├── cv-review-form.tsx    # Form utama: PDF upload + fields + ATS pre-checks
│   │   │   ├── ats-checks-panel.tsx  # Panel display ATS deterministic checks
│   │   │   ├── result-view.tsx       # Layout komponen hasil review (orkestrasi semua sub-panel)
│   │   │   ├── score-circle.tsx      # SVG circular score gauge
│   │   │   ├── keyword-panel.tsx     # Panel keywords (job titles, skills, missing, dll)
│   │   │   ├── rewrite-card.tsx      # Card untuk contoh/rewrite bullets
│   │   │   ├── section-accordion.tsx # Accordion 10 section CV (collapsible)
│   │   │   ├── priority-plan.tsx     # 5-item priority action plan
│   │   │   └── result-actions.tsx    # Language toggle + share/copy link button
│   │   ├── dynamic-background.tsx    # Animated decorative background
│   │   └── site-brand.tsx            # Logo/brand link komponen
│   └── lib/
│       ├── env.ts                    # readEnv() helper — BOM-safe env reader
│       └── cv-review/
│           ├── types.ts              # Semua type definitions + constants
│           ├── ats-checks.ts         # Deterministic ATS check engine (client-side, sync)
│           ├── pdf-extraction.ts     # Client-side PDF extraction via pdfjs-dist
│           ├── model.ts              # Gemini + OpenRouter AI abstraction layer
│           ├── prompt.ts             # buildCVReviewPrompt() — structured Gemini prompt builder
│           ├── store.ts              # Redis read/write ReviewState (Upstash)
│           ├── translation.ts        # translateReviewResult() — translate hasil pakai AI
│           └── validation.ts         # validateAnalyzeRequest() + extractJsonObject() + scoreTone()
├── .env.example                      # Template env vars (hanya GEMINI_API_KEY + GEMINI_MODEL)
├── .env.local                        # Local secrets (JANGAN COMMIT)
├── next.config.ts
├── package.json
├── tsconfig.json
├── eslint.config.mjs
└── postcss.config.mjs
```

---

## 3. Alur Data Lengkap

### 3.1 Alur Submit CV (Happy Path)

```
User uploads PDF / pastes CV text
        │
        ▼
[Browser] extractTextFromPDF()           ← pdfjs-dist, client-side
  └─ hasil masuk ke CVReviewForm state
  └─ runATSChecks() jalan realtime (useMemo)
        │
        ▼
[Browser] handleReviewSubmit() di page.tsx
  └─ POST /api/cv-reviews { cvText, language, purpose, jobRole?, jobDescription?, scholarshipTitle? }
        │
        ▼
[Server] POST /api/cv-reviews/route.ts
  1. validateAnalyzeRequest()
  2. Generate id: `rv_${uuidv4()}`
  3. saveReviewState({ id, status: "queued", request, ... }) → Redis
  4. qstash.publishJSON({ url: /api/process-review, body: { reviewId } })
     (fallback: jika VERCEL_ENV === "preview", pakai after() Next.js)
  5. Return { id }
        │
        ▼
[Browser] router.push(`/results/${id}`)
        │
        ▼
[Browser] results/[id]/page.tsx
  └─ polling GET /api/cv-reviews/[id]/status setiap 3 detik
  └─ jika completed → GET /api/cv-reviews/[id] untuk full result
        │
        ▼
[QStash Worker] POST /api/process-review
  1. verifySignatureAppRouter (QStash HMAC)
  2. getReviewState(reviewId) dari Redis
  3. state.status = "processing" → simpan
  4. runGeminiAnalysis(state.request)
     └─ buildCVReviewPrompt() → generateJsonText() → extractJsonObject()
  5. state.status = "completed" / "failed" → simpan
  6. Return { success: true }
```

### 3.2 AI Provider Chain

```
generateJsonText()
  └─ readModelProviders() → baca AI_PROVIDER_ORDER (env, csv)
       default: ["gemini", "openrouter"]
       │
       ├─ "gemini"  → generateWithGemini()
       │   └─ readGeminiModels() → GEMINI_MODEL (csv)
       │       default: "gemini-2.5-flash-lite"
       │   └─ GoogleGenerativeAI.generateContent()
       │       dengan responseMimeType: "application/json"
       │   └─ extractJsonObject() untuk validasi
       │
       └─ "openrouter" → generateWithOpenRouter()
           └─ readOpenRouterModels() → OPENROUTER_MODELS (csv)
               default: "openrouter/free"
           └─ Coba dulu dengan json_mode (response_format: { type: "json_object" })
           └─ Fallback ke prompt-only JSON extraction
           └─ extractJsonObject() untuk validasi
```

### 3.3 PDF Extraction Flow

```
[Browser] User upload PDF
  └─ extractTextFromPDF(file)  — client-side, pdfjs-dist
      ├─ confidence: "good" → proceed
      ├─ confidence: "partial" → warning, suggest manual review
      └─ confidence: "poor" → error + tombol "Try server extraction"
                              └─ POST /api/extract-pdf (multipart/form-data)
                                  └─ extractServerPDF() via pdfjs-dist/legacy/build/pdf.mjs
                                      runtime: nodejs (bukan edge!)
```

### 3.4 Language Toggle + Translation

```
[Browser] ResultActions: user klik EN / ID
  └─ handleLanguageChange(nextLanguage)
      ├─ jika resultsByLanguage[nextLanguage] sudah ada → langsung switch (cache client)
      └─ jika belum → POST /api/cv-reviews/[id]/translate { language }
          └─ translateReviewResult(result, targetLanguage)
              └─ generateJsonText({ action: "translate", geminiModelEnv: "GEMINI_TRANSLATION_MODEL", ... })
              └─ Prompt: terjemahkan teks saja, jaga shape JSON, score, dan urutan tetap sama
          └─ simpan ke Redis (state.translations[language])
          └─ return { result: CVReviewResult }
```

---

## 4. Type Definitions Lengkap

```typescript
// src/lib/cv-review/types.ts

// Konstanta
LANGUAGES = [{ value: "en" }, { value: "id" }]
PURPOSES  = ["job_seeking", "job_scholarship", "internship", "fresh_graduate", "career_switch"]
MAX_CV_FILE_SIZE_BYTES = 5 * 1024 * 1024  // 5MB

// Request ke API
type AnalyzeRequest = {
  cvText: string;           // min 50 chars, max 60.000 chars
  language: "en" | "id";
  purpose: ReviewPurpose;
  jobRole?: string;
  jobDescription?: string;  // max 30.000 chars
  scholarshipTitle?: string;
}

// Satu section hasil review (10 section + 3 optional targeted sections)
type SectionResult = {
  score: number | null;     // 0-100 atau null jika tidak applicable
  analysis: string;
  whatWorks: string[];      // 2-4 items
  problemsFound: string[];  // 2-4 items
  actionPoints: string[];   // 3-5 items
  whyImportant: string;
  examples: string[];       // 1-3 items
  priority: "high" | "medium" | "low";
}

// Semua 10 section keys
SECTION_DEFINITIONS = [
  "overallImpression", "contactInformation", "relevantSkills",
  "professionalSummary", "workExperience", "achievements",
  "educationCertification", "organizationalActivity",
  "writingConsistency", "additionalSection"
]

// Keywords
type KeywordResult = {
  jobTitles: string[];
  skills: string[];
  careerPaths: string[];
  professionalSummaryKeywords: string[];
  additionalKeywords: string[];
  missingKeywords: string[];
}

// Career recommendation
type CareerRecommendationResult = {
  summary: string;
  recommendedRoles: string[];
  recommendedIndustries: string[];
  nextSteps: string[];
}

// Full review result dari AI
type CVReviewResult = {
  overallScore: number;           // 0-100
  summary: string;
  atsWarnings: string[];          // 3-6 items
  priorityPlan: string[];         // EXACTLY 5 items
  sections: Record<SectionKey, SectionResult>;  // 10 sections
  keywords: KeywordResult;
  careerRecommendation: CareerRecommendationResult;
  jobFit?: SectionResult;         // hanya jika ada jobRole/jobDescription
  tailoredContent?: SectionResult;
  experienceMatch?: SectionResult;
}

// State yang disimpan di Redis
type ReviewState = {
  id: string;               // format: rv_{uuid tanpa dash}
  status: "queued" | "processing" | "completed" | "failed";
  request: AnalyzeRequest;
  result?: CVReviewResult;
  translations?: Partial<Record<ReviewLanguage, CVReviewResult>>;
  error?: string;
  createdAt: number;        // Unix ms
  updatedAt: number;
}
// TTL Redis: 7 hari
// Redis key: `cv-review:${id}`
```

---

## 5. Environment Variables

### Wajib (Minimal)
```env
GEMINI_API_KEY=                   # Google AI Studio API key
```

### Opsional — AI Config
```env
GEMINI_MODEL=gemini-2.5-flash-lite        # Default Gemini model (csv untuk multiple)
GEMINI_TRANSLATION_MODEL=                 # Model khusus translate (fallback ke GEMINI_MODEL)
GROQ_API_KEY=                             # Groq fallback untuk CV analysis
GROQ_MODELS=openai/gpt-oss-120b,groq/compound,qwen/qwen3.8-27b  # Model Groq aktif (csv, diuji berurutan)
OPENROUTER_API_KEY=                       # OpenRouter fallback terakhir
OPENROUTER_MODELS=openrouter/free         # Model OpenRouter (csv, diuji berurutan)
OPENROUTER_TRANSLATION_MODELS=            # Model translate OpenRouter (fallback ke OPENROUTER_MODELS)
AI_PROVIDER_ORDER=gemini,groq,openrouter  # Urutan provider analisis (csv)
AI_TRANSLATION_PROVIDER_ORDER=             # Urutan provider translate; fallback ke Gemini, OpenRouter
GEMINI_TIMEOUT_MS=15000                   # Timeout Gemini dalam ms (default 15000)
GROQ_TIMEOUT_MS=15000                     # Timeout Groq dalam ms (default 15000)
OPENROUTER_TIMEOUT_MS=15000               # Timeout OpenRouter dalam ms (default 15000)
OPENROUTER_MAX_TOKENS=16000               # Max tokens OpenRouter/Groq (default 16000)
NEXT_PUBLIC_APP_URL=                      # URL app (untuk HTTP-Referer OpenRouter + QStash URL)
```

### Opsional — Async Queue (Production)
```env
QSTASH_TOKEN=                             # Upstash QStash token
QSTASH_URL=                               # Custom QStash URL (opsional)
QSTASH_CURRENT_SIGNING_KEY=              # Verifikasi signature QStash
QSTASH_NEXT_SIGNING_KEY=                 # Rotasi signing key QStash
```

### Opsional — Redis Storage
```env
UPSTASH_REDIS_REST_URL=                   # Upstash Redis URL
UPSTASH_REDIS_REST_TOKEN=                 # Upstash Redis token
# Alternatif (Vercel KV):
KV_REST_API_URL=
KV_REST_API_TOKEN=
```

> ⚠️ **JANGAN PERNAH COMMIT** `.env.local`, `.env.production.local`, atau file env manapun yang mengandung secrets.

---

## 6. API Routes Detail

### `POST /api/cv-reviews`
Buat review baru. Return langsung dengan `id`, lalu proses async via QStash.

**Request body:**
```json
{
  "cvText": "string (min 50, max 60000 chars)",
  "language": "en" | "id",
  "purpose": "job_seeking" | "job_scholarship" | "internship" | "fresh_graduate" | "career_switch",
  "jobRole": "string (optional)",
  "jobDescription": "string (optional, max 30000 chars)",
  "scholarshipTitle": "string (optional)"
}
```
**Response 200:** `{ "id": "rv_..." }`
**Response 400:** `{ "error": "validation message" }`
**Response 502:** `{ "error": "CV analysis is temporarily unavailable..." }`

---

### `GET /api/cv-reviews/[id]`
Ambil full state review (termasuk result dan translations).

**Response 200:** `ReviewState` object penuh
**Response 404:** `{ "error": "Review not found" }`

---

### `GET /api/cv-reviews/[id]/status`
Polling endpoint — hanya return status, tidak return full result (efisien).

---

### `POST /api/cv-reviews/[id]/translate`
Terjemahkan hasil ke bahasa lain. Cache hasil di Redis.

**Request:** `{ "language": "en" | "id" }`
**Response:** `{ "result": CVReviewResult }`

---

### `POST /api/cv-reviews/[id]/retry`
Ulangi review yang gagal. Reset status ke "queued" dan trigger ulang QStash.

---

### `POST /api/extract-pdf`
Server-side PDF extraction. Runtime: **nodejs** (bukan Edge). Terima `multipart/form-data` dengan field `file`.

**Response:** `PDFExtractionResult` atau `{ "error": "..." }`

---

### `POST /api/process-review`
QStash worker endpoint. Verifikasi HMAC signature dari QStash sebelum proses.
- `maxDuration = 180` detik (3 menit Vercel timeout)
- Jika signing keys tidak ada di development → bypass verifikasi
- Jika signing keys tidak ada di production → return 500

---

### `POST /api/analyze` (legacy)
Synchronous direct-to-Gemini endpoint. Masih dipakai internal oleh `cv-reviews/route.ts`.
- `maxDuration = 120` detik

---

## 7. Komponen UI Detail

### `CVReviewForm` — `src/components/cv-review/cv-review-form.tsx`
Form utama di landing page. State local:
- `request: AnalyzeRequest` — semua input fields
- `currentFile: File | null` — PDF yang diupload
- `extraction: PDFExtractionResult | null` — hasil ekstraksi
- `extracting / serverExtracting` — loading states

**Fitur:**
- PDF upload dengan validasi tipe + ukuran (max 5MB)
- Client-side extraction → jika `confidence === "poor"`, tampil tombol "Try server extraction"
- `atsChecks` dihitung realtime via `useMemo` → ditampilkan di `ATSChecksPanel`
- Locale prop (`id`/`en`) mengontrol semua label form
- Button submit disabled jika `cvText.trim().length < 50`

### `ATSChecksPanel` — `src/components/cv-review/ats-checks-panel.tsx`
Display hasil `runATSChecks()`. Severity → warna badge:
- `critical` → merah
- `warning` → violet
- `info` → teal
- Jika 0 checks → tampil pesan sukses hijau

### `ResultView` — `src/components/cv-review/result-view.tsx`
Orkestrasi semua panel hasil review:
1. `ScoreCircle` (overall score)
2. Summary + ATS Warnings
3. `PriorityPlan` (5 action items)
4. `SectionAccordion` (10 sections collapsible)
5. `KeywordPanel` (keywords breakdown)
6. Career Recommendations (roles, industries, next steps)
7. Optional sections: `jobFit`, `tailoredContent`, `experienceMatch` (muncul hanya jika ada target role/JD)

### `ScoreCircle` — `src/components/cv-review/score-circle.tsx`
SVG circular gauge. Color coding:
- ≥80 → cyan (`#0891b2`)
- ≥60 → indigo (`#635BFF`)
- ≥40 → amber
- <40 → pink

### `ResultActions` — `src/components/cv-review/result-actions.tsx`
- Language toggle EN/ID (memanggil `onLanguageChange`)
- Share/copy link (pakai `navigator.share` jika tersedia, fallback ke clipboard)
- Back home link

### `DynamicBackground` — `src/components/dynamic-background.tsx`
Decorative animated background blobs.

### `BrandLink` / `SiteBrand` — `src/components/site-brand.tsx`
Logo dan brand name sebagai `<Link href="/">`.

---

## 8. Library Modules Detail

### `src/lib/env.ts` — `readEnv(name)`
Helper untuk baca env var dengan BOM stripping. Ini adalah fix untuk bug ByteString.
```typescript
const BOM_PATTERN = /﻿/g;  // U+FEFF
export function readEnv(name: string) {
  const value = process.env[name];
  return value ? value.replace(BOM_PATTERN, "").trim() : undefined;
}
```
**PENTING:** Selalu gunakan `readEnv()` untuk membaca env vars, JANGAN `process.env.VAR` langsung.

---

### `src/lib/cv-review/ats-checks.ts` — `runATSChecks(input)`
Deterministic ATS checks yang berjalan client-side (sync, no API). Cek:
1. **CV terlalu pendek** → critical (< 50 chars)
2. **CV text mungkin tidak lengkap** → warning (< 500 chars)
3. **Poor parse confidence** → critical
4. **Email tidak ditemukan** → critical (regex: `EMAIL_RE`)
5. **Nomor telepon tidak ada** → warning (regex: `PHONE_RE`)
6. **Tidak ada professional link** → info (LinkedIn/GitHub/portfolio)
7. **Section headings tidak lengkap** → warning (jika ≥3 dari: experience, education, skills, projects, summary tidak ada)
8. **Nama file kurang profesional** → info (deteksi: final/copy/scan/untitled)
9. **Keyword JD yang hilang di CV** → warning (max 12 keywords ditampilkan)

Sorted by severity: critical → warning → info.

---

### `src/lib/cv-review/pdf-extraction.ts` — `extractTextFromPDF(file)`
Client-side extraction via dynamic import `pdfjs-dist`. Returns `PDFExtractionResult`:
```typescript
{
  text: string;
  pageCount: number;
  characterCount: number;
  confidence: "good" | "partial" | "poor";
  warnings: string[];
  preview: string;  // first 600 chars
  source: "client" | "server";
}
```
**Confidence rubric:**
- `good`: characterCount ≥ 500 AND averageCharsPerPage ≥ 100
- `partial`: characterCount ≥ 50
- `poor`: kurang dari itu

---

### `src/lib/cv-review/model.ts` — `generateJsonText(options)`
AI abstraction layer. Provider chain dengan timeout dan fallback:
- Default Gemini model: `gemini-2.5-flash-lite`
- Default timeout: 15000ms per provider
- `extractJsonObject()` dipanggil untuk validasi JSON output sebelum return

---

### `src/lib/cv-review/prompt.ts` — `buildCVReviewPrompt(request)`
Builder untuk Gemini prompt. Kontrol kondisional:
- Jika ada `jobRole` atau `jobDescription` → include `jobFit`, `tailoredContent`, `experienceMatch` sections
- Jika tidak → explicit instruction untuk tidak include sections tersebut
- Output language dikontrol dari `request.language`
- Score rubric: 90-100 excellent, 75-89 good, 60-74 passable, 40-59 weak, 0-39 critical

---

### `src/lib/cv-review/store.ts` — Redis Store
```typescript
saveReviewState(state: ReviewState): Promise<void>
getReviewState(id: string): Promise<ReviewState | null>
```
Key: `cv-review:${id}`. TTL: 7 hari (604800 detik). Mendukung env alias `KV_REST_API_URL`/`KV_REST_API_TOKEN` untuk Vercel KV.

---

### `src/lib/cv-review/validation.ts`
- `validateAnalyzeRequest(input)` — validasi dan sanitize request body
- `extractJsonObject(text)` — parser JSON yang robust, handle response dengan prefix/suffix text, tracking depth + string escapes
- `scoreTone(score)` → "excellent" | "good" | "warning" | "danger" | "neutral"

---

### `src/lib/cv-review/translation.ts` — `translateReviewResult(result, targetLanguage)`
Terjemahkan `CVReviewResult` ke bahasa lain tanpa review ulang CV. Menggunakan env vars terpisah (`GEMINI_TRANSLATION_MODEL`, `OPENROUTER_TRANSLATION_MODELS`, `AI_TRANSLATION_PROVIDER_ORDER`) agar bisa pakai model lebih ringan untuk translate.

---

## 9. Design System & CSS

File: `src/app/globals.css`

### Color Palette
| Nama | Hex | Digunakan untuk |
|---|---|---|
| Brand primary | `#635BFF` | Buttons, links, highlights |
| Brand secondary | `#14B8A6` | Teal accents, success states |
| Dark navy | `#17152F` | Text utama, dark card header |
| Background | `#f8f7ff` | Page background (off-white ungu tipis) |
| Light purple | `#F2F0FF` | Card backgrounds, input areas |

### CSS Classes Custom
| Class | Efek |
|---|---|
| `.app-card` | Border tipis indigo + box shadow elegan |
| `.app-card-pressed` | Seperti app-card + shadow bawah (efek tombol) |
| `.app-button` | Shadow bawah `7px #4f46e5`, aktif: turun 4px |
| `.animate-happy-pop` | Muncul dari bawah + scale (420ms spring) |
| `.animate-soft-float` | Float naik-turun halus (3.2s infinite) |
| `.animate-bar-breathe` | Breathing progress bar (1.5s infinite) |
| `.animate-result-pulse` | Pulse halus (4.8s infinite) |
| `.result-motion-card` | Muncul dari bawah + blur dissolve (520ms) |
| `.scan-card::after` | Scan line overlay animation (2s infinite) |

### Responsive
- Mobile-first
- Breakpoint utama: `md:` (768px) dan `lg:` (1024px)
- Grid utama landing: `lg:grid-cols-[0.95fr_1.05fr]` (sticky left panel + form kanan)

### Accessibility
- `prefers-reduced-motion`: semua animasi di-disable
- `aria-label` pada ScoreCircle, `aria-pressed` pada language button, `role="alert"` pada error
- `.sr-only` untuk screen reader text

---

## 10. Alur Review Waiting UI

Di `results/[id]/page.tsx`, ada 2 komponen waiting:

**`ReviewWaiting`** — ditampilkan saat status queued/processing:
```
Step 1: "Queued safely"         — file diterima, masuk antrean
Step 2: "Reading CV structure"  — cek section, formatting, ATS signals
Step 3: "Matching role context" — keyword gap, role relevance
Step 4: "Building action plan"  — susun score, warning, prioritas
```
Progress bar lebar = `(activeStep + 1) / 4 * 100%`. Polling setiap 3 detik.

**`TranslationWaiting`** — saat toggle bahasa:
```
Step 1: "Preparing translation"
Step 2: "Translating review content"
Step 3: "Saving cached result"
```

**Retry logic:** Jika status `failed` → tombol retry → `POST /api/cv-reviews/[id]/retry` → reset state + trigger QStash ulang → `retryCount` increment → `useEffect` re-run polling.

---

## 11. Deployment

Didesain untuk **Vercel**:
- `VERCEL_ENV === "preview"` → gunakan `after()` Next.js (bukan QStash) untuk background job
- Production → QStash untuk async processing (QStash memanggil `/api/process-review` dengan signed request)
- `/api/extract-pdf` eksplisit `runtime = "nodejs"` karena pdfjs-dist tidak kompatibel dengan Edge Runtime
- `/api/process-review` `maxDuration = 180` (3 menit) untuk handle Gemini yang lambat
- Redis (Upstash) untuk state storage; mendukung Vercel KV env aliases

---

## 12. Known Bugs & Issues

### Bug Aktif: ByteString BOM Error (SUDAH DIFIX di `env.ts`)
**Error:** `Cannot convert argument to a ByteString because the character at index 7 has a value of 65279`

- Character `65279` = `U+FEFF` (UTF-16 BOM / `﻿`)
- **Status:** Sudah difix di `src/lib/env.ts` dengan `readEnv()` yang strip BOM
- **Root cause:** `.env.local` yang disave dengan BOM encoding (Windows)
- **Jika muncul lagi:** Pastikan semua baca env var pakai `readEnv()`, bukan `process.env.VAR` langsung

### Keterbatasan Lain
- PDF image-based / scan-only tidak bisa diekstrak tanpa OCR
- Tidak ada auth / history (by design — MVP)
- Output kualitas bergantung Gemini response
- Tidak ada rate limiting (belum diimplementasi)
- Tidak ada export to PDF

---

## 13. Development Commands

```bash
npm run dev    # Dev server → http://localhost:3000 (Turbopack)
npm run lint   # ESLint check
npm run build  # Production build
npm run test   # Vitest unit tests
```

---

## 14. Coding Rules & Conventions

1. **SELALU** gunakan `readEnv()` dari `src/lib/env.ts` untuk membaca env vars server-side
2. **JANGAN** commit `.env.local`, `.env.production.local`, atau file yang berisi secrets
3. **JANGAN** fabrikasi pengalaman, skill, metrik, employer, atau credential dalam prompt/output AI
4. Jika Gemini return invalid JSON → cek server log, tighten prompt di `prompt.ts`, atau perbaiki `extractJsonObject()` di `validation.ts`
5. Semua input CV text harus di-trim sebelum dikirim ke API
6. Gunakan `i18n` pattern (`copy` object dengan key `en`/`id`) untuk semua user-facing string
7. Preferensi: client component hanya di komponen yang benar-benar butuh interaktivitas; gunakan `"use client"` seminimal mungkin
8. Next.js 16 App Router — semua route handler di `/app/api/*/route.ts`
9. `params` di route handler dan page component adalah `Promise<...>` — harus di-`await` atau pakai `use()`

---

## 15. Roadmap

**Prioritas tinggi (immediate):**
1. Rate limiting pada API endpoints
2. OCR untuk scanned/image-only PDFs

**Menengah:**
3. Export hasil review ke PDF
4. Saved analysis history (butuh auth)
5. Role-specific templates (frontend, backend, data, PM, dll)

**Jangka panjang:**
6. Indonesian/English output toggle dari user preference (sudah ada infrastruktur translate)
7. User auth + dashboard history
8. Streaming ATS results piece-by-piece untuk faster perceived load
9. Enhanced ATS rules: semantic analysis bukan hanya keyword matching
10. Caching extracted text per PDF hash
