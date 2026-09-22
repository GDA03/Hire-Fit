import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

export type DownloadPdfOptions = {
  elementId?: string;
  filename?: string;
};

export async function downloadReviewPdf({
  elementId = "review-result-content",
  filename = "HireFit-CV-Review.pdf",
}: DownloadPdfOptions = {}): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const targetElement = document.getElementById(elementId);
  if (!targetElement) {
    throw new Error(`Element with id "${elementId}" not found.`);
  }

  // Save previous open state of details elements and open them all for full capture
  const detailsElements = targetElement.querySelectorAll<HTMLDetailsElement>("details");
  const previousOpenStates: boolean[] = [];
  detailsElements.forEach((detail) => {
    previousOpenStates.push(detail.open);
    detail.open = true;
  });

  try {
    const canvas = await html2canvas(targetElement, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: Math.max(targetElement.scrollWidth, 1024),
    });

    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;

    const pdf = new jsPDF("p", "mm", "a4");
    let position = 0;
    const imgData = canvas.toDataURL("image/png");

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pageHeight;
    }

    pdf.save(filename);
  } finally {
    // Restore previous details open states
    detailsElements.forEach((detail, index) => {
      detail.open = previousOpenStates[index] ?? false;
    });
  }
}
