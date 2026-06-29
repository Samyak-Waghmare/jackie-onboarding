"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FitProfile, summarize } from "@/lib/quiz";
import { loadProfile, redirectUrl, JACKIE_SITE } from "@/lib/storage";
import { recommend } from "@/lib/recommend";
import { BrandMark } from "@/components/BrandMark";

const ease = [0.16, 1, 0.3, 1] as const;
const COUNTDOWN = 6;

export default function Complete() {
  const router = useRouter();
  const [profile, setProfile] = useState<FitProfile | null>(null);
  const [seconds, setSeconds] = useState(COUNTDOWN);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setProfile(loadProfile());
  }, []);

  const target = profile ? redirectUrl(profile) : JACKIE_SITE;

  useEffect(() => {
    if (!profile || paused) return;
    if (seconds <= 0) {
      window.location.href = target;
      return;
    }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, profile, paused, target]);

  if (!profile) {
    return (
      <main className="bg-canvas grid min-h-dvh place-items-center px-6">
        <div className="text-center">
          <BrandMark />
          <p className="mt-6 text-muted">Loading your fit…</p>
          <a
            href={JACKIE_SITE}
            className="mt-4 inline-block rounded-2xl bg-denim px-6 py-3 font-semibold text-paper"
          >
            Continue to Jackie Jeans
          </a>
        </div>
      </main>
    );
  }

  const rec = recommend(profile);
  const rows = summarize(profile);

  return (
    <main className="bg-canvas flex min-h-dvh flex-col items-center px-5 pb-8 pt-7">
      <div className="flex w-full max-w-md flex-1 flex-col">
        <BrandMark />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease }}
          className="mx-auto mt-8 grid h-16 w-16 place-items-center rounded-full bg-denim text-paper"
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 12l5 5L19 7"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6, ease }}
          className="mt-5 text-center"
        >
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-stitch">
            Your fit profile is ready
          </p>
          <h1 className="font-display mt-2 text-[2rem] font-semibold leading-tight text-denim">
            We found your fit.
          </h1>
        </motion.div>

        {/* Recommendation card */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6, ease }}
          className="mt-6 overflow-hidden rounded-3xl bg-denim p-6 text-paper shadow-[0_24px_50px_-26px_rgba(33,49,77,0.95)]"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-paper/60">
              Recommended
            </span>
            <span className="rounded-full bg-paper/15 px-3 py-1 text-[11px] font-semibold">
              {rec.confidence} confidence
            </span>
          </div>
          <div className="mt-3 flex items-end gap-3">
            <span className="font-display text-5xl font-semibold">
              {rec.size}
            </span>
            <span className="mb-1.5 text-lg text-paper/80">·</span>
            <span className="mb-1 font-display text-xl font-medium text-paper/90">
              {rec.fitName}
            </span>
          </div>
          <p className="mt-3 text-[13.5px] leading-relaxed text-paper/75">
            {rec.blurb}
          </p>
        </motion.div>

        {/* Answer summary */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6, ease }}
          className="mt-4 rounded-3xl border border-line bg-paper p-5"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            What you told us
          </p>
          <dl className="divide-y divide-line/70">
            {rows.map((r) => (
              <div key={r.label} className="flex justify-between gap-4 py-2">
                <dt className="text-sm text-muted">{r.label}</dt>
                <dd className="max-w-[60%] text-right text-sm font-medium text-ink">
                  {r.value}
                </dd>
              </div>
            ))}
          </dl>
        </motion.div>

        {/* Hand-off */}
        <div className="mt-6">
          <a
            href={target}
            onClick={() => setPaused(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-denim py-4 font-semibold text-paper shadow-[0_16px_34px_-18px_rgba(33,49,77,0.95)] transition active:scale-[0.99]"
          >
            Shop my fit on Jackie Jeans
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12h14M13 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
          <div className="mt-3 flex items-center justify-center gap-4 text-xs text-muted">
            {paused ? (
              <span>Redirecting…</span>
            ) : (
              <span>
                Taking you there in {seconds}s ·{" "}
                <button
                  onClick={() => setPaused(true)}
                  className="underline underline-offset-2 hover:text-denim"
                >
                  stay here
                </button>
              </span>
            )}
            <button
              onClick={() => router.push("/")}
              className="underline underline-offset-2 hover:text-denim"
            >
              start over
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
