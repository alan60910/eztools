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
 *  - the self-hosted ffmpeg core assets made it into dist/vendor/ffmpeg/
 *    (video-converter loads them at runtime) — see the vendored-assets
 *    section below.
 *  - statusline-builder's Nerd Font subset is base64-inlined into its CSS
 *    chunk (route A — the subset is under Vite's assetsInlineLimit so no
 *    standalone dist/assets/*.woff2 is emitted), and the source woff2 stays
 *    under the 100KB policy ceiling — see the font-subset section below.
 *
 * Plain node, no dependencies. Exits 1 with a clear message per failure.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const rootDir = resolve(import.meta.dirname, '..')
const distDir = resolve(rootDir, 'dist')
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
  const ENTRY_ANCHOR_SLUGS = ['apng-to-gif', 'gif-editor', 'video-converter', 'statusline-builder']
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

// --- Vendored ffmpeg core assets (video-converter) --------------------------
// Kept in sync with scripts/vendor-ffmpeg.mjs, which copies these assets from
// node_modules/@ffmpeg/core/dist/esm/ into public/vendor/ffmpeg/ via the
// prebuild hook: if that script changes what it ships, update these
// assertions together with it.
const wasmPath = 'vendor/ffmpeg/ffmpeg-core.wasm'
const MIN_WASM_BYTES = 20 * 1024 * 1024
if (!existsSync(resolve(distDir, 'vendor/ffmpeg/ffmpeg-core.js'))) {
  fail('missing dist/vendor/ffmpeg/ffmpeg-core.js (did the prebuild vendor-ffmpeg.mjs hook run?)')
}
if (!existsSync(resolve(distDir, wasmPath))) {
  fail(`missing dist/${wasmPath} (did the prebuild vendor-ffmpeg.mjs hook run?)`)
} else {
  const wasmSize = statSync(resolve(distDir, wasmPath)).size
  if (wasmSize <= MIN_WASM_BYTES) {
    fail(`dist/${wasmPath} is ${wasmSize} bytes (expected > ${MIN_WASM_BYTES}) — truncated or wrong file?`)
  }
}

// --- statusline-builder Nerd Font subset (route A: base64-inlined) ----------
// The subset woff2 (~3.5KB) is under Vite's assetsInlineLimit, so Vite inlines
// it as a data: URI inside the tool's CSS chunk rather than emitting a
// standalone dist/assets/*.woff2 (measured in sprint 05 T3.2). Two guards:
//  (a) the inline actually landed in the built CSS chunk;
//  (b) the *source* woff2 stays under the 100KB policy ceiling (the byte guard
//      lives on the source, not a dist asset, precisely because it is inlined).
const assetsDir = resolve(distDir, 'assets')
if (existsSync(assetsDir)) {
  const statuslineCss = readdirSync(assetsDir).filter((name) =>
    /^tool-statusline-builder-.*\.css$/.test(name),
  )
  if (statuslineCss.length === 0) {
    fail('no dist/assets/tool-statusline-builder-*.css found (statusline-builder CSS chunk missing from the build?)')
  } else if (
    !statuslineCss.some((name) =>
      readFileSync(resolve(assetsDir, name), 'utf-8').includes('data:font/woff2;base64,'),
    )
  ) {
    fail('dist/assets/tool-statusline-builder-*.css does not inline the Nerd Font subset as "data:font/woff2;base64," — route A broken (did the subset grow past Vite assetsInlineLimit?)')
  }
} else {
  fail('missing dist/assets/ (did you run "npm run build" first?)')
}

const fontSrcDir = resolve(rootDir, 'tools', 'statusline-builder', 'fonts')
const MAX_FONT_BYTES = 100 * 1024
if (existsSync(fontSrcDir)) {
  const woff2Files = readdirSync(fontSrcDir).filter((name) => name.endsWith('.woff2'))
  if (woff2Files.length === 0) {
    fail('no tools/statusline-builder/fonts/*.woff2 source subset font found')
  } else {
    for (const name of woff2Files) {
      const fontSize = statSync(resolve(fontSrcDir, name)).size
      if (fontSize >= MAX_FONT_BYTES) {
        fail(`tools/statusline-builder/fonts/${name} is ${fontSize} bytes (expected < ${MAX_FONT_BYTES}) — subset exceeds the 100KB policy ceiling`)
      }
    }
  }
} else {
  fail('missing tools/statusline-builder/fonts/ (source subset font directory)')
}

if (failed) {
  console.error('verify:dist: one or more checks failed (see above)')
  process.exit(1)
}

console.log('verify:dist: all checks passed')
