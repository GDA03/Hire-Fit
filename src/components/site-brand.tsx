import Link from "next/link";

export function LogoMark({ size = "md" }: { size?: "sm" | "md" }) {
  const dimensions = size === "sm" ? "h-10 w-10 rounded-2xl text-sm" : "h-12 w-12 rounded-[1.25rem] text-base";

  return (
    <span
      className={`grid ${dimensions} place-items-center bg-[#635BFF] font-black tracking-[-0.08em] text-white shadow-[0_5px_0_#4f46e5]`}
      aria-hidden="true"
    >
      HF
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
