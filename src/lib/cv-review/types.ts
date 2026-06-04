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

export type SectionResult = {
  score: number | null;
  analysis: string;
  whatWorks: string[];
  problemsFound: string[];
  actionPoints: string[];
  whyImportant: string;
  examples: string[];
  priority: SectionPriority;
};

export type KeywordResult = {
  jobTitles: string[];
  skills: string[];
  careerPaths: string[];
  professionalSummaryKeywords: string[];
  additionalKeywords: string[];
  missingKeywords: string[];
};

export type CareerRecommendationResult = {
  summary: string;
  recommendedRoles: string[];
  recommendedIndustries: string[];
  nextSteps: string[];
};

export type CVReviewResult = {
  overallScore: number;
  summary: string;
  atsWarnings: string[];
  priorityPlan: string[];
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

export type ReviewStatus = 'pending' | 'completed' | 'failed';

export type ReviewState = {
  status: ReviewStatus;
  result?: CVReviewResult;
  error?: string;
  createdAt: number;
  updatedAt: number;
};
