# 🧠 MAGI Code Review — DEV @ 5147cc1（sprint 10 未提交工作樹）

**Diff scope:** 未提交變更 vs HEAD（含 `git add -N` 之新檔）——24 files, +1853/−331（2548 行）

## Dashboard

```
┌──────────────────────────────────────────────────────────────┐
│  VERDICT: APPROVE-WITH-NITS                                  │
├──────────────────────────────────────────────────────────────┤
│  Mode: majority      Threshold: vote_sum > 2.0               │
│  OK weight: 4 / 4    Degraded: no                            │
├──────────────────────────────────────────────────────────────┤
│  ✅ fable-5（AWN） ✅ opus（AWN） ✅ sonnet（AWN） ✅ haiku（APPROVE）│
├──────────────────────────────────────────────────────────────┤
│  🔴 Critical: 0     🟡 Important: 1                          │
│  🟢 Minority: 12    Untested paths: 5                        │
└──────────────────────────────────────────────────────────────┘
```

> ⚠️ 同 vendor 湊票揭露：四票皆 claude 系模型，無跨 vendor 驗證。
> 本輪各票實證量高：storage/matchMedia 分支逐行比對（fable／sonnet）、
> 遷移階梯新舊語意逐層核實與終止性推導（fable／opus／sonnet）、
> `git ls-files --eol` 與二進位盤點對帳（opus）、CRLF 修根因獨立實證（opus）。

## Verdict

**APPROVE-WITH-NITS** — 零 Critical。唯一過門檻的採納項是測試覆蓋缺口
（多步遷移串接），其餘皆單票 Note 級。

> **修復狀態（2026-07-18，使用者裁決「修採納項＋高價值 nits」）：**
> 🟡-1 與 🟢-1/3/4/5/6/11/12 共八件已修畢（見 WORKS「nits 修復批」，
> gate 1819/1819 全綠）；🟢-2 已於 review 當場以簿記收口；未修遺留＝
> 🟢-7（Non-Goals 敘事 vs regex 四項變更，文件一致性）、🟢-8（不可達
> 分歧）、🟢-9（gitattributes 順序地雷）、🟢-10（canary 重複註記）——
> 皆為零行為影響之觀察級。四票一致確認：v1 遷移新舊語意
等價、while 鏈必然終止、verify-dist 對真 dist byte 級凍結、inline/module
雙軌分支語意一致、`.gitattributes` 盤點與實況吻合、跨 sprint 一行修恰在
授權範圍。可安全進入 `/magi:commit`。

## 🔴 Critical (adopted)

（無）

## 🟡 Important (adopted)

- **[vote: 3/4 — fable(1)+opus(1)+sonnet(1)] `migrateConfig` 多步串接（while ≥2 次迭代）零自動化覆蓋**
  - Where: tools/statusline-builder/config.ts:446-456
  - `MIGRATION_STEPS` 現僅鍵 `1`，所有新測試只走「單步」或「零步（缺步進
    退預設）」；「連續步進 ≥2 次」的接力路徑——G2 存在的核心意義——目前
    只有人工推導（sonnet 已展開兩步假想情境驗證 `version` 外層強制覆寫的
    寫法穩固），無任何測試真的走過。v3 首次 bump 時 canary 是唯一警報。
  - Suggested fix（sonnet）：以測試內注入假步進表（兩筆假 step）直接斷言
    連續兩次步進後版本與欄位正確落地，不必等真 bump。

## 🟢 Minority（未過門檻；依嚴重性排列）

1. [1/4 fable-Important] **註解剝除越界豁免**：`extractInlineScripts` 先全文剝
   `<!--...-->` 再擷取——`<!--` 位於 script body **內部**時，剝除區間會跨越真實
   `</script>` 邊界，把後續**實際會執行**的 `<script>` 一併吞成註解；殘餘拼接
   若恰合白名單即綠燈放行。舊版無此弱化，且超出 Non-Goal (ii)「不執行故不管制」
   的前提。觸發需刻意畸形 dist，實務風險低。修法：containment 判定（僅豁免
   整個 tag 落於註解區間內者）或補「擷取出的 body 含 `<!--` 即紅」護欄＋釘死案。
