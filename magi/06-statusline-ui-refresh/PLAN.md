# Statusline Builder UI Refresh — 通用字型、雙欄版面、多列輸出、全站主題與 Footer

> Type: feat • Scale: major • Sprint: magi/06-statusline-ui-refresh/（umbrella）
> Rev 3（2026-07-10）：Rev 2 回應 Round 1（資料形狀重做、多列契約、三段拆分）；
> Rev 3 回應 Round 2（箭頭前移 06a、TZ 策略修正、渲染列序收口、deltas 補齊、
> verify-dist 兩處硬缺陷、aria enforcement 改目錄級斷言）。
> 對照表見文末「Round 1／Round 2 回應對照表」。

## Context

Sprint 05 交付的 Claude Code statusline 產生器已上線，但實際使用後浮現六項體驗問題（使用者回饋原文編號 1–6）：

1. **Nerd Font 門檻過高**：目前 25 段 segment 的圖示與 powerline 箭頭都是 Nerd Font PUA glyph，頁面橫幅要求使用者「終端自行安裝 Nerd Font」。大多數使用者不會為了狀態列裝字型——產出腳本在未裝字型的終端會顯示豆腐字。應改以通用 glyph 為主。
2. **版面動線**：設定區（很長）與預覽／產出區垂直排列，調整設定時看不到預覽。建議左右分欄：左＝選擇顯示內容，右＝預覽＋複製腳本。
3. **只能單列**：目前所有 segment 只能排在同一列，實際需求是可把 segment 分配到不同列。**多行可行性已確認**：使用者自己的生產環境 statusline（PowerShell）是 **7 列**輸出（標頭註解寫 8 列，實際 `$output` 累加 7 筆——line1／context／Lim5H／Lim7D／Tokens／cwd／末列），以 LF join 後單次 `WriteLine`，Claude Code 正常逐列渲染——列數**不應設產品上限**。
4. **排序鈕位置**：上／下移鈕目前藏在展開後的控件區第一欄，建議移到「打勾那欄位」（enable row）的最後面，較直觀。
5. **深／淺主題**：頁面本身無深色模式。已確認範圍＝**全站 EZTools**（入口頁＋四個工具頁）。
6. **Footer 作者資訊**：加上 GitHub 首頁 <https://github.com/alan60910> 與作者資訊。已確認範圍＝**全站 footer**。
7. **License 討論**：本 repo `LICENSE` 已是 MIT（Copyright (c) 2026 alan60910）。要討論的其實是第三方元件與 MIT 的相容性，見 §License 結論。

### 追加範圍（2026-07-10 第二輪回饋，自使用者現役腳本 promote 進本 sprint）

8. **進度條**：百分比段可附 `█░` 20 格進度條，按閾值變色。
9. **限額重置倒數**：`rate_limits.*.resets_at` 換算「↺ 2h (14:30)」倒數＋重置時刻。
10. **Tokens 三段**：`context_window.current_usage` 拆成輸入／輸出／Cache 命中率三個獨立 segment 供選。
11. **模型／effort 自動配色**：查證後無官方 per-model 配色文件；採 howar31/claude-statusline 參考方案（色票已重編碼為 256 索引，見 D5）。

## 交付拆分（Round 1 I7，全票採納）

本 PLAN 為 umbrella 契約，實作與驗收拆三段，各自獨立可 merge：

| 段 | 範圍 | 風險 | golden 重生變因 |
|---|---|---|---|
| **06a** | 字型移除（emoji 化＋**powerline 箭頭條件化與 CONFIG_VERSION 2 遷移**）＋全站主題＋footer＋license 註記 | 低中 | glyph 替換＋箭頭翻轉（均小且可審） |
| **06b** | 多列輸出＋雙欄版面＋排序鈕語意（`row` 為 v2 內選填欄，不再 bump） | 中 | 僅多列 join 一種變因 |
| **06c** | 目錄擴充（bar／倒數／tokens／auto 配色）——**動工前先跑 §Spikes** | 高 | 僅新段一種變因 |

> Round 2 修訂：`powerlineArrow` 整組前移進 06a——否則 06a 單獨部署後 powerline 腳本仍吐 PUA 箭頭、警語橫幅卻已刪除，且預覽（CSS 三角形）與實際產出不一致，違反 06a 自己的 Goals。

06a 直接以本資料夾走 `/magi:tasks`；06b、06c 屆時各開 sprint 資料夾（`magi/07-*`、`magi/08-*`），PLAN 以本文件對應章節為契約來源。依賴：06b 依賴 06a 的 glyph 定案；06c 依賴 06b 的多列引擎。

## Goals & Non-Goals

### Goals
- **06a**：產出腳本與預覽**完全**不再依賴 Nerd Font（segment 圖示改 emoji＋powerline 箭頭預設關閉、刪字型 subset／橫幅／再生工序）；全站深／淺主題（系統跟隨＋手動切換＋記憶）；全站 footer（作者＋GitHub＋授權註記）；License 結論落地。
- **06b**：多列輸出（每段可指定列、列數無產品上限）；雙欄版面（左設定右預覽＋產出，sticky）；上／下移鈕移位並釘死多列下的排序語意；segment 清單改依渲染列分組。
- **06c**：目錄 25→30 段（token-in／token-out／cache-hit／reset-5h／reset-7d）；百分比段 bar 正交欄；model／effort 自動配色；「限額漸層」閾值模板（含逆序版）。

### Non-Goals
- tri-path 描述子架構與閾值變色機制不動（目錄擴充但不改既有段的欄位語意）。
- 不做拖曳跨列（下拉選列；拖曳維持列內語意）。
- 不做「每列獨立 mode／separator」——mode 與分隔符全域共用。
- 不動其他三個工具的功能，只套用共用主題與 footer。

## Design options considered

### D1. Nerd Font 移除後，圖示與 powerline 箭頭怎麼辦

| 選項 | 內容 | 成本 | 風險 | 誰受益／誰受害 |
|---|---|---|---|---|
| A | 圖示改 **emoji**；powerline 箭頭預設**移除**（色塊直接相接），`` 降為進階選項附「需字型支援」警語 | 中 | emoji 為雙寬字元，對齊依終端而異（可接受，不做欄對齊）；**PS 5.1 編碼風險見 §Spikes S1** | 受益：所有未裝字型的使用者。受害：已裝 Nerd Font 者少了單色圖示 |
| B | 圖示改純 ASCII；powerline 模式移除 | 低 | 觀感大幅下降；powerline 是 sprint 05 主要賣點 | 受益：極端相容性。受害：想要視覺效果者 |
| C | Nerd Font 留作進階開關 | 高 | 雙套 glyph／字型路徑／測試矩陣翻倍 | 受害：維護者 |

