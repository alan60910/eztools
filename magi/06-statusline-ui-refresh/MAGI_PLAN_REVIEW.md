# 🧠 MAGI Plan Review — Statusline Builder UI Refresh（Round 2）

**Sprint:** magi/06-statusline-ui-refresh/ • **Document:** PLAN.md Rev 2 • **Round:** 2

## Dashboard

```
┌──────────────────────────────────────────────────────────────┐
│  VERDICT: REQUEST-CHANGES（2:2 分裂，coordinator 裁定）      │
│  ※ Round 1 全部 issue 經 4/4 確認已實質解決                  │
├──────────────────────────────────────────────────────────────┤
│  Mode: majority      Threshold: vote_sum > 2.0               │
│  OK weight: 4 / 4    Degraded: no                            │
├──────────────────────────────────────────────────────────────┤
│  ✅ fable-5: APPROVE-WITH-NITS   ✅ opus: REQUEST-CHANGES    │
│  ✅ sonnet: APPROVE-WITH-NITS    ✅ haiku: REQUEST-CHANGES   │
├──────────────────────────────────────────────────────────────┤
│  🔴 Critical: 0（採納）  🟡 Important: 4                     │
│  🟢 Minority: 15（含 2 條單票 Critical）  🔬 Spikes: 3       │
└──────────────────────────────────────────────────────────────┘
```

## Verdict

**REQUEST-CHANGES（第三輪不建議）**。判決 2:2，coordinator 裁定理由：四位一致確認 Rev 2 已解決全部 Round 1 架構級問題（256 索引色票、bar 正交欄、多列契約、拆分——多位審查員逐檔對照原始碼驗證「落點正確」）；本輪全部發現屬 §7.5 的 **(b) 型（規格文字收口）**，無一要求重新設計。依 round 2 收益遞減原則：**修訂寫回 PLAN 後直接進 `/magi:tasks`，不跑第三輪**。

## 🟡 Important（採納，vote ≥3/4）

### R2-1. [vote: 3/4 — fable + opus + sonnet] 06a 目標句與箭頭移除留在 06b 的時序缺口
06a 宣稱「產出腳本不再依賴 Nerd Font」，但 `powerlineArrow`（箭頭條件化）排在 06b——06a 單獨 merge 部署後，powerline 使用者拿到「emoji 圖示＋豆腐箭頭＋**零警語**（橫幅已刪）」，且預覽（CSS 三角形）與實際產出（PUA）不一致，正好是本 sprint 要修的第 1 項回饋的加重版。
**裁定修法**（sonnet/opus 方案 a）：`powerlineArrow`＋CONFIG_VERSION 2 遷移＋箭頭條件化＋右 padding **整組前移進 06a**；`row` 欄留在 06b（v2 內的選填欄，不再 bump）。

### R2-2. [vote: 3/4 — fable + opus + sonnet] 「釘 TZ」對 ps1／.NET 不成立
PS 5.1（.NET Framework）的 `ToLocalTime()` 讀 Windows 登錄檔時區，**完全不理會 `TZ` 環境變數**（pwsh 7 僅 Unix 吃 TZ）。「windows leg 釘 TZ 進 byte-exact」是空頭保證——與 Round 1「BSD 分支測不到」同構。現行 percent-reset 靠「同機同時區 oracle 對比」成立，非靠 TZ。
**裁定修法**：ubuntu leg 釘 TZ；windows leg 以 `tzutil /s` 顯式設定（或斷言 runner=UTC）＋維持同機 oracle 對比；新增 spike S6 驗證。

### R2-3. [vote: 3/4 — fable + sonnet + haiku] 渲染列序的排序鍵與雙口徑未收口
「按 row 分組」未明講依 row 值升冪還是首現序；select 枚舉原始列號（0/2/5）而 badge／播報用渲染列序（1/2/3），兩口徑並存會讓使用者看到「列2」badge 卻在 select 找「列5」。
**裁定修法**：明文「分組＝row 值升冪→壓縮＝渲染列序」；UI 全面採渲染列序；**每次寫回 config 時把 row 正規化為 0..N−1**（兩口徑永久合一）；亂序輸入單元測試。

### R2-4. [vote: 3/4 — fable + opus + haiku] Spec deltas 殘餘精度缺口
Components 漏列 `src/theme.ts` 新共用模組（fable）；Conventions「精確上限由 verify-dist 斷言把關」句在斷言刪除後描述不存在的守衛（opus）；TECHSTACK Deployment 段（真執行 gate 新增環境變數釘樁、devDep 淨減）未列 delta（opus）；Architecture overview 的 delta 未給確切新措辭（haiku）。
**裁定修法**：四處補齊。

## 🟢 Minority（含高信度單票／雙票，均已裁定納入 Rev 3）

> 前兩條為單票 Critical——雖未過門檻，但屬**可機械驗證的擋線硬缺陷**，直接納入修訂。

