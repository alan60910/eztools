# 🧠 MAGI Plan Review — statusline-builder UX 重構（真機回饋批）

**Sprint:** magi/09-statusline-ux-refactor/ • **Document:** PLAN.md • **Round:** 1→2 • **Date:** 2026-07-17

> **最終狀態（round 2 後）：APPROVE** — round 1 REQUEST-CHANGES 的
> 3 Critical＋22 Important 已全數修訂入 PLAN Rev 2，經 3 人複核面板
> 逐項判定 RESOLVED；round 2 新發現 3 項 Note 級收口（defer 啟用側
> UI 同步、語言切換播報承載節點＋rebuild 焦點聲明、pending-only 變異
> 點 no-op 正名）亦已當場落 PLAN。詳見文末 Round 2 段。

## Dashboard

```
┌──────────────────────────────────────────────────────────────┐
│  VERDICT: REQUEST-CHANGES                                    │
├──────────────────────────────────────────────────────────────┤
│  Mode: 角度制面板（使用者指定多角度、不限 3 票）             │
│  Reviewers: 7/7 OK（magi:reviewer × 互斥角度） Degraded: 否  │
│  採納制: Critical/Important 由協調者親自讀碼複驗            │
├──────────────────────────────────────────────────────────────┤
│  ✅ A1 schema   ✅ A2 backends  ✅ A3 dragdrop  ✅ A4 layout │
│  ✅ A5 i18n     ✅ A6 testing   ✅ A7 deltas                 │
│  票向: 6× REQUEST-CHANGES ＋ 1× APPROVE-WITH-NITS（A7）      │
├──────────────────────────────────────────────────────────────┤
│  🔴 Critical: 3（協調者全數 CONFIRMED）                      │
│  🟡 Important: 22   🟢 Note: 18   🔬 Spike: 8                │
└──────────────────────────────────────────────────────────────┘
```

gemini/codex CLI 不在本機（既有環境事實），依 sprint 08 前例與使用者
指示改採「依角度開票」：7 個互斥視角各自窮盡自身角度，票數不設限；
因角度互斥使加權票數學無意義，採納標準＝**協調者對每項 Critical／
Important 親自讀碼或讀文件複驗**（非採信回報）。

## Verdict

**REQUEST-CHANGES**——無任何角度否定五個子項的方向（全員肯定 D1 schema
選型、D3 拖曳方向、D4 回應原話、D5 零依賴選型正確）；但三個 Critical
都是「plan 宣稱的實作路徑在現行程式碼上不成立」，另有成批 Important
是 plan 層必須先拍板的設計決策（live region 去向、golden 策略、i18n
依賴方向）。全部可在 PLAN 修訂內收斂，不需推翻任何使用者已拍板事項。

## 🔴 Critical（採納，協調者親驗 CONFIRMED）

### C1 [A3] 「enable＋move 組合」非原子，中間態使 drop 落點算錯
- Where: PLAN §D3-A；main.ts:910-954（setSegmentEnabled）、:1538-1546
  （commitSegmentMove）；row-groups.ts:34；row-slots.ts:222-261
- 複驗：協調者讀碼確認——`computeRowGroups` 明文 `if (!seg.enabled)
  continue`（停用段不進列群組）；`setSegmentEnabled` 內部自呼
  `commitConfig()`（:940）且變異 `rowSlots`（:924 drain 移除、:935 首列
  插入）。拖入必經 enable→relayout→move 兩段 commit，enable 的中間態
  改動 rowSlots 與 clamp 落列，使 drop 當下捕捉的 slotIndex stale、
  planSegmentMove 依「enable 落的預設列」假來源計算 drain/bump。
  具體崩解案：空清單拖入唯一 pending、有中間 pending 列時拖入該列。
- Fix（PLAN 須明列）：設計原子「enable-into-target」路徑——
  setSegmentEnabled 增 defer-commit 旗標（只 mutate、不 relayout），由
  commitSegmentMove 做唯一一次 commit；或新增直接以 target 定 row/slots
  的決策分支，不經預設列中間態。

### C2 [A2] rowSeparators 列 index 基準分岔：resolve「存活列」vs 兩後端「啟用列」
- Where: PLAN §D1；resolve.ts:618-640；emit-bash.ts:872-882；
  emit-ps1.ts:984-994
