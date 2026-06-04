# HireFit Async Review Flow Design

Date: 2026-06-04

## Goal

Transition the CV review process from a synchronous API call to an asynchronous queue. This prevents Vercel 10-second serverless timeouts on slow Gemini generations, enables shareable result URLs, provides a better loading UX, and allows for automatic retries.

## Architecture

**Tech Stack:** Next.js 16 App Router, Upstash Redis (Vercel KV) for state, Upstash QStash for background execution.

This phase deliberately avoids a relational database or Auth. Redis is used as a temporary cache/queue state. Reviews will have a 7-day TTL (Time To Live) to ensure privacy and keep free-tier usage low.

## Data Model (Redis)

Keys will be prefixed with `review:`.
Example Key: `review:rv_abc123xyz`

```ts
type ReviewState = {
  id: string;
  status: "queued" | "processing" | "completed" | "failed";
  request: AnalyzeRequest;
  result?: CVReviewResult;
  error?: string;
  createdAt: number;
  updatedAt: number;
};
```

## API Routes

### 1. `POST /api/cv-reviews`
- **Purpose:** Submit a new CV review.
- **Action:**
  - Validates the `AnalyzeRequest`.
  - Generates a unique `id` (e.g., `nanoid` or `crypto.randomUUID()`).
  - Saves initial `ReviewState` to Redis (status: `queued`).
  - Publishes a message to QStash targeting `/api/process-review`.
- **Response:** `{ id: string }`

### 2. `POST /api/process-review`
- **Purpose:** The background worker triggered by QStash.
- **Action:**
  - Verifies QStash signature to ensure the request is legitimate.
  - Updates Redis status to `processing`.
  - Calls Gemini API using `buildCVReviewPrompt`.
  - Saves `CVReviewResult` to Redis, updates status to `completed`.
  - If error, updates status to `failed` and saves error message.
- **Response:** `200 OK` (so QStash knows it succeeded).

### 3. `GET /api/cv-reviews/[id]/status`
- **Purpose:** Polling endpoint for the client.
- **Action:** Fetches the state from Redis. Strips the heavy `result` payload if not `completed` to save bandwidth.
- **Response:** `{ id: string, status: string, error?: string }`

### 4. `GET /api/cv-reviews/[id]`
- **Purpose:** Fetch the full completed review.
- **Action:** Fetches the full `ReviewState` from Redis. Returns 404 if not found or expired.
- **Response:** `ReviewState`

## UI Changes

### 1. Form Submission
- `CVReviewForm` will no longer wait for the full analysis.
- On submit, it calls `POST /api/cv-reviews`.
- On success, it routes the user to `/results/[id]`.

### 2. Results Page (`src/app/results/[id]/page.tsx`)
- A new dedicated page for viewing a specific review.
- **Loading State:** If status is `queued` or `processing`, show a polling UI (e.g., "Analyzing your CV...", "Checking ATS compatibility..."). Polls `/api/cv-reviews/[id]/status` every 3 seconds.
- **Error State:** If status is `failed`, show the error and a "Retry" button.
- **Success State:** If status is `completed`, render the existing `ResultView` component.

## Required Environment Variables

```env
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
QSTASH_TOKEN=
QSTASH_CURRENT_SIGNING_KEY=
QSTASH_NEXT_SIGNING_KEY=
# Needed so QStash knows where to send the webhook in dev vs prod
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Security & Edge Cases

- **QStash Verification:** `/api/process-review` must use `@upstash/qstash/nextjs` to verify incoming webhooks.
- **Local Development:** Developers will need to use `ngrok` or the Upstash local tunnel feature so QStash can reach `http://localhost:3000/api/process-review`. We will document this.
- **Idempotency:** The worker should check if the review is already `completed` before running Gemini again.

## Out of Scope
- User authentication.
- Persistent long-term storage (Postgres).
- User dashboards (listing previous reviews).
