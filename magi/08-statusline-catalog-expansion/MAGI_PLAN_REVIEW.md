# 🧠 MAGI Plan Review — Statusline Builder 目錄擴充（06c）＋前置加固

**Sprint:** magi/08-statusline-catalog-expansion/ • **Document:** PLAN.md（Rev 2）
**Round:** 2（聚焦複審） • **Date:** 2026-07-12 • 前輪報告：MAGI_PLAN_REVIEW-round1.md

## Dashboard

```
┌──────────────────────────────────────────────────────────┐
│  VERDICT: REQUEST-CHANGES（3 RC ／ 1 APPROVE）            │
├──────────────────────────────────────────────────────────┤
│  Mode: majority      Threshold: vote_sum > 2.0           │
│  OK weight: 4 / 4    Degraded: no                        │
├──────────────────────────────────────────────────────────┤
│  ❌ claude:fable(RC)  ❌ claude:opus(RC)                  │
│  ✅ claude:sonnet(APPROVE)  ❌ claude:haiku(RC)           │
├──────────────────────────────────────────────────────────┤
│  🔴 Critical: 0     🟡 Important: 1（adopted）           │
│  🟢 Minority: 11（内 3 項經協調者對碼查證屬實）           │
│  🔬 Spikes: 1       ❎ 誤報折抵: 3                       │
└──────────────────────────────────────────────────────────┘
```

> ⚠️ 陣容揭露：同 round 1——claude 家族四模型，同 vendor、無跨 vendor 驗證。

## Round 1 issues 解決狀態（四票交叉認定）

| R1 | 狀態 | 認定 |
|---|---|---|
| C-1 emoji→前綴對帳 | ✅ 實質解決 | fable／opus／sonnet 三票明文確認（前綴無碰撞、死敘述 deltas 齊、失效引用清理） |
| C-2 ps1 跳脫 | ◐ 半解 | idiom 正確；**配套「全腳本純 ASCII」斷言與現行輸出矛盾**（→ 本輪 adopted） |
| I-1 jsdom 宣告 | ✅ 實質解決 | D-d 論證＋smoke 前置＋回退路線；「5 處無 jsdom 註解」經 grep 屬實 |
| I-2 CLAUDE.md delta | ✅ 實質解決 | haiku「未實際套用」為流程誤解（見誤報折抵） |
| I-3 SegmentCatalog 注入面 | ◐ 半解 | barEligibleIds 可導出；**autoEligibleIds 無 descriptor 承載**（→ minority O5，建議採） |
| I-4 bar 4-run 邊界 | ◐ 半解 | run 文字形釘死；**emitter 累加器粒度未追到 join 迴圈**（→ minority O1，協調者查證屬實） |

## Verdict
**REQUEST-CHANGES**（3/4）。Rev 2 的六項 round 1 修法方向全數正確、
三項完全閉合；剩餘缺口集中在「契約沒有往下追到 emitter 取值／join 層」
——全部屬局部文字修訂級，無架構重工。fable 明示：Rev 3 修訂後可由使用
者裁決逕進 `/magi:tasks`，毋須完整 round 3（§7.5 round 3+ 邊際效益
遞減）。

## 🟡 Important (adopted)

### A-1. [vote: 3/4 — fable＋opus＋haiku][R1:C-2] 「產出腳本恆純 ASCII」斷言照寫必紅；跳脫應用路徑未 trace
- **協調者查證屬實**：golden `plain-full.ps1` 檔頭即含 CJK 註解
  （`# Claude Code statusline — 由 EZTools statusline-builder 產生`）、
  多列 golden 有 `# ── row k（row=…） ──`；且契約 8 明文保留使用者
  prefix 以 UTF-8 字面嵌入（DRIFT backlog）。「覆蓋全部 emitter 輸出」
  的機械化斷言第一次執行即紅，developer 被迫臨場二擇一（弱化護欄或
  未經裁決的註解 ASCII 化＋golden 範圍擴張）。haiku 補角度：`█░↺` 在
  值路徑的 `[char]` 建構點未示範，易誤寫成 TS 字面直出。
- Suggested fix（三票收斂）：不變量精確定義為「**引擎自行產生的字面**
  （icon glyph、分隔符、bar／倒數值字面）恆純 ASCII」；斷言排除註解行
  與使用者 prefix 通道（標注既有 DRIFT）；§4 補一句 bar／倒數字面在
  emit-ps1 的建構點（比照 `iconGlyphExpr` 以 `[char]` 串接）。

## 🟢 Minority — 協調者對碼查證屬實（建議 Rev 3 採納）

1. **[1/4 opus，Critical 級][R1:I-4] bar 4-run 撞 emitter powerline
   join**——查證：`emit-bash.ts:370-374` powerline join 對**每個累加器
   元素**插 `$ARROW`，且 `segstart` 邊界陣列僅 plain 路徑存在
   （`:508`）；「powerline 每段恰一元素」是隱性契約。bar 照 4-run 逐
   run push → 段內吐 3 個箭頭；ps1 同構。修法：powerline 兩後端把
   4 run 的 SGR 編碼**併單一累加器元素**（byte 等價 oracle 逐 run
   序列）、bash-plain 走 `segstart` 1/0/0/0；S4 依「bash/ps1 ×
   plain/powerline」四格分別出手寫 bytes。
