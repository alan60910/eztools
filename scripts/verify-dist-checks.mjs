/**
 * Pure check functions for `scripts/verify-dist.mjs` (the CLI shell).
 *
 * magi/10-theme-config-hardening (G3/W0/W3): extracted so the checks can be
 * unit-tested directly (tmpdir-synthesized `dist/` fixtures) without
 * shelling out to `node scripts/verify-dist.mjs` for every case. Every
 * exported function here is a pure(-ish) reader: it takes already-resolved
 * paths/content, reads whatever files it needs via node:fs, and *returns* an
 * array of human-readable failure message strings (never prints, never
 * throws for an expected "file missing"/"content wrong" case, never calls
 * `process.exit`). Importing this module has zero side effects — nothing
 * runs at module-eval time — so `import` from a vitest test file is safe
 * (T1.1 PoC criterion 1).
 *
 * Message text, generation order and per-check semantics are carried over
 * verbatim from the pre-refactor `scripts/verify-dist.mjs` (see git history
 * for the monolithic version) with exactly two intentional, sprint-10
 * Non-Goal-approved exceptions to the extracted-script scan
 * (`checkEntryInlineScripts`): (i) the `<script>` tag match is now
 * case-insensitive (`<SCRIPT>` is caught too — a collateral tightening);
 * (ii) `<script>` blocks inside an HTML comment are no longer flagged
 * (comments never execute in a browser, so there is nothing to police).
 * Every other check's pass/fail verdict on a given `dist/` is unchanged.
 *
 * `runAllChecks` composes every check below in the same order the original
 * monolithic script ran them in, so its output — when fed the real
 * `dist/` — reproduces the pre-refactor script's message sequence and exit
 * semantics byte-for-byte (the CLI shell in verify-dist.mjs just prints
 * `runAllChecks(...)`'s result and picks the exit code).
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, resolve } from 'node:path'

/**
 * Reads `<distDir>/<relativePath>` as UTF-8 text.
 *
 * @param {string} distDir
 * @param {string} relativePath
 * @returns {{ content: string | null, missingMessage: string | null }}
 *   `content` is `null` (and `missingMessage` set) when the file does not
 *   exist; otherwise `content` holds the file text and `missingMessage` is
 *   `null`.
 */
export function readDistFile(distDir, relativePath) {
  const absolutePath = resolve(distDir, relativePath)
  if (!existsSync(absolutePath)) {
    return {
      content: null,
      missingMessage: `missing dist/${relativePath} (did you run "npm run build" first?)`,
    }
  }
  return { content: readFileSync(absolutePath, 'utf-8'), missingMessage: null }
}

// --- Per-tool-page skeleton check -------------------------------------------
// Every dist/tools/<slug>/index.html (discovered via readdirSync, so no
// hand-maintained list — new tool dirs are covered automatically, regardless
// of their available/planned status) must carry the a11y/SEO baseline
// required of every tool page: <main>, meta description, lang="zh-Hant".

/**
 * @param {string} distDir
 * @returns {string[]}
 */
export function checkToolPageSkeleton(distDir) {
  /** @type {string[]} */
  const messages = []
  const distToolsDir = resolve(distDir, 'tools')

  if (!existsSync(distToolsDir)) {
    messages.push('missing dist/tools/ (did you run "npm run build" first?)')
    return messages
  }

  const toolSlugs = readdirSync(distToolsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)

  for (const slug of toolSlugs) {
    const { content: toolHtml, missingMessage } = readDistFile(distDir, `tools/${slug}/index.html`)
    if (missingMessage !== null) {
      messages.push(missingMessage)
      continue
    }
    const html = /** @type {string} */ (toolHtml)

    if (!/<main[\s>]/.test(html)) {
      messages.push(`dist/tools/${slug}/index.html has no <main> element`)
    }
    if (!/<meta[^>]*name="description"/.test(html)) {
      messages.push(`dist/tools/${slug}/index.html has no <meta name="description">`)
    }
    if (!/lang="zh-Hant"/.test(html)) {
      messages.push(`dist/tools/${slug}/index.html is missing lang="zh-Hant"`)
    }
  }
  return messages
}

