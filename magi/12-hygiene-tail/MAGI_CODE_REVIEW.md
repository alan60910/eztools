# 🧠 MAGI Code Review — DEV @ 01ff4d9（sprint 12 未提交工作樹）

**Diff scope:** 未提交變更 vs HEAD——18 files, +204/−51（非產生檔 234 行）＋3 untracked

## Dashboard

```
┌────────────────────────────────────────────────────────────────┐
│  VERDICT: APPROVE-WITH-NITS（一項需使用者裁決，見 🟡-1）        │
├────────────────────────────────────────────────────────────────┤
│  Policy: 角度制 5 票（MAGI_REVIEW_POLICY §2：非產生檔 234 行   │
│  → 201–800 → 5 票；黃金檔 21 行刪除不計）  Threshold > 2.5     │
│  OK weight: 5 / 5    Degraded: no（角度 5 首輪暫時性失敗，     │
│                      單次重試回收——與 sprint 11 同款特徵）     │
├────────────────────────────────────────────────────────────────┤
│  角度×模型：1 正確性=fable ✅  2 契約=opus ✅  3 測試=sonnet ✅ │
│             4 回歸=haiku ✅   5 安全=fable ✅（重試）           │
├────────────────────────────────────────────────────────────────┤
│  🔴 Critical: 0    🟡 Important: 2（皆協調者實證定案）          │
│  🟢 採納 nits: 5   Minority: 8（含 2 項經實證駁回）             │
└────────────────────────────────────────────────────────────────┘
```

> 首次角度制實跑。同 vendor 湊票揭露：五票皆 claude 系。本輪協調者
> 實證密度高：雙 BOM PS 5.1 真機探針 ×3（裁決兩票 fable 的對立主張）、
> 行號失準 grep、`.t` 殘留全景 grep、reject 案缺口 grep、gitattributes
> 對照、i18n flake 四輪全套統計。全體審查員因沙盒限制無法親跑測試，
> 數字由協調者親跑記錄背書（1827/1827 ×2、typecheck/build/verify-dist
> 皆 exit 0）。

## Verdict

**APPROVE-WITH-NITS** — 四工作面實作與 TICKET 逐條吻合，五票一致：
$BgT 三面（宣告／累加／讀取）gating 一致且黃金檔 diff 純刪除可解釋、
_probe 排除雙側同謂詞且 deploy pipeline 實掛 gate、引用歸零 grep 屬實、
暴露面淨縮減。唯 copy-BOM 的相容性角落經協調者真機實證**觸發 TICKET
預授權的回退閘**（🟡-1），需使用者裁決處置；其餘皆 nit 級。

> **修復狀態（2026-07-19，使用者裁決「回退 (b)＋修採納項全批」）**：
> 🟡-1 已以回退 (b) 收口（copy 素文、下載 BOM 保留、spy 三案翻轉＋
> reject 案補上）；🟡-2 已單行 20s timeout 緩解（根因留 09 加固批）；
> 🟢-3~7 全數落地（行號符號化、BACKLOG 追蹤行、reject 案、`_x` 檔案形
> pin 案、dev 語意句）。收尾後全套 **1829/1829**（協調者親跑）、golden
> 零新增。未修 minority：治理文件分拆（commit 時裁決）、chunk/import
> 偵測缺口（BACKLOG 候選）、其餘備查項。

## 🔴 Critical (adopted)

（無）

## 🟡 Important (adopted)

1. **[vote 3/5 — fable-A1＋opus＋haiku；協調者真機實證定案] copy-BOM
   與產出腳本自帶「請以 UTF-8（含 BOM）儲存」指引互斥——雙 BOM 於
   PS 5.1 產生首行錯誤噴發**
   - Where: main.ts:2916（copy-ps1 前置 U+FEFF）；黃金檔頭第 2 行指引
   - 協調者探針（PS 5.1 真機）：`BOM+U+FEFF+內容` → 首 token 黏合成
     `?Write-Output`／`?#` CommandNotFoundException；首行為註解時後續
     行仍執行＝statusline 每次渲染噴錯。使用者遵循腳本自身指引以
     「UTF-8 含 BOM」存檔 → 編輯器 BOM＋copy 內容字元 U+FEFF＝必然
     雙 BOM。**修復前**（copy 無 BOM）遵循指引存檔反而完全正確——
     方案 (a) 使被指引的主流程劣化。角度 5 的「PS 詞法視 U+FEFF 為
     空白」推演被實測推翻；角度 1 的存疑成立（其因沙盒無法實測而
     自降 Note，實證後升級）。字串中段 U+FEFF 無害（實測）。
   - Suggested fix（使用者裁決）：(i) 回退方案 (b)——移除 copy BOM
     （TICKET 明文預授權此回退），existing 腳本頭指引即為正確引導，
     可另補 UI 提示；(ii) 保留 BOM＋改寫腳本頭指引與 README（「複製
     通道已含 BOM，存檔請選『UTF-8（無 BOM）』」）——與 ISE 等強制
     BOM 環境仍衝突，不推薦。

