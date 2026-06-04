# Async Review Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the async CV review flow using Vercel KV and Upstash QStash to prevent serverless timeouts and provide shareable result URLs.

**Architecture:** We will set up API routes for submission, background processing (QStash worker), and status polling. The UI will be updated to handle submission, navigate to a new `/results/[id]` page, and poll until the review completes. 

**Tech Stack:** Next.js 16, `@upstash/redis`, `@upstash/qstash`, `uuid`.

---

### Task 1: Setup Shared Types and Redis Helper

**Files:**
- Create: `src/lib/cv-review/store.ts`
- Modify: `src/lib/cv-review/types.ts`

- [ ] **Step 1: Define the `ReviewState` type**
Update `src/lib/cv-review/types.ts` to include the review state structure.

```typescript
// Append this to src/lib/cv-review/types.ts

export type ReviewStatus = "queued" | "processing" | "completed" | "failed";

export type ReviewState = {
  id: string;
  status: ReviewStatus;
  request: AnalyzeRequest;
  result?: CVReviewResult;
  error?: string;
  createdAt: number;
  updatedAt: number;
};
```

- [ ] **Step 2: Create Redis storage helper**
Create `src/lib/cv-review/store.ts` to handle saving and retrieving review states with a 7-day TTL.

```typescript
import { Redis } from "@upstash/redis";
import type { ReviewState } from "./types";

const redis = Redis.fromEnv();
const TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export async function saveReviewState(state: ReviewState): Promise<void> {
  await redis.set(`review:${state.id}`, state, { ex: TTL_SECONDS });
}

export async function getReviewState(id: string): Promise<ReviewState | null> {
  return await redis.get<ReviewState>(`review:${id}`);
}
```

- [ ] **Step 3: Run linter and check compilation**
```bash
rtk npm run lint
```
Expected: PASS

- [ ] **Step 4: Commit**
```bash
rtk git add src/lib/cv-review/types.ts src/lib/cv-review/store.ts
rtk git commit -m "feat: add review state types and redis store helper"
```

---

### Task 2: Implement Submission and Status APIs

**Files:**
- Create: `src/app/api/cv-reviews/route.ts`
- Create: `src/app/api/cv-reviews/[id]/status/route.ts`

- [ ] **Step 1: Create submission endpoint**
Create `src/app/api/cv-reviews/route.ts`. This validates the request, saves the initial state, and publishes to QStash.

```typescript
import { NextResponse } from "next/server";
import { validateAnalyzeRequest } from "@/lib/cv-review/validation";
import { saveReviewState } from "@/lib/cv-review/store";
import { Client } from "@upstash/qstash";
import { v4 as uuidv4 } from "uuid";
import type { ReviewState } from "@/lib/cv-review/types";

const qstash = new Client({ token: process.env.QSTASH_TOKEN || "" });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const analyzeRequest = validateAnalyzeRequest(body);

    const id = `rv_${uuidv4().replace(/-/g, "")}`;
    const now = Date.now();

    const state: ReviewState = {
      id,
      status: "queued",
      request: analyzeRequest,
      createdAt: now,
      updatedAt: now,
    };

    await saveReviewState(state);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${request.headers.get("host")}`;
    
    if (process.env.QSTASH_TOKEN) {
      await qstash.publishJSON({
        url: `${appUrl}/api/process-review`,
        body: { reviewId: id },
      });
    } else {
      console.warn("QSTASH_TOKEN not found, skipping background job trigger.");
    }

    return NextResponse.json({ id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create review.";
    const status = message.includes("must") || message.includes("too long") || message.includes("not supported") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
```

- [ ] **Step 2: Create status polling endpoint**
Create `src/app/api/cv-reviews/[id]/status/route.ts`. This strips the heavy result payload if the review is still processing.

```typescript
import { NextResponse } from "next/server";
import { getReviewState } from "@/lib/cv-review/store";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const state = await getReviewState(id);

  if (!state) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  // Only return what's necessary for polling
  return NextResponse.json({
    id: state.id,
    status: state.status,
    error: state.error,
  });
}
```

- [ ] **Step 3: Run linter**
```bash
rtk npm run lint
```
Expected: PASS

- [ ] **Step 4: Commit**
```bash
rtk git add src/app/api/cv-reviews/route.ts src/app/api/cv-reviews/[id]/status/route.ts
rtk git commit -m "feat: add cv review submission and status endpoints"
```

---

### Task 3: Implement Background Worker API

**Files:**
- Create: `src/app/api/process-review/route.ts`
- Modify: `src/app/api/analyze/route.ts`

- [ ] **Step 1: Extract core analysis logic**
We need to reuse the Gemini calling logic from `api/analyze` in the new background worker. Create an exported function in `src/app/api/analyze/route.ts`.

Modify `src/app/api/analyze/route.ts` to export `runGeminiAnalysis`:

```typescript
// Add this export to src/app/api/analyze/route.ts (keep the existing POST function for now)
import { AnalyzeRequest, CVReviewResult } from "@/lib/cv-review/types";
// ... (existing imports)

export async function runGeminiAnalysis(analyzeRequest: AnalyzeRequest): Promise<CVReviewResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const fallbackModel = "gemini-2.5-flash-lite";
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL ?? fallbackModel,
    generationConfig: { responseMimeType: "application/json" },
  });
  const result = await model.generateContent(buildCVReviewPrompt(analyzeRequest));
  const rawText = result.response.text();
  return extractJsonObject(rawText) as CVReviewResult;
}
```
Update the existing `POST` function in `src/app/api/analyze/route.ts` to use this new function:
```typescript
    // Inside POST(request: Request)
    const body = await request.json();
    const analyzeRequest = validateAnalyzeRequest(body);
    const parsed = await runGeminiAnalysis(analyzeRequest);
    return NextResponse.json(parsed);
