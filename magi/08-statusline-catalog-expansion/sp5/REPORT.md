# S5-T2.4 Spike Report — golden 規模與 CI 真執行時間估算

> Sprint: `magi/08-statusline-catalog-expansion/`　Task: T2.4（S5，gate 前 spike）
> 產物：本檔＋`pipeline-round2.json`（原始 JSON reporter 輸出）＋
> `breakdown-pipeline.mjs`（拆解腳本）＋`probe-coldstart.mjs`（PS1/pwsh
> 冷啟量測腳本）。**不動任何 production 檔**；`golden:update` 跑完後
> `__golden__/` 零 diff（見「量測過程與禁區確認」節）。

## 結論先行

依 `TASKS.md` T4.6 的實際規劃範圍(真執行僅新增少量「bar×倒數×auto
同列」＋「auto×powerline」組合案，**非**逐一代表場景各自真執行)，單
leg 預估增量 **本機 <10 秒**，即便套用 3× 保守係數估計 CI runner 較慢
的情況，仍在 5 分鐘(300 秒)預算內、餘裕逾 90 秒——**不需要 T2.6 使用
者裁決「縮場景 vs 分 shard」，可依 T4.6 現行措辭直接動工**。

但若動工期範圍被誤讀／蔓延成「29 個代表場景(bar 邊界 5 案、auto 14
案等)每案皆給三後端 byte-exact 真執行覆蓋」(非現行規劃，本報告視為
壓力測試上界)，本機估計約 115 秒、套 3× CI 保守係數可能達 5.75
分鐘、**有踩線風險**。故本報告仍依 brief 要求備妥「縮場景 vs 分
shard」兩案供 T2.6 預先參考(見「外插與預算判斷」節尾)。

golden 重生本身**不是瓶頸**：時間由 process 啟動固定成本主導，與案例
數幾乎無關，即使黃金檔數翻倍以上仍 <2.5 秒。

---

## 1. 場景清單定稿與計數

依 brief／PLAN §2(S5 bullet)條列代表場景，逐項計數：

| # | 場景類別 | 說明 | 案數 |
|---|---|---|---|
| 1 | 全段單列(30 段) | 30 段目錄全開單列，涵蓋所有 FormatKind／nullPolicy／新 5 段(比照現行 `plain-full`／`powerline-threshold` canonical 案升級) | 1 |
| 2 | 多列混排 | 代表性多列 case：bar／auto／倒數混排於不同列，驗證新特徵於多列語意(分隔符／箭頭不跨列)下仍成立 | 1 |
| 3 | bar 邊界 5 案 | 百分比 0 / 49 / 50 / 100 / null(填格數 0／9／10／20／單 run dash) | 5 |
| 4 | percent-reset × bar | rate 段 variant=percent-reset 同時開 bar(驗 run4 後綴＋bar 併存不衝突) | 1 |
| 5 | powerline-noarrow × bar | powerline 模式、`powerlineArrow:false`，bar 段依規則併為單一累加器元素 | 1 |
| 6a | auto／model | 4 族(Fable5／Opus／Haiku／Sonnet-或未知 fallback) × 2 模式(plain／powerline) | 8 |
| 6b | auto／effort | 5 級(low/medium/high/xhigh/max)＋ unknown 值 fallback(**非**「欄位缺席」——該分支依 PLAN 明文不可達、不得寫入案表)，單一代表模式 | 6 |
| 7 | 倒數 2 段 × 3 態 | reset-5h：{<1h／≥1h／null-過期}；reset-7d：{<1d／≥1d／null-過期}，各段各自 3 態 | 6 |
| | **合計代表場景(configs)** | | **29** |

備註：
- 第 6b 項「unknown」指 `effort.level` 出現色票查表未收錄的字串值時退
  `fallback=9`——與「欄位缺席→hide」(PLAN 明文標註不可達、禁寫入案
  表)是兩回事，故本清單不含後者。
- 第 1、2 項屬「修改既有 canonical 案」(如 `plain-full` 段數
  25→30)與「新增 1 案」的混合，是否算「新增」不影響下方時間外插
  (檔案是否為新檔對 golden 重生時間無實質差異，見第 2 節)。