**推薦 A**，補充裁決（Round 1／Round 2 修訂）：
- **`powerlineArrow` gating 條件表**（Round 2 釘死；此欄與 v2 遷移屬 06a）：

  | `powerlineArrow` | 段間箭頭 | `lastArrowCap` | 右 padding | UI |
  |---|---|---|---|---|
  | `false`（v2 預設） | 無 | **無效**（不 emit cap；checkbox 停用） | **生效**：每段 value 後補一空格（`head + value + ' '`） | 箭頭 checkbox 未勾 |
  | `true`（v1 遷移沿襲） | ``（PUA） | 完整 v1 語意（逐列收尾） | **不套**（保留 v1 觀感與 byte 輸出） | 勾選＋「需字型支援」警語 |

  不用左 padding——Claude Code 會 trim 列首空白（參考腳本註解實證）。UI 對「全段預設色＋powerline＋無箭頭」組合顯示提示（無色塊邊界警告）。gating 與遷移組合入 06a golden 與單元測試。
- **預覽端箭頭**：字型刪除後 `` 在預覽必為豆腐——預覽以 **CSS `clip-path` 三角形**（或 inline SVG）渲染箭頭視覺，`aria` 由既有 ariaText 承載，不留任何字型資產。
- **aria enforcement 補位**（Round 2 修訂——**不動 `PUA_RE`**）：原「擴充 `\p{Extended_Pictographic}`」方案會炸掉 validate.ts 明文放行（含釘死測試）的 emoji 前綴／分隔符，且對舊存檔在 init 期拋 TypeError。改為**目錄級結構斷言**：`segments.test.ts` 斷言每個 descriptor `icon.glyph` 非空 ⇒ `icon.ariaText` 非空（icon run 在 resolve 結構上不可能漏設，真正要防的是 descriptor 作者漏填）。最終 label 斷言維持 PUA-only；補「emoji 前綴不觸發 enforcement」負向測試；validate.ts 的 emoji 放行政策明文不變。

### D2. 多列的資料形狀

**採選項 A（`SegmentConfig.row`）；CONFIG_VERSION bump 至 2 與 `powerlineArrow` 屬 06a、`row` 屬 06b（v2 內選填欄）**（Round 1／2 修訂）：

- **06a／v2 遷移**：`BuilderConfig.powerlineArrow: boolean`（預設 false）。migrate v1→v2：`mode === 'powerline'` 的 v1 存檔設 `powerlineArrow: true`（保留既有觀感）、`mode` 缺欄或 `'plain'` → false，其餘欄照 `sanitizeConfig`；`migrateConfig` 現行「未知版本重置」改為 v1 專用遷移＋其他版本重置。遷移 edge case 測試：缺 `mode`／`mode:'plain'`／損壞存檔。
- **06b**：`SegmentConfig.row?: number`（v2 選填欄，缺→0）：清洗＝非整數／負值／缺→0，**clamp 至 `catalog 段數 − 1`（上限 29）**——防手改存檔 `row:999999999` 讓列選單枚舉凍死頁面；產品敘事仍是「無上限」。
- 列內順序＝陣列順序；resolve 期按 `row` 分組、空列壓縮剔除。
- **列序語意（Round 2 收口）**：分組**依 `row` 值升冪**排序後壓縮＝**渲染列序**（邏輯列 1..N）；UI 播報、badge、`<select>` 選項文字、預覽 aria、產出腳本行序**全面採渲染列序**；且**每次 config 寫回時將 `row` 正規化為 0..N−1**——存檔口徑與顯示口徑永久合一，「保存後列分佈不變」可保證。亂序輸入單元測試必備。
- **列選擇 UI**：每段「顯示於第 N 列」`<select>` 枚舉實際使用中的列（以渲染列序顯示）＋「新增一列」；選項刷新以更新既有 `<option>` 實作，**不重建 `<select>` 節點**（防鍵盤焦點跳失）。

### D3. 雙欄版面實作

CSS Grid 兩欄（斷點約 `1100px` 以下退單欄），**DOM 順序不動**，只加兩個 wrapper 調整視覺配置。Round 1 修訂：

- 右欄 `position: sticky; top: 0; align-self: start`（grid 子項預設 stretch 會使 sticky 失效——必須 start）；`max-height: 100dvh`（非 `100vh`，行動端工具列遮擋）；`overflow-y: auto`。
- **右欄捲動容器**：`role="region"`＋`tabindex="0"`＋`aria-label="預覽與產出"`（Round 2：generic `<div>` 的 aria-label 多數 AT 不朗讀，必須有 role；WCAG 2.1.1 鍵盤可捲）。
- 預覽終端框 `overflow-x: auto`（多列＋bar 在窄視口的橫向溢位）——這是**第二個**鍵盤捲動區，同樣 `tabindex="0"`（其 `role="group"`＋aria-label 已承載名稱）。a11y 契約表述＝「tab 序新增**兩個**捲動停點，其餘不變」。
- skip-link 保留。

### D4. 全站主題機制

Round 1 修訂——三態模型與 token 單一來源：

- **三態**：`<html>` 無 `data-theme`＝跟隨系統；`data-theme="dark"`／`"light"`＝顯式覆寫。
- **token 單一來源**：深色調色盤定義為獨立 custom properties（`--dark-bg`、`--dark-fg`…）置於 `:root`；兩個深色情境（`@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }` 與 `:root[data-theme="dark"]`）內只做 `--bg: var(--dark-bg)` 式**引用**，色值不重複——修掉「深色 OS 手選淺色失效」與雙處定義漂移兩個經典陷阱。
- `:root` 設 `color-scheme: light`、深色情境設 `color-scheme: dark`（原生捲軸／`<select>`／`<input type="color">` 跟色——本工具色選正好用到）。
- **inline script（各頁 `<head>`，防 FOUC）**，實文釘死：

  ```html
  <script>
    (function () {
      try {
        var t = localStorage.getItem('eztools-theme');
        if (t === 'dark' || t === 'light')
          document.documentElement.setAttribute('data-theme', t);
      } catch (e) {}
    })();
  </script>
  ```

