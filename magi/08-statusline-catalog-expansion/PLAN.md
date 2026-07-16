# Statusline Builder 目錄擴充（06c）＋前置加固

> Type: feat • Scale: major • Sprint: magi/08-statusline-catalog-expansion/
> 契約來源：`magi/06-statusline-ui-refresh/PLAN.md`（umbrella，Rev 3）之
> §06c、§D5、§多列輸出的引擎契約、§Spikes，**經
> `magi/07-statusline-multirow-layout/PLAN.md` Rev 3–13 裁決軌跡對帳修正**
> （傘狀 emoji 對照表已被 07 M1.5 使用者裁決推翻——本 PLAN 全面採 ASCII
> 前綴體制）。另納入兩項 sprint 07 技術債（自 `magi/BACKLOG.md` promote）
> 為前置加固。傘狀／07 文件與本 PLAN 衝突時以本 PLAN 為準。
> Rev 2（2026-07-12）：回應 round 1 MAGI plan review（4/4
> REQUEST-CHANGES）——C-1 emoji→前綴對帳、C-2 ps1 純 ASCII 跳脫條款、
> I-1〜I-4（jsdom 新依賴節、CLAUDE.md delta、SegmentCatalog 注入面、
> bar 4-run 邊界釘死）與 14 項 minority 中 12 項採納；詳
> MAGI_PLAN_REVIEW-round1.md。
> Rev 3（2026-07-12）：回應 round 2（3 RC／1 APPROVE）——A-1 純 ASCII
> 斷言範圍收斂＋跳脫建構點、bar 累加器粒度四格、percentage 主值型別
> 契約、mock 情境自帶 now、autoColor 承載欄、auto emitter 執行期形＋
> 三後端比對規則、token dash 分派、模板 tuple 色立方化、golden 變因
> 白名單、`↺` ariaText、D-d smoke 客觀門檻、S2 擴 ps1 半邊；詳
> MAGI_PLAN_REVIEW.md。
> Rev 4（2026-07-12）：M2 spike 結論回寫（T2.6，使用者核可）——S2 jq
> idiom 改 `tonumber?` 防呆形＋ps1 `TryParse` 定案（`[long]''`＝0 實證
> 修正）、S6 定稿結局 (b) 同機 oracle（CI 不釘時區、workflows 自
> In-scope 移除）、S4 powerline 併元素配方＋null 路徑 fgOverride 保守
> 解讀回寫；各 spike 報告見 sp2/sp4/sp5/sp6/sp7。

## Context

06a（glyph 去字型化＋主題＋footer）、06b（多列輸出＋三欄版面＋位置制
列管理）皆已交付並上 DEV（cf1cb7d），06c 依賴的多列引擎（`resolve()`
回傳 `rows: StyledRun[][]`、三後端逐列輸出、行尾契約）就緒。**現行
25 段 `icon.glyph` 為英文短 token＋冒號前綴**（07 M1.5 使用者裁決：
真機實測 statusline 完全不接受 emoji，推翻 06a emoji 對照表；對照表見
`magi/07-statusline-multirow-layout/prefix-table.md`）。06c 收尾傘狀
計畫追加範圍 8–11：

8. **進度條**：百分比段可附 20 格 bar（顯示字元暫定 `█░`，S7 真機
   把關），按閾值變色。
9. **限額重置倒數**：`rate_limits.*.resets_at` 換算 `↺ 2h (14:30)`
   獨立段（`↺` 同受 S7 把關）。
10. **Tokens 三段**：`current_usage` 拆輸入／輸出／Cache 命中率三獨立段。
11. **模型／effort 自動配色**：howar31 參考方案，色票重編碼為 256 索引。

前置加固（sprint 07 DRIFT C 項升級，動 engine 前先鋪回歸網）：

- **引擎邊界補測**：`toAnsi([])` 零列文件性測試（不變量現僅靠 resolve
  恆 `[[]]` 維繫）＋多列 × `powerlineArrow=false` 真執行案。
- **UI 回歸網重建**：jsdom 補測 `renderRuns` spec→DOM（見 D-d）；把
  sprint 07 的 CDP 驗證情境（多列拖曳／位置制 slots 九情境）**重建**為
  repo 內可重跑整合案（scratchpad 腳本若本機尚存可作底本，但未簽入
  repo，工作量按重建估）。

## Goals & Non-Goals

### Goals
- 目錄 25→30 段：token-in／token-out／cache-hit／reset-5h／reset-7d。
  **icon 一律 ASCII 前綴體制**（暫定 `in:`／`out:`／`cache:`／`r5h:`／
  `r7d:`；比照 M1.5 流程——developer 依 prefix-table.md 風格擬正式
  對照表，**使用者核可後才動 `segments.ts`**）。
- 百分比段 bar 正交欄：`SegmentConfig.bar?: boolean`，value 靜態 4-run
  （bar 啟用且主值存活時；邊界語意見 §4）。
