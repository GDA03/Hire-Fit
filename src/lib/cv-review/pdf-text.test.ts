import { describe, expect, test } from "vitest";
import {
  analyzePDFTextQuality,
  reconstructPDFPageText,
  type PDFTextItem,
} from "./pdf-text";

describe("reconstructPDFPageText", () => {
  const pageWidth = 600;

  test("reconstructs single-column page top-to-bottom and sorts line items by x", () => {
    // Note: in PDF coordinates, top of page has higher Y values (e.g. 700 is above 600)
    const items: PDFTextItem[] = [
      { str: "Doe", x: 120, y: 700, width: 40, height: 12 },
      { str: "John", x: 60, y: 702, width: 50, height: 12 }, // same line as "Doe"
      { str: "Software Engineer", x: 60, y: 650, width: 140, height: 12 },
      { str: "Experience", x: 60, y: 600, width: 90, height: 14 },
    ];

    const text = reconstructPDFPageText(items, pageWidth);

    expect(text).toBe("John Doe\nSoftware Engineer\nExperience");
  });

  test("reconstructs two-column page left-column then right-column", () => {
    // Page width = 600. Midpoint = 300.
    // Left column x ~ 50 (width 200). Right column x ~ 350 (width 200).
    // Horizontal gap = 350 - 250 = 100 (> 12% of 600 = 72).
    const items: PDFTextItem[] = [
      // Left column items (top to bottom)
      { str: "Left Header", x: 50, y: 700, width: 100, height: 12 },
      { str: "Left Item 1", x: 50, y: 660, width: 90, height: 12 },
      { str: "Left Item 2", x: 50, y: 620, width: 90, height: 12 },

      // Right column items (top to bottom)
      { str: "Right Header", x: 350, y: 700, width: 100, height: 12 },
      { str: "Right Item 1", x: 350, y: 660, width: 90, height: 12 },
      { str: "Right Item 2", x: 350, y: 620, width: 90, height: 12 },
    ];

    const text = reconstructPDFPageText(items, pageWidth);

    expect(text).toBe(
      "Left Header\nLeft Item 1\nLeft Item 2\nRight Header\nRight Item 1\nRight Item 2",
    );
  });

  test("does not reorder single-column page that has a dominant full-width header", () => {
    const items: PDFTextItem[] = [
      { str: "Full Width Title Banner", x: 50, y: 750, width: 500, height: 20 },
      { str: "Line 1", x: 50, y: 700, width: 150, height: 12 },
      { str: "Line 2", x: 50, y: 660, width: 150, height: 12 },
      { str: "Line 3", x: 50, y: 620, width: 150, height: 12 },
    ];

    const text = reconstructPDFPageText(items, pageWidth);

    expect(text).toBe("Full Width Title Banner\nLine 1\nLine 2\nLine 3");
  });
});

describe("analyzePDFTextQuality", () => {
  test("classifies empty or minimal text as poor confidence", () => {
    const analysis = analyzePDFTextQuality("Short text", 1);

    expect(analysis.confidence).toBe("poor");
    expect(analysis.warnings.length).toBeGreaterThan(0);
  });

  test("classifies repetitive text as poor confidence", () => {
    const repeated = Array(25).fill("Watermark or corrupt repeated line").join("\n");
    const analysis = analyzePDFTextQuality(repeated, 1);

    expect(analysis.confidence).toBe("poor");
    expect(analysis.warnings.some((w) => /repetitive|little/i.test(w))).toBe(true);
  });

  test("classifies structured CV text with email, phone, and headings as good confidence", () => {
    const goodCV = `
      John Doe
      john.doe@example.com | +1 555 123 4567
      San Francisco, CA

      Professional Summary
      Experienced software engineer specializing in distributed systems and cloud architecture.

      Experience
      Senior Backend Engineer at Acme Corp (2020 - Present)
      - Led migration of legacy monolith to microservices, reducing latency by 35%.
      - Mentored junior engineers and conducted hiring interviews.

      Education
      B.S. in Computer Science, University of California, Berkeley

      Skills
      TypeScript, Go, Python, Docker, Kubernetes, PostgreSQL
    `.repeat(2);

    const analysis = analyzePDFTextQuality(goodCV, 2);

    expect(analysis.confidence).toBe("good");
    expect(analysis.warnings[0]).toContain("usable");
  });

  test("classifies unstructured or incomplete text as partial confidence", () => {
    const partialText = [
      "Brief introduction statement about general experience.",
      "Worked on a few projects over the past couple of years.",
      "Graduated from a local program with interest in design.",
      "Seeking new opportunities in an entry-level capacity.",
    ].join("\n");
    const analysis = analyzePDFTextQuality(partialText, 1);

    expect(analysis.confidence).toBe("partial");
    expect(analysis.warnings.some((w) => /missing|sections/i.test(w))).toBe(true);
  });
});