- 複驗：協調者讀碼確認——`resolve()` 在分桶前剔除執行期死亡段
  （:627），`.map` index 是存活列緊縮序；`groupByRow`（emit-bash:872）
  只依 `enabled` 分組、死亡過濾延到腳本執行期，SEP 綁啟用列序。某啟用
  列整列執行期死亡且其後有覆寫列時，預覽與腳本取到不同分隔符——違反
  G1 byte 級一致，且 golden（emit 層靜態文字）抓不到。
- Fix（PLAN 須明定）：`rowSeparators` 一律綁**啟用列（config 正規化）
  位**；resolve 需由 `config.segments` 篩 enabled 重算列鍵序、把存活
  渲染列映射回啟用位再取覆寫，禁止直接用 `.map` 存活 index。

### C3 [A5] 預覽 aria-label 在純模組管線組裝，D5 兩個施力點觸及不到
- Where: PLAN §D5/§G5/§Verification；resolve.ts:429（硬編「重置」）、
  :435（headAria 消費 icon.ariaText）；segments.ts:248-249＋30 段中文
  ariaText
- 複驗：協調者讀碼確認——`resolve.ts:429` `suffix.replace('↺','重置')`
  硬編中文；`:435` 消費 `descriptor.icon.ariaText`（segments.ts 30 條
  中文）。此管線不在 index.html（data-i18n 無節點可標）也不在 main.ts
  （不走 t()），G5「aria-label 翻轉」驗收條無法達成；segments.ts:248
  註解「中文，不受本次變更影響」與 G5 直接矛盾、未裁決。
- Fix（PLAN 須裁決）：明訂預覽 aria 管線 i18n 路徑（locale/t 注入
  resolveSegment／toAriaLabel，或 ariaText 改 message key）；裁決
  icon.ariaText 與「重置」是否納入 en；同步修 segments.ts:248 註解。

## 🟡 Important（採納）

### D1／schema 族（A1，協調者 spot-check sanitizeSeparator 坐實）
1. **[A1] reindex splice 落點錯置**——真正的列級結構變動散落 `rowSlots`
   各變異點（setSegmentEnabled :924、performRowDeletion :1841、
   commitSegmentMove :1544、deletePendingRow :2467、appendPendingRow
   :2549），`normalizeRows`（config.ts:381-389）是整體重導非 splice，且
   bump 先改寫 row 值使延後重映失準。Fix：`rowSeparators` 視為與
   `'real'` slot 一對一的平行陣列，splice 落在各 rowSlots 變異點；補
   「pending-consume 插入＋來源 drain＋bump」複合案覆蓋。
2. **[A1] `sanitizeSeparator` 複用與「壞形退 null」互斥**——它永不回
   null（全失敗路徑回 `defaultSeparator()`＝'|'），直接複用會把畸形項
   變成明示 '|' 覆寫、污染繼承語意。Fix：新增
   `sanitizeRowSeparator(raw): SeparatorConfig | null`，僅委派驗證核心。
3. **[A1] 陣列級清洗未規範**——比照 `sanitizeRow`（config.ts:229-234）
   對 `row:999999999` 的 DoS 防禦：需明訂非陣列退化、長度 clamp 上界、
   尾端 null 修剪、全 null→欄位省略的正規形。

### 三後端／golden 族（A2＋A6＋A1 合流，vote 3）
4. **[A2] bash SEP 消費側落點缺漏**——`joinPlain`（emit-bash.ts:833-853）
   內部寫死 `$SEP`，逐列化是結構改（宣告 :932＋消費側＋單列路徑 :952
   三處）；ps1 的 joinPlain 本就參數化、只改兩呼叫點。plan「同理」並列
   誤導估時。Fix：落點補列三處，明寫兩後端 threading 模型相反。
5. **[A2+A6+A1 merged] golden 策略自相矛盾**——「全量重生」與 D1
   「缺項退全域」衝突：既有 16 個 fixture 無一設過覆寫，重生對新路徑
   近零覆蓋，且把「向後相容＝byte 不變」這個本該當回歸鎖的不變量改成
   每次重簽（並與 golden 檔「禁區：不得重生」慣例衝突）。Fix：改為
   「**既有 golden byte 凍結當回歸鎖**（無覆寫→與現行逐 byte 相同，
   隱含 emitter 需 no-override fast path）＋**新增帶 rowSeparators 覆寫
   的 golden fixture**（plain，含覆寫/null 繼承/custom escape）＋
   **powerline golden 8 檔零 diff 硬斷言**」；並補一個帶 scenario 的
   「執行期整列死亡＋後列覆寫」案把 C2 釘進端到端。