- 閾值雙模板：「限額漸層」（按用量）＋「剩餘漸層」（逆序版）併入既有
  模板登記系統；`context-remaining` 預設套逆序版。
- model／effort auto 配色：`SegmentColor = ColorSpec | { kind: 'auto' }`
  僅用於 `SegmentConfig.color`，resolve 期展開為具體 ColorSpec；model
  比對來源＝**`model.id`**（新取值通道，見 §3）。
- 倒數段三後端實作（bash 全 jq、ps1 `DateTimeOffset`＋
  `InvariantCulture`）＋ **now 注入**：`ResolveInput.now: number`——
  **mock 情境自帶固定 `now`**（round 2 修訂：`MockScenario` 增欄，
  `resets_at` 一律相對情境 now 設計如 now+2h／now+3d；預覽與單元測試
  全走情境 now，決定論且永不過期，回歸傘狀「mock 情境給定值」原文；
  main.ts 真時鐘僅保留給未來非 mock 輸入路徑）＋產出腳本讀可選環境變數
  `STATUSLINE_NOW_EPOCH`（缺席回落腳本端真時鐘：jq `now`／ps1
  `DateTimeOffset.Now`，零 shell `date`；現碼確認未實作，本 sprint 新增）。
- `emit-settings.ts` `needsRefreshInterval` 補「啟用 reset-5h／reset-7d」
  條件＋測試。
- `mock-data.ts` 補 `cache_creation_input_tokens`／`cache_read_input_tokens`
  兩欄＋四欄全 0（除零）情境＋partial-null 矩陣情境＋**各情境固定
  `now` 欄**（`resets_at` 改相對 now）；`segments.ts` 的
  `CurrentUsage` 自 `Record<string, unknown>` 收緊為具名型別。
- golden 重生（變因白名單：新段＋InvariantCulture 順修，見 §5）；
  **S2／S4／S5／S6／S7 五支 spike 動工前完成**（S7 為 round 1 review
  升格）。
- 前置加固兩項（見 Context）先行落地，含 jsdom 共存 smoke 與 CDP PoC
  （S8，見 §1）。

### Non-Goals
- tri-path 描述子架構與既有段的欄位語意不動（目錄擴充不改舊段；
  `autoColor`／`expiresAtPath` 為選填新通道，非改語意）。
- **CONFIG_VERSION 不 bump**（見 D-c）。
- `fast_mode`／`agent_type` 新段不做（BACKLOG 既有項，另案評估）。
- CDP 整合案不進 CI 必跑 gate（本機可重跑為本 sprint 目標；CI 化留
  backlog）。
- 不做每列獨立 mode／separator（傘狀 Non-Goal 沿用）；**不變更 06b
  已出貨的跨列拖曳／select 移列語意**（07 Rev 5 已解禁跨列拖曳並出貨
  ——原傘狀「不做拖曳跨列」禁令已失效，此處僅承諾不再動它）。

## Design options considered

大宗形狀已由傘狀 PLAN 兩輪 review 裁決且經 07 對帳修正，本 PLAN 沿用：
bar 正交欄（非 variant 互斥）、reset 獨立段與 `percent-reset` 分工、
cache-hit 公式、auto 色票 256 索引、4-run 粒度、全 floor 捨入不變量、
now 注入形、時區策略。sprint 層選擇：

### D-a. 前置加固的位置
| 選項 | 內容 | 風險 |
|---|---|---|
| **A（採）** | 獨立 milestone 先行，全綠才動 engine | sprint 前段無 feature 產出（可接受） |
| B | 散在各 milestone 邊做邊補 | 大改 resolve/emit 時回歸網還沒鋪好，違反引入動機 |

### D-b. CDP 腳本重建形態
| 選項 | 內容 | 風險 |
|---|---|---|
| **A（採）** | 獨立 node script（`scripts/e2e-statusline.mjs` 暫名）＋`npm run test:e2e`，不進 vitest 預設 gate | 需本機 Edge/Chromium；腳本自帶「找不到瀏覽器→明確 skip」 |
| B | vitest 內管理瀏覽器生命週期 | 複雜度高、CI 必炸、汙染 `npm test` |

- **依賴形態由 S8 PoC 定案**：優先零新依賴（Node ≥22 內建 `WebSocket`
  ＋ `fetch /json/version` 取 `webSocketDebuggerUrl`）；PoC 不通則引入
  最小 CDP client devDependency（需回寫「新依賴」節與 TECHSTACK delta）。
- **應用伺服器生命週期歸腳本**：harness 自起／自收 `vite preview`
  （MPA＋TS 模組無法 `file://` 載入），port 探測避撞。
- sprint 07 既知 harness 對策一併帶入：`Input.setInterceptDrags(true)`、
  mouseMoved 帶 `button:'left', buttons:1`、gap 生長後補發第二次
  dragOver、**單 drag 單 browser session**（第二次拖曳 flake）；S8 PoC
  同時量測 headed vs headless flake 率（10 輪），據此定執行形態。

