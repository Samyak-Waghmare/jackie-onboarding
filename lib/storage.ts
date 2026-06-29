import { FitProfile } from "./quiz";

const KEY = "jackie-fit-profile";
const PROGRESS_KEY = "jackie-fit-progress";
export const JACKIE_SITE = "https://jackie-jeans.vercel.app/";

export interface Progress {
  flow: "manual" | "voice";
  profile: FitProfile;
  /** manual: step index; voice: highest question number reached */
  position: number;
  total: number;
  lang?: string;
  updatedAt: number;
}

export function saveProgress(p: Progress) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export function loadProgress(): Progress | null {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Progress;
    // Expire stale sessions after 24h so it never feels stuck.
    if (!p.updatedAt || Date.now() - p.updatedAt > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(PROGRESS_KEY);
      return null;
    }
    return p;
  } catch {
    return null;
  }
}

export function clearProgress() {
  try {
    localStorage.removeItem(PROGRESS_KEY);
  } catch {
    /* ignore */
  }
}

export function saveProfile(p: FitProfile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage may be unavailable (private mode) — non-fatal */
  }
}

export function loadProfile(): FitProfile | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as FitProfile) : null;
  } catch {
    return null;
  }
}

export function clearProfile() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Build the hand-off URL to the main Jackie Jeans site, carrying the fit
 * profile across so the experience feels continuous (bonus). The main site
 * can read these whenever it's ready; the redirect itself never depends on it.
 */
export function redirectUrl(p: FitProfile): string {
  const params = new URLSearchParams();
  params.set("source", "fit-quiz");
  if (p.height) params.set("height", p.height);
  if (p.waist) params.set("waist", p.waist);
  if (p.hip) params.set("hip", p.hip);
  if (p.weight && !p.weightSkipped) params.set("weight", p.weight);
  if (p.waistFit) params.set("waistFit", p.waistFit);
  if (p.rise) params.set("rise", p.rise);
  if (p.thighFit) params.set("thighFit", p.thighFit);
  if (p.frustration) params.set("frustration", p.frustration);
  if (p.brands.length) params.set("brands", p.brands.join(","));
  // Full structured profile, compactly, for anything that wants it.
  try {
    params.set("fit", btoa(unescape(encodeURIComponent(JSON.stringify(p)))));
  } catch {
    /* ignore */
  }
  return `${JACKIE_SITE}?${params.toString()}`;
}