2. **[vote 1/5 — sonnet（本職角度）；協調者既有實證（四輪全套兩紅）]
   i18n-dom flake 威脅本 sprint 自身 CI／deploy gate**
   - Where: i18n-dom.dom.test.ts:245；test.yml 雙 leg＋deploy.yml 皆
     重跑全套
   - 全套並行負載下踩 5s 預設 timeout（協調者統計 2 紅／4 輪；隔離
     穩綠）。~50% 觸發率的案會直接紅掉本分支 push CI 與 main 部署
     gate——「留給 09 加固批」的緩期框定低估了對本 sprint 自身合併
     路徑的即時風險。
   - Suggested fix: 立即單行緩解（該案 `{ timeout: N }` 放寬），根因
     （boot 減重）仍留加固批。

## 🟢 採納 nits（低票本職發現，協調者逐項實證屬實）

3. [2/5 fable-A1＋opus；grep 實證] **T1.2 新註解行號落地即失準**——
   emit-ps1.ts:540「joinPowerline（:889-910）」實際 :900、:1132
   「（:897-906）」實際 :908 起；本 sprint 正在清同類債又埋新債。
   → 改符號指涉（「`joinPowerline` 的 `if (powerlineArrow)` 區塊」）。
4. [2/5 opus＋fable-A5；grep 實證 12 處] **`.t15`/`.t23` 同源死指標
   半清＋追蹤落點消失**——散布 emit-bash/ps1/settings/兩測試檔；
   BACKLOG「衛生殘項」條目被 promote 勾銷後無落點。→ BACKLOG 補一行
   或本批順手清。
5. [1/5 sonnet；grep 實證] **copy reject 路徑零測試案**——新 describe
   全為 `mockResolvedValue`。→ 補一案 `mockRejectedValue` 斷言失敗播報。
6. [1/5 sonnet] **check fixture 缺「`_` 前綴檔案（非目錄）不誤殺」pin
   案**——防未來重構掉 `isDirectory()` 守衛。→ optional 補一 fixture。
7. [3 票提及（sonnet Issue＋fable/haiku B 類）] **_probe 排除為
   build-only、`npm run dev` 仍可達**——語意一句補進 vite.config 註解
   或 SPEC，防未來誤讀為「完全不可達」。

## 🟢 Minority（未過門檻，保留供參）

- [3 提及] 治理文件（MAGI_REVIEW_POLICY.md＋CLAUDE.md 指標）與
  hygiene chore 同批——建議 /magi:commit 時分拆 `docs:` commit
  （commit 顆粒度屬使用者 gate，屆時裁決）。
- [1/5 fable-A5] verify-dist 目錄形 check 偵測不到 chunk／import 形
  態的 _probe 洩漏（現 grep 實證零 import）——BACKLOG 候選。
- [1/5 fable-A5] ffmpeg-core.wasm 內含 `_probe` 位元組字串（av*probe
  符號）——未來若寫全文 grep gate 會永久誤報，備查。
- [1/5 opus] BACKLOG Promoted 第三條把 forailook no-op 列作已辦——
  補「已自然消解」註記更精確。
- [1/5 sonnet] WORKS「紅綠雙證」係一次性手動變異測試，措辭宜註明
  「未簽入」防審計誤讀。
- [1/5 fable-A1] 多列＋noarrow 組合無真執行 leg（構造保證＋黃金文字
  覆蓋，風險極低）。
- [1/5 haiku] **（實證駁回）**新測試 tmpdir Windows 路徑疑慮——本機
  win32 43/43＋全套 1827 綠即為反證。
- [1/5 haiku] **（實證駁回）**CRLF 使黃金檔 byte-exact 破功疑慮——
  `.gitattributes` 明載 `tools/statusline-builder/__golden__/** -text`
  （06a 例外＋sprint 10 零 churn 實證），該風險由設計排除。

## Untested paths

- copy reject × ps1 通道（🟢-5）；雙 BOM 情境（協調者已補真機探針，
  但無自動化案）。— sonnet／協調者
- 多列＋noarrow ps1 真執行（僅構造保證＋黃金文字）。— fable-A1
- `discoverToolEntries` 底線跳過無直接單元測試（僅端到端 build＋
  check 覆蓋，`assertAvailableToolsHaveEntries` 為次級安全網）。— sonnet
- 全體審查員沙盒無法親跑測試套件——數字由協調者親跑背書。— 全員

## ⚠️ Degraded mode

無降級。角度 5 首輪瞬間 exit=1（log 空、final 空，與 sprint 11 暫時
性 API 失敗同款特徵），依單次重試政策重派後回收；五票全數計入。
