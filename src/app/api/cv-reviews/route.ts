import { after, NextResponse } from "next/server";
import { publicModelErrorMessage, isAnalyzeRequestError } from "@/lib/cv-review/model";
import { enforceAnalysisInputBudget, validateAnalyzeRequest } from "@/lib/cv-review/validation";
import { getReviewState, saveReviewState } from "@/lib/cv-review/store";
import { runGeminiAnalysis } from "@/app/api/analyze/route";
import { readEnv } from "@/lib/env";
import { Client } from "@upstash/qstash";
import { v4 as uuidv4 } from "uuid";
import type { ReviewState } from "@/lib/cv-review/types";

const qstashToken = readEnv("QSTASH_TOKEN");
const qstashUrl = readEnv("QSTASH_URL");
const qstash = new Client({ baseUrl: qstashUrl, token: qstashToken || "" });

async function processReviewInBackground(reviewId: string) {
  const state = await getReviewState(reviewId);
  if (!state || state.status === "completed" || state.status === "failed") return;

  state.status = "processing";
  state.updatedAt = Date.now();
  await saveReviewState(state);

  try {
    state.result = await runGeminiAnalysis(state.request);
    state.status = "completed";
  } catch (error) {
    console.error("Background analysis error", error);
    state.status = "failed";
    state.error = publicModelErrorMessage("analyze");
  }

  state.updatedAt = Date.now();
  await saveReviewState(state);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const analyzeRequest = enforceAnalysisInputBudget(validateAnalyzeRequest(body));
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

    const appUrl = readEnv("NEXT_PUBLIC_APP_URL") || `https://${request.headers.get("host")}`;

    if (qstashToken) {
      await qstash.publishJSON({
        url: `${appUrl}/api/process-review`,
        body: { reviewId: id },
      });
    } else {
      console.warn("QSTASH_TOKEN not found, skipping background job trigger.");
    }

    if (process.env.VERCEL_ENV === "preview") {
      after(() => processReviewInBackground(id));
    }

    return NextResponse.json({ id });
  } catch (error) {
    const status = isAnalyzeRequestError(error) ? 400 : 502;
    const message = status === 400 && error instanceof Error ? error.message : publicModelErrorMessage("analyze");
    console.error("Review creation error", error);
    return NextResponse.json({ error: message }, { status });
  }
}
