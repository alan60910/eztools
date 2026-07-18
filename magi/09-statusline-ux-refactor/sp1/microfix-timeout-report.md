# micro-fix 完成報告 — fixtures/pipeline real-exec timeout 加大

## 範圍聲明
只改動 `fixtures.test.ts`、`pipeline.integration.test.ts` 的 timeout 參數。
未動任何斷言、任何生產碼（`resolve.ts`／`emit-bash.ts`／`emit-ps1.ts`／
`segments.ts` 等皆未觸碰）。未 commit。

> 注：`git diff` 對 `pipeline.integration.test.ts` 會額外顯示一段
> 「rowSeparators 端到端（T1.6）」describe 區塊——該區塊是本任務開始前
> 已存在的未提交變更（另一任務的既有工作），非本 micro-fix 新增；本
> micro-fix 實際新增內容僅為：①該檔頂部 `vi` import＋一次性
> `vi.setConfig({ testTimeout: 30_000 })`；②`fixtures.test.ts` 兩個 real-exec
> `it(...)` 呼叫補第三參數 `30_000`＋各一則說明註解。

## 修法與取捨
1. **`fixtures.test.ts`**（僅兩案為真 subprocess spawn）：直接在原本失敗
   的 bash 真執行案（原 :359，現位移）與其 ps1 對應案（原 :369）的
   `it(...)` 呼叫補第三參數 `30_000`（vitest `it(name, fn, timeout)` 慣用
   形）——逐案顯式，符合「該 it 案＋同檔其他 bash/ps1 真執行案」的字面
   指示，其餘 13 案為純記憶體結構斷言（無 subprocess），不受影響、未改動。
2. **`pipeline.integration.test.ts`**（約 20+ 個 it／it.each 案皆真 spawn
   subprocess——bash+jq／powershell／pwsh／git，含多個 `it.each` 多輪次案
   如 SP7_CASES 19 案、GIT_STATES 4 案）：改用檔案級
   `vi.setConfig({ testTimeout: 30_000 })`（緊接 import 區塊之後、
   `CATALOG` 常數定義之前）取代逐案補第三參數——原因：(a) 本檔絕大多數
   case 皆屬「重量級」real-exec，逐案改動要觸及 20+ 處、容易漏改；
   (b) `vi.setConfig` 為 vitest 官方支援的檔案級 config 覆寫，只影響**當前
   測試檔**（本專案無自訂 `pool`/`isolate` 設定，見 `vite.config.ts` 無
   `test` 區塊，vitest 預設每檔隔離執行，不會外溢到其他 51 個測試檔）；
   (c) 對純記憶體案（如「比對函式自測」hexEqual 正負向、「skipIf meta」
   環境自述）僅提高其 timeout 上限，不影響其實際執行耗時，無副作用。

兩檔改法皆未變動任何 `expect(...)` 斷言或 production 程式碼，純為
timeout 數值調整。

## 驗證結果

`npx vitest run fixtures.test.ts pipeline.integration.test.ts`（單獨跑）：
```
 Test Files  2 passed (2)
      Tests  82 passed | 19 skipped (101)
EXITCODE=0
```

`npm run typecheck`：兩個 tsconfig 皆無輸出、exit 0。

**全量 `npm test` 連跑兩次**（驗收標準）：

第一次：
```
 Test Files  52 passed (52)
      Tests  1703 passed | 19 skipped (1722)
   Duration  38.63s (transform 4.09s, setup 0ms, import 7.77s, tests 183.04s, environment 18.82s)
EXITCODE=0
```

第二次：
```
 Test Files  52 passed (52)
      Tests  1703 passed | 19 skipped (1722)
   Duration  38.84s (transform 4.21s, setup 0ms, import 7.93s, tests 182.12s, environment 18.19s)
EXITCODE=0
```

兩次皆 52/52 檔通過、1703 passed／19 skipped（skip 為環境缺 pwsh 7 等既有
skipIf 條件，非本次改動所致）、exit 0——原本回報的間歇性 timeout 未再
重現。

DONE: micro-fix 完成——`fixtures.test.ts` 兩個 real-exec 案與
`pipeline.integration.test.ts` 全檔 real-exec 案的 timeout 皆提升為 30s，
`npm test` 全量連跑兩次皆 exit 0；未動斷言與生產碼，未 commit。
