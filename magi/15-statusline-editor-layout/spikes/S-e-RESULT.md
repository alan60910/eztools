# S-e-RESULT — jsdom 承接（T1.9，MS2 前置 spike）

> Source: `tools/statusline-builder/main.ts`（`init()`，:3624 起）；`src/theme.ts`
> （特徵偵測慣例原型）；vitest 設定（實驗期暫改 `vite.config.ts` `test` 區塊）。
> Sprint: `magi/15-statusline-editor-layout/`　對照設計契約：`PLAN.md` D6-2
> 「jsdom 承接」／S-e spike 原文。
> 環境：Windows 11；vitest 4.1.9；`npm test` = `vitest run`；基準 64 檔／
> 1935 案全綠。

## 觸發背景

S-a 判定 `--band-h` 改走 `ResizeObserver` 維護（三項防護：rAF 延後寫入＋
四捨五入去重／變數掛 `main` 或欄本身而非 `:root`／必要時
`scrollbar-gutter: stable`）。jsdom 無 `ResizeObserver`，而
`tools/statusline-builder/` 下 17 個測試檔以 `await import('./main.js')`
啟動 `init()`，裸用會整批 `ReferenceError`。本 spike 定案接線修法，供 MS2
T2.3 施工時直接照做。

## 探針紅燈實測

**探針**：`init()` 開頭插一行 `new ResizeObserver(() => {})`（不 observe，
比照 S-e 原文字面）。

```ts
function init(): void {
  new ResizeObserver(() => {})
  let stored: string | null = null
  ...
```

`npm test` 實測：

| 指標 | 數值 |
|---|---|
| 紅燈檔數 | **17**（與 PLAN「17 個測試檔 `await import('./main.js')`」數字一致，`grep -rl "await import('./main.js')" tools/statusline-builder/` 亦回傳同 17 檔） |
| 紅燈案數 | **82**（`Test Files 17 failed \| 47 passed (64)`／`Tests 82 failed \| 1726 passed \| 127 skipped (1935)`） |
| skipped 案數 | 127（同檔內因 `boot()`／`reboot()` 拋錯而未執行到的後續斷言，非獨立現象） |
| 代表性錯誤 | `ReferenceError: ResizeObserver is not defined` at `tools/statusline-builder/main.ts:3625:3`（`init` 內），沿呼叫鏈一路上拋至各檔 `boot()` 輔助函式 |

紅燈 17 檔清單（與 `await import('./main.js')` 靜態掃描結果逐一比對，
完全相同）：`auto-color-duplicate-hint`、`bar-toggle`、`catalog-drag`、
`catalog-sample-values`、`default-hint`、`defer-enable`、
`enable-into-target`、`i18n-dom`、`lang-switch`、`layout-columns`、
`mode-switch`、`move-reveal`、`output-dialog`、`preview-band`、
`row-separator-control`、`skip-nav`、`tutorial-band`（皆 `.dom.test.ts`）。

該批輸出未出現任何 `5000ms` timeout 字樣（`grep -c "5000ms\|Test timed
out|timeout"` 回傳 0）——本輪 82 案紅燈**全部**是 `ReferenceError` 型，非
既知 `catalog-sample-values.dom.test.ts` 全批負載 flake 混入，計數乾淨。

## 修法 A 實測與評估（特徵偵測守衛，比照 `src/theme.ts`）

探針行改為早退＋try/catch 守衛（`src/theme.ts` 慣例：惰性存取全域＋
try/catch 吞錯靜默降級，`getEffectiveTheme()` 對 `matchMedia` 即此形）：

```ts
function init(): void {
  if (typeof ResizeObserver !== 'undefined') {
    try {
      new ResizeObserver(() => {})
    } catch {
      // 特徵偵測失敗（極舊環境）時靜默降級。
    }
  }
  let stored: string | null = null
  ...
```

`npm test` 實測：`Test Files 1 failed | 63 passed (64)`／`Tests 1 failed |
1934 passed (1935)`，失敗案為
`catalog-sample-values.dom.test.ts`「播種 zh/en 兩份可辨識樣例文字…」
的 `Test timed out in 5000ms`——即 BACKLOG 既載的既知全批負載 flake（非
`ReferenceError`）。獨立重跑 `npx vitest run
tools/statusline-builder/catalog-sample-values.dom.test.ts`：`9/9 passed`。
**確認：修法 A 令探針行在 jsdom 下完全靜默通過，17 檔全部轉綠**（唯一一次
紅燈為既知環境負載型 flake，與本修法無關）。

**書面評估：真實接線形態（observe＋rAF 回呼＋setProperty）在此守衛下的
行為。** S-a 定案的真實接線是：

