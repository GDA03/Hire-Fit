# HireFit AI CV Reviewer Design

Date: 2026-06-03

## Goal

Implement Dealls-like AI CV Reviewer features in HireFit without copying Dealls branding, assets, or exact copy. Auth and payment are out of scope for this implementation cycle. The first build should be free-deploy friendly and prioritize efficient code, visible product value, and a clean path to later async/history/payment work.

## Current Project Context

HireFit is a small Next.js 16 App Router app. Current functionality is a single client page with browser-side PDF extraction and a `/api/analyze` route that calls Gemini for CV/JD fit output. There is no persistence, no auth, no payment, and no Taskmaster task files. This design builds on that existing direct analyzer instead of replacing it with full infrastructure immediately.

## Chosen Approach

Use Option A: frontend-first vertical slices.

1. Upgrade the visible product first: form, rich result UI, and 12-section analysis.
2. Upgrade the analyzer API contract to strict JSON for the new UI.
3. Add UX states and differentiators.
4. Later convert direct analysis into review IDs, polling, and retry when the product value is proven.

This approach fits the current codebase, gives fast visible progress, and avoids backend code that is not needed before auth/payment/persistence.

## Model Choice

Default model: `gemini-2.5-flash-lite`.

Reasons:

- Supports structured JSON output.
- Best fit for free or very low-cost deployment.
- Good enough for CV review text analysis.
- Lower latency and cost than Pro models.
- Better default than the current `gemini-1.5-flash` fallback.

Fallback order:

1. `gemini-2.5-flash-lite` for default free/cheap operation.
2. `gemini-2.5-flash` if quality is too weak.
3. `gemini-3.5-flash` later if quota, availability, and quality justify it.
4. Avoid Pro models for the free deployment path.

Environment variables:

- `GEMINI_API_KEY`
- `GEMINI_MODEL=gemini-2.5-flash-lite`
- Optional later: `NEXT_PUBLIC_APP_URL`

## Phase Classification

### Frontend Phases

#### FE-1: Landing and Review Form

- Add navigation, hero, HireFit positioning, social proof placeholder, and embedded form.
- Support PDF upload with 5MB validation.
- Keep manual CV text fallback.
- Add language selector: English and Bahasa Indonesia.
- Add purpose selector: job seeking, scholarship, internship, fresh graduate, career switch.
- Add optional targeting fields: target job role, job description, scholarship title.
- Avoid Dealls copy, names, handles, visual assets, and pixel-perfect layout.

#### FE-2: Results UI

- Add overall ATS score with circular/progress-style visual.
- Add score color tiers.
- Add 12-section accordion UI.
- Each normal section shows score, analysis, what works, problems found, action points, why important, and example rewrites.
- Keywords use grouped lists.
- Career recommendation uses summary, recommended roles, industries, and next steps.
- Optional job-targeting sections appear when target role or JD is provided.

#### FE-3: UX States

- Show extraction, analyzing, and disabled submit states.
- Show empty/demo preview before upload.
- Show clear errors for file type, size, extraction failure, validation failure, model/API failure, and invalid JSON response.
- Show poor parse warning when extracted CV text is too short.
- Add retry CTA that re-submits current form values.

#### FE-4: Differentiator UI

- Add ATS parse preview from extracted text.
- Add missing keyword heatmap/list when job description is provided.
- Add before -> after rewrite cards with copy buttons.
- Add "Fix these 5 first" priority plan.
- Add FAQ, testimonial, and education sections using original HireFit copy.

### Backend Phases

#### BE-1: Strict Analyzer API

- Upgrade `/api/analyze` to accept the expanded request shape.
- Validate CV text, language, purpose, optional job role, optional job description, and optional scholarship title.
- Use a strict response schema concept for `CVReviewResult`.
- Prompt Gemini to return valid JSON only.
- Parse JSON safely and return user-facing errors when parsing fails.
- Keep no auth, no payment, and no storage.

#### BE-2: Review Resource API

Later, convert direct analysis into a review resource flow:

- `POST /api/cv-reviews`
- `GET /api/cv-reviews/:id`
- `GET /api/cv-reviews/:id/status`
- `PATCH /api/cv-reviews/:id/retry`
- `GET /api/cv-reviews/config`

Start with in-memory or file-backed development storage only when this phase begins. Supported statuses: `queued`, `processing`, `completed`, `failed`.

#### BE-3: Server Extraction and ATS Checks

Later, add server-side extraction and compatibility checks:

- Upload endpoint or server extraction endpoint.
- PDF support first; DOC/DOCX later if dependency size and deployment limits are acceptable.
- Parse confidence.
- ATS checks for headings, layout risk, icons/image text risk, weird symbols, filename professionalism, and missing contact fields.

