# Claude Code Statusline 產生器（statusline-builder）

> Sprint: magi/05-statusline-builder/ • Artifact: PLAN.md（**r2.1**）
> 分類：feat / major • 2026-07-07
> 沿革：r1 → round 1 panel review（REQUEST-CHANGES 5/5，3C＋25I）→
> r2 折入全部採納項 → round 2（APPROVE-WITH-NITS 5/5，11I＋10N nits，
> 見 MAGI_PLAN_REVIEW.md）→ r2.1 折入全部 nits（本版）。

## Context

Claude Code 的自訂 statusline 需要手寫 shell 腳本（解析 stdin JSON、拼
ANSI 色碼、null 防禦），門檻高且易錯。本工具提供純靜態設定頁：勾選
segment、拖曳排序、選顏色、設定百分比閾值變色，即時預覽，一鍵產出
bash（`.sh`）與 PowerShell（`.ps1`）腳本＋ `settings.json` 片段。

第四個工具（PRD Goals 增列＋Problem 調和，見 Spec deltas）。零 runtime
npm 依賴、無 worker、無 wasm——複雜度集中在「三個輸出後端的語意一致性」
「執行期 join」與「產生程式碼的 escaping 正確性」。

### 使用者拍板記錄
- r1 前（2026-07-07）：PLAN.md artifact；bash 依賴 jq＋缺件提示；顏色
  雙軌（ANSI 256＋truecolor）；**納入 Nerd Font subset**。
- r1 後（2026-07-07）：修訂後再審 round 2；**v1 範圍＝全 25 segment**
  （panel 收斂建議被否決）。連動裁定（coordinator，依 r1 傾向）：
  Q4 自訂前綴**進 v1**；閾值模板四套全留；Q1 批准（提供「末段不收
  箭頭」選項、預設收）；Q2 批准（自訂分隔符／前綴 ≤8 字元、正面表列
  可列印字元）；Q3 綁 SP-2。
- r2 後（2026-07-07）：round 2 AWN 5/5，21 項 nits 全數折入 r2.1；
  nit #9 CI 阻擋機制拍板＝**deploy.yml build job 補 windows test
  leg**（部署路徑自帶跨平台 gate，不依賴 branch protection 設定）。

## Goals & Non-Goals

### Goals
- Segment 目錄全覆蓋：stdin JSON 可顯示欄位（F1）＋shell-out 類
  （git branch／git-dirty／時鐘），**v1 全 25 個**
- 勾選啟用＋拖曳排序（鍵盤等效）＋每 segment 選填前綴文字（≤8 字元）
- 顏色：ANSI 256 色盤＋truecolor hex 雙軌＋「終端預設（不著色）」三態；
  plain 模式著前景、powerline 模式著背景（fg 自動對比、可覆寫）
- 百分比閾值變色：4 個百分比 segment；模板 4 套（traffic／traffic-inv／
  cool-warm／mono-fade）＋自訂每 10% 一段（10 桶）
- 分隔符：純文字集＋自訂（≤8）＋powerline 箭頭模式（末段收尾可關）
- 終端模擬預覽：ANSI→CSS、深淺底、self-host Nerd Font subset、
  mock 情境切換；**icon／powerline 啟用時常駐提示「圖示需使用者終端
  安裝 Nerd Font」**
- 產出：`statusline.sh`（bash＋jq）、`statusline.ps1`（PS 5.1＋pwsh 7
  雙相容）、`settings.json` 片段（Windows 用 ExecutionPolicy wrapper 形）；
  Blob 下載＋剪貼簿複製
- 設定 localStorage 自動保存（drop-unknown 清洗，見契約）

### Non-Goals（backlog 候選）
- 多行 statusline；OSC 8 超連結；URL hash 分享；`subagentStatusLine`；
  匯入反解析；純 bash 無 jq fallback（已拍板不做）；schema 追版自動化
  （人工重核 checklist 見 Spec deltas / README 基準版註記）；powerline
  箭頭形選擇（v1 固定 U+E0B0，minority 紀錄）

## 已查證事實

> F1–F9 來源：官方文件轉述（claude-code-guide agent，2026-07-07；文件
> 宣稱基準 v2.1.196，changelog 實讀至 v2.1.169——**兩者間 27 個 patch
> 未複核**）。F10 為本機 sprint 01–04 實證。F11–F14 為 round 1 事實
> 查核鏡頭之領域複核（比轉述強、仍需 SP 實證處已標）。
> **轉述級事實一律以 SP-0 真機擷取 fixture 為最終權威**；⚠ 為已知
> 高風險待驗項。

- **F1（stdin JSON 欄位）**：
  - 永在：`cwd`、`session_id`、`transcript_path`、`version`、
    `model.{id,display_name}`、`workspace.{current_dir,project_dir,
    added_dirs}`、`output_style.name`、`cost.{total_cost_usd,
    total_duration_ms,total_api_duration_ms,total_lines_added,
    total_lines_removed}`、`context_window.{total_input_tokens,
    total_output_tokens,context_window_size,used_percentage,
    remaining_percentage,current_usage}`、`exceeds_200k_tokens`、
    `thinking.enabled`
  - 欄位在、值可 null：`used_percentage`／`remaining_percentage`、
    `current_usage`。⚠ **nullability 時序**（「首次 API 回應前」「
    `/compact` 後」）為轉述級行為宣稱，SP-0 複核。
  - 條件性（缺席＝狀態不成立）：`session_name`、`prompt_id`
    （⚠ 版本歸屬「v2.1.196+」超出 changelog 實讀視窗）、
    `workspace.git_worktree`、`workspace.repo.{host,owner,name}`、
    `effort.level`（⚠ enum 集）、`rate_limits.{five_hour,seven_day}
    .{used_percentage,resets_at}`（⚠ Pro/Max＋首次回應後）、
    `vim.mode`（⚠ enum 集）、`agent.name`、`pr.{number,url,
    review_state}`、`worktree.{…}`。⚠ `workspace.git_worktree` 與
    top-level `worktree` 疑似重複表述，SP-0 以真檔判定，防幽靈 segment。