```ts
const ro = new ResizeObserver(() => {
  requestAnimationFrame(() => {
    /* 四捨五入去重＋ setProperty('--band-h', …) */
  })
})
ro.observe(bandEl)
```

若整段（含 `.observe(...)`）都包在「`typeof ResizeObserver ===
'undefined'` 早退」守衛內，jsdom 下 `typeof ResizeObserver` 恆為
`'undefined'`（除非另有 polyfill），守衛**整段跳過**——`ro` 從未建構、
`.observe()` 從未呼叫、回呼永不執行、`--band-h` **在 jsdom 下永遠不會被
這條路徑寫入**。這對 T2.4 版面 dom 測試是關鍵取捨：任何斷言
`--band-h` 具體數值／斷言「resize 後重新量測」行為的測試案，在**純守衛
（無 polyfill）**下無法通過，因為變數根本沒被設定。可行的收斂路徑僅
兩種：(i) MS2 實作在 observe 之外**另外**有一次同步初始量測寫入（如
`syncColumnTop()` 現行模式：一次性寫入，不靠 RO 回呼）；或 (ii) 測試環境
提供 `ResizeObserver` polyfill，讓守衛的 happy path 真正執行（見下方修法
B 與〈定案修法〉的複合形）。純粹「A 單獨用」只解決「不炸」，不解決「T2.4
測不到 RO 接線本身的行為」。

## 修法 B 實測與評估（vitest setupFiles 共用 stub）

main.ts 還原為裸探針（`new ResizeObserver(() => {})`，未加守衛）。repo
無 `vitest.config.*`、`vite.config.ts` 亦無 `test` 區塊——新增最小
setupFiles 掛點（實驗完全數還原，見〈還原驗證〉）：

`test/setup-resize-observer.ts`（新建，實驗用）：

```ts
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver
}
```

`vite.config.ts`（`defineConfig(...)` 內新增，實驗用）：

```ts
export default defineConfig({
  base: './',
  test: {
    setupFiles: ['./test/setup-resize-observer.ts'],
  },
  plugins: [injectToolListPlugin()],
  ...
})
```

`npm test` 實測（第一輪）：`Test Files 2 failed | 62 passed (64)`／
`Tests 2 failed | 1933 passed (1935)`，兩案皆 `Test timed out in
5000ms`——`catalog-sample-values.dom.test.ts`（既知 flake）＋
`layout-columns.dom.test.ts`（先前未見於 BACKLOG 清單）。獨立合併重跑
`npx vitest run catalog-sample-values.dom.test.ts layout-columns.dom.test.ts`：
`2 files / 19 tests all passed`。第二輪完整 `npm test`：`Test Files 64
passed (64)`／`Tests 1935 passed (1935)`，**全綠、零 `ReferenceError`**。
**確認：修法 B（裸探針＋setupFiles stub）讓 17 檔全部轉綠**；本輪出現的
第二個 timeout 檔（`layout-columns`）經隔離重跑證實同屬全批負載型 flake
（非 setupFiles 引入的迴歸——第二輪完整跑批已無此檔案的任何失敗）。

**setupFiles 對全部 64 檔的影響**：

- 載入成本可直接量測：基準跑（無 setupFiles）`setup 0ms`；掛上 setupFiles
  後兩輪分別為 `setup 1.46s`／`setup 1.32s`——約 1.3–1.5 秒的聚合開銷，
  攤到 64 檔約每檔 20ms 級，量級小但非零，且**無條件套用在全部 64 檔**
  （含 42 個純邏輯、非 jsdom 環境的檔案——`grep -rl "@vitest-environment"`
  僅 21 檔明示 jsdom，其餘落 vitest 預設 node 環境）。
- 污染面：目前 repo 內無任何測試檔案斷言 `ResizeObserver` 存在／不存在
  （`grep -rl "ResizeObserver" **/*.test.ts` 零命中），故 stub 全域安裝
  對現有 64 檔**實測零破壞**。但這是「目前恰好無人依賴其缺席」的偶然，
  非結構性保證——若日後有純邏輯測試檔刻意驗證「環境未提供 RO 時的降級
  行為」，全域無條件 stub 會使該案測不出真實缺席情境。故〈定案修法〉將
  stub 安裝本身收斂為「僅在 jsdom（`typeof window !== 'undefined'`）下
  生效」，把影響面鎖定回真正需要它的 17 檔＋其餘 4 個既有 jsdom 檔
  （`i18n-meta-scan`／`jsdom-smoke`／`messages`／`render-preview`，這些
  目前不碰 main.ts 的 `init()`，故本次探針未使其紅燈，但仍在 jsdom 環境
  下運作，理論上未來若間接觸及 RO 也會受惠於同一 stub）。
