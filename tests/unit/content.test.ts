import { describe, expect, test } from "vitest"

import { extractToc } from "@/lib/content/toc"
import { getReadingTime } from "@/lib/content/reading-time"

/* ----------------------------------------------------------------------------
   lib/content — MDX pipeline helpers
   ----------------------------------------------------------------------------
   Focused on the heading-extraction + reading-time math because both
   power user-facing surfaces (TOC sidebar, "5 min read" meta row). Any
   regression here is immediately visible to readers.
---------------------------------------------------------------------------- */

describe("extractToc", () => {
  test("pulls h2 + h3 headings from markdown", () => {
    const md = `
Some lede paragraph here.

## First section

text...

### Subsection

text...

## Second section

text...
`
    const toc = extractToc(md)
    expect(toc).toHaveLength(3)
    expect(toc[0]).toMatchObject({ title: "First section",   level: 2 })
    expect(toc[1]).toMatchObject({ title: "Subsection",      level: 3 })
    expect(toc[2]).toMatchObject({ title: "Second section",  level: 2 })
  })

  test("skips h1 (reserved for the page hero)", () => {
    const md = `# Hero title\n\n## Body section`
    const toc = extractToc(md)
    expect(toc).toHaveLength(1)
    expect(toc[0].title).toBe("Body section")
  })

  test("skips heading-like lines inside fenced code blocks", () => {
    const md = [
      "## Real heading",
      "",
      "```text",
      "## not a heading — inside a code fence",
      "```",
      "",
      "## Another real heading",
    ].join("\n")
    const toc = extractToc(md)
    expect(toc).toHaveLength(2)
    expect(toc.every((e) => e.title.startsWith("Real heading") || e.title === "Another real heading")).toBe(true)
  })

  test("computes anchor ids that match rehype-slug output (kebab, lowercase, no punct)", () => {
    const md = `## Postscript vs Klaviyo: the head-to-head!`
    const toc = extractToc(md)
    expect(toc[0].id).toBe("postscript-vs-klaviyo-the-head-to-head")
  })
})

describe("getReadingTime", () => {
  test("returns at minimum 1 min for short content", () => {
    const out = getReadingTime("only a handful of words here")
    expect(out.minutes).toBeGreaterThanOrEqual(1)
    expect(out.text).toBe("1 min read")
  })

  test("scales roughly with word count", () => {
    // ~1500 words at the lib's default 200 wpm → ~7-8 minutes.
    const body = Array.from({ length: 1500 }).fill("word").join(" ")
    const out = getReadingTime(body)
    expect(out.minutes).toBeGreaterThanOrEqual(6)
    expect(out.minutes).toBeLessThanOrEqual(9)
  })

  test("RU locale localises the trailing label", () => {
    const out = getReadingTime("just a few words", "ru")
    expect(out.text).toMatch(/мин$/)
  })

  test("exposes word count for downstream OG image generation", () => {
    const out = getReadingTime("one two three four five")
    expect(out.words).toBe(5)
  })
})
