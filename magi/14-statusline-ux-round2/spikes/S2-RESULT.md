# S2 — 樣例值 dump（Spike，T1.3）

magi/14-statusline-ux-round2 Milestone 1 Lane B。目的：驗證 D2′ 樣例值
合成機制（逐段以單段-enabled 的預設 config × FULL mock scenario 唯讀呼叫
既有 `resolve()`，`mode:'plain'`）在 30 段目錄上的實際輸出形狀，供 compact
目錄列版式（`☐ <段名> <樣例值>`）與 fallback 面決策使用。

**方法唯讀**：未修改 `resolve.ts`／`config.ts`／`segments.ts`／`mock-data.ts`
任何既有檔案；僅新增一個臨時 vitest 檔
`tools/statusline-builder/s2-spike.test.ts` 跑 dump，dump 完成後已刪除
（見下方「清理證據」）。

## 介面事實核對

- `defaultConfig(catalog)`：`config.ts:147` 簽章需 `SegmentCatalog` 注入
  （非零參數）——呼叫用 `defaultConfig(SEGMENT_CATALOG)`
  （`SEGMENT_CATALOG` 匯出自 `segments.ts:1053`，`catalog.test.ts:10/13`
  有先例）。
- `mode` 欄位：`BuilderConfig.mode: 'plain' | 'powerline'`
  （`config.ts:106`）——PLAN 寫 `mode:'plain'` 與實際型別/欄名完全一致，
  無差異。
- 段總數：`defaultConfig(SEGMENT_CATALOG).segments.length === 30`
  （dump 首行 `SEGMENT_COUNT=30` 為證；`catalog.test.ts:82-90` 的
  12/5/10/3＝30 分佈亦與本次 dump 逐段 `category` 欄一致）。PLAN 稱「30
  段」與實數相符，非估計值。

## Dump 機制（臨時測試檔要點）

對 `defaultConfig(SEGMENT_CATALOG)` 的每個 segment：
`structuredClone` 深拷貝 base config → `mode='plain'` → 僅該段
`enabled=true`、其餘段 `enabled=false` → `resolve(cfg, { data: FULL.data,
shell: FULL.shell, env: FULL.env, now: FULL.now })`（`FULL =
MOCK_SCENARIOS_BY_ID.full`）→ 串接所有 row 的所有 run `.text`
（即 toAnsi 前純文字；`\n` 分隔多列殘留，本次結果全為 1 列）。

執行指令與結果（收尾證據）：

```
$ npx vitest run tools/statusline-builder/s2-spike.test.ts --reporter=verbose
...
 Test Files  1 passed (1)
      Tests  1 passed (1)
```

## 全段表（30／30，依 defaultConfig 段序）

樣例文字以行內程式碼標記逐字呈現（含特殊字元）；flags：E=空字串、
C=控制碼殘留（`\x00`-`\x1f`／`\x7f`-`\x9f`）、W=emoji／CJK寬字元、
S=shell-out 段、N=非 ASCII 字元存在（供寬度留意，不等於 W）。

