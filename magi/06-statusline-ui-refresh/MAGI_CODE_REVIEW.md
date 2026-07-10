# 🧠 MAGI Code Review — DEV @ 35109e5（未提交 sprint-06a 全量 diff）

**Diff scope:** working tree vs HEAD（50 檔、+2203/−1529；另 3 個新增未追蹤檔：`.gitattributes`、`src/theme.ts`、`src/theme.test.ts`）
**Mode:** 面向分區（使用者指定：依實際更動分域、嚴重性配模型、不限三票）——6 票＝R1 config/resolve（opus）、R2 emitters/golden（opus）、R3 statusline UI/預覽（opus）、R4 主題系統（sonnet）、R5 CSS token（sonnet）、R6 管線/文件（sonnet）。採納規則：各面向審查者對自身範圍具權威性；跨面向重疊發現已語意去重。

## Dashboard

```
┌─────────────────────────────────────────────────────────┐
│  VERDICT: REQUEST-CHANGES（窄範圍——修復集小且機械）     │
├─────────────────────────────────────────────────────────┤
│  Mode: aspect-partitioned ×6     Degraded: no           │
│  R1 ✅AWN  R2 ✅AWN  R3 ✅AWN  R4 ✅AWN  R5 ❌RC  R6 ✅AWN │
├─────────────────────────────────────────────────────────┤
│  🔴 Critical: 0    🟡 Important: 8    🟢 Notes: 13      │
└─────────────────────────────────────────────────────────┘
```

## Verdict
**APPROVE**（修復輪後定案，2026-07-11）

> 初審 verdict 為 REQUEST-CHANGES（R5 兩項深色視覺缺陷）。使用者核可修全部 8 項 Important，三路平行修復＋一次追補完成後：R5 複驗翻案 **APPROVE**（單一來源紀律完好、退役 token 零殘留、全部對比數學驗算吻合、無新回歸）；協調者終驗 877 pass / 0 fail（+13 測試）、typecheck 0、build＋verify:dist 綠。
>
> 修復輪內容：#1/#2 → 共用 `--accent-fill` 三件組升入 src/style.css＋secondary 鈕統一 `--link`（協調者改裁 R5 方案二——方案一會使深色文字 3.58:1 低於一般文字 AA，方案二 7.28:1 且淺色 pixel-identical）；#3 → `\bnerd\b`/`\bwoff2\b` 詞界（負向雙證）；#4/#5 → README 兩處；#6 → 入口頁 script 補 aria-label＋白名單同步＋lockstep 註解；#7 → ps1 分隔符非 ASCII `[char]` 跳脫（'›'/'·' 純 ASCII、真執行 byte 不變）；#8 → `powerline-noarrow` 雙 golden＋pipeline 真執行 case＋ps1 no-CR 斷言。
>
> 初審原文如下（歷史紀錄保留）：REQUEST-CHANGES——無 Critical；R5 的兩項深色模式視覺缺陷屬使用者可見、修法一行式，應在 commit 前修掉。其餘 Important 為低成本強烈建議項。

## 🔴 Critical (adopted)
（無）

## 🟡 Important (adopted)

### 修復後才 commit（R5 範圍權威）
1. **[R5] `.button-like--secondary` 深色模式邊框/文字雙色不一致**（apng-to-gif :233,248-251／gif-editor :291,306-309／statusline-builder :189,204-207）：secondary 鈕只覆寫 `color: var(--link)` 未覆寫繼承的 accent 邊框——淺色同值無感，深色 `--link`=#60a5fa vs accent=#2563eb/#1d4ed8 出現雙色框。video-converter 已示範正解（文字改用同 accent token）。**修法：三檔各一行。**
2. **[R5] statusline 深色 accent-fill 未調**（statusline style.css）：`--dark-sb-accent-fill` 沿用 #1d4ed8，對深底 ≈2.76:1，低於其餘三工具刻意達成的 3:1（#2563eb ≈3.58:1）；其「自身填色自證」論述與同 PR 他處僅適用於 hover 暫態的論證不一致。**修法：改 #2563eb；更佳解＝升共用 `--accent-fill`/`--accent-fill-hover`/`--accent-fill-fg` 進 src/style.css（三 lane 已自然收斂於同值），一併消除 hover 三色漂移（🟢 R5-N1）。**

