"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { BrandMark } from "@/components/BrandMark";
import { loadProgress, clearProgress, Progress } from "@/lib/storage";

const ease = [0.16, 1, 0.3, 1] as const;

export default function Home() {
  const [progress, setProgress] = useState<Progress | null>(null);
  useEffect(() => setProgress(loadProgress()), []);
  const resumeN =
    progress &&
    (progress.flow === "manual" ? progress.position + 1 : progress.position);

  return (
    <main className="bg-canvas relative flex min-h-dvh flex-col items-center px-6 pb-10 pt-8">
      <div className="flex w-full max-w-md flex-1 flex-col">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
        >
          <BrandMark subtitle />
        </motion.div>

        {progress && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
            className="mt-5 flex items-center gap-3 rounded-2xl border border-stitch/40 bg-stitch/10 p-3 pl-4"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-denim">
                Pick up where you left off
              </p>
              <p className="truncate text-xs text-muted">
                {progress.flow === "voice" ? "Voice" : "Manual"} quiz · question{" "}
                {Math.min(resumeN ?? 1, progress.total)} of {progress.total}
              </p>
            </div>
            <Link
              href={`/onboarding/${progress.flow}?resume=1`}
              className="shrink-0 rounded-full bg-denim px-4 py-2 text-sm font-semibold text-paper transition active:scale-95"
            >
              Resume
            </Link>
            <button
              onClick={() => {
                clearProgress();
                setProgress(null);
              }}
              aria-label="Dismiss saved progress"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted transition hover:bg-denim/5"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </motion.div>
        )}

        {/* Hero */}
        <div className="flex flex-1 flex-col justify-center py-10">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6, ease }}
            className="text-sm font-medium uppercase tracking-[0.25em] text-stitch"
          >
            The 60-second fit quiz
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.7, ease }}
            className="font-display mt-3 text-[2.7rem] font-semibold leading-[1.05] tracking-tight text-denim"
          >
            Jeans that fit.
            <br />
            <span className="italic text-ink">The first time.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.7, ease }}
            className="mt-5 max-w-sm text-[15px] leading-relaxed text-muted"
          >
            No more guessing your size and returning what doesn&apos;t work.
            Answer a few quick questions and we&apos;ll find your fit with
            confidence — by tap, or just by talking.
          </motion.p>
        </div>

        {/* Entry points */}
        <div className="space-y-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.6, ease }}
          >
            <Link
              href="/onboarding/voice"
              className="group relative flex items-center gap-4 overflow-hidden rounded-3xl bg-denim p-5 text-paper shadow-[0_18px_40px_-22px_rgba(33,49,77,0.9)] transition active:scale-[0.99]"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-paper/15">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 15a3 3 0 003-3V6a3 3 0 10-6 0v6a3 3 0 003 3z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M5 11a7 7 0 0014 0M12 18v3"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <span className="flex-1">
                <span className="flex items-center gap-2">
                  <span className="font-display text-lg font-semibold">
                    Find your fit by voice
                  </span>
                  <span className="rounded-full bg-stitch px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-paper">
                    AI
                  </span>
                </span>
                <span className="mt-0.5 block text-[13px] text-paper/70">
                  Talk it through with your stylist
                </span>
              </span>
              <Arrow />
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.6, ease }}
          >
            <Link
              href="/onboarding/manual"
              className="group flex items-center gap-4 rounded-3xl border border-line bg-paper p-5 text-denim transition active:scale-[0.99] hover:border-denim/30"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-denim/5">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 6h10M9 12h10M9 18h10"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <circle cx="4.5" cy="6" r="1.4" fill="currentColor" />
                  <circle cx="4.5" cy="12" r="1.4" fill="currentColor" />
                  <circle cx="4.5" cy="18" r="1.4" fill="currentColor" />
                </svg>
              </span>
              <span className="flex-1">
                <span className="font-display text-lg font-semibold">
                  Take the fit quiz
                </span>
                <span className="mt-0.5 block text-[13px] text-muted">
                  Tap through it yourself
                </span>
              </span>
              <Arrow muted />
            </Link>
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.75, duration: 0.8 }}
          className="mt-6 text-center text-xs text-muted"
        >
          10 questions · about a minute · nothing you can&apos;t skip
        </motion.p>
      </div>
    </main>
  );
}

function Arrow({ muted = false }: { muted?: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      className={`shrink-0 transition-transform group-hover:translate-x-1 ${
        muted ? "text-muted" : "text-paper/80"
      }`}
    >
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
