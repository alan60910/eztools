# 🧠 MAGI Code Review — DEV @ 5ac11d1＋工作樹（sprint 15 全批未提交改動）

**Diff scope:** `git diff HEAD`（排除 `__golden__`／lockfile；含 untracked 新檔 `catalog-collapse.ts`／`.test.ts`／`.dom.test.ts` 與 sprint 15 DRIFT 前置留痕）
**規模判定（政策 §2）**：主尺 tracked +3329/−892＝4,221 行＋新增程式檔 565 行 ≈ **4,786 行 > 800 → 7 票（巨大改動，角度 1–7 全上）**

## Dashboard

```
┌──────────────────────────────────────────────────────────┐
│  VERDICT: APPROVE-WITH-NITS                              │
├──────────────────────────────────────────────────────────┤
│  Mode: majority (角度制)   Threshold: vote_sum > 3.5     │
│  OK weight: 7 / 7          Degraded: no                  │
├──────────────────────────────────────────────────────────┤
│  角度×模型（政策 §4 輪替；無 gemini/codex）：            │
│  ✅1 正確性=fable  ✅2 契約=opus   ✅3 測試=sonnet       │
│  ✅4 回歸=haiku   ✅5 安全=fable  ✅6 效能=opus          │
│  ✅7 維護=sonnet                                         │
├──────────────────────────────────────────────────────────┤
│  🔴 Critical: 0   🟡 Important: 11   🟢 Minority: 8      │
│  逐員裁決：APPROVE ×1（角度4）／APPROVE-WITH-NITS ×6     │
└──────────────────────────────────────────────────────────┘
```

**揭露**：同 vendor（claude）四模型輪替湊票，無跨 vendor 驗證（政策 §4 既定）；
角度 1/5 同為 fable、2/6 同為 opus、3/7 同為 sonnet——同模型對內的收斂
（如 🟢-4 keydown 暫態由兩個 fable 角度提出）獨立性較弱，已於條目註記。
執行機制＝Agent subagent 併行（一角度一執行的等效實作，政策 §5 意旨）。
**專家單票條款（政策 §6）**：本輪 6 件未過門檻的本職角度發現經協調者逐件
親自實證（grep／原碼比對）後採納，逐條標〔協調者實證〕。

## Verdict
**APPROVE-WITH-NITS**——零 Critical；11 條 Important 全屬「實作正確但護欄不足」
或「判準寬鬆度超出自身論證所需」，皆為小修，無架構翻案。

## 🔴 Critical (adopted)
(none)

## 🟡 Important (adopted)

1. **`js-init-pending` 解除點在 init() 尾段——init 半路擲錯時行動版目錄被暫抑樣式鎖成 0 高度**（4 票：角度 1／2／5／6）
   `main.ts:3122-3127`（唯一解除點，經 `wireCatalogCollapse()` 於 init 倒數第二步呼叫）；目錄早在 `buildCatalogItems()` 就渲染完成，中間十餘個 wire* 任一擲錯即永久壓 0 高度；`<noscript>` 只覆蓋 scripting 停用。正面收窄 PLAN §D8「fail-open 實際覆蓋 init() 半路擲錯」的承諾（sprint 14 無此暫抑，同情境目錄仍可見——強健性倒退）。**修法**：init() 包 `try/finally` 保證移除，或把 `applyInitialCatalogCollapseState()` 前移至 init 起手（零前置依賴）。
2. **`js-init-pending` 解除行全測試網零覆蓋、dom 斷言恆真**（4 票：角度 1 立項＋2／5／6 未測路徑；角度 1 機械證明「刪除 main.ts:3126 後 1992 vitest＋19 e2e 仍全綠」）
   `catalog-collapse.dom.test.ts:173/:266` 斷言 `documentElement` 無該 class，但 jsdom 從未帶過它——不論實作是否移除都通過。**修法**：`boot()` 於 import 前補掛 class 使斷言行使真移除路徑；（選配）G8 e2e 補一條 class 已除斷言。
