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

  if (state.status !== "completed" || !state.result) {
    return NextResponse.json(
      {
        id,
        status: state.status,
        error: state.error,
      },
      { status: 202 }
    );
  }

  return NextResponse.json({
    id,
    status: state.status,
    result: state.result,
  });
}
