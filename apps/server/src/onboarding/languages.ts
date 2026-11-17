// The 13 languages with engine word files (docs/vocab-engine.md). O1 and O1c list them; the app has the same list.
export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ar', name: 'Arabic' },
  { code: 'fa', name: 'Persian' },
  { code: 'tr', name: 'Turkish' },
  { code: 'ja', name: 'Japanese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ko', name: 'Korean' },
] as const;

const norm = (s: string) => s.trim().toLowerCase();

// A listed language by its English name or code, case and outer spaces ignored.
export const listedLanguage = (text: string) => LANGUAGES.find((l) => norm(l.name) === norm(text) || l.code === norm(text));