### D-c. CONFIG_VERSION 維持 2
`bar?: boolean` 為選填欄、缺省 false（先例同 06b `row`）；`color` 欄
未知 kind（含舊碼讀到 `'auto'`）由清洗退 `{kind:'default'}`。**舊碼讀
新檔為有損但可接受之降級**（寫回會丟 auto／bar、row>24 被 clamp——與
06b `row` 先例同級），且嚴格優於 bump：bump 至 3 會觸發舊碼
`migrateConfig` 的「未知版本整份重置」（config.ts:259），災情更大。
v3 遷移階梯為 BACKLOG 既有項，不在本 sprint。

### D-d. jsdom 導入 vs 延伸純函式接縫（round 1 I-1）
本專案至少 5 處原始碼註解明文「vitest 無 jsdom」並以純函式接縫規避
（`buildPreviewSpec`／`runRenderSpec` 即此慣例產物）。
| 選項 | 內容 | 風險 |
|---|---|---|
| **A（採）** | 引入 `jsdom` devDependency，**per-file** `// @vitest-environment jsdom` 局部啟用，僅限 `render-preview.test.ts` 的 spec→DOM 斷言 | 與既有全 node-environment 測試共存需 smoke 驗證（環境洩漏／耗時） |
| B | 再拆規格函式維持零 DOM | `renderRuns` 的 DOM 組裝（createElement／className／appendChild 序）正是要測的東西，再抽象一層等於測自己寫的 mock |

採 A 的前提：前置加固第一步先跑**共存 smoke**，客觀門檻（round 2
釘死）：(a) 記錄安裝前 `npm test` 基準時間；(b) 安裝 jsdom＋最小
smoke 檔（`// @vitest-environment jsdom`＋`document.createElement`
斷言）；(c) 全量並跑全綠、總時間 ≤ 基準 +10%；(d) 既有
node-environment 測試輸出零變化（無環境洩漏）。任一不過即回退選項
B。既有「刻意零 DOM」測試檔不改動、不遷移。

## Recommended approach

依賴順序五塊（milestone 切分由 /magi:tasks 定）：

### 1. 前置加固（回歸網）
- jsdom 共存 smoke（D-d 前提；不過則回退純函式接縫路線）。
- `emit-ansi.test.ts`：`toAnsi([])` 文件性邊界測試（明示不變量歸屬）。
- golden／pipeline：多列 × `powerlineArrow=false` 真執行案補位。
- `render-preview.test.ts`（jsdom）：`renderRuns` spec→DOM 斷言（含
  bar run 的 `ariaText` 斷言，見 §4）。
- **S8 PoC**：零依賴 CDP 全鏈可行性（launch→`/json/version`→WebSocket
  →navigate→`Input.setInterceptDrags`→合成拖曳）＋headed/headless
  flake 率 10 輪＋`vite preview` 啟停——據此定 D-b 依賴宣告與執行形態。
- CDP 整合案重建（D-b 形態；涵蓋範圍上限依 S8 成本數據於 tasks 期定：
  多列拖曳基本盤必收，slots 九情境擇代表）。

### 2. Spikes（全過才動 engine；結論若需改契約，回報使用者核可後才改）
- **S2（已完成，sp2/REPORT.md；idiom 經使用者核可 2026-07-12）**：jq
  釘死 **`(env.STATUSLINE_NOW_EPOCH // empty | tonumber?) // (now|floor)`**
  ——原式 `((env.… // (now|floor))|tonumber)` 對非數字 hard error
  （exit 5）中止腳本、已作廢，`tonumber?` 吞錯交外層 `//` 回落。ps1
  釘死 `[string]::IsNullOrEmpty` 閘＋`[long]::TryParse`（實證修正：
  `[long]''` 與 `[long]$null` 皆**靜默＝0 不擲例外**、僅 `[long]'abc'`
  擲——顯式空值閘必要，try/catch 形不可靠）；三路 ×{PS 5.1, pwsh 7}
  六案全過、零 shell `date`。
- **S4（已完成，sp4/verify.mjs 41/41 PASS）**：四格 byte-exact 皆可
  達成——bash-plain＝既有 join 迴圈零改動（逐 run 四元素＋`segstart
  1/0/0/0`）、ps1-plain＝沿閾值分裂先例併單一 `$s`；**powerline 兩
  後端併元素精確配方（經核可回寫）**：run1 的 fg/bg 進累加器欄位
  （供箭頭交接取色）、run2–4 各自完整烘焙 `reset+fg+bg+text` 併入該
  元素 text 尾端——此不對稱配方為 byte-exact 關鍵，T4.3/T4.4 直接
  引用 sp4/REPORT.md。組合案（percent-reset×bar／powerline-noarrow
  ×bar／auto×powerline arrow+noarrow）與 autoFg 對比全過。留 T4.2
  補測：`threshold === undefined` × bar 的 run3 無 fg 斷言。
