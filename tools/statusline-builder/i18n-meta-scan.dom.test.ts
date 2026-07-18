// @vitest-environment jsdom
/**
 * T5.5（magi/09-statusline-ux-refactor/PLAN.md §D5 D5「靜態掃描 meta 案」）：
 * 防回歸長期網——斷言 main.ts 執行期原始碼與 index.html 主文件樹靜態文案
 * **無殘留硬編中文**，全數已收進 messages.ts 字典（走 `t(currentLocale())`
 * 或 `data-i18n`／`data-i18n-attr`）。此案不驗行為、只驗「文案來源單一化」
 * 的機械不變量：任一新硬編中文樣板混入即紅。
 *
 * ── main.ts 掃描（grep 級原始碼掃描）──
 * 合理排除（文件化）：
 * 1. 註解（block `/* *​/` 含 JSDoc／line `//`）——非執行期輸出。
 * 2. `throw new Error(...)`——DOM 結構不變量的開發者面錯誤（如「缺少必要
 *    節點 #x」），永不作為 UI 呈現、使用者不可見，比照 console 排除；
 *    翻譯它對使用者零價值。
 * 3. messages.ts 字典引用（`msg().*`／`segLabel(...)`／`t(...)`）本就無中文
 *    字面，天然不觸發。
 * 偵測範圍＝CJK 統一表意文字（U+4E00–9FFF）＋CJK 符號（U+3000–303F，
 * 含「」）＋全形標點（U+FF00–FFEF，含（）＋，：）。半形符號／`—`／`↺`／
 * `→`／`–`／`≤`／`⠿` 等非中文符號不列入（它們非「文案」）。
 *
 * ── index.html 掃描（DOM 級文字節點掃描）──
 * 以 jsdom 解析 index.html，走訪主文件樹文字節點，任一含 CJK 的文字節點
 * 必須落在下列合法容器之一，否則即紅：
 * 1. 帶 `data-i18n` 的元素子樹（其初始 zh 內文＝字典值，開機 applyI18n
 *    覆寫）——合法。
 * 2. `<template>` 內文（clone 點 applyI18n 覆寫；其標記另由本工具實際
 *    渲染路徑覆蓋，非本掃描責任）。
 * 3. `<head>`（`<title>`／meta／FOUC script／style——文件 metadata，
 *    非本工具 i18n 面）。
 * 4. `<footer>`（全站共用五頁一致 chrome，維持 zh，見 T5.5-report）。
 * 5. `.theme-toggle`（可及名稱由共用 src/theme.ts 硬編 zh「深色模式切換」
 *    ——site chrome，見 T5.5-report）。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { t } from './messages.js'
import { applyI18n } from './i18n-dom.js'

// vitest 自 repo 根執行（cwd＝專案根）；jsdom 環境下 import.meta.url 非 file
// scheme，故以 cwd 相對路徑取檔（穩定、與環境無關）。
const DIR = resolve(process.cwd(), 'tools/statusline-builder')
const mainSrc = readFileSync(resolve(DIR, 'main.ts'), 'utf8')
const indexHtml = readFileSync(resolve(DIR, 'index.html'), 'utf8')

/** CJK 表意文字＋CJK 符號＋全形標點（＝中文「文案」偵測範圍，見檔頭）。 */
const CJK = /[　-〿一-鿿＀-￯]/

/**
 * 剝除 main.ts 的非執行期文字（block／line 註解、throw Error 開發者不變量），
 * 以行為單位保留（throw 行整行清空，維持行號可讀）——block 註解跨行移除
 * 會壓縮行號，故回報以「行內容」為準，非行號。
 */
function stripNonRuntime(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '') // block／JSDoc 註解
    .split('\n')
    .map((line) => {
      if (/throw new Error\(/.test(line)) return '' // 開發者不變量錯誤（見檔頭排除 2）
      return line.replace(/\/\/.*$/, '') // line 註解
    })
    .join('\n')
}

describe('T5.5 靜態掃描：main.ts 執行期無殘留硬編中文', () => {
  it('剝除註解／throw-Error 後的原始碼不含任何 CJK 文案', () => {
    const offenders = stripNonRuntime(mainSrc)
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => CJK.test(line))
    expect(offenders).toEqual([])
  })
})

describe('T5.5 靜態掃描：index.html 主文件樹靜態文案皆 data-i18n 化', () => {
  const doc = new DOMParser().parseFromString(indexHtml, 'text/html')

  /** 該文字節點是否落在合法（免掃描）容器：data-i18n 子樹／template／head／footer／theme-toggle。 */
  function inAllowedContainer(node: Node): boolean {
    let el: Element | null = node.parentElement
    while (el !== null) {
      const tag = el.tagName.toLowerCase()
      if (tag === 'template' || tag === 'head' || tag === 'footer') return true
      if (el.hasAttribute('data-i18n')) return true
      if (el.classList.contains('theme-toggle')) return true
      el = el.parentElement
    }
    return false
  }

  it('body 內每個含 CJK 的文字節點皆在 data-i18n／template／footer／head／theme-toggle 之下', () => {
    const walker = doc.createTreeWalker(doc.documentElement, 4 /* SHOW_TEXT */)
    const offenders: string[] = []
    let node = walker.nextNode()
    while (node !== null) {
      const text = node.textContent ?? ''
      if (CJK.test(text) && !inAllowedContainer(node)) {
        offenders.push(text.trim().slice(0, 60))
      }
      node = walker.nextNode()
    }
    expect(offenders).toEqual([])
  })
})

/**
 * T5.5 en 面向抽查（非 T5.6 三面向全量翻轉）：驗「切 en 後關鍵位確實翻轉」
 * ——(1) index.html 主文件樹靜態文案經 applyI18n(doc,'en') 翻為 en；
 * (2) 常數表遷移後的字典函式（variantLabel／validation.fieldReject）en 輸出
 * 正確。完整三面向（靜態＋動態組句＋預覽 aria）翻轉屬 T5.6。
 */
describe('T5.5 en 抽查：關鍵位切 en 翻轉', () => {
  it('index.html 靜態標題／控件文案經 applyI18n(doc, en) 翻為 en', () => {
    const doc = new DOMParser().parseFromString(indexHtml, 'text/html')
    applyI18n(doc, 'en')
    expect(doc.querySelector('#global-heading')?.textContent).toBe('Global settings')
    expect(doc.querySelector('#preview-heading')?.textContent).toBe('Live preview')
    // data-i18n-attr（aria-label）亦翻轉。
    expect(doc.querySelector('.lang-toggle')?.getAttribute('aria-label')).toBe('Switch to Chinese interface')
    expect(doc.querySelector('h1')?.textContent).toBe('Claude Code Statusline Generator')
    expect(CJK.test(doc.querySelector('#global-heading')?.textContent ?? '')).toBe(false)
  })

  it('常數表遷移後的字典函式 en 輸出正確（variantLabel／fieldReject／announce）', () => {
    const en = t('en')
    expect(en.variantLabel.full).toBe('Full path')
    expect(en.variantLabel['percent-reset']).toBe('Percentage + reset time')
    expect(en.validation.fieldReject('prefix', 'newline')).toBe('Prefix must not contain newline characters')
    expect(en.validation.fieldReject('separator', 'too-long')).toBe('Separator must not exceed 8 characters')
    expect(en.announce.barOnKeepCustom('Context used')).toBe(
      '"Context used" bar chart enabled; existing custom threshold colors kept',
    )
    expect(en.rowGroup.heading(3)).toBe('Row 3')
    expect(en.defaultHint('Full path')).toBe('(default: Full path)')
  })
})