### 拖曳／播報族（A3）
6. **[A3] 拖曳視覺/清理綁死 rowElements（中欄 li）**——目錄項起手後
   opacity 清理會打到隱藏池 li、目錄項卡半透明。Fix：清理依起手來源
   分派，與 endDragCleanup 冪等化合流（合流本身經 A3 判定為被新功能
   正當化，非範圍蔓延）。
7. **[A3] 播報「移至/加入」無法分辨來源**——performCrossRowMove
   （:1573-1586）硬編 formatMoveAnnouncement「移至」。Fix：加 origin
   參數選擇播報模板，文案入 G5 字串表。
8. **[A3] 鍵盤 checkbox 落列播報是新工作且撞 BACKLOG:37**——
   setSegmentEnabled 啟用分支現完全不播報；播出「第 N 列」會曝光
   「clamp 落點顯示編號 vs 凍結 row 值」既知矛盾。Fix：明列為 M3 交付
   項並先裁決顯示編號語意。

### 版面族（A4，協調者 spot-check skip-nav＋SPEC:102 坐實）
9. **[A4] output live region 進 dialog 違反 SPEC.md:102 常駐不變量**——
   關閉的 dialog 是 display:none。Fix：#output-status 留 dialog 外，或
   明文改用常駐 #global-live-status 承載複製播報；PLAN 顯式記載。
10. **[A4] skip-nav「跳至產出腳本」（index.html:229）目標失效**——
    落點與 deltas 均未列。Fix：skip-nav 隨版面同步改造並入 dom.test。
11. **[A4] dialog「三分頁」＝自製 ARIA tab 元件**——role=tablist/tab/
    tabpanel＋roving tabindex＋方向鍵非 <dialog> 原生。Fix 二擇一寫進
    PLAN：(a) dialog 內三塊 stacked 不做 tab（成本最低、仍符原話）；
    (b) 堅持分頁則明列 ARIA 契約＋鍵盤模型＋jsdom 案。
12. **[A4] showModal 使頁面 inert，破壞「邊改 config 邊看產出碼」**——
    模態是 plan 自選、非使用者原話。Fix：權衡非模態 show()（自管焦點）
    或接受模態並明記取捨。
13. **[A4] sticky 頂帶高度預算／控件收斂形下放過度**——mobile 100dvh
    下這是可行性核心。Fix：補 max-height 預算（如 ≤40–45dvh）＋收斂形
    最低規格；真機 checklist 加「下方工作區至少一列群組可見」。

### i18n 族（A5）
14. **[A5] 純模組 i18n 依賴方向未定＋row-select.ts 全篇漏列**——
    row-groups／row-select／resolve／segments 皆「node 可測、零 DOM
    import」（SPEC:111-113）；i18n.ts 若含 localStorage/document 被純
    模組 import 即炸 node 測試。row-select.ts:68-73 硬編「第 N 列
    （新列）」完全未列。Fix：拆純核心（messages＋t(locale,key,params)）
    與 DOM-facing 套用器兩顆；四個純模組列入抽離清單。
15. **[A5] 量級漏算資料層文案 ~60 條**——segments.ts 30 label＋30
    ariaText 是目錄項/段名/播報插值的骨幹。Fix：量級加第五類並重估；
    明訂 en 翻譯來源與品保關卡。
16. **[A5] 7 個 `<template>` clone 時序未講**——套用器不會下探
    template.content，色選/閾值/段列 clone 後才進 DOM。Fix：init 先翻
    template.content 或每個 clone 點 clone 後套用，擇一明訂。
17. **[A5] 語言切換對已渲染 imperative 文案無重繪路徑**——
    buildSegmentRow 一次性設的 aria/label、row-select 選項、預覽 aria
    不會隨切換翻轉。Fix：明訂切換時重繪策略（重跑 accessible-name 賦值
    ＋強制 preview 重 resolve＋刷新 row-select）。

