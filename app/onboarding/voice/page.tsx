"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  QUESTIONS,
  FitProfile,
  emptyProfile,
  TOTAL_QUESTIONS,
} from "@/lib/quiz";
import {
  parseHeight,
  parseInches,
  parseWeight,
  parseSize,
  matchChoice,
  matchBrands,
  isSkip,
  isNone,
  normalize,
} from "@/lib/parse";
import {
  saveProfile,
  saveProgress,
  loadProgress,
  clearProgress,
} from "@/lib/storage";
import {
  vt,
  LANGS,
  LangCode,
  localizeOption,
  CHOICE_SYNONYMS,
  DONE_WORDS,
} from "@/lib/i18n";
import { useSpeech } from "@/lib/useSpeech";
import { BrandMark } from "@/components/BrandMark";

type Msg = { role: "ai" | "user"; text: string };

export default function VoiceFlow() {
  const router = useRouter();
  const speech = useSpeech();
  const {
    sttSupported,
    cloudSttSupported,
    listening,
    speaking,
    recording,
    speak,
    listen,
    stopListening,
  } = speech;

  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [interim, setInterim] = useState("");
  const [awaiting, setAwaiting] = useState(false);
  const [typeMode, setTypeMode] = useState(false);
  const [muted, setMuted] = useState(false);
  const [typed, setTyped] = useState("");
  const [qNum, setQNum] = useState(0);
  // null = still probing whether a cloud-STT key is configured.
  const [cloudReady, setCloudReady] = useState<boolean | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [lang, setLang] = useState<LangCode>("en");
  const [captionsOn, setCaptionsOn] = useState(true);

  const L = vt(lang);
  const speechLang = LANGS.find((l) => l.code === lang)?.speech ?? "en-US";
  const [profile, setProfile] = useState<FitProfile>(emptyProfile());

  const profileRef = useRef<FitProfile>(emptyProfile());
  const answerResolver = useRef<((t: string) => void) | null>(null);
  const cancelled = useRef(false);
  const mutedRef = useRef(false);
  const typeModeRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const resumingRef = useRef(false);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);
  useEffect(() => {
    typeModeRef.current = typeMode;
  }, [typeMode]);

  // Input method = Web Speech (Chrome/Android) → cloud STT (iPhone, if a key is
  // configured) → typing. Probe the cloud endpoint up front when the browser
  // has no built-in recognition.
  useEffect(() => {
    if (sttSupported) return;
    if (!cloudSttSupported) {
      setCloudReady(false);
      return;
    }
    let alive = true;
    speech.probeCloudStt().then((ok) => {
      if (alive) setCloudReady(ok);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sttSupported, cloudSttSupported]);

  // Fall back to typing only when neither browser nor cloud STT can be used.
  useEffect(() => {
    if (started && !sttSupported && cloudReady === false) setTypeMode(true);
  }, [started, sttSupported, cloudReady]);

  useEffect(() => {
    return () => {
      cancelled.current = true;
      speech.stopSpeaking();
      stopListening();
      speech.cancelRecording();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, interim, awaiting]);

  // Resume an in-progress voice session when arriving from the landing card.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("resume") !== "1") return;
    const p = loadProgress();
    if (p && p.flow === "voice") {
      profileRef.current = { ...emptyProfile(), ...p.profile };
      setProfile(profileRef.current);
      if (p.lang) setLang(p.lang as LangCode);
      resumingRef.current = true;
    }
  }, []);

  // Persist progress as the conversation advances (cleared on completion).
  useEffect(() => {
    if (!started || done) return;
    saveProgress({
      flow: "voice",
      profile: profileRef.current,
      position: qNum,
      total: TOTAL_QUESTIONS,
      lang,
      updatedAt: Date.now(),
    });
  }, [qNum, profile, started, done, lang]);

  // ── small helpers ──────────────────────────────────────────────────────────
  const pushAI = (text: string) =>
    setMessages((m) => [...m, { role: "ai", text }]);
  const pushUser = (text: string) =>
    setMessages((m) => [...m, { role: "user", text }]);

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const say = async (text: string) => {
    if (cancelled.current) return;
    pushAI(text);
    if (mutedRef.current) await sleep(Math.min(2800, 700 + text.length * 28));
    else await speak(text, { lang: speechLang });
  };

  const commit = (patch: Partial<FitProfile>) => {
    profileRef.current = { ...profileRef.current, ...patch };
    setProfile(profileRef.current);
  };

  const startMic = () => {
    if (!sttSupported || typeModeRef.current) return;
    setInterim("");
    listen(setInterim, speechLang)
      .then((t) => resolveAnswer(t))
      .catch(() => setInterim(""));
  };

  const resolveAnswer = (text: string) => {
    const r = answerResolver.current;
    if (!r) return;
    answerResolver.current = null;
    setAwaiting(false);
    setInterim("");
    const clean = text.trim();
    if (clean) pushUser(clean);
    r(clean);
  };

  const getUserAnswer = (): Promise<string> =>
    new Promise((resolve) => {
      answerResolver.current = resolve;
      setInterim("");
      setAwaiting(true);
      // Web Speech auto-listens; cloud waits for a record tap; type waits for input.
      if (sttSupported && !typeModeRef.current) startMic();
    });

  // Which input the dock should present right now.
  const mode: "webspeech" | "cloud" | "type" = typeMode
    ? "type"
    : sttSupported
      ? "webspeech"
      : cloudSttSupported && cloudReady === true
        ? "cloud"
        : "type";

  // Cloud-STT mic: first tap records, second tap stops + transcribes.
  const onCloudMic = async () => {
    if (!awaiting) return;
    if (recording) {
      setTranscribing(true);
      try {
        const text = await speech.stopRecording();
        setTranscribing(false);
        resolveAnswer(text);
      } catch (e) {
        setTranscribing(false);
        if ((e as Error)?.message === "no-key") {
          setCloudReady(false);
          setTypeMode(true);
        }
        // "empty"/transient errors: user can just tap to record again.
      }
    } else {
      try {
        await speech.startRecording(lang);
      } catch {
        setTypeMode(true); // mic blocked / denied
      }
    }
  };

  const onMic = () => {
    if (!awaiting) return;
    if (mode === "webspeech") {
      if (listening) stopListening();
      else startMic();
    } else if (mode === "cloud") {
      onCloudMic();
    }
  };

  // Speak a near-silent utterance inside the start gesture so iOS unlocks audio.
  const primeTts = () => {
    if (mutedRef.current) return;
    try {
      const synth = window.speechSynthesis;
      if (!synth) return;
      synth.resume?.();
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      synth.speak(u);
    } catch {
      /* ignore */
    }
  };

  // optional remote understanding (no-op without a configured key)
  const understand = async (
    kind: string,
    question: string,
    transcript: string,
    options?: string[]
  ): Promise<any> => {
    try {
      const res = await fetch("/api/voice/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, question, transcript, options }),
      });
      const data = await res.json();
      return data?.value ?? null;
    } catch {
      return null;
    }
  };

  // ── the conversation ────────────────────────────────────────────────────────
  const begin = () => {
    cancelled.current = false;
    setStarted(true);
    primeTts(); // unlock iOS audio inside the gesture
    (async () => {
      let ready = cloudReady;
      if (!sttSupported && cloudSttSupported && ready === null) {
        ready = await speech.probeCloudStt();
        setCloudReady(ready);
      }
      if (!sttSupported && !(cloudSttSupported && ready === true)) {
        setTypeMode(true);
      }
      run(resumingRef.current);
    })();
  };

  async function run(resume = false) {
    try {
      const has = (k: keyof FitProfile) => {
        const v = profileRef.current[k];
        if (Array.isArray(v)) return v.length > 0;
        return v !== undefined && v !== "" && v !== null;
      };
      await say(L.greeting(resume));

      // Q1 Height
      setQNum(1);
      if (!(resume && has("height"))) {
        const height = await askValue({
          prompt: L.pHeight,
          parse: (t) => parseHeight(t, lang),
          remote: (t) => understand("height", "height", t),
          confirm: (v) => L.cHeight(v),
        });
        if (height) commit({ height });
      }

      // Q2 Weight (optional)
      setQNum(2);
      if (!(resume && (has("weight") || profileRef.current.weightSkipped))) {
        const weight = await askValue({
          prompt: L.pWeight,
          optional: true,
          parse: (t) => parseWeight(t, lang),
          remote: (t) => understand("number", "weight in pounds", t),
          confirm: (v) => L.cWeight(v),
        });
        if (weight) commit({ weight, weightSkipped: false });
        else commit({ weight: "", weightSkipped: true });
      }

      // Q3 Waist
      setQNum(3);
      if (!(resume && has("waist"))) {
        const waist = await askValue({
          prompt: L.pWaist,
          parse: (t) => parseInches(t, 24, 52, lang),
          remote: (t) => understand("number", "waist in inches (24 to 52)", t),
          confirm: (v) => L.cWaist(v),
        });
        if (waist) commit({ waist });
      }

      // Q4 Hip
      setQNum(4);
      if (!(resume && has("hip"))) {
        const hip = await askValue({
          prompt: L.pHip,
          parse: (t) => parseInches(t, 32, 60, lang),
          remote: (t) => understand("number", "hip in inches (32 to 60)", t),
          confirm: (v) => L.cHip(v),
        });
        if (hip) commit({ hip });
      }

      // Q5 Waist fit
      setQNum(5);
      if (!(resume && has("waistFit"))) {
        const waistFit = await askChoice(4, L.pWaistFit);
        if (waistFit) commit({ waistFit });
      }

      // Q6 Rise
      setQNum(6);
      if (!(resume && has("rise"))) {
        const rise = await askChoice(5, L.pRise);
        if (rise) commit({ rise });
      }

      // Q7 Thigh fit
      setQNum(7);
      if (!(resume && has("thighFit"))) {
        const thighFit = await askChoice(6, L.pThigh);
        if (thighFit) commit({ thighFit });
      }

      // Q8 Brands (multi-select)
      setQNum(8);
      if (!(resume && profileRef.current.brands.length)) await askBrands();

      // Q9 Per-brand sizes (conditional)
      setQNum(9);
      if (
        profileRef.current.brands.length &&
        !(resume && Object.keys(profileRef.current.brandSizes).length)
      )
        await askBrandSizes();

      // Q10 Frustration
      setQNum(10);
      if (!(resume && has("frustration"))) {
        const frustration = await askChoice(9, L.pFrustration);
        if (frustration) commit({ frustration });
      }

      // Wrap up + hand off
      if (cancelled.current) return;
      const p = profileRef.current;
      await say(
        L.wrapUp({
          height: p.height,
          waist: p.waist,
          thigh: p.thighFit ? localizeOption(lang, p.thighFit) : undefined,
          rise: p.rise ? localizeOption(lang, p.rise) : undefined,
        })
      );
      saveProfile(p);
      clearProgress();
      setDone(true);
      await sleep(1300);
      if (!cancelled.current) router.push("/complete?from=voice");
    } catch {
      /* conversation aborted (navigation/unmount) */
    }
  }

  // standard single-value question
  async function askValue(cfg: {
    prompt: string;
    optional?: boolean;
    parse: (t: string) => string | null;
    remote: (t: string) => Promise<any>;
    confirm: (v: string) => string;
  }): Promise<string | null> {
    await say(cfg.prompt);
    let tries = 0;
    while (!cancelled.current) {
      const text = await getUserAnswer();
      if (!text) {
        tries++;
        if (tries >= 3) return null;
        await say(L.reaskSoft);
        continue;
      }
      if (cfg.optional && isSkip(text, lang)) {
        await say(L.weightSkip);
        return null;
      }
      let value = cfg.parse(text);
      if (value == null) value = await cfg.remote(text);
      if (value != null && String(value).trim()) {
        const v = String(value);
        await say(cfg.confirm(v));
        return v;
      }
      tries++;
      if (tries >= 3) {
        await say(cfg.optional ? L.skipGiveupOptional : L.giveupRequired);
        return null;
      }
      await say(cfg.optional ? L.reaskNumberOptional : L.reaskValue(cfg.prompt));
    }
    return null;
  }

  // choice question by QUESTIONS index
  async function askChoice(qi: number, prompt: string): Promise<string | null> {
    const q = QUESTIONS[qi];
    const opts = q.options!;
    await say(prompt);
    let tries = 0;
    while (!cancelled.current) {
      const text = await getUserAnswer();
      if (text) {
        let value = matchChoice(text, opts, CHOICE_SYNONYMS[lang]);
        if (!value) {
          const r = await understand(
            "choice",
            q.title,
            text,
            opts.map((o) => o.value)
          );
          if (r && opts.some((o) => o.value === r)) value = r;
        }
        if (value) {
          await say(L.ack(q.id, localizeOption(lang, value)));
          return value;
        }
      }
      tries++;
      if (tries >= 3) {
        await say(L.choiceGiveup);
        return null;
      }
      await say(
        L.choiceReask(opts.map((o) => localizeOption(lang, o.value)).join(", "))
      );
    }
    return null;
  }

  async function askBrands() {
    const q = QUESTIONS[7];
    await say(L.pBrands);
    const selected: string[] = [];
    let misses = 0;
    while (!cancelled.current) {
      const text = await getUserAnswer();
      const lower = normalize(text);

      if (
        selected.length > 0 &&
        (DONE_WORDS[lang].test(lower) || /\b(no|non)\b/.test(lower))
      ) {
        break;
      }
      if (selected.length === 0 && isNone(text, lang)) {
        await say(L.brandSkip);
        break;
      }

      let found = matchBrands(text);
      if (!found.length && !isNone(text, lang)) {
        const r = await understand(
          "multiselect",
          "denim brands owned",
          text,
          q.options!.map((o) => o.value)
        );
        if (Array.isArray(r)) found = r.filter((b: string) => typeof b === "string");
      }
      const added = found.filter((b) => !selected.includes(b));
      added.forEach((b) => selected.push(b));
      commit({ brands: [...selected] });

      if (added.length) {
        misses = 0;
        await say(L.brandAck(listToText(added)));
      } else {
        misses++;
        if (misses >= 3) {
          if (!selected.length) await say(L.brandSkip);
          break;
        }
        await say(selected.length ? L.brandReaskHave : L.brandReaskNone);
      }
    }
  }

  async function askBrandSizes() {
    await say(L.sizesIntro);
    for (const brand of profileRef.current.brands) {
      if (cancelled.current) return;
      await say(L.sizeAsk(brand));
      let tries = 0;
      while (!cancelled.current) {
        const text = await getUserAnswer();
        if (isSkip(text, lang) || (!text && tries >= 1)) {
          await say(L.sizeSkip);
          break;
        }
        let size = parseSize(text, lang);
        if (!size && text)
          size = await understand("number", `size in ${brand}`, text);
        if (size) {
          commit({
            brandSizes: { ...profileRef.current.brandSizes, [brand]: String(size) },
          });
          await say(L.sizeConfirm(brand, String(size)));
          break;
        }
        tries++;
        if (tries >= 2) {
          await say(L.sizeGiveup);
          break;
        }
        await say(L.sizeReask(brand));
      }
    }
  }

  // ── render ──────────────────────────────────────────────────────────────────
  const showVoice = sttSupported || (cloudSttSupported && cloudReady !== false);
  const lastAi = [...messages].reverse().find((m) => m.role === "ai")?.text ?? "";
  if (!started) {
    return (
      <StartScreen
        showVoice={showVoice}
        lang={lang}
        setLang={setLang}
        onBegin={begin}
        onExit={() => router.push("/")}
      />
    );
  }

  return (
    <main className="bg-canvas flex min-h-dvh flex-col items-center px-4 pb-4 pt-5">
      <div className="flex w-full max-w-md flex-1 flex-col">
        {/* header */}
        <div className="flex items-center justify-between px-1">
          <button
            onClick={() => router.push("/")}
            aria-label="Exit"
            className="grid h-10 w-10 place-items-center rounded-full text-muted transition hover:bg-denim/5"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <span className="text-xs font-medium uppercase tracking-[0.22em] text-muted">
            {done ? "Complete" : `Question ${Math.max(1, qNum)} of ${TOTAL_QUESTIONS}`}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCaptionsOn((c) => !c)}
              aria-label={captionsOn ? "Hide captions" : "Show captions"}
              aria-pressed={captionsOn}
              className={`grid h-10 w-10 place-items-center rounded-full transition hover:bg-denim/5 ${
                captionsOn ? "text-denim" : "text-muted"
              }`}
            >
              <CaptionIcon />
            </button>
            <button
              onClick={() => setMuted((m) => !m)}
              aria-label={muted ? "Unmute stylist" : "Mute stylist"}
              aria-pressed={!muted}
              className="grid h-10 w-10 place-items-center rounded-full text-denim transition hover:bg-denim/5"
            >
              {muted ? <MuteIcon /> : <SpeakerIcon />}
            </button>
          </div>
        </div>
        <div
          className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-denim/10"
          role="progressbar"
          aria-label="Quiz progress"
          aria-valuemin={0}
          aria-valuemax={TOTAL_QUESTIONS}
          aria-valuenow={Math.max(1, qNum)}
        >
          <motion.div
            className="h-full rounded-full bg-denim"
            initial={false}
            animate={{ width: `${(Math.max(1, qNum) / TOTAL_QUESTIONS) * 100}%` }}
            transition={{ type: "spring", stiffness: 150, damping: 22 }}
          />
        </div>

        {/* transcript */}
        <div
          ref={scrollRef}
          role="log"
          aria-live="polite"
          aria-label="Conversation transcript"
          className="no-scrollbar mt-4 flex-1 space-y-3 overflow-y-auto pb-2"
        >
          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${
                    m.role === "ai"
                      ? "rounded-tl-md bg-paper text-ink shadow-[0_8px_24px_-18px_rgba(33,49,77,0.7)]"
                      : "rounded-tr-md bg-denim text-paper"
                  }`}
                >
                  {m.text}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {interim && (
            <div className="flex justify-end">
              <div className="max-w-[82%] rounded-2xl rounded-tr-md bg-denim/40 px-4 py-2.5 text-[15px] italic text-paper">
                {interim}…
              </div>
            </div>
          )}
        </div>

        {/* high-visibility caption bar (accessibility) */}
        {captionsOn && !done && (lastAi || interim) && (
          <div
            className="mt-2 rounded-2xl bg-ink/90 px-4 py-3 text-center"
            aria-hidden
          >
            <p className="text-[15px] font-medium leading-snug text-paper">
              {lastAi}
            </p>
            {interim && (
              <p className="mt-1 text-[13px] italic text-paper/70">{interim}…</p>
            )}
          </div>
        )}

        {/* control dock */}
        <div className="pt-2">
          {done ? (
            <div className="flex items-center justify-center gap-3 py-6 text-denim">
              <Spinner />
              <span className="font-medium">Building your fit…</span>
            </div>
          ) : (
            <ControlDock
              mode={mode}
              awaiting={awaiting}
              micActive={mode === "cloud" ? recording : listening}
              transcribing={transcribing}
              speaking={speaking}
              canVoice={sttSupported || (cloudSttSupported && cloudReady === true)}
              typed={typed}
              setTyped={setTyped}
              onSendTyped={() => {
                if (typed.trim()) resolveAnswer(typed);
                setTyped("");
              }}
              onMic={onMic}
              onToggleType={() => setTypeMode((t) => !t)}
            />
          )}
        </div>
      </div>
    </main>
  );

}

function listToText(items: string[]): string {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

// ── sub-components ─────────────────────────────────────────────────────────────

function StartScreen({
  showVoice,
  lang,
  setLang,
  onBegin,
  onExit,
}: {
  showVoice: boolean;
  lang: LangCode;
  setLang: (l: LangCode) => void;
  onBegin: () => void;
  onExit: () => void;
}) {
  return (
    <main className="bg-canvas flex min-h-dvh flex-col items-center px-6 pb-10 pt-6">
      <div className="flex w-full max-w-md flex-1 flex-col">
        <div className="flex items-center justify-between">
          <button
            onClick={onExit}
            aria-label="Back"
            className="grid h-10 w-10 place-items-center rounded-full text-denim transition hover:bg-denim/5"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <BrandMark />
          <span className="w-10" />
        </div>

        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative grid h-28 w-28 place-items-center"
          >
            <span className="absolute h-28 w-28 rounded-full bg-denim/10 animate-[pulse-ring_1.8s_ease-out_infinite]" />
            <span className="relative grid h-24 w-24 place-items-center rounded-full bg-denim text-paper">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                <path d="M12 15a3 3 0 003-3V6a3 3 0 10-6 0v6a3 3 0 003 3z" stroke="currentColor" strokeWidth="1.8" />
                <path d="M5 11a7 7 0 0014 0M12 18v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </span>
          </motion.div>

          <h1 className="font-display mt-8 text-[2rem] font-semibold leading-tight text-denim">
            Meet your stylist
          </h1>
          <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-muted">
            I&apos;ll talk you through the fit quiz — just answer out loud, the
            way you&apos;d chat with a person. It takes about a minute.
          </p>

          {!showVoice && (
            <p className="mt-4 max-w-xs rounded-2xl bg-stitch/10 px-4 py-3 text-[13px] text-ink">
              I&apos;ll read each question aloud and you can type your answers.
              For full voice-to-voice, open this in Chrome.
            </p>
          )}
        </div>

        <div className="mb-4">
          <p className="mb-2 text-center text-xs font-medium uppercase tracking-[0.18em] text-muted">
            Voice language
          </p>
          <div
            className="flex justify-center gap-2"
            role="group"
            aria-label="Voice language"
          >
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                aria-pressed={lang === l.code}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition active:scale-95 ${
                  lang === l.code
                    ? "border-denim bg-denim text-paper"
                    : "border-line bg-paper text-ink hover:border-denim/40"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={onBegin}
          className="w-full rounded-2xl bg-denim py-4 font-semibold text-paper shadow-[0_16px_34px_-18px_rgba(33,49,77,0.95)] transition active:scale-[0.99]"
        >
          {showVoice ? "Start talking" : "Begin"}
        </button>
        <p className="mt-3 text-center text-xs text-muted">
          {showVoice
            ? "We'll ask for mic access so you can answer out loud."
            : "Questions are spoken aloud; you answer by typing."}
        </p>
      </div>
    </main>
  );
}

function ControlDock({
  mode,
  awaiting,
  micActive,
  transcribing,
  speaking,
  canVoice,
  typed,
  setTyped,
  onSendTyped,
  onMic,
  onToggleType,
}: {
  mode: "webspeech" | "cloud" | "type";
  awaiting: boolean;
  micActive: boolean;
  transcribing: boolean;
  speaking: boolean;
  canVoice: boolean;
  typed: string;
  setTyped: (v: string) => void;
  onSendTyped: () => void;
  onMic: () => void;
  onToggleType: () => void;
}) {
  if (mode === "type") {
    return (
      <div className="space-y-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSendTyped();
          }}
          className="flex items-center gap-2 rounded-2xl border border-line bg-paper p-2 pl-4"
        >
          <input
            autoFocus
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            disabled={!awaiting}
            placeholder={awaiting ? "Type your answer…" : "One moment…"}
            className="flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted/60 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!awaiting || !typed.trim()}
            className="grid h-10 w-10 place-items-center rounded-xl bg-denim text-paper transition active:scale-90 disabled:opacity-30"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </form>
        {canVoice && (
          <button
            onClick={onToggleType}
            className="w-full text-center text-xs text-muted underline underline-offset-2 hover:text-denim"
          >
            Use voice instead
          </button>
        )}
      </div>
    );
  }

  const isCloud = mode === "cloud";
  const label = transcribing
    ? "Transcribing…"
    : micActive
      ? isCloud
        ? "Recording… tap to stop"
        : "Listening… tap to send"
      : awaiting
        ? isCloud
          ? "Tap to record"
          : "Tap to talk"
        : speaking
          ? "Stylist is speaking…"
          : "One moment…";

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <button
        onClick={onMic}
        disabled={!awaiting || transcribing}
        aria-label="Microphone"
        className={`relative grid h-20 w-20 place-items-center rounded-full transition active:scale-95 disabled:opacity-50 ${
          micActive ? "bg-stitch text-paper" : "bg-denim text-paper"
        }`}
      >
        {micActive && (
          <>
            <span className="absolute inset-0 rounded-full bg-stitch/40 animate-[pulse-ring_1.5s_ease-out_infinite]" />
            <span className="absolute inset-0 rounded-full bg-stitch/30 animate-[pulse-ring_1.5s_ease-out_infinite_0.4s]" />
          </>
        )}
        {transcribing ? (
          <span className="relative inline-block h-6 w-6 animate-spin rounded-full border-2 border-paper/40 border-t-paper" />
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className="relative">
            <path d="M12 15a3 3 0 003-3V6a3 3 0 10-6 0v6a3 3 0 003 3z" stroke="currentColor" strokeWidth="1.8" />
            <path d="M5 11a7 7 0 0014 0M12 18v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        )}
      </button>
      <span className="text-sm font-medium text-muted">{label}</span>
      <button
        onClick={onToggleType}
        className="text-xs text-muted underline underline-offset-2 hover:text-denim"
      >
        Type instead
      </button>
    </div>
  );
}

function Spinner() {
  return (
    <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-denim/30 border-t-denim" />
  );
}
function SpeakerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M11 5L6 9H3v6h3l5 4V5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M15.5 8.5a5 5 0 010 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function MuteIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M11 5L6 9H3v6h3l5 4V5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M22 9l-6 6M16 9l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function CaptionIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 10.5a2 2 0 100 3M15 10.5a2 2 0 100 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
