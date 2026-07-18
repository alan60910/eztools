# Ticket — 06 血緣衛生尾批（BOM 通道＋_probe 姿態＋$BgT 死資料＋09 衛生殘項）
> Type: chore  •  Scale: minor  •  Created: 2026-07-18

## Context

06 系列（06a／06b／06c → sprint 06／07／08）本體、六支 spike 與
sprint 10「06 殘項批」全數出貨後，僅剩三件血緣小殘項；併入 09 review
留下的衛生殘項湊一批收乾。皆為低風險小件；除工作面 1 為小幅輸出行為
調整外，其餘不動行為契約。

## Approach（四工作面）

1. **Copy 按鈕 ps1 BOM 通道**（06a DRIFT C／BACKLOG from 05）：
   二擇一——(a) Copy 時前置 U+FEFF（與下載 Blob 的 BOM 行為對齊）；
   (b) 偵測自訂 prefix／分隔符含非 ASCII 時顯示 UI 警語。**傾向 (a)**
   （一次關閉 PS 5.1 無 BOM 貼上亂碼風險、與下載通道一致），實作時
   如發現剪貼簿 BOM 有相容性反例則回退 (b) 並記 WORKS。
   Files: `tools/statusline-builder/main.ts`（copy handler）＋單元測試。

2. **`_probe` 部署姿態收口**（01 DRIFT、06a 更新）：補 `style.css`
   stub 使三件套完整；部署姿態二擇一——維持公開部署（現狀、僅補件）
   或建置掃描排除 `_` 前綴資料夾（_probe 留 repo 當活範本、不進
   dist）。**實作時先查 vite 掃描機制與 `verify-dist` 影響再由使用者
   裁決**，不預設答案。
   Files: `tools/_probe/`、（若排除）vite 設定＋`scripts/verify-dist-checks.mjs`。

3. **emit-ps1 `$BgT` 死資料清理**（06a WORKS:95 註記，本次實證仍在）：
   `joinPowerline` 僅 `powerlineArrow=true` 時讀 `$BgT`
   （emit-ps1.ts:897-906），但宣告／累加只看 `mode==='powerline'`
   （:1121、:1163）——改為同時看 arrow 旗標，單列（`$BgT`）與多列
   （`$BgT<k>`）路徑一致。模板文字改變 → powerline＋noarrow 相關
   黃金檔需 `golden:update` 重生（diff 僅 $BgT 相關行）；**執行輸出
   vs oracle byte-exact 不變**為硬約束。
   Files: `tools/statusline-builder/emit-ps1.ts`＋`__golden__/` 受影響案。

4. **09 衛生殘項**（BACKLOG 併入）：失效行號引用 ×2
   （`segment-defaults.ts:45` 指已刪 VARIANT_LABELS／`main.ts:426`
   「既有」語意過時）＋sprint-05 dotfile 報告引用落空
   （`main.ts:14-15`／`index.html:46` 引用從未簽入的 `.t3X-report.md`
   ——改寫註解或移除引用）＋`forailook/` 個人截圖處置（**刪或
   ignore，使用者裁決後執行**）＋magi/05 遺留 untracked 清理
   （**清單列出後由使用者裁決**）。

## Verification

- `npm test` 全綠＋`npm run typecheck` 三鏈全綠。
- 工作面 1：copy 輸出首字元 U+FEFF 單元斷言（或警語路徑 DOM 斷言）。
- 工作面 2：build 後 dist 內容斷言（_probe 進／不進 dist 依裁決定案）；
  `npm run build`＋`node scripts/verify-dist.mjs` 綠。
- 工作面 3：黃金檔重生 diff 人眼可解釋（僅 $BgT 宣告／累加行）；
  ps1 執行輸出 vs emit-ansi oracle byte-exact（pipeline.integration
  既有 gate）。
- 工作面 4：`git grep` 驗證失效引用歸零；untracked／ignore 狀態符合
  裁決結果。
- 不動 oracle／resolve／bash 後端。