### 強烈建議（低成本，可同輪修）
3. **[R6] verify-dist `/nerd/i` 裸子字串誤殺陷阱**（verify-dist.mjs:252-257）：`ownerDocument`、`cornerDistance` 等常見識別字會誤觸（已以 node 實證）。**修法：改 `\bnerd\b`（不分大小寫），已驗證消除四個誤殺樣本且保留歷史真陽性。**
4. **[R6] README Usage 註解殘留「入口頁零 JS」**（README.md:35-36）：與本 sprint 自己改寫的 SPEC/TECHSTACK 措辭自相矛盾——全 repo 唯一殘留。
5. **[R6] README howar31 註記現在式**（README.md:73-75）：auto 配色屬 06c、程式碼尚無 `{kind:'auto'}`（已查 color.ts 證實），現在式陳述與出貨現實不符。**修法：改規劃語氣或延至 06c 落地。**
6. **[R4] 入口頁 inline toggle script 與 theme.ts 已漂移**（index.html:53-56 vs theme.ts:102-105）：theme.ts 每次 sync 補設 `aria-label`（防未來改純圖示鈕），入口頁複本沒有——「各自獨立維護」的風險在同一 PR 內已現形。**修法：入口頁 script 補一行＋同步 verify-dist 白名單常數。**
7. **[R2] ps1 `›`/`·` 分隔符 preset 與非 ASCII prefix 仍為原始 UTF-8**（emit-ps1.ts:532,132）＋ **Copy 按鈕輸出無 BOM**（main.ts:896-907）：S1 spike 針對的亂碼通道對非 icon 內容仍開著（下載路徑有 BOM、複製路徑沒有）。**修法：兩個已知 preset 走 `[char]0x203A`/`[char]0xB7` 跳脫（與 icon 同路），成本極低；prefix 通道可列 backlog。**
8. **[R2] powerline＋arrow:false 無 golden／oracle／真執行 byte 覆蓋**（pipeline.integration.test.ts:63 `cfgT` 恆 true）：v2 預設模式（新使用者最常見輸出）只有結構性子字串斷言。R2 已逐後端追跡 padding 位置證明「依構造等價」，非現行缺陷。**修法：補一組 `powerline-noarrow` golden＋參數化 cfgT 加真執行 case（含 threshold 分裂、dash-null、shell-out）。**

## 🟢 Minority / Notes（節錄，全文見各票）
- [R1] 未來 version bump 的重置踩雷結構（v3 時 v2 存檔會被 wipe，需屆時加階梯＋回歸測試）；plain＋powerlineArrow:true 無 byte 不變 pin；dash-null padding 組合未測。
- [R2] ps1 golden 比對 normEol 後無法抓 CRLF 回歸（bash 側有 no-CR 斷言，建議補對稱）。
- [R3] `applyPreviewFontFamily` 成死重（inline style 蓋掉 CSS 較豐富字族棧）；`hasNoBoundaryRisk` 對 threshold/fgOverride 段過度警告（保守向，可接受）；default 色箭頭在預覽為透明三角（真終端會以預設前景畫出，建議 `var(--arrow-fg, currentColor)`）；index.html 既存註解「24 段」應為 25（本 diff 未觸及）。
- [R4] 無 matchMedia change 監聽（開著的分頁不跟 OS 即時切換）與跨分頁 storage 同步——PLAN 未要求，backlog 候選；`getEffectiveTheme` 例外分支未測。
- [R5] `--bg` 與 `--dark-surface` 同值使表面邊界僅靠 `--border` 辨識（已知，語意保留）。
- [R6] `.gitattributes` 無 repo 級 `* text=auto` 基線（其他 fixtures 仍暴露於 CRLF 轉換類 bug，目前未被 byte-exact 消費）；`_probe` 會建置並部署至 dist（公開可達、未連結）——既存行為，惟本次補齊 boilerplate 後更像真頁面，確認是否維持；verify-dist 整檔無自動測試。

## Untested paths
- `tools/statusline-builder/main.ts`：`hasNoBoundaryRisk`／`updateNoBoundaryHint`／checkbox handler（無 jsdom，已接受的決策）— R3
- `src/theme.ts` `getEffectiveTheme` 的 catch 分支 — R4
- `scripts/verify-dist.mjs` 全檔（白名單正規化、遞迴掃描、負向斷言）— R4/R6
- powerline＋arrow:false 的 byte-exact／真執行路徑 — R2

## 各票驗證亮點（非僅目測）
- R2 於本機 powershell.exe 實證 `[char]0x2328+[char]0xFE0F`／`ConvertFromUtf32` 串接正確；golden 逐 byte 驗 LF/BOM。
- R3 程式化抽取三處碼位對照，25 emoji 與核可表逐碼位相符。
- R4 md5 實證五頁 script/critical-style 一致；重建 build＋verify:dist。
- R5 自行重算 10 組 WCAG 對比，全部與檔頭宣稱吻合（對比數學為真算非捏造）。
- R6 以 git check-attr 實證 `.gitattributes` 優先序；package-lock 逐行審無版本異動。
