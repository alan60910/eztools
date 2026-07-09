// Nerd Font subset 再生腳本（T1.6 / SP-1）— 手動開發工序，禁在 CI 執行。
// 來源：Symbols Nerd Font Mono（Nerd Fonts v3.4.0 release 資產，URL/sha256 皆釘死）。
// 凍結碼位表與授權盤點見 tools/statusline-builder/fonts/README.md；
// 本腳本內的 FROZEN_GLYPHS 為機械單一事實來源，README 表為其鏡像。
//
// 用法：
//   node scripts/subset-statusline-font.mjs            # 自動下載 zip（快取於 node_modules/.cache）
//   node scripts/subset-statusline-font.mjs --source <path-to-SymbolsNerdFontMono-Regular.ttf>
//
// zip 解壓依賴 bsdtar（Windows 10+ 內建 tar.exe、macOS 內建；GNU tar 不支援
// zip——Linux 請自行解壓後以 --source 指定 TTF）。
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';
import * as fontkit from 'fontkit';

const NF_VERSION = 'v3.4.0';
const ZIP_URL = `https://github.com/ryanoasis/nerd-fonts/releases/download/${NF_VERSION}/NerdFontsSymbolsOnly.zip`;
const ZIP_SHA256 = '8e617904b980fe3648a4b116808788fe50c99d2d495376cb7c0badbd8a564c47';
const TTF_NAME = 'SymbolsNerdFontMono-Regular.ttf';
const TTF_SHA256 = 'f0f624d9b474bea1662cf7e862d44aebe1ae1f6c7f9cb7a0ca5d0e5ac9561c60';
const SIZE_LIMIT_BYTES = 100 * 1024; // Conventions/verify-dist 上限

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_PATH = join(repoRoot, 'tools', 'statusline-builder', 'fonts', 'symbols-nerd-font-mono-subset.woff2');

// 凍結碼位表（28）：Powerline（MIT）×5 必要載重＋Octicons（MIT）×23 segment icon。
// 授權驅動選取記錄（剔除項與理由）見 fonts/README.md。
const FROZEN_GLYPHS = [
  // Powerline Symbols（powerline/powerline，MIT）
  { code: 0xe0a0, name: 'pl-branch' },              // git-branch icon（必要載重）
  { code: 0xe0b0, name: 'pl-left_hard_divider' },   // powerline 箭頭（必要載重）
  { code: 0xe0b1, name: 'pl-left_soft_divider' },
  { code: 0xe0b2, name: 'pl-right_hard_divider' },
  { code: 0xe0b3, name: 'pl-right_soft_divider' },
  // Octicons（primer/octicons，MIT）— segment icon 候選
  { code: 0xf4bc, name: 'oct-cpu' },                // model
  { code: 0xf413, name: 'oct-file_directory' },     // cwd
  { code: 0xf502, name: 'oct-project' },            // project-dir
  { code: 0xf48f, name: 'oct-paintbrush' },         // output-style
  { code: 0xf412, name: 'oct-tag' },                // version
  { code: 0xf439, name: 'oct-credit_card' },        // cost
  { code: 0xf520, name: 'oct-stopwatch' },          // duration
  { code: 0xf440, name: 'oct-diff' },               // lines-changed
  { code: 0xf472, name: 'oct-database' },           // context-size
  { code: 0xf400, name: 'oct-light_bulb' },         // thinking
  { code: 0xf463, name: 'oct-meter' },              // context-used / context-remaining
  { code: 0xf4e3, name: 'oct-hourglass' },          // rate-5h
  { code: 0xf455, name: 'oct-calendar' },           // rate-7d
  { code: 0xf461, name: 'oct-bookmark' },           // session-name
  { code: 0xf490, name: 'oct-flame' },              // effort
  { code: 0xf448, name: 'oct-pencil' },             // vim-mode
  { code: 0xf477, name: 'oct-hubot' },              // agent-name
  { code: 0xf407, name: 'oct-git_pull_request' },   // pr
  { code: 0xf401, name: 'oct-repo' },               // repo
  { code: 0xf414, name: 'oct-file_submodule' },     // git-worktree
  { code: 0xf418, name: 'oct-git_branch' },         // worktree-branch
  { code: 0xf43a, name: 'oct-clock' },              // clock
  { code: 0xf444, name: 'oct-dot_fill' },           // git-dirty
];

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

