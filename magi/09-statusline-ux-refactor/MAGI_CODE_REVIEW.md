# 🧠 MAGI Code Review — DEV @ 523c0bb（working tree，sprint 09 全量）

**Diff scope:** working tree vs HEAD（27 檔 M＋3809/−593；新模組 5＋新測試 13＋golden 新檔 6）• **Date:** 2026-07-18

## Dashboard

```
┌────────────────────────────────────────────────────────────────┐
│  VERDICT: APPROVE-WITH-NITS                                    │
├────────────────────────────────────────────────────────────────┤
│  Mode: 角度制面板（8 互斥角度，使用者指定比照 review-plan）   │
│  Reviewers: 8/8 OK   Degraded: 否                              │
│  採納制: Critical/Important 協調者親自讀碼複驗                │
├────────────────────────────────────────────────────────────────┤
│  ✅R1 drift  ✅R2 backends  ✅R3 correct  ✅R4 tests           │
│  ✅R5 inject ✅R6 a11y      ✅R7 i18n     ✅R8 hygiene         │
│  票向: 2× APPROVE（R2,R5）＋ 6× APPROVE-WITH-NITS              │
├────────────────────────────────────────────────────────────────┤
│  🔴 Critical: 0    🟡 Important: 4（全數協調者 CONFIRMED）     │
│  🟢 Note: ~19（去重後）   Untested paths: 7                    │
└────────────────────────────────────────────────────────────────┘
```

**前提**：使用者指示真機驗收（T6.2-CHECKLIST）遞延下個 sprint——依 brief
不擋 verdict，記入 DRIFT C 類。驗證基線（協調者 T6.3 終驗）：npm test
1737/19skip exit 0、typecheck 0、build+verify:dist 0、e2e 7/7、golden
既有零 diff＋恰 6 新檔。

## Verdict

**APPROVE-WITH-NITS**——零 Critical；契約兌現度極高（R1 主責盤點 A 類
違反僅 1 項且為一行字典修）；三後端同構、注入面、C1/C2 修法正確性經
逐案推演與人工逸出驗證全數通過。4 項 Important 皆小而明確（三項一行級
＋一項測試網補洞），修畢即可 commit。

## 🔴 Critical（採納）

（無）

## 🟡 Important（採納，全數協調者親驗 CONFIRMED）

1. **[R6][deltas-A] en 情境「Cond.」破壞 WCAG 2.5.3 前綴子字串契約**
   - Where: messages.ts:790-791（`scenarioCondShort: 'Cond.'`／
     `scenarioCondFull: 'All conditional fields absent'`）
   - 複驗：'Cond.' 非 aria-label 全文子字串；index.html T4.1 契約註解
     明訂「縮短文字皆為 aria-label 全文前綴子字串」、SPEC:78 宣告 WCAG
     AA——en 語音輸入使用者無法以可見文字喚起控件。zh 四段皆合規、
     en 其餘三段（Full/Early/Windows）合規，僅此一組。**本 sprint 新增
     字典引入、歸 DRIFT A 類**。
   - Fix: 一行字典修（如 Full 改「Cond. — all conditional fields
     absent」或 Short 改「Conditional」使成前綴）；建議加
     `Full.includes(Short)` meta 案（R6-C，純字典層零真機依賴）。
2. **[R4] i18n-meta-scan 不掃 index.html 屬性值——硬編中文 aria-label／
   placeholder／title 整類可漏網**
   - Where: i18n-meta-scan.dom.test.ts:91-103（createTreeWalker
     SHOW_TEXT only）
   - 複驗：:92 確僅 SHOW_TEXT；現況無漏網（R7 逐屬性核對全掛
     data-i18n-attr），但與該檔「任一新硬編中文即紅」的自我宣稱牴觸，
     長期防回歸網有結構性盲區。
   - Fix: 補元素屬性巡檢（aria-label/placeholder/title/alt 含 CJK 且
     無 data-i18n-attr 即列 offender）。
3. **[R8] main.ts T5.5 遷移註解缺收尾 `*/`，吞掉 `ColorMode` docstring**
   - Where: main.ts:142-157
   - 複驗：:142 開的 `/**` 至 :156 才遇 `*/`——:153 的 `/**` 被併入，
     ColorMode 失去自身 docstring。純註解、無語意影響，一行修。
4. **[R8] 提交集污染風險＋.gitignore 缺口**
   - Where: 倉庫根 forailook/、magi/05-statusline-builder/ 整批遺留、
     magi/0{1..5}/.xreview-code-prompt.md ×5
   - 複驗：.gitignore 只擋 `**/.xreview-prompt.md`，`-code-` 變體未
     匹配；`git add -A` 會掃入三坨非本 sprint 工件。
   - Fix: 提交逐路徑鎖定（R8 報告附完整建議清單）＋.gitignore 放寬
     `**/.xreview-*.md`。

