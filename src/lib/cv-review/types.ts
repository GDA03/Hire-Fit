export const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "id", label: "Bahasa Indonesia" },
] as const;

export const PURPOSES = [
  { value: "job_seeking", label: "Job seeking" },
  { value: "job_scholarship", label: "Job seeking + scholarship" },
  { value: "internship", label: "Internship" },
  { value: "fresh_graduate", label: "Fresh graduate" },
  { value: "career_switch", label: "Career switch" },
] as const;

export type ReviewLanguage = (typeof LANGUAGES)[number]["value"];
export type ReviewPurpose = (typeof PURPOSES)[number]["value"];
export type SectionPriority = "high" | "medium" | "low";

export type AnalyzeRequest = {
  cvText: string;
  language: ReviewLanguage;
  purpose: ReviewPurpose;
  jobRole?: string;
  jobDescription?: string;
  scholarshipTitle?: string;
};

export type LocalizedText = string | { en: string; id: string };

export type SectionResult = {
  score: number | null;
  analysis: LocalizedText;
  whatWorks: LocalizedText[];
  problemsFound: LocalizedText[];
  actionPoints: LocalizedText[];
  whyImportant: LocalizedText;
  examples: LocalizedText[];
  priority: SectionPriority;
};

export type KeywordResult = {
  jobTitles: LocalizedText[];
  skills: LocalizedText[];
  careerPaths: LocalizedText[];
  professionalSummaryKeywords: LocalizedText[];
  additionalKeywords: LocalizedText[];
  missingKeywords: LocalizedText[];
};

export type CareerRecommendationResult = {
  summary: LocalizedText;
  recommendedRoles: LocalizedText[];
  recommendedIndustries: LocalizedText[];
  nextSteps: LocalizedText[];
};

export type CVReviewResult = {
  overallScore: number;
  summary: LocalizedText;
  atsWarnings: LocalizedText[];
  priorityPlan: LocalizedText[];
  sections: Record<SectionKey, SectionResult>;
  keywords: KeywordResult;
  careerRecommendation: CareerRecommendationResult;
  jobFit?: SectionResult;
  tailoredContent?: SectionResult;
  experienceMatch?: SectionResult;
};

export const SECTION_DEFINITIONS = [
  { key: "overallImpression", title: "Overall Impression" },
  { key: "contactInformation", title: "Contact Information" },
  { key: "relevantSkills", title: "Relevant Skills" },
  { key: "professionalSummary", title: "Professional Summary" },
  { key: "workExperience", title: "Work Experience" },
  { key: "achievements", title: "Achievements" },
  { key: "educationCertification", title: "Education & Certification" },
  { key: "organizationalActivity", title: "Organization & Volunteer" },
  { key: "writingConsistency", title: "Writing, Grammar & Formatting" },
  { key: "additionalSection", title: "Additional Sections" },
] as const;

export type SectionKey = (typeof SECTION_DEFINITIONS)[number]["key"];

export const MAX_CV_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export type ReviewStatus = "queued" | "processing" | "completed" | "failed";

export type ReviewState = {
  id: string;
  status: ReviewStatus;
  request: AnalyzeRequest;
  result?: CVReviewResult;
  error?: string;
  createdAt: number;
  updatedAt: number;
};