- **優先次序**：localStorage（使用者手動切換過）＞ 系統 `prefers-color-scheme` ＞ 淺色預設。toggle 鈕（**五頁全部**，含入口頁——Round 2 收口 D4 與 06a-2 的矛盾）：以「當前有效主題」取反並寫入 localStorage；鈕帶 `aria-pressed`。**明文：CSS 為三態模型，UI 對外雙態**——首次切換後 localStorage 恆有值、「跟隨系統」不再可達，屬刻意取捨。共用邏輯 `src/theme.ts`，工具頁 main.ts 於任何渲染前 import；入口頁 toggle 監聽併入 inline script。
- **localStorage key 慣例**（Round 2 新增）：全站 key 統一 `eztools-<scope>-<name>` 格式；本 sprint 用 `eztools-theme`（全站 scope 省略 tool 名），statusline-builder 既有 config key 維持不變；慣例寫入 SPEC Conventions。
- **入口頁例外**：root `index.html` 的「零 JS」invariant 字面鬆綁為「零框架 JS；唯一例外為主題切換 inline script（含 toggle 監聽；零依賴、零請求）」→ Spec delta。**同步修改 `scripts/verify-dist.mjs:76-80`**：現行「`dist/index.html` 含 `<script` 即 fail」是硬性斷言，inline script 一進去 build 必炸（Round 2 sonnet Critical）——斷言改為白名單比對（僅允許固定的主題 script 內容，其他 `<script>` 仍 fail），屬**程式碼變更**非文件變更，列入 06a-2 工作項。
- statusline-builder 預覽框「預覽底色 深／淺」radio 與站台主題**無關**（模擬使用者終端底色），維持獨立。

### D5. 目錄擴充的形狀選擇（追加範圍 8–11；Round 1 兩個 Critical 的重做）

| 能力 | Round 1 問題 | 修訂後裁決 |
|---|---|---|
| 進度條 | variant 三選一互斥＋config 依 id 去重 → 「bar＋數值＋倒數同列」的驗收場景做不出來；run 粒度與參考圖矛盾 | **改為 `SegmentConfig` 正交欄 `bar?: boolean`**（僅百分比段可持有，清洗同 auto 的段別限定）。開啟時 value＝`filled + empty + ' ' + pct%`，與 variant（percent／percent-reset）正交共存 |
| 重置倒數 | 與既有 `percent-reset` variant 重疊、去留未裁決 | 維持**獨立段**（reset-5h／reset-7d，nullPolicy=hide）。**分工明文**：`percent-reset`＝rate 段內附重置時刻 `(14:30)`（保留）；獨立 reset 段＝完整倒數 `↺2h (14:30)`。UI 於同段同列兩者並開時顯示重複提示 |
| Tokens | cache 命中率是跨欄運算非取值，公式未釘 | **三獨立段**維持；公式釘死見下「cache-hit 公式」 |
| 自動配色 | 色票用基本 ANSI 碼表述，`ColorSpec` 無法表示；union 污染；清洗限定無處實作 | **色票重編碼為 256 索引**（見下表）；`ColorSpec` 維持封閉三態，**另立 `SegmentColor = ColorSpec \| { kind: 'auto' }`** 僅用於 `SegmentConfig.color`；清洗拆兩支（通用色／段主色吃 id）；resolve 期把 auto **展開為具體 ColorSpec** 再進 SGR 建構 |

#### auto 配色定案色票（全部 `{kind:'ansi256', index:N}`，免 truecolor、管線零改動）

| Model family | index | Effort level | index |
|---|---|---|---|
| Fable 5 | 214（金） | low | 3（黃） |
| Opus | 135（紫） | medium | 2（綠） |
| Haiku | 2（綠） | high | 4（藍） |
| Sonnet／未知模型 fallback | 6（青） | xhigh | 5（紫紅） |
| | | max | 15（亮白） |
| | | unknown 值（schema drift） | 9（亮紅） |

effort 為 **5 級**（low/medium/high/xhigh/max）＋**單一** fallback（unknown 值→亮紅）。Round 2 修訂：原「無 effort 欄位→244 灰」列刪除——effort 段 `nullPolicy: 'hide'`，欄位缺席時整段剔除，該分支永不可達（勿寫進 case 表與 golden）。基本色 index（2/3/4/5/9/15）可被終端主題覆寫屬刻意選擇（與參考方案一致、plain 模式為主要場景）；powerline 模式下 auto＝bg，配對 fg 沿既有 `autoFg` 機制對**展開後的具體 index** 計算（S4 一併驗對比）。emitter 的 case 邏輯（bash `case`／ps1 `-match` 對 model id／effort level 字串）為新的執行期分流，獨立小函式實作、不與 threshold 索引路徑共用變數。清洗限定的實作位置（Round 2 haiku）：`sanitizeColorSpec` 維持 context-free，段別限定在 `sanitizeSegment`（已持有 id）層執行——非 model/effort 段的 `auto` → 退 `{kind:'default'}`。

#### bar 的 run 粒度與呈現（Round 1 釘死）

- run 分裂規則：bar 開啟的百分比段 value 拆**靜態 4 run**——`head`＋`filled`（桶色）＋`empty`（default 色）＋`' pct%'`（桶色）。run 數與資料無關，emit 平行陣列筆數可於 emit 期決定。
- 填格數＝`min(20, floor(pct / 5))`（**floor**，見捨入不變量）。
- **「powerline 段恆單 run」不變量正式退役**（Round 2）：`resolve.ts` 檔頭該條契約改寫為「bar 段例外（4 run）；powerline 箭頭交接的 bg 一律取**段主色**」，三 emitter 依此同構展開。
- **powerline 模式**：bar 段的桶色套 **fg**（filled 與 pct 文字），empty run fg＝default，bg 全段維持段主色。**bar 段停用 `fgOverride`**（現行 fgOverride 語意是全桶蓋色，會吃掉閾值資訊——UI 停用該控件並提示）。
- **null／缺模板邊界**（Round 2）：主值 null（dash）時**不畫格**，value 維持 `--`（bar 僅於數值存在時出現）；`threshold === undefined` 而 bar 開啟（手改存檔可達）→ filled／pct 退**段主色**。
- **預設模板寫入語意**：切開 bar 時，僅在該段 `threshold === undefined` 時由 UI 寫入預設模板；已有自訂桶則保留並提示。config 層補此行為的單元測試。

#### 閾值模板：「限額漸層」＋逆序版

- 「限額漸層」（按**用量**）：10 桶＝0–49% 灰階（244→250 漸亮）、50–79% 綠、80–89% 黃、90–100% 紅——即 `reference-limit-bar-gradient.png`。與使用者現役腳本「按剩餘量」判色**方向等價**（用量＝100−剩餘），統一以用量表述。
- 「剩餘漸層」＝逆序版。**`context-remaining` 預設套逆序版**（值越高越好，套用量版會讓剩餘 95% 顯示紅色）；rate-5h／rate-7d／context-used 預設套用量版。閾值輸入一律＝該段原始值，不做隱式反轉。