3. **G4 動態上界過寬——全列群組加總 ≈200px，為物理可解釋量（40px）約 5 倍**（4 票：角度 2／3／5／6）
   `e2e-statusline.mjs:1507-1519/:1720-1726`；最尖銳論證（角度 6）：`after-dragstart` 取樣前有 300ms delay，S-i 邊緣自動捲動 ~700px/s × 300ms ≈ 210px 與上界同量級——最該把關的起手瞬間近乎不設防（其後各階段 ±2px 相對的是 after-dragstart 基準）。另 `min-height` 通道未計入。**修法**：上界改「目標列之上群組數 × 單群組增量」或補 sanity 天花板（角度 5：防 CSS 回歸連動放大）。
4. **skip-nav.dom.test.ts 重刻未強化括號深度計數，繞過同批 T2.5 的 `stripCssComments` 治本**（3 票：角度 2／3／7＋〔協調者實證：該檔 `stripCssComments` 零命中〕）
   `skip-nav.dom.test.ts:191-212`；且與 layout-columns 的 `mediaBlockRange` 同懷「檔內唯一 `@media (min-width:1100px)` 區塊」隱性假設，而 style.css 本批起實有**兩個**（:1545／:1790）。**修法**：抽共用 test helper（stripCssComments＋mediaBlockRange）兩檔共用；補「同條件區塊恰 N 個」計數斷言。
5. **T2.6 再校準後中段取樣點判別力損失——平頂 140px 蓋掉中段理論 30–60px 區間**（3 票：角度 3／6／7＋〔協調者實證：判準確為 isSteady 後一律 ≤140px 平頂〕）
   只在中段出現、與 N4 成因無關的獨立遮蔽 bug（<140px）不會發紅；且「頂帶剛黏住那一刻兩欄貼齊」的核心幾何現無任何取樣點把關（角度 6）。**修法**：補「gap 隨 scrollY 單調不遞減」輔助斷言或插值上界；`scrollPoints` 插入 `Math.ceil(steadyThreshold)` 一點。角度 2 的 A 類主張（PLAN 正文未回填）以「PLAN §D2 N4 定案句＋§Spike 回填 S-a 各補一句穩態後適用範圍」消解（見 DRIFT B-2）。
6. **D8「桌面態硬條件」零回歸覆蓋**（2 票：角度 3／7 皆本職＋〔協調者實證：e2e 對 summary 僅 :1844 行動版一處引用；layout-columns 歸屬斷言不含 summary 規則〕）
   `summary{display:none}`（style.css:1790-1793）誤刪／錯字不會有任何紅燈；唯一驗過的是已退役 S-f 原型。**修法**：layout-columns 補該規則的 media 歸屬斷言＋桌面 e2e 以 `getComputedStyle` 驗 `display==='none'`。
7. **summary 雙 rAF 持久化時序無真瀏覽器回歸**（1 票：角度 3 本職＋〔協調者實證：e2e 零 summary 真點擊路徑（G8 走 seed key）；jsdom `<details>` 同步翻轉對「移除雙 rAF」退化零鑑別力〕）
   S-f 費工挖出的平台坑（queueMicrotask 讀舊值）沒有留下回歸護欄。**修法**：e2e 補 <1100px 真點擊 summary → 驗 localStorage 終值案；或列真機必測清單。
8. **G2 缺 `maxScroll ≥ steadyThreshold` 防呆——T2 主判準可能靜默從未執行**（1 票：角度 2 本職＋〔協調者實證：G2 僅 `maxScroll>0`；G4 :1606／G8 :1900 皆有該防呆——不對稱屬實〕）
   內容縮水時四取樣點全落 pre-steady → 最承重的 G2 硬驗收空轉全綠。**修法**：比照 G4 補三行前提斷言。
9. **SPEC Conventions「skip 落點快照謂詞」無機械守門人＋「頂層分區」口徑未定義**（1 票：角度 2 本職＋〔協調者實證：skip-nav 測試僅反向「href 可解析」（:163），無正向枚舉〕）
   改寫成快照謂詞的唯一理由就是可機械驗證，卻無人驗；下個工具新增分區不會紅。**修法**：補正向枚舉 dom 斷言；SPEC 該句釘死「頂層分區」判定口徑。
