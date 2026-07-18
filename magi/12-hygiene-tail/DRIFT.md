# Drift — 06 血緣衛生尾批（sprint 12）

> Source: 角度制 5 票 MAGI（fable×2／opus／sonnet／haiku，threshold >2.5；
> 角度 5 首輪暫時性失敗經單次重試回收）  •  Generated: 2026-07-19  •  Status: DETECTED

## A. Contract violations

(none) — 五票一致：四工作面皆在 TICKET／TASKS／HALT 裁決授權內；
copy-BOM 反例屬 TICKET 預授權回退閘的觸發（處置待使用者裁決，見
MAGI_CODE_REVIEW 🟡-1），非契約違反。

## B. Below-the-contract decisions

- [ ] emit-bash.ts 檔頭註解被觸碰 vs TICKET「不動 bash 後端」字面——
  「不動」解讀為行為契約層（`.sh` 黃金檔零 diff 為證），註解衛生不在
  此限；引用清理擴至 9 處已獲 TASKS acceptance「歸零」授權。[fable-A5；
  建議 commit message 或 WORKS 補一句解讀說明]
- [ ] 「失效引用歸零」操作化為 `\.t[0-9]*-report` 窄 regex——同源
  `.t15`/`.t23` 非後綴形殘留（12 處），WORKS 有揭露。[opus＋fable-A5]
- [ ] BOM 組裝落在 copy-ps1 呼叫端、`copyOutput` 維持通用簽名。[fable-A1]
- [ ] verify-dist 新 check 寫成通用 `_` 前綴規則（非 `_probe` 字面），
  與 vite 側謂詞逐字對稱、fail 方向多攔不漏攔。[fable-A1＋A5]
- [ ] SPEC.md:32 連動一句（TICKET Files 未列 SPEC.md）。[fable-A1]
- [ ] $BgT 負向鎖採全文 `not.toContain`（未來合法 `$BgT*` 變數名會誤
  紅，屆時收窄）。[fable-A1]
- [ ] T3.1 盤點／T4.1 收口 gate 由協調者親執行未派開發者（WORKS 揭露；
  純唯讀＋記帳，無產碼）。[sonnet]
- [ ] _probe 排除僅作用於 build input：`npm run dev` 仍可達（活範本
  預覽），與 HALT 裁決「排除出 dist」範圍一致。[fable/haiku/sonnet]
- [ ] clipboard 測試 stub 以原始 property descriptor 精確還原，保住
  既有「無 clipboard 走 catch」案前提。[fable-A5]

## C. Out-of-scope observations

- [x] **（已收口，2026-07-19 使用者裁決回退 (b)）copy-BOM 相容性反例
  處置**——協調者真機實證觸發 TICKET 回退閘；copy 回素文、下載 BOM
  保留、spy 測試翻轉＋reject 案補上，收尾後全套 1829/1829。
- [x] **（已緩解）**i18n-dom.dom.test.ts flake——該案顯式 20s timeout；
  根因（boot 減重）仍留「09 測試網加固批」。
- [x] **（已補落點）**`.t15`/`.t23` 同源死指標（12 處）——BACKLOG 已補
  追蹤行（2026-07-19）。[opus＋fable-A5＋協調者實證]
- [x] **（已升級 BACKLOG，2026-07-19 使用者裁決 y）**verify-dist 無法
  偵測 chunk／import 形態的 _probe 洩漏——BACKLOG 已補行（含 ffmpeg
  wasm `_probe` 字串之全文 grep 誤報陷阱註記，一併收錄）。[fable-A5 1/5]
- [x] **（併入上行 BACKLOG 註記）**ffmpeg-core.wasm 內含 `_probe`
  位元組字串誤報陷阱。[fable-A5 1/5]
- [x] **（已依裁決執行）**治理文件與 hygiene 分拆為獨立 `docs:` commit
  ——2026-07-19 使用者裁決分拆。[3 票提及]
- [x] **（記錄面已補）**BACKLOG Promoted 第三條補「已自然消解」註記；
  WORKS 措辭依 append-only 不回改（本輪對帳段已講清）。[各 1/5]
