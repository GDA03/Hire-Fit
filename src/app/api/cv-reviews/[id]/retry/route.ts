import { after, NextResponse } from "next/server";
import { Client } from "@upstash/qstash";
import { runGeminiAnalysis } from "@/app/api/analyze/route";
import { publicModelErrorMessage } from "@/lib/cv-review/model";
import { getReviewState, saveReviewState } from "@/lib/cv-review/store";
import { readEnv } from "@/lib/env";

export const maxDuration = 180;

const qstashToken = readEnv("QSTASH_TOKEN");
const qstashUrl = readEnv("QSTASH_URL");
const qstash = new Client({ baseUrl: qstashUrl, token: qstashToken || "" });

async function processReviewInBackground(reviewId: string) {
  const state = await getReviewState(reviewId);
  if (!state || state.status === "completed" || state.status === "failed") return;

  state.status = "processing";
  state.error = undefined;
  state.updatedAt = Date.now();
  await saveReviewState(state);

  try {
    state.result = await runGeminiAnalysis(state.request);
    state.status = "completed";
  } catch (error) {
    console.error("Retry analysis error", error);
    state.status = "failed";
    state.error = publicModelErrorMessage("analyze");
  }

  state.updatedAt = Date.now();
  await saveReviewState(state);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const state = await getReviewState(id);

    if (!state) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    state.status = "queued";
    state.error = undefined;
    state.result = undefined;
    state.translations = undefined;
    state.updatedAt = Date.now();
    await saveReviewState(state);

    const appUrl = readEnv("NEXT_PUBLIC_APP_URL") || `https://${request.headers.get("host")}`;

    if (qstashToken) {
      await qstash.publishJSON({
        url: `${appUrl}/api/process-review`,
        body: { reviewId: id },
      });
    } else {
      after(() => processReviewInBackground(id));
    }

    return NextResponse.json({ id, status: state.status });
  } catch (error) {
    console.error("Review retry error", error);
    return NextResponse.json({ error: publicModelErrorMessage("analyze") }, { status: 502 });
  }
}