10. **收合六情境 5 的負向斷言有時序空窗**（1 票：角度 1 本職＋〔協調者實證：`simulateChange` 後同步斷言 localStorage，無 rAF 沖刷〕）
    假想敵（日後誤掛 toggle 監聽走雙 rAF 延遲持久化）的錯誤寫入會在斷言之後才落地。**修法**：斷言前沖刷雙 rAF（或 `vi.waitFor` 短穩定期）。
11. **jsdom boot 結構性成本以檔級 timeout 治標**（2 票：角度 3／6，角度 6 本職＋〔協調者實證：`testTimeout:30_000` 實為 7 檔；`await boot()` 約 51 次〕）
    O(案數 × 全模組圖) 結構性成本隨 index.html 增長必然復發，30s 併掩蓋真效能回歸。**行動**：升 BACKLOG 條目留兩條根治候選（唯讀契約案收斂 beforeAll 單次 boot；vite.config 補 `test.setupFiles` 順帶承接 RO stub 使回呼首次可測）。

## 🟢 採納之 Note（簿記與實證類）

- **testTimeout「六檔」實為七檔**（4 票：角度 2／5／6／7）——DRIFT／BACKLOG 數字已於本輪修正（含 `catalog-collapse.dom.test.ts` 自身）。
- **S-j 340px 裁量（不升 410px）未列 DRIFT**（2 票：角度 1／5）——本輪已補入 DRIFT B。
- **S-e 複合形第 3 件（vitest setupFiles stub）未落地、未留痕**（2 票：角度 2／6）——授權內取捨（PLAN 標「非強制」），本輪已補留痕；代價＝RO 回呼零測試掛點（連動 🟡-11）。
- **summary keydown Space 長按暫態寫入**（2 票：角度 1／5——揭露：兩者同為 fable，獨立性較弱；〔協調者實證：keydown 分支存在且排程持久化〕）——最終態正確、錯向落 fail-open，實害趨零；建議移除防禦性 keydown 分支或註記暫態。
- **G2 `isSteady` 用要求值 `y` 非實際 scrollY**（1 票：角度 1 本職＋實證）——`maxScroll<400` 時會誤紅；現行 seed 下不可達，屬防禦性緊固。
- **e2e `evaluate` 缺 `awaitPromise`，`SETTLE_AFTER_SCROLL_EXPR` 雙 rAF 實為 no-op**（1 票：角度 1 本職＋〔協調者實證：全檔 `awaitPromise` 零命中〕）——現靠後續 `delayFn(120+)` 掩護無實害；註解與機制不符，防日後誤刪 delayFn。
- **RO 回呼棄 `entries` 改讀 `getBoundingClientRect()`——每次 resize 一次 forced sync layout；border-box 等值耦合無機械保護**（1 票：角度 6 本職＋實證 main.ts:3773）——建議改讀 `entry.borderBoxSize` 並明示 `{box:'border-box'}`。
- **SPEC「作者顯式停點」措辭宜限定「捲動停點」**（1 票：角度 2 本職＋實證）——頁面另有 spinbutton 之 tabindex=0 作者停點，脫離段落易誤讀。
- **`SKIP_PATH_KEYSTROKE_COUNT` 為純文件常數**（1 票：角度 2 本職＋〔協調者實證：僅現身字串與註解〕）——建議加一行顯式綁定算式或降為註解。

## 🟢 Minority（未過門檻，保留紀錄）

- `Runtime.exceptionThrown` gate 全域化超出 PLAN D6-3 的 RO 可觀測性授權（角度 5）；該哨兵自身缺正控制、「真的抓得到 RO loop error」未證（角度 6）。
- 行動版 `dvh` 過場（URL bar 收放）驅動 RO 回呼＋forced layout 的頻率未量測（角度 6）。
- 340px 目錄軌寬於真實 dist 無截斷斷言；可在常駐 `viewport-probe-1280x800` 案加 `scrollWidth ≤ clientWidth` 哨兵（角度 6）。
- `dragFixedPoints` 與 `dragBySelector` 共享 ~90% 拖曳序列，timing 常數日後須雙處同步（角度 7）。
- e2e 對 `.ts` 常數出口的動態 import 已達三處，宜抽 `loadToolConstants()` 收斂版本門檻（角度 2）。
- `scrollbar-gutter` 不加的裁量前提恰由 G2 `maxScroll>0` 斷言機械把關，但兩處註解互不指名（角度 6）。
- main.ts 續肥至 ~3890 行（角度 7；既有 BACKLOG 趨勢延續，非本批新問題）。
- `mediaBlockRange` 只綁第一個同條件區塊，規則搬入第二區塊會假紅（角度 2；已併入 🟡-4 修法）。

