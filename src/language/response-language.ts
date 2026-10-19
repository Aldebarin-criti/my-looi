export type ResponseLanguage = "ru" | "uk" | "en" | "es";

export const DEFAULT_RESPONSE_LANGUAGE: ResponseLanguage = "ru";

export const RESPONSE_LANGUAGE_OPTIONS: ReadonlyArray<{
  id: ResponseLanguage;
  shortLabel: string;
  label: string;
}> = [
  { id: "ru", shortLabel: "RU", label: "Русский" },
  { id: "uk", shortLabel: "UA", label: "Українська" },
  { id: "en", shortLabel: "EN", label: "English" },
  { id: "es", shortLabel: "ES", label: "Español" },
];

const DIRECT_SWITCH_COMMAND_RE = /^(?:говори|разговаривай|отвечай|ответь|розмовляй|спілкуйся|відповідай|habla|responde|contesta|speak|talk|reply|respond)(?=$|\s)/u;

const POLITE_SWITCH_COMMAND_RE = /^(?:(?:можешь|можеш|чи\s+можеш|puedes|podrías|can\s+you|could\s+you)(?:\s+(?:пожалуйста|будь\s+ласка|por\s+favor|please|теперь|відтепер|now))*\s+)(?:говорить|разговаривать|отвечать|говорити|спілкуватися|відповідати|hablar|responder|contestar|speak|talk|reply|respond)(?=$|\s)/u;

const RESPONSE_SETTING_COMMAND_RE = /^(?:переключи|смени|поменяй|выбери|зміни|перемкни|обери|cambia|pon|switch|change|set)\s+(?:язык\s+ответов|мову\s+відповідей|(?:el\s+)?idioma(?:\s+de\s+respuestas?)?|response\s+language)(?=$|\s)/u;

const COMMAND_LEADING_MODIFIER_RE = /^(?:пожалуйста|будь\s+ласка|por\s+favor|please|теперь|отныне|відтепер|надалі|ahora|now|from\s+now\s+on)(?=$|\s)/u;

const TARGET_MODIFIER_RE = /^(?:пожалуйста|будь\s+ласка|por\s+favor|please|теперь|отныне|відтепер|надалі|ahora|now|from\s+now\s+on|со\s+мной|зі\s+мною|conmigo|with\s+me)(?=$|\s)/u;

const LANGUAGE_TARGETS: Array<{
  language: ResponseLanguage;
  pattern: RegExp;
}> = [
  {
    language: "ru",
    pattern: /^(?:(?:(?:язык(?:\s+ответов)?|мову(?:\s+відповідей)?|(?:response\s+)?language)\s+(?:на|to)\s+)?(?:русский(?:\s+язык)?|російську(?:\s+мову)?|russian)|по[-\s]?русски|на\s+русском(?:\s+языке)?|на\s+русский(?:\s+язык)?|російською|на\s+російську(?:\s+мову)?|російська(?:\s+мова)?|in\s+russian|to\s+russian)(?:\s+(?:пожалуйста|будь\s+ласка|please))?$/u,
  },
  {
    language: "uk",
    pattern: /^(?:(?:(?:язык(?:\s+ответов)?|мову(?:\s+відповідей)?|(?:response\s+)?language)\s+(?:на|to)\s+)?(?:украинский(?:\s+язык)?|українську(?:\s+мову)?|ukrainian)|по[-\s]?украински|на\s+украинском(?:\s+языке)?|на\s+украинский(?:\s+язык)?|українською|на\s+українську(?:\s+мову)?|українська(?:\s+мова)?|in\s+ukrainian|to\s+ukrainian)(?:\s+(?:пожалуйста|будь\s+ласка|please))?$/u,
  },
  {
    language: "en",
    pattern: /^(?:(?:(?:язык(?:\s+ответов)?|мову(?:\s+відповідей)?|(?:response\s+)?language)\s+(?:на|to)\s+)?(?:английский(?:\s+язык)?|англійську(?:\s+мову)?|english)|по[-\s]?английски|на\s+английском(?:\s+языке)?|на\s+английский(?:\s+язык)?|англійською|на\s+англійську(?:\s+мову)?|англійська(?:\s+мова)?|in\s+english|to\s+english)(?:\s+(?:пожалуйста|будь\s+ласка|please))?$/u,
  },
  {
    language: "es",
    pattern: /^(?:(?:(?:язык(?:\s+ответов)?|мову(?:\s+відповідей)?|(?:response\s+)?language)\s+(?:на|to)\s+)?(?:español|castellano|spanish)|en\s+español|en\s+castellano|in\s+spanish|to\s+spanish)(?:\s+(?:por\s+favor|please))?$/u,
  },
];

export function normalizeResponseLanguage(value: unknown): ResponseLanguage {
  return value === "uk" || value === "en" || value === "ru" || value === "es"
    ? value
    : DEFAULT_RESPONSE_LANGUAGE;
}

/**
 * Recognize only an explicit request to change LOOI's persistent answer
 * language. Ordinary translation questions intentionally do not match.
 */
export function detectLanguageSwitchCommand(transcript: string): ResponseLanguage | null {
  const normalized = transcript
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();

  let commandText = normalized;
  while (COMMAND_LEADING_MODIFIER_RE.test(commandText)) {
    commandText = commandText.replace(COMMAND_LEADING_MODIFIER_RE, "").trim();
  }

  const command = RESPONSE_SETTING_COMMAND_RE.exec(commandText)
    ?? POLITE_SWITCH_COMMAND_RE.exec(commandText)
    ?? DIRECT_SWITCH_COMMAND_RE.exec(commandText);
  if (!command) {
    return null;
  }

  let target = commandText.slice(command[0].length).trim();
  while (TARGET_MODIFIER_RE.test(target)) {
    target = target.replace(TARGET_MODIFIER_RE, "").trim();
  }
  return LANGUAGE_TARGETS.find(({ pattern }) => pattern.test(target))?.language ?? null;
}

export function getLanguageSwitchAcknowledgement(language: ResponseLanguage): string {
  if (language === "uk") return "Добре, говоритиму українською.";
  if (language === "en") return "Okay, I'll speak English.";
  if (language === "es") return "Vale, hablaré en español.";
  return "Хорошо, буду говорить по-русски.";
}

export function getResponseLanguageName(language: ResponseLanguage): string {
  if (language === "uk") return "Ukrainian";
  if (language === "en") return "English";
  if (language === "es") return "Spanish";
  return "Russian";
}
