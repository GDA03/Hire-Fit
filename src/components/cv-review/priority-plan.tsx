type PriorityPlanProps = {
  items: string[];
};

export function PriorityPlan({ items }: PriorityPlanProps) {
  return (
    <div className="rounded-[1.75rem] border border-white/80 bg-white/75 p-5 shadow-xl shadow-slate-900/5 backdrop-blur">
      <h3 className="text-lg font-black text-slate-950">Priority action plan</h3>
      {items.length > 0 ? (
        <ol className="mt-4 space-y-3">
          {items.map((item, index) => (
            <li key={`priority-${index}`} className="flex gap-3 rounded-3xl border border-cyan-100 bg-cyan-50/70 p-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-pink-400 text-sm font-black text-white shadow-lg shadow-cyan-500/20">{index + 1}</span>
              <span className="text-sm leading-6 text-slate-700">{item}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 text-sm text-slate-500">No priority actions returned.</p>
      )}
    </div>
  );
}
