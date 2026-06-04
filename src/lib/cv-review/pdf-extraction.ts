export type PDFParseConfidence = "good" | "partial" | "poor";

export type PDFExtractionResult = {
  text: string;
  pageCount: number;
  characterCount: number;
  confidence: PDFParseConfidence;
  warnings: string[];
  preview: string;
};

export async function extractTextFromPDF(file: File): Promise<PDFExtractionResult> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url,
  ).toString();

  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  const pageTexts: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    pageTexts.push(text);
    page.cleanup();
  }

  const text = pageTexts.filter(Boolean).join("\n\n").trim();
  const characterCount = text.length;
  const averageCharsPerPage = pdf.numPages > 0 ? characterCount / pdf.numPages : 0;
  const confidence = getConfidence(characterCount, averageCharsPerPage);
  const warnings = getWarnings(confidence, characterCount, averageCharsPerPage);

  return {
    text,
    pageCount: pdf.numPages,
    characterCount,
    confidence,
    warnings,
    preview: text.slice(0, 600),
  };
}

function getConfidence(characterCount: number, averageCharsPerPage: number): PDFParseConfidence {
  if (characterCount >= 500 && averageCharsPerPage >= 100) return "good";
  if (characterCount >= 50) return "partial";
  return "poor";
}

function getWarnings(confidence: PDFParseConfidence, characterCount: number, averageCharsPerPage: number) {
  if (confidence === "good") {
    return ["PDF text extraction looks usable. Review extracted text before submitting."];
  }

  if (confidence === "partial") {
    return [
      `Only ${characterCount.toLocaleString()} characters were extracted. Some CV sections may be missing.`,
      "Review extracted text and paste missing content manually before submitting.",
    ];
  }

  return [
    "PDF text extraction found very little readable text.",
    `Average readable text is ${Math.round(averageCharsPerPage).toLocaleString()} characters per page. This PDF may be image-based or ATS-unfriendly.`,
    "Paste CV text manually for a better review.",
  ];
}