```

- [ ] **Step 2: Create QStash worker endpoint**
Create `src/app/api/process-review/route.ts`.

```typescript
import { NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { getReviewState, saveReviewState } from "@/lib/cv-review/store";
import { runGeminiAnalysis } from "@/app/api/analyze/route";

export const maxDuration = 60; // Allow more time for Gemini

async function handler(request: Request) {
  try {
    const body = await request.json();
    const reviewId = body.reviewId;

    if (!reviewId) {
      return NextResponse.json({ error: "Missing reviewId" }, { status: 400 });
    }

    const state = await getReviewState(reviewId);
    if (!state) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    // Idempotency: stop if already done
    if (state.status === "completed" || state.status === "failed") {
      return NextResponse.json({ message: "Already processed" }, { status: 200 });
    }

    // Mark as processing
    state.status = "processing";
    state.updatedAt = Date.now();
    await saveReviewState(state);

    try {
      // Run analysis
      const result = await runGeminiAnalysis(state.request);
      
      // Save success
      state.status = "completed";
      state.result = result;
      state.updatedAt = Date.now();
      await saveReviewState(state);
      
    } catch (analysisError) {
      // Save failure
      state.status = "failed";
      state.error = analysisError instanceof Error ? analysisError.message : "Analysis failed";
      state.updatedAt = Date.now();
      await saveReviewState(state);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Worker error:", error);
    return NextResponse.json({ error: "Worker failed" }, { status: 500 });
  }
}

// Verify QStash signature
export const POST = verifySignatureAppRouter(handler);
```

- [ ] **Step 3: Run linter**
```bash
rtk npm run lint
```
Expected: PASS

- [ ] **Step 4: Commit**
```bash
rtk git add src/app/api/process-review/route.ts src/app/api/analyze/route.ts
rtk git commit -m "feat: add background worker for cv analysis"
```

---

### Task 4: Implement Results Page API and UI Shell

**Files:**
- Create: `src/app/api/cv-reviews/[id]/route.ts`
- Create: `src/app/results/[id]/page.tsx`

- [ ] **Step 1: Create full review fetching endpoint**
Create `src/app/api/cv-reviews/[id]/route.ts`.

```typescript
import { NextResponse } from "next/server";
import { getReviewState } from "@/lib/cv-review/store";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const state = await getReviewState(id);

  if (!state) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  return NextResponse.json(state);
}
```

- [ ] **Step 2: Create Results Page**
Create `src/app/results/[id]/page.tsx`. This component handles the polling and rendering.

```tsx
"use client";

import { useEffect, useState, use } from "react";
import { ResultView } from "@/components/cv-review/result-view";
import type { ReviewState } from "@/lib/cv-review/types";

export default function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [state, setState] = useState<ReviewState | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    async function fetchStatus() {
      try {
        const response = await fetch(`/api/cv-reviews/${id}/status`);
        if (!response.ok) {
          throw new Error("Review not found or expired.");
        }
        
        const data = await response.json();
        
        if (data.status === "completed") {
          // Fetch full data
          const fullResponse = await fetch(`/api/cv-reviews/${id}`);
          const fullData = await fullResponse.json();
          setState(fullData);
        } else if (data.status === "failed") {
          setState(data);
        } else {
          // Still queued/processing, poll again
          setState(data);
          timeoutId = setTimeout(fetchStatus, 3000);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch status");
      }
    }

    fetchStatus();

    return () => clearTimeout(timeoutId);
  }, [id]);

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 p-6 pt-20">
        <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          {error}
        </div>
      </main>
    );
  }

  if (!state || state.status === "queued" || state.status === "processing") {
    return (
      <main className="min-h-screen bg-slate-50 p-6 pt-32">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-700"></div>
          <h1 className="text-2xl font-black text-slate-900">Analyzing your CV...</h1>
          <p className="mt-2 text-slate-500">Checking ATS readiness, extracting keywords, and scoring sections. This usually takes about 15 seconds.</p>
        </div>
      </main>
    );
  }

  if (state.status === "failed") {
    return (
      <main className="min-h-screen bg-slate-50 p-6 pt-20">
        <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          <h2 className="mb-2 text-xl font-bold">Analysis Failed</h2>
          <p>{state.error || "An unknown error occurred during analysis."}</p>
        </div>
      </main>
    );
  }

  if (state.status === "completed" && state.result) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-950">
        <nav className="border-b border-slate-200 bg-white/85 px-6 py-4 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <a href="/" className="text-lg font-black tracking-tight hover:text-cyan-700">HireFit</a>
          </div>
        </nav>
        <div className="mx-auto max-w-6xl px-6 py-10">
          <ResultView result={state.result} />
        </div>
      </main>
    );
  }

  return null;
}
```

- [ ] **Step 3: Run linter**
```bash
rtk npm run lint
```
Expected: PASS

- [ ] **Step 4: Commit**
```bash
rtk git add src/app/api/cv-reviews/[id]/route.ts src/app/results/[id]/page.tsx
rtk git commit -m "feat: add results page and full review fetch endpoint"
```

---

### Task 5: Update Front-end to Use Async Flow

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Update form submission in `page.tsx`**
Change `handleAnalyze` to call the new `/api/cv-reviews` endpoint and redirect the user. We will use `next/navigation`'s `useRouter`.

Modify `src/app/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CVReviewForm } from "@/components/cv-review/cv-review-form";
import type { AnalyzeRequest } from "@/lib/cv-review/types";

