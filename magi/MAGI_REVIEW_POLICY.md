# MAGI Review Policy — eztools 專案覆寫

> 本檔為專案級政策，覆寫 magi-workflow 外掛 `/magi:review-plan`／
> `/magi:review-code` 的預設審議行為。協調者於每次 review 起跑前必讀
> 本檔並照此執行。Established: 2026-07-18（使用者指示）。

## 1. 核心原則

- **角度制，不是模組制**：審查員不按檔案／模組切分視野，而是每人領
  一個「審議角度」對**整個 diff** 深挖。每個角度＝1 票。
- **票數隨實際改動規模浮動**：3 票（小改動）／5 票（稍大改動）／
  7 票（巨大改動）。

## 2. 票數決定

### /magi:review-code（以實際 diff 為尺）

以審議範圍的 `git diff --stat` 總變動行數（insertions＋deletions）為主尺：

| 規模 | 總變動行數 | 票數 |
|------|-----------|------|
| 小改動 | ≤ 200 | 3 |
| 稍大改動 | 201 – 800 | 5 |
| 巨大改動 | > 800 | 7 |

補充規則：

- 產生檔（`tools/statusline-builder/__golden__/`、lockfile、`dist/`）
  行數**不計入**主尺，但仍屬審議範圍（回歸角度必查其 diff 可解釋性）。
- 協調者可依實質複雜度上調／下調一級（例：150 行但動到架構契約或
  跨後端不變量 → 升 5 票），**必須**在報告 Dashboard 揭露改判與理由。
- 使用者於指令引數明示票數或角度時，以使用者為準。

### /magi:review-plan（尚無 diff，以宣告規模為尺）

trivial／minor → 3 票；major → 5 票；跨模組／架構級（動 root SPEC.md
架構段、新增工具或新增建置面）→ 7 票。角度名冊同 §3，語境換成計畫層
（正確性→設計健全性；測試→驗證計畫完備性；回歸→對既有工具的影響）。

## 3. 角度名冊（依序取前 N 個）

| # | 角度 | 深挖責任區 |
|---|------|-----------|
| 1 | 正確性與邏輯 | 邊界條件、狀態機、錯誤路徑、off-by-one、資料形變 |
| 2 | 契約與規格一致性 | PLAN/SPEC/TICKET/HOTFIX 對照、drift A/B/C 分類、宣稱與證據誠信 |
| 3 | 測試與驗證強度 | 覆蓋缺口、假陽性、斷言強度、驗證證據是否真實測過 |
| 4 | 回歸與相容性 | 跨平台（win32/linux）、跨版本（jq/node/瀏覽器）、黃金檔與 oracle 影響 |
| 5 | 安全與輸入邊界 | 注入、路徑處理、env 變數、stderr/資源外漏、CSP/靜態託管限制 |
| 6 | 效能與資源 | 演算法複雜度、I/O、記憶體、bundle 大小、瀏覽器端負載 |
| 7 | 可維護性與架構 | 重複、耦合、命名、複本漂移（如 detect*Exec 三複本）、擴充成本 |

- 3 票＝角度 1–3；5 票＝角度 1–5；7 票＝全部 7 個。
- 每位審查員**都審整個 diff**（drift 分類是全員義務）；角度是「深挖
  責任區」不是「視野限制」——角度外的發現照常提出、照常計票。

## 4. 模型指派

- 名冊輪替：以本機可用審查員循環指派。無 gemini/codex 的機器上名冊為
  `claude:claude-fable-5 → claude:opus → claude:sonnet → claude:haiku`
  （角度 i → roster[(i−1) mod 4]）。
- 同模型領多角度時，靠角度 charter 的提示詞差異維持獨立性；報告中
  照例揭露「同 vendor 湊票、無跨 vendor 驗證」。

## 5. 執行機制（協調者操作規約）

orchestrator 單次執行只吃**單一 prompt 檔**，且輸出檔名以 `cli-model`
命名（同模型重複必互撞），故角度制採「**一角度一執行**」：

1. 共用上下文寫一份 base（diff stat＋diff、檔案清單、sprint 契約、
   專案慣例）。
2. 每角度產一份 prompt：base＋該角度 charter（§3 深挖責任區展開）＋
   標準輸出協定（Issue 格式／Verdict／Drift 分類，沿用 skill 定義）。
3. 每角度各開一個 orchestrator 執行：獨立 `MAGI_REVIEW_WORKDIR`、單一
   reviewer 引數，全部併行（background）跑。
4. 協調者跨 workdir 收齊 `*.final.txt`，語意去重＋合併計票（沿用
   `references/MAGI_VOTING.md` 步驟 1–8；ok_weight＝實際成功角度數）。

## 6. 計票調整（角度制特例）

- 門檻照舊：majority＝vote_sum > ok_weight × 0.5。
- **專家單票條款**：未過門檻、但屬提出者「本職角度」責任區的發現，
  協調者必須親自實證（grep／最小重現／親跑測試）後裁決——屬實 → 以
  「協調者實證」加註採納（sprint 11 🟡-2 先例）；不實 → 留 minority
  並記不採理由。不得只因票數不足就靜默丟棄本職角度發現。
- 暫時性失敗沿用單次重試政策；重試後仍缺票 → 降級揭露，ok_weight 隨
  實際成功數縮減；缺的若是角度 1–3（核心三角），必須明示該角度未被
  覆蓋。
- 報告 Dashboard 增列：規模判定（行數→票數）、角度×模型指派表。
