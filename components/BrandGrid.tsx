"use client";

export function BrandGrid({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (brand: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2.5" role="group" aria-label="Denim brands">
      {options.map((brand) => {
        const active = selected.includes(brand);
        return (
          <button
            key={brand}
            onClick={() => onToggle(brand)}
            aria-pressed={active}
            className={`rounded-full border px-4 py-2.5 text-sm font-medium transition active:scale-95 ${
              active
                ? "border-denim bg-denim text-paper"
                : "border-line bg-paper text-ink hover:border-denim/40"
            }`}
          >
            {brand}
          </button>
        );
      })}
    </div>
  );
}