#### cache-hit 公式（Round 1 釘死；Round 2 變數名對應實際欄位）

欄位對應（`context_window.current_usage.*`）：token-in＝`input_tokens`、token-out＝`output_tokens`、cache-hit＝
`floor(cache_read_input_tokens × 100 / (input_tokens + cache_creation_input_tokens + cache_read_input_tokens))`。
分母 0 → `0%`；`current_usage` 為 null（實測 4/73：首回應前／compact 後）→ 沿用百分比段 null 政策顯示 `--` 不套閾值；token-in／token-out null → `--`。三後端同式全 floor，jq／ps1 實例於 tasks 期寫入 descriptor 註解（jq：`(.context_window.current_usage) as $u | ...`；ps1 比照參考腳本 `:163` 特判分母）。`1.2k` 縮寫＝**整數算術**：`n ≥ 1000` 時 `floor(n/100)` 得十分位整數再手動插小數點（比照 cost 段「×10⁴→floor→切片」idiom），全程不碰浮點格式化與文化特性；值域僅設 k 檔（與參考腳本一致，百萬級顯示如 `1500.0k`——接受，不設 M 檔）。
`mock-data.ts`（Round 2 修正——`resets_at`／`current_usage` 既存且已有兩組 null）：實際工作＝各情境**補 `cache_creation_input_tokens`／`cache_read_input_tokens` 兩欄**＋一組四欄全 0（除零）情境；`segments.ts` 同步把 `CurrentUsage` 自 `Record<string, unknown>` 收緊為具名型別。

#### 倒數計算與顯示格式：純 jq，刪除 date 雙式（Round 1 I3；Round 2 格式釘死）

bash 端倒數差值＋本地時刻格式化**全部收進 jq**（`now`＋`strflocaltime`，與既有 `percent-reset` 後綴同源、維持「bash 零數學」慣例）；不引入 shell `date`。ps1 端沿用參考腳本的 `DateTimeOffset` 做法。動工前跑 §Spikes S2。

顯示格式（全 floor，三後端同式；比照參考腳本兩套階梯）：
- **reset-5h**：`diff ≥ 1h → "↺ Xh (HH:MM)"`；否則 `"↺ Xm (HH:MM)"`；時刻 `%H:%M`。
- **reset-7d**：`diff ≥ 1d → "↺ Xd (MM/DD HH:MM)"`；否則 `"↺ XhYm (MM/DD HH:MM)"`；時刻 `%m/%d %H:%M`（七天後只給 HH:MM 無資訊量）。
- `resets_at` null **或 `diff ≤ 0`（已過期）→ 整段 hide**（nullPolicy 延伸涵蓋過期）。

## 多列輸出的引擎契約（Round 1 I1＋minority 釘死）

- `resolve()` 回傳 `rows: StyledRun[][]`（按 row 分組、空列壓縮）。**受影響面完整清單**：`emit-ansi.toAnsi(rows: StyledRun[][])`、`resolve.toAriaLabel`（簽章同步）、`scripts/golden-statusline*.mjs` 兩個 harness、`pipeline.integration.test.ts`、`render-preview.ts`。
- **行尾契約**：列間以單一 **LF** join、**無尾隨換行**——bash 維持 `printf '%s' "$out"`、ps1 維持 `[Console]::Out.Write($out)`（`$out` 內含 `` `n ``），**不用** `printf '%s\n'` 也**不用** `WriteLine`（Windows 附 CRLF，byte-exact 必炸）。oracle＝`rows.map(joinRow).join('\n')`。每列行尾 SGR reset 在 LF **之前**。Claude Code 對無尾隨換行的渲染等價性由 §Spikes S3 驗證，若需尾隨換行則三處同步加單一 LF。
- **全段隱藏退化**（Round 2）：`resolve()` 於零存活列時回傳 **`[[]]`**（一列空列）——保住 `toAnsi` 「全隱藏輸出恆為單一 reset、非空字串」的既有鎖死不變量與 golden；預覽於零存活列時仍渲染一個具名容器（沿用 `EMPTY_PREVIEW_LABEL` 兜底）。
- **`lastArrowCap` 逐列套用**（每列各自收尾箭頭）；**僅於 `powerlineArrow === true` 時生效**（gating 條件表見 D1）。
- **now 注入**：`ResolveInput` 加 `now: number`（mock 情境給定值）；產出腳本讀可選環境變數 `STATUSLINE_NOW_EPOCH` 覆寫 now（缺席回落真時鐘；jq 注入形＝`env.STATUSLINE_NOW_EPOCH // (now|floor)` 加 `tonumber`，**零 shell `date`**，S2 驗證）。**時區策略（Round 2 修正——`TZ` 環境變數對 .NET／PS 5.1 無效，讀的是 Windows 登錄檔）**：ubuntu leg（jq／Node）釘 `TZ`；windows leg 以 `tzutil /s` 顯式設定時區（teardown 還原）或斷言 runner 為 UTC，並維持既有「同機 oracle 對比」策略；S6 spike 先驗。
- **捨入不變量**：延續 `threshold.ts` 檔頭「全 floor、公式同形」契約——本 sprint 一切取整（bar 填格、`1.2k`、cache-hit、桶索引）一律 floor，禁用 `Math.round`／`[math]::Round`（banker's rounding）／jq `round`。
- **多列預覽 a11y**：預覽框改 `role="group"`＋`aria-label="狀態列預覽"`，內部**每列一個 `role="img"` 容器**、`aria-label="第 N 列：<該列 ariaText>"`（N＝渲染列序）——AT 使用者可逐列導覽，不再是單一長句。

## 排序與列指派 UX（Round 1 I2 全票；Round 2 補實作縫隙）

