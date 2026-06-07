# On-Demand Review Translation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace bilingual one-shot review output with cached on-demand translation for result page language toggles.

**Architecture:** Initial CV review returns one language only. Result page keeps a per-language result map in client state and calls a new translation endpoint only when the user toggles to a missing language. Server translates an existing completed `CVReviewResult`, preserves scores/keys/priority, saves it under `ReviewState.translations`, and returns cached translations on repeat calls.

**Tech Stack:** Next.js App Router route handlers, TypeScript, Upstash Redis review store, Gemini JSON generation, React client state.

---

## File Map

- Modify `src/lib/cv-review/types.ts`: restore single-language result text types and add `translations` to `ReviewState`.
- Modify `src/lib/cv-review/prompt.ts`: restore single-language prompt output.
- Create `src/lib/cv-review/translation.ts`: translation prompt + Gemini translation helper.
- Create `src/app/api/cv-reviews/[id]/translate/route.ts`: cached translation endpoint.
- Modify `src/app/results/[id]/page.tsx`: fetch/use translations on toggle.
- Modify display components to accept plain strings again: `result-view.tsx`, `section-accordion.tsx`, `keyword-panel.tsx`, `priority-plan.tsx`.
- Remove `src/lib/cv-review/localize.ts` after consumers no longer need it.
- Keep `src/components/cv-review/result-actions.tsx`, but add loading/error support.

---

## Task 1: Restore single-language review output types and prompt

**Files:**
- Modify: `src/lib/cv-review/types.ts`
- Modify: `src/lib/cv-review/prompt.ts`

- [ ] **Step 1: Update result types**

In `src/lib/cv-review/types.ts`, remove `LocalizedText` and make all text fields `string` or `string[]`. Add translations to `ReviewState`:

```ts
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

export type ReviewState = {
  id: string;
  status: ReviewStatus;
  request: AnalyzeRequest;
  result?: CVReviewResult;
  translations?: Partial<Record<ReviewLanguage, CVReviewResult>>;
  error?: string;
  createdAt: number;
  updatedAt: number;
};
```

- [ ] **Step 2: Restore single-language prompt**

In `src/lib/cv-review/prompt.ts`, make prompt use `languageName` again and JSON shape with strings:

```ts
const targetedSectionShape = `,
  "jobFit": { "score": 0, "analysis": "string", "whatWorks": ["string"], "problemsFound": ["string"], "actionPoints": ["string"], "whyImportant": "string", "examples": ["string"], "priority": "high" },
  "tailoredContent": { "score": 0, "analysis": "string", "whatWorks": ["string"], "problemsFound": ["string"], "actionPoints": ["string"], "whyImportant": "string", "examples": ["string"], "priority": "high" },
  "experienceMatch": { "score": 0, "analysis": "string", "whatWorks": ["string"], "problemsFound": ["string"], "actionPoints": ["string"], "whyImportant": "string", "examples": ["string"], "priority": "high" }`;

export function buildCVReviewPrompt(request: AnalyzeRequest) {
  const languageName = request.language === "id" ? "Bahasa Indonesia" : "English";
```

Ensure rules include:

```txt
Output language: ${languageName}.
```

and do not mention bilingual JSON.

- [ ] **Step 3: Run lint**

Run: `rtk npm run lint`
Expected: no ESLint errors.

---

## Task 2: Add Gemini translation helper

**Files:**
- Create: `src/lib/cv-review/translation.ts`

- [ ] **Step 1: Create helper**

Create `src/lib/cv-review/translation.ts`:

```ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { extractJsonObject } from "./validation";
import { readEnv } from "@/lib/env";
import type { CVReviewResult, ReviewLanguage } from "./types";

const fallbackModel = "gemini-2.5-flash-lite";

function languageName(language: ReviewLanguage) {
  return language === "id" ? "Bahasa Indonesia" : "English";
}

export function buildReviewTranslationPrompt(result: CVReviewResult, targetLanguage: ReviewLanguage) {
  return `Translate this HireFit CV review result to ${languageName(targetLanguage)}.

Rules:
- Return valid JSON only. No markdown. No code fences.
- Keep the exact same JSON shape.
- Translate text fields only.
- Do not re-review the CV.
- Do not add new findings.
- Do not remove findings.
- Keep every score identical.
- Keep every priority value identical.
- Keep every section key identical.
- Keep array lengths and item order identical.

