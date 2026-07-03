# Works — 建立入口頁面與專案骨架

Sprint 實作歷程（append-only）。

## 2026-07-02 — M1 專案骨架與建置管線完成
**Tasks:** T1.1, T1.2, T1.3
**Verdict:** DONE
**Test result:** `npm test`（vitest run --passWithNoTests）exit 0；`npm run build` exit 0；coordinator 複跑兩者均 exit 0
**Files touched:** package.json, package-lock.json, .gitignore, tsconfig.json, tsconfig.node.json, vite.config.ts, index.html, src/style.css, src/vite-env.d.ts, tools/_probe/index.html, tools/_probe/main.ts
**Preview 驗證（base './' 巢狀路徑）:** `http://localhost:4173/`、`/tools/_probe/`、`/assets/_probe-*.js`、`/assets/_probe-*.css` 皆 HTTP 200，無 404
**Decisions made by developer:**
- 偏離 PLAN 建議版本：npm audit 對原版本組合標記 1 critical（Vitest UI 任意檔案讀取）+ 1 high（Vite Windows 路徑穿越），改用 vite@8.1.3、vitest@4.1.9、typescript@6.0.3、@types/node@26.1.0，audit 0 漏洞，所有驗證仍通過
- `test` script 加 `--passWithNoTests`（M1 尚無測試檔，讓管線先綠；T3.1 將加入真測試）
- 新增 `src/vite-env.d.ts`（tsc 檢查 CSS side-effect import 所需，任務未明列）
- Windows 背景啟動 preview 需經 cmd.exe 包裝（npm 為 .cmd shim）；關閉需以 `Get-NetTCPConnection` 找 node PID
**Out-of-scope observations to follow up:**
- （無）

## 2026-07-02 — M2 部署 workflow 完成（部署驗證待使用者手動前置）
**Tasks:** T2.1（T2.2 待使用者：Pages Source 設定＋確認合併 main）
**Verdict:** partial（T2.1 DONE, T2.2 pending user gate）
**Test result:** n/a（workflow 無法本機執行）；YAML 以 `npx js-yaml` 解析通過 exit 0；coordinator 人工複核內容符合官方 deploy-pages pattern
**Files touched:** .github/workflows/deploy.yml
**Decisions made by developer:**
- actions 釘版：checkout@v4、setup-node@v4（node 24、cache npm）、upload-pages-artifact@v3、deploy-pages@v4
- trigger：push main ＋ workflow_dispatch；concurrency group "pages"（cancel-in-progress: false）
**Out-of-scope observations to follow up:**
- 首次部署需 repo Settings → Pages → Source = GitHub Actions（一次性手動）

## 2026-07-02 — M3 入口頁面完成（靜態優先 + a11y + 測試）
**Tasks:** T3.1, T3.2, T3.3（T3.1/T3.2 平行 lane，T3.3 接續）
**Verdict:** DONE
**Test result:** vitest 5/5 通過；coordinator 複跑 test/build 皆 exit 0；dist/index.html 含「規劃中」×3
**Files touched:** src/tools.ts, src/render.ts, src/render.test.ts, src/style.css, index.html, vite.config.ts
**驗證重點：**
- 靜態優先：dist/index.html 全檔無 `<script`、無 `<a`（三工具皆規劃中），停用 JS 清單完整可見；transformIndexHtml 於 dev（5173）與 preview（4173）皆生效，CSS asset 200
- a11y：規劃中卡片無可聚焦元素；「規劃中」為可見文字標籤；style.css 對比全達 WCAG AA（主文字 ≈16.2:1、次文字 ≈7.6:1、badge ≈8.3:1）、:focus-visible 2px offset、prefers-reduced-motion、color-scheme: light
**Decisions made by developer:**
- render.ts 對 name/description 做 HTML escape（防未來資料破版）
- markup/class 契約（tool-list/tool-card/is-planned/tool-status 等）由兩 lane 共用並如實遵守
- 卡片邊框對比 ≈1.5:1 屬裝飾用（留白/網格已提供分隔），不受 WCAG 1.4.11 拘束，已在 CSS 註解說明
**Out-of-scope observations to follow up:**
- （無）

