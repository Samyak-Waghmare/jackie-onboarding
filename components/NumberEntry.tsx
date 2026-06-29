"use client";

export function NumberEntry({
  value,
  unit,
  min,
  max,
  placeholder,
  onChange,
}: {
  value: string;
  unit?: string;
  min?: number;
  max?: number;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  const step = (delta: number) => {
    const current = parseInt(value || "0", 10) || min || 0;
    let next = current + delta;
    if (min != null) next = Math.max(min, next);
    if (max != null) next = Math.min(max, next);
    onChange(String(next));
  };

  return (
    <div className="flex items-center justify-center gap-4">
      <RoundBtn label="−" ariaLabel="Decrease" onClick={() => step(-1)} />
      <div className="flex items-baseline gap-2 rounded-3xl border border-line bg-paper px-6 py-5">
        <input
          inputMode="numeric"
          pattern="[0-9]*"
          value={value}
          aria-label={unit ? `Value in ${unit}` : "Value"}
          placeholder={placeholder ?? "—"}
          onChange={(e) => {
            const cleaned = e.target.value.replace(/[^0-9]/g, "").slice(0, 3);
            onChange(cleaned);
          }}
          className="w-24 bg-transparent text-center font-display text-4xl font-semibold text-denim outline-none placeholder:text-muted/40"
        />
        {unit && <span className="text-lg text-muted">{unit}</span>}
      </div>
      <RoundBtn label="+" ariaLabel="Increase" onClick={() => step(1)} />
    </div>
  );
}

function RoundBtn({
  label,
  ariaLabel,
  onClick,
}: {
  label: string;
  ariaLabel: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className="grid h-12 w-12 place-items-center rounded-full border border-line bg-paper text-2xl text-denim transition active:scale-90 hover:border-denim/40"
    >
      {label}
    </button>
  );
}