#### BE-4: Future Monetization Hooks Disabled

- Add config shape for free and paid sections later, but keep all sections unlocked for this cycle.
- Do not add payment endpoint in this cycle.
- Do not add active lock UI in this cycle.

### Deployment Phases

#### DEP-1: Local Validation

- Run `rtk npm run lint`.
- Run `rtk npm run build`.
- Run the app locally and manually verify the upload/analyze/result flow.

#### DEP-2: Environment Setup

- Update `.env.example` with `GEMINI_API_KEY` and `GEMINI_MODEL`.
- Use `GEMINI_MODEL=gemini-2.5-flash-lite` by default.

#### DEP-3: Vercel Deployment

- Install Vercel CLI if needed with `npm i -g vercel`.
- Set environment variables with Vercel env management.
- Deploy preview first.
- Check build logs and runtime logs.
- Promote to production after validation.

#### DEP-4: Observability and Limits

- Add basic server logs for request validation, model errors, and parse failures.
- Add request size guard.
- Add timeout/error handling around the model call.
- Add rate-limit placeholder for future persistence-backed limits.

## Phase 1 Request Shape

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

## Phase 1 Result Shape

```ts
type CVReviewResult = {
  overallScore: number;
  summary: string;
  atsWarnings: string[];
  priorityPlan: string[];
  sections: {
    overallImpression: SectionResult;
    contactInformation: SectionResult;
    relevantSkills: SectionResult;
    professionalSummary: SectionResult;
    workExperience: SectionResult;
    achievements: SectionResult;
    educationCertification: SectionResult;
    organizationalActivity: SectionResult;
    writingConsistency: SectionResult;
    additionalSection: SectionResult;
  };
  keywords: KeywordResult;
  careerRecommendation: CareerRecommendationResult;
  jobFit?: SectionResult;
  tailoredContent?: SectionResult;
  experienceMatch?: SectionResult;
};

type SectionResult = {
  score: number | null;
  analysis: string;
  whatWorks: string[];
  problemsFound: string[];
  actionPoints: string[];
  whyImportant: string;
  examples: string[];
  priority: "high" | "medium" | "low";
};

type KeywordResult = {
  jobTitles: string[];
  skills: string[];
  careerPaths: string[];
  professionalSummaryKeywords: string[];
  additionalKeywords: string[];
  missingKeywords: string[];
};

type CareerRecommendationResult = {
  summary: string;
  recommendedRoles: string[];
  recommendedIndustries: string[];
  nextSteps: string[];
};
```

## Component Boundaries

Add focused components instead of growing `page.tsx` indefinitely:

- `CVReviewForm` handles form fields, PDF upload state, and submit.
- `ScoreCircle` renders overall score.
- `SectionAccordion` renders normal section results.
- `KeywordPanel` renders keyword groups and missing keywords.
- `RewriteCard` renders before/after examples and copy buttons.
- `PriorityPlan` renders top actions.
- Shared types live in `src/lib/cv-review/types.ts`.
- Prompt/schema/rubric helpers live in `src/lib/cv-review/`.

## Data Flow

1. User uploads PDF or pastes CV text.
2. Browser extracts PDF text and shows parse status.
3. User selects language and purpose.
4. User optionally adds target role, JD, or scholarship title.
5. Client posts the request to `/api/analyze`.
6. Server validates input and calls Gemini.
7. Server parses strict JSON and returns `CVReviewResult`.
8. Client renders overall score, priority plan, warnings, accordions, keywords, career recommendations, and optional job-targeting sections.

## Error Handling

- Invalid file type: show local validation error.
- File above 5MB: show local validation error.
- Extracted text too short: show poor parse warning and ask user to paste text manually.
- Missing `GEMINI_API_KEY`: return server error with setup message.
- Invalid request: return 400 with field-specific message when practical.
- Model failure: return 500 with generic user-safe message.
- Invalid JSON: return 500 with clear retry message and log server-side details.

## Testing and Verification

- Lint and build must pass.
- Manual browser test must cover PDF upload, manual text entry, optional JD, English/Bahasa fields, result rendering, and error state.
- At least one fake/sample CV + JD test should confirm the UI handles long outputs and optional sections.

## Out of Scope For This Cycle

- Auth.
- Payment.
- Real review history.
- Persistent file storage.
- Production database.
- Active section locking.
- Copying Dealls brand, UI assets, testimonials, handles, or exact text.

## Self-Review Notes

- No placeholders remain.
- Scope is intentionally limited to frontend-first Option A plus strict analyzer API.
- Auth and payment are explicitly excluded.
- Free deployment requirement is addressed through model choice and no persistent infrastructure.
- Future phases are named but not included in Phase 1 implementation scope.