- **F2（須 shell-out）**：git branch／dirty、目前時間、環境變數；
  終端寬度由 `COLUMNS`/`LINES` env 提供（v2.1.153+）。
- **F3（行為契約）**：只取 stdout 第一行；stderr 忽略；**非零 exit＝
  整條空白**；300ms debounce；新觸發取消執行中腳本；於 cwd 執行。
- **F4（設定面）**：`statusLine: {type:"command", command, padding?,
  refreshInterval?, hideVimModeIndicator?}`；refreshInterval 最小 1 秒。
  ⚠ Windows command 確切呼叫形 SP-2 定（見 F13）。
- **F5（ANSI）**：完整 ANSI escape 支援。
- **F6（v2.1.132 breaking change）**：`total_input/output_tokens` 由
  累計改「當前 context」——僅支援現行語意。**此例證明 `// empty` 只防
  presence-drift、不防 semantics-drift**；後者無自動防護，依賴目錄
  描述文字鎖現行語意（契約明記）。
- **F7（null 防禦為官方建議）**：官方範例即用 jq fallback。
- **F8（jq 依賴）**：官方 bash 範例依賴 jq；PowerShell 內建
  `ConvertFrom-Json`。
- **F9（repo 慣例）**：`tools/<slug>/`＋`src/tools.ts` 登記；純邏輯
  模組 node 可測（不 import DOM runtime）；a11y 不變量見 root SPEC。
- **F10（本機實證）**：PS 5.1 讀無 BOM UTF-8 原始碼以 ANSI 解讀 →
  **`.ps1` 下載 Blob 必帶 UTF-8 BOM**（檔案來源編碼）；PS 5.1 無
  `?:`／`??`／`?.`／`` `e ``。
- **F11（領域複核，PR1）**：`[System.Text.Encoding]::UTF8` 靜態屬性
  為**帶 BOM** 之 UTF8Encoding——設為 `[Console]::OutputEncoding`
  可能在 piped stdout 開頭噴 `EF BB BF`。**輸出編碼必須用無 BOM 建構式
  `UTF8Encoding($false)`**（與 F10 檔案 BOM 是兩個不同的 BOM）。
  SP-2 斷言 stdout 開頭無 BOM bytes。
- **F12（領域複核，PR1）**：瀏覽器下載之 `.ps1` 帶 Zone.Identifier
  （Mark-of-the-Web），預設 ExecutionPolicy（Restricted/RemoteSigned）
  下**未簽名網際網路腳本被拒執行**→statusline 靜默空白。settings
  預設採 wrapper 形（見產生器契約 9）；SP-2 必測「經工具實際下載」
  的產物。
- **F13（領域複核，PR1）**：`date -r N` 於 macOS 為 epoch 格式化、於
  GNU/Git-Bash 把 N 當檔名而失敗→fallback `date -d @N`（順序正確）；
  jq 之 `strflocaltime` **視 build 而定**（版本／平台 build 差異、確切
  輸入形——epoch 直吃或先 `localtime`——皆 SP-2 實證後才可採）。
- **F14（領域複核，PR1）**：Nerd Fonts 為授權異質聚合體——powerline
  U+E0B0–E0B3／branch U+E0A0 之**碼位**出自 Powerline 專案（MIT）；
  簽入**字形輪廓**之授權依 subset 來源字型而定（SP-1 逐來源釘）；
  Codicons＝CC-BY-4.0（需署名）；Pomicons／品牌圖示有再散布限制；
  OFL 字型**若宣告** Reserved Font Name 則 subset 須改名散布。
  → SP-1 採**授權驅動選取**。

## Design options considered

### D1. 三後端一致性架構（r2 修訂）
採「單一決策核心＋三後端」：閾值分桶、顏色解析、格式化、join 語意以
TS 純函式單源（`resolve.ts`＋`segments.ts` 目錄描述子）；DOM 預覽直接
呼叫；bash/ps1 emitter 產生鏡像同語意的程式碼。**r2 承認的邊界**：
resolve 是宣告式（對 mock 一次算完）、emitter 是執行期算式（存活段
執行期才知）——兩者在「join／轉場」層天然分岔，因此 (1) join 演算法
單獨立契約（見「執行期 join 契約」）、(2) 以阻斷級 SP-5 先證兩 shell
可實作且與 resolve 對等、(3) 一致性斷言鏈＝黃金檔（防漂移）＋真執行
（環境×後端 gate 矩陣）＋`emit-ansi.ts` oracle（比對基準）。
取值路徑以 **tri-path 描述子**並置（型別契約）——並置利人審與型別
綁定，**非機械交叉驗證**：jqPath/ps1Path 的取值正確性只有真執行覆蓋
（§3＋SP-7），因此 SP-0/mock 契約附**欄位多樣性要求**：每個描述子的
來源欄位在 canonical fixture 集中至少一個情境呈現相異且非 null 值，
使 item-3 對每條路徑可觀測（打錯 path 不得靜默通過）。StatusData 為
真 stdin JSON 的忠實 typed mirror（不改名、不扁平化），mock 可 1:1
序列化餵腳本。

### D2. 閾值程式碼生成（r2 修訂）
10 元素色碼陣列＋`idx = max(0, min(floor(p/10), 9))`（**上下界皆
clamp**）。floor 取整落點：**bash 端由 jq 完成**（bash 不做浮點）、
ps1 `[math]::Floor`、TS `Math.floor`。模板＝預填陣列，自訂＝逐段改。
powerline＋閾值時**成對 auto-fg 陣列**：emit 期以 TS 亮度函式預算
10 桶各自的黑/白（或 fgOverride），emit 平行 fg 陣列，**執行期只索引、
零亮度數學**（三後端亮度判定不可能分岔）。

### D3. powerline 模式邊界（r2 修訂）
雙模式切換不變。轉場箭頭著色屬執行期 join 契約（fg=前存活段 bg、
bg=後存活段 bg、末段對終端底色 reset；`lastArrowCap: false` 時末段
不收箭頭）。mode 切換時 **color 值保留不重映射**（plain 的 fg 值切到
powerline 變 bg 語意），UI 於切換後經 live region 播報「顏色語意已
翻轉，請檢視預覽」。

### D4. 字型資產（r2 修訂）
簽入 subset woff2 至 `tools/statusline-builder/fonts/`＋
`fonts/LICENSE-nerd-fonts.md`（逐來源全文授權）＋`fonts/README.md`
（**glyph 碼位凍結表＋來源字型確切版本＋subset 再生指令**——耐久
歸屬，WORKS 另記工序）。SP-1 授權驅動選取（F14）。dist 落點以一次性
build 實測後才寫 verify-dist 斷言（Vite 會把 CSS 引用資產雜湊搬
`dist/assets/`）。

### D5. 產出腳本自足性
單一自足腳本（設定內嵌常數，無外部設定檔）。不變。

### D6. 256 色盤元件 pattern（r2 新增，SP-6 M1 早期定案）
radiogroup 一維 roving 對 256 色不可用（架構風險，不壓到 sprint 尾）。
候選：(a) `role=grid` 2D 方格（上下左右導覽）；(b) 16 基本色 swatch
＋0–255 spinbutton（即時預覽色）；(c) listbox 分區（16 基本／色立方
分帶／灰階）。**SP-6 定案（2026-07-08 量測後 coordinator 終裁）：採
(b)**——worst 恆 4 鍵、唯一內嵌可行（a/c 每實例 257+ 元素強制 popup）、
觸控無虞、aria-valuetext 承載命名；NVDA 覆核歸 T4.4（不過則回退
(a)＋共用 popup）。量測全文見 .t17-report.md。
命名一律「ANSI 索引＋hex」（如 `ANSI 137 #af8787`），不強造中文色名
（SP-4 據此簡化）；觸控目標 ≥24×24 CSS px（WCAG 2.5.8）。

