/**
 * S5-T3.2／S6-T3.2：render-preview.ts 的純函式接縫測試（DOM-free，node 環境）。
 * DOM 組裝（renderRuns／createPreview 等 browser-only 面）不在 node 測試範圍
 * （PLAN：browser-only DOM 模組不強制 node 測試；視覺實渲染歸 T4.4 SP-3）。
 */
import { describe, expect, it } from 'vitest'
import { colorSpecToHex, type ColorSpec } from './color.js'
import { POWERLINE_ARROW, type StyledRun } from './resolve.js'
import {
  PREVIEW_ARROW_CLASS,
  PREVIEW_THEME_CLASSES,
  runInlineColors,
  runRenderSpec,
  themeModifierClass,
} from './render-preview.js'

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

describe('runRenderSpec', () => {
  it('一般文字 run → kind:"text"，text 保留、fg/bg 依 runInlineColors 掛色', () => {
    const run: StyledRun = {
      text: 'Sonnet 5',
      fg: { kind: 'truecolor', hex: '#abcdef' },
      bg: { kind: 'truecolor', hex: '#123456' },
    }
    expect(runRenderSpec(run)).toEqual({
      kind: 'text',
      text: 'Sonnet 5',
      color: '#abcdef',
      backgroundColor: '#123456',
    })
  })

  it('分隔符等裝飾文字 run（非箭頭字元）仍走 text 分支', () => {
    expect(runRenderSpec({ text: '|', ariaText: '' })).toEqual({
      kind: 'text',
      text: '|',
      color: null,
      backgroundColor: null,
    })
  })

  it('箭頭 run（text===POWERLINE_ARROW）→ kind:"arrow"，回傳形無 text 欄位（不落 PUA 文字節點）', () => {
    const run: StyledRun = {
      text: POWERLINE_ARROW,
      ariaText: '',
      fg: { kind: 'truecolor', hex: '#112233' },
      bg: { kind: 'truecolor', hex: '#445566' },
    }
    const spec = runRenderSpec(run)
    expect(spec).toEqual({ kind: 'arrow', background: '#445566', arrowFg: '#112233' })
    expect(spec).not.toHaveProperty('text')
  })

  it('箭頭三角形本體色＝run.fg（掛 --arrow-fg，非一般文字的 color）', () => {
    const fg: ColorSpec = { kind: 'ansi256', index: 226 }
    const spec = runRenderSpec({ text: POWERLINE_ARROW, ariaText: '', fg })
    expect(spec).toEqual({ kind: 'arrow', background: null, arrowFg: colorSpecToHex(fg) })
  })

  it('cap 箭頭（無 bg）→ background=null（透明，退回終端底色）', () => {
    const run: StyledRun = { text: POWERLINE_ARROW, ariaText: '', fg: { kind: 'ansi256', index: 16 } }
    expect(runRenderSpec(run)).toEqual({ kind: 'arrow', background: null, arrowFg: colorSpecToHex(run.fg!) })
  })

  it('箭頭 run 缺 fg/bg → 兩者皆 null（不著色三角形亦合法，如 default 色鏈）', () => {
    expect(runRenderSpec({ text: POWERLINE_ARROW, ariaText: '' })).toEqual({
      kind: 'arrow',
      background: null,
      arrowFg: null,
    })
  })
})

describe('PREVIEW_ARROW_CLASS', () => {
  it('為 style.css 三角形容器的 class 名（.preview-terminal 命名空間下）', () => {
    expect(PREVIEW_ARROW_CLASS).toBe('preview-terminal__arrow')
  })
})