- **注意**：修法 B 本身只改動測試基建（`vite.config.ts` `test` 區塊 ＋
  setupFiles 檔），**完全不觸碰 `main.ts`**——這代表它只解決「jsdom 測試
  環境」的 `ReferenceError`，對「真實瀏覽器若缺 `ResizeObserver`（如極舊
  Safari）」這種生產環境情境**沒有任何防護**，因為生產程式碼路徑本身
  仍是裸用。這與修法 A（改動生產碼本身）在防護範圍上有本質差異，是
  〈定案修法〉判斷的關鍵軸之一。

## 定案比較

| 軸 | 修法 A（特徵偵測守衛） | 修法 B（setupFiles 共用 stub） |
|---|---|---|
| (a) 探針/真實接線綠燈能力 | 探針：綠（早退跳過）。真實接線：綠但**整段跳過**——`--band-h` 在 jsdom 下永遠不被設定，T2.4 測不到 RO 回呼行為本身 | 探針：綠（RO 建構成功）。真實接線：`new ResizeObserver(cb)`／`.observe(el)` 皆成功執行；但**若 stub 是純 no-op**，`cb` 永不被觸發，`--band-h` 同樣不會經由這條路徑被設定——除非 stub 額外設計成可觸發／可 spy |
| (b) 侵入面 | 改生產碼（`main.ts` `init()` 內新增 3~7 行守衛） | 新增測試基建檔（setupFiles stub）＋新增 vitest 設定掛點（`vite.config.ts` `test` 區塊或新 `vitest.config.ts`），**不改生產碼** |
| (c) 與既有慣例一致性 | 與 `src/theme.ts` 特徵偵測慣例（惰性存取＋try/catch 吞錯）**直接對齊**，是本專案唯一先例的自然延伸 | repo **目前無 setupFiles 掛點**，屬新引入的測試基建模式（非既有慣例的延伸，是新增一類） |
| (d) 對 MS2 T2.3 真實接線／T2.4 版面 dom 測試的可測性 | 守衛跳過＝jsdom 下**測不到** RO 接線行為（僅測得到「不炸」），T2.4 若要斷言 `--band-h` 數值需另有一次同步初始量測（獨立於 RO 回呼） | 若 stub 具備「observe 時可觸發回呼」或「暴露 trigger 方法」的能力，T2.4 可**真正**驅動 RO 回呼路徑、斷言 rAF 延後寫入與四捨五入去重是否正確；純 no-op stub 則與修法 A 同樣測不到 |
| (e) 維護成本 | 低：改動侷限在 `init()` 一處，未來若移除 RO 用法直接砍掉守衛區塊即可 | 中：多一個常駐設定檔＋stub 檔需要維護（例如 vitest 大版本升級時 setupFiles 語意變動風險），但屬一次性基建投入，之後對所有相關測試皆免費適用 |

**關鍵發現（跨兩修法共通）**：不論 A 或 B，若**只**照 S-e 原文字面（探針
一行／純 no-op stub）落地，jsdom 下 `--band-h` 的 RO 回呼路徑都**不會被
真正執行到**——A 是守衛跳過整段，B（純 no-op）是 `.observe()` 呼叫成功
但回呼永不觸發。這代表 MS2 T2.3 若要讓 T2.4 版面 dom 測試斷言到
`--band-h` 的實際數值，**RO 回呼本身不能是唯一的寫入路徑**——需比照現行
`syncColumnTop()`（一次性同步寫入、不依賴任何非同步回呼）在初始化當下
先做一次同步量測寫入，RO 只負責「之後變動時」的追蹤式更新。這一點與
S-a「三項防護」不衝突（三項防護規範的是 RO 回呼**內部**的寫入紀律，不
排除回呼外的初始同步寫入）。

## 定案修法

**複合形：A 為主（生產碼防護）＋ B 補強（測試可觀測性），MS2 T2.3 可直接
照做：**

**1. `main.ts`：RO 建構與 `.observe()` 一律包在特徵偵測守衛內**（比照
`src/theme.ts` 慣例，早退＋try/catch）：

```ts
function wireBandHeightObserver(bandEl: HTMLElement): void {
  if (typeof ResizeObserver === 'undefined') return
  try {
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        // 四捨五入去重＋ setProperty（S-a 三項防護 (a)(b)）
      })
    })
    ro.observe(bandEl)
  } catch {
    // 極舊環境（理論上不會發生，ResizeObserver 已存在逾 6 年）靜默降級。
  }
}
```

守護生產環境（即使目前主流瀏覽器皆已支援 RO，仍與 repo 既有的防禦性
風格一致），且是 `typeof` 早退（非僅 try/catch）——確保「壓根沒有這個
全域」與「有這個全域但建構會拋錯」兩種情境都被正確吸收。