- **清單結構重構（Round 2——同列交換在現行 4 個類別 `<ol>` 上做不到）**：現行 UI 依 SegmentCategory 分 4 個 `<ol>`，`moveSegment` 用 `previousElementSibling` 相鄰交換；但「列」與「類別」正交（參考腳本第一列就混三類），同列的前一段可能在別的 `<ol>` 裡。裁決：**啟用段改「依渲染列分組」呈現**（每列一組、列內順序＝視覺順序＝陣列序），**未啟用段維持既有四類分組區**（雙區清單）；`moveSegment` 改以 `config.segments` 陣列中「同 row 子序列」的索引運算＋重渲染實作，不再依賴 DOM 相鄰節點交換。此結構同時解掉「同列段視覺不相鄰」問題，列號 badge 降為輔助。
- **上／下移＝同列內與前／後一個同列段交換**；跨列移動一律走「顯示於第 N 列」select。段已是該列首／末時對應鈕停用（`disabled`＋維持可見）。
- 播報文案：「〈段名〉移至第 N 列第 M 位（共 K）」（N＝渲染列序）。
- 拖曳維持既有機制但語意同上下移（限同列；拖放落點跨列時吸附回原列並播報）。
- 上／下移鈕位置：`.segment-row__enable-field` 尾端（`margin-left:auto`），僅啟用列顯示。
- 「從空白建多列」流程：勾選段（預設列 1）→ 該段 select 選「新增一列」→ 段移至列 2 且全段 select 選項出現列 2……重複即得 N 列。此流程寫入 06b 驗收。

## Recommended approach（依 06a/06b/06c 重組）

### 06a-1. Nerd Font 移除（含箭頭條件化）
- `segments.ts`：25 段 `icon.glyph` PUA → emoji（對照表已核可，見已裁決），`ariaText` 不變；aria enforcement＝目錄級斷言（D1 Round 2 修訂，**不動 PUA_RE**）。
- `config.ts`：`powerlineArrow` 欄＋CONFIG_VERSION 2＋v1→v2 遷移（D2）；`resolve.ts`／`emit-bash.ts`／`emit-ps1.ts`：箭頭與 cap 依 gating 條件表條件化＋右 padding（D1）。
- 刪除：`tools/statusline-builder/fonts/`（含 LICENSE-nerd-fonts.md／README.md）、`preview-font.css`、`index.html` nerd-font-banner 與 header 第二段、`render-preview.ts` 字型 import 與 `PREVIEW_FONT_FAMILY_NAME`、`scripts/subset-statusline-font.mjs`、`package.json` 的 **`subset-font@2.5.0` 與 `fontkit@2.0.4`** 兩個 devDependency（fontkit 唯一消費者就是 subset 腳本——Round 2 補列，本 sprint 淨刪**兩個**依賴）。
- `scripts/verify-dist.mjs`（Round 2 修正範圍）：字型 guard 實為 **:124-165**——分段刪除 :124-130（註解）＋:135-144（CSS inline 斷言）＋:149-165（來源 woff2 存在／<100KB 斷言含 else fail），**保留** :131-147 內與字型無關的 `assetsDir` 存在性與 CSS chunk 存在性斷言；檔頭 :20-26 route-A 說明同步修訂。（註：「禁獨立 woff2」僅為註解、非斷言——勿按 Round 1 誤述實作。）
- 預覽字型退回 `ui-monospace` 系統字族＋原生 emoji；powerline 箭頭預覽視覺改 CSS 三角形（D1）。
- 產出腳本 golden 重生（glyph＋箭頭翻轉兩個小變因，diff 皆可逐行審）。**PS 5.1 編碼 spike（S1）先行**。

### 06a-2. 全站主題＋footer＋license
- `src/style.css` token 化＋深色系（D4 單一來源結構）；`src/theme.ts` 新增；五頁 `<head>` inline script；**五頁** header 加 toggle（`aria-pressed`；入口頁 toggle 監聽併入 inline script）。
- `scripts/verify-dist.mjs:76-80`：入口頁 `<script` 硬性斷言改**白名單比對**（僅允許固定主題 script，其他 `<script>` 仍 fail）——不改則 06a build 必炸（Round 2 Critical）。
- `tools/_probe/` 範本同步 footer＋主題 inline script（新工具自帶，Round 1 補列）。
- 全站 footer 定案 markup：
  `EZTools — 所有處理皆於瀏覽器端完成，不會上傳任何資料。`
  `© 2026 alan60910 · <a href="https://github.com/alan60910">GitHub</a> · <a href="https://github.com/alan60910/eztools/blob/main/LICENSE">MIT License</a>`
  video-converter 頁 footer 另補一行：`影片轉檔引擎：ffmpeg.wasm core（GPL-2.0-or-later，獨立資產載入）`。
- `README.md`：**刪**「第三方元件」的 Nerd Font 段、**填** `本專案自身之授權：<license name>（待定）` 佔位符為 MIT、保留 ffmpeg GPL 段、**補一筆 howar31/claude-statusline 配色來源說明**（僅取用配色構想、未複製程式碼）。

### 06b. 多列＋雙欄＋排序（開 `magi/07-*`）
- `config.ts`：`row` 選填欄＋clamp＋寫回正規化 0..N−1（D2；version 維持 2）。
- `resolve.ts`／`emit-ansi.ts`／`emit-bash.ts`／`emit-ps1.ts`／兩個 golden harness／`pipeline.integration.test.ts`：多列契約全面落地（見引擎契約節，含全隱藏 `[[]]` 退化）。
- `index.html`＋`style.css`＋`main.ts`：雙欄（D3）、**segment 清單重構為「啟用段依渲染列分組＋未啟用段四類分組」雙區**、排序與列指派 UX（見該節）。（「Powerline 箭頭」checkbox 已於 06a 交付。）
- `render-preview.ts`：逐列容器＋逐列 aria-label。
- golden 重生（僅多列 join 變因）。**Claude Code 渲染細節 spike（S3）先行**。

### 06c. 目錄擴充（開 `magi/08-*`）
- `segments.ts`：＋5 段（token-in／token-out／cache-hit／reset-5h／reset-7d）；emoji：📥📤🎯🔄📆。
- `color.ts`／`config.ts`：`SegmentColor` 型別＋清洗兩支（D5）。
- `threshold.ts`：「限額漸層」＋「剩餘漸層」模板（D5）。
- `resolve.ts`／`emit-*`：bar 4-run、倒數（jq now／DateTimeOffset）、tokens 整數縮寫、auto 展開＋case 函式。
- `emit-settings.ts`：`needsRefreshInterval` 補「啟用 reset-5h／reset-7d」條件（Round 1 補列）＋測試。
- `mock-data.ts`：補 `cache_creation_input_tokens`／`cache_read_input_tokens` 兩欄＋四欄全 0 情境（Round 2 修正——`resets_at`／`current_usage` 既存）；`segments.ts` 收緊 `CurrentUsage` 型別。
- golden 重生（僅新段變因）。**S1／S2／S4／S5／S6 spike 先行**。