### 新增 golden 案數

- 下限(沿用現行比例)：現行 `GOLDEN_CASES`(單列)僅 3/8(37.5%)同
  時有 `.ps1`；若新場景維持此比例：29 個 `.sh` ＋ 約 11 個 `.ps1`
  ≈ **40 個新黃金檔**。
- 上限(06c 核心訴求＝三後端 byte-exact，較合理假設多數新場景需
  `.sh`＋`.ps1` 雙檔以驗證 bar／auto／倒數三特徵的跨後端一致性)：
  29 × 2 = **58 個新黃金檔**。
- 現行 17 個 → 06c 後總數估計 **57–75 個**。
- **此數字對時間預算影響可忽略**(見第 2 節「golden 重生」單價：時間
  由固定 process 啟動成本主導，非案例數)。

### 新增真執行案數

- **T4.6 實際規劃範圍**(`pipeline.integration.test.ts` 擴 case)：
  「bar×倒數×auto 同列」＋「auto×powerline」——估計 **3–6 個**新組合
  `it()`(例如：plain 一案、powerline 一案的「bar+倒數+auto 同列」各
  一，加上 auto×powerline 的 model／effort 各一，共約 4 案，取整數
  範圍 3–6 供外插上下界)。
- **壓力測試上界**(非現行規劃)：若 29 個代表場景「每案皆給三後端
  byte-exact 真執行覆蓋」= **29 案**。

---

## 2. 現行單價實測(本機，兩輪＋補充輪)

### 機器負載狀況

量測期間 `tasklist` 顯示 4 個背景 `node.exe` 行程(推測為同 sprint
其他 lane 的並行 dispatch，`magi/08-statusline-catalog-expansion/`
下 sp2／sp4／sp7／sp8 皆已有 REPORT，可能仍有進行中行程)，
`wmic cpu get loadpercentage` 讀值 53%。**本任務未能完全獨佔機器**，
量測值可能因此偏高(較「真正單獨執行」慢)，但兩輪／三輪讀值高度
一致(見下)，判斷讀數穩定、雜訊在可接受範圍。

### golden 重生(`npm run golden:update`)

三輪皆對現行 17 個黃金檔(11 `.sh` + 6 `.ps1`)重生，`git status
--short tools/statusline-builder/__golden__/` 三輪後皆**零新增
diff**(僅維持既有兩個未追蹤檔案 `multirow-powerline-noarrow.{sh,ps1}`
內容不變——這是前置 T1.3 已產生、本次未再變動的既有未追蹤檔)。

| 輪次 | real time | 備註 |
|---|---|---|
| Round 1 | 1.116s | 冷快取 |
| Round 2 | 1.038s | |
| Round 3 | 1.002s | 快取暖機後 |

拆解固定成本 vs 案例邊際成本(單獨執行內部腳本、跳過 `npm run` 包裝
層)：

| 指令 | 案數 | real time |
|---|---|---|
| `node scripts/golden-statusline.mjs`(單獨) | 11 `.sh` | 0.172s |
| `node scripts/golden-statusline-ps1.mjs`(單獨) | 6 `.ps1` | 0.162s |
| 兩者合計(單獨執行，不經 `npm run`) | 17 | **0.334s** |
| `npm run golden:update`(含 npm CLI 包裝) | 17 | 1.0–1.1s |

**結論**：`npm run` 包裝本身(npm CLI 啟動＋二次 node 進程開銷)占約
0.7–0.8s 固定成本；兩支腳本各自的 TS `registerHooks` 模組載入＋17 案
emit／寫檔僅占 0.334s，換算個案邊際成本 **<20ms/案**。golden 重生時間
幾乎完全由「process 啟動」主導，與案例數近乎無關。

### 真執行 gate(`npx vitest run tools/statusline-builder/pipeline.integration.test.ts`)

