"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChoiceOption } from "@/lib/quiz";

/**
 * A literal dropdown (the brief specifies "Dropdown" for height / waist / hip).
 * Opens a mobile-native bottom sheet with the full option list so it can't get
 * clipped by the flow's transition container, and feels premium on phones.
 */
export function DropdownSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
}: {
  options: ChoiceOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open && activeRef.current) {
      activeRef.current.scrollIntoView({ block: "center" });
    }
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={selected ? `Selected ${selected.label}` : placeholder}
        className="flex w-full items-center justify-between rounded-2xl border border-line bg-paper px-5 py-5 text-left transition hover:border-denim/30"
      >
        <span
          className={`font-display text-2xl font-semibold ${
            selected ? "text-denim" : "text-muted/60"
          }`}
        >
          {selected ? selected.label : placeholder}
        </span>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-muted">
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="relative z-10 w-full max-w-md rounded-t-3xl bg-paper pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-20px_50px_-20px_rgba(13,15,28,0.4)]"
            >
              <div className="flex items-center justify-between px-5 pb-1 pt-4">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Select an option
                </span>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="grid h-9 w-9 place-items-center rounded-full text-muted transition hover:bg-denim/5"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <div
                className="no-scrollbar max-h-[60vh] overflow-y-auto px-3 pb-2"
                role="listbox"
              >
                {options.map((opt) => {
                  const active = opt.value === value;
                  return (
                    <button
                      key={opt.value}
                      role="option"
                      aria-selected={active}
                      ref={active ? activeRef : undefined}
                      onClick={() => {
                        onChange(opt.value);
                        setOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-left transition ${
                        active ? "bg-denim text-paper" : "text-ink hover:bg-denim/5"
                      }`}
                    >
                      <span
                        className={`text-lg ${active ? "font-display font-semibold" : ""}`}
                      >
                        {opt.label}
                      </span>
                      {active && (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M5 12l5 5L19 7"
                            stroke="currentColor"
                            strokeWidth="2.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