async function obtainSourceTtf() {
  const argIdx = process.argv.indexOf('--source');
  if (argIdx !== -1) {
    const p = process.argv[argIdx + 1];
    if (!p || !existsSync(p)) fail(`--source 路徑不存在：${p}`);
    return readFileSync(p);
  }
  const cacheDir = join(repoRoot, 'node_modules', '.cache', 'statusline-font');
  const zipPath = join(cacheDir, `NerdFontsSymbolsOnly-${NF_VERSION}.zip`);
  const ttfPath = join(cacheDir, TTF_NAME);
  mkdirSync(cacheDir, { recursive: true });
  if (!existsSync(ttfPath)) {
    if (!existsSync(zipPath)) {
      console.log(`downloading ${ZIP_URL}`);
      const res = await fetch(ZIP_URL);
      if (!res.ok) fail(`下載失敗：HTTP ${res.status}`);
      writeFileSync(zipPath, Buffer.from(await res.arrayBuffer()));
    }
    const zipHash = sha256(readFileSync(zipPath));
    if (zipHash !== ZIP_SHA256) fail(`zip sha256 不符：${zipHash}（預期 ${ZIP_SHA256}）`);
    execFileSync('tar', ['-xf', zipPath, '-C', cacheDir, TTF_NAME]);
  }
  return readFileSync(ttfPath);
}

const ttfBuf = await obtainSourceTtf();
const ttfHash = sha256(ttfBuf);
if (ttfHash !== TTF_SHA256) fail(`TTF sha256 不符：${ttfHash}（預期 ${TTF_SHA256}）`);
console.log(`source ok: ${TTF_NAME} sha256=${ttfHash}`);

// subset 前先驗來源含全部凍結碼位（缺字在源頭就報，不進 subset）
const srcFont = fontkit.create(ttfBuf);
const missingInSource = FROZEN_GLYPHS.filter(
  (g) => !srcFont.hasGlyphForCodePoint(g.code) || srcFont.glyphForCodePoint(g.code).id === 0,
);
if (missingInSource.length > 0) {
  fail(`來源字型缺碼位：${missingInSource.map((g) => `U+${g.code.toString(16).toUpperCase()} ${g.name}`).join(', ')}`);
}

const targetText = FROZEN_GLYPHS.map((g) => String.fromCodePoint(g.code)).join('');
const woff2 = await subsetFont(ttfBuf, targetText, { targetFormat: 'woff2' });

// 機械存在驗證：讀回 woff2，逐凍結碼位斷言 glyph 存在且非 .notdef。
// （代替視覺 smoke——瀏覽器實渲染歸 T4.4 使用者總 gate。）
const outFont = fontkit.create(woff2);
let allPresent = true;
for (const g of FROZEN_GLYPHS) {
  const has = outFont.hasGlyphForCodePoint(g.code) && outFont.glyphForCodePoint(g.code).id !== 0;
  console.log(`U+${g.code.toString(16).toUpperCase().padStart(4, '0')} ${g.name.padEnd(22)} ${has ? 'OK' : 'MISSING'}`);
  if (!has) allPresent = false;
}
if (!allPresent) fail('subset 後有碼位缺 glyph');
if (woff2.length >= SIZE_LIMIT_BYTES) fail(`woff2 ${woff2.length} bytes ≥ 上限 ${SIZE_LIMIT_BYTES}`);

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, woff2);
console.log(`written: ${OUT_PATH}`);
console.log(`glyphs=${FROZEN_GLYPHS.length} size=${woff2.length} bytes (<${SIZE_LIMIT_BYTES}) sha256=${sha256(woff2)}`);