## Recommended approach

### 模組切分（`tools/statusline-builder/`）
```
index.html / style.css / main.ts    工具頁骨架＋UI 狀態機（browser-only；
                                    localStorage 讀寫在此層）
segments.ts     segment 目錄：tri-path 描述子＋格式化純函式（node 可測）
color.ts        ColorSpec、ANSI256↔hex 表、亮度對比、ANSI 組碼（node 可測）
threshold.ts    閾值規則、4 模板、clamp 索引、auto-fg 預算（node 可測）
config.ts       BuilderConfig 型別＋serialize/deserialize/migrate/清洗
                純函式（node 可測；不碰 localStorage）
resolve.ts      決策核心：config＋StatusData→StyledRun[]（node 可測）
emit-ansi.ts    StyledRun[]→ANSI 字串 oracle（獨立於 emitter 組碼；
                item-3 比對基準；node 可測）
emit-bash.ts / emit-ps1.ts / emit-settings.ts   三產生器（node 可測）
validate.ts     輸入驗證（拒收集 R；node 可測）
mock-data.ts    SP-0 真機 fixture 派生的情境集（node 可測）
render-preview.ts   StyledRun[]→DOM（browser-only）
fonts/          woff2＋LICENSE-nerd-fonts.md＋README.md（碼位凍結表）
fixtures/       SP-0 真機 stdin dump（canonical）
*.test.ts       vitest＋簽入黃金檔 __golden__/
```

### 型別契約（節錄，實作以此為準）
```ts
type ColorSpec =
  | { kind: 'default' }                    // 終端預設（UI 三態之一）
  | { kind: 'ansi256'; index: number }     // 0–255（clamp）
  | { kind: 'truecolor'; hex: string }     // '#rrggbb'（驗證）

interface ThresholdRule {
  buckets: readonly [ColorSpec, ColorSpec, ColorSpec, ColorSpec, ColorSpec,
                     ColorSpec, ColorSpec, ColorSpec, ColorSpec, ColorSpec]
  // 10-tuple＝型別級恆長保證；buckets[i] 覆蓋 [i*10,(i+1)*10)
  // idx = max(0, min(floor(p/10), 9))
}
// 模板：'traffic'|'traffic-inv'|'cool-warm'|'mono-fade' ＝預填陣列。
// powerline 下 emitter 另以 TS 亮度函式預算平行 autoFg: ColorSpec[10]
// （fgOverride 存在時全桶用之）；執行期只索引。

// tri-path 描述子——三後端取值語意的單一事實來源
interface SegmentDescriptor {
  id: SegmentId
  label: string                    // UI 顯示＋控件 accessible name
  category: 'always'|'percentage'|'conditional'|'shell-out'
  tsPath: (d: StatusData) => unknown   // resolve 取值
  jqPath: string                   // bash emitter 取值（jq 語法）
  ps1Path: string                  // ps1 emitter 取值（屬性鏈）
  format: FormatKind               // 格式化規則鍵（見格式化對等規則）
  icon?: { glyph: string; ariaText: string }  // PUA 碼位＋SR 文字等價
  nullPolicy: 'dash'|'hide'|'empty'    // null 三態（見產生器契約 3）
  variants?: readonly string[]     // 允許集（目錄衍生，非自由字串）
}

interface SegmentConfig {
  id: SegmentId
  enabled: boolean
  icon: boolean
  prefix?: string          // ≤8 字元，過 validate.ts 拒收集 R（Q4 進 v1）
  color: ColorSpec         // plain=fg；powerline=bg（D3：切換保值）
  fgOverride?: ColorSpec   // powerline 覆寫 auto-fg
  threshold?: ThresholdRule
  variant?: string         // 須 ∈ descriptor.variants，否則清洗退預設
}

interface BuilderConfig {
  version: 1
  mode: 'plain' | 'powerline'
  separator: { kind: 'preset'; value: '|'|'›'|'·'|' ' }
           | { kind: 'custom'; value: string }   // plain 限定，≤8、過 R
  lastArrowCap: boolean    // powerline 末段收尾箭頭（預設 true，Q1）
  segments: SegmentConfig[]
}
// config 反序列化＝drop-unknown-and-continue：未知 id/variant 丟棄或
// 退預設、ansi256 越界 clamp、壞 hex 拒、未知欄忽略、**threshold
// buckets 桶數校正為恰 10**（不足補預設、超長截斷；autoFg 同步）——
// 絕不整份拒收（「重整不丟」承諾）；version≠1 才走 migrate/重置。
// 清洗為純函式。

interface StyledRun {
  text: string
  ariaText?: string   // SR 文字通道。凡 text 含 PUA／裝飾 glyph 之 run
                      // （箭頭、icon）**一律顯式設 ariaText**（純裝飾
                      // 箭頭=''、icon run=icon.ariaText＋值）；
                      // 「省略→fallback text」僅適用純可列印文字 run，
                      // 禁用於 PUA run（防 fallback 把 PUA 拉進 label）
  fg?: ColorSpec
  bg?: ColorSpec
}
// resolve(config, data): StyledRun[]；data: StatusData ＝真 stdin JSON
// 的忠實 typed mirror（不改名不扁平化；mock 可 1:1 序列化餵腳本）。
```

