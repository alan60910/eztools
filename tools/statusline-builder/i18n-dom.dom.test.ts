// @vitest-environment jsdom
/**
 * T5.4（magi/09-statusline-ux-refactor/PLAN.md §D5 A-1／A-3／A-4；
 * TASKS.md T5.4）：i18n-dom.ts 回歸網。
 *
 * 三組案（比照既有 dom.test 慣例分組）：
 * 1. `applyI18n` 純函式套用器——不需整頁 boot，直接對手造 DOM 片段驗證
 *    `data-i18n`／`data-i18n-attr` 兩種標記格式（含壞鍵防禦）。
 * 2. `currentLocale`／`setLocale`——localStorage 持久化＋`<html lang>`
 *    同步＋壞值退場＋best-effort（storage 拋錯不阻斷）。
 * 3. clone 時序＋整頁切換——沿用 bar-toggle.dom.test.ts／skip-nav.dom.
 *    test.ts 先例的「先以 jsdom 剖析真實 index.html 取得 `<body>`，動態
 *    import main.ts 觸發其 init()」全頁面整合測試形：驗證四個 clone 點
 *    之一（`buildThresholdEditor`／`createColorPickerCore`）的示範面
 *    文案（閾值 6 模板名／ANSI 索引 label／索引加減鈕 aria-label）在
 *    zh-Hant 開機時與現行字面 byte 一致、持久化 en 時開機即以 en 呈現、
 *    語言鈕 click 後既有已渲染實例當場翻轉，以及 main.ts
 *    `t(currentLocale()).thresholdTemplateLabel` 動態組句（取代原
 *    `THRESHOLD_TEMPLATE_LABELS` 常數表）確實跟隨當下語言。
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { t, type Locale } from './messages.js'
import { LANG_STORAGE_KEY, applyI18n, currentLocale, setLocale } from './i18n-dom.js'

const HTML_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'index.html')
const RAW_HTML = readFileSync(HTML_PATH, 'utf-8')
const BODY_MATCH = /<body[^>]*>([\s\S]*)<\/body>/.exec(RAW_HTML)
if (BODY_MATCH === null) throw new Error('index.html 缺少 <body>，無法取得測試骨架')
const BODY_HTML = BODY_MATCH[1]

/**
 * 清空 localStorage（可選預先寫入語言，模擬使用者上次工作階段已切換
 * 過）＋重灌乾淨 DOM＋重置模組快取後啟動 main.ts（同既有 dom.test 慣例，
 * 見 skip-nav.dom.test.ts 檔頭）。
 */
async function boot(presetLocale?: Locale): Promise<void> {
  localStorage.clear()
  if (presetLocale !== undefined) localStorage.setItem(LANG_STORAGE_KEY, presetLocale)
  document.body.innerHTML = BODY_HTML
  vi.resetModules()
  await import('./main.js')
}

function langToggleBtn(): HTMLButtonElement {
  return document.querySelector('.lang-toggle') as HTMLButtonElement
}

function thresholdOptionText(templateId: string): string | null {
  const el = document.querySelector(
    `[data-segment-id="context-used"] select.threshold__template option[value="${templateId}"]`,
  )
  return el === null ? null : el.textContent
}

function ansiIndexLabelText(): string | null {
  const el = document.querySelector('[data-segment-id="cwd"] .color-spinbutton-field__label')
  return el === null ? null : el.textContent
}

function ansiDecAriaLabel(): string | null {
  return document.querySelector('[data-segment-id="cwd"] .color-spinbutton__dec')?.getAttribute('aria-label') ?? null
}

function ansiIncAriaLabel(): string | null {
  return document.querySelector('[data-segment-id="cwd"] .color-spinbutton__inc')?.getAttribute('aria-label') ?? null
}

function enableSegment(id: string): void {
  const checkbox = document.getElementById(`${id}-catalog`) as HTMLInputElement | null
  if (checkbox === null) throw new Error(`missing catalog checkbox for ${id}`)
  checkbox.click()
}

function barCheckbox(id: string): HTMLInputElement {
  const el = document.getElementById(`${id}-bar`) as HTMLInputElement | null
  if (el === null) throw new Error(`missing bar checkbox for ${id}`)
  return el
}

function liveStatus(): string {
  return document.getElementById('global-live-status')!.textContent ?? ''
}

// ── 1. applyI18n：純函式套用器（不需整頁 boot） ──