- **S5** golden 規模與 CI 時間：代表場景清單（全段單列／多列混排／bar
  邊界 0%·49%·50%·100%·null／auto 五級 effort＋unknown fallback）一輪
  計時，預算 <5 分鐘。
- **S6（已完成，sp6/REPORT.md；結局 (b) 經使用者核可 2026-07-12）**：
  實證現行 percent-reset 體制＝**同機 oracle**（golden 無寫死時刻；
  Tokyo 切換下 gate 綠→綠→綠）；三後端 × 3 時區 × 4 epoch（含跨月／
  跨年／DST 附近）68 組對拍**零分岔**。**定稿：倒數段沿同機 oracle
  體制，CI 不釘時區**——test.yml／deploy.yml 零改動（自 In-scope
  移除），`STATUSLINE_NOW_EPOCH` 為腳本可選注入（單元／golden 層以
  注入 now 達 byte-exact；真執行層 oracle 現算）。附帶實證：jq 在
  Windows 的 `TZ` 只認 POSIX 固定偏移格式、不認 IANA 名（僅結局 (a)
  受影響，已無關）。
- **S7（round 1 升格，動工前置 gate）**：`↺`(U+21BA)／`█`(U+2588)／
  `░`(U+2591) 真機 Claude Code 渲染——07 真機證據曾推翻整張 emoji 表，
  此三字元從未真機驗過（sp3 案例不含）。沿 sp3 harness 出最小 case
  （`█░` 20 格＋`↺ 2h (14:30)` × {plain, powerline} × {PS 5.1, bash}）
  真機截圖確認。**失守 fallback**：`↺`→ASCII（如 `~`）、`█░`→`#`／`-`
  ——僅字面替換，4-run 粒度與 S4 bytes 形不變，替代字面由使用者核可。
  **（gate 已閉合 2026-07-12：自動化段五形輸出 byte-identical＋使用者
  真機目視四組合全過——`█░↺` 如實顯示、寬度穩定、plain/powerline 上色
  正常；`↺█░` 顯示形定案，fallback 條款失效不啟用。sp7/REPORT.md。）**

### 3. 資料形狀
- `segments.ts`：+5 段描述子——icon 前綴表（暫定 `in:`／`out:`／
  `cache:`／`r5h:`／`r7d:`，M1.5 流程使用者核可後定案，
  prefix-table.md 同步）＋`CurrentUsage` 具名型別。cache-hit 公式
  （釘死）：`floor(cache_read_input_tokens × 100 / (input_tokens +
  cache_creation_input_tokens + cache_read_input_tokens))`，分母 0 →
  `0%`；`current_usage` null → 沿百分比段 null 政策 `--`；**公式任一
  輸入欄位 null → 整段依 nullPolicy 處理（同 current_usage null）**；
  token-in／out null → `--`。全 0 案在 **resolve 層**斷言（`0%`），
  非僅 mock 層。**percentage 類主值型別契約（round 2 釘死）：三式主值
  恆為 `number | null`**——cache-hit 公式落在 tri-path 取值層（tsPath
  直接回數字、jqPath 以單一 jq 運算式算出、ps1Path 以 helper 算出；
  分母 0 → 0、任一輸入欄 null → null），**不得**沿 context-size
  「取節點＋FormatKind 算」慣例（否則 resolve 閾值閘
  `typeof raw === 'number'` 靜默關閉、ps1 percentage 路徑 `[double]$v`
  對物件擲例外中止腳本、bash 印出整包 JSON）。
- **descriptor 新通道 ×2**（沿 `resetsAt` 的 TriPath 先例，選填、不動
  既有段）：
  - `autoColor?: { palette: 'model' | 'effort'; key?: TriPath }`——
    auto 配色的**單一承載欄**（round 2 修訂：原 colorKey 併入）：
    `palette` 指定套哪組色票（resolve／emit 不得出現任何 id 特判）、
    `key` 為比對來源通道——model 段掛 `{ palette: 'model', key:
    .model.id 三式 }`（jq `.model.id`／ps1 `$d.model.id`；id 較
    display_name 穩定，色票對照鍵以 model id family 前綴比對）；
    effort 段掛 `{ palette: 'effort' }`（主值即 `.effort.level`，
    直接複用免 key）。
  - `expiresAtPath?: TriPath`——通用「過期即死值」標記；resolve 於
    既有 `isValueDead` 判定後追加通用步驟「`expiresAtPath` 存在且
    `now ≥ 該值` → 視同死值」，**不硬編 id 特判**；reset-5h／reset-7d
    掛 `resets_at`。
