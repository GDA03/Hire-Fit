type PriorityPlanProps = {
  items: string[];
};

export function PriorityPlan({ items }: PriorityPlanProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
      <h3 className="text-lg font-bold text-slate-100">Priority action plan</h3>
      {items.length > 0 ? (
        <ol className="mt-4 space-y-3">
          {items.map((item, index) => (
            <li key={`priority-${index}`} className="flex gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-300 text-sm font-black text-slate-950">{index + 1}</span>
              <span className="text-sm leading-6 text-slate-300">{item}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 text-sm text-slate-500">No priority actions returned.</p>
      )}
    </div>
  );
}
