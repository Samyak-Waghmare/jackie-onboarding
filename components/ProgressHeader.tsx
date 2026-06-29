"use client";

import { motion } from "framer-motion";

export function ProgressHeader({
  step,
  total,
  onBack,
  canBack,
  onExit,
}: {
  step: number; // 1-based
  total: number;
  onBack: () => void;
  canBack: boolean;
  onExit: () => void;
}) {
  const pct = Math.round((step / total) * 100);
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          disabled={!canBack}
          aria-label="Go back"
          className="grid h-10 w-10 place-items-center rounded-full text-denim transition disabled:opacity-25 active:scale-95 enabled:hover:bg-denim/5"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <span className="text-xs font-medium uppercase tracking-[0.22em] text-muted">
          Question {step} of {total}
        </span>

        <button
          onClick={onExit}
          aria-label="Close quiz"
          className="grid h-10 w-10 place-items-center rounded-full text-muted transition active:scale-95 hover:bg-denim/5"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M18 6L6 18M6 6l12 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-denim/10">
        <motion.div
          className="h-full rounded-full bg-denim"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 160, damping: 24 }}
        />
      </div>
    </div>
  );
}
