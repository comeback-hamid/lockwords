import type { LanguageChoice } from './store';

// The sample word on the drawn lock screen (O2): "the bill" in each of the 13 listed languages.
const BILL: Record<string, string> = {
  en: 'the bill', es: 'la cuenta', fr: 'l’addition', de: 'die Rechnung', it: 'il conto', pt: 'a conta', ru: 'счёт',
  ar: 'الفاتورة', fa: 'صورت‌حساب', tr: 'hesap', ja: 'お会計', zh: '账单', ko: '계산서',
};
const known = (l: LanguageChoice | null) => (l?.code ? BILL[l.code] : undefined);

// The word in the language the learner picked, the meaning in the language they speak.
export function sampleWord(learning: LanguageChoice | null, speaks: LanguageChoice | null): { word: string; translation: string } {
  // No answers yet (a test or a deep link): the Figma sample.
  if (!learning) return { word: BILL.es, translation: BILL.en };
  const own = known(speaks) ?? BILL.en;
  const word = known(learning);
  // A typed language (Other): we have no word for it. Show the learner's own word and name the language; never a third language.
  if (!word) return { word: own, translation: `in ${learning.name.trim()}` };
  return { word, translation: word === own ? '' : own };
}
