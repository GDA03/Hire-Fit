import { NextResponse } from "next/server";
import {
  MAX_SERVER_PDF_SIZE_BYTES,
  type PDFExtractionResult,
} from "@/lib/cv-review/pdf-extraction";
import {
  analyzePDFTextQuality,
  mapPDFItemToTextItem,
  reconstructPDFPageText,
  type PDFTextItem,
} from "@/lib/cv-review/pdf-text";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "PDF file is required." }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Upload a PDF file only." }, { status: 400 });
    }

    if (file.size > MAX_SERVER_PDF_SIZE_BYTES) {
      return NextResponse.json({ error: "PDF must be 5MB or smaller." }, { status: 400 });
    }

    const result = await extractServerPDF(file);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Server PDF extraction error", error);
    return NextResponse.json(
      { error: "Could not extract text from this PDF. Paste CV text manually instead." },
      { status: 500 },
    );
  }
}

async function extractServerPDF(file: File): Promise<PDFExtractionResult> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "";
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pageTexts: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const mappedItems: PDFTextItem[] = content.items
      .map(mapPDFItemToTextItem)
      .filter((item): item is PDFTextItem => item !== null);

    const text = reconstructPDFPageText(mappedItems, viewport.width || 600);
    pageTexts.push(text);
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
    source: "server",
  };
}