- `color.ts`／`config.ts`：`ColorSpec` 維持封閉三態；`SegmentColor`
  另立。**清洗拆兩支＋順序釘死**：`.color` 走新的
  `sanitizeSegmentColor(raw, allowAuto)`（先判 `raw.kind === 'auto'`：
  allowAuto 且段合格才放行，否則退 `{kind:'default'}`；其餘委派
  `sanitizeColorSpec`）；**`fgOverride` 一律不收 `auto`**（維持走
  三態封閉的 `sanitizeColorSpec`，杜絕 `{kind:'auto'}` 流入
  `seg.fgOverride` 污染 SGR 建構）。
- **`SegmentCatalog` 注入面擴充**（round 1 I-3）——介面草簽：
  `{ ids; variantsById; barEligibleIds: ReadonlySet<string>;
  autoEligibleIds: ReadonlySet<string> }`，由 `segments.ts` 的
  `SEGMENT_CATALOG` 導出——**導出依據（round 2 補閉）**：
  `barEligibleIds`＝`category === 'percentage'` 之段、
  `autoEligibleIds`＝**有 `autoColor` 欄之段**（config.ts 維持不依賴
  segments.ts、零硬編 id 清單；目錄擴充自動跟進）；`sanitizeSegment`
  據此執行「bar 限百分比段」「auto 限 model/effort 段」；
  config.test.ts 假目錄同步擴欄。
- `threshold.ts`：雙模板**併入既有登記系統**——新增
  `ThresholdTemplateId`：`'limit-gradient'`／`'remaining-gradient'`，
  進 `THRESHOLD_TEMPLATE_IDS`／`THRESHOLD_TEMPLATES`（既有 4 套不動、
  select 選項尾插）。10-tuple 具體 index 建議值（與現行模板同構、
  golden 單一事實來源；developer 對照參考圖需微調時提案核可）：
  限額漸層＝`[244, 246, 247, 249, 250, 34, 34, 34, 220, 196]`（0–49%
  灰階等距取樣 244→250、50–79% 綠三桶同色、80–89% 黃、90–100% 紅；
  **綠黃紅取色立方**（round 2 修訂）——對齊既有 4 套模板「只用色立方
  ／灰階、避開可被主題覆寫的 0–15」值域慣例）；剩餘漸層＝其逆序。
  閾值輸入一律＝該段原始值，不做隱式反轉。
- auto 色票（全部 `{kind:'ansi256', index:N}`）：model——Fable 5=214
  （金）、Opus=135（紫）、Haiku=2（綠）、Sonnet／未知 fallback=6（青）；
  effort 五級——low=3、medium=2、high=4、xhigh=5、max=15＋unknown 值
  =9（亮紅）。effort 段 `nullPolicy:'hide'`，欄位缺席整段剔除（「無
  欄位→灰」分支不可達，勿寫進 case 表與 golden）。**auto 色票沿用
  0–15 基本色為傘狀明文裁決**（「可被終端主題覆寫屬刻意選擇、與參考
  方案一致」，06 PLAN §D5）——與閾值模板值域慣例的差異為已裁決事項，
  不重開。
- row clamp 由目錄長度導出（`config.ts:159-160` 已「不寫死 25」）——
  30 段後上界自然放寬至 29，僅需同步斷言測試。

### 4. 引擎與三後端
- `resolve.ts` bar run 形狀（round 1 I-4 釘死）：
  - **bar 啟用且主值存活**時為靜態 4-run：run1＝head（prefix＋icon；
    兩者皆空時仍 emit 空 text run 佔位，維持 4-run 恆定形）、run2＝
    filled（桶色）、run3＝empty（default 色）、run4＝
    **`' ' + pct% + suffix + pad`**（單一運算式：pct 文字桶色；
    `percent-reset` 的 ` (HH:MM)` 後綴與 powerline-noarrow 右 padding
    一律併入 run4，沿「後綴附於 value 部」既有規則）。
  - 填格＝**`max(0, min(20, floor(pct / 5)))`**（負值防禦下界，比照
    `bucketIndex` 雙向 clamp 慣例）。
  - **主值 null → 整段退單 run**（value `--`，不畫格、無 4-run）；
    null 與否執行期才知，**bash／ps1 產出腳本內建執行期分支**（4-run
    bar 路徑 vs 單 run dash 路徑），「emit 期定筆數」僅在 bar 路徑內
    成立——檔頭契約照此措辭。
  - `threshold === undefined` 而 bar 開（手改存檔可達）→ filled／pct
    退段主色。
  - powerline 模式：bar 段桶色套 **fg**、bg 全段維持段主色、**停用
    `fgOverride`**；檔頭「powerline 段恆單 run」不變量改寫為「bar 段
    例外（4 run）；箭頭交接 bg 一律取段主色」。
  - **emitter 累加器粒度（round 2 釘死，I-4 下半）**：兩支 emitter 的
    powerline join 迴圈逐**累加器元素**插箭頭、且 `segstart` 邊界陣列
    僅 plain 路徑存在（emit-bash.ts:370-374／:508）——故 **powerline
    兩後端一律把 bar 段 4 run 的 SGR 編碼併為單一累加器元素**（保住
    「元素＝段」隱性契約與箭頭迴圈不動；位元組與 oracle 逐 run
    `reset+fg+bg+text` 序列等價）；**bash-plain** 逐 run push 四元素
    ＋`segstart` `1/0/0/0`（分隔符只插段首）；**ps1-plain** 沿既有
    閾值分裂先例（emit-ps1.ts:487-497）併單一 `$s` 元素。S4 已以
    41/41 byte-exact 實證四格（sp4/REPORT.md）；powerline 併元素採
    「run1 fg/bg 進累加器欄位、run2–4 完整烘焙 reset+fg+bg+text 併
    text 尾」不對稱配方（核可回寫）；**null 退單 run 路徑同樣停用
    fgOverride**（保守解讀定案）。
  - **a11y**：filled／empty run 顯式 `ariaText: ''`（20 格方塊字不得
    進列 aria-label；數值語意由 run4 承載）——jsdom `renderRuns` 測試
    補此斷言；機械 enforcement 只擋 PUA，此處靠測試把關。
