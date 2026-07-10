/**
 * T4.2 單元測試（magi/06-statusline-ui-refresh/PLAN.md §D4）。
 *
 * 本專案 vitest 無 jsdom：`document`／`localStorage`／`window` 一律以
 * `vi.stubGlobal` 換成陽春假物件，驗證 theme.ts 對這些全域的「惰性存取」
 * 設計（模組頂層不碰任何全域，只在函式內部參照）。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  applyTheme,
  getEffectiveTheme,
  getStoredTheme,
  initThemeToggle,
  THEME_STORAGE_KEY,
  toggleTheme,
  type Theme,
} from './theme.js'

// ── 假 localStorage：Map 後端，getItem/setItem 皆可選擇性拋錯以模擬無痕模式 ──
function createFakeStorage(
  initial: Record<string, string> = {},
  options: { throwOnGet?: boolean; throwOnSet?: boolean } = {},
): Storage {
  const store = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => {
      if (options.throwOnGet) throw new Error('storage 被封鎖（模擬無痕模式）')
      return store.has(key) ? (store.get(key) as string) : null
    },
    setItem: (key: string, value: string) => {
      if (options.throwOnSet) throw new Error('storage 被封鎖（模擬無痕模式）')
      store.set(key, value)
    },
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size
    },
  } as Storage
}

// ── 假 window：只需要 matchMedia，回傳固定的 matches 布林值 ──
function createFakeWindow(matches: boolean): Window & typeof globalThis {
  return {
    matchMedia: (_query: string) => ({ matches }) as MediaQueryList,
  } as unknown as Window & typeof globalThis
}

// ── 假 DOM element：涵蓋 theme.ts 需要的最小介面 ──
class FakeElement {
  private attrs = new Map<string, string>()
  private listeners = new Map<string, Array<() => void>>()

  setAttribute(name: string, value: string): void {
    this.attrs.set(name, value)
  }
  getAttribute(name: string): string | null {
    return this.attrs.get(name) ?? null
  }
  removeAttribute(name: string): void {
    this.attrs.delete(name)
  }
  addEventListener(type: string, listener: () => void): void {
    const list = this.listeners.get(type) ?? []
    list.push(listener)
    this.listeners.set(type, list)
  }
  dispatch(type: string): void {
    for (const listener of this.listeners.get(type) ?? []) listener()
  }
}

function createFakeDocument(root: FakeElement): Document {
  return { documentElement: root } as unknown as Document
}

/** 一次備妥 storage/window/document 三個全域 stub 的便利函式。 */
function stubEnvironment(options: {
  stored?: Record<string, string>
  storageThrows?: { onGet?: boolean; onSet?: boolean }
  systemPrefersDark?: boolean
} = {}): { root: FakeElement } {
  const storage = createFakeStorage(options.stored ?? {}, {
    throwOnGet: options.storageThrows?.onGet,
    throwOnSet: options.storageThrows?.onSet,
  })
  vi.stubGlobal('localStorage', storage)
  vi.stubGlobal('window', createFakeWindow(options.systemPrefersDark ?? false))

  const root = new FakeElement()
  vi.stubGlobal('document', createFakeDocument(root))

  return { root }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getStoredTheme / getEffectiveTheme — 優先次序：localStorage ＞ 系統 ＞ 淺色', () => {
  it('localStorage 有 dark → 有效主題 dark，即使系統偏好淺色', () => {
    stubEnvironment({ stored: { [THEME_STORAGE_KEY]: 'dark' }, systemPrefersDark: false })
    expect(getStoredTheme()).toBe('dark')
    expect(getEffectiveTheme()).toBe('dark')
  })

  it('localStorage 有 light → 有效主題 light，即使系統偏好深色', () => {
    stubEnvironment({ stored: { [THEME_STORAGE_KEY]: 'light' }, systemPrefersDark: true })
    expect(getStoredTheme()).toBe('light')
    expect(getEffectiveTheme()).toBe('light')
  })

  it('localStorage 未設定、系統偏好深色 → 有效主題 dark', () => {
    stubEnvironment({ systemPrefersDark: true })
    expect(getStoredTheme()).toBeNull()
    expect(getEffectiveTheme()).toBe('dark')
  })

  it('localStorage 未設定、系統偏好淺色 → 有效主題 light（淺色預設）', () => {
    stubEnvironment({ systemPrefersDark: false })
    expect(getStoredTheme()).toBeNull()
    expect(getEffectiveTheme()).toBe('light')
  })

  it('localStorage 存有非法值（損壞存檔）→ 視為未設定，落到系統偏好', () => {
    stubEnvironment({ stored: { [THEME_STORAGE_KEY]: 'blue' }, systemPrefersDark: true })
    expect(getStoredTheme()).toBeNull()
    expect(getEffectiveTheme()).toBe('dark')
  })
})