### Segment 目錄（v1 全 25，使用者拍板）
| 類別 | segment |
|---|---|
| 永在（10） | model、cwd（variant: full/basename/~縮寫）、project-dir、output-style、version、cost、duration、lines-changed、context-size、thinking |
| 百分比（4，可掛閾值） | context-used、context-remaining、rate-5h、rate-7d（各可附 resets_at→`HH:mm` 後綴） |
| 條件性（8，缺席→整段剔除） | session-name、effort、vim-mode、agent-name、pr、repo、git-worktree、worktree-branch（後二者是否同源待 SP-0 判定，若重複則併為一） |
| shell-out（3） | git-branch、git-dirty（`git status --porcelain` 非空→`*`）、clock（`HH:mm`；啟用→settings 附 `refreshInterval: 60`） |

### 產生器契約（emit-bash／emit-ps1 共同語意）
1. **讀入**：bash `input=$(cat)`；ps1 `[Console]::In.ReadToEnd() |
   ConvertFrom-Json`。
2. **jq 缺件**（bash）：`command -v jq` 失敗→提示字串＋**exit 0**。
3. **null 三態 idiom**（依 descriptor.nullPolicy，不得壓成單一慣用式）：
   - `dash`（百分比 null）→ jq `// "--"`／ps1 null 檢查給 `--`；
     顯示 `--` 且不套閾值色。
   - `hide`（條件缺席）→ **自段陣列剔除**（不 emit 空字串進 join）。
   - `empty`（一般 null）→ jq `// empty`。boolean 段（thinking）採
     `// empty`＝**null/false 同視為不顯示，刻意選擇**。
4. **執行期 join 契約**（C1，兩後端同構）：
   - 第一趟：依序評估各啟用 segment，**存活者** push `{text, fg, bg}`
     入陣列（bash 平行陣列／ps1 物件陣列）。存活判定基準在 **value**：
     value 空／缺（hide、empty 政策）→整段（含 prefix、icon）一併剔除，
     不得殘留懸空前綴。段內 composition 單源：`prefix + icon-glyph +
     formatted-value (+ resets_at 後綴)`，prefix 與 icon 著色隨段主色
     （非閾值色）——順序與著色規則三後端同構。
   - 第二趟 join：plain＝存活段以分隔符串接（無 leading/trailing/
     雙分隔符）；powerline＝段間箭頭 `fg=前段bg, bg=後段bg`，末段
     `lastArrowCap` 為真時補 `fg=末段bg` 對終端底色之 reset 箭頭，
     否則直接 reset。行尾必 `[0m`。**dash-null 段（存活、不套閾值色）
     之 bg 退回 SegmentConfig.color**（fg 取該色之 auto-fg 或
     fgOverride）——鏈上每個存活段恆有具體 bg，箭頭交接色恆有定義。
   - resolve.ts 實作**同一演算法**（宣告式包裝），SP-5 以最難情境證
     兩 shell stdout == emit-ansi(resolve)：(a) 中段條件隱藏＋鄰段閾值
     bg；(b) 存活 dash-null 段夾中段 × lastArrowCap 兩態；(c) 有 prefix
     ＋icon 之段 value 為 null（驗整段剔除）。
5. **閾值**：D2（上下界 clamp＋jq 端 floor＋成對 auto-fg 陣列）。
6. **escaping／輸入驗證職責表**：
   - **驗證層（validate.ts，UI role=alert 拒收）**拒收集 R＝{換行、CR、
     NUL、C0/C1 控制字元、bidi/格式控制字元（U+202A–202E、U+2066–2069
     等）、**PUA 字元（U+E000–F8FF＋Plane 15/16——2026-07-08 T2.2 風險
     裁定增補：防使用者前綴夾帶 PUA 觸發 aria-label enforcement 崩潰，
     落地於 T3.3 UI 層＋validate.ts）**、長度>8}。理由：`\n` 在單引號 context 是合法字面、escape
     擋不住，而 F3 只取第一行＝**靜默截斷**。property 測試斷言 R 內
     任何輸入不達 emitter。
   - **escaping 層**只處理（可列印 − R）：bash 單引號 context
     `'`→`'\''`；ps1 單引號 context `'`→`''`。glyph／CJK／emoji（含
     ZWJ 序列、膚色修飾）以 UTF-8 字面嵌入。
   - 負向不變量：使用者文字**不得**出現在 printf／`-f` 格式位；
     ps1 對抗案例含 `$(payload)` 證明走單引號非雙引號；bash 補 `!`
     案例鎖「非互動 shell histexpand 關閉」假設。
7. **ANSI 組碼**：bash `ESC=$'\033'`；ps1 `$e=[char]27`（PS 5.1 底線）。
   truecolor `38;2;r;g;b`／`48;2;…`；ansi256 `38;5;n`／`48;5;n`。
