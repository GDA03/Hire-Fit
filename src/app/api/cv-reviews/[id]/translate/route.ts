import { NextResponse } from "next/server";
import { getReviewState, saveReviewState } from "@/lib/cv-review/store";
import { translateReviewResult } from "@/lib/cv-review/translation";
import type { ReviewLanguage } from "@/lib/cv-review/types";

export const maxDuration = 60;

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
