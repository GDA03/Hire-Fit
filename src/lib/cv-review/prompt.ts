import type { ATSSignals } from "./ats-checks";
import type { AnalyzeRequest } from "./types";

const sectionShape = `{ "score": 0, "analysis": "string", "whatWorks": ["string"], "problemsFound": ["string"], "actionPoints": ["string"], "whyImportant": "string", "examples": ["string"], "priority": "high" }`;

const targetedSectionShape = `,
  "jobFit": ${sectionShape},
  "tailoredContent": ${sectionShape},
  "experienceMatch": ${sectionShape}`;

export function buildCVReviewPrompt(request: AnalyzeRequest, signals: ATSSignals) {
  const languageName = request.language === "id" ? "Bahasa Indonesia" : "English";
  const hasJobTarget = Boolean(request.jobRole || request.jobDescription);
  const targetedSectionRule = hasJobTarget
    ? '- Include "jobFit", "tailoredContent", and "experienceMatch" sections with identical section shape because target role or job description was provided.'
    : '- Do not include "jobFit", "tailoredContent", or "experienceMatch" because no target role or job description was provided.';
  const targetedSections = hasJobTarget ? targetedSectionShape : "";

  return `You are HireFit's expert ATS resume reviewer and recruiter coach.
Analyze the CV for ATS readiness, recruiter readability, and high-impact improvement.

Context:
- Output language: ${languageName}
- Review purpose: ${request.purpose}
- Target role: ${request.jobRole ?? "Not provided"}
- Scholarship title: ${request.scholarshipTitle ?? "Not provided"}
- Job description provided: ${request.jobDescription ? "Yes" : "No"}

Deterministic ATS Observations (facts: do not contradict or invent missing contact details):
- Character count: ${signals.characterCount}
- Email detected: ${signals.hasEmail ? "Yes" : "No"}
- Phone detected: ${signals.hasPhone ? "Yes" : "No"}
- Professional profile/portfolio link: ${signals.hasProfessionalLink ? "Yes" : "No"}
- Detected standard headings: ${signals.detectedHeadings.length > 0 ? signals.detectedHeadings.join(", ") : "None"}
- Missing standard headings: ${signals.missingHeadings.length > 0 ? signals.missingHeadings.join(", ") : "None"}
${request.jobDescription ? `- Missing job description keywords: ${signals.missingKeywords.length > 0 ? signals.missingKeywords.join(", ") : "None detected"}` : "- Job description not provided: do not evaluate or invent missing job description keywords."}

Rules:
- Return valid JSON only. No markdown. No code fences. Start with { and end with }.
- Every analysis, warning, list item, keyword, recommendation, and example must use ${languageName}.
- Never fabricate experience, skills, metrics, employers, education, or credentials.
- Example rewrites must only use facts present in the CV.
- Scores must be integers from 0 to 100. Use null only if a section is truly not applicable.
- Use score rubric: 90-100 excellent, 75-89 good, 60-74 passable, 40-59 weak, 0-39 critical/missing.
- Output bounds:
  - atsWarnings: 3 to 4 concise items explaining ATS readiness in ${languageName}.
  - priorityPlan: exactly 5 high-impact actionable fixes in order of priority.
  - sections: 1-2 whatWorks, 1-2 problemsFound, 2-3 actionPoints, 0-1 examples.
  - keywords: at most 8 items per array.
  - careerRecommendation: at most 4 recommendedRoles, 4 recommendedIndustries, and 4 nextSteps.
  - targeted sections (when requested): same compact section bounds.
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