// --- Entry-page inline <script> whitelist -----------------------------------
// Fixed whitelist of inline <script> bodies the entry page is allowed to
// carry. Anything else — a script whose (normalized) content doesn't match
// one of these entries, or a script tag with attributes at all (src=, etc.)
// — fails the build. This keeps the entry page's "no framework JS" spirit
// while allowing the small pinned theme-bootstrap snippet through. As of
// magi/10-theme-config-hardening (M2/T2.4), the whitelisted snippet also
// carries the OS-preference (matchMedia change) and cross-tab (storage)
// theme-sync listeners, mirroring src/theme.ts's initThemeSync — not just
// the toggle-button wiring the earlier comment wording suggested.
export const ENTRY_ALLOWED_INLINE_SCRIPTS = [
  // T4.2 final entry-page script (sprint 06 PLAN D4): the pinned FOUC-guard
  // base (byte-identical to the snippet in each of the four tool pages'
  // <head>) plus the entry page's own dark-mode toggle-button wiring, merged
  // into one inline script (no imports, no <script type="module"> — that
  // would break the entry page's "zero framework JS" invariant). Keep this
  // string in sync with index.html's <head> script verbatim; whitespace
  // differences don't matter (see normalizeScriptBody below) but the actual
  // statements must match exactly. sync()'s aria-label line mirrors
  // src/theme.ts's syncToggleButton (accessible name survives a future
  // icon-only button) — if that line in index.html ever changes, update it
  // here too or the build fails.
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

        try {
          window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
            sync();
          });
        } catch (e) {}

        try {
          window.addEventListener('storage', function (event) {
            if (event.key !== 'eztools-theme' && event.key !== null) return;
            var stored = null;
            try {
              stored = localStorage.getItem('eztools-theme');
            } catch (e) {}
            if (stored === 'dark' || stored === 'light') {
              document.documentElement.setAttribute('data-theme', stored);
            } else {
              document.documentElement.removeAttribute('data-theme');
            }
            sync();
          });
        } catch (e) {}
      } catch (e) {}
    });
  `,
]

// Collapse all whitespace runs to a single space and trim, so incidental
// formatting (indentation, line breaks, trailing newlines) never causes a
// false mismatch between the whitelist source above and the built HTML.
// Exported so a whitelist-drift unit test (see verify-dist-checks.test.ts)
// can normalize repo-root index.html's inline scripts the same way this
// check does, without duplicating the whitespace-collapsing rule.
/**
 * @param {string} text
 * @returns {string}
 */
export function normalizeScriptBody(text) {
  return text.replace(/\s+/g, ' ').trim()
}

// Matches HTML comments so they can be stripped from the *script-extraction*
// scan only (magi/10 Non-Goal ii: a <script> inside a comment never
// executes, so it is deliberately not policed). Anchor-style checks below
// (ENTRY_ANCHOR_SLUGS presence, dangling-anchor cross-check) intentionally
// keep matching against the raw, un-stripped HTML — that scope narrowing is
// a hard requirement, not an oversight.
const HTML_COMMENT_PATTERN = /<!--[\s\S]*?-->/g

// Extraction regex tolerates attributes on the opening tag (so
// `<script src="...">` is captured too) precisely so the loop below can
// explicitly reject attributed/external scripts rather than silently
// skipping them — the whitelist only ever contains attribute-less inline
// scripts, so any attrs immediately fails. `\b` after `script` avoids
// matching custom-element-ish tag names like `<scriptlet>`; the trailing
// `i` flag catches `<SCRIPT>`/`</SCRIPT>` case variants too (magi/10
// Non-Goal i: this is an intentional collateral tightening, not a
// behavior-preserving refactor of the original case-sensitive regex).
//
// Known regex-based-HTML-parsing limitation (pinned by guardrail tests, not
// fixed here — see verify-dist-checks.test.ts): the non-greedy `[\s\S]*?`
// stops at the *first* literal `</script` it finds, so a script body that
// itself contains that substring (e.g. inside a JS string literal) truncates
// early — this actually mirrors how a real HTML tokenizer treats `<script>`
// as raw text (it also stops at the first literal `</script` regardless of
// surrounding quotes), so it is not a divergence from browser behavior, just
// a sharp edge worth documenting. Similarly, `HTML_COMMENT_PATTERN` does not
// support "nested" `<!-- ... <!-- ... --> ... -->` markup — HTML comments
// themselves don't nest either, so a naive reader expecting the inner
// `<!--` to need its own `-->` will be surprised, but this matches real
// parsers: the first `-->` found closes the (only) comment.
const SCRIPT_TAG_PATTERN = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi

/**
 * Extracts every `<script ...>...</script>` occurrence from `html`, after
 * stripping HTML comments (magi/10 Non-Goal ii). Shared by
 * `checkEntryInlineScripts` and the whitelist-drift unit test that scans the
 * repo-root `index.html` source directly (not the built dist).
 *
 * @param {string} html
 * @returns {{ attrs: string, body: string }[]}
 */
export function extractInlineScripts(html) {
  const scannableHtml = html.replace(HTML_COMMENT_PATTERN, '')
  return Array.from(scannableHtml.matchAll(SCRIPT_TAG_PATTERN), (match) => ({
    attrs: match[1] ?? '',
    body: match[2] ?? '',
  }))
}

/**
 * @param {string | null} rootHtml
 * @returns {string[]}
 */
export function checkEntryInlineScripts(rootHtml) {
  if (rootHtml === null) return []
  /** @type {string[]} */
  const messages = []

  // Guardrail against extractInlineScripts's own known weak spot (magi/10
  // Minority item 1, fable): it strips HTML comments *before* matching
  // <script> tags, so a literal "<!--" that appears inside a real
  // <script>'s raw body can have its matching "-->" land past that
  // script's own closing tag — silently swallowing a subsequent,
  // actually-executing <script> into the stripped span (a whitelisted
  // residual reassembly would then wrongly pass). Detect the signature of
  // this shape by scanning the *raw*, un-stripped rootHtml with the same
  // script-tag pattern (bypassing the comment strip entirely): if any such
  // naively-extracted body still contains a literal "<!--", that is exactly
  // the pattern that can cause the boundary-crossing strip above, so fail
  // loudly here rather than silently trust the (potentially compromised)
  // comment-stripped extraction below.
  for (const match of rootHtml.matchAll(SCRIPT_TAG_PATTERN)) {
    const rawBody = match[2] ?? ''
    if (rawBody.includes('<!--')) {
      messages.push(
        'dist/index.html has an inline <script> body that contains "<!--" — HTML-comment stripping in extractInlineScripts could cross a script boundary here and exempt a real, executing <script> that follows it from this whitelist check',
      )
    }
  }

  for (const { attrs, body } of extractInlineScripts(rootHtml)) {
    if (attrs.trim() !== '') {
      messages.push(
        `dist/index.html has a <script${attrs}> tag with attributes — external/attributed scripts are never allowed on the entry page`,
      )
      continue
    }
    const normalizedBody = normalizeScriptBody(body)
    const isAllowed = ENTRY_ALLOWED_INLINE_SCRIPTS.some(
      (allowed) => normalizeScriptBody(allowed) === normalizedBody,
    )
    if (!isAllowed) {
      messages.push(
        'dist/index.html contains an inline <script> that is not on the ENTRY_ALLOWED_INLINE_SCRIPTS whitelist — entry page must carry no unapproved JS',
      )
    }
  }
  return messages
}

// --- Entry-page explicit tool anchors ---------------------------------------
// Hand-maintained, not derived from src/tools.ts: bump this list whenever a
// tool flips to 'available' there. Keeping it explicit (rather than
// re-deriving from tools.ts) means this check stays an actual assertion that
// the entry page rendered the link, not a tautology that would pass no
// matter what render.ts produced.
export const ENTRY_ANCHOR_SLUGS = ['apng-to-gif', 'gif-editor', 'video-converter', 'statusline-builder']

/**
 * @param {string | null} rootHtml
 * @returns {string[]}
 */
export function checkEntryAnchors(rootHtml) {
  if (rootHtml === null) return []
  /** @type {string[]} */
  const messages = []
  for (const slug of ENTRY_ANCHOR_SLUGS) {
    if (!new RegExp(`<a[^>]*href="\\./tools/${slug}/"`).test(rootHtml)) {
      messages.push(`dist/index.html has no <a href="./tools/${slug}/"> — the entry card did not turn into a link`)
    }
  }
  return messages
}

// --- Entry-page dangling-anchor cross-check ---------------------------------
// Every `href="./tools/<slug>/"` anchor found in dist/index.html must point
// at a slug that was actually built, catching dangling entry-page links
// independent of the hand-maintained ENTRY_ANCHOR_SLUGS list above.

/**
 * @param {string | null} rootHtml
 * @param {string} distDir
 * @returns {string[]}
 */
export function checkDanglingAnchors(rootHtml, distDir) {
  if (rootHtml === null) return []
  /** @type {string[]} */
  const messages = []
  const distToolsDir = resolve(distDir, 'tools')
  for (const match of rootHtml.matchAll(/<a[^>]*href="\.\/tools\/([^/"]+)\/"/g)) {
    const slug = match[1]
    if (!existsSync(resolve(distToolsDir, slug, 'index.html'))) {
      messages.push(`dist/index.html links to "./tools/${slug}/" but dist/tools/${slug}/index.html does not exist`)
    }
  }
  return messages
}

// --- Vendored ffmpeg core assets (video-converter) --------------------------
// Kept in sync with scripts/vendor-ffmpeg.mjs, which copies these assets from
// node_modules/@ffmpeg/core/dist/esm/ into public/vendor/ffmpeg/ via the
// prebuild hook: if that script changes what it ships, update these
// assertions together with it.

// Exported (magi/10-theme-config-hardening Minority 11, sonnet) so
// verify-dist-checks.test.ts can import and reuse this exact value instead of
// hand-duplicating a second hardcoded copy that could silently drift out of
// sync with this one.
export const MIN_WASM_BYTES = 20 * 1024 * 1024

/**
 * @param {string} distDir
 * @returns {string[]}
 */
export function checkFfmpegVendorAssets(distDir) {
  /** @type {string[]} */
  const messages = []
  const wasmPath = 'vendor/ffmpeg/ffmpeg-core.wasm'

  if (!existsSync(resolve(distDir, 'vendor/ffmpeg/ffmpeg-core.js'))) {
    messages.push('missing dist/vendor/ffmpeg/ffmpeg-core.js (did the prebuild vendor-ffmpeg.mjs hook run?)')
  }
  if (!existsSync(resolve(distDir, wasmPath))) {
    messages.push(`missing dist/${wasmPath} (did the prebuild vendor-ffmpeg.mjs hook run?)`)
  } else {
    const wasmSize = statSync(resolve(distDir, wasmPath)).size
    if (wasmSize <= MIN_WASM_BYTES) {
      messages.push(`dist/${wasmPath} is ${wasmSize} bytes (expected > ${MIN_WASM_BYTES}) — truncated or wrong file?`)
    }
  }
  return messages
}

// --- statusline-builder CSS chunk -------------------------------------------
// sprint 06a dropped the Nerd Font route-A inlining previously checked here
// — the tool's preview now renders with system monospace fonts and native
// emoji glyphs, so no font-asset assertions remain; only the chunk's
// presence is checked.

/**
 * @param {string} distDir
 * @returns {string[]}
 */
export function checkStatuslineCssChunk(distDir) {
  /** @type {string[]} */
  const messages = []
  const assetsDir = resolve(distDir, 'assets')
  if (existsSync(assetsDir)) {
    const statuslineCss = readdirSync(assetsDir).filter((name) => /^tool-statusline-builder-.*\.css$/.test(name))
    if (statuslineCss.length === 0) {
      messages.push('no dist/assets/tool-statusline-builder-*.css found (statusline-builder CSS chunk missing from the build?)')
    }
  } else {
    messages.push('missing dist/assets/ (did you run "npm run build" first?)')
  }
  return messages
}

// --- 06a font-removal invariant ---------------------------------------------
// Sprint 06a (T3.1) deleted tools/statusline-builder/fonts/, preview-font.css,
// scripts/subset-statusline-font.mjs and the subset-font/fontkit devDeps —
// the Nerd Font subset is gone for good. checkNerdFontRegression and
// checkPackageJsonFontDeps are a permanent regression guard so none of that
// ever quietly comes back.
//
// Both patterns use \b word boundaries rather than bare substring matches. A
// bare /nerd/i false-positives on ordinary camelCase identifiers that happen
// to contain "nerd" at a non-boundary position — e.g. "ownerDocument",
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

/**
 * @param {string} dir
 * @returns {string[]}
 */
function collectDistTextFiles(dir) {
  /** @type {string[]} */
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

/**
 * @param {string} distDir
 * @returns {string[]}
 */
export function checkNerdFontRegression(distDir) {
  /** @type {string[]} */
  const messages = []
  if (!existsSync(distDir)) return messages

  for (const filePath of collectDistTextFiles(distDir)) {
    const content = readFileSync(filePath, 'utf-8')
    if (/\bnerd\b/i.test(content)) {
      messages.push(
        `dist/${filePath.slice(distDir.length + 1)} mentions the word "nerd" — the Nerd Font asset was removed in 06a (T3.1) and must not reappear in build output`,
      )
    }
    if (/\bwoff2\b/i.test(content)) {
      messages.push(
        `dist/${filePath.slice(distDir.length + 1)} mentions the word "woff2" — no font-face asset should ship in dist since 06a (T3.1) removed the Nerd Font subset`,
      )
    }
  }
  return messages
}

/**
 * @param {string} rootDir
 * @returns {string[]}
 */
export function checkPackageJsonFontDeps(rootDir) {
  /** @type {string[]} */
  const messages = []
  const packageJsonText = readFileSync(resolve(rootDir, 'package.json'), 'utf-8')
  if (/subset-font/.test(packageJsonText)) {
    messages.push('package.json still references "subset-font" — this devDependency was removed in 06a (T3.1) along with the font subset it generated')
  }
  if (/fontkit/.test(packageJsonText)) {
    messages.push('package.json still references "fontkit" — this devDependency was removed in 06a (T3.1) along with the font subset it generated')
  }
  return messages
}

// --- Orchestrator ------------------------------------------------------------

/**
 * Runs every check above, in the same order the pre-refactor monolithic
 * script ran them in, and returns the concatenated failure-message list. The
 * CLI shell (verify-dist.mjs) is a thin printer over this function's result.
 *
 * @param {string} distDir
 * @param {string} rootDir
 * @returns {string[]}
 */
export function runAllChecks(distDir, rootDir) {
  /** @type {string[]} */
  const messages = []

  messages.push(...checkToolPageSkeleton(distDir))

  const { content: rootHtml, missingMessage } = readDistFile(distDir, 'index.html')
  if (missingMessage !== null) {
    messages.push(missingMessage)
  }
  messages.push(...checkEntryInlineScripts(rootHtml))
  messages.push(...checkEntryAnchors(rootHtml))
  messages.push(...checkDanglingAnchors(rootHtml, distDir))

  messages.push(...checkFfmpegVendorAssets(distDir))
  messages.push(...checkStatuslineCssChunk(distDir))
  messages.push(...checkNerdFontRegression(distDir))
  messages.push(...checkPackageJsonFontDeps(rootDir))

  return messages
}
