# Drift — APNG → GIF 轉換工具
> Source: MAGI 5-reviewer panel（supermajority, ok_weight 5, threshold ≥4/5）  •  Generated: 2026-07-03  •  Status: DETECTED

## A. Contract violations
- [x] ✅已修復（2026-07-03 post-review fix：選檔階段即產 frame 0 poster＋暫停鈕即刻可見、reduced-motion 首次渲染即用 poster）轉換前窗口：原始 APNG 預覽無暫停控制、`prefers-reduced-motion` 不顯示 poster — files: `tools/apng-to-gif/main.ts`, `tools/apng-to-gif/index.html`
  [vote 2/5 — CR2(a11y)+CR5(契約)；coordinator 對照 main.ts:102/173/394/410 證實] 契約（PLAN r2 UI 層）明訂「一般模式亦提供暫停控制（WCAG 2.2.2）」「reduced-motion 時預設顯示第一幀靜態 poster」；實作把 poster 產生與暫停鈕顯示都綁在轉換流程之後，選檔～轉換完成間動圖恆自動播放。
  Proposed PLAN/SPEC update: SPEC Conventions a11y 不變量補「暫停控制與 poster 須在媒體開始播放當下即可用，不得延後至後續流程階段」。
- [x] ✅已修復（2026-07-03 post-review fix：補滿 6 格、兩新格皆非零偏移）composite 真值表未窮舉 dispose×blend（4/6 格，缺 BACKGROUND×OVER、PREVIOUS×OVER） — files: `tools/apng-to-gif/composite.test.ts`
  [vote 1/5 — CR4；coordinator 對照測試名清單證實，低於門檻但事實明確故保留] PLAN Verification 逐字要求「dispose（NONE/BACKGROUND/PREVIOUS）× blend（SOURCE/OVER）真值表」。
  Proposed PLAN/SPEC update: 補滿 6 格；或於 PLAN 註明「blend/dispose 正交、以 4 格代表」以對齊實作。
- [x] ✅已修復（2026-07-03 post-review fix：live region 常駐 DOM、改 is-empty class 收空間）錯誤／警示 live region 採「hidden 時設文字→unhide」模式，「錯誤警示可被 AT 感知」不變量不可靠 — files: `tools/apng-to-gif/main.ts`, `tools/apng-to-gif/index.html`
  [vote 1/5 — CR2；coordinator 對照 main.ts:273-275/324-331 證實模式存在；此為 PLAN 點名之已知陷阱] role=status 的非動畫提示與大檔警示很可能不被 SR 播報。
  Proposed PLAN/SPEC update: a11y 不變量補「live region 常駐 a11y tree（不得以 display:none 切換承載播報）」。

## B. Below-the-contract decisions
- [ ] GIF 輸出 GCE disposal 全幀強制 2（防透明洞 ghosting）[CR1+CR5；WORKS 有記錄、有 byte 測試] — 背書。
- [ ] 選項正規化採 clamp 不 reject（threshold/matte/maxColors/delay 一律收斂）[CR1+CR5；WORKS 有記錄] — 背書。
- [ ] composite 回傳 `{displayed, next}` 而非 PLAN 草圖的單一 canvasState [CR5；WORKS 有記錄] — 對過簡簽名的正確化。
- [ ] `convertToGif` 增選用 `onFrameEncoded` callback [CR5；WORKS 有記錄] — 進度轉發所需、維持純函式。
- [ ] 型別落點：RGBAFrame 定義於 composite.ts、DecodedAnimation 僅存 convert.ts [CR5；WORKS 有記錄] — 共享達成。
- [ ] `gif-reader.ts` 獨立模組（超出 PLAN 檔案清單）[CR5；TASKS T1.3 授權、僅測試引用] — 背書。
- [ ] `scripts/verify-dist.mjs`＋`verify:dist` script＋deploy.yml Verify dist step [CR5；TASKS T4.1 授權；WORKS 有記錄] — 背書。
- [ ] 轉換以按鈕閘控（選檔僅驗證＋預覽）[CR5；WORKS 有記錄] — 讓選項可先調。
- [ ] 單一全域暫停鈕、置於結果面板 [CR2+CR5；WORKS 有記錄]（其「轉換後才顯示」的後果已升 A-1）。
- [ ] poster 取自家合成 frame 0（非 GIF byte-exact；暫停時與播放影像有可見落差）[CR1+CR2+CR5；WORKS 有記錄] — v1 接受。
- [x] ✅已修復（2026-07-03 post-review fix：四個 rect 迴圈加 isWithinCanvas 短路＋3 個邊界測試）composite 對越界幀矩形不 clamp／不驗證 [CR1 實測會靜默損毀畸形輸入＋CR4 邊界零測試] — 已升為明示決策：越界像素靜默裁切。
- [ ] main.ts 內嵌 hexToRgb／進度節流／大檔估算等純邏輯未抽離、零自動化覆蓋；WORKS「已知未測」未列此項 [CR4] — 建議補記或抽離。
- [x] ✅已修復（2026-07-03 post-review fix：幀 1 改 PREVIOUS(2)/OVER(1)、幀 0 改 delayNum=15/delayDen=100）fixture 設計：兩幀 dispose==blend、delayDen=1000（num==ms）——鑑別力不足 [CR4]。
- [ ] worker 與主執行緒 fallback 使 convert+gifenc 雙打包（各 ~11kB）[CR3] — module graph 必然結果、原始碼單一來源仍成立。
- [ ] generate.ts 由瀏覽器 tsconfig 檢查、依賴隱性 @types/node 納入 [CR3] — 建議歸入 node config。
- [ ] worker fallback 僅涵蓋同步建構失敗；執行期失敗不回退、損壞實例被快取 [CR1] — PLAN 措辭邊緣，建議明確界定。
- [ ] 透明 index 端到端僅驗 flag 未驗動態 transparentColorIndex [CR4] — 建議補一行斷言。

## C. Out-of-scope observations
- [ ] apng-js 上游將 delay ≤10ms 改寫為 100ms（lib/index.js:147-149，CR1+CR4 皆核）——「最小延遲」實際行為與文件描述不符，建議註解＋WORKS 補記
- [ ] 首幀 PREVIOUS→BACKGROUND 降級為上游已做的防禦性冗餘（無害；可註明）[CR1]
- [ ] 「轉換完成」status 播報與 result 區 focus 移轉存在播報順序競態 [CR2]
- [ ] `_probe` 隨 build 輸出至正式站（sprint 01 既有；範本去留已在 BACKLOG）[CR3]
- [ ] `/* c8 ignore next */` 註解無實際效力（專案未接覆蓋率工具）[CR4]
