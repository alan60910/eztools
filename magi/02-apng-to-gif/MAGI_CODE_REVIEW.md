# 🧠 MAGI Code Review — DEV @ da3e775（sprint 02 全變更集）

**Diff scope:** 追蹤檔修改（deploy.yml/SPEC.md/TECHSTACK.md/package.json/src/tools.ts/src/tools.test.ts）＋ 新檔 `tools/apng-to-gif/**`、`scripts/verify-dist.mjs`（vs 空基線；排除 package-lock 與 magi/ 流程文件）
**Contract:** magi/02-apng-to-gif/PLAN.md（r2） • **Date:** 2026-07-03

## Dashboard

```
┌──────────────────────────────────────────────────────────────┐
│  VERDICT: APPROVE-WITH-NITS（4/5；CR2 投 REQUEST-CHANGES）    │
├──────────────────────────────────────────────────────────────┤
│  Mode: supermajority    Threshold: 3.34（即 ≥4/5 票）         │
│  OK weight: 5 / 5       Degraded: no                         │
├──────────────────────────────────────────────────────────────┤
│  ✅ CR1-架構  ✅ CR2-a11y  ✅ CR3-依賴  ✅ CR4-測試  ✅ CR5-契約│
│  CR1:AWN  CR2:RC  CR3:AWN  CR4:AWN  CR5:AWN                  │
├──────────────────────────────────────────────────────────────┤
│  🔴 Critical: 0    🟡 Important (adopted): 0                 │
│  🟢 Minority: 17（跨視角強訊號 ×3）  Drift: A×3 B×17 C×5     │
└──────────────────────────────────────────────────────────────┘
```

> 面板組成同前：5 個獨立 Claude reviewer、視角分工（無跨廠商驗證）；2 票跨視角
> 收斂為強訊號。多位 reviewer 實跑四道閘門與 node 實驗（CR1 實測越界損毀、CR3
> 逐行對照 gifenc 原始碼、CR4 對照 GIF89a 規格走 gif-reader、CR2 重算全部對比值）。

## Verdict

**APPROVE-WITH-NITS**（verdict 票 4/5）。核心管線正確性經多重實證：合成語意
六條契約逐字落實、無雙重合成（apng-js 輸出子矩形幀已核）、delay ms／loop 映射
／disposal=2 皆有 byte 級測試鎖住、gifenc.d.ts 與原始碼完全一致、`bytes()` 複製
語意使 worker 轉移安全、四道閘門（test 77/77／typecheck／build／verify:dist）
全員複跑全綠、Spec deltas 與宣告逐條吻合。無 Critical。集中的缺口有二類：
**a11y 三連缺**（焦點不可見的選擇器 bug、轉換前窗口無暫停/poster、aria-live
hidden 陷阱——正是本 sprint 立為樣板的契約面）與**測試鑑別力**（真值表 4/6、
fixture 欄位互換變異可存活）。均屬低成本可修，建議修復後 commit。

## 🔴 Critical (adopted)
（無）

## 🟡 Important (adopted)
（無議題達 ≥4/5——見下方強訊號）

## 🟢 Minority（未達 4 票；依票數分組）

### 跨視角收斂（2 票，強訊號）

- **[vote: 2/5 — CR2(I)+CR5(I)] 轉換前窗口：原始預覽無暫停控制、reduced-motion 不套 poster**（另列 DRIFT A-1）
  - Where: main.ts:102/111-117/173/378-394/410、index.html:111-119
  - 選檔即自動播放原始 APNG，但 poster 於轉換途中才產生、暫停鈕到 showResult 才
    顯示；reduced-motion 使用者因 posterObjectUrl 為 null 而 fallback 回動圖。
    WCAG 2.2.2（Level A）承諾在此窗口未落地。coordinator 已對照程式碼證實。
  - Fix: 選檔階段即抽 frame 0 產 poster＋暫停鈕即刻可見（或 reduced-motion 下
    預設不自動播放原始預覽）。
- **[vote: 2/5 — CR1(I，實測)+CR4(N)] composite 對越界幀矩形零防護，畸形 APNG 靜默損毀輸出**
  - Where: composite.ts:83-160
  - CR1 實測：2×2 幀置於 4×4 畫布 left=3，水平越界「換行」滲入下一列、垂直越界
    NaN→0，無錯誤無例外。合規檔不受影響，但輸入是任意上傳檔且 apng-js 不驗證
    fcTL 邊界。CR4 同時指出此邊界零測試。
  - Fix: rect 迴圈加畫布邊界短路，或 decode 階段驗證越界即丟可顯示錯誤；補測試。
- **[vote: 2/5 — CR1(N)+CR4(C)，皆核過 apng-js 原始碼] apng-js 上游把 delay ≤10ms 改寫為 100ms**
  - 極快幀到不了 convert 的 20ms floor（實際下限行為：≤10ms→100ms、10–20ms→20ms），
    PLAN／註解對「最小延遲」的描述與真實行為不符。
  - Fix: 於 convert.ts MIN_DELAY_MS 註解與 WORKS 補記上游行為；不需改碼。

