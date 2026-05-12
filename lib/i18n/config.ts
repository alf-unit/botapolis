/**
 * i18n config — locale list, default, type
 * ----------------------------------------------------------------------------
 * EN is the default and lives at the bare path (e.g. `/tools`).
 * RU lives under `/ru/*` (e.g. `/ru/tools`).
 */
export const i18n = {
  defaultLocale: "en",
  locales: ["en", "ru"],
} as const

export type Locale = (typeof i18n.locales)[number]
