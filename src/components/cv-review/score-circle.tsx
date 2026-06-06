type ScoreCircleProps = {
  score: number | null;
  label?: string;
  size?: "sm" | "lg";
};

function getScoreTone(score: number | null) {
  if (score === null) return "text-slate-400";
  if (score >= 80) return "text-cyan-600";
  if (score >= 60) return "text-[#635BFF]";
  if (score >= 40) return "text-amber-500";
  return "text-pink-500";
}

export function ScoreCircle({ score, label = "Score", size = "lg" }: ScoreCircleProps) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const safeScore = score === null ? 0 : Math.max(0, Math.min(100, score));
  const strokeDashoffset = circumference - (safeScore / 100) * circumference;
  const dimensions = size === "lg" ? "h-36 w-36" : "h-24 w-24";
  const textSize = size === "lg" ? "text-4xl" : "text-2xl";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`relative ${dimensions}`} aria-label={`${label}: ${score ?? "not scored"}`}>
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="currentColor" strokeWidth="9" className="text-slate-200" />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={getScoreTone(score)}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`${textSize} font-black ${getScoreTone(score)}`}>{score ?? "—"}</span>
          {score !== null && <span className="text-xs font-semibold text-slate-500">/100</span>}
        </div>
      </div>
      <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
    </div>
  );
}