describe('applyI18n：data-i18n／data-i18n-attr 套用（兩語言）', () => {
  it('data-i18n：textContent 依 locale 改寫', () => {
    const div = document.createElement('div')
    div.innerHTML = '<span data-i18n="colorPicker.ansiIndexLabel">佔位</span>'
    applyI18n(div, 'zh-Hant')
    expect(div.querySelector('span')!.textContent).toBe(t('zh-Hant').colorPicker.ansiIndexLabel)
    applyI18n(div, 'en')
    expect(div.querySelector('span')!.textContent).toBe(t('en').colorPicker.ansiIndexLabel)
  })

  it('data-i18n-attr：屬性依 locale 改寫，不動 textContent／子節點', () => {
    const div = document.createElement('div')
    div.innerHTML = '<button data-i18n-attr="aria-label:colorPicker.indexIncrement"><span aria-hidden="true">＋</span></button>'
    const btn = div.querySelector('button')!
    applyI18n(div, 'zh-Hant')
    expect(btn.getAttribute('aria-label')).toBe(t('zh-Hant').colorPicker.indexIncrement)
    expect(btn.querySelector('span')).not.toBeNull() // 子節點未被清掉。
    applyI18n(div, 'en')
    expect(btn.getAttribute('aria-label')).toBe(t('en').colorPicker.indexIncrement)
  })

  it('data-i18n-attr：分號分隔多組屬性同時改寫', () => {
    const div = document.createElement('div')
    div.innerHTML = '<button data-i18n-attr="aria-label:langToggle.ariaLabel;title:langToggle.shortLabel"></button>'
    applyI18n(div, 'en')
    const btn = div.querySelector('button')!
    expect(btn.getAttribute('aria-label')).toBe(t('en').langToggle.ariaLabel)
    expect(btn.getAttribute('title')).toBe(t('en').langToggle.shortLabel)
  })

  it('root 自身若符合 selector 亦套用（非僅子孫節點）', () => {
    const span = document.createElement('span')
    span.dataset.i18n = 'langToggle.shortLabel'
    span.textContent = '佔位'
    applyI18n(span, 'en')
    expect(span.textContent).toBe(t('en').langToggle.shortLabel)
  })

  it('data-i18n 鍵路徑無法解析（不存在／終值非字串）：不改動 textContent、console.warn 一次', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const div = document.createElement('div')
    div.innerHTML = '<span data-i18n="doesNotExist.foo">原字面</span><span data-i18n="segments">另一原字面</span>'
    applyI18n(div, 'zh-Hant')
    const spans = div.querySelectorAll('span')
    expect(spans[0].textContent).toBe('原字面') // 路徑不存在。
    expect(spans[1].textContent).toBe('另一原字面') // 終值是物件（非字串）。
    expect(warn).toHaveBeenCalledTimes(2)
    warn.mockRestore()
  })

  it('data-i18n-attr 格式不合法（缺冒號）：不設屬性、console.warn 一次', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const div = document.createElement('div')
    div.innerHTML = '<button data-i18n-attr="aria-label-no-colon">＋</button>'
    applyI18n(div, 'zh-Hant')
    expect(div.querySelector('button')!.hasAttribute('aria-label')).toBe(false)
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })
})

// ── 2. currentLocale／setLocale：localStorage 持久化＋<html lang> 同步 ──

describe('currentLocale／setLocale：持久化＋<html lang> 同步＋best-effort', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('lang')
  })

  it('未設定 → DEFAULT_LOCALE（zh-Hant）', () => {
    expect(currentLocale()).toBe('zh-Hant')
  })

  it('壞值（非 zh-Hant/en）→ 退 DEFAULT_LOCALE', () => {
    localStorage.setItem(LANG_STORAGE_KEY, 'fr')
    expect(currentLocale()).toBe('zh-Hant')
  })

  it('setLocale(en) → localStorage 正確寫入 key＋currentLocale 讀回 en', () => {
    setLocale('en')
    expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe('en')
    expect(currentLocale()).toBe('en')
  })

  it('setLocale → <html lang> 同步（zh-Hant／en 皆驗）', () => {
    setLocale('en')
    expect(document.documentElement.getAttribute('lang')).toBe('en')
    setLocale('zh-Hant')
    expect(document.documentElement.getAttribute('lang')).toBe('zh-Hant')
  })

  it('localStorage.getItem 拋錯（如無痕模式封鎖）→ currentLocale 靜默退 DEFAULT_LOCALE', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(currentLocale()).toBe('zh-Hant')
    spy.mockRestore()
  })

  it('localStorage.setItem 拋錯 → setLocale 不拋出、仍同步 <html lang>（best-effort）', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(() => setLocale('en')).not.toThrow()
    expect(document.documentElement.getAttribute('lang')).toBe('en')
    spy.mockRestore()
  })
})

// ── 3. clone 時序＋整頁切換（真實 index.html＋main.ts boot） ──

