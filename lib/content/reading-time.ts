import readingTimeLib from "reading-time"

/* ----------------------------------------------------------------------------
   reading-time wrapper
   ----------------------------------------------------------------------------
   Single locale-aware formatter so every MDX route renders the same shape
   ("5 min read" / "5 мин"). The upstream lib only outputs English, so we
   bypass `.text` and format ourselves.

   We round defensively: `reading-time` returns fractional minutes and a few
   seconds of frontmatter/YAML count toward the total. `Math.max(1, …)`
   stops short articles from advertising "0 min read".
---------------------------------------------------------------------------- */

export interface ReadingTime {
  /** Whole minutes, never less than 1. */
  minutes: number
  /** Pre-formatted "5 min read" / "5 мин" string for direct render. */
  text: string
  /** Raw word count — useful for the OG-image template. */
  words: number
}

export function getReadingTime(
  raw: string,
  locale: "en" | "ru" = "en",
): ReadingTime {
  const stats = readingTimeLib(raw)
  const minutes = Math.max(1, Math.round(stats.minutes))
  const text = locale === "ru" ? `${minutes} мин` : `${minutes} min read`
  return { minutes, text, words: stats.words }
}
