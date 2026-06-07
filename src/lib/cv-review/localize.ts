import type { LocalizedText, ReviewLanguage } from "./types";

export function localizeText(value: LocalizedText, language: ReviewLanguage) {
  if (typeof value === "string") return value;
  return value[language] || value.en || value.id || "";
}

export function localizeList(items: LocalizedText[], language: ReviewLanguage) {
  return items.map((item) => localizeText(item, language));
}
