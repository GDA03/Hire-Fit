import { SECTION_DEFINITIONS, SectionResult } from "@/lib/cv-review/types";
import { RewriteCard } from "./rewrite-card";
import { ScoreCircle } from "./score-circle";

type SectionAccordionProps = {
  sections: Record<string, SectionResult>;
};

const priorityStyles = {
  high: "border-red-400/40 bg-red-950/30 text-red-100",
  medium: "border-amber-400/40 bg-amber-950/30 text-amber-100",
  low: "border-emerald-400/40 bg-emerald-950/30 text-emerald-100",
};

function ListBlock({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div>
      <h4 className="font-semibold text-slate-100">{title}</h4>
      <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-300">
        {items.map((item, index) => (
          <li key={`${title}-${index}`}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}

export function SectionAccordion({ sections }: SectionAccordionProps) {
  return (
    <div className="space-y-3">
      {SECTION_DEFINITIONS.map(({ key, title }, index) => {
        const section = sections[key];
        if (!section) return null;

        return (
          <details key={key} open={index === 0} className="group rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="font-bold text-slate-100">{title}</h3>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase ${priorityStyles[section.priority]}`}>
                    {section.priority}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-400">{section.analysis}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-sm font-bold text-cyan-200">{section.score ?? "—"}/100</span>
                <span className="text-slate-500 group-open:rotate-180">⌄</span>
              </div>
            </summary>

            <div className="mt-5 grid gap-5 lg:grid-cols-[auto_1fr]">
              <ScoreCircle score={section.score} label="Section score" size="sm" />
              <div className="grid gap-5 md:grid-cols-2">
                <ListBlock title="What works" items={section.whatWorks} />
                <ListBlock title="Problems found" items={section.problemsFound} />
                <ListBlock title="Action points" items={section.actionPoints} />
                <div>
                  <h4 className="font-semibold text-slate-100">Why important</h4>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{section.whyImportant}</p>
                </div>
                <div className="md:col-span-2">
                  <RewriteCard title="Rewrite examples" items={section.examples} />
                </div>
              </div>
            </div>
          </details>
        );
      })}
    </div>
  );
}