## 2026-07-02 — M4 文件同步完成（Spec deltas 落地）
**Tasks:** T4.1, T4.2（平行 lane）
**Verdict:** DONE
**Test result:** coordinator 複跑 vitest 5/5、tsc --noEmit exit 0、build exit 0（文件變更未影響程式）
**Files touched:** README.md, SPEC.md, CLAUDE.md, magi/TECHSTACK.md
**驗證重點：** coordinator 逐檔複核三份文件 — 內容與實際骨架一致（Vite 8.1.3/vitest 4.1.9/base './'、discoverToolEntries、inject-tool-list、兩步驟新增工具慣例、部署管線細節、DEV/main 分支策略、COOP/COEP 限制註記），PLAN 宣告的全部 Spec deltas 均已落地，原結構與未受影響內容保留
**Decisions made by developer:**
- SPEC Status 註明下一 sprint 候選為第一個工具（APNG → GIF），與 BACKLOG 順序一致
**Out-of-scope observations to follow up:**
- T2.2 部署驗證仍待使用者：Pages Source 一次性設定＋確認合併 DEV→main 後驗證站台

## 2026-07-02 — MAGI code review（5 視角面板）＋ M4 條目更正
**Tasks:** /magi:review-code 多方位審議
**Verdict:** APPROVE-WITH-NITS（R1/R2/R3/R5 AWN、R4 RC）；產出 MAGI_CODE_REVIEW.md 與 DRIFT.md（Status: DETECTED，A×2）
**更正（append-only，不改原條目）：** M4 條目宣稱「PLAN 宣告的全部 Spec deltas 均已落地」經 R5 指摘、coordinator 複核後確認**過度**——SPEC.md 缺 Architecture overview 的部署管線描述、Components 未列 tools.ts/render.ts、Public surface 缺路徑慣例與相對 base、Conventions 缺範本細節與 CSS 策略（內容部分整併於 TECHSTACK 或他段，無錯誤資訊，屬完整度落差）。
**採納議題（4/5 票）：** `--passWithNoTests` 殘留違反 PLAN 明訂值。
**強共識少數（3/5）：** CI 無 test/typecheck 閘門；slug/path/資料夾一致性無自動防護。

## 2026-07-02 — Post-review fixes（7 項，使用者核准後執行）
**Tasks:** review 修復批次（Dev A 程式碼 / Dev B SPEC.md 平行）
**Verdict:** DONE
**Test result:** vitest 3 檔 20/20 通過（`npm test` 已為純 `vitest run`）；`npm run typecheck` exit 0；build exit 0；dist 無佔位符殘留、「規劃中」×3；coordinator 複跑全數確認
**Files touched:** package.json, .github/workflows/deploy.yml, vite.config.ts, src/render.ts, src/style.css, src/inject.ts（新）, src/inject.test.ts（新）, src/tools.test.ts（新）, src/render.test.ts, SPEC.md
**修復內容：** 移除 --passWithNoTests；新增 typecheck script；CI build job 加 Typecheck+Test 閘門；注入邏輯抽為 src/inject.ts（缺佔位符即 throw、函式取代器避開 $ 序列）；input key 改 tool-<slug> 前綴防 tools/main/ 覆蓋；available 無對應資料夾即建置失敗（已實測 throw 與還原）；ul 加 role="list"；minmax(min(260px,100%),1fr)；SPEC 四段 delta 補齊＋Status 措辭修正
**Decisions made by developer:**
- 發現並修復整合 bug：transformIndexHtml 會套用到所有 HTML 入口，throw 行為以 ctx.filename 限定根 index.html（Windows 路徑正規化），否則任何工具頁都會弄破 build
- src/inject.test.ts 加 `/// <reference types="node" />`（tsconfig.json 無 types 欄位）
**Out-of-scope observations to follow up:**
- 可考慮讓 tsconfig.json 與 tsconfig.node.json 的 node types 設定一致（一行變更）
- 提交時務必包含 package-lock.json（npm ci / cache: npm 依賴）
