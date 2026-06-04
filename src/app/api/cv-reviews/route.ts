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
