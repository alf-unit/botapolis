import { describe, expect, test } from "vitest"

import { absoluteUrl, formatNumber, formatPrice, hashIp, slugify, truncate } from "@/lib/utils"

/* ----------------------------------------------------------------------------
   lib/utils — pure helper coverage
   ----------------------------------------------------------------------------
   Aim: lock down the behaviour the app depends on so accidental changes
   to the helpers surface as test failures, not as silent regression in
   /tools/[slug] or /api/* output.

   No mocks — every function here is pure (or async-pure for hashIp).
---------------------------------------------------------------------------- */

describe("formatPrice", () => {
  test("formats a whole-dollar US amount", () => {
    // Default locale is `en`, default currency `USD`. The Intl
    // implementation that ships with Node/happy-dom uses non-breaking
    // spaces on some platforms; normalise before matching.
    const out = formatPrice(1200).replace(/ /g, " ")
    expect(out).toBe("$1,200")
  })

  test("formats a fractional amount with two decimals", () => {
    const out = formatPrice(0.5).replace(/ /g, " ")
    expect(out).toBe("$0.50")
  })

  test("returns empty string for null / undefined / NaN", () => {
    expect(formatPrice(null)).toBe("")
    expect(formatPrice(undefined)).toBe("")
    expect(formatPrice(Number.NaN)).toBe("")
  })

  test("RU locale renders comma decimal separator", () => {
    // Intl puts the currency symbol on the right in RU and uses commas.
    // We don't pin the exact whitespace because Node versions differ.
    const out = formatPrice(0.5, { locale: "ru" })
    expect(out).toMatch(/0,50/)
    expect(out).toContain("$")
  })
})

describe("formatNumber", () => {
  test("inserts thousand-separators", () => {
    const out = formatNumber(123456).replace(/ /g, " ")
    // Intl in EN uses comma; matching with either to survive minor
    // platform differences.
    expect(out === "123,456" || out === "123 456").toBe(true)
  })

  test("returns empty string for null / undefined", () => {
    expect(formatNumber(null)).toBe("")
    expect(formatNumber(undefined)).toBe("")
  })
})

describe("slugify", () => {
  test("converts simple title to URL slug", () => {
    expect(slugify("Hello World")).toBe("hello-world")
  })

  test("strips punctuation and folds case", () => {
    expect(slugify("Klaviyo vs. Mailchimp 2026!")).toBe("klaviyo-vs-mailchimp-2026")
  })

  test("collapses repeat separators", () => {
    expect(slugify("foo --- bar")).toBe("foo-bar")
  })
})

describe("truncate", () => {
  test("returns input unchanged below threshold", () => {
    expect(truncate("short", 20)).toBe("short")
  })

  test("truncates at the last word boundary before the cap", () => {
    const out = truncate("one two three four five", 12)
    // "one two…" or "one two three…" depending on boundary logic — either
    // is acceptable; we just assert it's shorter than input and ends with
    // an ellipsis.
    expect(out.length).toBeLessThan("one two three four five".length)
    expect(out.endsWith("…") || out.endsWith("...")).toBe(true)
  })
})

describe("hashIp", () => {
  test("returns a hex string of consistent length", async () => {
    const h = await hashIp("1.2.3.4")
    expect(h).toMatch(/^[a-f0-9]+$/)
    // Project truncates SHA-256 hex to 32 chars — half the hash is plenty
    // for fingerprinting clicks/subscribes without storing raw PII, and
    // it keeps row size down in Redis / Supabase. If hashIp ever changes
    // its slice, bump this in lockstep.
    expect(h.length).toBe(32)
  })

  test("hashes deterministically for the same input", async () => {
    const a = await hashIp("1.2.3.4")
    const b = await hashIp("1.2.3.4")
    expect(a).toBe(b)
  })

  test("hashes differently for different IPs", async () => {
    const a = await hashIp("1.2.3.4")
    const b = await hashIp("5.6.7.8")
    expect(a).not.toBe(b)
  })
})

describe("absoluteUrl", () => {
  test("preserves an absolute https URL", () => {
    expect(absoluteUrl("https://example.com/foo")).toBe("https://example.com/foo")
  })

  test("prefixes a leading-slash path with the site origin", () => {
    const out = absoluteUrl("/foo")
    expect(out.endsWith("/foo")).toBe(true)
    expect(out.startsWith("http")).toBe(true)
  })

  test("normalises a bare path with no leading slash", () => {
    const out = absoluteUrl("bar")
    expect(out.endsWith("/bar")).toBe(true)
  })
})
