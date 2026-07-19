# 🧠 MAGI Code Review — DEV @ 9a492c2（sprint 13 未提交工作樹）

**Diff scope:** 未提交變更 vs HEAD——9 files, +655/−38（693 行，無產生檔）

## Dashboard

```
┌────────────────────────────────────────────────────────────────┐
│  VERDICT: APPROVE-WITH-NITS                                    │
├────────────────────────────────────────────────────────────────┤
│  Policy: 角度制 5 票（693 行 → 201–800 → 5 票）Threshold > 2.5 │
│  OK weight: 5 / 5    Degraded: no（本輪零重試）                │
├────────────────────────────────────────────────────────────────┤
│  角度×模型：1 正確性=fable ✅  2 契約=opus ✅  3 測試=sonnet ✅ │
│             4 回歸=haiku ✅   5 安全=fable ✅                   │
├────────────────────────────────────────────────────────────────┤
│  🔴 Critical: 0    🟡 Important: 3（皆潛伏非現紅）              │
│  🟢 採納 nits: 6   Minority: 6                                 │
└────────────────────────────────────────────────────────────────┘
```

> 同 vendor 湊票揭露：五票皆 claude 系。本輪交叉實證密度高：A1 獨立
> 驗證「0 offender 非假陰性」（main.ts 僅兩個乾淨 regex）、A2 實測
> render-preview 執行期覆寫鏈、A5 實測 e2e 清理鏈與 emit 註解結構契約；
> 協調者補實證 ×2（render-preview:246 無條件覆寫屬實；掃描器字串模式
> 無換行終止屬實）。五票對 M2「CI 首跑＝真驗」的遞延性質認知一致。

## Verdict

**APPROVE-WITH-NITS** — 六工作面全數落地、宣稱經多點獨立稽核屬實；
紅綠雙證（盲點 (b) 不硬造改打真缺陷）與量測支撐的治本獲全員背書。
三個 🟡 全是**潛伏縫隙**（掃描器對邊角源碼形 fail-open、巡檢背書過寬、
meta 守門首跑風險）而非現狀紅——與本 sprint「把守衛做實」同向的加固
建議。CI 雙 leg 綠仍為契約明訂之 push 後終驗。

> **修復狀態（2026-07-19，使用者裁決「修採納項全批」）**：🟡-1 已收口
> （換行終止＋marker 字串感知＋回歸案 ×3；regex 含 `//` 類**文件化未修**
> ——JSDoc 已知限制）；🟡-2 已收口（key 收緊＋template.content 巡檢＋
> en 重掃案，全 repo key 實測零錯字）；🟡-3 診斷性輕修落地（CI 首跑仍
> 為契約遞延終驗）；🟢-4~9 全數落地（WORKS 定性更正條目＋對帳補遺＋
> BACKLOG emit-ps1 行＋行號符號化＋e2e 後綴斷言＋指紋／雙寫入者註解）。
> 收尾後全套 **1843/1843**＋e2e 8/8（協調者終驗）。未修 minority：30s
> 無效能訊號 soft-warn、scoop 硬編路徑（C 類待 commit 裁決）等。

## 🔴 Critical (adopted)

（無）

## 🟡 Important (adopted)

1. **[vote 3/5 — fable-A1＋sonnet＋fable-A5；協調者實證字串模式無換行
   終止] 掃描器對邊角源碼形 fail-open——regex 字面量全盲＋字串內
   marker 誤匹配**
   - Where: i18n-meta-scan.dom.test.ts:83-160（stripComments／stripThrowErrorCalls）
   - 三個具體形：(a) regex 含 `//`（如 `/^https?:\/\//`）→ 誤入行註解
     吞同行；(b) regex 含引號（如 `.replace(/['"]/g,'')`）→ 誤開字串
     模式且**跨行吞噬直到下一個同種引號**（迴圈無 `\n` 終止，協調者
     實證）——無界靜默假陰性；(c) `stripThrowErrorCalls` 對字串內容裡
     的 `throw new Error(` 字面誤匹配＋參數含括號 regex 時 depth
     desync。現行 main.ts 僅兩個乾淨 regex（A1 grep 實證）故今日全綠
     為真；但守衛失效方向是「靜默失明」。另 escaped-quote 邊界無回歸
     案（haiku）。
   - Suggested fix: 字串模式遇 `\n` 強制結束（一行守衛，爆炸半徑跨檔
     →單行）；marker 匹配改字串感知；JSDoc 明文 regex 字面量限制；補
     回歸案 ×3（regex 含 `//`／字串內 marker／escaped quote）。

2. **[vote 3/5 — fable-A1＋sonnet＋fable-A5] 屬性巡檢背書過寬——
   「掛了標」≠「掛對且作用」＋template 內文結構性盲區**
   - Where: i18n-meta-scan.dom.test.ts:266-299
   - (a) `coveredByI18nAttr` 對 `"aria-label"`（缺冒號）、`"aria-label:"`
     （空 key）、key 錯字均判「已涵蓋」，但 `applyI18n` 執行期對同輸入
     warn 後跳過——掃描器替不作用的掛標背書；(b) `querySelectorAll('*')`
     結構上不進 `template.content`——template 內 CJK 屬性雙重靜默
     （巡檢掃不到＋未掛標則 clone 後也不翻）。A1／sonnet 逐一查證現行
     六個 template 與全部掛標處今日無實害。
   - Suggested fix: 省事全封（A5）——補一案 `applyI18n(doc,'en')` 後
     重掃四屬性斷言豁免區外零 CJK（畸形 spec＋錯 key 一舉封）；加
     `template.content` 子樹巡檢（零誤報面）；`coveredByI18nAttr` 要求
     冒號＋非空 key。