### 測試／驗證族（A6）
18. **[A6] e2e 在 CI 外，M3/M4 主迴歸網零 CI 保護**——CI 只跑
    typecheck＋vitest；plan 把拖入與 dialog 押在本機限定 e2e。Fix：
    「enable+move at row N pos M」抽 testable seam 供 jsdom 直測；e2e
    明列為 CI 外人工 gate、真機 checklist 前置。
19. **[A6] 「1454 案只增不減」非可攜不變量**——1454 是本機三後端滿載
    數（CI leg 上 skipIf 結構性低於此），且重構型 sprint 合法改寫刪案。
    Fix：改「per-CI-leg pass/skip 無迴歸＋能力對測不失守＋刪案列明
    理由」，1454 僅本機參考值。
20. **[A6] main.ts 互動層覆蓋薄**——jsdom 無原生 DnD；既有 e2e 快照
    （S1/S9/S4）不帶 separator 狀態，互動 reindex 在 CI 與 e2e 皆零
    斷言。Fix：見 18 的 seam＋e2e 快照納入每列 separator 狀態＋
    config.test.ts 明列刪中間列/空列壓縮/移列三型正反案。
21. **[A6][deltas] e2e 硬比對「第 N 列」i18n 文字**——data-testid 只
    解決選元素、不解決文字斷言，M5 一動 heading 即震 5 案。Fix：列群組
    容器補 `data-row-index` 序數屬性；Conventions delta 補「e2e 斷言
    不得依賴 i18n 可見文字」。
22. **[A7][deltas] SPEC Components 三欄段需「改寫」非「補一句」**——
    現文「右＝即時預覽＋產出腳本 sticky、斷點 3→2→1」（SPEC.md:54-57，
    協調者親讀坐實）交付後即不實，append 會留新舊互斥並存。Fix：delta
    升級為明列改寫版面拓撲子句。

## 🟢 Note（少數意見／低嚴重度，逐項列示不自動採納）

- [A1] pending→real 物化插入未列入 reindex 規則枚舉（splice 入 null＋
  後移）；`rowSeparators[i]` 的索引空間（dense render 位、config 已
  正規化前提）未明文釘死；powerline 模式下保值不清除（比照 separator
  惰性存續）未言明。
- [A3] plan 對 `dragOrigin` 的耦合暗示屬**誤指**（write-only 死狀態，
  BACKLOG:43 已列移除）——plan 應改點名真正耦合（rowElements/slots）；
  data-testid 上錨時機未定（M4 後 M6 前有「結構 selector 已壞、錨點
  未上」空窗），建議動到哪個節點就在該 milestone 補錨；「已啟用目錄項
  被拖」語意（退化純 move）與目錄 checkbox 命中區的 dragstart 豁免
  未定義。
- [A4] sticky 頂帶 z-index 與 skip-link(z:10) 堆疊未規劃；「兩個捲動
  停點」a11y 契約在新版面需重新推導；settings-path input（index.html
  :179-188）去向未定（建議留 config 區）。
- [A5] 閾值 6 模板名 index.html/main.ts 雙寫，趁 i18n 收斂單一 key；
  mock-data.ts label 疑為非渲染平行副本、權威來源需釐清；lang key 宣稱
  核對**正確**（既有 config key 冒號式為 grandfathered，可加註）。
- [A6] jsdom 不實作 <dialog> focus trap/Esc——dom.test 只測手動邏輯、
  native 行為歸 e2e，需明列分工；i18n meta 案需兩語言字典 implement
  同一 `Messages` 介面才罩住插值 arity；M4 排序理由掛錯對象（e2e 5 案
  全在中欄，真正逼改的是 M3 與 M5）。
- [A7] header「Pending 第 1 項」引註已因 promote 位移失效（現第 1 項
  是本 sprint 的 Non-goal 匯入匯出）；BACKLOG「a11y 三 note」與本
  sprint 相鄰、宜明示 in/out；PRD delta 帶實作級細節（altitude 微瑕）。

## 🔬 Spike candidates（8）

1. [A1] reindex 複合列操作對位不變量——property-based／組合矩陣測試
   （比照 row-slots.test.ts 風格），M1 定 schema 時先跑、早於 golden 定形。
2. [A2] bash 無覆寫 byte-preserving＋空列情境 resolve/emit 對位 PoC
   （sha1 比對＋真執行 vs toAnsi(resolve()) byte 比對）。
