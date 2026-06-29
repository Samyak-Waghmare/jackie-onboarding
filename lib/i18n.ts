// ─────────────────────────────────────────────────────────────────────────────
// Multi-language voice. Every line the stylist *speaks* is localized here.
// Stored answer values stay canonical English (so the manual flow, summary,
// recommendation and redirect are unaffected) — only speech + matching change.
// ─────────────────────────────────────────────────────────────────────────────

export type LangCode = "en" | "es" | "fr";

export interface LangDef {
  code: LangCode;
  label: string;
  speech: string; // BCP-47 tag for SpeechRecognition / speechSynthesis / Whisper
}

export const LANGS: LangDef[] = [
  { code: "en", label: "English", speech: "en-US" },
  { code: "es", label: "Español", speech: "es-ES" },
  { code: "fr", label: "Français", speech: "fr-FR" },
];

export interface VoiceStrings {
  greeting: (resume: boolean) => string;
  // prompts
  pHeight: string;
  pWeight: string;
  pWaist: string;
  pHip: string;
  pWaistFit: string;
  pRise: string;
  pThigh: string;
  pBrands: string;
  pFrustration: string;
  // confirmations
  cHeight: (v: string) => string;
  cWeight: (v: string) => string;
  cWaist: (v: string) => string;
  cHip: (v: string) => string;
  weightSkip: string;
  ack: (id: string, label: string) => string;
  // re-asks / give-ups
  reaskSoft: string;
  reaskValue: (prompt: string) => string;
  reaskNumberOptional: string;
  skipGiveupOptional: string;
  giveupRequired: string;
  choiceReask: (labels: string) => string;
  choiceGiveup: string;
  // brands + sizes
  brandAck: (list: string) => string;
  brandReaskHave: string;
  brandReaskNone: string;
  brandSkip: string;
  sizesIntro: string;
  sizeAsk: (brand: string) => string;
  sizeConfirm: (brand: string, size: string) => string;
  sizeSkip: string;
  sizeReask: (brand: string) => string;
  sizeGiveup: string;
  wrapUp: (s: { height?: string; waist?: string; thigh?: string; rise?: string }) => string;
}

// Canonical English option value → localized spoken label.
const OPTION_LABELS: Record<LangCode, Record<string, string>> = {
  en: {},
  es: {
    Snug: "ajustado",
    "Slightly relaxed": "ligeramente holgado",
    Relaxed: "holgado",
    "High rise": "tiro alto",
    "Mid rise": "tiro medio",
    "Low rise": "tiro bajo",
    Fitted: "ajustado",
    Loose: "holgado",
    "Waist gap": "hueco en la cintura",
    "Hip tightness": "caderas apretadas",
    "Wrong length": "largo incorrecto",
    "Thigh fit": "ajuste del muslo",
    Rise: "el tiro",
    Other: "otro",
  },
  fr: {
    Snug: "ajusté",
    "Slightly relaxed": "légèrement ample",
    Relaxed: "ample",
    "High rise": "taille haute",
    "Mid rise": "taille mi-haute",
    "Low rise": "taille basse",
    Fitted: "ajusté",
    Loose: "ample",
    "Waist gap": "écart à la taille",
    "Hip tightness": "hanches serrées",
    "Wrong length": "mauvaise longueur",
    "Thigh fit": "ajustement des cuisses",
    Rise: "la taille",
    Other: "autre",
  },
};

export function localizeOption(lang: LangCode, value: string): string {
  return OPTION_LABELS[lang][value] ?? value;
}