describe('T5.4 clone 時序：閾值模板 6 選項名／color-picker 示範文案', () => {
  it('zh-Hant（預設）boot：與現行字面 byte 一致', async () => {
    await boot()
    expect(thresholdOptionText('traffic')).toBe('交通號誌（綠→黃→紅）')
    expect(thresholdOptionText('traffic-inv')).toBe('反向交通號誌（紅→綠）')
    expect(thresholdOptionText('cool-warm')).toBe('冷暖（藍→紅）')
    expect(thresholdOptionText('mono-fade')).toBe('單色漸亮')
    expect(thresholdOptionText('limit-gradient')).toBe('限額漸層（按用量）')
    expect(thresholdOptionText('remaining-gradient')).toBe('剩餘漸層（逆序）')
    expect(ansiIndexLabelText()).toBe('ANSI 索引（0–255）')
    expect(ansiDecAriaLabel()).toBe('索引減 1')
    expect(ansiIncAriaLabel()).toBe('索引加 1')
    expect(document.documentElement.getAttribute('lang')).toBe('zh-Hant')
  })

  it('持久化 en：boot 即以 en 呈現（新 clone 實例用新語言，不需先手動切換）', async () => {
    await boot('en')
    expect(document.documentElement.getAttribute('lang')).toBe('en')
    expect(thresholdOptionText('traffic')).toBe(t('en').thresholdTemplateLabel.traffic)
    expect(thresholdOptionText('remaining-gradient')).toBe(t('en').thresholdTemplateLabel['remaining-gradient'])
    expect(ansiIndexLabelText()).toBe(t('en').colorPicker.ansiIndexLabel)
    expect(ansiDecAriaLabel()).toBe(t('en').colorPicker.indexDecrement)
    expect(ansiIncAriaLabel()).toBe(t('en').colorPicker.indexIncrement)
  })
})

describe('T5.4 語言切換鈕：初始態＋click 生效＋既有實例翻轉', () => {
  it('zh-Hant boot：按鈕顯示目標語言短碼「EN」＋可及名稱', async () => {
    await boot()
    expect(langToggleBtn().textContent).toBe(t('zh-Hant').langToggle.shortLabel)
    expect(langToggleBtn().getAttribute('aria-label')).toBe(t('zh-Hant').langToggle.ariaLabel)
  })

  it('click → localStorage／<html lang> 翻轉＋既有已渲染實例（閾值模板／色選文案）當場翻為 en', async () => {
    await boot()
    langToggleBtn().click()
    expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe('en')
    expect(document.documentElement.getAttribute('lang')).toBe('en')
    expect(thresholdOptionText('traffic')).toBe(t('en').thresholdTemplateLabel.traffic)
    expect(ansiIndexLabelText()).toBe(t('en').colorPicker.ansiIndexLabel)
    expect(ansiIncAriaLabel()).toBe(t('en').colorPicker.indexIncrement)
    expect(langToggleBtn().textContent).toBe(t('en').langToggle.shortLabel)
    expect(langToggleBtn().getAttribute('aria-label')).toBe(t('en').langToggle.ariaLabel)
  })

  // 工作項 4（magi/12-hygiene-tail sprint 12 review 裁決）：本案偶發 flake，
  // 加顯式 timeout 緩解（vitest it 第三參數）；僅此一案，不動其餘案例。
  it(
    '再次 click → 切回 zh-Hant，字面與開機字面 byte 一致',
    async () => {
      await boot()
      langToggleBtn().click()
      langToggleBtn().click()
      expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe('zh-Hant')
      expect(document.documentElement.getAttribute('lang')).toBe('zh-Hant')
      expect(thresholdOptionText('traffic')).toBe('交通號誌（綠→黃→紅）')
      expect(ansiIndexLabelText()).toBe('ANSI 索引（0–255）')
      expect(langToggleBtn().textContent).toBe('EN')
    },
    20000,
  )
})

describe('T5.4：main.ts 動態組句改查 t(currentLocale()) 取代原 THRESHOLD_TEMPLATE_LABELS 常數表', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('zh-Hant：bar 切開播報句與既有字面一致（回歸，同 bar-toggle.dom.test.ts 既定案）', async () => {
    await boot()
    enableSegment('context-used')
    barCheckbox('context-used').click()
    expect(liveStatus()).toBe('「上下文已用」已開啟長條圖，套用預設閾值模板「限額漸層（按用量）」')
  })

  it('切至 en 後才切開 bar：播報句內模板名稱以 en 字典組成（即時求值跟隨當下語言）', async () => {
    await boot()
    langToggleBtn().click() // → en
    enableSegment('context-used')
    barCheckbox('context-used').click()
    // 播報句形本身（「已開啟長條圖，套用預設閾值模板」等固定用語）仍是
    // main.ts 尚未遷移的硬編中文字面，其 en 化屬 T5.5 範圍——本案僅驗證
    // 模板名稱這段確實改查 t(currentLocale()).thresholdTemplateLabel、
    // 不再是刪除掉的 THRESHOLD_TEMPLATE_LABELS 中文常數值。
    expect(liveStatus()).toContain(t('en').thresholdTemplateLabel['limit-gradient'])
    expect(liveStatus()).not.toContain('限額漸層')
  })
})