describe('storage 例外韌性（無痕模式等環境 getItem/setItem 拋錯）', () => {
  it('getItem 拋錯 → getStoredTheme 回傳 null（不冒出例外）', () => {
    stubEnvironment({ storageThrows: { onGet: true }, systemPrefersDark: true })
    expect(getStoredTheme()).toBeNull()
    expect(getEffectiveTheme()).toBe('dark')
  })

  it('setItem 拋錯 → toggleTheme 仍回傳並套用新主題（persist 失敗不阻斷本次切換）', () => {
    const { root } = stubEnvironment({ systemPrefersDark: false, storageThrows: { onSet: true } })
    const result = toggleTheme()
    expect(result).toBe('dark')
    expect(root.getAttribute('data-theme')).toBe('dark')
  })
})

describe('applyTheme — 設定／移除 data-theme，冪等', () => {
  it('theme 為具體值 → 設定 data-theme', () => {
    const { root } = stubEnvironment()
    applyTheme('dark')
    expect(root.getAttribute('data-theme')).toBe('dark')
  })

  it('theme 為 null → 移除 data-theme', () => {
    const { root } = stubEnvironment()
    applyTheme('dark')
    applyTheme(null)
    expect(root.getAttribute('data-theme')).toBeNull()
  })

  it('重複套用同一值為冪等操作（多次呼叫結果相同）', () => {
    const { root } = stubEnvironment()
    applyTheme('light')
    applyTheme('light')
    applyTheme('light')
    expect(root.getAttribute('data-theme')).toBe('light')
  })
})

describe('toggleTheme — 取反並持久化', () => {
  it('light → dark，寫入 localStorage 且套用到 DOM', () => {
    const { root } = stubEnvironment({ systemPrefersDark: false })
    const next = toggleTheme()
    expect(next).toBe('dark')
    expect(getStoredTheme()).toBe('dark')
    expect(root.getAttribute('data-theme')).toBe('dark')
  })

  it('再次呼叫取反回 light（第二次切換）', () => {
    stubEnvironment({ systemPrefersDark: false })
    toggleTheme()
    const next = toggleTheme()
    expect(next).toBe('light')
    expect(getStoredTheme()).toBe('light')
  })
})

describe('initThemeToggle — 接鈕：click 取反＋aria-pressed／可及名稱同步', () => {
  it('初始化時 aria-pressed 反映目前有效主題（深色 → true）', () => {
    stubEnvironment({ systemPrefersDark: true })
    const button = new FakeElement()
    initThemeToggle(button as unknown as HTMLElement)
    expect(button.getAttribute('aria-pressed')).toBe('true')
  })

  it('初始化時 aria-pressed 反映目前有效主題（淺色 → false）', () => {
    stubEnvironment({ systemPrefersDark: false })
    const button = new FakeElement()
    initThemeToggle(button as unknown as HTMLElement)
    expect(button.getAttribute('aria-pressed')).toBe('false')
  })

  it('初始化即設定固定的可及名稱', () => {
    stubEnvironment()
    const button = new FakeElement()
    initThemeToggle(button as unknown as HTMLElement)
    expect(button.getAttribute('aria-label')).toBe('深色模式切換')
  })

  it('click 一次 → 取反主題、更新 aria-pressed、寫入 localStorage、套用到 DOM', () => {
    const { root } = stubEnvironment({ systemPrefersDark: false })
    const button = new FakeElement()
    initThemeToggle(button as unknown as HTMLElement)
    expect(button.getAttribute('aria-pressed')).toBe('false')

    button.dispatch('click')

    expect(button.getAttribute('aria-pressed')).toBe('true')
    expect(getStoredTheme()).toBe('dark')
    expect(root.getAttribute('data-theme')).toBe('dark')
  })

  it('click 兩次 → 回到初始主題（雙態往返）', () => {
    stubEnvironment({ systemPrefersDark: false })
    const button = new FakeElement()
    initThemeToggle(button as unknown as HTMLElement)

    button.dispatch('click')
    button.dispatch('click')

    expect(button.getAttribute('aria-pressed')).toBe('false')
    expect(getStoredTheme()).toBe('light')
  })
})

// 型別煙霧測試：Theme 只允許這兩個字面值（編譯期檢查，執行期無斷言）。
const _typeCheck: Theme[] = ['dark', 'light']
void _typeCheck
