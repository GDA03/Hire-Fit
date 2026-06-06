import { CVReviewResult } from "@/lib/cv-review/types";
import { KeywordPanel } from "./keyword-panel";
import { PriorityPlan } from "./priority-plan";
import { RewriteCard } from "./rewrite-card";
import { ScoreCircle } from "./score-circle";
import { SectionAccordion } from "./section-accordion";

type ResultViewProps = {
  result: CVReviewResult;
};

function OptionalSection({ title, section }: { title: string; section?: CVReviewResult["jobFit"] }) {
  if (!section) return null;

  return (
    <div className="rounded-[1.75rem] border border-white/80 bg-white/75 p-5 shadow-xl shadow-slate-900/5 backdrop-blur">
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <ScoreCircle score={section.score} label={title} size="sm" />
        <div className="flex-1 space-y-4">
          <div>
            <h3 className="text-lg font-black text-slate-950">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{section.analysis}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-cyan-100 bg-cyan-50/70 p-4">
              <h4 className="font-black text-cyan-900">Action points</h4>
              <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
                {section.actionPoints.map((item, index) => (
                  <li key={`${title}-action-${index}`}>• {item}</li>
                ))}
              </ul>
            </div>
            <RewriteCard title="Examples" items={section.examples} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ResultView({ result }: ResultViewProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        <div className="rounded-[1.75rem] border border-white/80 bg-gradient-to-br from-cyan-50 via-white to-pink-50 p-6 shadow-xl shadow-cyan-900/5">
          <ScoreCircle score={result.overallScore} label="Overall score" />
        </div>
        <div className="space-y-4 rounded-[1.75rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-slate-900/5 backdrop-blur">
          <div>
            <h3 className="text-xl font-black text-slate-950">Summary</h3>
            <p className="mt-3 leading-7 text-slate-600">{result.summary}</p>
          </div>
          {result.atsWarnings.length > 0 && (
            <div className="rounded-3xl border border-amber-200 bg-amber-50/80 p-4 shadow-inner shadow-amber-100/60">
              <h4 className="font-black text-amber-900">ATS warnings</h4>
              <ul className="mt-2 space-y-2 text-sm leading-6 text-amber-900/80">
                {result.atsWarnings.map((warning, index) => (
                  <li key={`ats-${index}`}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <PriorityPlan items={result.priorityPlan} />
      <SectionAccordion sections={result.sections} />
      <KeywordPanel keywords={result.keywords} />

      <div className="rounded-[1.75rem] border border-white/80 bg-gradient-to-br from-white via-cyan-50/70 to-pink-50/70 p-5 shadow-xl shadow-slate-900/5">
        <h3 className="text-lg font-black text-slate-950">Career recommendations</h3>
        <p className="mt-3 text-sm leading-6 text-slate-600">{result.careerRecommendation.summary}</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <RecommendationList title="Recommended roles" items={result.careerRecommendation.recommendedRoles} />
          <RecommendationList title="Recommended industries" items={result.careerRecommendation.recommendedIndustries} />
          <RecommendationList title="Next steps" items={result.careerRecommendation.nextSteps} />
        </div>
      </div>

      <OptionalSection title="Job fit" section={result.jobFit} />
      <OptionalSection title="Tailored content" section={result.tailoredContent} />
      <OptionalSection title="Experience match" section={result.experienceMatch} />
    </div>
  );
}

function RecommendationList({ title, items }: { title: string; items: string[] }) {
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
        <p className="mt-2 text-sm text-slate-500">No items returned.</p>
      )}
    </div>
  );
}