- 🚨 [1/4 — sonnet **Critical**] **verify-dist `<script` 斷言擋死 06a**：`verify-dist.mjs:76-80` 對 `dist/index.html` 含 `<script` 即 fail 是硬性斷言——inline 主題 script 一進去，`npm run verify:dist`（deploy.yml 綠燈依據）當場炸，06a 無法交付。修法：斷言改白名單比對（僅允許固定主題 script），列入 06a 工作項。
- 🚨 [2/4 — opus **Critical** + fable] **`\p{Extended_Pictographic}` 擴充會炸掉合法 emoji 前綴**：`containsPua` 同時是 UI 拒收咽喉（main.ts:245）與 `toAriaLabel` 斷言；validate.ts 明文（含釘死測試 👨‍👩‍👧‍👦）emoji 刻意放行——照 Rev 2 寫法，使用者打 emoji 前綴被拒收、舊存檔 init 崩潰。且該安全網其實不需要：icon run 結構上不可能漏 ariaText。修法：**不動 `PUA_RE`**，改 segments.test.ts 目錄級斷言（glyph 非空 ⇒ ariaText 非空）＋「emoji 前綴放行」負向測試。
- [2/4 — fable + opus] **verify-dist 字型 guard 實為 :124-165**（非 :124-155；照字面刪會語法錯誤＋`missing fonts/` 斷言殘留必炸）；「禁獨立 woff2」只是註解非斷言；:131-147 兩道與字型無關的斷言不可誤刪。
- [2/4 — fable + opus] **`powerlineArrow=false` 的 gating 未釘**：lastArrowCap 的 cap 也是 U+E0B0——需條件表：`false ⇒ 無箭頭無 cap（UI 停用）＋右 padding；true ⇒ 完整 v1 語意無 padding`。
- [2/4 — fable + haiku] **倒數格式未釘**：5h/7d 各自單位階梯（參考腳本兩套不同）、7d 時刻用 `%m/%d %H:%M`、diff≤0 與 null 的行為。
- [2/4 — fable + opus] **effort「無 effort 欄位→244 灰」是死分支**：nullPolicy=hide 使該情境整段剔除，永不可達；刪除該列、Verification「雙 fallback」改單一。
- [2/4 — opus + haiku] **powerline bar 細節**：「段恆單 run」不變量需明文退役（箭頭交接 bg 取段主色）；bar 段與 `fgOverride` 衝突（現行 fgOverride 全桶蓋色）→ 裁定 bar 段停用 fgOverride；empty run fg＝default；bar×null(dash) → 不畫格、維持 `--`。
- [2/4 — opus + haiku] **mock-data 敘述不實**：`resets_at`／`current_usage` 早已存在（含兩組 null）；真正缺的是 `cache_creation/cache_read_input_tokens` 兩欄＋四欄全 0 情境＋`CurrentUsage` 型別收緊；cache-hit 公式變數名需對應實際欄名並附 jq/ps1 實例。
- [2/4 — sonnet + opus] **排序語意與現行 4-`<ol>` 類別清單不相容**：同列段可能分屬不同 `<ol>`，`previousElementSibling` 交換做不到「同列交換」。裁定：啟用段改「依渲染列分組」呈現（列內順序＝視覺順序），未啟用段維持四類分組；moveSegment 改陣列索引運算。
- [1/4 — opus] **全段隱藏退化**：`rows=[]` 會破壞 `toAnsi([])===ESC[0m` 鎖死不變量→裁定全隱藏回傳 `[[]]`（保單一 reset），預覽保留一個具名空容器。
- [1/4 — opus] **`fontkit@2.0.4` 漏刪**（subset 腳本唯一消費者）→ 淨刪依賴改兩個。
- [1/4 — opus] **主題 toggle 雙態使「跟隨系統」不可達** → 明文「CSS 三態、UI 對外雙態」；＋[fable] D4「各頁」vs 06a-2「四工具頁」矛盾 → 裁定入口頁也放 toggle（例外條文涵蓋監聽）。
- [1/4 — opus] **預覽框 `overflow-x:auto` 是第二個鍵盤捲動區**，與「僅新增一停點」矛盾 → 預覽框亦 `tabindex="0"`，表述改「新增兩個停點」；＋[fable] 右欄容器補 `role="region"`（generic div 的 aria-label 不被朗讀）。
- [1/4 各] haiku：v1→v2 遷移 edge case 測試（缺 mode／plain→false）、localStorage key 命名慣例（`eztools-<scope>-<name>`）、S1 若改 emoji 表需使用者再核可的治理句；sonnet：git 三段植物 emoji 辨識度（🌳🌱🌿）留 S1 一併檢視。

## 🔬 Spike candidates（更新）

- **S6（新）Windows 時區控制**：`tzutil /s` 切非 UTC 後跑 percent-reset gate 與 golden——確認現行體制是「同機 oracle」還是「固定字節」，據此釘 ps1 的倒數策略（PoC：三後端對同一 epoch 的 `HH:mm` 對拍）。
- **S2（範圍修正）**：`strflocaltime` 已在生產路徑驗過，免驗；改驗 `STATUSLINE_NOW_EPOCH` 的 jq 注入形（`env.X // (now|floor)`、字串 tonumber、缺席回落）且**零 shell `date`**。
- **S1（範圍擴充）**：加入 git 三段 emoji 辨識度檢視；結論若需改表，回報使用者再核可。

## Round 2 對帳結論

Round 1 的 C1／C2／I1–I7＋14 minority：**4/4 確認全數實質解決、落點正確**（fable 逐檔核對後原話；opus/sonnet 同結論）。本輪發現集中在「文件裁決 ↔ 現行程式碼／建置管線」的最後幾條縫，其中兩條單票 Critical（verify-dist 零 JS 斷言、Extended_Pictographic 回歸）是實作前必修的擋線項，已全部裁定納入 Rev 3。

## 下一步

Rev 3 修訂寫回 PLAN 後 → `/magi:tasks`（06a 切片）。不建議第三輪（round 3+ 收益遞減；本輪已無架構級發現）。