8. **ps1 編碼契約（Console 雙向＋檔案 BOM，F10＋F11＋SP-2 實證增補）**：
   檔案下載 Blob 帶 UTF-8 BOM（parser 用；SP-2 反向證據：無 BOM＝CJK/
   glyph 靜默毀損且 exit 0）；檔頭注入**兩行**——
   `[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)`
   （PS 5.1 預設 InputEncoding 非 UTF-8，stdin 含 CJK 會毀損——SP-2
   probe-inenc 實證）＋
   `[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)`
   （無 BOM 輸出；5.1 實測連帶 BOM 屬性也不噴 preamble，但防禦成本零
   且 pwsh 7 未驗，不放寬）；語法 PS 5.1 底線（禁 `?:`/`??`/`?.`）。
9. **exit-0 全面不變量**（F3）：bash 不用 `set -e`；每個 shell-out
   `… 2>/dev/null || true`（git 於非 git 目錄、date 失敗皆不得傳播）；
   腳本結尾顯式 `exit 0`。ps1 **結尾顯式 `exit 0`**（try/catch 只攔
   cmdlet／解析例外，**攔不住 git 原生非零 `$LASTEXITCODE`**——顯式
   exit 才能覆蓋洩漏；try/catch 僅管例外面）。「非 git 目錄」情境於
   windows leg ps1 真執行斷言 exit 0＋有輸出。
10. **shell-out 最小化**：僅啟用之 segment emit 對應呼叫；git 兩呼叫
    為必要最小集；v1 不做快取（官方快取範式留 backlog）。
11. **settings 片段**：Windows 預設
    `powershell -NoProfile -ExecutionPolicy Bypass -File <forward-slash 路徑>`
    （F12；pwsh 版同理）；POSIX 預設 `~/.claude/statusline.sh`（chmod +x
    提示）。clock／resets_at 啟用→附 `refreshInterval`；vim-mode 啟用
    →附 `hideVimModeIndicator: true` 建議註。UI 提示 MOTW／
    `Unblock-File`；README 註記 GPO 強制 AllSigned 之受管環境
    wrapper 亦無效（不在 v1 保證內，SP-3 checklist 註記）。確切形態
    SP-2 實測定稿。
12. **時間**：resets_at→`HH:mm` 優先 jq `strflocaltime`（F13，SP-2 驗
    可用性），不可用則 `date -r` 失敗 fallback `date -d @N`；ps1
    `[DateTimeOffset]::FromUnixTimeSeconds().ToLocalTime()`。

### 格式化對等規則（三後端鎖死，新增測試維度）
**單次浮點乘後 floor、禁捨入模式相依格式化**（cost 輸入本為 JSON
浮點，無法迴避一次浮點乘；其後全走整數運算，規避 printf/toFixed/
ToString 捨入模式分岔）。同構前提明訂：三後端把同一 JSON number 解析
為同一 64-bit double（納 SP-7 斷言，含 ps1 5.1/7 number 型別行為）。
**⚠ ps1 5.1 同構修正（SP-5 實證 2026-07-08）**：PS 5.1
`ConvertFrom-Json` 小數回 **Decimal 非 double**（`0.0029×10⁴` floor：
Decimal=29≠double=28）→ 破同構前提；ps1 數值取值必帶顯式 `[double]`
轉型、且**須在 `$null` 判定之後**（`[double]$null=0` 會誤殺 null 成 0）；
SP-7 對抗值集含 0.0029 案並分別斷言 5.1（Decimal 源）與 pwsh 7 兩形。
bash 端所有數值格式化**由 jq 產出最終字串**、bash 零數學——註：jq 無
printf／零填補格式化子，**補尾零須以「+10⁴→tostring→切片」類偏移
idiom 手工實作**，顯化為受測風險點、非 trivial 假設。
- cost：`$` ＋ truncate 至 4 位小數（`floor(x*10000)` 整數再插小數點，
  補尾零）。
- duration：整數除法 h=⌊ms/3600000⌋、m=⌊ms/60000⌋%60、s=⌊ms/1000⌋%60；
  顯示 h>0→`{h}h{m}m`、else m>0→`{m}m{s}s`、else `{s}s`。
- 百分比：`⌊p⌋%`。context-size：≥10⁶→`⌊n/10⁶⌋M` else `⌊n/10³⌋k`。
- lines-changed：`+A/-R` 原整數。
對抗值測試：捨入半值（0.01235）、**補尾零案**（1.0→`$1.0000`、0.5→
`$0.5000`、0.005→`$0.0050`）、float 乘積下緣（0.0029——三方須一致偏）、
59999/60000/3599999ms、10⁶ 門檻、p=9.99/10.0。**行為斷言歸 §3 真執行
常設情境＋SP-7 一次性定案**（jq/pwsh 非 node 可算；§1 node 層只測 TS
參考格式器與產出碼黃金，不做跨後端斷言——防空測），三後端斷言字面相等。

### 預覽契約
- `resolve(config, mockData)`→StyledRun[]→DOM span；ANSI256 經對照表
  轉 hex。深／淺底切換與 mock 情境 radiogroup **各具群組可及名稱**
  （legend／aria-labelledby，如「預覽情境」）；二者切換結果沿用預覽
  快照、不另行播報（刻意，與非-aria-live 決策一致，明述防誤加）。
- **mock 情境（canonical，SP-0 真檔派生）**：滿血／session 早期 null／
  條件欄位缺席／Windows 長路徑，**＋{plain,powerline}×{中段隱藏、首段
  隱藏、末段隱藏、全隱藏}×閾值邊界**（C1 組合，同時作 item-3 真執行
  情境）。
- 預覽區 `role="img"`＋`aria-label`＝StyledRun.**ariaText** 串接（PUA
  glyph 不得進入；箭頭不進 label；branch icon 讀「分支」等文字等價）。
  label 為隨動快照、**刻意不 aria-live**（防逐鍵吵雜），實作保證每次
  resolve 後同步更新防 stale。**label 組裝抽為 node 可測純函式**
  （StyledRun[]→label 字串，置 resolve.ts 旁，render-preview 只呼叫），
  以 icons 全開＋powerline 情境簽入單元／黃金回歸鎖（SP-6 SR 實聽為
  補充、非唯一防線）。
