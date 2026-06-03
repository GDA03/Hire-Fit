import type { AnalyzeRequest } from "./types";

export function buildCVReviewPrompt(request: AnalyzeRequest) {
  const languageName = request.language === "id" ? "Bahasa Indonesia" : "English";
  const hasJobTarget = Boolean(request.jobRole || request.jobDescription);

  return `You are HireFit's expert ATS resume reviewer and recruiter coach.
Analyze the CV for ATS readiness, recruiter readability, and practical improvement.

Output language: ${languageName}.
Review purpose: ${request.purpose}.
Target role: ${request.jobRole ?? "Not provided"}.
Scholarship title: ${request.scholarshipTitle ?? "Not provided"}.
Job description provided: ${request.jobDescription ? "Yes" : "No"}.

Rules:
- Return valid JSON only. No markdown. No code fences.
- Never fabricate experience, skills, metrics, employers, education, or credentials.
- Example rewrites must only use facts present in the CV.
- Scores must be integers from 0 to 100. Use null only if a section is truly not applicable.
- Use score rubric: 90-100 excellent, 75-89 good, 60-74 passable, 40-59 weak, 0-39 critical/missing.
- priorityPlan must contain exactly 5 high-impact fixes.
- atsWarnings must contain 3 to 6 concise warnings or confirmations.
- Each normal section must include 2-4 whatWorks, 2-4 problemsFound, 3-5 actionPoints, 1-3 examples.
- Include jobFit, tailoredContent, and experienceMatch only when target role or job description exists: ${hasJobTarget}.

Return this exact JSON shape:
{
  "overallScore": 0,
  "summary": "string",
  "atsWarnings": ["string"],
  "priorityPlan": ["string", "string", "string", "string", "string"],
  "sections": {
    "overallImpression": { "score": 0, "analysis": "string", "whatWorks": ["string"], "problemsFound": ["string"], "actionPoints": ["string"], "whyImportant": "string", "examples": ["string"], "priority": "high" },
    "contactInformation": { "score": 0, "analysis": "string", "whatWorks": ["string"], "problemsFound": ["string"], "actionPoints": ["string"], "whyImportant": "string", "examples": ["string"], "priority": "high" },
    "relevantSkills": { "score": 0, "analysis": "string", "whatWorks": ["string"], "problemsFound": ["string"], "actionPoints": ["string"], "whyImportant": "string", "examples": ["string"], "priority": "high" },
    "professionalSummary": { "score": 0, "analysis": "string", "whatWorks": ["string"], "problemsFound": ["string"], "actionPoints": ["string"], "whyImportant": "string", "examples": ["string"], "priority": "medium" },
    "workExperience": { "score": 0, "analysis": "string", "whatWorks": ["string"], "problemsFound": ["string"], "actionPoints": ["string"], "whyImportant": "string", "examples": ["string"], "priority": "high" },
    "achievements": { "score": 0, "analysis": "string", "whatWorks": ["string"], "problemsFound": ["string"], "actionPoints": ["string"], "whyImportant": "string", "examples": ["string"], "priority": "high" },
    "educationCertification": { "score": 0, "analysis": "string", "whatWorks": ["string"], "problemsFound": ["string"], "actionPoints": ["string"], "whyImportant": "string", "examples": ["string"], "priority": "medium" },
    "organizationalActivity": { "score": 0, "analysis": "string", "whatWorks": ["string"], "problemsFound": ["string"], "actionPoints": ["string"], "whyImportant": "string", "examples": ["string"], "priority": "low" },
    "writingConsistency": { "score": 0, "analysis": "string", "whatWorks": ["string"], "problemsFound": ["string"], "actionPoints": ["string"], "whyImportant": "string", "examples": ["string"], "priority": "medium" },
    "additionalSection": { "score": 0, "analysis": "string", "whatWorks": ["string"], "problemsFound": ["string"], "actionPoints": ["string"], "whyImportant": "string", "examples": ["string"], "priority": "low" }
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
  },
  "jobFit": { "score": 0, "analysis": "string", "whatWorks": ["string"], "problemsFound": ["string"], "actionPoints": ["string"], "whyImportant": "string", "examples": ["string"], "priority": "high" },
  "tailoredContent": { "score": 0, "analysis": "string", "whatWorks": ["string"], "problemsFound": ["string"], "actionPoints": ["string"], "whyImportant": "string", "examples": ["string"], "priority": "high" },
  "experienceMatch": { "score": 0, "analysis": "string", "whatWorks": ["string"], "problemsFound": ["string"], "actionPoints": ["string"], "whyImportant": "string", "examples": ["string"], "priority": "high" }
}

CV text:
${request.cvText}

Job description:
${request.jobDescription ?? "Not provided"}`;
}