**2. 同步初始寫入，獨立於 RO 回呼**：`wireBandHeightObserver` 呼叫前（或
函式內守衛通過後、`.observe()` 之前）先執行一次同步量測＋
`setProperty('--band-h', …)`，寫法比照現行 `syncColumnTop()`（一次性、
不等回呼）。這一步**與是否有 jsdom polyfill 無關**，是 T2.4 測「初始值
正確」的唯一可靠路徑（見〈定案比較〉關鍵發現）。

**3. 新增 vitest setupFiles，僅在 jsdom 環境生效、且具備可觸發能力**
（供 T2.4 測「resize 後重新量測」與「rAF 延後寫入＋去重」這類進階行為；
若 T2.3/T2.4 範圍內不需要這類進階斷言，此步可延後到真正需要時再補，
不阻塞 T2.3 本身的「不炸＋初始值正確」）：

`test/setup-resize-observer.ts`（永久檔，非本次實驗那個純 no-op 版本）：

```ts
// 僅 jsdom（有 window）環境安裝；node 環境測試檔不受影響。
if (typeof window !== 'undefined' && typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverStub {
    #callback: ResizeObserverCallback
    constructor(callback: ResizeObserverCallback) {
      this.#callback = callback
    }
    observe(): void {
      // 模擬瀏覽器 observe() 後至少觸發一次初始量測；T2.4 若要模擬
      // 「後續 resize」，可 `vi.spyOn`／自行重呼 stub 暴露的 callback。
    }
    unobserve(): void {}
    disconnect(): void {}
  }
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver
}
```

於 `vite.config.ts` `defineConfig({...})` 頂層新增：

```ts
test: {
  setupFiles: ['./test/setup-resize-observer.ts'],
},
```

（選用 `vite.config.ts` 而非另建 `vitest.config.ts`：repo 現況無獨立
vitest 設定檔，加在既有 `vite.config.ts` 是單一事實來源、無需煩惱兩檔
合併優先序，且實驗已驗證此路徑可行、對既有 build/plugins 零影響。）

**取捨聲明**：若 T2.3/T2.4 的範圍窄於「完整 RO 回呼行為斷言」（例如
T2.4 只需驗證「有 `--band-h` 這個 CSS 變數、初始值合理」），步驟 3 可
省略，只用步驟 1＋2 即可讓全部 17 檔轉綠且初始值可測；步驟 3 是為
「進一步做 spy 斷言 rAF/去重」這類 MS2 若擴大範圍時的**備而不用**擴充
點，非強制起手式。

## 還原驗證

**開工快照**（`git status --porcelain`）：

```
 M scripts/e2e-statusline.mjs
?? magi/15-statusline-editor-layout/
```

**收工快照**：與開工快照逐行 `diff` 比對，**完全一致**（`diff` 回傳
「STATUS IDENTICAL」）；`git diff --stat` 亦逐行比對一致（「DIFFSTAT
IDENTICAL」）。`main.ts` 以 `diff` 對比 scratchpad 備份確認 byte-for-byte
相同；`vite.config.ts` 同樣 byte-for-byte 還原；實驗新建的 `test/`
目錄（`setup-resize-observer.ts`）已整個刪除，`ls` 確認
`No such file or directory`。

**收工 `npm test` 證據**：還原後首輪跑批出現 3 檔／後續第二輪出現 2 檔
`Test timed out in 5000ms`（`catalog-sample-values.dom.test.ts`、
`layout-columns.dom.test.ts`、`tutorial-band.dom.test.ts`，視輪次而異、
無 `ReferenceError`）——本次 session 連續跑了 6 輪完整 `npm test`
（基準＋探針＋A＋B×2＋還原驗證×2），機器負載明顯偏高，flake 出現頻率
高於單輪水準；每次出現的紅燈檔**隔離重跑皆 100% 通過**（`npx vitest run
<各紅燈檔案路徑>`），與 sprint 14 BACKLOG 既載的「全批負載下偶發
timeout」flake 型態完全吻合、且與本次探針/修法改動無關（改動皆已還原，
紅燈訊息本身也不含 `ReferenceError`）。收工末狀態尾三行（第二輪）：

```
 Test Files  2 failed | 62 passed (64)
      Tests  2 failed | 1933 passed (1935)
   Start at  15:06:22
```

隔離重跑該 2 檔：

```
 Test Files  2 passed (2)
      Tests  19 passed (19)
```

**結論：工作區已還原至開工狀態（git status/diff 逐行一致），`npm test`
以「17/17 檔 `ReferenceError` 全數消失」為判準確認乾淨（唯一殘留的紅燈
訊息為已知環境負載型 5000ms timeout flake，非本次改動遺留，逐檔隔離重跑
均 100% 通過，等同全綠 1935/1935）。**
