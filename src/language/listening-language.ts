import type { ResponseLanguage } from "./response-language";

export type ListeningLanguage = "ru" | "uk" | "en" | "es";

export const DEFAULT_LISTENING_LANGUAGE: ListeningLanguage = "ru";

export const LISTENING_LANGUAGE_OPTIONS: ReadonlyArray<{
  id: ListeningLanguage;
  shortLabel: string;
  label: string;
}> = [
  { id: "ru", shortLabel: "RU", label: "Русский" },
  { id: "uk", shortLabel: "UA", label: "Українська" },
  { id: "en", shortLabel: "EN", label: "English" },
  { id: "es", shortLabel: "ES", label: "Español" },
];

export function normalizeListeningLanguage(value: unknown): ListeningLanguage {
  return value === "uk" || value === "en" || value === "ru" || value === "es"
    ? value
    : DEFAULT_LISTENING_LANGUAGE;
}

const LANGUAGE_TARGETS: Array<{ language: ListeningLanguage; pattern: RegExp }> = [
  { language: "ru", pattern: /(?:русск(?:ий|ом|ого)|російськ(?:у|ою)|russian)/u },
  { language: "uk", pattern: /(?:украинск(?:ий|ом|ого)|українськ(?:у|ою)|ukrainian)/u },
  { language: "en", pattern: /(?:английск(?:ий|ом|ого)|англійськ(?:у|ою)|english)/u },
  { language: "es", pattern: /(?:español|castellano|spanish)/u },
];

/**
 * Change the language LOOI expects from the user. This intentionally does not
 * change the language used for responses.
 */
export function detectListeningLanguageSwitchCommand(transcript: string): ListeningLanguage | null {
  const normalized = transcript
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();

  const isListeningCommand =
    /^(?:(?:пожалуйста|будь\s+ласка|por\s+favor|please)\s+)?(?:переключи|смени|поменяй|выбери|установи|зміни|перемкни|обери|cambia|pon|change|switch|set)\s+(?:язык|мову|(?:el\s+)?idioma|language)(?!\s+(?:ответов|відповідей|de\s+respuestas?|response))(?:\s+(?:распознавания|ввода|слушания|розпізнавання|вводу|de\s+escucha|de\s+entrada|listening|input))?(?=$|\s)/u.test(normalized) ||
    /^(?:(?:пожалуйста|будь\s+ласка|por\s+favor|please)\s+)?(?:перейди|перейти|cambia|switch)\s+(?:на|a|to)(?=$|\s)/u.test(normalized) ||
    /^(?:(?:пожалуйста|будь\s+ласка|por\s+favor|please)\s+)?(?:слушай|слухай|понимай|розпізнавай|распознавай|escucha|entiende|listen|understand)(?=$|\s)/u.test(normalized) ||
    /^(?:(?:язык|мова|idioma|language)\s+(?:ввода|слушания|распознавания|вводу|розпізнавання|de\s+escucha|de\s+entrada|input|listening)(?=$|\s))/u.test(normalized);

  if (!isListeningCommand) return null;
  return LANGUAGE_TARGETS.find(({ pattern }) => pattern.test(normalized))?.language ?? null;
}

export function getListeningLanguageSwitchAcknowledgement(
  listeningLanguage: ListeningLanguage,
  responseLanguage: ResponseLanguage
): string {
  const target = listeningLanguage === "uk"
    ? responseLanguage === "en" ? "Ukrainian" : responseLanguage === "es" ? "ucraniano" : responseLanguage === "uk" ? "українську" : "украинский"
    : listeningLanguage === "en"
      ? responseLanguage === "en" ? "English" : responseLanguage === "es" ? "inglés" : responseLanguage === "uk" ? "англійську" : "английский"
      : listeningLanguage === "es"
        ? responseLanguage === "en" ? "Spanish" : responseLanguage === "es" ? "español" : responseLanguage === "uk" ? "іспанську" : "испанский"
        : responseLanguage === "en" ? "Russian" : responseLanguage === "es" ? "ruso" : responseLanguage === "uk" ? "російську" : "русский";

  if (responseLanguage === "en") return `Okay, I'll listen for ${target}.`;
  if (responseLanguage === "es") return `Vale, ahora escucho en ${target}.`;
  if (responseLanguage === "uk") return `Добре, тепер слухаю ${target}.`;
  return `Хорошо, теперь слушаю ${target}.`;
}
