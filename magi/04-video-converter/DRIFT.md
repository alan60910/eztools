# Drift — 影片格式轉換工具（video-converter）
> Source: MAGI 5-reviewer panel（Fable 5，supermajority, ok_weight 5）  •  Generated: 2026-07-06  •  Status: DETECTED

## A. Contract violations
(none) — **5/5 鏡頭一致零 A 類**（三個 sprint 首見）。CR1 逐節攤 PLAN r2.1
checklist 驗證；兩個高風險對照（copy-fallback `includes('copy')` token 判定、
probeFile 清理序）逐行驗證安全且等價。

## B. Below-the-contract decisions（授權記錄或契約沉默處選擇，審計留痕）
- [ ] `-map` 省略制（present 軌留 `?`、缺席軌型省略；blind 雙 `?` 全留）[CR1；WORKS T2.4 授權] — 與契約字面等價。
- [ ] av1 強制 mode='full-transcode'（預期管理）[CR1；WORKS T2.4 授權偏差記錄]。
- [ ] loading-core 只實作時間心跳單分支 [CR1；WORKS coordinator ruling（URL 方案 (a)）授權]。
- [ ] cancelled 焦點分態（loading/probing→選檔區；converting→轉換鈕）[CR1+CR2；契約 docstring 授權細化]。
- [ ] cadence 10%/30s、gate 512MB 暫定值 [CR1；PLAN 明示暫定、T4.3 回填]。
- [ ] README License 草稿延後 commit 定稿、`<license name>` 佔位 [CR3；WORKS T4.2 授權]。
- [ ] TECHSTACK Deployment/Framework 兩句良性增補（pin 斷言、Rollup emit）超出 delta 宣告字面、與實態一致 [CR3]。
- [ ] classWorkerURL 備援三檔 verify-dist 斷言不加（備援未啟用，契約條件式）[CR1+CR3]。
- [ ] gate 增設「重新選擇」鈕（契約單鈕之外的合理增強）[CR2]。
- [ ] ready 播報 notices 超集（含 audio-only/unsupported-codec，較契約括號列完整）[CR2] — 正向。
- [ ] 探測摘要（容器/codec/解析度/時長）僅視覺不入播報 [CR2；契約只要求策略＋notices 必播]。
- [ ] yuvj420p 排除於 copy 白名單（保守轉碼，方向安全）[CR5]。
- [x] ✅已修復（2026-07-06 post-review fix：percent<1 不播 ETA＋發散註記）ETA 無低進度下限（首播可能誇張分鐘數）[CR5；PLAN 未規範]。
- [ ] main.ts 純函式（strategyText/formatDurationSec/conversionFailureMessage）不抽出測試 [CR4；browser-only 慣例允許]。

## C. Out-of-scope observations
- [x] ✅已修復（2026-07-06：依 plan.args.includes('copy') 分流「可快速輸出音訊」文案）**strategyText 對 audio-only copy 來源誤標「需轉碼較慢」**（唯一 2 票採納項）[CR4+CR2]
- [x] ✅已修復（2026-07-06：pathname 末段非檔名形補 '/' 正規化＋3 測試）**asset-url 無尾斜線裸目錄 URL 上溯少一層 → 子路徑部署 404**[CR5]
- [x] ✅已修復（2026-07-06：補 probeFile→runConversion 同 client 依序成功案）busy 釋放後 sequential reuse 無顯式測試 [CR4]
- [x] ✅已修復（2026-07-06：註解改「exec→ret→reset 呼叫序同形（setTimeout 因生產端恆傳預設 -1 而略去）」）pipeline.integration「逐字同形」註解措辭 [CR4]
- [ ] loading-core 心跳同字串重播可靠性——T4.3 SR 實測定案，不可靠則加必變 token [CR2]
- [ ] HEVC preview-failure 覆寫可能吞「轉換完成」播報——T4.3 SR 觀察 [CR2]
- [ ] error 態焦點落 body（三工具一致既有缺口，跨工具統一候選）[CR2]
- [ ] audio-only copy 失敗 fallback 沿用 blind plan（帶未使用視訊旗標，無實害）[CR1]
- [ ] TECHSTACK Constraints「可能需要 WebAssembly，如 ffmpeg.wasm」措辭已過時 [CR3；WORKS T4.2 已記]
- [ ] 既有文件漂移：CLAUDE/TECHSTACK 稱 `--passWithNoTests`、package.json 實為 `vitest run`（非本 sprint 引入）[CR3]
- [ ] 待使用者確認刪除清單：repo 根 `.scratch-*` ×5、`.t21-report.md`、`tools/video-converter/spike.ts`（orphan，CR1 實證零打包）[CR1+協定]
