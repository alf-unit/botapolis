import "server-only"
import type { Locale } from "./config"

/**
 * Lazy dictionary loader — only the requested locale's JSON is bundled
 * with the route's chunk.
 */
const dictionaries = {
  en: () => import("@/locales/en.json").then((m) => m.default),
  ru: () => import("@/locales/ru.json").then((m) => m.default),
}

export const getDictionary = (locale: Locale) => dictionaries[locale]()

export type Dictionary = Awaited<ReturnType<typeof getDictionary>>
