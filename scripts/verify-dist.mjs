#!/usr/bin/env node
/**
 * Post-build guard, run after `npm run build` (see package.json's
 * `verify:dist` script and .github/workflows/deploy.yml).
 *
 * Checks:
 *  - dist/tools/apng-to-gif/index.html carries the a11y/SEO baseline
 *    (<main>, meta description, lang="zh-Hant") required of every tool page.
 *  - dist/index.html stays script-free (the "static-first" entry-page
 *    invariant) while linking out to the now-available apng-to-gif tool.
 *
 * Plain node, no dependencies. Exits 1 with a clear message per failure.
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const distDir = resolve(import.meta.dirname, '..', 'dist')

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

const toolHtml = readDistFile('tools/apng-to-gif/index.html')
if (toolHtml !== null) {
  if (!/<main[\s>]/.test(toolHtml)) {
    fail('dist/tools/apng-to-gif/index.html has no <main> element')
  }
  if (!/<meta[^>]*name="description"/.test(toolHtml)) {
    fail('dist/tools/apng-to-gif/index.html has no <meta name="description">')
  }
  if (!/lang="zh-Hant"/.test(toolHtml)) {
    fail('dist/tools/apng-to-gif/index.html is missing lang="zh-Hant"')
  }
}

const rootHtml = readDistFile('index.html')
if (rootHtml !== null) {
  if (/<script/.test(rootHtml)) {
    fail('dist/index.html contains <script> — the entry page must stay zero-JS')
  }
  if (!/<a[^>]*href="\.\/tools\/apng-to-gif\/"/.test(rootHtml)) {
    fail('dist/index.html has no <a href="./tools/apng-to-gif/"> — the entry card did not turn into a link')
  }
}

if (failed) {
  console.error('verify:dist: one or more checks failed (see above)')
  process.exit(1)
}

console.log('verify:dist: all checks passed')
