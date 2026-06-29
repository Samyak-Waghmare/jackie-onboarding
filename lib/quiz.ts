// ─────────────────────────────────────────────────────────────────────────────
// Jackie Jeans — Fit Quiz, single source of truth.
// Both the manual flow and the voice flow consume this so neither can ever
// drift or "drop a question to save time".
// ─────────────────────────────────────────────────────────────────────────────

export type QuestionId =
  | "height"
  | "weight"
  | "waist"
  | "hip"
  | "waistFit"
  | "rise"
  | "thighFit"
  | "brands"
  | "brandSizes"
  | "frustration";

export type QuestionKind =
  | "scale" // a long numeric/measurement list rendered as a wheel/dropdown
  | "choice" // single select from a few cards
  | "number" // free number entry (optionally skippable)
  | "multiselect" // pick several
  | "brandSizes"; // conditional, one size per selected brand

export interface ChoiceOption {
  value: string;
  label: string;
  hint?: string;
  /** extra spoken forms the voice parser should map onto this option */
  synonyms?: string[];
}

export interface Question {
  id: QuestionId;
  /** 1-based number shown to the user (1..10) */
  number: number;
  kind: QuestionKind;
  /** short label for the manual UI */
  title: string;
  /** one-line context shown under the title */
  subtitle: string;
  /** what the AI says out loud in the voice flow */
  voicePrompt: string;
  /** product rationale (the "why") — surfaced as a subtle tooltip */
  why: string;
  optional?: boolean;
  options?: ChoiceOption[];
  /** for number questions */
  unit?: string;
  min?: number;
  max?: number;
}

// ── Generated measurement scales ─────────────────────────────────────────────

function heightOptions(): ChoiceOption[] {
  const opts: ChoiceOption[] = [];
  for (let total = 58; total <= 74; total++) {
    const ft = Math.floor(total / 12);
    const inch = total % 12;
    opts.push({ value: `${ft}'${inch}"`, label: `${ft}'${inch}"` });
  }
  return opts;
}

function inchOptions(min: number, max: number): ChoiceOption[] {
  const opts: ChoiceOption[] = [];
  for (let n = min; n <= max; n++) {
    opts.push({ value: `${n}"`, label: `${n}"` });
  }
  return opts;
}

export const HEIGHT_OPTIONS = heightOptions(); // 4'10" – 6'2"
export const WAIST_OPTIONS = inchOptions(24, 52); // 24" – 52"
export const HIP_OPTIONS = inchOptions(32, 60); // 32" – 60"

// ── Known denim brands (Q8) ──────────────────────────────────────────────────

export const BRANDS: string[] = [
  "Levi's",
  "Madewell",
  "AGOLDE",
  "Mother",
  "Citizens of Humanity",
  "Frame",
  "Paige",
  "Good American",
  "7 For All Mankind",
  "Rag & Bone",
  "Everlane",
  "Reformation",
  "Abercrombie & Fitch",
  "American Eagle",
  "Gap",
  "Old Navy",
  "Lucky Brand",
  "Wrangler",
  "Lee",
  "True Religion",
];

// ── The ten questions ────────────────────────────────────────────────────────

