"use client";

export function BrandSizeList({
  brands,
  sizes,
  onChange,
}: {
  brands: string[];
  sizes: Record<string, string>;
  onChange: (brand: string, size: string) => void;
}) {
  return (
    <div className="space-y-2.5">
      {brands.map((brand) => (
        <div
          key={brand}
          className="flex items-center gap-3 rounded-2xl border border-line bg-paper p-3 pl-4"
        >
          <span className="flex-1 font-medium text-ink">{brand}</span>
          <input
            value={sizes[brand] ?? ""}
            onChange={(e) => onChange(brand, e.target.value.slice(0, 6))}
            placeholder="Size"
            className="w-24 rounded-xl border border-line bg-cream px-3 py-2.5 text-center font-display text-lg font-semibold text-denim outline-none transition focus:border-denim/50 placeholder:text-sm placeholder:font-sans placeholder:font-normal placeholder:text-muted/60"
          />
        </div>
      ))}
    </div>
  );
}