3. [A3] enable+move 原子性 PoC（三情境：空清單/中間 pending/真實列）
   ——審議已判組合不成立，spike 轉為新設計的驗證案。
4. [A3] setSegmentEnabled defer-commit 不破既有啟停播報/焦點契約
   （跑既有 dom.test＋新增 defer 模式斷言）。
5. [A4] sticky 頂帶 mobile 高度預算（375×667/390×844 實量＋
   max-height 40-45dvh PoC）。
6. [A4] <dialog> showModal 焦點還原/Esc/舊 iOS 相容矩陣（含
   feature-detect fallback 決策）。
7. [A5] 純核心 t() 拆分 PoC（messages.ts 純／i18n-dom.ts DOM 分層，
   四純模組改注入後 node 測試全綠）。
8. [A5] template/clone 翻譯時序 jsdom 案（clone 實例文字＋切換後已
   掛載實例翻轉）。

## 正面確認（審議過程坐實、無需行動）

- PLAN 全部 file:line 引用經多角度核對**正確**（A2、A4 明文確認）。
- D1 schema 選型（v2 選填欄、不 bump）論證**成立**（A1 逐項驗證
  drop-unknown、三前例、BACKLOG 陷阱對照）。
- 「分隔符僅 plain、powerline 無分隔符」宣稱屬實；行尾契約與
  emit-settings 不受影響（A2）。
- Spec deltas 主體正當：CLAUDE.md=(none) 正確、i18n key 循慣例、
  data-testid 落 Conventions 得當、「腳本不雙語化」與 golden 契約
  無矛盾（A7）。
- 五題拍板與正文一致、「無殘留 open question」屬實（A7）。
- endDragCleanup 合流被判定為被新功能正當化、非範圍蔓延（A3）。

## 處置建議（§7.5 triage）

三個 Critical＋Important 主體屬 **(a) 架構／結構級**（plan 內的實作
路徑與契約定義要改），但**全部收斂於 PLAN 修訂**、不推翻方向與使用者
拍板事項。建議：修訂 PLAN.md（C1–C3＋Important 22 項逐一落回對應
章節）→ 輕量 round 2（只複核修訂段落）或直接 `/magi:tasks`（由使用者
擇一）。Note 18 項可修訂時順手帶，不阻斷。

---

## Round 2（複核，2026-07-17）

使用者選「修訂 PLAN → 輕量 round 2」。PLAN 升 Rev 2 後派 3 人面板
分域複核（R2-1＝D1/backends/golden、R2-2＝D3/D4、R2-3＝D5/Verification/
deltas/執行順序），逐項判定 round 1 發現的處置：

```
┌────────────────────────────────────────────────────────┐
│  ROUND 2 VERDICT: APPROVE（3/3 面板）                  │
├────────────────────────────────────────────────────────┤
│  R2-1 D1/backends/golden: APPROVE-WITH-NITS            │
│  R2-2 D3/D4:              APPROVE                      │
│  R2-3 D5/Verif/deltas:    APPROVE                      │
├────────────────────────────────────────────────────────┤
│  C1–C3: 3/3 RESOLVED   Important: 22/22 RESOLVED       │
│  round 1 Notes: 全數 ADDRESSED                          │
│  round 2 新發現: 3× Note（全數當場落 PLAN）            │
└────────────────────────────────────────────────────────┘
```

Round 2 新發現與處置（全部已編修入 PLAN Rev 2）：
1. **[R2-2/Note]** defer-commit 唯一 commit 後須補跑啟用側 UI 同步
   （`syncSegmentEnabledUi`＋`syncFgOverrideDisabled`），否則拖入
   powerline+bar 段重演 I4b → 已補入 §D3 A-1。
2. **[R2-3/Note]** 語言切換播報承載節點指定＝`#global-live-status`；
   rebuild 段列不涉焦點保全聲明；`ResolveInput.locale` 選填、預設
   zh-Hant → 已補入 §D5 A-4。
3. **[R2-1/Nit]** §D1 A-3 兩個 pending-only 變異點（`removePendingRow`
   :2465／`appendPendingSlot` :2547，round 1 用名有誤）對
   `rowSeparators` 為 **no-op**（不動 real slot；照 slot index 機械
   splice 會誤刪錯位覆寫）→ 已正名並明訂於 §D1 A-3。

**最終處置：PLAN Rev 2 通過審議，建議進 `/magi:tasks`。**