### 單一視角 Important（1 票）

- **[CR2] file input 鍵盤焦點完全不可見（WCAG 2.4.7）**——`.file-drop__label:focus-within`
  永不觸發：input 是 label 的 **sibling** 不是後代。主要控制項 Tab 到時零視覺
  回饋。Fix: 改 `.file-drop:focus-within .file-drop__label`（一行）或 input 移入 label。
- **[CR2] error/warning 落入 aria-live hidden→unhide 已知陷阱**（另列 DRIFT A-3）——
  「先設 textContent 再移除 hidden」使 role=status 警示很可能不被 SR 播報（非動畫
  提示、大檔警示）。Fix: live region 常駐 a11y tree，或先 unhide 下一 frame 再填字。
- **[CR4] fixture 兩幀皆 disposeOp==blendOp，欄位互換變異可存活**——(0,0)/(1,1) 設計
  使 mapApngResult 或 generate.ts 把兩欄位寫反時全部測試照綠；這是唯一能被一行變異
  存活的自家碼路徑。Fix: 至少一幀 dispose≠blend（如幀 1 改 2/1）＋期望值同步。
- **[CR4] composite 真值表只交付 4/6 格**（另列 DRIFT A-2）——缺 BACKGROUND×OVER、
  PREVIOUS×OVER；OVER 從未在非零 left/top 測過。PLAN Verification 逐字要求真值表。
  Fix: 補兩格（沿用 3×3 gradient＋非零偏移）。

### 單一視角 Note（1 票）

**a11y（CR2）**
- 暫停鈕同時切換名稱與 aria-pressed → SR 播報矛盾（「播放…已按下」）；APG 建議二擇一。
- 預覽面板 generic div＋aria-labelledby 對多數 AT 無效，與他區 `<section>` 結構不一致。

**架構（CR1）**
- worker fallback 僅涵蓋**同步**建構失敗；非同步載入/執行期失敗走 showError 不回退，
  且損壞實例被快取沿用。PLAN 措辭「建構失敗」故屬契約邊緣；建議明確界定或首次執行
  失敗也 fall through。

**依賴/建置（CR3）**
- generate.ts（node 腳本）由瀏覽器 tsconfig 檢查，依賴「未設 types 欄位」的隱性
  @types/node 納入——日後加 types 陣列即爆。建議歸入 node config＋exclude fixtures。
- _probe 範本隨 build 輸出至正式站（sprint 01 既有，範本去留已在 BACKLOG）。

**測試（CR4）**
- 透明 index 端到端只驗 flag 未驗 GCE transparentColorIndex==動態 reservedIndex
  （恆傳 0 的 bug 抓不到）。
- fixture delayDen=1000 使 num==ms，驗不到 num/den→ms 換算（改一幀 15/100 即解）。
- main.ts 內嵌純邏輯（hexToRgb/進度節流/大檔估算）可 node 測而未抽離未測；WORKS
  「已知未測」清單未列（誠實但不完整）。
- 邊界零覆蓋：maxColors=2 端到端（保留槽最緊邊界）、全透明幀、1×1、decode 非零
  left/top 映射。
- `/* c8 ignore next */` 註解無實際效力（未接覆蓋率工具），無害殘留。

**契約（CR5）**
- 結果預覽暫停 poster（未量化）與播放中 GIF（已量化）非同一影像，半透明區可見落差
  ——WORKS 有記錄、契約允許，v1 可接受。

## Untested paths
- main.ts 全檔（DOM 膠水）＋ encode.worker.ts＋decode 瀏覽器段 — WORKS 已明記（T4.3 人工覆蓋）
- worker fallback 分支（同步/非同步兩型）— flagged by CR1、WORKS 已明記
- main.ts 內嵌純邏輯（hexToRgb/節流/大檔估算）— flagged by CR4（WORKS 未列，建議補記）
- composite 越界矩形、maxColors=2、全透明幀等邊界 — flagged by CR1/CR4

## 附註 — 審查期實證的正面事實
- gifenc.d.ts 全簽名與 node_modules 原始碼一致（CR3 逐行核）；`bytes()`=slice 複製
  使 transfer 安全；exact pin 三處一致；audit 0 漏洞
- apng-js 輸出子矩形幀（無雙重合成）、首幀 PREVIOUS 上游已降級（composite 再降屬
  防禦冗餘、單元測試仍需要）（CR1 核原始碼）
- gif-reader.ts 對照 GIF89a 規格逐 block 正確，且僅測試引用不進產品碼（CR4）
- 對比驗算檔頭註記全數重算吻合（CR2）；OVER 公式期望值獨立重算吻合（CR1/CR4）
- Spec deltas 宣告 vs 實際 diff 逐條吻合；CLAUDE.md/PRD.md 確認未動（CR5）
