import { describe, expect, test } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { ResultActions } from "./result-actions";

describe("ResultActions component", () => {
  test("renders download PDF action button in English", () => {
    const html = renderToString(
      <ResultActions language="en" onLanguageChange={() => {}} />,
    );

    expect(html).toContain("Download PDF");
    expect(html).toContain("Copy link");
  });

  test("renders download PDF action button in Indonesian", () => {
    const html = renderToString(
      <ResultActions language="id" onLanguageChange={() => {}} />,
    );

    expect(html).toContain("Unduh PDF");
    expect(html).toContain("Salin link");
  });
});
