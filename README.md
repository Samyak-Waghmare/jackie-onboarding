# Jackie Jeans — Smart Fit Onboarding

Two ways to complete the Jackie Jeans **Fit Quiz**, then a seamless hand-off to
the main store. Built for the Humanity Founders hackathon.

**Live:** _add your Vercel URL here_
**Hands off to:** https://jackie-jeans.vercel.app/

## What's inside

- **Manual onboarding** (`/onboarding/manual`) — a calm, mobile-first quiz: **dropdowns**
  for measurements, single-select cards, multi-select brands, optional skip,
  and conditional per-brand sizing. One question at a time, progress, and a
  **review screen to edit any answer** before finishing.
- **AI voice onboarding** (`/onboarding/voice`) — a real voice-to-voice stylist. It
  **speaks** each question, **listens**, **confirms** ("Got it — waist 30."),
  re-asks when unclear, handles multi-select brands and per-brand sizes by
  voice, and gracefully skips the optional weight question.
- **Completion** (`/complete`) — an explainable fit recommendation, an answer
  summary, and a reliable redirect that **carries the fit profile across** to
  the main site (readable query params + a compact `fit` blob).

All **10 quiz questions are present in both flows**, driven from one shared
definition in [`lib/quiz.ts`](lib/quiz.ts) so the two flows can never drift.

## Voice stack (free, no key required)

| Concern | Approach |
| --- | --- |
| Speak questions | Browser `speechSynthesis` (works on iOS too) |
| Hear answers (Android / desktop) | Web Speech API `webkitSpeechRecognition` — free, no key |
| Hear answers (**iPhone** / Firefox) | Records the mic and transcribes via **Groq Whisper** (`/api/voice/transcribe`) — needs `GROQ_API_KEY` (free tier) |
| Understand answers | On-device rule parser ([`lib/parse.ts`](lib/parse.ts)) — word→number, "five foot six"→5'6″, fuzzy option/brand matching, skip detection |
| Always-on safety net | If no key / mic is blocked, questions are still spoken aloud and answers can be typed — the flow always completes |

**Works on all phones** when `GROQ_API_KEY` is set (see `.env.example`). Without
it, Android/desktop Chrome are still full voice-to-voice; iPhone falls back to
spoken-questions + typed-answers.

## Run locally

```bash
npm install
npm run dev      # http://localhost:3000
```

## Deploy (Vercel)

```bash
npm i -g vercel
vercel            # first time: log in + link
vercel --prod     # production deploy → live link
```

No environment variables are required. `GROQ_API_KEY` is optional (see
`.env.example`).

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · Framer Motion.