- Nerd Font 提示以 **`aria-describedby` 綁定 icon 切換與 powerline
  mode 控件**（聚焦／操作當下讀出），**非 aria-live**；視覺橫幅常駐
  a11y tree、以內容切換承載顯隱（不得以 display:none 切換）：「圖示
  需終端安裝 Nerd Font，預覽使用內建字型、實際顯示以你的終端為準」
  ＋安裝連結。
- 三份產出各有 heading 命名之區塊（`<pre>`＋複製／下載鈕，鈕名帶產物
  別）；複製成功經常駐 live region 播報。

### Builder UI a11y 契約（root SPEC 不變量落地，r2 全面收斂）
- **segment 清單（25 列複合控件）**：四類分區（每類 heading＋landmark）
  ＋skip 機制；**停用列收合重控件**（僅 checkbox＋名稱留 tab 序，啟用
  才展開色選／閾值／variant／前綴）；checkbox `label[for]`＋獨立 id；
  **每列每個控件的 accessible name＝segment 身分＋控件角色**（`model —
  前綴`／`model — 上移`／`model — 顏色`…），含移位鈕、色選群組、
  variant select、前綴 input，非僅 checkbox（25 列同名控件不可辨＝
  保證情形）；排序＝拖曳＋每列上移/下移鈕（鍵盤等效），移動經常駐
  live region 播報「<名稱> 移至第 N 位（共 M）」。
- **色選（每處）**：三態 radio（終端預設／ANSI 256／truecolor），
  「預設」有自身可及名稱；256 色盤元件 pattern 由 SP-6 定（D6），
  swatch 命名「ANSI 索引＋hex」；truecolor 用原生 `<input type="color">`。
- **閾值編輯器**：預設收合（disclosure），展開才進 tab 序；展開／
  收合播報＋焦點管理；10 段以 `0–9%`…`90–100%` 之 `label[for]` 命名；
  模板 `<select>`，套用＝批次操作→常駐 live region 播報「已套用
  <模板>，10 段顏色已更新」；套用後逐段改→顯示「自訂」。
- **mode 切換**（plain↔powerline）＝視圖切換：焦點移至新控件群起點
  ＋播報變化（含 D3 顏色語意翻轉提醒、custom 分隔符停用說明）。
- **帶值控件全覆蓋**：自訂分隔符、settings 路徑、每 segment 前綴、
  color input——一律 `label[for]`＋獨立 id、禁 wrap-label。
- 裝飾 glyph `aria-hidden`；驗證拒收（R 集）→`role=alert`。

### 資產與授權（SP-1 產出，授權驅動）
工序：先列每個候選 glyph 的來源集與授權（F14）→ 只取 MIT／OFL-clean
（CC-BY／限制性來源者換純文字或改來源）→ **之後**凍結碼位表
（`fonts/README.md`：碼位＋來源字型版本＋subset 指令）→ subset →
瀏覽器逐碼位渲染 smoke（缺字即回補）→ 簽入 woff2＋LICENSE（OFL 全文
＋RFN 改名聲明＋各來源條款）。失敗退場：降級純文字＋ANSI（使用者
決策 4 重議、font-dependent lane 全停）。

### CI 拓撲與 gate 矩陣（C2）
新增 `.github/workflows/test.yml`：`push`（DEV）＋`pull_request`（main）
觸發；matrix＝ubuntu-latest＋windows-latest。**deploy.yml 的 build job
另補 windows test leg（使用者拍板，nit #9）**——`push:[main]` 事件不觸
test.yml，直推 main 原可繞過跨平台 gate；由部署路徑自帶 windows 真執行
前置後，gate 語意＝「每-DEV-push 背書＋部署前置」雙層，不依賴 branch
protection 設定。

| 環境＼後端 | 單元＋黃金（node） | bash 真執行（jq） | ps1 5.1 真執行 | ps1 7 真執行 |
|---|---|---|---|---|
| ubuntu leg | ✅ gate | ✅ gate（pin：runner 內建 jq，缺則顯式安裝） | — | （可選） |
| windows leg | ✅ gate | （Git Bash 可選） | ✅ gate | ✅ gate |
| SP-2／SP-3 | — | 一次性複驗 | 5.1 專屬複驗（BOM/MOTW） | 複驗 |

不變量：**每個 `describe.skipIf` 至少有一個 CI leg 使其為假**（防
恆真死測），並**機械化**——每後端 real-exec 附 meta 斷言「本 leg 應跑
此後端則不得 skip」，某後端於所有 leg 皆 skip＝CI 設定 bug 即紅；
skip 須輸出 reason。真執行定位＝「行為層背書（依環境
分格）」，非「最終證據」；每-commit 迴歸由黃金檔承擔。
harness：ps1 spawn 形與 settings.json 生產形**逐字一致**、stdout 以
UTF-8 顯式解碼（F10 失敗模式不得搬進 harness）。

### Spikes（r2 重排）
- **SP-0（新增，阻斷級，sprint 啟動第一件事）**：真機擷取 stdin
  fixture（使用者 mini-gate；啟動時即發出擷取請求、早於其餘 M1 工作）。
  擷取協定＝**append JSONL 不覆寫**：POSIX `command: "cat >>
  ~/statusline-dump.jsonl"`；原生 Windows 給 PowerShell 形
  （`$input | Add-Content`）——**不依賴 jq**（缺 jq 的機器正是本工具
  客群）；附還原原 command 說明。附**腳本化狀態序列**引導使用者走過：
  全新 session→首次回應後→`/compact` 後→vim mode 開→切 effort 級→
  git worktree 內→（Pro/Max）等 rate_limits 出現；並**逐一設法觸發
  8 個條件性 segment**（開 PR／掛 agent／設 session-name…）各擷取
  一次。dump 簽入 `fixtures/`；逐筆 diff F1（nullability 時序、
  effort/vim enum、worktree 雙表述、prompt_id）；mock-data.ts 與黃金
  矩陣由 `.jsonl` **聯集**派生、並滿足 D1 欄位多樣性要求。真無法觸發
  之條件欄：descriptor 標 **provisional**、目錄描述記「presence-shape
  未經真檔驗證」（不與已驗欄位同級綠燈）；worktree 雙表述未判定時
  v1 **保守合併為一**（防幽靈 segment）。