| id | label | category | 樣例文字（toAnsi 前） | 長度(chars) | flags |
|---|---|---|---|---:|---|
| model | 模型 | always | `model: Fable 5` | 14 | – |
| cwd | 目前目錄 | always | `cwd: /home/alan/projects/eztools` | 32 | – |
| project-dir | 專案目錄 | always | `proj: /home/alan/projects/eztools` | 33 | – |
| output-style | 輸出風格 | always | `style: default` | 14 | – |
| version | 版本 | always | `ver: 2.1.196` | 12 | – |
| cost | 費用 | always | `cost: $3.3341` | 13 | – |
| duration | 工作時長 | always | `dur: 1h23m` | 10 | – |
| lines-changed | 行數增減 | always | `diff: +120/-45` | 14 | – |
| context-size | 上下文大小 | always | `ctx: 60k` | 8 | – |
| thinking | 思考模式 | always | `think: on` | 9 | – |
| token-in | Tokens 輸入 | always | `in: 52.3k` | 9 | – |
| token-out | Tokens 輸出 | always | `out: 8.1k` | 9 | – |
| context-used | 上下文已用 | percentage | `used: 42%` | 9 | – |
| context-remaining | 上下文剩餘 | percentage | `left: 57%` | 9 | – |
| rate-5h | 5 小時限額 | percentage | `5h: 63%` | 7 | – |
| rate-7d | 7 日限額 | percentage | `7d: 21%` | 7 | – |
| cache-hit | Cache 命中率 | percentage | `cache: 45%` | 10 | – |
| session-name | 工作階段名稱 | conditional | `sess: sprint-05-statusline` | 26 | – |
| effort | 推理強度 | conditional | `eff: high` | 9 | – |
| vim-mode | Vim 模式 | conditional | `vim: NORMAL` | 11 | – |
| agent-name | 代理名稱 | conditional | `agent: reviewer` | 15 | – |
| pr | PR | conditional | `pr: #42` | 7 | – |
| repo | 儲存庫 | conditional | `repo: alanwu/eztools` | 20 | – |
| worktree | Git 工作樹 | conditional | `wt: feature-statusline` | 22 | – |
| worktree-branch | Git 工作樹分支 | conditional | `wtbr: wt-feature-statusline` | 27 | – |
| reset-5h | 5 小時限額重置倒數 | conditional | `r5h: ↺ 2h (16:00)` | 17 | N |
| reset-7d | 7 日限額重置倒數 | conditional | `r7d: ↺ 4d (07/13 08:00)` | 23 | N |
| git-branch | Git 分支 | shell-out | `git: DEV` | 8 | S |
| git-dirty | Git 髒標記 | shell-out | `dirty: *` | 8 | S |
| clock | 時鐘 | shell-out | `time: 09:05` | 11 | S |

**全段皆非空**（30/30 `empty:false`）、**全段皆單列**（`rows:1`，無多列
殘留）、**零控制碼殘留**（0/30 `ctrl:true`）、**零 emoji／CJK 寬字元**
（0/30 `emojiOrWide:true`——目錄段的 icon 前綴自 T5.12 起已全數改為
ASCII 文字前綴如 `cwd:`，FULL mock 的 `data`/`shell` 通道本身亦為
ASCII 內容，故 D2′ 合成機制在 FULL 情境下不產生寬字元樣例）。僅
`reset-5h`／`reset-7d` 含非 ASCII 字元 `↺`（U+21BA，dingbat/技術符號，
非 CJK 寬字元区段、非本次 EMOJI_OR_WIDE 正則命中範圍）——多數等寬終端
/瀏覽器字型渲染為半形，但非全稱保證，列為（c）注意事項。

## 結論

### (a) 單一 compact 版式可否容納全部

**可容納**。30 段樣例文字（不含 `☐ <段名>` 前綴）長度介於 7～33
字元，最長為 `project-dir`（33 字元，`proj:
/home/alan/projects/eztools`）、次長 `cwd`（32 字元）——兩者皆為路徑類
`always` 段，FULL mock 的 cwd 為中等長度 Linux 路徑。全部 30 段輸出恆
單列（無 `\n`），無多列殘留需要處理。單行 `☐ <段名(中文 2-9 字)>
<樣例值(7-33 字元)>` 格式在目錄側欄（PLAN D2 三欄終形右欄）的一般寬度
下可完整容納，不需要換行或截斷邏輯即可覆蓋本次 dump 全數 30 段。

### (b) 需走 default-hint fallback 的段清單