export default function Home() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAnalyze(request: AnalyzeRequest) {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/cv-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error ?? "Failed to queue analysis");
      
      // Redirect to the new polling results page
      router.push(`/results/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setLoading(false); // Only reset if there's an error, otherwise let it navigate
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <nav className="border-b border-slate-200 bg-white/85 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="text-lg font-black tracking-tight">HireFit</div>
          <div className="hidden items-center gap-6 text-sm text-slate-600 sm:flex">
            <a href="#review" className="hover:text-cyan-700">Review CV</a>
            <a href="#preview" className="hover:text-cyan-700">What you get</a>
            <a href="#features" className="hover:text-cyan-700">Features</a>
            <a href="#faq" className="hover:text-cyan-700">FAQ</a>
          </div>
        </div>
      </nav>

      <section id="review" className="mx-auto grid max-w-6xl gap-10 px-6 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div className="space-y-8">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-700">AI CV Reviewer</p>
            <h1 className="text-4xl font-black tracking-tight md:text-6xl">Make your CV fit the role without making things up.</h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-700">Upload a PDF or paste your CV, choose your review goal, and get structured feedback for ATS readiness, role fit, keywords, and next actions.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-2xl font-black text-cyan-700">12</p>
              <p className="text-sm text-slate-600">CV sections checked</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-2xl font-black text-cyan-700">2</p>
              <p className="text-sm text-slate-600">Languages supported</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-2xl font-black text-cyan-700">0</p>
              <p className="text-sm text-slate-600">Accounts required</p>
            </div>
          </div>
          <div id="preview" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-cyan-700">Preview</p>
            <ul className="space-y-3 text-sm text-slate-700">
              <li>• Overall ATS-style score and summary.</li>
              <li>• Section-by-section review with concrete action points.</li>
              <li>• Keyword gaps, career recommendations, and optional job-fit analysis.</li>
            </ul>
          </div>
        </div>

        <div className="space-y-5">
          <CVReviewForm loading={loading} onSubmit={handleAnalyze} />
          {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 pb-16">
        <div className="mb-8 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-700">Features</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">Focused review for faster CV improvements.</h2>
          <p className="mt-4 text-slate-700">HireFit turns your CV into a clear improvement checklist without inventing credentials or experience.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold">ATS readiness</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">Checks structure, keywords, measurable impact, and recruiter-friendly formatting signals.</p>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold">Role-fit feedback</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">Compares your CV against a target job description when provided and highlights missing evidence.</p>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold">Actionable next steps</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">Returns prioritized fixes, section notes, and keyword suggestions you can apply immediately.</p>
          </article>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-6xl px-6 pb-20">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-700">FAQ</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight">Common questions</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl bg-slate-50 p-5">
              <h3 className="font-bold">Do I need an account?</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">No. Paste your CV or upload a PDF and run a review without signing in.</p>
            </article>
            <article className="rounded-2xl bg-slate-50 p-5">
              <h3 className="font-bold">Can I review against a job post?</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">Yes. Add a job description to get role-fit analysis, keyword gaps, and tailored recommendations.</p>
            </article>
            <article className="rounded-2xl bg-slate-50 p-5">
              <h3 className="font-bold">Does HireFit rewrite my CV?</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">No. It gives targeted feedback and suggested improvements so you can keep your experience honest.</p>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Run linter and build**
```bash
rtk npm run lint
rtk npm run build
```
Expected: PASS

- [ ] **Step 3: Commit**
```bash
rtk git add src/app/page.tsx
rtk git commit -m "feat: migrate frontend to async review flow"
```
````