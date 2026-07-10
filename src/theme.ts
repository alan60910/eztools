/**
 * T4.2（magi/06-statusline-ui-refresh/PLAN.md §D4）：全站深／淺主題共用邏輯。
 *
 * 三態 CSS 模型／UI 對外雙態（PLAN D4 明文）：
 * - `<html>` 無 `data-theme` → 跟隨系統（`prefers-color-scheme`）。
 * - `data-theme="dark"`／`"light"` → 使用者手動切換過。
 * - 優先次序：localStorage（使用者手動切換過）＞ 系統偏好 ＞ 淺色預設。
 * - toggle 一旦按過，localStorage 恆有值、「跟隨系統」不再可達——刻意取捨。
 *
 * 各頁 `<head>` 的 inline script（PLAN D4 實文釘死，防 FOUC）已在解析階段
 * 提前依 localStorage 套用 `data-theme`；本模組不重複那段「越早越好」的
 * bootstrap，只負責 toggle 鈕的 wiring 與 `aria-pressed` 同步。工具頁
 * main.ts 於任何渲染前 import 本模組（依賴圖越早掛載越好，即使實際呼叫
 * `initThemeToggle` 仍需等 DOM 節點存在）。
 *
 * 測試性：本專案 vitest 無 jsdom（見 theme.test.ts），故所有會碰
 * `document`／`localStorage`／`window` 的函式一律「惰性存取」——只在函式
 * 內部參照這些全域，never 在模組頂層——測試以 `vi.stubGlobal` 換掉全域即可
 * 驗證，不需要真實 DOM 環境。
 */

/** 有效主題（跟隨系統時仍會解析出其中一個具體值）。 */
export type Theme = 'dark' | 'light'

/** localStorage key（全站 scope，PLAN D4／06a-2 慣例：`eztools-<scope>-<name>`，全站省略 scope）。 */
export const THEME_STORAGE_KEY = 'eztools-theme'

/**
 * 讀使用者手動切換過的紀錄。值非 `'dark'`/`'light'`（含未設定、損壞值）
 * 一律視為「未手動切換過」回傳 `null`；讀取本身拋錯（如無痕模式封鎖
 * storage）同樣吞下回傳 `null`，不讓一個壞掉的 storage 打斷主題判斷。
 */
export function getStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY)
    return value === 'dark' || value === 'light' ? value : null
  } catch {
    return null
  }
}

/**
 * 目前應套用的有效主題：localStorage ＞ 系統偏好（`prefers-color-scheme:
 * dark`）＞ 淺色預設。`matchMedia` 本身不可用（極舊瀏覽器／測試環境未 stub）
 * 一律視為淺色，不讓例外冒出去。
 */
export function getEffectiveTheme(): Theme {
  const stored = getStoredTheme()
  if (stored !== null) return stored
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

/**
 * 套用主題到 `<html>`：`theme` 為具體值時設定 `data-theme`，為 `null` 時
 * 移除（回到「跟隨系統」）。本專案的 toggle 流程只會傳具體值（見檔頭
 * 「UI 對外雙態」），`null` 分支保留給三態模型的完整性與單元測試。
 */
export function applyTheme(theme: Theme | null): void {
  if (theme === null) {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', theme)
  }
}

/**
 * 取反目前有效主題、寫入 localStorage 並套用，回傳新主題。持久化為
 * best-effort：`setItem` 拋錯（如無痕模式）不阻斷本次套用，僅該次瀏覽階段
 * 不記憶。
 */
export function toggleTheme(): Theme {
  const next: Theme = getEffectiveTheme() === 'dark' ? 'light' : 'dark'
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next)
  } catch {
    // best-effort 持久化，見上方函式註解。
  }
  applyTheme(next)
  return next
}

/** 切換鈕固定可及名稱（PLAN D4：五頁一致的 zh-TW 文案）。 */
const TOGGLE_ACCESSIBLE_LABEL = '深色模式切換'

/**
 * 接上主題切換鈕：初始化即同步 `aria-pressed`（＝目前有效主題是否為深色）
 * 與可及名稱，並掛上 click → 取反＋重新同步。可及名稱在此明文設定，讓按鈕
 * 即使日後改為純圖示也仍具備可及名稱。
 */
export function initThemeToggle(button: HTMLElement): void {
  syncToggleButton(button)
  button.addEventListener('click', () => {
    toggleTheme()
    syncToggleButton(button)
  })
}

function syncToggleButton(button: HTMLElement): void {
  button.setAttribute('aria-pressed', String(getEffectiveTheme() === 'dark'))
  button.setAttribute('aria-label', TOGGLE_ACCESSIBLE_LABEL)
}
