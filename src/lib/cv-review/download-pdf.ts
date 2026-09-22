import { jsPDF } from "jspdf";
import { SECTION_DEFINITIONS, type CVReviewResult, type ReviewLanguage, type SectionKey } from "./types";

export type GeneratePdfOptions = {
  result: CVReviewResult;
  language: ReviewLanguage;
  reviewId?: string;
  targetRole?: string;
};

export type DownloadPdfOptions = GeneratePdfOptions & {
  filename?: string;
};

const sectionTitles: Record<string, Record<ReviewLanguage, string>> = {
  overallImpression: { en: "Overall Impression", id: "Kesan Keseluruhan" },
  contactInformation: { en: "Contact Information", id: "Informasi Kontak" },
  relevantSkills: { en: "Relevant Skills", id: "Skill Relevan" },
  professionalSummary: { en: "Professional Summary", id: "Ringkasan Profesional" },
  workExperience: { en: "Work Experience", id: "Pengalaman Kerja" },
  achievements: { en: "Achievements", id: "Pencapaian" },
  educationCertification: { en: "Education & Certification", id: "Pendidikan & Sertifikasi" },
  organizationalActivity: { en: "Organization & Volunteer", id: "Organisasi & Volunteer" },
  writingConsistency: { en: "Writing, Grammar & Formatting", id: "Penulisan, Grammar & Format" },
  additionalSection: { en: "Additional Sections", id: "Section Tambahan" },
};