**0 段**。本次以 FULL mock scenario（`mock-data.ts` 之
`full`：「全 30 段存活」情境，見該檔情境 `note`）逐段單段-enabled
`resolve()`，30/30 段皆產出非空文字，**無段落落入 D2′ 所定義的
fallback 路徑**（resolve 為空／shell-out 死值／value-dead）。此結果與
FULL mock 情境本身「全 30 段存活」的設計意圖一致（`mock-data.ts:111`
docstring：「全 30 段存活：條件欄全在...」）——**FULL mock 情境本質上
即設計為使全部段落非死值**，故 D2′ 合成機制搭配 FULL 情境測不出
fallback 路徑本身是否正確工作；fallback 分支（default-hint 文案／
i18n）仍需獨立的正向測試（例如以 early-null／conditional-absent 情境
或直接構造空字串 mock 驗證 fallback 文案渲染），本次 S2 任務範圍
（依 PLAN D2′／brief 明文）僅要求 FULL mock，故如實回報「0 段」而非
臆測其他情境結果。

### (c) 對正式實作的注意事項

1. **deep-clone 要點**：`BuilderConfig.segments` 內每個 `SegmentConfig`
   含巢狀物件（`color`、可能的 `threshold.buckets`、`fgOverride`
   等）——單純 `{...config}` 淺拷貝或僅拷貝陣列頂層會讓多次迭代共用同一
   `color` 物件參照，若正式實作對合成 config 做任何欄位覆寫（非本
   spike 使用的「僅切 `enabled`」模式）需注意深拷貝範圍；本 spike 用
   `structuredClone(base)` 逐次拷貝，該內建函式對 `BuilderConfig`
   （純資料、無函式／circular）安全適用。
2. **mode 欄位實名**＝`mode`（非其他名稱），合法值字面
   `'plain' | 'powerline'`，PLAN 的 `mode:'plain'` 可直接照抄、無需
   映射轉換。
3. **`↺` 字元寬度未驗證**：`reset-5h`／`reset-7d` 兩段樣例含 `↺`
   （U+21BA）。本 spike 的 EMOJI_OR_WIDE 啟發式正則未涵蓋此碼位（非
   emoji 呈現區段、非 CJK 寬字元區段），多數等寬字型/終端視覺上渲染為
   半形，但未逐瀏覽器/字型實測——若正式 compact 版式要對齊欄寬（如
   固定寬度容器），建議把此碼位一併納入寬度檢核或直接以視覺驗收（非
   純程式判定）收斂，不建議假設半形零風險。
4. **路徑類段在真實使用情境可能遠超本次樣本長度**：`cwd`／
   `project-dir` 在 FULL mock 為中等長度 Linux 路徑（32/33 字元）；
   `mock-data.ts` 另有 `windows-cjk` 情境（brief 範圍外、未在本次 dump
   使用）其路徑遠長於此（反斜線深層路徑＋CJK）。compact 版式若僅以
   FULL 情境的最長值（33 字元）設計欄寬／截斷閾值，遇真實使用者的長
   Windows 路徑時仍可能溢出——**此為 out-of-scope 觀察**（brief 明訂
   dump 僅用 FULL mock），留供正式實作階段（D2′ 落地）決定是否需要
   截斷/省略號策略，不在本 spike 內處理。
5. **合成機制與正式 D2′ 描述完全同構**：本 spike 未發現 dump 機制與
   `resolve()` 既有渲染語意（`seg.enabled` 閘門、`nullPolicy`／
   `isValueDead`／`expiresAtPath` 死值判定鏈）有任何落差——「單段-
   enabled」的构造方式（其餘段 `enabled:false`）不影響目標段本身的
   resolve 邏輯（各段互相獨立求值、`groups` 分桶鍵僅 `row`，單段場景
   恆落單一 row／單一渲染列），驗證 D2′ 設計描述可行、無需修正。

## 清理證據

臨時測試檔 `tools/statusline-builder/s2-spike.test.ts` 已刪除；刪除後
執行完整 `npm test`：

```
$ npm test
...
 Test Files  57 passed (57)
      Tests  1843 passed (1843)
   Start at  20:58:47
   Duration  107.91s ...
```

`git status --porcelain` 覆核（僅本 sprint 既有的
`magi/14-statusline-ux-round2/` 目錄，無任何出貨程式碼或其他臨時檔殘留）：

```
$ git status --porcelain
?? magi/14-statusline-ux-round2/
```