2. [2/4 fable+sonnet] TASKS 勾選 vs 手動 smoke 未執行的落差、遞延無 durable
   落點——**已由協調者於本輪當場收口**（TASKS.md M2/T4.3 補遞延註記；
   BACKLOG「真機驗收批」條目併入 sprint 10 三項）。
3. [1/4 sonnet-Important] `initThemeSync` 兩段 try/catch「互不影響」的測試空洞
   ——假 window 連 `addEventListener` 都沒有，兩段同時失敗，無法區分「獨立
   try/catch」與「合併 try/catch」兩種寫法；也不貼近 Safari <14 實況（window.addEventListener
   存在、僅 MQL 缺席）。修法：fake 保留 storage 捕捉面、僅 MQL 缺 addEventListener，
   並斷言 storage 監聽仍生效。
4. [1/4 fable] canary／T3.2 斷言用 `toEqual`——對「欄位留成 undefined」型部分
   損失盲視；`toStrictEqual` 一字補滿 PLAN「整份 deepEqual」宣稱粒度
   （fixtures.test.ts:117、config.test.ts:322、:363）。
5. [1/4 fable] index.html 註解兩處（:17、:40）仍指向舊位置「scripts/verify-dist.mjs
   的 ENTRY_ALLOWED_INLINE_SCRIPTS」——白名單已遷 checks 模組，與 CLAUDE.md
   新句矛盾；修時僅動 HTML 註解、須保持 CRLF。
6. [1/4 opus] theme-inline.test.ts 自寫抽取不剝註解、只抓第一個 `<script>`——
   現況安全（已核 index.html 註解無 `<script` 子字串），日後註解含字面
   `<script>` 例示會靜默抓錯；補 sentinel 斷言（如 body 含 `eztools-theme`）即可。
7. [1/4 opus] regex 實含四項變更（`\b`、`</script\s*>` 亦收緊），Non-Goals 敘事
   只列兩項豁免——皆 PLAN W3 字面授權、對真 dist no-op，純文件一致性。
8. [1/4 opus] `migrateConfig` 對 `version === CONFIG_VERSION` 的早退路徑與舊版
   語意分歧（舊回 default、新走 sanitizeCore）——**不可達**（唯一呼叫端已守）、
   非 export，記隱伏面。
9. [1/4 sonnet] `.gitattributes` 順序地雷：golden `-text`（前）會被 `*.jsonl eol=lf`
   （後）覆蓋——若未來 golden 用 `.jsonl`。現況零影響；補註解或調序。
10. [1/4 sonnet] canary(a) 於現況與既有往返冪等案完全重複（設計如此——價值在
    bump 後分岔）；標題/註解補「現況等價、bump 後分岔」防未來誤刪。
11. [1/4 sonnet] `MIN_WASM_BYTES` 測試檔重複硬編未共用 export——失準時顯性紅，
    風險可控；export 共用可消。
12. [1/4 fable] CLI 殼兩個邊角：成功路徑顯式 `process.exit(0)` 在 Windows pipe
    下有輸出截斷邊角（改 `process.exitCode` 零成本更凍結）；guard 在
    `argv[1] === undefined`（REPL 動態 import）時模組求值即拋錯，與檔頭
    「可 import 呼叫 main()」敘述不符。

## Untested paths

- `migrateConfig` while 多步串接 — fable＋opus＋sonnet（＝上方 🟡 採納項）
- `verify-dist.mjs` `main()` 零參數預設路徑（`import.meta.dirname` 推導）—
  fable＋opus＋sonnet；煙霧案恆帶顯式參數，零參數路徑僅本機手動 `npm run verify:dist` 保證
- `checkToolPageSkeleton`「tool 目錄存在但 index.html 缺失」分支 — opus
- inline script 的 matchMedia 掛載失敗降級分支 — fable（module 版有測、inline 版無）
- `.gitattributes` 規則本身無自動化回歸（renormalize 零 diff 為一次性手動實證，WORKS 有記）— fable

## ⚠️ Degraded mode

無降級（4/4 成功）。
