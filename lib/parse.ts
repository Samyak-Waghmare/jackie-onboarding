// ─────────────────────────────────────────────────────────────────────────────
// Rule-based natural-language parsing for the voice flow.
// Turns messy spoken transcripts into valid quiz answers — no API key required.
// English is fully supported; Spanish & French numbers + option words are added
// so the multi-language voice flow works without a cloud LLM.
// (An optional LLM layer in /api/voice/interpret can still override this.)
// ─────────────────────────────────────────────────────────────────────────────

import { ChoiceOption, BRANDS } from "./quiz";
import type { LangCode } from "./i18n";

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents (é→e, ó→o …)
    .replace(/[’`]/g, "'")
    .replace(/-/g, " ")
    .replace(/[^a-z0-9'\s.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Number words per language (keys are accent-stripped to match normalize) ───

const SMALL: Record<LangCode, Record<string, number>> = {
  en: {
    zero: 0, oh: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
    seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
    thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
    eighteen: 18, nineteen: 19,
  },
  es: {
    cero: 0, oh: 0, uno: 1, una: 1, un: 1, dos: 2, tres: 3, cuatro: 4,
    cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11,
    doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16,
    diecisiete: 17, dieciocho: 18, diecinueve: 19, veintiuno: 21,
    veintiuna: 21, veintidos: 22, veintitres: 23, veinticuatro: 24,
    veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28,
    veintinueve: 29, cien: 100, ciento: 100, doscientos: 200,
    trescientos: 300, cuatrocientos: 400, quinientos: 500,
  },
  fr: {
    zero: 0, un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6,
    sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, treize: 13,
    quatorze: 14, quinze: 15, seize: 16,
  },
};

const TENS: Record<LangCode, Record<string, number>> = {
  en: {
    twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
    seventy: 70, eighty: 80, ninety: 90,
  },
  es: {
    veinte: 20, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60,
    setenta: 70, ochenta: 80, noventa: 90,
  },
  fr: {
    vingt: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60,
  },
};

const HUNDRED_MULT: Record<LangCode, string[]> = {
  en: ["hundred"],
  es: [],
  fr: ["cent", "cents"],
};
const THOUSAND: Record<LangCode, string[]> = {
  en: ["thousand"],
  es: ["mil"],
  fr: ["mille"],
};
const CONNECTORS: Record<LangCode, string[]> = {
  en: ["and", "a"],
  es: ["y", "con"],
  fr: ["et", "a"],
};

/** Parse the first spoken/numeric quantity in a phrase. "twenty four" → 24. */
export function parsePhraseNumber(text: string, lang: LangCode = "en"): number | null {
  const small = SMALL[lang];
  const tens = TENS[lang];
  const hundred = HUNDRED_MULT[lang];
  const thousand = THOUSAND[lang];
  const connectors = CONNECTORS[lang];

  const tokens = normalize(text).split(" ");
  let result = 0;
  let current = 0;
  let found = false;

  for (const raw of tokens) {
    const t = raw.replace(/\./g, "");
    if (t === "") continue;
    if (/^\d+$/.test(t)) {
      current += parseInt(t, 10);
      found = true;
    } else if (t in small) {
      current += small[t];
      found = true;
    } else if (t in tens) {
      current += tens[t];
      found = true;
    } else if (hundred.includes(t)) {
      current = (current || 1) * 100;
      found = true;
    } else if (thousand.includes(t)) {
      result += (current || 1) * 1000;
      current = 0;
      found = true;
    } else if (connectors.includes(t)) {
      continue;
    } else if (found) {
      break; // the number has ended
    }
  }
  return found ? result + current : null;
}

/** Collect standalone small numbers in order — used for height (feet + inches). */
function smallNumberSequence(text: string, lang: LangCode): number[] {
  const small = SMALL[lang];
  const tens = TENS[lang];
  const tokens = normalize(text).split(" ");
  const out: number[] = [];
  for (const raw of tokens) {
    const t = raw.replace(/\./g, "");
    if (/^\d{1,2}$/.test(t)) out.push(parseInt(t, 10));
    else if (t in small) out.push(small[t]);
    else if (t in tens) out.push(tens[t]);
  }
  return out;
}

const METRIC_RE = /\b(cm|centimetro|centimetros|centimetre|centimetres|metro|metros|metre|metres|meter|meters)\b/;

/** Spoken metric height ("un metro sesenta y ocho") → nearest 4'10"–6'2" option. */
function parseHeightMetric(text: string, lang: LangCode): string | null {
  const norm = normalize(text);
  let cm: number | null = null;
  if (/\b(cm|centimetro|centimetros|centimetre|centimetres)\b/.test(norm)) {
    cm = parsePhraseNumber(norm, lang);
  } else if (/\b(metro|metros|metre|metres|meter|meters)\b/.test(norm)) {
    const parts = norm.split(
      /\b(?:metro|metros|metre|metres|meter|meters)\b/
    );
    const meters = parsePhraseNumber(parts[0] || "", lang) ?? 1;
    const centis = parts[1] ? parsePhraseNumber(parts[1], lang) ?? 0 : 0;
    cm = meters * 100 + centis;
  }
  if (cm == null || cm < 130 || cm > 215) return null;
  let inch = Math.round(cm / 2.54);
  inch = Math.min(74, Math.max(58, inch));
  return `${Math.floor(inch / 12)}'${inch % 12}"`;
}

/** "five foot six" / "5'6" / "five six" / metric → 5'6" (clamped 4'10"–6'2"). */
export function parseHeight(text: string, lang: LangCode = "en"): string | null {
  // Non-English answers (and any "cm/metre" mention) are usually metric.
  if (lang !== "en" || METRIC_RE.test(normalize(text))) {
    const m = parseHeightMetric(text, lang);
    if (m) return m;
  }

  const norm = normalize(text);
  const marker = norm.match(
    /(\d|one|two|three|four|five|six|seven)\s*(?:'|ft|feet|foot|pieds?|pies?)\s*(\d{1,2}|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven)?/
  );

  let feet: number | null = null;
  let inches = 0;

  if (marker) {
    feet = SMALL.en[marker[1]] ?? parseInt(marker[1], 10);
    if (marker[2] != null) inches = SMALL.en[marker[2]] ?? parseInt(marker[2], 10);
  } else {
    const seq = smallNumberSequence(norm, lang);
    if (seq.length >= 2) {
      feet = seq[0];
      inches = seq[1];
    } else if (seq.length === 1) {
      if (seq[0] >= 58 && seq[0] <= 74) {
        feet = Math.floor(seq[0] / 12);
        inches = seq[0] % 12;
      } else if (seq[0] >= 4 && seq[0] <= 6) {
        feet = seq[0];
        inches = 0;
      }
    }
  }

  if (feet == null || feet < 4 || feet > 7) return null;
  let total = feet * 12 + inches;
  total = Math.min(74, Math.max(58, total));
  return `${Math.floor(total / 12)}'${total % 12}"`;
}

/** A measurement in inches, clamped into [min,max], returned as e.g. `30"`. */
export function parseInches(
  text: string,
  min: number,
  max: number,
  lang: LangCode = "en"
): string | null {
  const n = parsePhraseNumber(text, lang);
  if (n == null) return null;
  return `${Math.min(max, Math.max(min, n))}"`;
}

/** A weight value; returns the number as a string, or null. */
export function parseWeight(text: string, lang: LangCode = "en"): string | null {
  const n = parsePhraseNumber(text, lang);
  if (n == null || n < 50 || n > 600) return null;
  return String(n);
}

/** Match a transcript onto one of a question's choice options. */
export function matchChoice(
  text: string,
  options: ChoiceOption[],
  extra?: Record<string, string[]>
): string | null {
  const norm = ` ${normalize(text)} `;
  const candidatesFor = (opt: ChoiceOption) =>
    [opt.value, opt.label, ...(opt.synonyms ?? []), ...(extra?.[opt.value] ?? [])].map(
      (c) => normalize(c)
    );

  for (const opt of options) {
    for (const cand of candidatesFor(opt)) {
      if (cand && norm.includes(` ${cand} `)) return opt.value;
    }
  }
  // looser pass: substring anywhere (handles run-together speech)
  for (const opt of options) {
    for (const cand of candidatesFor(opt)) {
      if (cand && norm.includes(cand)) return opt.value;
    }
  }
  return null;
}

// brand spoken-form → canonical brand (language-neutral proper nouns)
const BRAND_ALIASES: Record<string, string> = {
  levis: "Levi's",
  levi: "Levi's",
  "levi's": "Levi's",
  madewell: "Madewell",
  agolde: "AGOLDE",
  "a golde": "AGOLDE",
  "ag old": "AGOLDE",
  mother: "Mother",
  citizens: "Citizens of Humanity",
  "citizens of humanity": "Citizens of Humanity",
  frame: "Frame",
  paige: "Paige",
  page: "Paige",
  "good american": "Good American",
  "seven for all mankind": "7 For All Mankind",
  "7 for all mankind": "7 For All Mankind",
  sevens: "7 For All Mankind",
  "rag and bone": "Rag & Bone",
  "rag bone": "Rag & Bone",
  everlane: "Everlane",
  reformation: "Reformation",
  abercrombie: "Abercrombie & Fitch",
  "american eagle": "American Eagle",
  ae: "American Eagle",
  gap: "Gap",
  "old navy": "Old Navy",
  lucky: "Lucky Brand",
  "lucky brand": "Lucky Brand",
  wrangler: "Wrangler",
  lee: "Lee",
  "true religion": "True Religion",
};

/** Find every brand mentioned in an utterance. */
export function matchBrands(text: string): string[] {
  const norm = normalize(text);
  const found = new Set<string>();

  const aliasKeys = Object.keys(BRAND_ALIASES).sort(
    (a, b) => b.length - a.length
  );
  for (const key of aliasKeys) {
    const re = new RegExp(`(?:^|\\s)${escapeRe(key)}(?:$|\\s)`);
    if (re.test(` ${norm} `)) found.add(BRAND_ALIASES[key]);
  }
  for (const b of BRANDS) {
    if (norm.includes(normalize(b))) found.add(b);
  }
  return BRANDS.filter((b) => found.has(b));
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** A jeans size from speech: "twenty seven" → 27, "medium" → M, "size 8" → 8. */
export function parseSize(text: string, lang: LangCode = "en"): string | null {
  const norm = normalize(text);
  if (/\b(extra small|x small|xs|muy pequena|tres petit)\b/.test(norm)) return "XS";
  if (/\b(small|pequena|petit|petite|chica)\b/.test(norm)) return "S";
  if (/\b(medium|mediana|moyen|moyenne|media)\b/.test(norm)) return "M";
  if (/\b(extra large|x large|xl|muy grande|tres grand)\b/.test(norm)) return "XL";
  if (/\b(large|grande|grand)\b/.test(norm)) return "L";
  const n = parsePhraseNumber(norm, lang);
  if (n != null) return String(n);
  return null;
}

const SKIP_RE: Record<LangCode, RegExp> = {
  en: /\b(skip|pass|next|prefer not|rather not|don'?t want|do not want|no thanks?|leave it|move on|don'?t know|dunno|not sure|n\/a|na)\b/,
  es: /\b(salta|saltar|saltalo|omitir|omite|omitelo|pasar|paso|pasa|siguiente|no se|prefiero no|no quiero|na)\b/,
  fr: /\b(passer|passe|sauter|suivant|je ne sais pas|je prefere pas|je ne veux pas|sans)\b/,
};

export function isSkip(text: string, lang: LangCode = "en"): boolean {
  return SKIP_RE[lang].test(normalize(text)) || SKIP_RE.en.test(normalize(text));
}

const NONE_RE: Record<LangCode, RegExp> = {
  en: /\b(none|no brands?|never|nothing|haven'?t|none of them|not really)\b/,
  es: /\b(ninguna|ninguno|nada|nunca|no he)\b/,
  fr: /\b(aucune|aucun|rien|jamais|non)\b/,
};

export function isNone(text: string, lang: LangCode = "en"): boolean {
  return NONE_RE[lang].test(normalize(text)) || NONE_RE.en.test(normalize(text));
}

export function isAffirmative(text: string): boolean {
  return /\b(yes|yeah|yep|yup|correct|right|sure|that'?s right|looks good|sounds good|perfect|exactly|confirm|good|ok|okay|uh huh|that works|all good|si|oui)\b/.test(
    normalize(text)
  );
}

export function isNegative(text: string): boolean {
  return /\b(no|nope|nah|wrong|incorrect|not quite|not right|change|redo|again|that'?s not|fix|edit|non)\b/.test(
    normalize(text)
  );
}