## 🟢 Note（去重彙整，不阻擋）

- **雙寫 helper ×2**（R1＋R3，vote 2）：`computeRowSeparatorsAfterMove`
  ⇄ planSegmentMove 索引算術、`normalizeRowSeparatorsField` ⇄ config
  清洗正規形——R3 逐案推演現況正確且有整合測試網；follow-up＝
  planSegmentMove 回傳形補欄位＋config export trim helper。
- **D4 殘餘可見性＋CSS order a11y 分歧**（R1＋R6-B）：390×844 列群組
  標題低於摺線 38–154px、視覺序≠Tab/SR 序——WORKS 已揭露、micro-fix-3
  候選，僅真機能驗。
- **messages「零漂移」測試轉恆真、docstring 誤導**（R4）：T5.3 反轉後
  自反身分；改述或刪除。
- **meta-scan main.ts strip 窄盲點**（R4）：字串內 `//`／同行 throw 多
  語句可吞 CJK。
- **跨後端 leg meta 守門缺**（R4）：windows leg 應斷言 `BASH.ok &&
  PS1.ok`，防跨後端案族全暗仍綠。
- **複製內容正確性零斷言**（R4）：jsdom 可 spy clipboard 補三鈕對應
  內容＋成功/失敗分支。
- **descriptor.label 凍結 footgun**（R7）：module-load 凍 zh，新程式
  直讀將靜默錯語言且掃描抓不到——JSDoc 加固。
- **emit-settings 三 hint 常數註解稱「UI 用」實無 UI 消費**（R7，diff
  外）；**segment-defaults 色名 default/auto 分支死碼**（R7）。
- **lockfile 漂移**（R8）：jsdom 環境修復的良性 churn——建議保留但與
  feature commit 分離／訊息明示。
- **失效行號引用 ×2**（R8）：segment-defaults.ts:45 指已刪的
  main.ts VARIANT_LABELS、main.ts:426「既有」語意過時。
- **rowSeparators 超界非 null 尾項可殘存**（R2-B＋R3-C）：三後端一致
  忽略、benign。
- **並行負載下真執行案偶發 flaky**（R1-C）：CI 加並行度需留意。
- **sprint-05 dotfile 報告引用落空**（R8-C）：main.ts:14-15／
  index.html:46 引用從未簽入的 `.t3X-report.md`。
- **README 未反映語言切換等新能力**（R8-C）：現述無矛盾、僅未更新，
  歸 /magi:commit deltas。

## Untested paths（R4 盤點）

1. 頂帶 ≤40dvh＋內部捲動（jsdom 無 layout；真機 T6.2）
2. <1100px CSS order 欄序＋殘餘摺線（純佈局，零自動化）
3. 原生 showModal／inert／原生 Esc 鏈（CI 只跑 fallback 分支；原生僅
   本機 e2e case 7）
4. 真 DnD × 非 inherit 覆寫值組合（e2e seed 皆 inherit）
5. 列級 custom 分隔符非法輸入的 UI 層拒收面
6. copyOutput 剪貼簿實際內容＋成功/失敗辨別
7. 下載 blob 內容（僅驗 scheme）

## 正面確認（審議坐實）

- 三後端 SEP 取值「啟用位」單一基準三處同源（R2 逐碼證）；golden 6
  新檔逸出人工驗正確；powerline 惰性「注入對比＋明列名單」雙守門；
  C2 由 pipeline oracle 自檢釘死；i18n 對腳本輸出零流入為結構性保證。
- C1 原子路徑逐案推演正確（drain 閘同步、insert-then-remove 序、
  real-index 補償）；T5.6 rebuild 修法單一咽喉點覆蓋全路徑（R3）。
- 注入面零 Critical/Important：新通道與既有共用逸出咽喉、存檔清洗
  防禦齊備（含原型污染形）、applyI18n 無 innerHTML（R5 手審證同）。
- a11y 不變量整體扎實：三 live region 常駐、dialog 單一焦點出口、
  五步序 aria 全翻轉、落列播報視覺顯示編號（R6）。
- i18n 無使用者可見漏網、依賴方向乾淨、en 品質過關（R7 逐項歸類）。
- timeout 修法不遮蔽真 hang（spawnSync 同步阻塞本就不可中斷）、檔級
  設定不外溢（R4 複驗）。
- 使用者三項拍板（覆寫跟列走／產出鈕頂帶右端／切換後語言播報）如實
  落實；殘留碼機掃零；package.json／.github/ 零變動（R1／R8）。
