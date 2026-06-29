import { FitProfile } from "./quiz";

export interface Recommendation {
  size: string;
  fitName: string;
  rise: string;
  confidence: "High" | "Good" | "Building";
  blurb: string;
}

function inches(v?: string): number | null {
  if (!v) return null;
  const n = parseInt(v.replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * A deliberately simple, explainable fit recommendation. It's not a sizing
 * model — it's a confident, on-brand summary that reflects the answers.
 */
export function recommend(p: FitProfile): Recommendation {
  const waist = inches(p.waist);
  const hip = inches(p.hip);

  // Modern denim is largely waist-in-inches sized; nudge by waist preference.
  let size = waist ?? 28;
  if (p.waistFit === "Relaxed") size += 1;
  if (p.waistFit === "Snug") size -= 0; // true to measurement

  // Thigh + rise become the silhouette name.
  const thigh =
    p.thighFit === "Fitted" ? "Slim" : p.thighFit === "Loose" ? "Wide-Leg" : "Straight";
  const rise = p.rise ?? "Mid rise";

  // A pronounced hip-to-waist difference → curve-friendly cut.
  const drop = waist != null && hip != null ? hip - waist : null;
  const curvy = drop != null && drop >= 11;
  const fitName = curvy ? `Curve ${thigh}` : thigh;

  const answered = [
    p.height,
    p.waist,
    p.hip,
    p.waistFit,
    p.rise,
    p.thighFit,
    p.frustration,
  ].filter(Boolean).length;
  const confidence: Recommendation["confidence"] =
    answered >= 7 && p.brands.length ? "High" : answered >= 6 ? "Good" : "Building";

  const frustrationLine: Record<string, string> = {
    "Waist gap": curvy
      ? "Your hip-to-waist difference is exactly why off-the-rack jeans gap — this curve cut is shaped to close it."
      : "We've prioritised a contoured waistband so it won't gap at the back.",
    "Hip tightness": "We've sized to your hip first, so it won't pull or pinch through the seat.",
    "Wrong length": `At ${p.height ?? "your height"}, we'll match the inseam so the break sits right.`,
    "Thigh fit": `A ${thigh.toLowerCase()} leg gives your thighs the room you asked for without looking baggy.`,
    Rise: `${rise} keeps the waistband exactly where you want it all day.`,
    Other: "We'll keep dialing this in as you try styles.",
  };

  const blurb =
    (p.frustration && frustrationLine[p.frustration]) ||
    "A balanced cut tuned to the measurements and feel you described.";

  return {
    size: `${size}`,
    fitName: `${rise.replace(" rise", "-Rise")} ${fitName}`,
    rise,
    confidence,
    blurb,
  };
}
