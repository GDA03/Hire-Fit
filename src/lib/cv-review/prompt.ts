import type { AnalyzeRequest } from "./types";

const sectionShape = `{ "score": 0, "analysis": "string", "whatWorks": ["string"], "problemsFound": ["string"], "actionPoints": ["string"], "whyImportant": "string", "examples": ["string"], "priority": "high" }`;

const targetedSectionShape = `,
  "jobFit": ${sectionShape},
  "tailoredContent": ${sectionShape},
  "experienceMatch": ${sectionShape}`;

export function buildCVReviewPrompt(request: AnalyzeRequest) {
  const languageName = request.language === "id" ? "Bahasa Indonesia" : "English";
  const hasJobTarget = Boolean(request.jobRole || request.jobDescription);
  const targetedSectionRule = hasJobTarget
    ? "- Include jobFit, tailoredContent, and experienceMatch because a target role or job description exists."
    : "- Do not include jobFit, tailoredContent, or experienceMatch because no target role or job description exists.";
  const targetedSections = hasJobTarget ? targetedSectionShape : "";

  return `You are HireFit's expert ATS resume reviewer and recruiter coach.
Analyze the CV for ATS readiness, recruiter readability, and practical improvement.

Output language: ${languageName}.
Review purpose: ${request.purpose}.
Target role: ${request.jobRole ?? "Not provided"}.
Scholarship title: ${request.scholarshipTitle ?? "Not provided"}.
Job description provided: ${request.jobDescription ? "Yes" : "No"}.

Rules:
- Return valid JSON only. No markdown. No code fences.
- Every analysis, warning, list item, keyword, recommendation, and example must use ${languageName}.
- Never fabricate experience, skills, metrics, employers, education, or credentials.
- Example rewrites must only use facts present in the CV.
- Scores must be integers from 0 to 100. Use null only if a section is truly not applicable.
- Use score rubric: 90-100 excellent, 75-89 good, 60-74 passable, 40-59 weak, 0-39 critical/missing.
- priorityPlan must contain exactly 5 high-impact fixes.
- atsWarnings must contain 3 to 6 concise warnings or confirmations.
- Each normal section must include 2-4 whatWorks, 2-4 problemsFound, 3-5 actionPoints, 1-3 examples.
${targetedSectionRule}

Return this exact JSON shape:
{
  "overallScore": 0,
  "summary": "string",
  "atsWarnings": ["string"],
  "priorityPlan": ["string", "string", "string", "string", "string"],
  "sections": {
    "overallImpression": ${sectionShape},
    "contactInformation": ${sectionShape},
    "relevantSkills": ${sectionShape},
    "professionalSummary": ${sectionShape},
    "workExperience": ${sectionShape},
    "achievements": ${sectionShape},
    "educationCertification": ${sectionShape},
    "organizationalActivity": ${sectionShape},
    "writingConsistency": ${sectionShape},
    "additionalSection": ${sectionShape}
  },
  "keywords": {
    "jobTitles": ["string"],
    "skills": ["string"],
    "careerPaths": ["string"],
    "professionalSummaryKeywords": ["string"],
    "additionalKeywords": ["string"],
    "missingKeywords": ["string"]
  },
  "careerRecommendation": {
    "summary": "string",
    "recommendedRoles": ["string"],
    "recommendedIndustries": ["string"],
    "nextSteps": ["string"]
  }${targetedSections}
}

CV text:
${request.cvText}

Job description:
${request.jobDescription ?? "Not provided"}`;
}
