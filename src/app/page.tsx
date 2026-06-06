"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, BrainCircuit, CheckCircle2, FileSearch, Globe2, Layers3, Sparkles } from "lucide-react";
import { DynamicBackground } from "@/components/dynamic-background";
import { CVReviewForm } from "@/components/cv-review";
import { BrandLink } from "@/components/site-brand";
import { AnalyzeRequest } from "@/lib/cv-review/types";

type Locale = "id" | "en";

const copy = {
  id: {
    navReview: "Review CV",
    navMissions: "Alur",
    navFeatures: "Fitur",
    badge: "CV review yang selalu jelas",
    headline: "Ubah CV jadi strategi karier yang siap dikirim.",
    description:
      "Upload PDF atau paste CV. HireFit menampilkan progress review secara jelas, lalu mengubah feedback ATS, role-fit, dan keyword gap menjadi langkah perbaikan praktis.",
    stats: ["Bagian CV dicek", "Bahasa tersedia"],
    missionTitle: "Alur review",
    missions: ["Kirim CV", "Cek struktur ATS", "Baca konteks role", "Susun action plan"],
    panelTitle: "Tidak ada lagi layar tunggu kosong.",
    panelText: "Setiap tahap memberi konteks: apa yang sedang dicek, kenapa penting, dan apa hasil berikutnya.",
    panelItems: ["Status review real-time", "Checkpoint yang mudah dipahami", "Micro-copy agar user tetap engaged"],
    featuresEyebrow: "Fitur",
    featuresTitle: "Terasa ringan, hasilnya tetap serius.",
    featuresText: "Insight dibuat singkat, jelas, dan mudah dijadikan tugas perbaikan CV.",
    faqTitle: "Pertanyaan umum",
  },
  en: {
    navReview: "Review CV",
    navMissions: "Flow",
    navFeatures: "Features",
    badge: "CV review that stays clear",
    headline: "Turn your CV into a career strategy ready to send.",
    description:
      "Upload a PDF or paste your CV. HireFit shows clear review progress, then turns ATS, role-fit, and keyword-gap feedback into practical next steps.",
    stats: ["CV sections checked", "Languages supported"],
    missionTitle: "Review flow",
    missions: ["Submit CV", "Scan ATS structure", "Read role context", "Build action plan"],
    panelTitle: "No more empty waiting screens.",
    panelText: "Each stage explains what is being checked, why it matters, and what comes next.",
    panelItems: ["Real-time review status", "Easy-to-follow checkpoints", "Micro-copy that keeps users engaged"],
    featuresEyebrow: "Features",
    featuresTitle: "Lightweight experience, serious output.",
    featuresText: "Every insight is short, clear, and easy to turn into a CV improvement task.",
    faqTitle: "Common questions",
  },
} satisfies Record<Locale, Record<string, string | string[]>>;

const localizedFeatures = {
  id: [
    { icon: FileSearch, title: "ATS signals", description: "Cek section penting, keyword, panjang konten, dan format yang biasanya dibaca sistem ATS." },
    { icon: BrainCircuit, title: "Role-fit intelligence", description: "Bandingkan CV dengan target role agar gap skill dan bukti pengalaman terlihat jelas." },
    { icon: Layers3, title: "Action map", description: "Feedback diringkas jadi prioritas perbaikan, bukan paragraf panjang yang sulit dieksekusi." },
  ],
  en: [
    { icon: FileSearch, title: "ATS signals", description: "Checks core sections, keywords, content length, and formatting signals ATS systems usually parse." },
    { icon: BrainCircuit, title: "Role-fit intelligence", description: "Compares your CV with a target role so skill gaps and experience proof become clear." },
    { icon: Layers3, title: "Action map", description: "Turns feedback into prioritized fixes instead of long paragraphs that are hard to act on." },
  ],
} satisfies Record<Locale, { icon: typeof FileSearch; title: string; description: string }[]>;