export function generateReviewPdf({
  result,
  language,
  reviewId,
  targetRole,
}: GeneratePdfOptions): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2; // 182mm
  let y = 14;

  const isId = language === "id";

  function checkPageBreak(neededHeight: number) {
    if (y + neededHeight > pageHeight - 16) {
      doc.addPage();
      y = 16;
      drawRunningHeader();
    }
  }

  function drawRunningHeader() {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("HIREFIT • CV & ATS REVIEW REPORT", marginX, 10);
    if (reviewId) {
      doc.text(`ID: ${reviewId}`, pageWidth - marginX, 10, { align: "right" });
    }
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginX, 12, pageWidth - marginX, 12);
  }

  // 1. Header Banner
  doc.setFillColor(23, 21, 47); // Deep Navy
  doc.roundedRect(marginX, y, contentWidth, 26, 3, 3, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("HIREFIT", marginX + 6, y + 9);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(199, 210, 254);
  const reportTitle = isId ? "Laporan Analisis CV & Kesiapan ATS" : "CV Review & ATS Readiness Report";
  doc.text(reportTitle, marginX + 6, y + 16);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  const dateStr = new Date().toLocaleDateString(isId ? "id-ID" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  doc.text(dateStr, pageWidth - marginX - 6, y + 9, { align: "right" });

  if (targetRole) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(199, 210, 254);
    doc.text(`Target: ${targetRole}`, pageWidth - marginX - 6, y + 16, { align: "right" });
  }

  y += 31;

  // 2. Overall Score & Executive Summary
  checkPageBreak(40);
  doc.setFillColor(242, 240, 255); // Light Purple Fill
  doc.setDrawColor(218, 214, 254);
  doc.roundedRect(marginX, y, contentWidth, 34, 3, 3, "FD");

  // Score Badge
  const score = result.overallScore;
  let scoreColor: [number, number, number] = [16, 185, 129]; // Green
  let scoreLabel = isId ? "Sangat Baik" : "Excellent";
  if (score < 50) {
    scoreColor = [225, 29, 72]; // Rose
    scoreLabel = isId ? "Kritis" : "Critical";
  } else if (score < 70) {
    scoreColor = [217, 119, 6]; // Amber
    scoreLabel = isId ? "Perlu Perbaikan" : "Needs Work";
  } else if (score < 85) {
    scoreColor = [6, 182, 212]; // Teal
    scoreLabel = isId ? "Baik" : "Good";
  }

  doc.setFillColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  doc.roundedRect(marginX + 5, y + 5, 34, 24, 2, 2, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(`${score}`, marginX + 22, y + 16, { align: "center" });

  doc.setFontSize(7);
  doc.text(`/ 100 • ${scoreLabel}`, marginX + 22, y + 23, { align: "center" });

  // Summary Text
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(isId ? "Ringkasan Eksekutif" : "Executive Summary", marginX + 44, y + 9);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const summaryLines = doc.splitTextToSize(result.summary, contentWidth - 48);
  doc.text(summaryLines.slice(0, 4), marginX + 44, y + 15);

  y += 39;

  // 3. ATS Warnings (if present)
  if (result.atsWarnings.length > 0) {
    checkPageBreak(25);
    doc.setFillColor(254, 243, 199); // Amber
    doc.setDrawColor(251, 191, 36);
    const warningLines = result.atsWarnings.map((w) => `• ${w}`);
    const wrappedWarnings = doc.splitTextToSize(warningLines.join("\n"), contentWidth - 12);
    const warningBoxHeight = Math.max(20, wrappedWarnings.length * 4.2 + 10);

    doc.roundedRect(marginX, y, contentWidth, warningBoxHeight, 2, 2, "FD");

    doc.setTextColor(146, 64, 14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(isId ? "Peringatan & Catatan Kesiapan ATS" : "ATS Warnings & Readiness Notes", marginX + 5, y + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(wrappedWarnings, marginX + 5, y + 12);

    y += warningBoxHeight + 5;
  }

  // 4. Priority Action Checklist
  checkPageBreak(35);
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, y, contentWidth, 38, 2, 2, "FD");

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(isId ? "5 Langkah Perbaikan Prioritas Utama" : "Top 5 Priority Action Steps", marginX + 5, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);

  let planY = y + 12;
  for (let i = 0; i < result.priorityPlan.length; i++) {
    const planItem = result.priorityPlan[i];
    doc.setFont("helvetica", "bold");
    doc.setTextColor(99, 91, 255);
    doc.text(`[ ${i + 1} ]`, marginX + 5, planY);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    const splitPlan = doc.splitTextToSize(planItem, contentWidth - 22);
    doc.text(splitPlan[0] ?? planItem, marginX + 16, planY);
    planY += 5;
  }

  y += 43;

  // 5. Actionable CV Modification & Suggestion Guide
  checkPageBreak(25);
  doc.setFillColor(99, 91, 255);
  doc.roundedRect(marginX, y, contentWidth, 8, 1.5, 1.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(
    isId ? "PANDUAN MODIFIKASI & REVISI CV (ACTIONABLE SUGGESTIONS)" : "ACTIONABLE CV MODIFICATION & REWRITE GUIDE",
    marginX + 4,
    y + 5.5,
  );
  y += 12;

  // Missing Keywords Box
  if (result.keywords.missingKeywords.length > 0) {
    checkPageBreak(25);
    doc.setFillColor(236, 253, 245); // Light Emerald
    doc.setDrawColor(167, 243, 208);
    const kwText = result.keywords.missingKeywords.join("  •  ");
    const wrappedKw = doc.splitTextToSize(kwText, contentWidth - 10);
    const kwHeight = Math.max(16, wrappedKw.length * 4.2 + 10);

    doc.roundedRect(marginX, y, contentWidth, kwHeight, 2, 2, "FD");

    doc.setTextColor(6, 95, 70);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(
      isId ? "Kata Kunci yang Wajib Ditambahkan ke CV:" : "Critical Keywords to Add into Skills & Experience:",
      marginX + 4,
      y + 5.5,
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(wrappedKw, marginX + 4, y + 11);
    y += kwHeight + 5;
  }

  // Section-by-Section Action Points & Rewrite Examples
  for (const { key, title } of SECTION_DEFINITIONS) {
    const section = result.sections[key as SectionKey];
    if (!section) continue;

    const hasExamples = section.examples.length > 0;
    const hasActions = section.actionPoints.length > 0;
    const hasProblems = section.problemsFound.length > 0;

    if (!hasExamples && !hasActions && !hasProblems) continue;

    // Estimate needed block height
    const blockHeight = 22 + (hasExamples ? 16 : 0) + (hasActions ? 10 : 0);
    checkPageBreak(blockHeight);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(marginX, y, contentWidth, 7, 1, 1, "FD");

    const localizedTitle = sectionTitles[key]?.[language] ?? title;
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(localizedTitle, marginX + 3, y + 4.8);

    if (section.score !== null) {
      doc.setFontSize(8);
      doc.setTextColor(99, 91, 255);
      doc.text(`${section.score}/100`, pageWidth - marginX - 3, y + 4.8, { align: "right" });
    }

    y += 9;

    // Issue found & recommended actions
    if (section.problemsFound.length > 0) {
      checkPageBreak(8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(190, 18, 60); // Rose
      doc.text(isId ? "Masalah Terdeteksi:" : "Issue Identified:", marginX + 3, y + 3);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      const probText = doc.splitTextToSize(section.problemsFound[0], contentWidth - 40);
      doc.text(probText[0], marginX + 36, y + 3);
      y += 5.5;
    }

    if (section.actionPoints.length > 0) {
      checkPageBreak(10);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(67, 56, 202); // Indigo
      doc.text(isId ? "Rekomendasi Revisi:" : "Recommended Action:", marginX + 3, y + 3);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      const actionText = doc.splitTextToSize(section.actionPoints.slice(0, 2).join(" • "), contentWidth - 40);
      doc.text(actionText[0], marginX + 36, y + 3);
      y += 5.5;
    }

    // Rewrite Examples (STAR Method Box)
    if (section.examples.length > 0) {
      checkPageBreak(16);
      doc.setFillColor(254, 243, 199);
      doc.setDrawColor(252, 211, 77);
      const exLines = doc.splitTextToSize(section.examples[0], contentWidth - 10);
      const exHeight = Math.max(12, exLines.length * 3.8 + 6);

      doc.roundedRect(marginX, y, contentWidth, exHeight, 1.5, 1.5, "FD");

      doc.setTextColor(146, 64, 14);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.text(isId ? "CONTOH REVISI KALIMAT (STAR METHOD):" : "READY-TO-USE REWRITE EXAMPLE (STAR METHOD):", marginX + 3, y + 4);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);
      doc.text(exLines, marginX + 3, y + 8.5);

      y += exHeight + 4;
    }

    y += 2;
  }

  // 6. Role-Targeted Sections (if present)
  if (result.jobFit || result.tailoredContent) {
    checkPageBreak(30);
    doc.setFillColor(243, 232, 255);
    doc.setDrawColor(216, 180, 254);
    doc.roundedRect(marginX, y, contentWidth, 7, 1.5, 1.5, "FD");
    doc.setTextColor(107, 33, 168);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(isId ? "OPTIMASI SESUAI TARGET ROLE" : "ROLE-TARGETED OPTIMIZATION", marginX + 4, y + 4.8);
    y += 10;

    if (result.jobFit) {
      checkPageBreak(12);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(isId ? "Kesesuaian dengan Job Description:" : "Job Description Fit:", marginX + 3, y + 3);
      doc.setFont("helvetica", "normal");
      const fitText = doc.splitTextToSize(result.jobFit.analysis, contentWidth - 6);
      doc.text(fitText.slice(0, 2), marginX + 3, y + 7.5);
      y += 13;
    }
  }

  // 7. Career Next Steps
  if (result.careerRecommendation.nextSteps.length > 0) {
    checkPageBreak(25);
    doc.setFillColor(240, 253, 250);
    doc.setDrawColor(153, 246, 228);
    doc.roundedRect(marginX, y, contentWidth, 22, 2, 2, "FD");

    doc.setTextColor(17, 94, 89);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(isId ? "Langkah Karier Berikutnya" : "Next Career Steps", marginX + 4, y + 5.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    const steps = result.careerRecommendation.nextSteps.slice(0, 3).map((s) => `• ${s}`);
    doc.text(steps, marginX + 4, y + 11);
    y += 26;
  }

  // Page Numbers Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(marginX, pageHeight - 11, pageWidth - marginX, pageHeight - 11);

    doc.text("HireFit • Professional CV & ATS Review", marginX, pageHeight - 7);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - marginX, pageHeight - 7, { align: "right" });
  }

  return doc;
}

export function downloadReviewPdf(options: DownloadPdfOptions): void {
  const doc = generateReviewPdf(options);
  const filename =
    options.filename ??
    (options.reviewId ? `HireFit-CV-Review-${options.reviewId}.pdf` : "HireFit-CV-Review.pdf");
  doc.save(filename);
}