- auto 展開為具體 ColorSpec 後才進 SGR 建構——**此語意僅預覽端
  （resolve）成立；產出腳本內 auto 為執行期值**（round 2 釘死）：
  色票與成對 `autoFg` 以**平行陣列於 emit 期預算、執行期查表**（沿
  閾值段先例：emit-ps1.ts:474-481 push `$bg`、emit-bash.ts:310 push
  桶色變數），powerline 下該段 bg 與箭頭交接尾推入 `bgs`／`$BgT` 同
  為執行期變數；emitter auto case 函式獨立實作，不與 threshold 索引
  路徑共用變數。**三後端比對規則同構釘死**：對 `model.id` 做**大小寫
  敏感的前綴比對**——bash `case "$id" in claude-opus-*)`（glob 前綴、
  大小寫敏感）、ps1 用 `-clike 'claude-opus-*'` 或 `.StartsWith(...)`
  （**禁 `-match`**：regex 語意且預設大小寫不敏感）、TS 端
  `startsWith`。
- 倒數段：顯示格式（全 floor）——reset-5h：`diff ≥ 1h → "↺ Xh (HH:MM)"`
  否則 `"↺ Xm (HH:MM)"`；reset-7d：`diff ≥ 1d → "↺ Xd (MM/DD HH:MM)"`
  否則 `"↺ XhYm (MM/DD HH:MM)"`；`resets_at` null 或 diff ≤ 0 →
  `expiresAtPath` 通用規則整段 hide。bash 端差值＋本地時刻全收 jq
  （`now`＋`strflocaltime`，零 shell `date`）；ps1 端 `DateTimeOffset`
  ＋**格式化一律 `ToString('...', [CultureInfo]::InvariantCulture)`**
  （`/`／`:` 為 .NET culture placeholder，非 en-US 機器會分岔——
  **順修既有 `Format-ResetsAt`**（emit-ps1.ts:264）並補文化不變性
  單元斷言）。now 注入 idiom 依 S2 定稿（jq
  `(env.STATUSLINE_NOW_EPOCH // empty | tonumber?) // (now|floor)`；
  ps1 `IsNullOrEmpty` 閘＋`TryParse`——sp2/REPORT.md 可直接抄）。
  **倒數段 run 的 ariaText 顯式代換 `↺`**（如
  「重置 2h (14:30)」）——`↺` 非 PUA、機械 enforcement 不攔，沿
  icon glyph→ariaText 代換慣例，aria 測試以代換後文字為準（S7 失守
  換 ASCII 替代時自然退場）。
- **ps1 非 ASCII 值字面跳脫（round 1 C-2／round 2 A-1 範圍收斂）**：
  `↺`＝`[char]0x21BA`、`█`＝`[char]0x2588`、`░`＝`[char]0x2591`——
  bar／倒數字面為**值路徑執行期建構**（非 icon 路徑），於 emit-ps1
  以 `[char]` 運算式**串接進值建構式**（比照 `iconGlyphExpr` idiom，
  禁以 TS 字面直出）。不變量精確定義：「**引擎自行產生的字面**
  （icon glyph、分隔符、bar／倒數值字面）於產出腳本中恆為純 ASCII」；
  `emit-ps1.test.ts` 的機械化回歸斷言**排除註解行（`#` 開頭）與使用
  者 prefix 通道**（契約 8 刻意保留 UTF-8 字面嵌入、屬既有 DRIFT
  backlog——現行檔頭 CJK 註解與 golden 實檔為證，全腳本斷言照寫
  必紅）。