2. **[1/4 opus，Critical 級] cache-hit（含 token-in／out）主值形未釘**
   ——查證：ps1 percentage 路徑 `$p = [double]$v`（emit-ps1.ts:468），
   多欄位段既有慣例是「取節點＋FormatKind 算」（如 context-size
   `emit-ps1.ts:236`）；沿慣例則 resolve 閾值閘（要求 number）靜默
   關閉、ps1 對物件轉型中止、bash 印整包 JSON。修法：釘死
   「percentage 類主值型別契約＝`number | null`」，公式落 tri-path
   取值層（jq 單一運算式／ps1 helper 算出數字）。
3. **[1/4 fable] now 注入（main.ts 真時鐘）× mock 固定 epoch → 新倒數
   段預覽恆隱藏**——查證：mock `resets_at` 為固定 epoch
   1783497600／1783900800／1783501200（≈2026-07-08〜12，已過期），配
   `expiresAtPath`「now ≥ 值 → hide」規則，四個 mock 情境的預覽中
   reset 段永不可見，且預覽輸出非決定論；並漂移傘狀原文「now 注入：
   mock 情境給定值」。修法：`MockScenario` 增固定 `now` 欄、
   `resets_at` 改相對 now（如 now+2h／now+3d），預覽／單元測試全走
   情境 now；真時鐘僅留給未來非 mock 輸入。

## 🟢 Minority — 其餘（未過票，供裁決）

4. [1/4 opus][R1:I-3] `autoEligibleIds` 無 descriptor 導出依據；「套
   model 還是 effort 色票」無承載欄——id 特判會在 resolve/emit 復活。
   修法：`autoColor?: { palette: 'model'|'effort'; key?: TriPath }`
   單欄承載（colorKey 併入），集合＝有此欄之段。
5. [1/4 opus] auto 的 emitter 執行期形未定——powerline 下 bg／箭頭
   交接尾／autoFg 皆為執行期值（現行 `segBg`／`bgTail` 是 emit 期
   常數）；有閾值段平行陣列先例可抄但未寫成契約；bash `case`（glob）
   vs ps1 `-match`（regex、大小寫不敏感）比對語意不同構——建議釘
   「對 model.id 大小寫敏感前綴比對」（ps1 `-clike`／`StartsWith`）；
   S4／golden 補 `auto × powerline`（arrow／noarrow）。
6. [1/4 opus] token-in／out 的 `--`（dash）政策在兩支 emitter 無對應
   分支——emitter 按 category 分派，非 percentage 段的 dash 會被走
   hide 路徑，byte-exact 必炸。修法二擇一：emitter 分派改 nullPolicy
   驅動（`emitOther` 增 dash 分支）或 token 段改 hide 政策。
7. [1/4 opus，**部分誤報**] 新色票用 ANSI 0–15 與 color.ts 立場衝突
   ——協調者核對：**auto 色票 0–15 為傘狀明文裁決**（「基本色 index
   可被終端主題覆寫屬刻意選擇」，06 PLAN §D5），此半誤報；惟閾值
   10-tuple 建議值的綠黃紅（2/3/1）與既有 4 套模板全走色立方／灰階的
   值域慣例不一致，屬實——建議模板改色立方（如 34/220/196），auto
   維持裁決。
8. [1/4 fable] golden「僅新段變因」宣稱與 InvariantCulture 順修衝突
   ——改列舉式變因白名單（新段＋Format-ResetsAt 順修＋視 A-1 裁決）。
9. [1/4 fable] 倒數段 `↺` 的 ariaText 政策未釘（非 PUA、enforcement
   不攔）——顯式代換（如「重置 2h (14:30)」），與 icon 慣例同軌。
10. [1/4 haiku] D-d smoke 驗收標準質化——釘客觀門檻（基準時間、
    +10% 上限、最小 jsdom 測試檔內容、洩漏檢查步驟）。
11. [1/4 haiku] SegmentCatalog 介面變更可預先示意型別 delta（弱項；
    In-scope 已列，補一行介面草簽即可）。

## ❎ 誤報折抵（協調者裁定不採）

- [haiku ×2] 「CLAUDE.md／TECHSTACK delta 宣告了但檔案未改」——magi
  流程語意即如此：`## Spec deltas` 是**宣告**，實改發生在實作期、由
  `/magi:commit` §2.5 對帳驗證。PLAN 階段不動 root docs。
- [haiku] SPEC Status 更新時序提醒——同上，commit 期執行，非缺陷。
- [opus，半項] auto 色票 0–15 值域（見 minority 7 拆解）。

## 🔬 Spike candidates

- **[opus] ps1 端 `STATUSLINE_NOW_EPOCH` 注入／回落 idiom**——
  `[long]$null` 靜默＝0（不擲例外）、`[long]''` 才擲例外；jq 心智模型
  直翻會拿到 epoch 0 或腳本中止。Validation：併入 S2／S6 出三路案
  （未設／合法／非數字）×{PS 5.1, pwsh 7}，釘顯式
  `IsNullOrEmpty` 分支 idiom。

## Round／triage 註記（§7.5）
Round 2。無架構級（a 類）議題；adopted 1 項＋查證屬實 minority 3 項＋
可低成本收斂 minority 7 項皆為契約文字修訂（b 類偏上緣：會改變實作／
驗收結果，值得回 PLAN 而非留 tasks）。依 §7.5 與 fable 建議：**Rev 3
修訂後逕進 `/magi:tasks`，不再跑 round 3**——sonnet 本輪已 APPROVE，
剩餘項均有明確收斂方向，第三輪邊際效益低。