// Words/phrases that end the brand list ("that's all").
export const DONE_WORDS: Record<LangCode, RegExp> = {
  en: /\b(that'?s all|thats all|that is all|all done|i'?m done|no more|nothing else|finish|finished|that'?s it|thats it)\b/,
  es: /\b(ya esta|ya está|eso es todo|listo|nada mas|nada más|terminado|termine|terminé|ya)\b/,
  fr: /\b(c'?est tout|termine|terminé|fini|voila|voilà|rien d'?autre|c'?est bon)\b/,
};

// Extra spoken synonyms per language for the single-choice options.
export const CHOICE_SYNONYMS: Record<LangCode, Record<string, string[]>> = {
  en: {},
  es: {
    Snug: ["ajustado", "apretado", "ceñido", "cenido", "firme"],
    "Slightly relaxed": ["ligeramente", "un poco", "poco holgado", "intermedio", "medio"],
    Relaxed: ["holgado", "relajado", "comodo", "cómodo", "suelto"],
    "High rise": ["alto", "tiro alto"],
    "Mid rise": ["medio", "tiro medio", "intermedio"],
    "Low rise": ["bajo", "tiro bajo"],
    Fitted: ["ajustado", "apretado", "entallado", "ceñido"],
    Loose: ["holgado", "suelto", "ancho", "amplio"],
    "Waist gap": ["hueco", "cintura", "se abre"],
    "Hip tightness": ["cadera", "caderas", "apretado"],
    "Wrong length": ["largo", "corto", "longitud"],
    "Thigh fit": ["muslo", "muslos", "pierna"],
    Rise: ["tiro"],
    Other: ["otro", "otra", "diferente"],
  },
  fr: {
    Snug: ["ajuste", "ajusté", "serre", "serré"],
    "Slightly relaxed": ["legerement", "légèrement", "un peu", "intermediaire", "moyen"],
    Relaxed: ["ample", "detendu", "détendu", "confortable", "lache", "lâche"],
    "High rise": ["haute", "taille haute"],
    "Mid rise": ["moyenne", "mi-haute", "milieu"],
    "Low rise": ["basse", "taille basse"],
    Fitted: ["ajuste", "ajusté", "serre", "serré", "slim"],
    Loose: ["ample", "lache", "lâche", "large"],
    "Waist gap": ["ecart", "écart", "baille", "taille"],
    "Hip tightness": ["hanche", "hanches", "serre"],
    "Wrong length": ["longueur", "long", "court"],
    "Thigh fit": ["cuisse", "cuisses", "jambe"],
    Rise: ["taille", "hauteur"],
    Other: ["autre", "different", "différent"],
  },
};

const EN: VoiceStrings = {
  greeting: (r) =>
    r
      ? "Welcome back — let's pick up right where we left off."
      : "Hi, I'm your Jackie Jeans stylist. I'll ask a few quick questions to find jeans that actually fit you. Let's go.",
  pHeight: "First up — what's your height?",
  pWeight:
    "What's your weight? This one's totally optional — just say skip if you'd rather not.",
  pWaist:
    "What's your waist measurement in inches — measured at the narrowest point?",
  pHip: "And your hip measurement in inches, at the fullest point?",
  pWaistFit:
    "How do you like jeans to fit at the waist — snug, slightly relaxed, or relaxed?",
  pRise: "Where should the waistband sit — high rise, mid rise, or low rise?",
  pThigh: "How should they fit through the thighs — fitted, relaxed, or loose?",
  pBrands:
    "Which denim brands have you bought before? You can name a few — like Levi's, Madewell, or AGOLDE. Or just say none.",
  pFrustration:
    "Last one — what's your biggest frustration when buying jeans? Waist gap, hip tightness, wrong length, thigh fit, the rise, or something else?",
  cHeight: (v) => `Great — ${v}.`,
  cWeight: (v) => `Got it, ${v} pounds.`,
  cWaist: (v) => `Waist ${v}.`,
  cHip: (v) => `And hip ${v}. Thank you.`,
  weightSkip: "No problem — we'll skip that one.",
  ack: (id, l) => {
    switch (id) {
      case "waistFit":
        return `Got it — ${l} at the waist.`;
      case "rise":
        return `${l}, perfect.`;
      case "thighFit":
        return `${l} through the thigh — noted.`;
      case "frustration":
        return `Understood — ${l}. We'll make sure your fit speaks to that.`;
      default:
        return `Got it — ${l}.`;
    }
  },
  reaskSoft: "I didn't catch that — go ahead whenever you're ready.",
  reaskValue: (p) => `Hmm, I didn't quite catch that. ${p}`,
  reaskNumberOptional: "Sorry, didn't get that. You can give a number, or just say skip.",
  skipGiveupOptional: "That's alright — we'll skip it.",
  giveupRequired: "Let's keep moving — you can fine-tune this later.",
  choiceReask: (labels) => `I didn't catch which one — ${labels}?`,
  choiceGiveup: "No worries — we'll come back to that. Moving on.",
  brandAck: (list) =>
    `${list} — got it. Any others? If that's everything, just say "that's all".`,
  brandReaskHave: `Didn't catch that — any other brands, or say "that's all".`,
  brandReaskNone: "You can name a brand like Levi's, Gap, or AGOLDE — or say none.",
  brandSkip: "No problem — we'll skip the brands.",
  sizesIntro:
    "Quick sizes for those — you can say a number like 27, or small, medium, large. Say skip for any you're not sure of.",
  sizeAsk: (b) => `What size do you usually wear in ${b}?`,
  sizeConfirm: (b, s) => `${b}, size ${s}.`,
  sizeSkip: "No problem, skipping that one.",
  sizeReask: (b) => `Sorry, what size in ${b}? Or say skip.`,
  sizeGiveup: "We'll skip that one.",
  wrapUp: (s) =>
    `Perfect — that's everything. I've got ${s.height ?? "your height"}, waist ${
      s.waist ?? "noted"
    }, ${s.thigh ?? "comfortable"} thighs and a ${s.rise ?? "mid"} rise. Putting your fit together now.`,
};

const ES: VoiceStrings = {
  greeting: (r) =>
    r
      ? "¡Bienvenida de nuevo! Seguimos donde lo dejamos."
      : "Hola, soy tu estilista de Jackie Jeans. Te haré unas preguntas rápidas para encontrar los vaqueros que de verdad te quedan. ¡Vamos!",
  pHeight: "Primero — ¿cuánto mides? Puedes decir algo como un metro sesenta y ocho.",
  pWeight:
    "¿Cuánto pesas? Esto es totalmente opcional — si prefieres, solo di salta.",
  pWaist: "¿Cuál es tu medida de cintura en pulgadas, en el punto más estrecho?",
  pHip: "¿Y tu medida de cadera en pulgadas, en el punto más ancho?",
  pWaistFit:
    "¿Cómo te gusta que queden en la cintura — ajustado, ligeramente holgado, u holgado?",
  pRise: "¿Dónde quieres que quede la cintura — tiro alto, tiro medio o tiro bajo?",
  pThigh: "¿Cómo deben quedar en los muslos — ajustado, relajado o holgado?",
  pBrands:
    "¿Qué marcas de vaqueros has comprado antes? Puedes nombrar varias — como Levi's, Madewell o AGOLDE. O di ninguna.",
  pFrustration:
    "La última — ¿cuál es tu mayor frustración al comprar vaqueros? Hueco en la cintura, caderas apretadas, largo incorrecto, ajuste del muslo, el tiro, u otra cosa?",
  cHeight: (v) => `Perfecto — ${v}.`,
  cWeight: (v) => `Anotado, ${v} libras.`,
  cWaist: (v) => `Cintura ${v}.`,
  cHip: (v) => `Y cadera ${v}. Gracias.`,
  weightSkip: "Sin problema — saltamos esa.",
  ack: (id, l) => {
    switch (id) {
      case "waistFit":
        return `Perfecto — ${l} en la cintura.`;
      case "rise":
        return `${l}, genial.`;
      case "thighFit":
        return `${l} en el muslo — anotado.`;
      case "frustration":
        return `Entendido — ${l}. Lo tendremos muy en cuenta.`;
      default:
        return `Anotado — ${l}.`;
    }
  },
  reaskSoft: "No te entendí — dímelo cuando quieras.",
  reaskValue: (p) => `Mmm, no te entendí bien. ${p}`,
  reaskNumberOptional: "Perdona, no lo capté. Puedes decir un número, o simplemente salta.",
  skipGiveupOptional: "Está bien — la saltamos.",
  giveupRequired: "Sigamos — puedes ajustarlo más tarde.",
  choiceReask: (labels) => `No capté cuál — ¿${labels}?`,
  choiceGiveup: "Tranquila — volvemos a eso luego. Seguimos.",
  brandAck: (list) =>
    `${list} — anotado. ¿Alguna más? Si es todo, di "eso es todo".`,
  brandReaskHave: `No lo capté — ¿alguna otra marca, o di "eso es todo"?`,
  brandReaskNone: "Puedes decir una marca como Levi's, Gap o AGOLDE — o di ninguna.",
  brandSkip: "Sin problema — saltamos las marcas.",
  sizesIntro:
    "Las tallas rápidas — puedes decir un número como 27, o pequeña, mediana, grande. Di salta si no estás segura.",
  sizeAsk: (b) => `¿Qué talla sueles usar en ${b}?`,
  sizeConfirm: (b, s) => `${b}, talla ${s}.`,
  sizeSkip: "Sin problema, saltamos esa.",
  sizeReask: (b) => `Perdona, ¿qué talla en ${b}? O di salta.`,
  sizeGiveup: "Saltamos esa.",
  wrapUp: (s) =>
    `Perfecto — eso es todo. Tengo ${s.height ?? "tu altura"}, cintura ${
      s.waist ?? "anotada"
    }, muslos ${s.thigh ?? "cómodos"} y ${s.rise ?? "tiro medio"}. Preparando tu ajuste ahora.`,
};

const FR: VoiceStrings = {
  greeting: (r) =>
    r
      ? "Content de vous revoir — on reprend là où on s'est arrêté."
      : "Bonjour, je suis votre styliste Jackie Jeans. Je vais poser quelques questions rapides pour trouver le jean qui vous va vraiment. C'est parti !",
  pHeight: "D'abord — quelle est votre taille ? Vous pouvez dire un mètre soixante-huit.",
  pWeight:
    "Quel est votre poids ? C'est totalement facultatif — dites passer si vous préférez.",
  pWaist: "Quel est votre tour de taille en pouces, à l'endroit le plus étroit ?",
  pHip: "Et votre tour de hanches en pouces, à l'endroit le plus large ?",
  pWaistFit:
    "Comment aimez-vous l'ajustement à la taille — ajusté, légèrement ample, ou ample ?",
  pRise: "Où doit se placer la ceinture — taille haute, taille mi-haute, ou taille basse ?",
  pThigh: "Comment doivent-ils tomber aux cuisses — ajusté, détendu, ou ample ?",
  pBrands:
    "Quelles marques de jean avez-vous déjà achetées ? Vous pouvez en nommer plusieurs — comme Levi's, Madewell ou AGOLDE. Ou dites aucune.",
  pFrustration:
    "La dernière — quelle est votre plus grande frustration en achetant un jean ? Écart à la taille, hanches serrées, mauvaise longueur, ajustement des cuisses, la taille, ou autre chose ?",
  cHeight: (v) => `Parfait — ${v}.`,
  cWeight: (v) => `Noté, ${v} livres.`,
  cWaist: (v) => `Taille ${v}.`,
  cHip: (v) => `Et hanches ${v}. Merci.`,
  weightSkip: "Pas de souci — on passe celle-ci.",
  ack: (id, l) => {
    switch (id) {
      case "waistFit":
        return `Parfait — ${l} à la taille.`;
      case "rise":
        return `${l}, parfait.`;
      case "thighFit":
        return `${l} aux cuisses — noté.`;
      case "frustration":
        return `Compris — ${l}. On en tiendra compte.`;
      default:
        return `Noté — ${l}.`;
    }
  },
  reaskSoft: "Je n'ai pas saisi — dites-le quand vous voulez.",
  reaskValue: (p) => `Hmm, je n'ai pas bien saisi. ${p}`,
  reaskNumberOptional: "Désolé, je n'ai pas compris. Donnez un nombre, ou dites passer.",
  skipGiveupOptional: "Très bien — on la passe.",
  giveupRequired: "Continuons — vous pourrez ajuster plus tard.",
  choiceReask: (labels) => `Je n'ai pas saisi lequel — ${labels} ?`,
  choiceGiveup: "Pas de souci — on y reviendra. On continue.",
  brandAck: (list) =>
    `${list} — noté. D'autres ? Si c'est tout, dites "c'est tout".`,
  brandReaskHave: `Je n'ai pas saisi — d'autres marques, ou dites "c'est tout" ?`,
  brandReaskNone: "Vous pouvez dire une marque comme Levi's, Gap ou AGOLDE — ou dites aucune.",
  brandSkip: "Pas de souci — on passe les marques.",
  sizesIntro:
    "Les tailles rapidement — dites un nombre comme 27, ou small, medium, large. Dites passer si vous n'êtes pas sûr.",
  sizeAsk: (b) => `Quelle taille portez-vous d'habitude chez ${b} ?`,
  sizeConfirm: (b, s) => `${b}, taille ${s}.`,
  sizeSkip: "Pas de souci, on passe celle-ci.",
  sizeReask: (b) => `Désolé, quelle taille chez ${b} ? Ou dites passer.`,
  sizeGiveup: "On passe celle-ci.",
  wrapUp: (s) =>
    `Parfait — c'est tout. J'ai ${s.height ?? "votre taille"}, tour de taille ${
      s.waist ?? "noté"
    }, cuisses ${s.thigh ?? "confortables"} et ${s.rise ?? "taille mi-haute"}. Je prépare votre coupe.`,
};

const STRINGS: Record<LangCode, VoiceStrings> = { en: EN, es: ES, fr: FR };

export function vt(lang: LangCode): VoiceStrings {
  return STRINGS[lang] ?? EN;
}