- **SP-1（阻斷級，M1；font lane gate）**：授權驅動 glyph 選取＋subset
  工序＋渲染 smoke＋凍結表（見資產與授權）。
- **SP-2（收緊；ps1 encoding 部分提前 M1）**：M1 部分——手寫 ps1（非
  產品碼）驗 `UTF8Encoding($false)` piped stdout **原始位元組**開頭無
  `EF BB BF`、glyph/ANSI bytes 正確、5.1＋7 spawn 形（與 settings 生產
  形逐字同）；M2 前部分——bash＋jq（Git Bash）、`strflocaltime` 可用性、
  **經工具實際下載（帶 MOTW）之 .ps1 於預設 ExecutionPolicy 執行**、
  Windows settings command 定稿。**emit-ps1.ts 與其黃金檔在 SP-2(M1
  部分) 通過前不得撰寫／凍結**。
- **SP-3（使用者總 gate，末端）**：真機掛載實測（顯示／色彩／glyph
  實渲染／refreshInterval／null 期／MOTW 全流程）＋a11y checklist
  （鍵盤全程、SR 播報、色盤導覽）＋腳本單次執行耗時量測。
- **SP-4（M1，簡化）**：ANSI256↔hex 對照表定稿（命名＝索引＋hex，
  免色名表）＋spot-check。
- **SP-5（新增，阻斷級，M1–M2 交界）**：powerline/plain 執行期 join
  ——bash＋ps1 手寫最難情境（中段條件隱藏＋鄰段閾值 bg；存活 dash-null
  段夾中段；prefix＋icon 段 value null；各 × lastArrowCap 兩態）餵
  mock stdin 真跑，斷言 stdout ANSI == emit-ansi(resolve())；同場定案
  oracle 語意（**byte-exact 優先**：三方共用同一 escape 建構規則；
  不可行才退 canonical 正規形並記錄）。**§3 真執行斷言與比對函式受測
  定義 gate 於 SP-5 oracle 定案後才凍結**（時序閘對稱）。
- **SP-6（新增，M1 早期）**：256 色盤元件 pattern 三候選原型，純鍵盤
  ＋NVDA 實測擇一（D6）；同場跑「最壞情形 DOM/tab 序」量測（25 列
  全開＋4×10 閾值），驗證收合／分區策略；預覽 aria-label 以 icons
  全開＋powerline 情境 SR 實聽。
- **SP-7（M2）**：格式化對等——對抗值集（含補尾零與 float 乘積下緣案）
  跑三後端斷言字面相等，並驗「同一 JSON number→同一 double」同構前提
  （ps1 5.1／7 分別）；shell-out 等價——真 git repo 乾淨/髒/detached/
  無 branch 諸態，bash vs ps1 輸出斷言。定案後對抗值**併入 §3 常設
  真執行情境**（非一次性）。

### 時序閘與 TASKS 拆解指引
- **fixture-first**：SP-0 真檔簽入前，mock-data／黃金矩陣／emitter
  一律不得凍結（sprint 04 慣例）。
- **M1 雙 lane**：font-independent（SP-0/SP-2(M1)/SP-4/SP-5/SP-6、
  color/threshold/config/resolve/validate、無 icon 的 emit 骨架）先行；
  **font-dependent**（glyph 渲染、powerline 箭頭視覺、fonts/、兩條
  font delta 落地、verify-dist 字型斷言）**硬 gate 於 SP-1 pass**。
- **M1 串行關鍵路徑＝SP-0 → SP-2(M1) → SP-5**（無真檔不凍 mock/黃金
  →無 ps1 encoding 實證不寫 emit-ps1→無 join 實證不凍 oracle）；
  SP-4／SP-6／SP-1 font lane 與之**可並行**。SP-0 為使用者閘且**無
  降級路徑**（C3 的必然代價），故 sprint 啟動第一動作＝發出擷取請求。
- emit-ps1＋其黃金 gate 於 SP-2(M1) 後；emit-bash 黃金 gate 於 SP-0 後。
- 黃金檔＝**簽入可讀** `__golden__/*.{sh,ps1,json}`＋
  `toEqual(readFileSync)` 比對＋專屬重生腳本（`npm run golden:update`
  類，**禁在 CI 執行**——CI 不得自癒）；**禁 `toMatchSnapshot`／
  `vitest --update`**（repo 零 .snap 慣例）；黃金測試失敗訊息導向
  「審 diff、勿盲目重生」；黃金 config 少而精（每後端 canonical 一份
  ＋C1 組合一份），黃金 diff 必經人審。
- `src/tools.ts` 翻 `available`＋verify-dist anchor ×4＋tripwire
  `toBe(4)` 於最終 milestone；verify-dist 字型斷言＝「build 實測落點
  後才寫」＋**上限** byte 斷言（<100KB，對齊 Conventions 門檻）。

## Open questions
（無懸置。r1 的 Q1/Q2/Q4 已於 r2 拍板記錄；Q3 綁 SP-2；oracle byte-
exact vs 正規形、色盤 pattern 皆綁定 spike 定案點——SP-5／SP-6。）

## Spec deltas

### root `SPEC.md`
- **Section: Architecture overview** — modify
  Why: 「所有檔案處理（圖片轉換、GIF 編輯、影片轉檔）」枚舉在第四
  工具（非媒體）後不窮盡。
  New content: 軟化為「所有處理（媒體轉換／編輯與開發者小工具之設定
  產生）皆在瀏覽器端完成」。
- **Section: Components** — add
  Why: 新增第四個工具。
  New content: 增列「Claude Code statusline 產生器——segment 目錄
  （tri-path 描述子）／閾值變色／執行期 join／三後端產生器（bash/
  ps1/settings 片段）＋emit-ansi oracle，零 runtime 依賴，self-host
  Nerd Font subset（僅預覽用）；位於 `tools/statusline-builder/`」。
