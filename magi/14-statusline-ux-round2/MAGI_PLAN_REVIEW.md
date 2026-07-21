# 🧠 MAGI Plan Review — Statusline Builder UX 第二輪真機回饋批

**Sprint:** magi/14-statusline-ux-round2/ • **Document:** PLAN.md（Rev 3）• **Round: 2**

## Dashboard

```
┌──────────────────────────────────────────────────────────────────┐
│  VERDICT: REQUEST-CHANGES（窄幅文件級；3 RC＋2 AWN）             │
├──────────────────────────────────────────────────────────────────┤
│  Policy: 角度制 5 票（major）  Mode: majority  Threshold: > 2.5  │
│  OK weight: 5 / 5    Degraded: no（兩輪皆零重試）                │
├──────────────────────────────────────────────────────────────────┤
│  角度×模型：1 設計健全=fable ✅  2 契約=opus ✅  3 驗證=sonnet ✅ │
│             4 回歸=haiku ✅   5 安全=fable ✅                     │
├──────────────────────────────────────────────────────────────────┤
│  Round-1 採納項對帳：3🔴＋8🟡＋8 nits 全數五票確認「真解」        │
│  Round-2 新增：🔴 0   🟡 6   🟢 nits 14   反證/Minority 5        │
└──────────────────────────────────────────────────────────────────┘
```

> 同 vendor 湊票揭露：五票皆 claude 系。沙箱不對稱：A1／A2 仍被擋在
> sprint 目錄（自陳並以探針確證），倚賴 round-1 已核實 file:line 證據
> ＋平台語意推導；A5 以 `git show` 實查 HEAD 補三個角度 5 留白（全
> 綠）。協調者本輪親證 ×4：列內控件盤點、resolve mode 閘控、dialog
> 公式驗算、目錄歸屬文本檢核。

## Verdict

**REQUEST-CHANGES**——但性質與 round 1 不同：五票一致確認 round-1
全部採納項在 Rev 3 中**真解決、非口頭宣稱**（A2／A5 逐條複核、A1 對
讀全文、A3／A4 抽查關鍵面）。剩餘全是 Rev 3 修訂自身引入的殘留：一個
版面定位缺口（目錄欄位歸屬——需使用者圈選）＋一個狀態機謂詞矛盾＋
若干驗證設計補強，全部半頁級文字修訂、不推翻任何已裁決方向。依
§7.5：無 (a) 類架構重開，修訂後**無需第三輪**（round-3 遞減報酬），
建議直接進 `/magi:tasks`。

## Round-1 對帳（五票確認全數已解，靜默即認可）

🔴1 基線重寫＋頂帶契約遷移 ✓／🔴2 D1→`:has(:focus-visible)` 單一事實
源 ✓／🔴3 e2e dismiss 全案前置＋無條件回歸 ✓／🟡4 合成樣例來源 ✓／
🟡5 textContent 釘死 ✓／🟡6 localStorage 體制 ✓／🟡7 狀態機寫死 ✓／
🟡8 deltas 重寫（汰除清單＋精確值）✓／🟡9 BACKLOG 具名步驟 ✓／
🟡10 黃金檔 ×2＋護欄改述 ✓／🟡11 D4 斷言分層 ✓／8 nits 全落地 ✓

## 🟡 Important (adopted, round-2 新增)

1. **[vote 2/5 — A2＋A1 雙本職；協調者文本實證] 三欄終形未交代
   「目錄」欄位歸屬——本批 compact 列＋樣例值的唯一渲染面失定位**
   - Where: PLAN.md Goal 2／D2 欄位枚舉／行動摺疊序／SPEC delta 新文
   - 現行雙欄＝「左（目錄＋設定）｜右（已選擇）」；Rev 3 三欄只寫
     「左＝全域設定｜中＝預覽｜右＝segment 清單」——目錄無落點，
     「segment 清單」語意未定（目錄？已選擇？同居？）。S1「拖目錄項
     到欄底的列」與教學句「排序與移列」暗示右欄同居，但規格不應留
     推論空間（round-1 🔴1 教訓）。牽動 DnD 跨欄距離、e2e 範圍、
     教學帶指涉、右欄高度預算、PRD 佐證。
   - Fix: 明文裁定（協調者建議**右欄＝目錄 compact 列（上）＋已選擇
     清單（下）同一捲動容器**——拖曳短程、與 S1/e2e 文本一致；
     互動模型不變：勾選加入＋列控件照舊，非「合併」）——**需使用者
     圈選**；同步 Goal 2／摺疊序／SPEC delta。
2. **[vote 2/5 — A5 本職＋A1 同發；文本自證] D5 狀態機謂詞與「怪值
   嚴格比對」互相矛盾**
   - 「顯示 ⟺ key 不存在」判「key 存在但值≠sentinel」為隱藏；體制段
     「非值視同未 dismiss」判顯示——同一可測案例兩句相反。
   - Fix: 單一謂詞「顯示 ⟺ 讀值 ≠ `'1'`（key 缺失、讀取失敗、怪值
     皆顯示，fail-open）」；sentinel **定死 `'1'`** 並隨 key 寫入
     SPEC delta；e2e seed 步驟引用同一常數（A5-N2 併採）。
3. **[vote 1/5 — A1 本職；協調者幾何複核屬實] 右欄 `100dvh` 未扣
   欄頂偏移——round-1 (a) 批評僅半解**
   - flex 治好「教學帶 dismiss 後預算過期」，但 sticky 未黏住前
     （scrollY=0）欄底超出視窗恰為頁首高度，初載欄底被裁、雙捲軸
     兩段式體驗；S1 檢核清單恰無此項。
   - Fix: S1 加「初載（scrollY=0）右欄底端可達性」檢核；後備＝
     `max-height: calc(100dvh − var(--column-top))`（頁首高度靜態）。
