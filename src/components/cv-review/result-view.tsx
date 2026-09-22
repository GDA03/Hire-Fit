import type { CVReviewResult, ReviewLanguage } from "@/lib/cv-review/types";
import { KeywordPanel } from "./keyword-panel";
import { PriorityPlan } from "./priority-plan";
import { RewriteCard } from "./rewrite-card";
import { ScoreCircle } from "./score-circle";
import { SectionAccordion } from "./section-accordion";
import { CVModificationGuide } from "./cv-modification-guide";
type ResultViewProps = {
  result: CVReviewResult;
  language: ReviewLanguage;
};

function OptionalSection({ title, section, language }: { title: string; section?: CVReviewResult["jobFit"]; language: ReviewLanguage }) {
  if (!section) return null;

  const t = copy[language];

  return (
    <div className="result-motion-card rounded-[1.75rem] border border-white/80 bg-white/75 p-5 shadow-xl shadow-slate-900/5 backdrop-blur">
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <ScoreCircle score={section.score} label={title} size="sm" />
        <div className="flex-1 space-y-4">
          <div>
            <h3 className="text-lg font-black text-slate-950">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{section.analysis}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-cyan-100 bg-cyan-50/70 p-4">
              <h4 className="font-black text-cyan-900">{t.actionPoints}</h4>
              <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
                {section.actionPoints.map((item, index) => (
                  <li key={`${title}-action-${index}`}>• {item}</li>
                ))}
              </ul>
            </div>
            <RewriteCard title={language === "id" ? "Contoh" : "Examples"} items={section.examples} />
          </div>
        </div>
      </div>
    </div>
  );
}

const copy = {
  en: {
    overallScore: "Overall score",
    summary: "Summary",
    atsWarnings: "ATS warnings",
    priorityPlan: "Priority action plan",
    careerRecommendations: "Career recommendations",
    recommendedRoles: "Recommended roles",
    recommendedIndustries: "Recommended industries",
    nextSteps: "Next steps",
    noItems: "No items returned.",
    jobFit: "Job fit",
    tailoredContent: "Tailored content",
    experienceMatch: "Experience match",
    actionPoints: "Action points",
  },
  id: {
    overallScore: "Skor keseluruhan",
    summary: "Ringkasan",
    atsWarnings: "Peringatan ATS",
    priorityPlan: "Rencana prioritas",
    careerRecommendations: "Rekomendasi karier",
    recommendedRoles: "Rekomendasi role",
    recommendedIndustries: "Rekomendasi industri",
    nextSteps: "Langkah berikutnya",
    noItems: "Tidak ada item.",
    jobFit: "Kecocokan role",
    tailoredContent: "Konten yang disesuaikan",
    experienceMatch: "Kecocokan pengalaman",
    actionPoints: "Poin aksi",
  },
};

export function ResultView({ result, language }: ResultViewProps) {
  const t = copy[language];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        <div className="result-motion-card rounded-[1.75rem] border border-white/80 bg-gradient-to-br from-cyan-50 via-white to-pink-50 p-6 shadow-xl shadow-cyan-900/5">
          <ScoreCircle score={result.overallScore} label={t.overallScore} />
        </div>
        <div className="result-motion-card space-y-4 rounded-[1.75rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-900/5 backdrop-blur" style={{ animationDelay: "80ms" }}>
          <div>
            <h3 className="text-xl font-black text-slate-950">{t.summary}</h3>
            <p className="mt-3 leading-7 text-slate-600">{result.summary}</p>
          </div>
          {result.atsWarnings.length > 0 && (
            <div className="rounded-3xl border border-amber-200 bg-amber-50/80 p-4 shadow-inner shadow-amber-100/60">
              <h4 className="font-black text-amber-900">{t.atsWarnings}</h4>
              <ul className="mt-2 space-y-2 text-sm leading-6 text-amber-900/80">
                {result.atsWarnings.map((warning, index) => (
                  <li key={`ats-${index}`}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="result-motion-card" style={{ animationDelay: "140ms" }}><PriorityPlan title={t.priorityPlan} items={result.priorityPlan} /></div>
      <div className="result-motion-card" style={{ animationDelay: "200ms" }}><SectionAccordion sections={result.sections} language={language} /></div>
      <div className="result-motion-card" style={{ animationDelay: "260ms" }}><KeywordPanel keywords={result.keywords} language={language} /></div>
      <div className="result-motion-card" style={{ animationDelay: "290ms" }}><CVModificationGuide result={result} language={language} /></div>
      <div className="result-motion-card rounded-[1.75rem] border border-white/80 bg-gradient-to-br from-white via-cyan-50/70 to-pink-50/70 p-5 shadow-xl shadow-slate-900/5" style={{ animationDelay: "320ms" }}>
        <h3 className="text-lg font-black text-slate-950">{t.careerRecommendations}</h3>
        <p className="mt-3 text-sm leading-6 text-slate-600">{result.careerRecommendation.summary}</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <RecommendationList title={t.recommendedRoles} items={result.careerRecommendation.recommendedRoles} emptyText={t.noItems} />
          <RecommendationList title={t.recommendedIndustries} items={result.careerRecommendation.recommendedIndustries} emptyText={t.noItems} />
          <RecommendationList title={t.nextSteps} items={result.careerRecommendation.nextSteps} emptyText={t.noItems} />
        </div>
      </div>

      <OptionalSection title={t.jobFit} section={result.jobFit} language={language} />
      <OptionalSection title={t.tailoredContent} section={result.tailoredContent} language={language} />
      <OptionalSection title={t.experienceMatch} section={result.experienceMatch} language={language} />
    </div>
  );
}

function RecommendationList({ title, items, emptyText }: { title: string; items: string[]; emptyText: string }) {
  return (
    <div className="rounded-3xl border border-white/80 bg-white/70 p-4 shadow-sm shadow-slate-900/5">
      <h4 className="font-black text-cyan-900">{title}</h4>
      {items.length > 0 ? (
        <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
          {items.map((item, index) => (
            <li key={`${title}-${index}`}>• {item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-slate-500">{emptyText}</p>
      )}
    </div>
  );
}
