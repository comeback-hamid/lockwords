// AI task: translate Kai's onboarding script (a map of key → short line) into one language. One call per language, ever:
// the result is kept in the database.
export type ScriptTranslator = { translate(language: string, english: Record<string, string>): Promise<Record<string, string>> };
