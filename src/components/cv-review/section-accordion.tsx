import { localizeList, localizeText } from "@/lib/cv-review/localize";
import { SECTION_DEFINITIONS, type ReviewLanguage, type SectionResult } from "@/lib/cv-review/types";
import { RewriteCard } from "./rewrite-card";
import { ScoreCircle } from "./score-circle";

type SectionAccordionProps = {
  sections: Record<string, SectionResult>;
  language: ReviewLanguage;
};

const priorityStyles = {
  high: "border-pink-200 bg-pink-100 text-pink-800",
  medium: "border-amber-200 bg-amber-100 text-amber-900",
  low: "border-cyan-200 bg-cyan-100 text-cyan-900",
};

const sectionTitles: Record<string, Record<ReviewLanguage, string>> = {
  overallImpression: { en: "Overall Impression", id: "Kesan Keseluruhan" },
  contactInformation: { en: "Contact Information", id: "Informasi Kontak" },
  relevantSkills: { en: "Relevant Skills", id: "Skill Relevan" },
  professionalSummary: { en: "Professional Summary", id: "Ringkasan Profesional" },
  workExperience: { en: "Work Experience", id: "Pengalaman Kerja" },
  achievements: { en: "Achievements", id: "Pencapaian" },
  educationCertification: { en: "Education & Certification", id: "Pendidikan & Sertifikasi" },
  organizationalActivity: { en: "Organization & Volunteer", id: "Organisasi & Volunteer" },
  writingConsistency: { en: "Writing, Grammar & Formatting", id: "Penulisan, Grammar & Format" },
  additionalSection: { en: "Additional Sections", id: "Section Tambahan" },
};

const copy = {
  en: {
    sectionScore: "Section score",
    whatWorks: "What works",
    problemsFound: "Problems found",
    actionPoints: "Action points",
    whyImportant: "Why important",
    rewriteExamples: "Rewrite examples",
  },
  id: {
    sectionScore: "Skor section",
    whatWorks: "Yang sudah baik",
    problemsFound: "Masalah ditemukan",
    actionPoints: "Poin aksi",
    whyImportant: "Kenapa penting",
    rewriteExamples: "Contoh rewrite",
  },
};

function ListBlock({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div>
      <h4 className="font-black text-slate-950">{title}</h4>
      <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
        {items.map((item, index) => (
          <li key={`${title}-${index}`}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}

export function SectionAccordion({ sections, language }: SectionAccordionProps) {
  const t = copy[language];

  return (
    <div className="space-y-3">
      {SECTION_DEFINITIONS.map(({ key, title }, index) => {
        const section = sections[key];
        if (!section) return null;

        return (
          <details key={key} open={index === 0} className="group rounded-[1.75rem] border border-white/80 bg-white/75 p-4 shadow-xl shadow-slate-900/5 backdrop-blur">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="font-black text-slate-950">{sectionTitles[key]?.[language] ?? title}</h3>
                  <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${priorityStyles[section.priority]}`}>
                    {section.priority}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{localizeText(section.analysis, language)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="rounded-full bg-cyan-100 px-3 py-1 text-sm font-black text-cyan-900">{section.score ?? "—"}/100</span>
                <span className="text-slate-500 group-open:rotate-180">⌄</span>
              </div>
            </summary>

            <div className="mt-5 grid gap-5 lg:grid-cols-[auto_1fr]">
              <ScoreCircle score={section.score} label={t.sectionScore} size="sm" />
              <div className="grid gap-5 md:grid-cols-2">
                <ListBlock title={t.whatWorks} items={localizeList(section.whatWorks, language)} />
                <ListBlock title={t.problemsFound} items={localizeList(section.problemsFound, language)} />
                <ListBlock title={t.actionPoints} items={localizeList(section.actionPoints, language)} />
                <div>
                  <h4 className="font-black text-slate-950">{t.whyImportant}</h4>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{localizeText(section.whyImportant, language)}</p>
                </div>
                <div className="md:col-span-2">
                  <RewriteCard title={t.rewriteExamples} items={localizeList(section.examples, language)} />
                </div>
              </div>
            </div>
          </details>
        );
      })}
    </div>
  );
}
