import {
  analyzePDFTextQuality,
  mapPDFItemToTextItem,
  reconstructPDFPageText,
  type PDFParseConfidence,
  type PDFTextItem,
} from "./pdf-text";

export type { PDFParseConfidence };
export type PDFExtractionSource = "client" | "server";

export type PDFExtractionResult = {
  text: string;
  pageCount: number;
  characterCount: number;
  confidence: PDFParseConfidence;
  warnings: string[];
  preview: string;
  source: PDFExtractionSource;
};
export const MAX_SERVER_PDF_SIZE_BYTES = 5 * 1024 * 1024;

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
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const mappedItems: PDFTextItem[] = content.items
      .map(mapPDFItemToTextItem)
      .filter((item): item is PDFTextItem => item !== null);

    const pageText = reconstructPDFPageText(mappedItems, viewport.width || 600);
    pageTexts.push(pageText);
    page.cleanup();
  }

  const text = pageTexts.filter(Boolean).join("\n\n").trim();
  const characterCount = text.length;
  const quality = analyzePDFTextQuality(text, pdf.numPages);

  return {
    text,
    pageCount: pdf.numPages,
    characterCount,
    confidence: quality.confidence,
    warnings: quality.warnings,
    preview: text.slice(0, 600),
    source: "client",
  };
}

export function getPDFParseConfidence(characterCount: number, averageCharsPerPage: number): PDFParseConfidence {
  const quality = analyzePDFTextQuality("A".repeat(characterCount), averageCharsPerPage > 0 ? Math.ceil(characterCount / averageCharsPerPage) : 1);
  return quality.confidence;
}

export function getPDFParseWarnings(confidence: PDFParseConfidence, characterCount: number, averageCharsPerPage: number): string[] {
  const quality = analyzePDFTextQuality("A".repeat(characterCount), averageCharsPerPage > 0 ? Math.ceil(characterCount / averageCharsPerPage) : 1);
  return quality.warnings;
}
