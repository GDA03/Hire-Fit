import Link from "next/link";

export function LogoMark({ size = "md" }: { size?: "sm" | "md" }) {
  const dimensions = size === "sm" ? "h-10 w-10 rounded-2xl" : "h-12 w-12 rounded-[1.25rem]";
  const dot = size === "sm" ? 13 : 12;

  return (
    <span
      className={`grid ${dimensions} place-items-center bg-[#635BFF] text-white shadow-[0_5px_0_#4f46e5] ring-1 ring-white/40`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100" className="h-[72%] w-[72%]" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g fill="currentColor">
          <rect x="18" y="14" width={dot} height={dot} rx="4" />
          <rect x="18" y="34" width={dot} height={dot} rx="4" />
          <rect x="18" y="54" width={dot} height={dot} rx="4" />
          <rect x="18" y="74" width={dot} height={dot} rx="4" />

          <rect x="40" y="14" width={dot} height={dot} rx="4" opacity="0.66" />
          <rect x="40" y="34" width={dot} height={dot} rx="4" />
          <rect x="40" y="54" width={dot} height={dot} rx="4" opacity="0.66" />

          <rect x="62" y="14" width={dot} height={dot} rx="4" opacity="0.38" />
          <rect x="62" y="34" width={dot} height={dot} rx="4" />
          <rect x="62" y="54" width={dot} height={dot} rx="4" fill="#14B8A6" />
          <rect x="62" y="74" width={dot} height={dot} rx="4" fill="#14B8A6" />
        </g>
      </svg>
    </span>
  );
}

export function BrandLink({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-3 font-black tracking-tight transition hover:text-[#635BFF] ${className}`} aria-label="HireFit home">
      <LogoMark />
      HireFit
    </Link>
  );
}
