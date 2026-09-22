import type { PDFParseConfidence } from "./pdf-extraction";

export type ATSCheckSeverity = "info" | "warning" | "critical";

export type ATSCheck = {
  id: string;
  severity: ATSCheckSeverity;
  title: string;
  detail: string;
  suggestion: string;
};

export type ATSCheckInput = {
  cvText: string;
  fileName?: string;
  parseConfidence?: PDFParseConfidence;
  jobDescription?: string;
};

export type ATSSignals = {
  characterCount: number;
  hasEmail: boolean;
  hasPhone: boolean;
  hasProfessionalLink: boolean;
  detectedHeadings: string[];
  missingHeadings: string[];
  missingKeywords: string[];
};

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/;
const LINKEDIN_RE = /linkedin\.com\//i;
const PORTFOLIO_RE = /(github\.com\/|behance\.net\/|dribbble\.com\/|portfolio|vercel\.app|netlify\.app)/i;
const SECTION_HEADINGS = ["experience", "education", "skills", "projects", "summary"];

export function buildATSSignals(input: { cvText: string; jobDescription?: string }): ATSSignals {
  const text = input.cvText.trim();
  const lower = text.toLowerCase();
  const hasEmail = EMAIL_RE.test(text);
  const hasPhone = PHONE_RE.test(text);
  const hasProfessionalLink = LINKEDIN_RE.test(text) || PORTFOLIO_RE.test(text);
  const detectedHeadings = SECTION_HEADINGS.filter((heading) => lower.includes(heading));
  const missingHeadings = SECTION_HEADINGS.filter((heading) => !lower.includes(heading));
  const missingKeywords = getMissingJDKeywords(text, input.jobDescription);

  return {
    characterCount: text.length,
    hasEmail,
    hasPhone,
    hasProfessionalLink,
    detectedHeadings,
    missingHeadings,
    missingKeywords,
  };
}

export function runATSChecks(input: ATSCheckInput): ATSCheck[] {
  const signals = buildATSSignals({ cvText: input.cvText, jobDescription: input.jobDescription });
  const checks: ATSCheck[] = [];

  if (signals.characterCount < 50) {
    checks.push({
      id: "cv-too-short",
      severity: "critical",
      title: "CV text is too short",
      detail: "Less than 50 readable characters are available for review.",
      suggestion: "Paste the full CV text manually or upload an ATS-readable PDF.",
    });
  } else if (signals.characterCount < 500) {
    checks.push({
      id: "cv-low-text",
      severity: "warning",
      title: "CV text may be incomplete",
      detail: `Only ${signals.characterCount.toLocaleString()} characters are available for review.`,
      suggestion: "Review extracted text and paste missing sections before submitting.",
    });
  }

  if (input.parseConfidence === "poor") {
    checks.push({
      id: "poor-parse-confidence",
      severity: "critical",
      title: "PDF extraction confidence is poor",
      detail: "The PDF may be image-based or contain text that ATS systems cannot read reliably.",
      suggestion: "Use the server extraction fallback or paste text manually.",
    });
  }

  if (!signals.hasEmail) {
    checks.push({
      id: "missing-email",
      severity: "critical",
      title: "Email not detected",
      detail: "Recruiters and ATS systems need a readable email address.",
      suggestion: "Add a professional email near the top of your CV.",
    });
  }

  if (!signals.hasPhone) {
    checks.push({
      id: "missing-phone",
      severity: "warning",
      title: "Phone number not detected",
      detail: "A phone number makes recruiter follow-up easier.",
      suggestion: "Add a reachable phone number with country code if applying internationally.",
    });
  }

  if (!signals.hasProfessionalLink) {
    checks.push({
      id: "missing-professional-link",
      severity: "info",
      title: "Professional link not detected",
      detail: "No LinkedIn, GitHub, portfolio, or similar profile was found.",
      suggestion: "Add a relevant profile link if it strengthens your application.",
    });
  }

  if (signals.missingHeadings.length >= 3) {
    checks.push({
      id: "missing-section-headings",
      severity: "warning",
      title: "Common CV headings are missing",
      detail: `Missing or unreadable headings include: ${signals.missingHeadings.join(", ")}.`,
      suggestion: "Use clear headings such as Summary, Experience, Education, Skills, and Projects.",
    });
  }

  if (input.fileName && !isProfessionalFileName(input.fileName)) {
    checks.push({
      id: "filename-professionalism",
      severity: "info",
      title: "Filename could be more professional",
      detail: `Current filename: ${input.fileName}`,
      suggestion: "Use a filename like Firstname-Lastname-CV.pdf or Firstname-Lastname-Resume.pdf.",
    });
  }

  if (signals.missingKeywords.length > 0) {
    checks.push({
      id: "missing-jd-keywords",
      severity: "warning",
      title: "Some job description keywords are missing",
      detail: `Potential missing terms: ${signals.missingKeywords.slice(0, 8).join(", ")}.`,
      suggestion: "Add truthful evidence for relevant missing keywords if you have that experience.",
    });
  }

  return sortATSChecks(checks);
}

function isProfessionalFileName(fileName: string) {
  const clean = fileName.toLowerCase();
  if (/final|finalfinal|new|copy|scan|screenshot|untitled/.test(clean)) return false;
  return /cv|resume/.test(clean) && /^[a-z0-9._ -]+$/i.test(fileName);
}

function getMissingJDKeywords(cvText: string, jobDescription?: string) {
  if (!jobDescription?.trim()) return [];

  const cv = new Set(cvText.toLowerCase().split(/[^a-z0-9+#.]+/).filter((word) => word.length >= 4));
  const jdWords = jobDescription.toLowerCase().split(/[^a-z0-9+#.]+/).filter((word) => word.length >= 4);
  const uniqueJDWords = Array.from(new Set(jdWords));
  const stopWords = new Set(["with", "that", "this", "from", "have", "will", "your", "their", "they", "them", "work", "role", "team", "able"]);

  return uniqueJDWords.filter((word) => !stopWords.has(word) && !cv.has(word)).slice(0, 12);
}

function sortATSChecks(checks: ATSCheck[]) {
  const weight: Record<ATSCheckSeverity, number> = { critical: 0, warning: 1, info: 2 };
  return checks.sort((a, b) => weight[a.severity] - weight[b.severity]);
}
