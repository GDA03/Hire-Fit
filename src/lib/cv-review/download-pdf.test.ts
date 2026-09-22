import { describe, expect, test } from "vitest";
import { generateReviewPdf } from "./download-pdf";
import { makeValidReviewResult } from "./validation.test";

describe("generateReviewPdf", () => {
  test("generates vector PDF document for English review with target role", () => {
    const result = makeValidReviewResult(true);
    const doc = generateReviewPdf({
      result,
      language: "en",
      reviewId: "rv_test123",
      targetRole: "Senior Frontend Engineer",
    });

    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBeGreaterThan(0);
    const arrayBuffer = doc.output("arraybuffer");
    expect(arrayBuffer.byteLength).toBeGreaterThan(1000);
  });

  test("generates vector PDF document for Indonesian review without target role", () => {
    const result = makeValidReviewResult(false);
    const doc = generateReviewPdf({
      result,
      language: "id",
      reviewId: "rv_test456",
    });

    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBeGreaterThan(0);
    const arrayBuffer = doc.output("arraybuffer");
    expect(arrayBuffer.byteLength).toBeGreaterThan(1000);
  });
});