3. **[vote 5/5 — 全員多形提出] meta 守門「推導格」首跑於真 CI——
   reason regex／PWSH7 斷言未經真環境執行，誤紅時診斷性不足**
   - Where: fixtures.test.ts:461-477／pipeline.integration.test.ts:1110-1153／emit-bash.test.ts meta 區
   - 本機紅證只走到 `expect(ok).toBe(false)` 短路，`if(!ok)` 內 reason
     匹配分支零執行覆蓋（A1／opus）；推導格若與 runner 實況不符，紅的
     是 CI（sonnet：新 flake 源風險）；`GITHUB_ACTIONS` 本機誤設時訊息
     誤導向「拓撲變了」（A5）；reason 措辭耦合三份 detect 複本六個點
     （A1）。全員認同此風險**已由契約明訂遞延**（TASKS M2「push 後 CI
     雙 leg 綠＝終驗」）。
   - Suggested fix: 輕修診斷性——三檔訊息補「本機誤設 GITHUB_ACTIONS
     請先 unset」提示＋reason 字串全集註解；push 首跑盯緊、備妥放寬
     regex 預案；長期抽共用 reason 常數。

## 🟢 採納 nits（低票發現，協調者實證屬實）

4. [2/5 opus＋haiku；協調者實證 render-preview:246] **#preview-terminal
   「真違規」定性高估**——該屬性在本批前已由 render-preview 以同 key
   執行期翻譯；掛標實為冗餘但良性的第二寫入者（同 key 同值收斂，無
   可見 race）。→ WORKS 定性修正為「靜態文案重複＋掃描器對 JS 管理
   屬性的已知盲點；掛標＝belt-and-suspenders」；main.ts 或 render-preview
   補一句雙寫入者註解。
5. [1/5 opus 本職；實證] **T4.1 對帳字面漏列 BACKLOG.md**——「僅測試
   檔＋e2e 腳本」準則被簿記變更抵觸未言明。→ WORKS 補一句豁免說明。
6. [4 提及] **emit-ps1 culture flake 無 BACKLOG 落點**——WORKS 兩度
   記載但未入帳。→ BACKLOG 補一行（檔級 timeout 同構補強候選）。
7. [1/5 fable-A5；九行號 grep 驗證現準] **pipeline:1053 新註解硬編
   9 個 describe 行號**——sprint 12 才清完的同類腐化源。→ 符號化。
8. [1/5 fable-A1 本職] **e2e 正規化混寫縫隙**——區塊內後綴不一致的
   迴歸可雙過兩道檢查。→ 補一行「before 全 `_0`／after 全 `_1`」身分
   斷言。
9. [1/5 haiku] **e2e 指紋耦合 emit 格式**——`38;5;3`／`split("[/` 字面
   依賴。→ 註解記載意圖與穩定性前提。

## 🟢 Minority（未過門檻，保留供參）

- [2/5 sonnet＋haiku] 30s 檔級 timeout 無效能回歸訊號（5s→15s 劣化
  靜默）——soft warn（boot 耗時超基線倍數即 console.warn）候選；契約
  明訂二擇一之合法裁量，不強制。
- [2 提及 A1＋A2] detect 複本硬編個人路徑 `C:\Users\alan6\scoop\...`
  ——既有可攜性尾巴，BACKLOG 候選（改 PATH 探測）。
- [1/5 A5] CJK regex 不含 Ext-A/B／假名／諺文——檔頭已文件化之設計
  界限，備忘。
- [1/5 A5] 拓撲鎖使「未來讓 windows leg 跑 bash 案」第一步必然 CI 先
  紅——設計意圖（逼人工覆核），下次動 CI 拓撲的 TICKET 預記一筆。
- [1/5 haiku] PWSH7 ubuntu 不斷言的理由宜落註解（現僅 WORKS）。
- [1/5 sonnet] WORKS 宜明示 meta 紅證為「模擬非實測」——已由本報告
  🟡-3 記載，WORKS 可補一句。

## Untested paths

- meta 守門 reason 分支＋windows/ubuntu 拓撲鎖 — 首次執行＝push 後
  真 CI（契約內遞延）。— 全員
- template.content 內屬性＋JS setAttribute 動態屬性 — 巡檢結構性
  盲區（🟡-2）。— sonnet/A1
- 掃描器 vs regex 字面量源碼形 — 潛伏（🟡-1）。— A1/A5
- e2e 案 #8 僅色＋variant 覆寫組合；fgOverride/threshold 未組合。— 附帶

## ⚠️ Degraded mode

無降級、零重試——五票首輪全數回收。
