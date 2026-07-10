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
 *  - dist/index.html's inline <script> blocks (if any) are limited to a
 *    fixed whitelist of pinned entry-page scripts (see
 *    ENTRY_ALLOWED_INLINE_SCRIPTS below) — any other inline script, or any
 *    <script> carrying attributes (e.g. src=), fails the build.
 *  - dist/index.html explicitly links out to each currently-available tool.
 *    This list is hand-maintained here and must be kept in sync with the
 *    `available` entries in src/tools.ts — see ENTRY_ANCHOR_SLUGS below.
 *  - every `href="./tools/<slug>/"` anchor found in dist/index.html points
 *    at a slug that was actually built, catching dangling entry-page links.
 *  - the self-hosted ffmpeg core assets made it into dist/vendor/ffmpeg/
 *    (video-converter loads them at runtime) — see the vendored-assets
 *    section below.
 *  - statusline-builder's CSS chunk lands in dist/assets/ (sprint 06a
 *    dropped the Nerd Font route-A inlining previously checked here — the
 *    tool's preview now renders with system monospace fonts and native
 *    emoji glyphs, so no font-asset assertions remain).
 *  - the Nerd Font asset removal (sprint 06a, T3.1) never regresses: no
 *    built text asset under dist/ mentions "nerd" or "woff2", and
 *    package.json never re-lists the "subset-font"/"fontkit" devDeps that
 *    were used to generate the now-deleted font subset.
 *
 * Plain node, no dependencies. Exits 1 with a clear message per failure.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, resolve } from 'node:path'

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

// Fixed whitelist of inline <script> bodies the entry page is allowed to
// carry. Anything else — a script whose (normalized) content doesn't match
// one of these entries, or a script tag with attributes at all (src=, etc.)
// — fails the build. This keeps the entry page's "no framework JS" spirit
// while allowing the small pinned theme-bootstrap snippet through.
const ENTRY_ALLOWED_INLINE_SCRIPTS = [
  // T4.2 final entry-page script (sprint 06 PLAN D4): the pinned FOUC-guard
  // base (byte-identical to the snippet in each of the four tool pages'
  // <head>) plus the entry page's own dark-mode toggle-button wiring, merged
  // into one inline script (no imports, no <script type="module"> — that
  // would break the entry page's "zero framework JS" invariant). Keep this
  // string in sync with index.html's <head> script verbatim; whitespace
  // differences don't matter (see normalizeScriptBody below) but the actual
  // statements must match exactly. sync()'s aria-label line mirrors
  // src/theme.ts:102-105's syncToggleButton (accessible name survives a
  // future icon-only button) — if that line in index.html ever changes,
  // update it here too or the build fails.
  `
    (function () {
      try {
        var t = localStorage.getItem('eztools-theme');
        if (t === 'dark' || t === 'light')
          document.documentElement.setAttribute('data-theme', t);
      } catch (e) {}
    })();

    document.addEventListener('DOMContentLoaded', function () {
      try {
        var button = document.querySelector('.theme-toggle');
        if (!button) return;

        function isEffectiveDark() {
          try {
            var stored = localStorage.getItem('eztools-theme');
            if (stored === 'dark' || stored === 'light') return stored === 'dark';
          } catch (e) {}
          try {
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
          } catch (e) {
            return false;
          }
        }

        function sync() {
          button.setAttribute('aria-pressed', String(isEffectiveDark()));
          button.setAttribute('aria-label', '深色模式切換');
        }

        sync();
        button.addEventListener('click', function () {
          var next = isEffectiveDark() ? 'light' : 'dark';
          try {
            localStorage.setItem('eztools-theme', next);
          } catch (e) {}
          document.documentElement.setAttribute('data-theme', next);
          sync();
        });
      } catch (e) {}
    });
  `,
]

// Collapse all whitespace runs to a single space and trim, so incidental
// formatting (indentation, line breaks, trailing newlines) never causes a
// false mismatch between the whitelist source above and the built HTML.
function normalizeScriptBody(text) {
  return text.replace(/\s+/g, ' ').trim()
}