### License 結論（回覆項目 7）
維持 **MIT 即可**：專案自身程式碼與 runtime 依賴全 MIT；`@ffmpeg/core`（GPL-2.0-or-later）不進 bundle、獨立 wasm 資產動態載入，屬聚合散布不感染專案碼，義務是散布時保留授權聲明——README 與 video-converter 頁 footer 註記（06a-2 落地）；Nerd Font subset（OFL 1.1）移除後不再構成考量；howar31 配色來源於 README 註記（透明度比照自家標準）。

### 新依賴
無新增；**淨刪除兩個** devDependency（`subset-font@2.5.0`、`fontkit@2.0.4`）與簽入字型資產。

## Spikes（06c 動工前完成；S1 為 06a 前置、S3 為 06b 前置）

- **S1. emoji 真機渲染矩陣**［全員 flag；06a 前置］：5-6 個候選 emoji 產出 ps1＋sh，實測 {PS 5.1+conhost, PS 5.1+Windows Terminal, pwsh 7+WT, bash+VS Code} × {有/無 BOM}。已知風險：PS 5.1 讀無 BOM `.ps1` 走 ANSI 代碼頁→emoji 必亂碼，而複製貼上流程 BOM 不可控——若證實，ps1 emitter 改 `[char]::ConvertFromUtf32(0x1F4C1)` 碼位跳脫（原始碼純 ASCII）。同時驗 ⌨️(VS16) 寬度（不穩即換 💻）與 git 三段植物 emoji（🌳🌱🌿）辨識度。**治理句：spike 結論若需改 emoji 表，回報使用者再核可後才改 `segments.ts`。**（已完成：結論見 sp1/REPORT.md §4/§6 與已裁決節——採碼位跳脫、emoji 表不變。）
- **S2. jq `STATUSLINE_NOW_EPOCH` 注入形**（Round 2 範圍修正——`strflocaltime` 已在生產路徑驗過免驗）：五行原型 `jq -n '((env.STATUSLINE_NOW_EPOCH // (now|floor))|tonumber) as $n | ...'`，設／不設環境變數兩路＋非數字值，確認**零 shell `date`** 且缺席正確回落。
- **S3. Claude Code 多列渲染細節**：12 列＋列首空白＋超寬列真機一輪——驗列首 trim（約束 padding 契約）、無尾隨換行渲染等價性（約束行尾契約）、列數上限與截斷行為；結論寫回引擎契約節。
- **S4. bar run 粒度 byte 驗證**：手寫目標 ANSI bytes（plain 填格分色／powerline fg 上色／null 不畫格），確認 `toAnsi` 與 emit 平行陣列在靜態 4-run 規則下可產出等值 byte；一併驗 auto 色展開後的 autoFg 對比。
- **S5. golden 規模與 CI 時間**：新段×bar×auto 配色代表場景清單（全段單列／多列混排／bar 邊界 0%·49%·50%·100%·null／auto 五級 effort＋unknown fallback）一輪計時，預算 <5 分鐘。
- **S6. Windows 時區控制**（Round 2 新增）：windows runner 以 `tzutil /s` 切非 UTC 後跑現有 percent-reset 真執行 gate 與 golden——確認現行體制是「同機 oracle」還是「固定字節」；三後端對同一 epoch 的 `HH:MM` 對拍（PS 5.1／pwsh 7／jq／Node），據此釘 06c 倒數段在 windows leg 的 byte-exact 策略。

## Open questions

（無——Round 1 全部裁決完畢；新增裁決見各節「Round 1 修訂」標記）

### 已裁決：emoji 對照表（2026-07-10 使用者核可）

30 段定案如下（原則：單一 codepoint、預設 emoji 呈現，避免 VS16 變異選擇子造成部分終端寬度不穩；唯一例外 ⌨️ 已註記）。

   | 段 | emoji | 段 | emoji | 段 | emoji |
   |---|---|---|---|---|---|
   | 模型 | 🤖 | 上下文已用 | 📊 | 拉取請求 | 🔀 |
   | 目前目錄 | 📁 | 上下文剩餘 | 🔋 | 儲存庫 | 📦 |
   | 專案目錄 | 📂 | 5 小時限額 | ⏳ | Git 工作樹 | 🌳 |
   | 輸出風格 | 🎨 | 7 日限額 | 📅 | Git 工作樹分支 | 🌱 |
   | 版本 | 🔖 | 工作階段名稱 | 💬 | 分支 | 🌿 |
   | 費用 | 💰 | 推理強度 | ⚡ | 未提交變更 | 🚧 |
   | 工作時長 | ⌛ | Vim 模式 | ⌨️※ | 時鐘 | 🕐 |
   | 行數增減 | 📝 | 代理名稱 | 🎭 | Tokens 輸入（新） | 📥 |
   | 上下文大小 | 🧠 | 思考模式 | 💭 | Tokens 輸出（新） | 📤 |
   | Cache 命中率（新） | 🎯 | 5H 重置倒數（新） | 🔄 | 7D 重置倒數（新） | 📆 |

   ※ ⌨️＝U+2328+VS16，唯一帶變異選擇子者；S1 實測寬度不穩即換 💻。

### 已裁決：其他（2026-07-10 使用者回覆＋Round 1 修訂）

- 入口頁「零 JS」→ **加 inline script**（黑底回首頁變白底體驗突兀）；實文與優先次序見 D4。
- 自動配色 → **howar31/claude-statusline 方案**（`reference-model-effort-colors.png`），色票**重編碼為 256 索引**（Round 1 C1 修訂），定案表見 D5。
- 限額 bar 漸層 → 依 `reference-limit-bar-gradient.png`，落地為「限額漸層」＋「剩餘漸層」雙模板（Round 1 C2 修訂：`context-remaining` 套逆序版）。
- 多列上限 → 產品層無上限；清洗層 clamp ≤ 段數−1（Round 1 修訂，防壞存檔）。
- Claude Code 多行 → 可行（使用者現役 **7 列**腳本實證；「8 列」為原標頭註解誤記，Round 1 sonnet 覆核修正）；參考腳本 `reference-statusline.ps1`。
- 箭頭原則 → 預設產出零安裝即用；`` opt-in、預設關、警語明確。
- 四項 backlog 候選 → 全數 promote（追加範圍 8–11），形狀依 D5 修訂版。
- S1 spike 結論（2026-07-10 實測完成）— ps1 emitter icon 編碼策略採 `[char]::ConvertFromUtf32()` 碼位跳脫（原始碼純 ASCII，不依賴 BOM）；emoji 對照表維持原核可版不變（⌨️ 寬度穩定、🌳🌱🌿 可辨）；矩陣與證據見 `sp1/REPORT.md`。