本機三後端探測皆為真(`BASH.ok`／`PS1.ok`／`PWSH7.ok` 全 true：Git
Bash＋便攜 jq、`powershell.exe`(PS 5.1)、`pwsh`(7)皆偵測成功)，
故本機量測即等同「全三後端真執行」的 windows-leg-等價情境。

| 輪次 | real time | vitest Duration | tests phase |
|---|---|---|---|
| Round 1 | 1m2.122s | 60.09s | 58.56s |
| Round 2(`--reporter=json`) | 1m1.082s | — | 57.73s(JSON 加總) |

**共 75 個 `it()` 案**(非原估 72——手算漏算 `SP7_CASES` 為 18 案非
17；已依實跑結果訂正)。

Round 2 依 describe 區塊拆解(`breakdown-pipeline.mjs` 解析
`pipeline-round2.json`)：

| describe 區塊 | n | avg ms/案 | 後端組成 |
|---|---|---|---|
| 比對函式自測 | 2 | 1 | 純 JS，無 spawn |
| SP-7 格式化對等 — bash＋jq | 18 | **131** | 僅 bash+jq |
| SP-7 格式化對等 — ps1 5.1 | 19 | **1232** | 僅 PS 5.1 |
| SP-7 格式化對等 — pwsh 7 | 19 | **559** | 僅 pwsh 7 |
| resets 後綴(bash==ps1==oracle) | 2 | 1399 | bash+ps1 混合 |
| plain 閾值 bare head 數值 | 1 | 1392 | bash+ps1 混合 |
| shell-out 等價(真 git repo) | 5 | 1635 | bash+ps1＋多次 git spawn |
| D1 gating 真執行覆蓋 | 1 | 1809 | bash+ps1＋git spawn |
| 多列真執行場景 | 4 | 1577 | bash+ps1 混合 |
| skipIf meta | 4 | 217 | 少量 probe spawn |

**關鍵發現**：PS 5.1 單次 spawn 成本(~1.1–1.2s)遠高於 bash+jq
(~0.13s)與 pwsh 7(~0.56s)，是本檔(乃至 windows leg)的主宰項；
「bash+ps1 混合」型 case(新場景多屬此型)均值落在 **1.4–1.8s/案**。

### PS 5.1／pwsh 7 冷啟成本獨立量測

用與 harness `runPs1()` 逐字相同的 spawn 形態(`-NoProfile
-ExecutionPolicy Bypass -File <script>`)跑最小 `Write-Output "hi"`
腳本，三輪、每輪 6 次：

| 輪次 | PS 5.1 avg(全) | PS 5.1 avg(去首輪) | pwsh 7 avg(全) |
|---|---|---|---|
| 輪 A | 1132ms | 1108ms | 492ms |
| 輪 B(`probe-coldstart.mjs`) | 1122ms | 1090ms | 508ms |

與上表「SP-7 格式化對等 — ps1 5.1」實測 avg 1232ms、「— pwsh 7」實測
avg 559ms 高度吻合(差額為腳本邏輯本身＋stdin JSON 傳遞的額外開銷，
數十至百餘 ms 量級)——**證實 process 冷啟本身即為該後端絕大部分成本
來源，腳本邏輯執行時間可忽略**。

### 補充：全量 `npm test` 基準(單輪，作 CI-leg 等價 proxy)

| 指令 | real time | vitest Duration | 檔案數／案數 |
|---|---|---|---|
| `npx vitest run`(全量) | 1m4.718s | 62.74s | 38 檔／1137 案(+1 todo) |

全量僅比 `pipeline.integration.test.ts` 單檔(60.09s)略高——vitest
跨檔並行，其餘 37 檔(含 `emit-bash.test.ts`／`emit-ps1.test.ts` 各自
獨立的 bash-only／ps1-only 真執行 combos，見下方澄清)皆在此並行窗口
內完成。**`pipeline.integration.test.ts` 是目前單 leg 的關鍵路徑
(critical path)**，本報告後續外插以此檔為主要依據。

