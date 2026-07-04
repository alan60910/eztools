#!/usr/bin/env node
/**
 * Post-build guard, run after `npm run build` (see package.json's
 * `verify:dist` script and .github/workflows/deploy.yml).
 *
 * Checks:
 *  - every dist/tools/<slug>/index.html (discovered via readdirSync, so no
 *    hand-maintained list — new tool dirs are covered automatically,
 *    regardless of their available/planned status) carries the a11y/SEO
 *    baseline required of every tool page: <main>, meta description,
 *    lang="zh-Hant".
 *  - dist/index.html stays script-free (the "static-first" entry-page
 *    invariant).
 *  - dist/index.html explicitly links out to each currently-available tool.
 *    This list is hand-maintained here and must be kept in sync with the
 *    `available` entries in src/tools.ts — see ENTRY_ANCHOR_SLUGS below.
 *  - every `href="./tools/<slug>/"` anchor found in dist/index.html points
 *    at a slug that was actually built, catching dangling entry-page links.
 *
 * Plain node, no dependencies. Exits 1 with a clear message per failure.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const distDir = resolve(import.meta.dirname, '..', 'dist')
const distToolsDir = resolve(distDir, 'tools')

let failed = false

function fail(message) {
  console.error(`verify:dist FAIL - ${message}`)
  failed = true
}

function readDistFile(relativePath) {
  const path = resolve(distDir, relativePath)
  if (!existsSync(path)) {
    fail(`missing dist/${relativePath} (did you run "npm run build" first?)`)
    return null
  }
  return readFileSync(path, 'utf-8')
}

// --- Per-tool-page skeleton check -----------------------------------------
if (existsSync(distToolsDir)) {
  const toolSlugs = readdirSync(distToolsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)

  for (const slug of toolSlugs) {
    const toolHtml = readDistFile(`tools/${slug}/index.html`)
    if (toolHtml === null) continue

    if (!/<main[\s>]/.test(toolHtml)) {
      fail(`dist/tools/${slug}/index.html has no <main> element`)
    }
    if (!/<meta[^>]*name="description"/.test(toolHtml)) {
      fail(`dist/tools/${slug}/index.html has no <meta name="description">`)
    }
    if (!/lang="zh-Hant"/.test(toolHtml)) {
      fail(`dist/tools/${slug}/index.html is missing lang="zh-Hant"`)
    }
  }
} else {
  fail('missing dist/tools/ (did you run "npm run build" first?)')
}

const rootHtml = readDistFile('index.html')
if (rootHtml !== null) {
  if (/<script/.test(rootHtml)) {
    fail('dist/index.html contains <script> — the entry page must stay zero-JS')
  }

  // Hand-maintained, not derived from src/tools.ts: bump this list whenever
  // a tool flips to 'available' there. Keeping it explicit (rather than
  // re-deriving from tools.ts) means this check stays an actual assertion
  // that the entry page rendered the link, not a tautology that would pass
  // no matter what render.ts produced.
  const ENTRY_ANCHOR_SLUGS = ['apng-to-gif', 'gif-editor']
  for (const slug of ENTRY_ANCHOR_SLUGS) {
    if (!new RegExp(`<a[^>]*href="\\./tools/${slug}/"`).test(rootHtml)) {
      fail(`dist/index.html has no <a href="./tools/${slug}/"> — the entry card did not turn into a link`)
    }
  }

  // Cross-check: every entry-page anchor into tools/ must resolve to an
  // actually-built page (catches dangling links independent of the
  // hand-maintained list above).
  for (const match of rootHtml.matchAll(/<a[^>]*href="\.\/tools\/([^/"]+)\/"/g)) {
    const slug = match[1]
    if (!existsSync(resolve(distToolsDir, slug, 'index.html'))) {
      fail(`dist/index.html links to "./tools/${slug}/" but dist/tools/${slug}/index.html does not exist`)
    }
  }
}

if (failed) {
  console.error('verify:dist: one or more checks failed (see above)')
  process.exit(1)
}

console.log('verify:dist: all checks passed')
