# Drift — Statusline Builder UX 第二輪真機回饋批
> Source: MAGI_CODE_REVIEW.md（7 角度初審＋3 角度復核）  •  Generated: 2026-07-21（修復批後現況）  •  Status: DETECTED

## A. Contract violations
(none)——初審三項 A（行動版右欄解除層疊失效／SPEC:63 中欄矛盾／e2e 選配阻斷）已由修復批全數消解，復核 3/3 確認；PLAN §D2 機制句同步修訂（層疊規約化）。

## B. Below-the-contract decisions
- [ ] keydown 模態判定採「全非修飾鍵＝keyboard」寬鬆定義，超出 PLAN §D1-B′「導航鍵」字面——mousedown/pointerdown capture 先行鎖 mouse，不破「滑鼠不浮現」核心保證（JSDoc 成文，角度 #2 追跡驗證）
- [ ] per-locale 樣例快取採「新 locale 落新鍵」而非 PLAN §D2′「切換時失效重算」字面（各 locale 樣例恆定、等效且更省算）
- [ ] catalog-sample-values dom 案採「同 epoch 白箱播種」手法（PLAN「擇一」授權內；reset hook 並存供 sample-values.test.ts 直接單元用）
- [ ] 行動版中欄 `.preview-section` 維持 sticky（PLAN 僅明訂右欄，中欄沉默；註解自陳）——真機驗收目視項（小視窗 sticky 佔位可接受度）
- [ ] 教學帶靜態出貨態＝`hidden`、init 依謂詞移除（🟡-5 修法定案）——未 dismiss 使用者帶在 JS 後出現屬方向性取捨；無 JS 環境恆隱藏
- [ ] 樣例值含段預設 prefix（實出「模型 model: Fable 5」形）——PLAN 機制句與 Goals 例示句內部不一致，實作取機制句＋S2 dump 定案；建議例示句補注「樣例＝段完整預設輸出（含前綴）」
- [ ] 三欄軌寬比 `1fr:1.3fr:1.3fr`（契約未定比例，裁量理由已註解）
- [ ] e2e `clickBySelector`（真 CDP 滑鼠序）＋`modeRadioClickPointExpr`（豁免 scrollIntoView）harness 級裁量（實測理由文件化：`.click()` 不觸發原生 focus／`block:'center'` 汙染待測訊號）

## C. Out-of-scope observations
- [ ] 模態旗標跨測試案殘留（🟡-8 guard 副作用）＋ wiring 註解作用域誤述——move-reveal 新案斷言前須顯式派發模態事件；註解宜改述「模組層綁定、讀寫點全封閉」（復核三員共見）
- [ ] `mediaBlockRange` 括號計數不防註解內孤立大括號——與 🔴-1 同型「無聲失真」隱患；修訂該 media 區塊註解時避免內嵌孤立 `{`/`}`，或升級為註解感知掃描
- [ ] `style.css` 行動版新註解「不落入任何規則」過度陳述（min-width:0 共用規則仍命中）——一句措辭修正
- [ ] `shrinkRowGroupContainers` 防禦性 fallback 入池分支未同步 strip `.row--reveal`（理論不可達）——補一行或註記理由
- [ ] e2e Node 版本 gate 對 23.0–23.5 放行（type stripping 23.6 起預設；23.x 已 EOL，實害趨零）——條件補一段或訊息註明
- [ ] `wireMoveRevealModality` 抽獨立模組下沉（main.ts 3,600+ 行續肥、同 sprint 抽模組判準不一致）——連動可收斂模態旗標測試隔離
- [ ] `getSampleValues` 快取命中忽略 `resolveFn` 介面氣味——候選收法＝resolveFn 移入 test-only 注入口
- [ ] `handleLocaleSwitch` 尾端補 `syncColumnTop()`（近零成本消切語後 `--column-top` 陳舊）——**sprint 15 作廢**（`--column-top`／`syncColumnTop()` 體制已整組刪除，PLAN §D6，2026-08-16）
- [ ] 樣例值常駐斷言補強：零控制碼（升級 S2 一次性結論）＋全空白（`text.trim()`）兩條
- [ ] move-reveal 跨列 focus 轉移 dom 案（focusout relatedTarget 分支唯一未直接證明路徑）
- [ ] 觸控 move 鈕不可達——第三輪真機必驗高優先；「行動斷點恆顯」media 後備已列 PLAN 備忘
- [ ] 教學帶 `infinite` 動畫省電微調（有限次數／首次互動即停）候選
- [ ] e2e `seedTutorial`／`dismissTutorial` 命名統一＋`#list-column.scrollTop` 後備分支加除錯輸出防死碼
- [ ] 「style.css 原始文字比對」測試形系統性教訓：基準／覆寫成對規則一律附源序／歸屬斷言（本批 🔴-1 首次實際踩雷；PLAN §D2 已規約化）
- [ ] dist 建置頁 1400px viewport 下 `max-width:1360px` media 覆寫疑未生效——疑似**既有**問題（非本批引入），待 DevTools 對帳
- [ ] `↺`(U+21BA) 跨字型字寬未驗；windows-cjk 長路徑 compact 列僅 CSS ellipsis 防線——真機目視項
- [ ] flaky 5000ms timeout 殘餘二案（catalog-sample-values T3.4 案／layout-columns T2.2 案，負載敏感）——候選同構解＝檔級 `vi.setConfig({ testTimeout: 30_000 })`
- [ ] `sweepOrphanBrowser` 僅掃 msedge.exe——日後 EDGE_CANDIDATES 擴及 chrome 時掃尾會漏（既有碼備忘）
