"use client";

import { motion } from "framer-motion";
import { ChoiceOption } from "@/lib/quiz";

export function ChoiceCards({
  options,
  value,
  onChange,
}: {
  options: ChoiceOption[];
  value?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-3" role="radiogroup">
      {options.map((opt, i) => {
        const active = opt.value === value;
        return (
          <motion.button
            key={opt.value}
            role="radio"
            aria-checked={active}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 * i, duration: 0.35 }}
            onClick={() => onChange(opt.value)}
            className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition active:scale-[0.99] ${
              active
                ? "border-denim bg-denim text-paper shadow-[0_14px_30px_-18px_rgba(33,49,77,0.9)]"
                : "border-line bg-paper text-ink hover:border-denim/30"
            }`}
          >
            <span className="flex-1">
              <span
                className={`font-display text-lg font-semibold ${
                  active ? "text-paper" : "text-denim"
                }`}
              >
                {opt.label}
              </span>
              {opt.hint && (
                <span
                  className={`mt-0.5 block text-[13px] ${
                    active ? "text-paper/70" : "text-muted"
                  }`}
                >
                  {opt.hint}
                </span>
              )}
            </span>
            <span
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border transition ${
                active ? "border-paper bg-paper" : "border-denim/25"
              }`}
            >
              {active && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 12l5 5L19 7"
                    stroke="var(--color-denim)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