export const QUESTIONS: Question[] = [
  {
    id: "height",
    number: 1,
    kind: "scale",
    title: "What's your height?",
    subtitle: "This drives the inseam and length we recommend.",
    voicePrompt: "First up — what's your height?",
    why: "Drives inseam / length recommendation.",
    options: HEIGHT_OPTIONS,
  },
  {
    id: "weight",
    number: 2,
    kind: "number",
    title: "What's your weight?",
    subtitle: "Optional — it just fine-tunes proportional fit. Skip if you'd rather.",
    voicePrompt:
      "What's your weight? This one's totally optional — just say skip if you'd rather not.",
    why: "Calibrates proportional fit; optional to reduce drop-off.",
    optional: true,
    unit: "lbs",
    min: 70,
    max: 400,
  },
  {
    id: "waist",
    number: 3,
    kind: "scale",
    title: "Waist measurement",
    subtitle: "Around the narrowest point, in inches.",
    voicePrompt:
      "What's your waist measurement in inches — measured at the narrowest point?",
    why: "The most direct sizing input.",
    options: WAIST_OPTIONS,
  },
  {
    id: "hip",
    number: 4,
    kind: "scale",
    title: "Hip measurement",
    subtitle: "Around the fullest point, in inches.",
    voicePrompt: "And your hip measurement in inches, at the fullest point?",
    why: "Critical for denim — most fit problems are hip-related.",
    options: HIP_OPTIONS,
  },
  {
    id: "waistFit",
    number: 5,
    kind: "choice",
    title: "How do you like jeans to fit at the waist?",
    subtitle: "Same measurements can feel very different here.",
    voicePrompt:
      "How do you like jeans to fit at the waist — snug, slightly relaxed, or relaxed?",
    why: "Same measurements, different desired fit.",
    options: [
      { value: "Snug", label: "Snug", hint: "Holds firmly, no give", synonyms: ["tight", "fitted", "firm"] },
      {
        value: "Slightly relaxed",
        label: "Slightly relaxed",
        hint: "A touch of room",
        synonyms: ["slightly", "a little relaxed", "bit relaxed", "medium", "in between"],
      },
      { value: "Relaxed", label: "Relaxed", hint: "Easy and roomy", synonyms: ["loose", "roomy", "comfortable"] },
    ],
  },
  {
    id: "rise",
    number: 6,
    kind: "choice",
    title: "Where should the waistband sit?",
    subtitle: "This narrows the style we suggest.",
    voicePrompt:
      "Where should the waistband sit — high rise, mid rise, or low rise?",
    why: "Narrows the style recommendation.",
    options: [
      { value: "High rise", label: "High rise", hint: "At the natural waist", synonyms: ["high", "highrise", "high waisted", "high waist"] },
      { value: "Mid rise", label: "Mid rise", hint: "Just below the waist", synonyms: ["mid", "middle", "medium", "midrise"] },
      { value: "Low rise", label: "Low rise", hint: "On the hips", synonyms: ["low", "lowrise", "low waisted"] },
    ],
  },
  {
    id: "thighFit",
    number: 7,
    kind: "choice",
    title: "How should jeans fit through the thighs?",
    subtitle: "The second most common fit complaint after waist.",
    voicePrompt:
      "How should they fit through the thighs — fitted, relaxed, or loose?",
    why: "Second most common fit complaint after waist.",
    options: [
      { value: "Fitted", label: "Fitted", hint: "Close to the leg", synonyms: ["fit", "snug", "tight", "slim"] },
      { value: "Relaxed", label: "Relaxed", hint: "Comfortable room", synonyms: ["medium", "in between", "regular"] },
      { value: "Loose", label: "Loose", hint: "Generous and easy", synonyms: ["roomy", "baggy", "wide"] },
    ],
  },
  {
    id: "brands",
    number: 8,
    kind: "multiselect",
    title: "Which denim brands have you bought before?",
    subtitle: "Pick any you've owned — this calibrates against known sizing.",
    voicePrompt:
      "Which denim brands have you bought before? You can name a few — like Levi's, Madewell, or AGOLDE. Or just say none.",
    why: "Calibrates against known brand sizing.",
    options: BRANDS.map((b) => ({ value: b, label: b })),
  },
  {
    id: "brandSizes",
    number: 9,
    kind: "brandSizes",
    title: "What size did you buy?",
    subtitle: "For each brand you picked — our ground truth for accuracy.",
    voicePrompt: "What size did you buy in those?",
    why: "Ground truth for recommendation accuracy.",
  },
  {
    id: "frustration",
    number: 10,
    kind: "choice",
    title: "Biggest fit frustration when buying jeans?",
    subtitle: "We'll speak directly to this in your recommendation.",
    voicePrompt:
      "Last one — what's your biggest frustration when buying jeans? Waist gap, hip tightness, wrong length, thigh fit, the rise, or something else?",
    why: "Personalizes the recommendation explanation.",
    options: [
      { value: "Waist gap", label: "Waist gap", hint: "Gaps at the back", synonyms: ["gap", "gaping", "waist gapping", "back gap"] },
      { value: "Hip tightness", label: "Hip tightness", hint: "Too tight on hips", synonyms: ["hips", "hip", "tight hips", "hips too tight"] },
      { value: "Wrong length", label: "Wrong length", hint: "Too long or short", synonyms: ["length", "too long", "too short", "inseam"] },
      { value: "Thigh fit", label: "Thigh fit", hint: "Thigh too tight/loose", synonyms: ["thighs", "thigh", "legs"] },
      { value: "Rise", label: "Rise", hint: "Sits wrong", synonyms: ["the rise", "waistband height", "too low", "too high"] },
      { value: "Other", label: "Other", hint: "Something else", synonyms: ["something else", "other stuff", "different"] },
    ],
  },
];

export const TOTAL_QUESTIONS = 10;

// ── The collected answers ────────────────────────────────────────────────────

export interface FitProfile {
  height?: string;
  weight?: string; // "" allowed → explicitly skipped
  weightSkipped?: boolean;
  waist?: string;
  hip?: string;
  waistFit?: string;
  rise?: string;
  thighFit?: string;
  brands: string[];
  brandSizes: Record<string, string>;
  frustration?: string;
}

export function emptyProfile(): FitProfile {
  return { brands: [], brandSizes: {} };
}

export function getQuestion(id: QuestionId): Question {
  const q = QUESTIONS.find((x) => x.id === id);
  if (!q) throw new Error(`Unknown question: ${id}`);
  return q;
}

/** Human-readable one-line summary used in confirmations + the summary screen. */
export function summarize(p: FitProfile): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  if (p.height) rows.push({ label: "Height", value: p.height });
  rows.push({
    label: "Weight",
    value: p.weightSkipped || !p.weight ? "Skipped" : `${p.weight} lbs`,
  });
  if (p.waist) rows.push({ label: "Waist", value: p.waist });
  if (p.hip) rows.push({ label: "Hip", value: p.hip });
  if (p.waistFit) rows.push({ label: "Waist fit", value: p.waistFit });
  if (p.rise) rows.push({ label: "Rise", value: p.rise });
  if (p.thighFit) rows.push({ label: "Thigh fit", value: p.thighFit });
  rows.push({
    label: "Brands",
    value: p.brands.length ? p.brands.join(", ") : "None",
  });
  if (p.brands.length) {
    const sizes = p.brands
      .map((b) => (p.brandSizes[b] ? `${b} ${p.brandSizes[b]}` : null))
      .filter(Boolean)
      .join(", ");
    if (sizes) rows.push({ label: "Sizes", value: sizes });
  }
  if (p.frustration) rows.push({ label: "Frustration", value: p.frustration });
  return rows;
}