JSON to translate:
${JSON.stringify(result)}`;
}

export async function translateReviewResult(result: CVReviewResult, targetLanguage: ReviewLanguage): Promise<CVReviewResult> {
  const apiKey = readEnv("GEMINI_API_KEY");
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY.");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: readEnv("GEMINI_TRANSLATION_MODEL") ?? readEnv("GEMINI_MODEL") ?? fallbackModel,
    generationConfig: { responseMimeType: "application/json" },
  });

  const response = await model.generateContent(buildReviewTranslationPrompt(result, targetLanguage));
  return extractJsonObject(response.response.text()) as CVReviewResult;
}
```

- [ ] **Step 2: Run lint**

Run: `rtk npm run lint`
Expected: no ESLint errors.

---

## Task 3: Add cached translation API route

**Files:**
- Create: `src/app/api/cv-reviews/[id]/translate/route.ts`

- [ ] **Step 1: Create route**

Create `src/app/api/cv-reviews/[id]/translate/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getReviewState, saveReviewState } from "@/lib/cv-review/store";
import { translateReviewResult } from "@/lib/cv-review/translation";
import type { ReviewLanguage } from "@/lib/cv-review/types";

function readLanguage(value: unknown): ReviewLanguage | null {
  return value === "en" || value === "id" ? value : null;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const language = readLanguage(body.language);

    if (!language) {
      return NextResponse.json({ error: "Language must be English or Bahasa Indonesia." }, { status: 400 });
    }

    const state = await getReviewState(id);
    if (!state) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    if (state.status !== "completed" || !state.result) {
      return NextResponse.json({ error: "Review is not completed yet." }, { status: 409 });
    }

    if (state.request.language === language) {
      return NextResponse.json({ id, language, result: state.result, cached: true });
    }

    const cached = state.translations?.[language];
    if (cached) {
      return NextResponse.json({ id, language, result: cached, cached: true });
    }

    const translated = await translateReviewResult(state.result, language);
    state.translations = { ...(state.translations ?? {}), [language]: translated };
    state.updatedAt = Date.now();
    await saveReviewState(state);

    return NextResponse.json({ id, language, result: translated, cached: false });
  } catch (error) {
    console.error("Review translation error", error);
    const message = error instanceof Error ? error.message : "Failed to translate review.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
```

- [ ] **Step 2: Run lint**

Run: `rtk npm run lint`
Expected: no ESLint errors.

---

## Task 4: Update result page toggle flow

**Files:**
- Modify: `src/app/results/[id]/page.tsx`
- Modify: `src/components/cv-review/result-actions.tsx`

- [ ] **Step 1: Update response types and state**

In `src/app/results/[id]/page.tsx`, include translations and per-language result state:

```ts
type FullReviewResponse = ReviewStatusResponse & {
  request?: AnalyzeRequest;
  result?: CVReviewResult;
  translations?: Partial<Record<ReviewLanguage, CVReviewResult>>;
};
```

Add:

```ts
const [resultsByLanguage, setResultsByLanguage] = useState<Partial<Record<ReviewLanguage, CVReviewResult>>>({});
const [translationError, setTranslationError] = useState("");
const [translatingLanguage, setTranslatingLanguage] = useState<ReviewLanguage | null>(null);
```

When full review loads, populate map:

```ts
const originalLanguage = fullData.request?.language ?? "en";
setReview(fullData);
setLanguage(originalLanguage);
setResultsByLanguage({
  [originalLanguage]: fullData.result,
  ...(fullData.translations ?? {}),
});
```

- [ ] **Step 2: Add language change handler**

In `src/app/results/[id]/page.tsx`, add:

```ts
async function handleLanguageChange(nextLanguage: ReviewLanguage) {
  setTranslationError("");

  if (resultsByLanguage[nextLanguage]) {
    setLanguage(nextLanguage);
    return;
  }

  setTranslatingLanguage(nextLanguage);
  try {
    const response = await fetch(`/api/cv-reviews/${id}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: nextLanguage }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Failed to translate review.");

    setResultsByLanguage((current) => ({ ...current, [nextLanguage]: data.result as CVReviewResult }));
    setLanguage(nextLanguage);
  } catch (err) {
    setTranslationError(err instanceof Error ? err.message : "Failed to translate review.");
  } finally {
    setTranslatingLanguage(null);
  }
}
```

Render current result:

```ts
const visibleResult = resultsByLanguage[language] ?? review?.result;
```

Pass `onLanguageChange={handleLanguageChange}`, `translatingLanguage`, and `translationError` to actions.

- [ ] **Step 3: Update ResultActions props**

In `src/components/cv-review/result-actions.tsx`, update props:

```ts
type ResultActionsProps = {
  language: ReviewLanguage;
  onLanguageChange: (language: ReviewLanguage) => void;
  translatingLanguage?: ReviewLanguage | null;
};
```

Disable buttons while target is translating and render labels:

```tsx
{translatingLanguage === "en" ? "..." : "EN"}
{translatingLanguage === "id" ? "..." : "ID"}
```

- [ ] **Step 4: Show translation error**

In `src/app/results/[id]/page.tsx`, below `ResultActions`, render:

```tsx
{translationError && (
  <p className="text-sm font-bold text-red-600">{translationError}</p>
)}
```

- [ ] **Step 5: Run lint**

Run: `rtk npm run lint`
Expected: no ESLint errors.

---

## Task 5: Remove bilingual localizer usage from display components

**Files:**
- Modify: `src/components/cv-review/result-view.tsx`
- Modify: `src/components/cv-review/section-accordion.tsx`
- Modify: `src/components/cv-review/keyword-panel.tsx`
- Modify: `src/components/cv-review/priority-plan.tsx`
- Delete: `src/lib/cv-review/localize.ts`

- [ ] **Step 1: Remove localize imports**

Remove imports from `result-view.tsx`, `section-accordion.tsx`, and `keyword-panel.tsx`:

```ts
import { localizeList, localizeText } from "@/lib/cv-review/localize";
```

- [ ] **Step 2: Replace localize calls with direct values**

Examples:

```tsx
{localizeText(result.summary, language)}
```

becomes:

```tsx
{result.summary}
```

```tsx
{localizeList(result.priorityPlan, language)}
```

becomes:

```tsx
{result.priorityPlan}
```

Apply same pattern for all fields because `CVReviewResult` is single-language again.

- [ ] **Step 3: Keep UI label localization**

Keep `language` prop in display components for labels only: headings, empty text, section titles, action titles.

- [ ] **Step 4: Delete unused localizer**

Delete `src/lib/cv-review/localize.ts` after imports are gone.

- [ ] **Step 5: Run lint**

Run: `rtk npm run lint`
Expected: no ESLint errors.

---

## Task 6: Verify build and commit implementation

**Files:**
- All changed files from previous tasks.

- [ ] **Step 1: Run full build**

Run: `rtk npm run build`
Expected: Next.js build succeeds.

- [ ] **Step 2: Check diff**

Run: `rtk git diff --stat`
Expected: changes only in review translation files and plan/spec commits already present.

- [ ] **Step 3: Commit implementation**

Run:

```powershell
rtk git add src/lib/cv-review/types.ts src/lib/cv-review/prompt.ts src/lib/cv-review/translation.ts src/app/api/cv-reviews/[id]/translate/route.ts src/app/results/[id]/page.tsx src/components/cv-review/result-actions.tsx src/components/cv-review/result-view.tsx src/components/cv-review/section-accordion.tsx src/components/cv-review/keyword-panel.tsx src/components/cv-review/priority-plan.tsx
rtk git add -u src/lib/cv-review/localize.ts
rtk git commit -m @'
feat: translate review results on demand

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
'@
```

Expected: commit succeeds.

---

## Self-Review

Spec coverage:
- Cached translation endpoint: Task 3.
- Initial single-language generation: Task 1.
- Translation helper preserving scores and shape: Task 2.
- Client toggle with loading/error state: Task 4.
- Display components use selected language result: Task 5.
- Build/commit: Task 6.

Placeholder scan: no TBD/TODO/fill-later placeholders.

Type consistency: `ReviewLanguage`, `CVReviewResult`, and `ReviewState.translations` names match existing type file and planned route/page code.
