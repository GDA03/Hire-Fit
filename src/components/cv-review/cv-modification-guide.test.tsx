import { describe, expect, test } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { CVModificationGuide } from "./cv-modification-guide";
import { makeValidReviewResult } from "@/lib/cv-review/validation.test";

describe("CVModificationGuide component", () => {
  test("renders CV modification guide in English with keywords, plan, and rewrites", () => {
    const result = makeValidReviewResult(true);
    const html = renderToString(<CVModificationGuide result={result} language="en" />);

    expect(html).toContain("CV Modification &amp; Action Guide");
    expect(html).toContain("Priority Action Checklist");
    expect(html).toContain("Missing Keywords to Add");
    expect(html).toContain("Section-by-Section Modification Suggestions");
    expect(html).toContain("accessibility");
    expect(html).toContain("Clarify impact.");
  });

  test("renders CV modification guide in Indonesian", () => {
    const result = makeValidReviewResult(true);
    const html = renderToString(<CVModificationGuide result={result} language="id" />);

    expect(html).toContain("Panduan Modifikasi &amp; Revisi CV");
    expect(html).toContain("Daftar Periksa Prioritas");
    expect(html).toContain("Kata Kunci yang Disarankan Ditambahkan");
    expect(html).toContain("Rekomendasi Revisi per Bagian");
  });
});