**對 brief 假設的重要澄清**：真執行**並非**「都在
`pipeline.integration.test.ts`」——`emit-bash.test.ts`(25 個 `it`，
內含 bash-only `spawnSync` combos)與 `emit-ps1.test.ts`(同樣有
`spawnSync('powershell', …)` 的 ps1-only combos)亦各自真執行。惟因
vitest 跨檔並行、且此兩檔現行耗時皆短於
`pipeline.integration.test.ts`，未成為關鍵路徑，不影響本報告結論；若
新場景的真執行覆蓋改落在此兩檔(而非
`pipeline.integration.test.ts`)，仍需個別確認是否超過關鍵路徑檔案
時間(見下方外插的兩種情境同樣適用此檔案分布假設)。

---

## 3. 外插與預算判斷

以下皆以本機數字為基礎；windows CI runner(GitHub-hosted)普遍比本機
開發機慢(尤其 PowerShell process 啟動涉及較多系統開銷)，故另附
2×／3× 保守係數評估風險上界。

### golden 重生(不分情境)

即使黃金檔數自 17 成長至上限 75(+58)，依「<20ms/案邊際成本」估算：
58 × 20ms ≈ **1.16s** 新增，加上現有 ~1.0s 固定成本，總計 **<2.5s**。
**遠低於預算，非瓶頸來源，兩情境皆不受影響。**

### 情境 A：依 T4.6 實際規劃(真執行僅加 3–6 個組合案)

取中間值 4 案，每案為 bash+ps1 混合型(取上表混合 describe 均值
1.6s/案代表值)：

| 項目 | 數值 |
|---|---|
| 新增真執行時間(本機) | 4 × 1.6s ≈ 6.4s |
| 新 `pipeline.integration.test.ts` 預估(本機) | 60.09s + 6.4s ≈ 66.5s |
| 新全量 `npm test` 預估(本機) | 62.74s + 6.4s ≈ 69.1s(≈1.15 分) |
| 套 3× CI 保守係數 | ≈207s(≈3.5 分) |
| 對 300s 預算餘裕 | **≈93s** |

**結論：情境 A 下，即便套用 3× 保守係數，仍在 5 分鐘預算內、餘裕
逾 90 秒——不踩線。**

### 情境 B：壓力測試上界(29 個代表場景皆給真執行覆蓋，非現行規劃)

| 項目 | 數值 |
|---|---|
| 新增真執行時間(本機，29 × 1.6~1.8s) | ≈46.4–52.2s |
| 新全量 `npm test` 預估(本機，取 52s) | 62.74s + 52s ≈ 115s(≈1.9 分) |
| 套 2× CI 保守係數 | ≈230s(≈3.8 分，餘裕 ≈70s，未踩線) |
| 套 3× CI 保守係數 | ≈345s(≈5.75 分，**超出 300s 預算**) |

**結論：情境 B 在「CI 顯著慢於本機(3×)」的悲觀假設下有踩線風險**；
在較溫和的 2× 假設下仍未踩線。風險高度依賴「CI runner 實際比本機慢
多少倍」這個未知數，且情境 B 本身**不是** T4.6 現行規劃的範圍。

### 判斷

- **依現行 T4.6 規劃(情境 A)：預算內，不需要 T2.6 使用者裁決。**
- 若範圍蔓延至情境 B(每個代表場景皆真執行)：**有風險，需裁決**。
  以下備妥兩案供屆時參考：

#### 方案一：縮場景(建議；與 T4.6 現行措辭一致)

- **做法**：bar 邊界(0/49/50/100/null)、auto 各族／各級等純粹
  「數值/顏色/格式變化」案，只留 **golden-only**(`.sh`／`.ps1` 文字
  黃金、人審 diff)覆蓋，不進 `pipeline.integration.test.ts` /
  `emit-bash.test.ts` / `emit-ps1.test.ts` 的真 spawn byte-exact
  執行；真執行僅保留 T4.6 已規劃的 3–6 個「多特徵同列組合」代表案
  (例：bar+倒數+auto 同列 × {plain, powerline} 各一、auto×powerline
  × {model, effort} 各一)。
