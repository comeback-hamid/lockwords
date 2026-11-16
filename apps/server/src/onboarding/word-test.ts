// Word test for onboarding (O4–O6) and the known-words estimate (O7).
// shortcut: seeded for Spanish only; other languages get AI-made lists with the deck-generation change.

export type Band = { level: 'basic' | 'intermediate' | 'advanced'; words: string[] };

// How many of the 5,000 most common words each band stands for.
const SLICE = { basic: 1000, intermediate: 2000, advanced: 2000 } as const;
export const OUT_OF = 5000;

const SEEDS: Record<string, Band[]> = {
  es: [
    {
      level: 'basic',
      words: ['hola', 'gracias', 'el agua', 'la casa', 'comer', 'mañana', 'el libro', 'el perro', 'la ciudad', 'el trabajo', 'la familia', 'la noche', 'comprar', 'hablar', 'rojo', 'el amigo', 'la tienda', 'la calle', 'dormir', 'el tiempo', 'la playa', 'cerca'],
    },
    {
      level: 'intermediate',
      words: ['aunque', 'desarrollar', 'madrugar', 'el andén', 'quisiera', 'alcanzar', 'el sueldo', 'enterarse', 'la queja', 'aprovechar', 'el ambiente', 'lograr', 'la propina', 'el ascenso', 'soler', 'la huelga', 'el entorno', 'cumplir', 'el desafío', 'ahorrar', 'la vivienda'],
    },
    {
      level: 'advanced',
      words: ['menoscabar', 'ensimismado', 'la desidia', 'sobrellevar', 'el atisbo', 'acuciante', 'la entereza', 'vislumbrar', 'el desaire', 'ufano', 'la quimera', 'soslayar', 'el resquicio', 'la zozobra', 'perentorio', 'el sigilo', 'atolondrado', 'la lisonja', 'enmendar', 'la penuria', 'baladí'],
    },
  ],
};
const NAMES: Record<string, string> = { spanish: 'es', español: 'es', espanol: 'es' };

export function wordTestFor(language: string): Band[] | null {
  const key = language.trim().toLowerCase();
  return SEEDS[NAMES[key] ?? key] ?? null;
}

export function cefrFor(knownWords: number) {
  if (knownWords < 500) return 'A1';
  if (knownWords < 1000) return 'A2';
  if (knownWords < 2000) return 'A2+';
  if (knownWords < 3000) return 'B1';
  if (knownWords < 4000) return 'B2';
  return 'C1';
}

export function estimate(bands: Band[], known: string[]) {
  const knownSet = new Set(known);
  const raw = bands.reduce((sum, b) => sum + (b.words.filter((w) => knownSet.has(w)).length / b.words.length) * SLICE[b.level], 0);
  const knownWords = Math.round(raw / 50) * 50;
  return { knownWords, outOf: OUT_OF, cefr: cefrFor(knownWords) };
}