## Spec deltas

### root `SPEC.md`
- **Section: Components（statusline-builder 條目）** — modify
  Why: 「self-host Nerd Font subset（僅預覽用）」敘述、單列假設、箭頭預設、目錄段數、resolve 契約全數改變。
  New content: 圖示為通用 emoji（無簽入字型）、powerline 預設無箭頭（`` opt-in、gating 條件表）＋右 padding、多列輸出（`row` 欄、渲染列序語意、`resolve()` 回傳 `StyledRun[][]`、全隱藏 `[[]]`）、雙欄版面、目錄 25→30 段＋bar 正交欄＋auto 配色（`SegmentColor`）、CONFIG_VERSION 2。
- **Section: Components（共用模組清單）** — add
  Why: 06a-2 新增全站共用主題模組（Round 2 補列）。
  New content: 新增 `src/theme.ts` 條目（主題三態邏輯、toggle、localStorage）＋全站 footer 構成歸屬。
- **Section: Conventions** — modify
  Why: (1)「非執行型小型第三方靜態資產…精確上限由 verify-dist 斷言把關，如 Nerd Font subset <100KB」——活例與唯一把關斷言本 sprint 同時刪除，例句與機制宣稱雙雙懸空；(2)「入口頁因零 JS 改以 `<link>` 消費」字面與主題 inline script 矛盾；(3) 工具頁範本要點需納入 footer＋主題；(4) localStorage key 慣例入冊。
  New content: 資產例句改抽象敘述且上限改**政策性敘述**（「下一個簽入此類資產的工具須自帶 verify-dist 斷言」）；零 JS 條文改「零框架 JS，唯一例外主題切換 inline script（含 toggle 監聽）」；工具頁範本要點補 footer 構成與主題 script；新增「localStorage key 統一 `eztools-<scope>-<name>`」慣例。
- **Section: Architecture overview** — modify
  Why: 「入口頁零 JS」總綱敘述需與 Conventions 同步鬆綁。
  New content（確切措辭，Round 2 haiku 要求）: 原「零 JS」改為——「入口頁零框架 JS；唯一例外為 `<head>` 內主題切換 inline script（零依賴、零網路請求，白名單受 verify-dist 斷言把關）」。
- **Section: Status** — modify
  Why: statusline-builder 能力描述（多列、30 段）與全站主題交付後的狀態陳述需更新。
  New content: 各段交付（06a/06b/06c）後同步更新現況段落。

### root `CLAUDE.md`
(none)

### magi/`PRD.md`
- **Section: Goals** — modify
  Why: statusline 產生器目標補上通用字型與多列；全站補主題切換。
  New content: 「Claude Code statusline 設定產生器（預覽＋腳本產出；通用 glyph、多列無上限、進度條／重置倒數／tokens 段、自動配色）」＋新增一條「全站深／淺主題切換與統一 footer」。

### magi/`TECHSTACK.md`
- **Section: Framework / runtime（statusline-builder 條目）** — modify
  Why: Nerd Font subset 簽入與 base64 inline 工序整段移除；devDependency 淨減。
  New content: 「statusline-builder：零 runtime npm 依賴；預覽以系統 monospace＋原生 emoji 渲染，無簽入字型資產」。
- **Section: Framework / runtime（inject-tool-list 條目）** — modify
  Why: 條目內「（靜態優先，入口頁零 JS）」字面與主題 inline script 矛盾（Round 1 補列）。
  New content: 「（靜態優先，入口頁零框架 JS；唯一例外為主題切換 inline script）」。
- **Section: Deployment（test.yml 真執行 gate 敘述）** — modify
  Why: 06c 為倒數段 byte-exact 新增環境變數釘樁（`STATUSLINE_NOW_EPOCH`、ubuntu `TZ`、windows `tzutil`）；06a 淨刪兩個 devDependency（Round 2 補列）。
  New content: gate 敘述補環境變數釘樁與時區策略（依 S6 結論定稿）；devDependency 變動註記。

## Verification（依段分列）

### 06a
1. `npm test` 全綠：emoji glyph 替換與箭頭 gating golden（`powerlineArrow` false/true × lastArrowCap × padding 組合）diff 可審；v1→v2 遷移測試（powerline→true、plain／缺 mode→false、損壞存檔）；目錄級 aria 斷言（glyph 非空⇒ariaText 非空）；emoji 前綴放行負向測試（`PUA_RE` 未動）。
2. `npm run build && npm run verify:dist` 通過：字型 guard（:124-165 分段）移除後無殘留、與字型無關的斷言保留；入口頁 `<script` 白名單斷言放行主題 script、拒絕其他 script；`dist/` 全域 grep 無 `nerd`／`woff2`；`package.json` 無 `subset-font`／`fontkit`。
3. 手動：五頁主題切換（深色 OS 手選淺色**必須生效**、重整不閃白、localStorage 記憶、系統跟隨、原生控件跟色、**頁面間導航主題一致**：入口→工具→入口）、五頁 toggle（含入口頁）`aria-pressed`、五頁 footer 連結、README 三處修訂。
4. 真機：未裝 Nerd Font 環境跑 powerline 預設（無箭頭）產出腳本——零豆腐字（06a Goals 的直接驗收）。
5. S1 spike 結論落地（BOM 策略或碼位跳脫；emoji 表若調整需使用者再核可）。

### 06b
1. `npm test` 全綠：row clamp＋寫回正規化（亂序輸入→渲染列序）、resolve 分列＋空列壓縮＋全隱藏 `[[]]`（`toAnsi` 單一 reset 不變量保留）、行尾契約（LF join 無尾隨換行）byte-exact、`lastArrowCap` 逐列（gating 依 06a 條件表）golden。
2. 手動：雙欄與 <1100px 退化、sticky（`align-self:start` 生效）、右欄與預覽框兩個鍵盤捲動停點（`role="region"` 名稱朗讀）、啟用段依列分組清單、排序語意（同列交換／列首尾停用／播報含列位）、列指派流程（從空白建 7 列）、預覽逐列 aria。
3. 真機 smoke：多列配置 bash＋ps1 接真 Claude Code（Windows Terminal＋VS Code 終端），逐列渲染、無多餘空列、列首無被 trim 的 padding。
4. SR 抽測（**06b 驗收 blocker**，約 0.5–1h）：NVDA 或 VoiceOver——兩個捲動停點名稱、逐列預覽、排序播報。