- tokens 縮寫＝整數算術：`n ≥ 1000` 時 `floor(n/100)` 得十分位整數再
  手動插小數點（比照 cost 段 idiom），僅設 k 檔（百萬級如 `1500.0k`，
  接受）。**token-in／out 的 dash 政策落地形（round 2 釘死）**：兩支
  emitter 現行按 category 分派、非 percentage 段的 null 一律走 hide
  路徑——為讓非百分比段拿到 `--`，**emitter 分派改由 `nullPolicy`
  驅動**（`emitOther` 增 dash 分支、格式化仍依 FormatKind；不得改塞
  `category:'percentage'`，以免被加 `%` 並誤入 `barEligibleIds`），
  resolve 與兩 emitter 三方同步、byte-exact 對齊。
- `emit-settings.ts` `needsRefreshInterval` 補條件；`mock-data.ts` 補
  兩欄＋全 0 情境＋partial-null 矩陣。
- 捨入不變量全程：一切取整 floor，禁 `Math.round`／`[math]::Round`／
  jq `round`。

### 5. UI＋golden
- 目錄清單 30 段（沿 06b transfer-list／位置制結構，無結構性改動）。
- bar checkbox：百分比段限定；**切開時僅 `threshold === undefined` 才
  由 UI 寫入預設模板，並同步 `templateSelect.value` 設為對應模板 id**
  （避免面板顯示「（自訂）」與心智模型脫節）；已有自訂桶則保留並提示；
  powerline 下 fgOverride 停用＋提示。
- **提示播報通道**：模板寫入／自訂桶保留／fgOverride 停用三處提示皆經
  既有**常駐 live region** 播報（SPEC「批次／狀態切換操作須經常駐
  live region 播報」不變量）。
- `percent-reset` variant × reset 獨立段同列並開 → 重複提示（分工
  明文：variant＝rate 段內附時刻 `(14:30)`；獨立段＝完整倒數
  `↺2h (14:30)`）。
- auto 配色選項（model／effort 段限定）；預覽與產出腳本同源展開。
- golden 重生＋兩 harness、`pipeline.integration.test.ts` 擴 case——
  golden **變因白名單（列舉式，round 2 修訂）**：(1) 新段；(2)
  `Format-ResetsAt` InvariantCulture 順修（既有 ps1 golden 的 helper
  文字隨之）。逐檔審 diff 不得出現白名單外變因。
  CI 時區釘樁**依 S6 結局 (b) 取消**——倒數段沿同機 oracle 體制，
  test.yml／deploy.yml 零改動。

### In-scope 檔清單
`tools/statusline-builder/`：segments.ts、config.ts、color.ts、
threshold.ts、resolve.ts、emit-ansi.ts、emit-bash.ts、emit-ps1.ts、
emit-settings.ts、mock-data.ts、catalog.ts、main.ts、index.html、
style.css、render-preview.ts、multirow-golden-configs.ts、`__golden__/`、
`fixtures/`（7 列複刻配置 JSON，見 Verification）、對應 `*.test.ts`；
`magi/07-statusline-multirow-layout/prefix-table.md`（新 5 段前綴增列）
或本 sprint 內新表；`scripts/golden-statusline*.mjs`；新增
`scripts/e2e-statusline.mjs`（M1 已落地）；`package.json`
（scripts 增 `test:e2e`；devDependencies 增 jsdom——M1 已落地）。
（Rev 4：`.github/workflows/` 兩檔依 S6 結局 (b) 自 In-scope 移除、
零改動。）

### 新依賴
- `jsdom`（devDependency，exact pin；僅測試環境、per-file pragma 局部
  啟用，見 D-d；不進 runtime bundle）。
- CDP e2e：**目標零新依賴**（Node ≥22 內建 WebSocket）；S8 PoC 若證明
  不可行，最小 CDP client devDependency 另行提案＋回寫本節與
  TECHSTACK delta。本機執行 `test:e2e` 需已安裝 Edge/Chromium（環境
  前提，非 npm 依賴）。

## Open questions
- 新 5 段前綴字面（`in:`／`out:`／`cache:`／`r5h:`／`r7d:` 為暫定）：
  tasks 期 developer 擬正式表 → 使用者核可（M1.5 治理句）。
- S5 若 golden 全矩陣超 5 分鐘預算：縮場景（代表性抽樣）或分 shard——
  spike 數據出來後由使用者裁決。
- CDP 重建涵蓋上限（slots 九情境全收 vs 代表 3–4 案）：以 S8 的
  「單 drag 單 session」成本數據於 tasks 期給清單裁決。
- S7 失守時的 ASCII 替代字面（`~`／`#`／`-` 為預想）：屆時使用者核可。

## Spec deltas

### root `SPEC.md`
- **Section: Components(statusline-builder 條目)** — modify
  Why: 目錄 25→30、bar 正交欄、auto 配色、倒數段為公開功能面；且該
  條目現文「圖示改為通用 emoji…原生 emoji 渲染」已被 07 M1.5 推翻
  （07 漏宣告 delta 的遺留漂移），本次 modify 同條目一併修正。
  New content: icon 敘述改「英文短 token 前綴（07 M1.5 裁決，推翻
  emoji 定案）」；補「30 段目錄（tokens 三段＋雙倒數）、百分比段 bar
  正交欄（靜態 4-run、null 退單 run）、model/effort auto 配色
  （resolve 期展開為具體 ColorSpec、比對 model.id）、閾值雙模板、
  `STATUSLINE_NOW_EPOCH` 注入；config 相容性：auto／bar 為 v2 內選填
  擴充，舊碼讀取為有損降級、不 bump」。