const rootHtml = readDistFile('index.html')
if (rootHtml !== null) {
  // Extraction regex tolerates attributes on the opening tag (so
  // `<script src="...">` is captured too) precisely so the loop below can
  // explicitly reject attributed/external scripts rather than silently
  // skipping them — the whitelist only ever contains attribute-less inline
  // scripts, so any attrs immediately fails.
  for (const match of rootHtml.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
    const attrs = match[1]
    const body = match[2]
    if (attrs.trim() !== '') {
      fail(`dist/index.html has a <script${attrs}> tag with attributes — external/attributed scripts are never allowed on the entry page`)
      continue
    }
    const normalizedBody = normalizeScriptBody(body)
    const isAllowed = ENTRY_ALLOWED_INLINE_SCRIPTS.some(
      (allowed) => normalizeScriptBody(allowed) === normalizedBody,
    )
    if (!isAllowed) {
      fail('dist/index.html contains an inline <script> that is not on the ENTRY_ALLOWED_INLINE_SCRIPTS whitelist — entry page must carry no unapproved JS')
    }
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

// --- statusline-builder CSS chunk -------------------------------------------
const assetsDir = resolve(distDir, 'assets')
if (existsSync(assetsDir)) {
  const statuslineCss = readdirSync(assetsDir).filter((name) =>
    /^tool-statusline-builder-.*\.css$/.test(name),
  )
  if (statuslineCss.length === 0) {
    fail('no dist/assets/tool-statusline-builder-*.css found (statusline-builder CSS chunk missing from the build?)')
  }
} else {
  fail('missing dist/assets/ (did you run "npm run build" first?)')
}

// --- 06a font-removal invariant ---------------------------------------------
// Sprint 06a (T3.1) deleted tools/statusline-builder/fonts/, preview-font.css,
// scripts/subset-statusline-font.mjs and the subset-font/fontkit devDeps —
// the Nerd Font subset is gone for good. These two checks are a permanent
// regression guard so none of that ever quietly comes back.
//
// Both patterns use \b word boundaries rather than bare substring matches.
// A bare /nerd/i false-positives on ordinary camelCase identifiers that
// happen to contain "nerd" at a non-boundary position — e.g. "ownerDocument",
// "cornerDistance", "bannerDismiss", "innerDiv" all contain "nerD" mid-word
// (MAGI R6 verified this misfire). \bnerd\b requires a boundary on both
// sides, which those identifiers never have, while still matching "Nerd
// Font" / "nerd-font" / "...-nerd-font-mono-subset.woff2" (surrounded by
// spaces/hyphens/dots). "woff2" has no equivalent camelCase false-positive
// class today, but \b is applied for symmetry: legitimate font references
// are always written with punctuation or whitespace around the token (e.g.
// `.woff2`, `"woff2"`, `woff2)`), so the boundary never suppresses a true
// positive.
const TEXT_ASSET_EXTENSIONS = new Set(['.html', '.css', '.js'])

function collectDistTextFiles(dir) {
  const files = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const entryPath = resolve(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...collectDistTextFiles(entryPath))
    } else if (TEXT_ASSET_EXTENSIONS.has(extname(entry.name))) {
      // Only textual build output (.html/.css/.js) is swept — binary vendor
      // assets like dist/vendor/ffmpeg/ffmpeg-core.wasm are skipped, both
      // because they aren't text and because false positives inside a
      // third-party wasm binary would be meaningless noise.
      files.push(entryPath)
    }
  }
  return files
}

if (existsSync(distDir)) {
  for (const filePath of collectDistTextFiles(distDir)) {
    const content = readFileSync(filePath, 'utf-8')
    if (/\bnerd\b/i.test(content)) {
      fail(`dist/${filePath.slice(distDir.length + 1)} mentions the word "nerd" — the Nerd Font asset was removed in 06a (T3.1) and must not reappear in build output`)
    }
    if (/\bwoff2\b/i.test(content)) {
      fail(`dist/${filePath.slice(distDir.length + 1)} mentions the word "woff2" — no font-face asset should ship in dist since 06a (T3.1) removed the Nerd Font subset`)
    }
  }
}

const packageJsonText = readFileSync(resolve(rootDir, 'package.json'), 'utf-8')
if (/subset-font/.test(packageJsonText)) {
  fail('package.json still references "subset-font" — this devDependency was removed in 06a (T3.1) along with the font subset it generated')
}
if (/fontkit/.test(packageJsonText)) {
  fail('package.json still references "fontkit" — this devDependency was removed in 06a (T3.1) along with the font subset it generated')
}

if (failed) {
  console.error('verify:dist: one or more checks failed (see above)')
  process.exit(1)
}

console.log('verify:dist: all checks passed')