const localizedFaqs = {
  id: [
    { question: "Perlu akun?", answer: "Tidak. Upload PDF atau paste CV dan langsung jalankan review." },
    { question: "Bisa pakai job post?", answer: "Bisa. Tambahkan job description untuk analisis role-fit, keyword gap, dan rekomendasi relevan." },
    { question: "Apakah HireFit menulis ulang CV?", answer: "Tidak. HireFit memberi feedback dan saran perbaikan agar pengalaman tetap jujur." },
  ],
  en: [
    { question: "Do I need an account?", answer: "No. Upload a PDF or paste your CV and run a review right away." },
    { question: "Can I use a job post?", answer: "Yes. Add a job description for role-fit analysis, keyword gaps, and relevant recommendations." },
    { question: "Does HireFit rewrite my CV?", answer: "No. HireFit gives feedback and improvement suggestions so your experience stays honest." },
  ],
} satisfies Record<Locale, { question: string; answer: string }[]>;

export default function Home() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [locale, setLocale] = useState<Locale>("id");
  const t = copy[locale];
  const stats = t.stats as string[];
  const missions = t.missions as string[];
  const panelItems = t.panelItems as string[];

  async function handleReviewSubmit(request: AnalyzeRequest) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/cv-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "CV review failed. Please try again.");
      router.push(`/results/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "CV review failed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden text-[#17152F]">
      <DynamicBackground />
      <nav className="sticky top-0 z-30 border-b border-indigo-100/80 bg-white/72 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <BrandLink className="text-xl" />
          <div className="hidden items-center gap-2 text-sm font-black text-slate-600 md:flex">
            <a href="#review" className="rounded-2xl px-4 py-2 transition hover:bg-indigo-50 hover:text-[#635BFF]">{t.navReview}</a>
            <a href="#preview" className="rounded-2xl px-4 py-2 transition hover:bg-teal-50 hover:text-[#14B8A6]">{t.navMissions}</a>
            <a href="#features" className="rounded-2xl px-4 py-2 transition hover:bg-violet-50 hover:text-[#A78BFA]">{t.navFeatures}</a>
          </div>
          <fieldset className="flex rounded-2xl border border-indigo-100 bg-white p-1 shadow-sm" aria-label="Language selector">
            <legend className="sr-only">Language</legend>
            {(["id", "en"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setLocale(item)}
                className={`rounded-xl px-3 py-1.5 text-xs font-black transition ${locale === item ? "bg-[#635BFF] text-white" : "text-slate-500 hover:bg-indigo-50"}`}
                aria-pressed={locale === item}
              >
                {item.toUpperCase()}
              </button>
            ))}
          </fieldset>
        </div>
      </nav>

      <section className="relative mx-auto grid max-w-6xl gap-8 px-6 py-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <div className="space-y-10 lg:sticky lg:top-32">
          <div className="animate-happy-pop space-y-5">
            <p className="inline-flex items-center gap-2 rounded-2xl border border-indigo-100 bg-white/82 px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-[#635BFF] shadow-sm backdrop-blur">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {t.badge}
            </p>
            <h1 className="text-5xl font-black leading-[1.02] tracking-tight md:text-6xl">
              {t.headline}
            </h1>
            <p className="max-w-2xl text-lg font-semibold leading-8 text-slate-600">
              {t.description}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[["12", stats[0], FileSearch], ["2", stats[1], Globe2]].map(([value, label, Icon], index) => {
              const TypedIcon = Icon as typeof FileSearch;
              return (
                <div key={label as string} className="app-card-pressed animate-happy-pop rounded-[1.75rem] bg-white/86 p-5 backdrop-blur transition duration-200 hover:-translate-y-1" style={{ animationDelay: `${index * 70}ms` }}>
                  <TypedIcon className="mb-4 h-7 w-7 text-[#14B8A6]" aria-hidden="true" />
                  <p className="text-4xl font-black text-[#17152F]">{value as string}</p>
                  <p className="text-sm font-black text-slate-500">{label as string}</p>
                </div>
              );
            })}
          </div>

          <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <div id="preview" className="app-card relative overflow-hidden rounded-[1.75rem] bg-white/86 p-6 backdrop-blur">
              <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#14B8A6]/12" />
              <p className="mb-4 text-sm font-black uppercase tracking-[0.16em] text-[#14B8A6]">{t.missionTitle}</p>
              <div className="space-y-3 text-sm font-black text-[#17152F]">
                {missions.map((mission, index) => (
                  <div key={mission} className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-[#635BFF] text-white shadow-[0_4px_0_#4f46e5]">{index + 1}</span>
                    <span>{mission}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="app-card rounded-[1.75rem] bg-white/86 p-6 backdrop-blur">
              <CheckCircle2 className="mb-4 h-12 w-12 text-[#635BFF] animate-soft-float" aria-hidden="true" />
              <h2 className="text-xl font-black">{t.panelTitle}</h2>
              <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{t.panelText}</p>
              <ul className="mt-4 space-y-2 text-sm font-black text-slate-700">
                {panelItems.map((item) => (
                  <li key={item} className="flex items-center gap-2"><ArrowRight className="h-4 w-4 text-[#14B8A6]" aria-hidden="true" />{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <section id="review" className="space-y-5">
          <CVReviewForm loading={loading} onSubmit={handleReviewSubmit} locale={locale} />
          {error && <div role="alert" className="animate-happy-pop rounded-[1.5rem] border border-red-100 bg-red-50 p-4 font-black text-red-700 shadow-sm">{error}</div>}
        </section>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 pb-16">
        <div className="mb-8 max-w-2xl">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#635BFF]">{t.featuresEyebrow}</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">{t.featuresTitle}</h2>
          <p className="mt-4 font-semibold text-slate-600">{t.featuresText}</p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {localizedFeatures[locale].map((feature, index) => {
            const Icon = feature.icon;
            return (
              <article key={feature.title} className="app-card animate-happy-pop rounded-[1.75rem] bg-white/86 p-6 backdrop-blur transition duration-200 hover:-translate-y-1" style={{ animationDelay: `${index * 80}ms` }}>
                <div className="mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-[#F2F0FF] text-[#635BFF]">
                  <Icon className="h-8 w-8" aria-hidden="true" />
                </div>
                <h3 className="text-xl font-black">{feature.title}</h3>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{feature.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-6xl px-6 pb-16">
        <div className="app-card rounded-[1.75rem] bg-white/86 p-6 backdrop-blur md:p-8">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#14B8A6]">FAQ</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight">{t.faqTitle}</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {localizedFaqs[locale].map((faq) => (
              <article key={faq.question} className="rounded-[1.35rem] border border-indigo-100 bg-[#F2F0FF]/55 p-5">
                <h3 className="font-black">{faq.question}</h3>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{faq.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

function SiteFooter() {
  return (
    <footer className="relative border-t border-indigo-100/80 bg-white/76 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-6 py-8 md:flex-row md:items-center md:justify-between">
        <div>
          <BrandLink className="text-lg" />
          <p className="mt-3 max-w-md text-sm font-semibold leading-6 text-slate-600">
            Personal portfolio project by Gerald. Built to show AI product UX, async review flow, and ATS-focused CV feedback.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm font-black text-slate-600">
          <a className="rounded-2xl border border-indigo-100 bg-white px-4 py-2 transition hover:border-[#635BFF] hover:text-[#635BFF]" href="https://github.com/GDA03" target="_blank" rel="noreferrer">GitHub</a>
          <a className="rounded-2xl border border-indigo-100 bg-white px-4 py-2 transition hover:border-[#635BFF] hover:text-[#635BFF]" href="https://www.linkedin.com/in/gdustin/" target="_blank" rel="noreferrer">LinkedIn</a>
          <a className="rounded-2xl border border-indigo-100 bg-white px-4 py-2 transition hover:border-[#635BFF] hover:text-[#635BFF]" href="https://portofolio-gerald.vercel.app/" target="_blank" rel="noreferrer">Portfolio</a>
        </div>
      </div>
    </footer>
  );
}
