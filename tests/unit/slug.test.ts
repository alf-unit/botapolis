import { describe, expect, test } from "vitest"

import { canonicalCompareSlug, isCanonicalCompareSlug } from "@/lib/content/slug"

/* ----------------------------------------------------------------------------
   lib/content/slug — canonical comparison slug normalisation
   ----------------------------------------------------------------------------
   Locks the contract that `canonicalCompareSlug` enforces alphabetical
   tool order, leaves non-comparison slugs alone, and degrades safely on
   weird inputs. The route handler at app/compare/[slug]/page.tsx relies
   on `isCanonicalCompareSlug` returning `true` exactly when no redirect
   is needed.
---------------------------------------------------------------------------- */

describe("canonicalCompareSlug", () => {
  test("leaves an already-canonical slug untouched", () => {
    expect(canonicalCompareSlug("klaviyo-vs-omnisend")).toBe("klaviyo-vs-omnisend")
    expect(canonicalCompareSlug("gorgias-vs-tidio")).toBe("gorgias-vs-tidio")
    expect(canonicalCompareSlug("klaviyo-vs-mailchimp")).toBe("klaviyo-vs-mailchimp")
  })

  test("flips a reverse-ordered slug into canonical form", () => {
    expect(canonicalCompareSlug("omnisend-vs-klaviyo")).toBe("klaviyo-vs-omnisend")
    expect(canonicalCompareSlug("manychat-vs-klaviyo")).toBe("klaviyo-vs-manychat")
    expect(canonicalCompareSlug("tidio-vs-postscript")).toBe("postscript-vs-tidio")
  })

  test("passes single-segment slugs through unchanged", () => {
    expect(canonicalCompareSlug("klaviyo")).toBe("klaviyo")
    expect(canonicalCompareSlug("some-long-slug")).toBe("some-long-slug")
  })

  test("does not touch malformed three-part `a-vs-b-vs-c` slugs", () => {
    // We never produce these, but if one shows up in a URL bar we want
    // the route handler to 404 cleanly rather than redirect into another
    // non-existent slug.
    expect(canonicalCompareSlug("a-vs-b-vs-c")).toBe("a-vs-b-vs-c")
  })

  test("handles tool names that contain hyphens", () => {
    // Hyphens inside a tool segment are fine because the split is on the
    // literal `-vs-` token, not on any single dash.
    expect(canonicalCompareSlug("re-amaze-vs-gorgias")).toBe("gorgias-vs-re-amaze")
    expect(canonicalCompareSlug("gorgias-vs-re-amaze")).toBe("gorgias-vs-re-amaze")
  })

  test("leaves degenerate inputs (empty segment) alone for the 404 path", () => {
    expect(canonicalCompareSlug("-vs-foo")).toBe("-vs-foo")
    expect(canonicalCompareSlug("foo-vs-")).toBe("foo-vs-")
  })
})

describe("isCanonicalCompareSlug", () => {
  test("returns true iff the slug equals its canonical form", () => {
    expect(isCanonicalCompareSlug("klaviyo-vs-omnisend")).toBe(true)
    expect(isCanonicalCompareSlug("omnisend-vs-klaviyo")).toBe(false)
    expect(isCanonicalCompareSlug("klaviyo")).toBe(true)
  })
})
