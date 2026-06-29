export function BrandMark({
  className = "",
  subtitle = false,
}: {
  className?: string;
  subtitle?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="inline-block h-2 w-2 rounded-full bg-stitch"
        />
        <span className="font-display text-xl font-semibold tracking-tight text-denim">
          Jackie Jeans
        </span>
        <span
          aria-hidden
          className="inline-block h-2 w-2 rounded-full bg-stitch"
        />
      </div>
      {subtitle && (
        <span className="mt-1 text-[11px] uppercase tracking-[0.28em] text-muted">
          Smart Fit
        </span>
      )}
    </div>
  );
}
