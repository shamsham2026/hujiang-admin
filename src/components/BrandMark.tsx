import Image from "next/image";

/** School crest + wordmark for hub / header. */
export function BrandMark({
  size = "md",
  showTagline = false,
}: {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
}) {
  const titleClass =
    size === "lg"
      ? "text-4xl sm:text-5xl"
      : size === "sm"
        ? "text-lg"
        : "text-2xl";

  const px = size === "lg" ? 72 : size === "sm" ? 36 : 48;

  return (
    <div className="brand-slot flex items-center gap-3">
      <Image
        src="/brand/crest-sm.png"
        alt="滬江小學校徽"
        width={px}
        height={px}
        className="brand-crest shrink-0"
        priority={size !== "sm"}
      />
      <div>
        <p
          className={`font-display font-bold tracking-tight text-[var(--brand-ink)] ${titleClass}`}
        >
          滬江小學
        </p>
        {showTagline ? (
          <p className="mt-0.5 text-sm text-[var(--brand-muted)]">
            行政管理平台
          </p>
        ) : null}
      </div>
    </div>
  );
}
