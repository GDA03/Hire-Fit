import { CvReviewForm } from "@/components/cv-review/cv-review-form";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <section className="mx-auto max-w-6xl space-y-8">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">HireFit</p>
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">AI CV / JD Fit Reviewer</h1>
          <p className="max-w-2xl text-slate-300 leading-relaxed">
            Upload your CV and get honest, actionable feedback to match your target job or scholarship. 
            Powered by AI to help you improve without hallucinating experience.
          </p>
        </div>
        <CvReviewForm />
      </section>
    </main>
  );
}