## Untested paths

- `main.ts:3122-3127` `js-init-pending` 於「init() 擲錯」路徑——角度 1／2／5／6（🟡-1/2）。
- `wireBandHeightObserver` RO 回呼本體（去重／rAF 合併／實際寫值）——jsdom 無 RO、setupFiles stub 未落地——角度 1／2／6。
- `wireCatalogCollapse` keydown（Enter/Space）持久化分支——六情境全走 click——角度 2。
- `scheduleCatalogCollapsePersist` 雙 rAF 於真 Chromium 非同步 toggle 時序——角度 3（🟡-7）。
- `mql.addListener` 舊 API 後備與各防禦性 catch——角度 1／2／3／5（防禦性，列帳即可）。
- `summary{display:none}` 桌面態規則——角度 3／7（🟡-6）。
- 全部 e2e 僅 Chromium——PLAN 跨引擎誠實聲明既載，第三輪真機承接（角度 6 重申）。

## 修復批結果（同日，使用者授權「跑修復批再 commit」）

11 條 🟡 全數處理（四 lane：α main.ts＋收合測試／β 測試網 helper＋SPEC／γ e2e／δ 註解同步；🟡-11 以 BACKLOG 條目消解）：
🟡-1/2 前移＋try/finally＋boot 補掛 class（紅→綠機械自證）＋G8 e2e class 斷言；🟡-3 上界 200px→42px（實測跳動 40px）＋64px 天花板；🟡-4 `css-scan-test-utils.ts` 共用 helper＋「恰 2 區塊」契約斷言；🟡-5/8＋🟢-isSteady G2 四項加固；🟡-6 dom 歸屬斷言＋e2e `d8-catalog-summary-desktop-1400x1000`；🟡-7 e2e `catalog-collapse-summary-click-persist-390x844` 真點擊；🟡-9 正向快照謂詞（兩例負向控制）＋SPEC 口徑；🟡-10 雙 rAF 沖刷；🟡-11 BACKLOG 治本條目。DRIFT B-2/B-3 的 PLAN 回填句已補（§D2 N4／§Spike S-a／§Verification G4）。

**修復批後總驗證（協調者親跑）**：`npm test` 66 檔 **2000/2000** 全綠；typecheck exit 0；黃金檔零 diff ×2；fresh build 後 e2e **21/21**（lane γ 另兩輪 21/21）。採納之 Note 中簿記三項（testTimeout 七檔、S-j 裁量、S-e 留痕）已入 DRIFT/BACKLOG；未處理之 Note（keydown 暫態、awaitPromise、RO entries、SPEC 停點措辭、SKIP 常數）與 Minority 全數留 DRIFT C／下一批。

## 全員共同確認之正面結論

- **對帳表十列逐列核實無遺漏**（角度 2 逐列比對 SPEC 實文；「同一捲動容器」全文歸零）；TECHSTACK 三項精確；T4.1 案 9 擇一有理由＋防恆真前提斷言；D6-3 exceptionThrown 監聽落實。
- **resolve/emit 三後端零觸及**（角度 4 核實檔案清單＋黃金檔零 diff ×2 證據鏈）；其他三工具頁與入口頁零波及。
- localStorage 防禦全鏈 fail-open 無例外洩出路徑；e2e 內插字面 `JSON.stringify` 紀律貫徹；行程樹／profile 清理鏈完好（角度 5）。
- `--band-h` RO 三防護設計正確、「捲軸→寬度→換行→高度」回饋環在本版型無成立路徑（角度 6 逐條檢驗）。
- DRIFT 前置留痕逐條核實屬實（七員皆查）；唯數字性缺漏一處（testTimeout 檔數）與兩條漏列（S-j 裁量、S-e 第 3 件），本輪已修。