4. **[vote 1/5 — A3 本職] D4 缺正向斷言**——補
   `expect(document.activeElement).toBe(radioEl)`（dom）＋e2e 選配
   同斷言；負向 spy 三件套保留。
5. **[vote 1/5 — A3 本職] D1「滑鼠不浮現」無常駐回歸案**——round-1
   🔴2 的行為守衛只有一次性 Spike；S4 定層後（jsdom 可辨模態則 dom、
   否則 e2e）補一條**常駐**「滑鼠點擊列內控件不加 reveal class」案。
6. **[vote 1/5 — A3 本職] 樣例 per-locale 快取（模組單例）無測試
   隔離**——暴露 test-only reset hook 並於 beforeEach 呼叫（或明文
   「樣例斷言前強制觸發 locale 重算」）。

## 🟢 採納 nits（round-2）

7. [A1 本職；協調者實證：segment row 含 button×3/select×2/checkbox×2、
   **無文字輸入**] D1-B′「保證」句過寬——修正為「對按鈕／checkbox
   成立；select 的滑鼠 :focus-visible 行為跨瀏覽器有變異」；S3 斷言
   按控件類別矩陣展開（button／checkbox／select）。
8. [A2 本職] PRD (none) 佐證句擴寫：涵蓋 move 鈕可見性（可供性變更、
   非能力增減）與三欄重排（呈現層）兩項頭號變更。
9. [A2] SPEC delta 改述**行為契約**（預設收納、鍵盤導航浮現、滑鼠
   點擊不浮現），`.row:has(:focus-visible)`／JS 旗標留實作層，S3
   定案後再落 SPEC。
10. [A2] TECHSTACK 基線句：刪語意不明的「container-independent
    grid」，補 `overscroll-behavior`。
11. [A2＋spike；協調者實證 resolve 為純函式匯出] D2′ 補一句「逐段以
    單段-enabled 合成 config 呼叫既有 `resolve()` 取得 pre-ANSI 文字
    （唯讀、不改 resolve）」——Non-Goal 張力收口；S2 順帶驗證。
12. [A5] 合成 resolve 以 **lazy＋try/catch** 包裹：擲錯整批 fallback
    至 default-hint、不阻斷 init。
13. [A1；協調者反證 mode 閘控在 resolve 層（僅 enabled 閘控），惟
    定值仍採] 合成 config 明定 `mode: 'plain'`（樣例取純文字、避開
    powerline pad／arrow 呈現差異）。
14. [A1] 收納態**不可命中**：`visibility: hidden`（退出 Tab 序）或
    `opacity:0 + pointer-events:none`（留序）擇一裁定；S1/S3 加
    「點擊收納鈕原位置無效果」斷言。
15. [A1] S3 第四斷言：鍵盤 move（重渲染＋程式化還焦）後浮現態延續；
    破口則 JS 旗標後備天然免疫、作選型加分。
16. [A1] 「捲動停點總數 2」改條件式：外層預覽節點僅在自身仍為捲動
    容器時保留 tabindex=0，否則留 role=region、停點降為 1。
17. [A4] SVG 主題色明文：`currentColor`／既有 CSS 變數，深淺主題
    跟隨；入 S1 檢核。
18. [A4] micro-fix-3 於 Goals 明文（防 D2 行動版工程遞延時靜默失聯）。
19. [A3] S1 時箱拆分：跨瀏覽器拖曳子項允許溢出半天預算、不阻塞
    S2/S3。
20. [A3] CLAUDE.md delta (none) 就地補佐證句（比照 PRD 款式）。

## 🟢 Minority／協調者反證（未採納）

- [A4 自標 Critical] 「dialog 公式數學錯誤」——**反證（驗算）**：
  600px→540px 為行動版既定行為（與現行 `min(90vw,640px)` 同值）；
  1000px→640px 與原裁決式一致；「與 55vw 裁決完全相同」指與裁決
  **公式**行為同，非「寬度＝55vw」。公式維持。
- [A4] skip-nav／region 測試面逐案列舉——step 5 已具名 preview-band
  ／skip-nav 案；細目屬 TASKS 層。
- [A4] 黃金檔第二跑於 step 4 後——step 7 終驗已在全部步驟之後，
  已覆蓋。
- [A4] move 鈕 aria-label 內容詳述——既有鈕已具掛標；TASKS 層確認。
- [A1 前提] 列內文字輸入控件——**反證（盤點）**：row 模板無文字
  輸入；殘餘 select 變異已由 nit-7 承接。

## ⚠️ Degraded mode

無降級、零重試（兩輪合計 10/10 票首發回收）。

## 收案（2026-07-20）

使用者二項追裁：**🟡-1 目錄歸右欄、與已選擇清單同居**（單一捲動
容器：教學帶→目錄 compact 列→已選擇清單）；**流程＝Rev 4 →
`/magi:tasks`，不跑第三輪**。round-2 全部採納項（🟡6＋nits 14）已
併入 PLAN.md Rev 4，本審議案結。

---

### Round-1 摘要（歸檔）

Round 1（同名冊 5 票）＝REQUEST-CHANGES：🔴3（D2 版面基線與 HEAD
不符／裁決 1 focus-within 滑鼠矛盾／e2e 教學帶前置必然）＋🟡8＋
nits 8＋反證 6＋spikes 5；協調者實證 ×9。使用者四項重裁（2026-07-20）
：D1 改 `.row:has(:focus-visible)`、D2 頂帶降級入中欄、D3 追加 72rem
上限、流程走 round 2。全部採納項已由 PLAN Rev 3 併入並經本輪五票
逐項確認。
