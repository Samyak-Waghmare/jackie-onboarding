"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* Minimal typings for the Web Speech API (not in TS lib dom by default). */
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
};

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function useSpeech() {
  const [sttSupported, setSttSupported] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const [cloudSttSupported, setCloudSttSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [recording, setRecording] = useState(false);

  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recordLangRef = useRef<string>("en");

  useEffect(() => {
    setSttSupported(!!getRecognitionCtor());
    setTtsSupported(
      typeof window !== "undefined" && "speechSynthesis" in window
    );
    setCloudSttSupported(
      typeof navigator !== "undefined" &&
        !!navigator.mediaDevices?.getUserMedia &&
        typeof MediaRecorder !== "undefined"
    );

    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const pick = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return;
      // Prefer a warm, natural English voice.
      const preferred = [
        "Samantha",
        "Google US English",
        "Microsoft Aria Online (Natural) - English (United States)",
        "Microsoft Jenny Online (Natural) - English (United States)",
        "Microsoft Zira",
        "Karen",
        "Moira",
      ];
      for (const name of preferred) {
        const v = voices.find((x) => x.name === name);
        if (v) {
          voiceRef.current = v;
          return;
        }
      }
      voiceRef.current =
        voices.find((v) => /en[-_]US/i.test(v.lang)) ||
        voices.find((v) => /^en/i.test(v.lang)) ||
        voices[0];
    };
    pick();
    window.speechSynthesis.onvoiceschanged = pick;
  }, []);

  /** Speak a line; resolves when finished (or immediately if muted/unsupported). */
  // Pick the best installed voice for a BCP-47 tag (falls back gracefully).
  function pickVoiceFor(lang: string): SpeechSynthesisVoice | null {
    if (typeof window === "undefined" || !("speechSynthesis" in window))
      return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;
    const base = lang.slice(0, 2).toLowerCase();
    if (base === "en" && voiceRef.current) return voiceRef.current;
    const exact = voices.find((v) => v.lang.toLowerCase() === lang.toLowerCase());
    if (exact) return exact;
    const prefix = voices.find((v) => v.lang.toLowerCase().startsWith(base));
    return prefix || voiceRef.current || voices[0];
  }

  const speak = useCallback(
    (text: string, opts?: { lang?: string }): Promise<void> =>
      new Promise((resolve) => {
        if (typeof window === "undefined" || !("speechSynthesis" in window)) {
          resolve();
          return;
        }
        const synth = window.speechSynthesis;
        try {
          synth.cancel();
        } catch {
          /* ignore */
        }
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 1.02;
        u.pitch = 1.0;
        const lang = opts?.lang || "en-US";
        u.lang = lang;
        const v = pickVoiceFor(lang);
        if (v) u.voice = v;
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          setSpeaking(false);
          resolve();
        };
        u.onstart = () => setSpeaking(true);
        u.onend = finish;
        u.onerror = finish;
        // Safety net: never hang the flow if onend doesn't fire.
        const ms = Math.min(15000, 1200 + text.length * 70);
        setTimeout(finish, ms);
        synth.speak(u);
      }),
    []
  );

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        /* ignore */
      }
    }
    setSpeaking(false);
  }, []);

  /** Listen once. Resolves with final transcript; rejects on error/no-speech. */
  const listen = useCallback(
    (onInterim?: (t: string) => void, lang: string = "en-US"): Promise<string> =>
      new Promise((resolve, reject) => {
        const Ctor = getRecognitionCtor();
        if (!Ctor) {
          reject(new Error("unsupported"));
          return;
        }
        const rec = new Ctor();
        rec.lang = lang;
        rec.interimResults = true;
        rec.continuous = false;
        rec.maxAlternatives = 1;
        recRef.current = rec;

        let finalText = "";
        let got = false;
        let lastErr = "";

        rec.onresult = (e: any) => {
          let interim = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const r = e.results[i];
            if (r.isFinal) {
              finalText += r[0].transcript;
              got = true;
            } else {
              interim += r[0].transcript;
            }
          }
          onInterim?.((finalText + " " + interim).trim());
        };
        rec.onerror = (e: any) => {
          lastErr = e?.error || "error";
        };
        rec.onend = () => {
          setListening(false);
          recRef.current = null;
          if (got && finalText.trim()) resolve(finalText.trim());
          else reject(new Error(lastErr || "no-speech"));
        };

        try {
          setListening(true);
          rec.start();
        } catch (err) {
          setListening(false);
          reject(err as Error);
        }
      }),
    []
  );

  const stopListening = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
  }, []);

  // ── Cloud STT (MediaRecorder → Groq Whisper) — the iPhone / Firefox path ──────
  function pickMime(): string {
    if (typeof MediaRecorder === "undefined") return "";
    const mr = MediaRecorder as unknown as {
      isTypeSupported?: (t: string) => boolean;
    };
    if (mr.isTypeSupported?.("audio/webm")) return "audio/webm";
    if (mr.isTypeSupported?.("audio/mp4")) return "audio/mp4";
    return "";
  }

  /** Begin capturing mic audio (prompts for permission the first time). */
  const startRecording = useCallback(
    async (lang: string = "en"): Promise<void> => {
    recordLangRef.current = lang;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    chunksRef.current = [];
    const mime = pickMime();
    const rec = mime
      ? new MediaRecorder(stream, { mimeType: mime })
      : new MediaRecorder(stream);
    mediaRef.current = rec;
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.start();
    setRecording(true);
  }, []);

  /** Stop capture and transcribe via the server. Resolves with the text. */
  const stopRecording = useCallback(
    (): Promise<string> =>
      new Promise((resolve, reject) => {
        const rec = mediaRef.current;
        if (!rec) {
          reject(new Error("not-recording"));
          return;
        }
        rec.onstop = async () => {
          setRecording(false);
          streamRef.current?.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
          const type = rec.mimeType || "audio/webm";
          const blob = new Blob(chunksRef.current, { type });
          mediaRef.current = null;
          if (blob.size < 1200) {
            reject(new Error("empty"));
            return;
          }
          const ext = type.includes("mp4")
            ? "mp4"
            : type.includes("webm")
              ? "webm"
              : "m4a";
          try {
            const fd = new FormData();
            fd.append("audio", blob, `audio.${ext}`);
            fd.append("language", recordLangRef.current || "en");
            const res = await fetch("/api/voice/transcribe", {
              method: "POST",
              body: fd,
            });
            const data = await res.json();
            if (data?.text) resolve(String(data.text).trim());
            else reject(new Error(data?.reason || "no-text"));
          } catch (e) {
            reject(e as Error);
          }
        };
        try {
          rec.stop();
        } catch (e) {
          reject(e as Error);
        }
      }),
    []
  );

  const cancelRecording = useCallback(() => {
    try {
      mediaRef.current?.stop();
    } catch {
      /* ignore */
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRef.current = null;
    setRecording(false);
  }, []);

  /** True if a GROQ key is configured server-side (so cloud STT will work). */
  const probeCloudStt = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/voice/transcribe", { method: "POST" });
      const data = await res.json();
      return data?.reason !== "no-key";
    } catch {
      return false;
    }
  }, []);

  return {
    sttSupported,
    ttsSupported,
    cloudSttSupported,
    listening,
    speaking,
    recording,
    speak,
    stopSpeaking,
    listen,
    stopListening,
    startRecording,
    stopRecording,
    cancelRecording,
    probeCloudStt,
  };
}
