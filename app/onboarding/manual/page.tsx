"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { QUESTIONS, FitProfile, emptyProfile, Question } from "@/lib/quiz";
import {
  saveProfile,
  saveProgress,
  loadProgress,
  clearProgress,
} from "@/lib/storage";
import { ProgressHeader } from "@/components/ProgressHeader";
import { DropdownSelect } from "@/components/DropdownSelect";
import { ChoiceCards } from "@/components/ChoiceCards";
import { BrandGrid } from "@/components/BrandGrid";
import { NumberEntry } from "@/components/NumberEntry";
import { BrandSizeList } from "@/components/BrandSizeList";

const ease = [0.16, 1, 0.3, 1] as const;

const variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 36 : -36 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -36 : 36 }),
};

export default function ManualFlow() {
  const router = useRouter();
  const [profile, setProfile] = useState<FitProfile>(() => ({
    ...emptyProfile(),
    height: "5'4\"",
    waist: "30\"",
    hip: "40\"",
  }));
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [locked, setLocked] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  // True while editing a single answer from the review screen — the flow
  // returns straight back to review instead of marching forward.
  const [editReturn, setEditReturn] = useState(false);
  // Prevents a second page transition from starting before the current one
  // settles — guards against fast double-taps / back-during-transition.
  const navLock = useRef(false);
  const restoredRef = useRef(false);

  // Q9 (per-brand sizes) only exists once at least one brand is chosen.
  const steps = useMemo(
    () =>
      QUESTIONS.filter(
        (q) => q.id !== "brandSizes" || profile.brands.length > 0
      ),
    [profile.brands.length]
  );

  const q = steps[Math.min(index, steps.length - 1)];
  const total = steps.length;

  const update = (patch: Partial<FitProfile>) =>
    setProfile((p) => ({ ...p, ...patch }));

  // Restore an in-progress session when arriving from the landing Resume card.
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("resume") === "1") {
        const p = loadProgress();
        if (p && p.flow === "manual") {
          setProfile({
            ...emptyProfile(),
            height: "5'4\"",
            waist: "30\"",
            hip: "40\"",
            ...p.profile,
          });
          setIndex(Math.max(0, Math.min(p.position, QUESTIONS.length - 1)));
        }
      }
    }
    restoredRef.current = true;
  }, []);

  // Persist progress as the user advances (cleared on completion).
  useEffect(() => {
    if (!restoredRef.current || reviewing) return;
    saveProgress({
      flow: "manual",
      profile,
      position: index,
      total,
      updatedAt: Date.now(),
    });
  }, [profile, index, reviewing, total]);

  // Reaching the end shows the review screen; the redirect only happens once
  // the user confirms from there.
  const finish = () => setReviewing(true);

  const confirmFinish = () => {
    saveProfile(profile);
    clearProgress();
    router.push("/complete?from=manual");
  };

  const goNext = () => {
    if (navLock.current) return;
    navLock.current = true;
    setTimeout(() => (navLock.current = false), 340);
    if (editReturn) {
      setEditReturn(false);
      setDir(1);
      setReviewing(true);
      return;
    }
    if (index >= total - 1) return finish();
    setDir(1);
    setIndex((i) => i + 1);
  };

  const goBack = () => {
    if (navLock.current) return;
    if (editReturn) {
      setEditReturn(false);
      setReviewing(true);
      return;
    }
    if (index <= 0) return router.push("/");
    navLock.current = true;
    setDir(-1);
    setIndex((i) => i - 1);
    setTimeout(() => (navLock.current = false), 340);
  };

  // Single-select questions advance themselves for a frictionless feel.
  const chooseAndAdvance = (patch: Partial<FitProfile>) => {
    if (locked) return;
    update(patch);
    setLocked(true);
    setTimeout(() => {
      setLocked(false);
      goNext();
    }, 280);
  };

  const editQuestion = (qid: string) => {
    const i = steps.findIndex((s) => s.id === qid);
    if (i < 0) return;
    setEditReturn(true);
    setReviewing(false);
    setDir(-1);
    setIndex(i);
  };

  // ── Review & edit screen ────────────────────────────────────────────────────
  if (reviewing) {
    const rows = buildReviewRows(profile);
    return (
      <main className="bg-canvas flex min-h-dvh flex-col items-center px-5 pb-6 pt-5">
        <div className="flex w-full max-w-md flex-1 flex-col">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setReviewing(false);
                setIndex(total - 1);
              }}
              aria-label="Back to questions"
              className="grid h-10 w-10 place-items-center rounded-full text-denim transition hover:bg-denim/5"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span className="text-xs font-medium uppercase tracking-[0.22em] text-muted">
              Review
            </span>
            <button
              onClick={() => router.push("/")}
              aria-label="Close quiz"
              className="grid h-10 w-10 place-items-center rounded-full text-muted transition hover:bg-denim/5"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-denim/10">
            <div className="h-full w-full rounded-full bg-denim" />
          </div>

          <div className="no-scrollbar flex-1 overflow-y-auto pt-7">
            <h2 className="font-display text-[1.7rem] font-semibold leading-tight text-denim">
              Review your answers
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-muted">
              Tap edit to change anything before we find your fit.
            </p>

            <div className="mt-6 space-y-2.5">
              {rows.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-paper p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                      {r.label}
                    </div>
                    <div className="mt-0.5 truncate font-medium text-ink">
                      {r.value || "—"}
                    </div>
                  </div>
                  <button
                    onClick={() => editQuestion(r.id)}
                    className="shrink-0 rounded-full border border-line px-4 py-2 text-sm font-medium text-denim transition active:scale-95 hover:border-denim/40"
                  >
                    Edit
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3">
            <button
              onClick={confirmFinish}
              className="w-full rounded-2xl bg-denim py-4 font-semibold text-paper shadow-[0_16px_34px_-18px_rgba(33,49,77,0.95)] transition active:scale-[0.99]"
            >
              See my fit recommendations
            </button>
          </div>
        </div>
      </main>
    );
  }

  const valid = isValid(q, profile);
  const autoAdvance = q.kind === "choice";

  return (
    <main className="bg-canvas flex min-h-dvh flex-col items-center px-5 pb-6 pt-5">
      <div className="flex w-full max-w-md flex-1 flex-col">
        <ProgressHeader
          step={index + 1}
          total={total}
          canBack
          onBack={goBack}
          onExit={() => router.push("/")}
        />

        <div className="relative flex-1 overflow-hidden">
          <AnimatePresence custom={dir} mode="wait">
            <motion.div
              key={q.id}
              custom={dir}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.32, ease }}
              className="flex h-full flex-col pt-7"
            >
              {editReturn && (
                <span className="mb-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-stitch/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-stitch">
                  Editing
                </span>
              )}
              <h2 className="font-display text-[1.7rem] font-semibold leading-tight text-denim">
                {q.title}
              </h2>
              <p className="mt-2 text-[14px] leading-relaxed text-muted">
                {q.subtitle}
              </p>

              <div className="mt-7 flex-1">
                <QuestionInput
                  q={q}
                  profile={profile}
                  update={update}
                  choose={chooseAndAdvance}
                  setProfile={setProfile}
                />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer actions */}
        <div className="pt-3">
          {q.optional && (
            <button
              onClick={() => {
                update({ weight: "", weightSkipped: true });
                goNext();
              }}
              className="mb-2 w-full rounded-2xl py-3 text-sm font-medium text-muted transition hover:text-denim"
            >
              Skip this — I&apos;d rather not say
            </button>
          )}

          {!autoAdvance && (
            <button
              onClick={goNext}
              disabled={!valid}
              className="w-full rounded-2xl bg-denim py-4 font-semibold text-paper shadow-[0_16px_34px_-18px_rgba(33,49,77,0.95)] transition active:scale-[0.99] disabled:opacity-30"
            >
              {editReturn ? "Save changes" : continueLabel(q, profile, index, total)}
            </button>
          )}
          {autoAdvance && (
            <p className="py-1 text-center text-xs text-muted">
              {editReturn ? "Tap an option to save" : "Tap an option to continue"}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

function QuestionInput({
  q,
  profile,
  update,
  choose,
  setProfile,
}: {
  q: Question;
  profile: FitProfile;
  update: (p: Partial<FitProfile>) => void;
  choose: (p: Partial<FitProfile>) => void;
  setProfile: React.Dispatch<React.SetStateAction<FitProfile>>;
}) {
  switch (q.id) {
    case "height":
      return (
        <DropdownSelect
          options={q.options!}
          value={profile.height}
          placeholder="Choose your height"
          onChange={(v) => update({ height: v })}
        />
      );
    case "waist":
      return (
        <DropdownSelect
          options={q.options!}
          value={profile.waist}
          placeholder="Choose your waist"
          onChange={(v) => update({ waist: v })}
        />
      );
    case "hip":
      return (
        <DropdownSelect
          options={q.options!}
          value={profile.hip}
          placeholder="Choose your hip"
          onChange={(v) => update({ hip: v })}
        />
      );
    case "weight":
      return (
        <div>
          <NumberEntry
            value={profile.weightSkipped ? "" : profile.weight ?? ""}
            unit={q.unit}
            min={q.min}
            max={q.max}
            placeholder="—"
            onChange={(v) => update({ weight: v, weightSkipped: false })}
          />
          <p className="mt-4 text-center text-xs text-muted">
            Totally optional — it only fine-tunes proportions.
          </p>
        </div>
      );
    case "waistFit":
      return (
        <ChoiceCards
          options={q.options!}
          value={profile.waistFit}
          onChange={(v) => choose({ waistFit: v })}
        />
      );
    case "rise":
      return (
        <ChoiceCards
          options={q.options!}
          value={profile.rise}
          onChange={(v) => choose({ rise: v })}
        />
      );
    case "thighFit":
      return (
        <ChoiceCards
          options={q.options!}
          value={profile.thighFit}
          onChange={(v) => choose({ thighFit: v })}
        />
      );
    case "frustration":
      return (
        <ChoiceCards
          options={q.options!}
          value={profile.frustration}
          onChange={(v) => choose({ frustration: v })}
        />
      );
    case "brands":
      return (
        <div>
          <BrandGrid
            options={q.options!.map((o) => o.value)}
            selected={profile.brands}
            onToggle={(brand) =>
              setProfile((p) => ({
                ...p,
                brands: p.brands.includes(brand)
                  ? p.brands.filter((b) => b !== brand)
                  : [...p.brands, brand],
              }))
            }
          />
          <p className="mt-4 text-xs text-muted">
            {profile.brands.length
              ? `${profile.brands.length} selected — we'll ask sizes next.`
              : "Pick any you've owned, or continue if none apply."}
          </p>
        </div>
      );
    case "brandSizes":
      return (
        <BrandSizeList
          brands={profile.brands}
          sizes={profile.brandSizes}
          onChange={(brand, size) =>
            setProfile((p) => ({
              ...p,
              brandSizes: { ...p.brandSizes, [brand]: size },
            }))
          }
        />
      );
    default:
      return null;
  }
}

function buildReviewRows(p: FitProfile): { id: string; label: string; value: string }[] {
  const rows: { id: string; label: string; value: string }[] = [
    { id: "height", label: "Height", value: p.height ?? "" },
    {
      id: "weight",
      label: "Weight",
      value: p.weightSkipped || !p.weight ? "Skipped" : `${p.weight} lbs`,
    },
    { id: "waist", label: "Waist", value: p.waist ?? "" },
    { id: "hip", label: "Hip", value: p.hip ?? "" },
    { id: "waistFit", label: "Waist fit", value: p.waistFit ?? "" },
    { id: "rise", label: "Rise", value: p.rise ?? "" },
    { id: "thighFit", label: "Thigh fit", value: p.thighFit ?? "" },
    {
      id: "brands",
      label: "Brands",
      value: p.brands.length ? p.brands.join(", ") : "None",
    },
  ];
  if (p.brands.length) {
    rows.push({
      id: "brandSizes",
      label: "Sizes",
      value: p.brands
        .map((b) => (p.brandSizes[b] ? `${b} ${p.brandSizes[b]}` : `${b} —`))
        .join(", "),
    });
  }
  rows.push({
    id: "frustration",
    label: "Frustration",
    value: p.frustration ?? "",
  });
  return rows;
}

function isValid(q: Question, p: FitProfile): boolean {
  switch (q.id) {
    case "height":
      return !!p.height;
    case "waist":
      return !!p.waist;
    case "hip":
      return !!p.hip;
    case "weight":
      return true; // optional
    case "waistFit":
      return !!p.waistFit;
    case "rise":
      return !!p.rise;
    case "thighFit":
      return !!p.thighFit;
    case "frustration":
      return !!p.frustration;
    case "brands":
      return true; // zero is allowed (means "none")
    case "brandSizes":
      return true; // sizes are helpful but not mandatory
    default:
      return true;
  }
}

function continueLabel(
  q: Question,
  p: FitProfile,
  index: number,
  total: number
): string {
  if (index >= total - 1) return "Review answers";
  if (q.id === "brands")
    return p.brands.length ? `Continue · ${p.brands.length}` : "None of these";
  return "Continue";
}