- **Section: Status** — modify
  Why: 傘狀 Status 已預告「06c 待其交付時再更新本段」。
  New content: 06c 交付敘述段（5 新段／bar／auto／倒數／now 注入＋
  前置加固＋e2e harness），移除「06c 待交付」佔位句；06a 段落的
  emoji 敘述加 M1.5 修正註記。

### root `CLAUDE.md`
- **Section: Run / test commands** — modify
  Why: `npm run test:e2e` 為新的獨立 gate（本機限定、需瀏覽器、不進
  CI），agent 需知（round 1 I-2 裁決：列入而非豁免）。
  New content: 增一行 `npm run test:e2e  # CDP 整合案（本機限定，需
  Edge/Chromium，不進 CI）`。

### magi/`PRD.md`
- **Section: Goals（statusline 產生器條目）** — modify
  Why: bar／倒數／tokens／自動配色為使用者可見能力；且條目現文
  「圖示採通用 emoji，免安裝字型即可零豆腐使用」已被 07 M1.5 推翻，
  一併修正。
  New content: icon 敘述改「ASCII 短前綴（零字型依賴）」；補「進度條、
  限額重置倒數、tokens 三段、模型／effort 自動配色」半句。

### magi/`TECHSTACK.md`
- **Section: Framework / runtime（statusline-builder 條目）** — modify
  Why: 現文「預覽以系統 monospace＋原生 emoji 渲染」的 emoji 措辭已被
  07 M1.5 推翻，屬遺留漂移，本次順修。
  New content: 「原生 emoji」改「ASCII 前綴 icon」。
- **Section: Test framework** — modify
  Why: jsdom 為新 devDependency＋新 vitest 環境形態；`test:e2e` 為
  vitest 之外的新測試面（round 1 I-1）。
  New content: 補「jsdom（devDep，per-file `@vitest-environment` 局部
  啟用）；`npm run test:e2e`＝CDP 整合案（本機限定、需 Edge/Chromium、
  自起 vite preview、不進 CI）」。
- **Section: Deployment（test.yml／deploy.yml 敘述）** — modify
  Why: 傘狀 deltas 預告 06c 於此落時區釘樁；S6 實證後定稿為「不釘」，
  記錄結論以免後人重議（Rev 4）。
  New content: 補「倒數段真執行 gate 沿現行同機 oracle 體制（S6 實證
  三後端零分岔），CI 不釘時區；`STATUSLINE_NOW_EPOCH` 為腳本可選注入
  （單元／golden 層用）」一句；workflows 檔案本身零改動。

## Verification
- `npm test` 全綠（新增面：threshold 雙模板 10-tuple、
  `sanitizeSegmentColor` allowAuto 矩陣＋fgOverride 拒 auto、resolve
  bar 4-run／null 退單 run／負值 clamp／auto 展開／倒數／expiresAtPath
  ／tokens、emit 三後端、config bar 清洗＋catalog 注入面＋clamp 29、
  mock-data partial-null、jsdom renderRuns（含 bar run ariaText 斷言）、
  `toAnsi([])` 邊界、emit-settings 條件、**emit-ps1「引擎自產字面純
  ASCII」機械化斷言（排除註解行與使用者 prefix 通道）**、**ps1 文化
  不變性斷言**）。
- `npm run typecheck`；`npm run build && npm run verify:dist`。
- golden 真執行 gate：ubuntu（bash＋jq）＋windows（PS 5.1／pwsh 7）對
  新段驗證——斷言強度依 S6 結局 (b) 定稿：倒數段同機 oracle 對比
  （時刻不寫死）、其餘維持 byte-exact；workflows 零改動。
- `npm run test:e2e`（本機）：CDP 整合案綠。
- 手動驗收：30 段目錄可選；bar 開關、預設模板寫入語意與
  `templateSelect` 同步；三處提示的 SR 播報（常駐 live region）；auto
  配色預覽 vs 產出腳本一致；倒數段於真 Claude Code 逐列渲染；**複刻
  使用者現役 7 列配置**（配置 JSON 落 `fixtures/` 供重現）——bar＋
  數值＋倒數同列呈現、`context-remaining` 套逆序模板顏色方向正確
  （傘狀 06c Verification 明訂項回補）。
- 數字錨點：bar 填格 floor（49%→9 格、50%→10 格、100%→20 格、
  負值→0 格）；cache-hit 分母 0 → `0%`、任一輸入欄 null → nullPolicy；
  reset 過期 → 整段隱藏；`1234` → `1.2k`。
