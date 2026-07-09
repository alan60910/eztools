# statusline-builder 預覽字型（Nerd Font subset）

`symbols-nerd-font-mono-subset.woff2` — 僅供本工具**終端模擬預覽**渲染
powerline 箭頭與 segment icon；不隨產出腳本散布（使用者終端需自行安裝
Nerd Font，UI 常駐提示）。

## 來源與版本（provenance）

| 項目 | 值 |
|---|---|
| 來源字型 | Symbols Nerd Font Mono（`SymbolsNerdFontMono-Regular.ttf`） |
| 來源專案 | [ryanoasis/nerd-fonts](https://github.com/ryanoasis/nerd-fonts) **v3.4.0**（release 資產，版本釘死） |
| 下載 URL | <https://github.com/ryanoasis/nerd-fonts/releases/download/v3.4.0/NerdFontsSymbolsOnly.zip> |
| zip sha256 | `8e617904b980fe3648a4b116808788fe50c99d2d495376cb7c0badbd8a564c47` |
| TTF sha256 | `f0f624d9b474bea1662cf7e862d44aebe1ae1f6c7f9cb7a0ca5d0e5ac9561c60` |
| subset 工具 | `subset-font@2.5.0`（harfbuzz subset）＋`fontkit@2.0.4`（讀回驗證），devDependencies |
| 產出 woff2 | 28 glyph、**3,556 bytes**（上限 100 KB）、sha256 `30ff25398f016886a1c8834036b859c6a9ea2e9dd773f629142224836372d50e` |
| 授權 | 見 [LICENSE-nerd-fonts.md](LICENSE-nerd-fonts.md)（OFL 1.1 散布＋逐來源 MIT 署名） |

## 再生指令

```bash
node scripts/subset-statusline-font.mjs
# 或已自行取得來源 TTF 時：
node scripts/subset-statusline-font.mjs --source <path>/SymbolsNerdFontMono-Regular.ttf
```

腳本會下載釘死版本 zip（快取於 `node_modules/.cache/statusline-font/`）、
驗 zip 與 TTF sha256、subset 至凍結碼位表、以 fontkit 讀回逐碼位機械
斷言後才寫檔；任一步失敗即非零退出。zip 解壓依賴 bsdtar（Windows 10+／
macOS 內建 `tar`；GNU tar 不支援 zip，Linux 請解壓後走 `--source`）。
**手動開發工序，禁在 CI 執行**（CI 不得自癒資產）。

腳本內 `FROZEN_GLYPHS` 為凍結碼位表的機械單一事實來源；下表為其鏡像，
兩者須同步修改。

## 凍結碼位表（28）

來源字型皆為 Nerd Fonts v3.4.0 聚合體內之對應 glyph 集（碼位未重定位
之 Powerline；Octicons 由原始 `f000` 區重定位至 `f400` 區——採聚合體
碼位，因產出腳本 emit 的 PUA 碼位須與使用者終端的 Nerd Font 一致）。

### Powerline Symbols ×5（必要載重；來源 powerline/powerline，MIT）

| 碼位 | NF 名稱 | 用途 |
|---|---|---|
| U+E0A0 | pl-branch | git-branch segment icon |
| U+E0B0 | pl-left_hard_divider | powerline 箭頭（段間／收尾） |
| U+E0B1 | pl-left_soft_divider | powerline 細分隔 |
| U+E0B2 | pl-right_hard_divider | powerline 反向箭頭 |
| U+E0B3 | pl-right_soft_divider | powerline 反向細分隔 |

### Octicons ×23（segment icon；來源 primer/octicons，MIT）

| 碼位 | NF 名稱 | segment |
|---|---|---|
| U+F4BC | oct-cpu | model |
| U+F413 | oct-file_directory | cwd |
| U+F502 | oct-project | project-dir |
| U+F48F | oct-paintbrush | output-style |
| U+F412 | oct-tag | version |
| U+F439 | oct-credit_card | cost |
| U+F520 | oct-stopwatch | duration |
| U+F440 | oct-diff | lines-changed |
| U+F472 | oct-database | context-size |
| U+F400 | oct-light_bulb | thinking |
| U+F463 | oct-meter | context-used／context-remaining（共用） |
| U+F4E3 | oct-hourglass | rate-5h |
| U+F455 | oct-calendar | rate-7d |
| U+F461 | oct-bookmark | session-name |
| U+F490 | oct-flame | effort |
| U+F448 | oct-pencil | vim-mode |
| U+F477 | oct-hubot | agent-name |
| U+F407 | oct-git_pull_request | pr |
| U+F401 | oct-repo | repo |
| U+F414 | oct-file_submodule | git-worktree |
| U+F418 | oct-git_branch | worktree-branch |
| U+F43A | oct-clock | clock |
| U+F444 | oct-dot_fill | git-dirty |

## 授權驅動選取記錄（SP-1，F14）

只採 MIT／OFL-clean 來源；逐候選裁定如下（剔除者換源或縮編）：

| 來源集 | 授權 | 裁定 |
|---|---|---|
| Powerline Symbols | MIT（powerline/powerline，Kim Silkebækken） | **採**（必要載重全數在此） |
| Octicons | MIT（primer/octicons，GitHub Inc.；nerd-fonts `src/glyphs/octicons/LICENSE` 實查） | **採**（23 icon 全覆蓋；避開 GitHub 商標 glyph——mark-github／logo-github 未入選） |
| Devicons | MIT，但 `dev-vim`（U+E7C5）為 Vim 品牌 logo | **剔**（品牌）；vim-mode 換 oct-pencil |
| Octicons `oct-zap` | MIT，但碼位 U+26A1 非 PUA（終端 emoji 字型優先，渲染不可控） | **剔**；effort 換 oct-flame（U+F490） |
| Codicons | CC-BY-4.0（需署名） | **剔**（任務明定），未使用 |
| Font Awesome（Free） | icon 設計 CC-BY-4.0＋字型檔 OFL 混合授權 | **剔**（授權歸屬有歧義），未使用 |
| Material Design Icons | Apache-2.0 | **不採**（非 MIT/OFL 白名單，且無必要） |
| Pomicons | 限制性再散布條款 | **剔**（任務明定），未使用 |
| Font Logos | 含商標品牌 logo | **剔**（品牌），未使用 |
| Weather Icons | OFL 1.1（可用） | **不採**（oct-clock 已覆蓋 clock，免引入第三來源） |

縮編結果：**無 segment 需退純文字**——25 segment icon 需求全數由
MIT 來源覆蓋。

**RFN 查核**：nerd-fonts repo LICENSE 之 OFL 宣告為
「Copyright (c) 2014, Ryan L McIntyre」，**未宣告 Reserved Font Name**
→ subset 無改名義務，內部 name table 保留原名；檔名以 `-subset` 標示
非官方完整版。

## 驗證方式

再生腳本內建**機械存在驗證**：fontkit 讀回 woff2，逐凍結碼位斷言
glyph 存在且非 `.notdef`（28/28 OK），並斷言大小 <100KB。此為
**機械存在驗證、代替視覺 smoke**——瀏覽器實渲染核可歸 T4.4 使用者
總 gate（SP-3）。dist 落點之 verify-dist 斷言由 T4.2 於 build 實測後
補上。
