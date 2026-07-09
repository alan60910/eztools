/**
 * S5-T3.2：render-preview.ts 的純函式接縫測試（DOM-free，node 環境）。
 * DOM 組裝（renderRuns／createPreview 等 browser-only 面）不在 node 測試範圍
 * （PLAN：browser-only DOM 模組不強制 node 測試；視覺實渲染歸 T4.4 SP-3）。
 * 匯入本模組會觸發 `import './preview-font.css'`——vitest node 環境回空模組，
 * 不影響純函式；此測試存在本身即證匯入不炸。
 */
import { describe, expect, it } from 'vitest'
import { colorSpecToHex, type ColorSpec } from './color.js'
import type { BuilderConfig, SegmentConfig } from './config.js'
import type { StyledRun } from './resolve.js'
import {
  needsNerdFont,
  PREVIEW_THEME_CLASSES,
  runInlineColors,
  themeModifierClass,
} from './render-preview.js'

function seg(overrides: Partial<SegmentConfig> & Pick<SegmentConfig, 'id'>): SegmentConfig {
  return { enabled: false, icon: false, color: { kind: 'default' }, ...overrides }
}

function config(overrides: Partial<BuilderConfig> = {}): BuilderConfig {
  return {
    version: 1,
    mode: 'plain',
    separator: { kind: 'preset', value: '|' },
    lastArrowCap: true,
    segments: [],
    ...overrides,
  }
}

describe('needsNerdFont', () => {
  it('powerline 模式恆需字型（箭頭為 PUA glyph），與 icon 無關', () => {
    expect(needsNerdFont(config({ mode: 'powerline', segments: [] }))).toBe(true)
    expect(
      needsNerdFont(config({ mode: 'powerline', segments: [seg({ id: 'model', enabled: true })] })),
    ).toBe(true)
  })

  it('plain 模式：有啟用且開 icon 的段 → 需字型', () => {
    expect(
      needsNerdFont(config({ segments: [seg({ id: 'model', enabled: true, icon: true })] })),
    ).toBe(true)
  })

  it('plain 模式：icon 開但段未啟用 → 不需（停用段不計）', () => {
    expect(
      needsNerdFont(config({ segments: [seg({ id: 'model', enabled: false, icon: true })] })),
    ).toBe(false)
  })

  it('plain 模式：段啟用但無 icon → 不需', () => {
    expect(
      needsNerdFont(config({ segments: [seg({ id: 'model', enabled: true, icon: false })] })),
    ).toBe(false)
  })

  it('plain 模式：無段 → 不需', () => {
    expect(needsNerdFont(config({ segments: [] }))).toBe(false)
  })
})

describe('runInlineColors', () => {
  it('fg → color、bg → backgroundColor（truecolor 直取 hex）', () => {
    const run: StyledRun = {
      text: 'x',
      fg: { kind: 'truecolor', hex: '#abcdef' },
      bg: { kind: 'truecolor', hex: '#123456' },
    }
    expect(runInlineColors(run)).toEqual({ color: '#abcdef', backgroundColor: '#123456' })
  })

  it('ansi256 經 color.ts 對照表轉 hex', () => {
    const fg: ColorSpec = { kind: 'ansi256', index: 196 }
    expect(runInlineColors({ text: 'x', fg })).toEqual({
      color: colorSpecToHex(fg),
      backgroundColor: null,
    })
  })

  it('fg/bg 缺席 → 皆 null（不落屬性、沿用基底）', () => {
    expect(runInlineColors({ text: 'x' })).toEqual({ color: null, backgroundColor: null })
  })

  it('default 色 → null（colorSpecToHex(default)=null，等同不著色）', () => {
    expect(runInlineColors({ text: 'x', fg: { kind: 'default' } })).toEqual({
      color: null,
      backgroundColor: null,
    })
  })
})

describe('themeModifierClass', () => {
  it('對齊 T3.1 index.html 的 preview-terminal--dark/--light modifier', () => {
    expect(themeModifierClass('dark')).toBe('preview-terminal--dark')
    expect(themeModifierClass('light')).toBe('preview-terminal--light')
  })

  it('兩主題 class 相異且與常數表一致', () => {
    expect(themeModifierClass('dark')).not.toBe(themeModifierClass('light'))
    expect(themeModifierClass('dark')).toBe(PREVIEW_THEME_CLASSES.dark)
    expect(themeModifierClass('light')).toBe(PREVIEW_THEME_CLASSES.light)
  })
})
