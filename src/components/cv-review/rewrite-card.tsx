type RewriteCardProps = {
  title: string;
  items: string[];
  emptyText?: string;
};

export function RewriteCard({ title, items, emptyText = "No rewrite examples provided." }: RewriteCardProps) {
  return (
    <div className="rounded-2xl border border-cyan-400/20 bg-cyan-950/20 p-4">
      <h4 className="font-semibold text-cyan-100">{title}</h4>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-3 text-sm text-slate-300">
          {items.map((item, index) => (
            <li key={`${title}-${index}`} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 leading-6">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-slate-500">{emptyText}</p>
      )}
    </div>
  );
}
