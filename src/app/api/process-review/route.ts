import { NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { getReviewState, saveReviewState } from "@/lib/cv-review/store";
import { runGeminiAnalysis } from "@/app/api/analyze/route";

export const maxDuration = 60;

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

    if (state.status === "completed" || state.status === "failed") {
      return NextResponse.json({ message: "Already processed" }, { status: 200 });
    }

    state.status = "processing";
    state.updatedAt = Date.now();
    await saveReviewState(state);

    try {
      const result = await runGeminiAnalysis(state.request);

      state.status = "completed";
      state.result = result;
      state.updatedAt = Date.now();
      await saveReviewState(state);
    } catch (analysisError) {
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

export async function POST(request: Request) {
  if (!process.env.QSTASH_CURRENT_SIGNING_KEY || !process.env.QSTASH_NEXT_SIGNING_KEY) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Missing QStash signing keys" }, { status: 500 });
    }

    return handler(request);
  }

  return verifySignatureAppRouter(handler)(request);
}
