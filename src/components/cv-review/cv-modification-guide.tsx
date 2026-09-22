import type { CVReviewResult, ReviewLanguage, SectionKey } from "@/lib/cv-review/types";
import { SECTION_DEFINITIONS } from "@/lib/cv-review/types";

type CVModificationGuideProps = {
  result: CVReviewResult;
  language: ReviewLanguage;
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
    guideTitle: "CV Modification & Action Guide",
    guideSubtitle:
      "Direct recommendations, actionable bullet points, and keyword enhancements to apply to your resume.",
    checklistTitle: "Priority Action Checklist",
    checklistDesc: "Complete these 5 critical improvements first to boost ATS score and recruiter interest:",
    keywordsTitle: "Missing Keywords to Add",
    keywordsDesc:
      "Integrate these terms into your Skills section and demonstrate real impact in your Work Experience bullets:",
    noMissingKeywords: "No critical keywords missing for this evaluation.",
    sectionsTitle: "Section-by-Section Modification Suggestions",
    actionPoints: "Recommended Changes",
    examples: "Ready-to-Use Rewrite Example",
    problems: "Issue Identified",
    targetedTitle: "Role-Targeted Optimization",
    jobFit: "Job Fit & Alignment",
    tailoredContent: "Tailored Content Tuning",
  },
  id: {
    guideTitle: "Panduan Modifikasi & Revisi CV",
    guideSubtitle:
      "Rekomendasi langsung, poin perbaikan konkret, dan contoh kalimat revisi yang siap diterapkan ke CV Anda.",
    checklistTitle: "Daftar Periksa Prioritas",
    checklistDesc: "Selesaikan 5 langkah perbaikan penting ini terlebih dahulu sebelum melamar kerja:",
    keywordsTitle: "Kata Kunci yang Disarankan Ditambahkan",
    keywordsDesc:
      "Masukkan kata kunci berikut ke bagian Skill dan ceritakan pengalaman nyata Anda di poin Pengalaman Kerja:",
    noMissingKeywords: "Tidak ada kata kunci penting yang hilang.",
    sectionsTitle: "Rekomendasi Revisi per Bagian",
    actionPoints: "Perubahan yang Dianjurkan",
    examples: "Contoh Kalimat Revisi (Siap Pakai)",
    problems: "Masalah Ditemukan",
    targetedTitle: "Optimasi Sesuai Target Role",
    jobFit: "Kesesuaian dengan Role",
    tailoredContent: "Penyesuaian Konten CV",
  },
};

export function CVModificationGuide({ result, language }: CVModificationGuideProps) {
  const t = copy[language];
  const missingKeywords = result.keywords.missingKeywords ?? [];

  // Filter sections that have actionable advice or examples
  const actionableSections = SECTION_DEFINITIONS.map(({ key, title }) => ({
    key,
    title: sectionTitles[key]?.[language] ?? title,
    data: result.sections[key as SectionKey],
  })).filter(
    (item) =>
      item.data &&
      (item.data.actionPoints.length > 0 || item.data.examples.length > 0 || item.data.problemsFound.length > 0),
  );

  return (
    <div className="space-y-6">
      {/* Guide Header Banner */}
      <div className="break-inside-avoid rounded-[1.75rem] border border-indigo-200/80 bg-gradient-to-br from-indigo-50/90 via-purple-50/60 to-white p-6 shadow-xl shadow-indigo-900/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#635BFF] text-xs font-black text-white shadow-sm">
              ✨
            </span>
            <h3 className="text-xl font-black text-slate-950">{t.guideTitle}</h3>
          </div>
          <span className="rounded-full border border-indigo-200 bg-white/90 px-3 py-1 text-xs font-black text-[#635BFF] shadow-xs">
            {language === "id" ? "Panduan Praktis" : "Actionable Guide"}
          </span>
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-600">{t.guideSubtitle}</p>
      </div>

      {/* Priority Action Checklist */}
      <div className="break-inside-avoid rounded-[1.75rem] border border-white/80 bg-white/80 p-6 shadow-xl shadow-slate-900/5 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-pink-100 text-xs font-black text-pink-700">
            ✓
          </span>
          <h4 className="font-black text-slate-950">{t.checklistTitle}</h4>
        </div>
        <p className="mt-1 text-xs text-slate-500">{t.checklistDesc}</p>
        <ul className="mt-4 space-y-2.5">
          {result.priorityPlan.map((item, index) => (
            <li
              key={`guide-plan-${index}`}
              className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 text-sm leading-6 text-slate-800"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-xs font-bold text-slate-600">
                {index + 1}
              </span>
              <span className="font-medium">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Missing Keywords to Add */}
      <div className="break-inside-avoid rounded-[1.75rem] border border-white/80 bg-white/80 p-6 shadow-xl shadow-slate-900/5 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-xs font-black text-emerald-700">
            +
          </span>
          <h4 className="font-black text-slate-950">{t.keywordsTitle}</h4>
        </div>
        <p className="mt-1 text-xs text-slate-500">{t.keywordsDesc}</p>
        {missingKeywords.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {missingKeywords.map((keyword, index) => (
              <span
                key={`guide-kw-${index}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/90 px-3 py-1.5 text-xs font-black text-emerald-900 shadow-xs"
              >
                <span>+</span>
                <span>{keyword}</span>
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs italic text-slate-400">{t.noMissingKeywords}</p>
        )}
      </div>

      {/* Section-by-Section Modification Suggestions */}
      <div className="space-y-4">
        <h4 className="text-base font-black text-slate-900">{t.sectionsTitle}</h4>
        <div className="grid gap-4">
          {actionableSections.map(({ key, title, data }) => (
            <div
              key={`guide-section-${key}`}
              className="break-inside-avoid rounded-[1.75rem] border border-white/80 bg-white/80 p-5 shadow-lg shadow-slate-900/5 backdrop-blur"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h5 className="font-black text-slate-950">{title}</h5>
                {data.score !== null && (
                  <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-black text-indigo-700">
                    {data.score}/100
                  </span>
                )}
              </div>

              {/* Problem & Action Points */}
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {data.problemsFound.length > 0 && (
                  <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-3.5">
                    <span className="text-xs font-black uppercase tracking-wider text-rose-800">
                      {t.problems}
                    </span>
                    <ul className="mt-1.5 space-y-1 text-xs leading-5 text-rose-950">
                      {data.problemsFound.map((prob, i) => (
                        <li key={`${key}-prob-${i}`}>• {prob}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {data.actionPoints.length > 0 && (
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3.5">
                    <span className="text-xs font-black uppercase tracking-wider text-indigo-800">
                      {t.actionPoints}
                    </span>
                    <ul className="mt-1.5 space-y-1 text-xs leading-5 text-indigo-950">
                      {data.actionPoints.map((act, i) => (
                        <li key={`${key}-act-${i}`}>• {act}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Ready-to-use Rewrite Example */}
              {data.examples.length > 0 && (
                <div className="mt-3 rounded-2xl border border-amber-200/90 bg-amber-50/70 p-3.5">
                  <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-900">
                    <span>💡</span> {t.examples}
                  </span>
                  <div className="mt-2 space-y-1.5">
                    {data.examples.map((ex, i) => (
                      <p
                        key={`${key}-ex-${i}`}
                        className="rounded-xl bg-white/90 p-2.5 font-mono text-xs leading-5 text-slate-800 shadow-xs"
                      >
                        {ex}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
