import Link from "next/link";

export function LogoMark({ size = "md" }: { size?: "sm" | "md" }) {
  const dimensions = size === "sm" ? "h-9 w-9" : "h-11 w-11";

  return (
    <span className={`grid ${dimensions} place-items-center text-[#635BFF]`} aria-hidden="true">
      <svg viewBox="0 0 100 100" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g fill="currentColor">
          <rect x="18" y="16" width="14" height="14" rx="5" />
          <rect x="18" y="38" width="14" height="14" rx="5" />
          <rect x="18" y="60" width="14" height="14" rx="5" />
          <rect x="18" y="82" width="14" height="14" rx="5" />

          <rect x="43" y="16" width="14" height="14" rx="5" opacity="0.7" />
          <rect x="43" y="38" width="14" height="14" rx="5" />
          <rect x="43" y="60" width="14" height="14" rx="5" opacity="0.7" />

          <rect x="68" y="16" width="14" height="14" rx="5" opacity="0.34" />
          <rect x="68" y="38" width="14" height="14" rx="5" />
          <rect x="68" y="60" width="14" height="14" rx="5" fill="#14B8A6" />
          <rect x="68" y="82" width="14" height="14" rx="5" fill="#14B8A6" />
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
