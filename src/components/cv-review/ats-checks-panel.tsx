import type { ATSCheck, ATSCheckSeverity } from "@/lib/cv-review/ats-checks";

export function ATSChecksPanel({ checks }: { checks: ATSCheck[] }) {
  if (checks.length === 0) {
    return (
      <div className="animate-happy-pop rounded-3xl border border-teal-100 bg-teal-50 p-4 text-sm font-bold text-teal-700 shadow-sm">
        ✅ Basic ATS checks passed. Review extracted text before submitting.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-3xl border border-indigo-100 bg-white/86 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#F2F0FF] text-xl">🧪</span>
        <div>
          <h3 className="font-black text-[#17152F]">ATS quick checks</h3>
          <p className="mt-1 text-sm font-medium text-slate-500">Deterministic checks before AI review. Fix critical items first.</p>
        </div>
      </div>
      <div className="space-y-3">
        {checks.map((check, index) => <ATSCheckItem key={check.id} check={check} index={index} />)}
      </div>
    </div>
  );
}

function ATSCheckItem({ check, index }: { check: ATSCheck; index: number }) {
  return (
    <div className="animate-happy-pop rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm" style={{ animationDelay: `${index * 50}ms` }}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-xs font-black uppercase ${severityClass(check.severity)}`}>{check.severity}</span>
        <h4 className="font-black text-[#17152F]">{check.title}</h4>
      </div>
      <p className="mt-2 text-sm text-slate-600">{check.detail}</p>
      <p className="mt-2 text-sm font-bold text-[#635BFF]">{check.suggestion}</p>
    </div>
  );
}

function severityClass(severity: ATSCheckSeverity) {
  if (severity === "critical") return "bg-red-50 text-red-700";
  if (severity === "warning") return "bg-violet-50 text-violet-700";
  return "bg-teal-50 text-teal-700";
}