- **Section: Conventions** — modify（兩處，自洽化）
  Why: 既有「載入一律顯式同源絕對 URL」條文與字型 CSS 相對 url() 打架；
  新資產形態需以性質軸＋provenance 入例。
  New content: (1) 原條文縮限為「經 dynamic import／Worker 載入之
  runtime JS/wasm 資產」；(2) 增註「非執行型小型第三方靜態資產（字型
  ／圖片／資料，約數十 KB 級——精確上限由 verify-dist 斷言把關，本
  sprint 字型 subset 為 <100KB）可直接簽入工具目錄：須附授權聲明檔、
  來源版本＋再生工序記錄（provenance），並列入 README 第三方元件段；
  以 HTML/CSS 同源相對參照載入、由 Vite 資產管線處理，不受絕對-URL
  條文約束」（勿以未量測值訂 repo 級硬門檻——數字留斷言層）。
- **Section: Status** — modify
  Why: 工具數與「PRD 三大工具目標完成」措辭過時（PRD 升四目標）。
  New content: 改寫為四工具皆可用之陳述＋statusline-builder 上線聲明
  （schema 基準版註記見 README）。

### root `CLAUDE.md`
- **Section: What this is** — modify
  Why: 工具枚舉句增列第四項。
  New content: 「（APNG→GIF 轉換、GIF 編輯、影片格式轉換、Claude Code
  statusline 產生器）」。

### magi/`PRD.md`
- **Section: Problem** — modify
  Why: 現行 Problem 全為媒體轉換敘事，僅增 Goals 會斷 Problem→Goals
  追溯（round 1 兩鏡頭一致）。
  New content: 補一句將 EZTools 定位為「純靜態、免安裝的瀏覽器端
  工具合集（媒體轉換／編輯＋開發者小工具）」。
- **Section: Goals** — modify
  Why: 新工具入列。
  New content: 增列「Claude Code statusline 設定產生器（預覽＋腳本
  產出）」。

### magi/`TECHSTACK.md`
- **Section: Framework / runtime** — modify
  Why: 記錄零新依賴與字型資產形態。
  New content: 增註「statusline-builder：零 runtime npm 依賴；Nerd
  Font subset（woff2 簽入 repo，含授權與再生工序記錄）僅供預覽渲染，
  不隨產出腳本散布」。
- **Section: Deployment** — modify
  Why: 新增測試 CI workflow（C2）。
  New content: 增註「`.github/workflows/test.yml`：push DEV＋PR main
  觸發，matrix ubuntu＋windows——windows leg 為 ps1 真執行 gate、
  ubuntu leg 為 bash＋jq 真執行 gate；deploy.yml build job 另補
  windows test leg 作部署前置（環境×後端矩陣見 sprint 05 PLAN）」。

### 其他 root 文件（非 deltas 契約面，commit 時走 root-sync）
- `README.md`：`### 第三方元件`增列 Nerd Font subset（來源、版本、
  授權，指向 `fonts/LICENSE-nerd-fonts.md`）；Tools 表增列；補
  statusline schema 基準版註記＋「Claude Code 大版更新時人工重核
  segment 目錄」checklist 一行。

## Verification

1. **單元（node）**：`segments/color/threshold/config/resolve/
   emit-ansi/emit-*/validate` 全純函式。矩陣：
   - 閾值：p=-5/0/9.9/9.99/10.0/55/99/100/105/null ×模板/自訂×
     plain-fg/powerline-bg（含 auto-fg 成對陣列）
   - escaping 對抗：`'`／`"`／`$`／`` ` ``／`\`／`!`／ps1 `$(payload)`
     ／ZWJ+膚色 emoji／CJK／`'\''` 嵌套——bash 與 ps1 斷言產出碼字面；
     負向：使用者文字不出現於 printf 格式位
   - validate property 測試：R 集（\n/CR/NUL/bidi/控制/超長）任意
     組合不達 emitter、UI 得 role=alert
   - null 三態 × 每相關 segment；config 清洗（舊 config×目錄變動、
     越界色、壞 hex、未知欄、**threshold 桶數≠10**）roundtrip
   - TS 參考格式器單元測試（對抗值集見格式化規則；bash/ps1 行為相等
     歸 §3 真執行，node 層不做跨後端斷言——防空測）
   - 比對函式自測：負向（已知不一致對→判不一致）＋正向（已知一致對
     →判一致）；受測定義 SP-5 oracle 定案後凍結
2. **黃金檔（node，每-commit 迴歸主力）**：簽入可讀
   `__golden__/*.{sh,ps1,json}`，`toEqual(readFileSync)`；重生僅經
   專屬腳本；禁 snapshot API。canonical config×2（plain 滿配／
   powerline＋閾值＋C1 隱藏組合）。時序：SP-0（bash/settings）、
   SP-2-M1（ps1）通過後才凍結。
3. **真執行（gate 矩陣見 CI 節）**：mock stdin（SP-0 真檔派生情境，
   含 {plain,powerline}×{隱藏位置}×閾值邊界＋**存活 dash-null 中段案**
   ＋**格式化對抗值**（SP-7 定案後併入常設））→ spawn bash（ubuntu／
   Git Bash）與 powershell 5.1＋pwsh 7（windows）→ 斷言 stdout ==
   emit-ansi(resolve())（oracle 語意 SP-5 定；斷言於 SP-5 後凍結）；
   ps1 另斷言首 bytes 無 `EF BB BF`；「非 git 目錄」情境斷言 exit 0＋
   有輸出。
4. **dist 閘**：verify-dist anchor ×4＋tripwire toBe(4)＋字型資產
   （落點 build 實測後定；<100KB 上限）；tools.ts 翻轉於末端。
5. **SP-3 使用者總 gate**：真機掛載（MOTW 全流程、glyph 實渲染、
   refreshInterval、null 期）＋a11y checklist（鍵盤全程排序、SR
   播報：移位／套模板批次／mode 切換／複製成功、色盤導覽、預覽
   label）＋單次執行耗時量測。