- **理由**：golden 文字比對已可逐位元組捕捉差異(人審把關)；純函式
  層(`resolve.test.ts`，S4 spike 已規劃的 bar/auto byte 斷言)另外
  補上跨後端邏輯正確性的無 spawn 快速回歸——golden＋純函式層兩者互補
  即可達到與「全案真執行」相近的把關強度，且幾乎零 CI 時間代價(golden
  重生已證明與案例數無關；`resolve.test.ts` 為純 JS 函式呼叫，無
  process spawn，單案 <1ms 量級)。
- **代價**：個別 boundary 案本身不再有「三後端跨進程」層級的
  byte-exact 自動化背書，僅靠「golden 文字比對＋resolve 純函式層」把
  關；若三後端 emit 邏輯本身有錯而非資料錯，理論上仍可能漏網，但機率
  低(S4 spike 已對 bar 四格 byte 逐後端手寫驗證，該屬該風險的獨立把關
  層)。

#### 方案二：分 shard

- **做法**：把 windows leg(PS 5.1／pwsh 7 真執行密集、成本最高)拆
  成兩個 matrix job(如 `vitest run --shard=1/2` /
  `--shard=2/2`，或將 `pipeline.integration.test.ts` 獨立切成一個
  job、其餘測試檔另一個 job 平行執行)。
- **效益試算**：以情境 B 上界(新全量 `npm test` ≈115s 本機、套 3×
  ≈345s)為例，若新增真執行內容(本機 ≈52s)可均分至兩 shard(各
  +26s)，則單 shard 預估 ≈62.74s(現有基線)/2 之近似值 + 26s
  ——實務上現有基線亦需依檔案分布切分，粗估單 shard ≈60–65s 本機、套
  3× ≈180–195s(3.0–3.3 分)，重新落回預算內、餘裕可觀。
- **代價**：CI 設定複雜度上升(matrix 維度增加、需人工或工具確保
  shard 間測試檔分布均衡，否則其中一 shard 仍可能成為新瓶頸)；PS
  5.1 冷啟成本本身無法透過 shard 消除(仍是 per-process 開銷)，只是
  把總量攤開到並行 job，故無法把「單一 case 的 1.1s PS1 冷啟」壓
  低，只能降低「總 case 數 × 冷啟成本」對單一 job wall time 的加總
  效果。

---

## 4. 量測過程與禁區確認

- 未修改任何 production 檔(`tools/statusline-builder/*.ts`、
  `scripts/*.mjs`、`.github/workflows/*.yml` 等零改動，僅讀取)。
- `npm run golden:update` 共執行 3 輪(皆為完整 17 案重生)，每輪後
  `git status --short tools/statusline-builder/__golden__/` 檢查：
  三輪皆僅顯示既有兩個未追蹤檔案(`multirow-powerline-noarrow.sh` /
  `.ps1`，T1.3 前置工作留下、非本次產生)，**無任何 modified／新增
  diff**，符合「現行 config 不變理應零 diff」預期，無異常需回報。
- `git status --short`(全倉庫)於 spike 開始前後比對，僅新增
  `magi/08-statusline-catalog-expansion/sp5/` 下本次 deliverable
  檔案，未影響其他 lane 未提交改動。
- 量測期間機器非完全空閒(背景 4 個 `node.exe` 行程、CPU 負載
  ~53%，推測為同 sprint 其他 lane 並行 dispatch)；兩輪／三輪讀值
  差異皆在 ±10% 內，判斷雜訊可接受、結論方向不受影響。

## Touched / produced files

- `magi/08-statusline-catalog-expansion/sp5/REPORT.md`(本檔)
- `magi/08-statusline-catalog-expansion/sp5/pipeline-round2.json`
  (`--reporter=json` 原始輸出，供覆算)
- `magi/08-statusline-catalog-expansion/sp5/breakdown-pipeline.mjs`
  (JSON → 逐 describe 平均秒數拆解腳本)
- `magi/08-statusline-catalog-expansion/sp5/probe-coldstart.mjs`
  (PS 5.1／pwsh 7 process 冷啟成本獨立量測腳本)

未修改任何 repo 內既有檔案。

