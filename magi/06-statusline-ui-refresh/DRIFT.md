# Drift — Statusline Builder UI Refresh（06a）
> Source: MAGI_CODE_REVIEW.md（aspect-partitioned ×6：R1-R3 opus、R4-R6 sonnet）  •  Generated: 2026-07-11  •  Status: DETECTED
> 修復輪註記：全部 8 項 Important 已修（R5 複驗 APPROVE、終驗 877/0）。下列 B 類為「契約沉默處決策」紀錄（非待辦）；C 類已修者以 [x] 標示，未勾者為 06b/backlog 候選。

## A. Contract violations
(none) — 六票一致：無契約違反。原 T5.3 對帳發現的「powerlineArrow 無 UI」縫隙已於 T2.5（使用者核可追加）補實，R1/R3 覆核通過。

## B. Below-the-contract decisions
- [ ] padding 實作為 `head + valueText + suffix + pad`（resolve.ts:177）——PLAN D1 簡記 `head + value + ' '` 未言明 suffix 順位；實作取唯一合理序並記於檔頭。（R1）
- [ ] `migrateConfig` 對偽造 v1 內含 `powerlineArrow` 欄一律以 mode 派生覆蓋（config.ts:227）——真 v1 無此欄，PLAN 沉默。（R1）
- [ ] ps1 icon 跳脫：BMP 用 `[char]0xHEX`、astral 用 `ConvertFromUtf32`（PLAN 僅點名後者）；已實機驗證正確。（R2）
- [x] golden config 工廠以 `mode==='powerline'` 派生 `powerlineArrow:true` 保留 v1 觀感——arrow:false 缺口已於修復輪補 `powerline-noarrow` 雙 golden＋真執行 case。（R2）
- [ ] 換頁白閃修正（五頁 `<meta color-scheme>`＋critical inline `<style>`）超出 PLAN D4 原文——T4.3 手動 QA 發現後落地，trade-off 記於 WORKS，使用者複測通過。（R4）
- [ ] `.theme-toggle` 查找防禦風格分歧：三工具頁＋_probe 用裸 `querySelector as` cast、statusline 用 throwing helper——各檔沿自身既有慣例。（R4）
- [ ] 四 lane 工具局部 token 命名與深色值各自裁量（PLAN 對跨工具值一致性沉默）——三 lane 收斂 #2563eb、一 lane 未跟（升級為 Important #2 修復項）。（R5）
- [ ] TASKS 唯一具名排除（statusline 預覽終端框）被類推延伸至 ffmpeg log 終端、video 黑框、白字按鈕文字——各檔註解與 WORKS 均透明記錄，同原則合理延伸。（R5）
- [x] nerd/woff2 回歸 guard 誤殺陷阱——修復輪改 `\b` 詞界（負向雙證通過）。（R6）
- [x] howar31 註記時態——修復輪改規劃語氣（明示 06c 未出貨）。（R6）
- [ ] `__golden__/** -text`（而非 eol=lf）——源自 T1.1 spike 期間使用者核可的 out-of-band 修復，WORKS 有記。（R6）

## C. Out-of-scope observations
- [ ] **Copy 按鈕輸出無 BOM 的 ps1**——preset 分隔符（'›'/'·'）已於修復輪改 `[char]` 跳脫（該半部 [x]）；使用者自訂 prefix/分隔符的非 ASCII 內容仍走 BOM 依賴通道＝殘餘 backlog（含 Copy 附 BOM 或 UI 警語選項）。（R2）
- [ ] arrow:false 時末段亦帶尾隨空格（三後端一致、契約如此）——部分 statusline 消費端會視覺右修剪，值得使用者文件一句話。（R2）
- [ ] 未來 CONFIG_VERSION bump 的「未知版本重置」結構是資料損失型陷阱——v3 時需遷移階梯＋v2 存活回歸測試。（R1）
- [ ] 預覽 default 色箭頭渲染為透明三角，真終端會以預設前景繪出——`var(--arrow-fg, currentColor)` 可對齊。（R3）
- [ ] `applyPreviewFontFamily` 死重＋CSS 註解失準；index.html 既存「24 段」註解應為 25。（R3）
- [ ] 無 OS 主題即時跟隨（matchMedia change）與跨分頁同步——PLAN 未要求，backlog 候選。（R4）
- [ ] verify-dist：script 擷取 regex 大小寫敏感＋不解析 HTML 註解（T4.2 已自我標記 chore）；整檔零自動測試。（R4/R6）
- [ ] 無 repo 級 `.gitattributes` 基線（`* text=auto`）——其他 fixtures 暴露於同類 CRLF 風險，現無 byte-exact 消費者。（R6）
- [ ] `_probe` 建置並公開部署於 dist（未連結）——既存行為，補齊 boilerplate 後更像真頁，確認姿態是否維持；範本缺 style.css stub。（R6）
- [x] 跨工具深色 accent hover 三值漂移——修復輪以共用 `--accent-fill-hover`（#2f6fdb，brighten 策略）收斂；secondary 鈕統一 `--link`（深色 7.28:1）。（R5）
