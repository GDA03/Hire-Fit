import type { ATSCheck, ATSCheckSeverity } from "@/lib/cv-review/ats-checks";

export function ATSChecksPanel({ checks }: { checks: ATSCheck[] }) {
  if (checks.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
        Basic ATS checks passed. Review extracted text before submitting.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <div>
        <h3 className="font-bold text-slate-100">ATS quick checks</h3>
        <p className="mt-1 text-sm text-slate-400">Deterministic checks before AI review. Fix critical items first.</p>
      </div>
      <div className="space-y-3">
        {checks.map((check) => <ATSCheckItem key={check.id} check={check} />)}
      </div>
    </div>
  );
}

function ATSCheckItem({ check }: { check: ATSCheck }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${severityClass(check.severity)}`}>{check.severity}</span>
        <h4 className="font-semibold text-slate-100">{check.title}</h4>
      </div>
      <p className="mt-2 text-sm text-slate-300">{check.detail}</p>
      <p className="mt-2 text-sm text-cyan-200">{check.suggestion}</p>
    </div>
  );
}

function severityClass(severity: ATSCheckSeverity) {
  if (severity === "critical") return "bg-red-400/15 text-red-200";
  if (severity === "warning") return "bg-amber-400/15 text-amber-200";
  return "bg-cyan-400/15 text-cyan-200";
}