### 06c
1. `npm test` 全綠：`SegmentColor` 清洗（非 model/effort 段持有 auto→退 default，於 `sanitizeSegment` 層）、bar 4-run golden（0%／49%／50%／100%／null 不畫格／threshold 缺席退段主色／powerline fgOverride 停用）、倒數段 byte-exact（`STATUSLINE_NOW_EPOCH`＋ubuntu `TZ`＋windows 依 S6 策略）＋格式階梯（5h／7d／過期 hide）、tokens 整數縮寫、cache-hit 公式（實際欄名、分母 0、null）、auto 五級 effort＋unknown fallback case（**無**「缺欄」分支）、「限額漸層」「剩餘漸層」模板、emit-settings refreshInterval 新條件。
2. 真機驗收：**複刻使用者現役 7 列配置**（配置 JSON 預先寫入測試 fixtures，供重現）——bar＋數值＋倒數同列呈現、`context-remaining` 套逆序模板顏色方向正確。
3. S1／S2／S4／S5／S6 spike 全數結論落地。

## Round 2 回應對照表（Rev 3）

| Round 2 issue | 票 | 處置 | 落點 |
|---|---|---|---|
| R2-1 06a 箭頭時序缺口 | 3/4 | `powerlineArrow`＋v2 遷移＋gating＋padding 整組前移 06a | 交付拆分／D1／D2／06a-1 |
| R2-2 TZ 對 ps1 無效 | 3/4 | ubuntu 釘 TZ；windows `tzutil`／同機 oracle；S6 spike | 引擎契約／Spikes |
| R2-3 渲染列序口徑 | 3/4 | row 升冪＝渲染列序＋寫回正規化 0..N−1＋UI 全面渲染序 | D2 |
| R2-4 deltas 殘餘 | 3/4 | theme.ts 條目／Conventions 把關句／Deployment 段／Architecture 確切措辭 | Spec deltas |
| verify-dist 零 JS 斷言（sonnet Critical） | 1/4 | :76-80 改白名單比對，列入 06a-2 | D4／06a-2 |
| Extended_Pictographic 回歸（opus Critical） | 2/4 | 不動 PUA_RE；改目錄級斷言＋負向測試 | D1 |
| verify-dist 字型 guard 行號 | 2/4 | :124-165 分段刪除、保留無關斷言 | 06a-1 |
| lastArrowCap gating | 2/4 | 條件表 | D1 |
| 倒數格式階梯 | 2/4 | 5h／7d 階梯＋過期 hide | D5 |
| effort 缺欄死分支 | 2/4 | 色票刪該列；Verification 改單一 fallback | D5 |
| powerline bar 細節 | 2/4 | 單 run 不變量退役＋fgOverride 停用＋null 不畫格 | D5 |
| mock-data 敘述 | 2/4 | cache 兩欄＋CurrentUsage 收緊 | D5／06c |
| 排序 vs 4-`<ol>` | 2/4 | 啟用段依列分組雙區清單＋陣列運算 | 排序節／06b |
| 全隱藏 rows=[] | 1/4 | `[[]]` 保單一 reset | 引擎契約 |
| fontkit 漏刪 | 1/4 | 一併刪、淨刪兩依賴 | 06a-1 |
| toggle 雙態／入口頁矛盾 | 2×1/4 | CSS 三態 UI 雙態明文＋入口頁 toggle | D4 |
| 第二捲動區／region role | 2×1/4 | 預覽框 tabindex＋role="region"＋「兩停點」表述 | D3 |
| 遷移 edge case／localStorage 慣例／S1 治理 | 各 1/4 | 全數納入 | D2／D4／Spikes |

## Round 1 回應對照表

| Review issue | 處置 | 落點 |
|---|---|---|
| C1 auto 配色表示力／union／清洗 | 色票重編碼 256 索引＋`SegmentColor` 型別＋清洗拆兩支 | D5 |
| C2 bar variant 互斥／run 粒度／模板方向／覆寫 | bar 改正交欄＋靜態 4-run＋雙模板＋僅 undefined 寫入 | D5 |
| I1 多列下游契約 | 受影響面清單＋lastArrowCap 逐列＋渲染列序＋deltas 補 Components | 引擎契約節 |
| I2 排序語意（全票） | 同列交換＋停用＋badge＋播報文案＋流程 | 排序與列指派節 |
| I3 date→純 jq | jq now＋strflocaltime，刪雙式；S2 spike | D5／Spikes |
| I4 deltas／移除清單對帳 | SPEC 章節名重寫＋subset 腳本/devDep/verify-dist/README/_probe/TECHSTACK 全數補正 | Spec deltas／06a |
| I5 sticky a11y | align-self:start＋100dvh＋tabindex 停點＋表述修正 | D3 |
| I6 主題 CSS 三態 | token 單一來源＋:not 守衛＋color-scheme＋script 實文＋優先次序 | D4 |
| I7 拆分（全票） | 06a/06b/06c 三段＋golden 分次重生 | 交付拆分節 |
| minority：CRLF 行尾 | LF join 無尾隨換行、三處同式；S3 驗渲染 | 引擎契約節 |
| minority：now 注入 | ResolveInput.now＋STATUSLINE_NOW_EPOCH＋釘 TZ | 引擎契約節 |
| minority：floor 不變量 | 全 floor、禁 round；整數縮寫 idiom | 引擎契約節／D5 |
| minority：emit-settings | needsRefreshInterval 補新段＋測試 | 06c |
| minority：padding 黏連／列首 trim | 右 padding 一格＋UI 提示 | D1 |
| minority：percent-reset 重疊 | 保留＋分工明文＋重複提示 | D5 |
| minority：cache 公式 | 公式＋null／除零＋mock 情境 | D5 |
| minority：powerlineArrow 回歸 | CONFIG_VERSION 2＋v1→v2 遷移 | D2 |
| minority：預覽箭頭豆腐 | CSS 三角形取代 | D1 |
| minority：row cap／select 枚舉 | clamp ≤29＋相異列號枚舉＋option 原地更新 | D2 |
| minority：aria 長句 | 逐列 role="img" 容器 | 引擎契約節 |
| minority：howar31 授權 | README 註記一筆 | 06a-2 |
| minority：7 列覆核 | 全文修正為 7 列 | Context／已裁決 |
| minority：emoji aria enforcement | Extended_Pictographic 擴充 | D1 |
| minority：預覽橫向溢位 | overflow-x:auto | D3 |
| minority：footer markup | 定案 markup 與 href | 06a-2 |
