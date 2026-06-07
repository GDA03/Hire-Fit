import type { KeywordResult, ReviewLanguage } from "@/lib/cv-review/types";

type KeywordPanelProps = {
  keywords: KeywordResult;
  language: ReviewLanguage;
};

const groups: Array<{ key: keyof KeywordResult; title: Record<ReviewLanguage, string> }> = [
  { key: "jobTitles", title: { en: "Job titles", id: "Judul pekerjaan" } },
  { key: "skills", title: { en: "Skills", id: "Skill" } },
  { key: "careerPaths", title: { en: "Career paths", id: "Jalur karier" } },
  { key: "professionalSummaryKeywords", title: { en: "Summary keywords", id: "Keyword ringkasan" } },
  { key: "additionalKeywords", title: { en: "Additional keywords", id: "Keyword tambahan" } },
  { key: "missingKeywords", title: { en: "Missing keywords", id: "Keyword yang belum ada" } },
];

export function KeywordPanel({ keywords, language }: KeywordPanelProps) {
  return (
    <div className="rounded-[1.75rem] border border-white/80 bg-white/75 p-5 shadow-xl shadow-slate-900/5 backdrop-blur">
      <h3 className="text-lg font-black text-slate-950">{language === "id" ? "Analisis keyword" : "Keyword analysis"}</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {groups.map(({ key, title }) => {
          const items = keywords[key];
          const isMissing = key === "missingKeywords";

          return (
            <div key={key} className={isMissing ? "rounded-3xl border border-amber-200 bg-amber-50/80 p-4" : "rounded-3xl border border-cyan-100 bg-cyan-50/70 p-4"}>
              <h4 className={isMissing ? "font-black text-amber-900" : "font-black text-cyan-900"}>{title[language]}</h4>
              {items.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {items.map((item, index) => (
                    <span
                      key={`${key}-${index}`}
                      className={isMissing ? "rounded-full bg-amber-200 px-3 py-1 text-xs font-bold text-amber-950" : "rounded-full bg-white px-3 py-1 text-xs font-bold text-cyan-900 shadow-sm shadow-cyan-900/5"}
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
