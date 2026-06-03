import { KeywordResult } from "@/lib/cv-review/types";

type KeywordPanelProps = {
  keywords: KeywordResult;
};

const groups: Array<{ key: keyof KeywordResult; title: string }> = [
  { key: "jobTitles", title: "Job titles" },
  { key: "skills", title: "Skills" },
  { key: "careerPaths", title: "Career paths" },
  { key: "professionalSummaryKeywords", title: "Summary keywords" },
  { key: "additionalKeywords", title: "Additional keywords" },
  { key: "missingKeywords", title: "Missing keywords" },
];

export function KeywordPanel({ keywords }: KeywordPanelProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
      <h3 className="text-lg font-bold text-slate-100">Keyword analysis</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {groups.map(({ key, title }) => {
          const items = keywords[key];
          const isMissing = key === "missingKeywords";

          return (
            <div key={key} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
              <h4 className={isMissing ? "font-semibold text-amber-200" : "font-semibold text-cyan-100"}>{title}</h4>
              {items.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {items.map((item, index) => (
                    <span
                      key={`${key}-${index}`}
                      className={isMissing ? "rounded-full bg-amber-300/10 px-3 py-1 text-xs text-amber-100" : "rounded-full bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100"}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-500">No items found.</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
