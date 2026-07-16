# S2 spike 報告：now 注入形兩半（jq／ps1）

任務：T2.2（見 `../TASKS.md` Milestone 2）
日期：2026-07-12
執行者：magi-developer

> 腳本皆位於本目錄，可重跑：
> `bash magi/08-statusline-catalog-expansion/sp2/run-all.sh`
> （需 jq exe：`magi/05-statusline-builder/sp5/tools/jq-windows-amd64.exe`；
> `powershell.exe`／`pwsh` 需在 PATH 上）。完整原始輸出已存
> `run-all.out.txt`，本報告引用的每格數字皆可在該檔逐行核對。

---

## 0. 產物清單

| 檔案 | 用途 |
|---|---|
| `probe.jq` | jq 半邊釘死 idiom（`jq -n -f probe.jq` 可直接執行） |
| `probe.ps1` | ps1 半邊釘死 idiom（輸出 branch／n／oracle_now／diff 供斷言） |
| `trap-check.ps1` | `[long]$null` / `[long]''` / `[long]'abc'` 三種轉型陷阱驗證 |
| `tryparse-check.ps1` | `[long]::TryParse` 對 null／空字串／非數字／合法值／前導空白的行為驗證 |
| `run-all.sh` | 一鍵重跑上述全部案例＋零 shell `date` 檢核，輸出到 stdout |
| `run-all.out.txt` | `run-all.sh` 本次實跑的完整原始輸出（本報告引用數字的唯一事實來源） |

---

## 1. jq 半邊

### 1.1 陷阱驗證：PLAN 原始 naive 式在非數字路徑會 hard error（已證實需要防呆）

PLAN／TASKS 給的原始式：

```
((env.STATUSLINE_NOW_EPOCH // (now|floor))|tonumber)
```

三路實測（`run-all.out.txt` L6–16）：

| 路 | 環境變數 | 輸出 | exit code |
|---|---|---|---|
| (a) 未設 | （unset） | `1783862019`（＝當下 epoch） | 0 |
| (b) 合法 | `1783497600` | `1783497600`（原值） | 0 |
| (c) 非數字 | `abc` | `jq: error (at <unknown>): string ("abc") cannot be parsed as a number` | **5** |

**結論：naive 式不夠用。** `tonumber` 對非數字字串是 jq 的 hard error（非
`null`／`false` 這類可被 `//` 攔截的「falsy 值」），會讓整支 emitter 產出
腳本在執行期直接中止（jq 非零 exit、無輸出）——這正是 PLAN 措辭「非數字
不中止」的反例，必須加防呆層。

### 1.2 安全 idiom 推導與釘死

推導過程：把會出錯的 `tonumber` 步驟移進「只作用在已存活字串」的子管線，
並用 `?`（suppress-to-empty，把錯誤轉成「零個輸出值」而非拋出）包住，讓
`//` 的「左側零輸出值 → 換右側」語意接手：

```
(env.STATUSLINE_NOW_EPOCH // empty | tonumber?) // (now|floor)
```

逐段語意：
- `env.STATUSLINE_NOW_EPOCH // empty`：環境變數未設時 jq 讀到 `null`（falsy）
  → 換成 `empty`（零輸出值，非「輸出一個 null」）；已設（含空字串，字串在
  jq 只有 `""` 這種空字串仍是 truthy 值，只有 `null`／`false` 才是 falsy）
  則保留原字串。
- `| tonumber?`：只有在左側管線有值時才會執行；非數字字串觸發的錯誤被 `?`
  吞掉、輸出零個值（等價 `empty`）；數字字串正常轉型。
- 外層 `// (now|floor)`：只要左側整條管線最終輸出零個值（未設 or 非數字
  兩種情況皆是），就換成 `now|floor` 的即時 epoch。

此 idiom 已寫入 `probe.jq`（可用 `jq -n -f probe.jq` 直接執行，等價於用
`-n "<idiom>"` inline 執行——兩種呼叫形態本次皆有驗證，見附錄）。

### 1.3 三路結果矩陣（含 bonus 空字串邊界）

`probe.jq`／安全 idiom 實測（`run-all.out.txt` L18–31）：

| 路 | `STATUSLINE_NOW_EPOCH` | 輸出 | exit | 判定 |
|---|---|---|---|---|
| (a) 未設 | （unset） | `1783862019` | 0 | 與當下 epoch 一致（回落真時鐘）✅ |
| (b) 合法 | `1783497600` | `1783497600` | 0 | 原值輸出 ✅ |
| (c) 非數字 | `abc` | `1783862019` | 0 | 靜默回落真時鐘、**不中止** ✅ |
| (d) bonus：顯式空字串 | `""` | `1783862019` | 0 | 與未設同一路徑（`""` 雖 truthy，但 `tonumber?` 吞錯回落）✅ |

四路 exit code 全為 0，與 naive 式的 (c) exit 5 形成對照，證實防呆生效。

### 1.4 零 shell `date` 檢核

`run-all.sh` 對 `probe.jq`／`probe.ps1` 的**執行碼行**（排除註解行）做
`date` 詞界比對，結果：`no shell 'date' invocation found`（`run-all.out.txt`
L95–96）。`probe.jq` 全篇時間來源僅 jq 內建 `now`（gettimeofday，非外部
行程），符合「全 jq、零 shell `date`」契約。（`run-all.sh` 本身在驅動腳本
的「oracle 對照」用途裡呼叫過 bash `date +%s`，但那是**測試驅動腳本**，
不是被驗證的產出腳本本體，兩者不可混為一談——已在腳本註解與本節分開
標註。）

---

## 2. ps1 半邊

### 2.1 陷阱驗證：`[long]$null` / `[long]''` / `[long]'abc'`

`trap-check.ps1` 實測（`run-all.out.txt` L33–51）：

| 轉型 | PS 5.1 | pwsh 7 |
|---|---|---|
| `[long]$null` | `OK value=0`（不擲例外） | `OK value=0`（不擲例外） |
| `[long]''` | **`OK value=0`（不擲例外）** | **`OK value=0`（不擲例外）** |
| `[long]'abc'` | `THREW: RuntimeException`（訊息因主控台 Big5 代碼頁顯示亂碼，內容同 pwsh7 版本） | `THREW: RuntimeException: Cannot convert value "abc" to type "System.Int64". Error: "The input string 'abc' was not in a correct format."` |

**與 TASKS 描述不符的實測發現（需在此明確記錄）**：TASKS 原文預期
`[long]''`「擲例外」，**實測並非如此**——`[long]''` 在 PS 5.1 與 pwsh 7
皆**靜默回傳 `0`、不擲例外**，行為與 `[long]$null` 完全相同（"" 被隱式
轉型規則視同 0，只有 `[long]::Parse('')` 這種顯式靜態方法呼叫才會擲例外，
`[long]` 轉型運算子在空字串上走的是另一條寬鬆路徑）。**只有 `'abc'` 這種
「非空但非數字」的字串才會擲例外。**

這個落差**反過來強化了 PLAN／TASKS 治理句「釘 `[string]::IsNullOrEmpty`
顯式分支 idiom」的必要性**：如果 emitter 天真地用 `try { [long]$e } catch
{ fallback }` 去接「未設或空字串」這一路，會**在不知不覺間把「STATUSLINE_NOW_EPOCH
被設成空字串」的案例靜默算成 epoch 0（1970-01-01）而非回落真時鐘**——
因為空字串轉型不擲例外、`catch` 根本不會被觸發。顯式 `IsNullOrEmpty` 閘
是唯一能正確攔住這個陷阱的寫法，不能只靠 try/catch 兜底。

### 2.2 `TryParse` vs `try/catch`：選型理由

`tryparse-check.ps1` 驗證 `[long]::TryParse` 的行為（`run-all.out.txt`
L53–65，PS 5.1／pwsh 7 逐格相同）：

| 輸入 | `TryParse` 結果 |
|---|---|
| `$null` | `ok=False, parsed=0`（**不擲例外**，僅本測試腳本自身在同一行印出
  `$val.GetType()` 時因對 `$null` 呼叫方法而報一個 non-terminating 錯誤，
  與 `TryParse` 本身無關，該行仍安全印出 `ok=False`） |
| `''` | `ok=False, parsed=0` |
| `'abc'` | `ok=False, parsed=0` |
| `'1783497600'` | `ok=True, parsed=1783497600` |
| `' 123'`（前導空白） | `ok=True, parsed=123`（自動 trim，非本 idiom 需要但值得記錄） |

**選型：`[long]::TryParse` 優於 `try { [long]$e } catch { }`**，理由：

1. **語意精確對齊「非數字不中止」的需求**——`TryParse` 用回傳的 `bool`
   表達「轉型是否成功」，沒有例外流程，程式碼是純粹的資料流分支，比
   `try/catch` 更直接對應「合法→用值；不合法→回落」這種雙路分歧，不需
   要在 `catch` 區塊裡重新判斷「到底是哪種錯誤」。
2. **無隱藏陷阱**——§2.1 已證實 `[long]''` 不擲例外會靜默變成 `0`，若
   idiom 寫成 `try { $n = [long]$e } catch { $n = <real clock> }`，
   `''` 這個輸入根本不會落進 `catch`，而是直接把 `$n` 設成 `0`，與「未設
   環境變數應回落真時鐘」的預期行為矛盾。`TryParse` 沒有這個問題，因為
   本 idiom 把「是否為空」的判斷**放在 `TryParse` 之前**的顯式
   `IsNullOrEmpty` 閘，`TryParse` 只需要專心處理「已知非空字串是否為合法
   數字」這一件事，兩層閘各司其職、無交叉污染。
3. **PS 5.1 相容**——`[long]::TryParse(string, [ref]long)` 是 .NET
   Framework／.NET (Core) 共有的靜態方法簽章，PS 5.1（Desktop, .NET
   Framework）與 pwsh 7（.NET）上實測行為完全一致（見上表），不需要
   為兩個版本寫兩套邏輯。
4. **比 `-match '^\d+$'` 正則式更精確**——正則式判斷格式合法不代表數值
   一定能塞進 `long`（例如超大位數字串會正則通過但轉型溢位），`TryParse`
   內建範圍檢查，一次到位。

### 2.3 釘死 idiom

```powershell
$e = $env:STATUSLINE_NOW_EPOCH
if ([string]::IsNullOrEmpty($e)) {
    $n = [DateTimeOffset]::Now.ToUnixTimeSeconds()
} else {
    $parsed = 0L
    if ([long]::TryParse($e, [ref]$parsed)) {
        $n = $parsed
    } else {
        $n = [DateTimeOffset]::Now.ToUnixTimeSeconds()
    }
}
```

三層防線與 jq 半邊逐路對齊：
- `IsNullOrEmpty` 閘＝jq 的 `// empty`（未設或空字串 → 視為「無值」）。
- `TryParse` 閘＝jq 的 `tonumber?`（非數字 → 靜默失敗，不擲例外／不中止）。
- 兩個 `else` 分支殊途同歸都呼叫 `[DateTimeOffset]::Now.ToUnixTimeSeconds()`
  ＝jq 的 `now|floor`（腳本端真時鐘回落）。

### 2.4 六案矩陣（3 路 × {PS 5.1, pwsh 7}，另附 2 個 bonus 空字串案）

`probe.ps1` 實測（`run-all.out.txt` L67–93）：

| PowerShell | 路 | `STATUSLINE_NOW_EPOCH` | branch | n | oracle_now | diff | exit |
|---|---|---|---|---|---|---|---|
| PS 5.1 | (a) 未設 | （unset） | `absent-fallback` | 1783862024 | 1783862024 | **0** | 0 |
| PS 5.1 | (b) 合法 | `1783497600` | `legit-parsed` | **1783497600**（原值） | 1783862025 | 364425（預期，非「差 <5s」驗收項） | 0 |
| PS 5.1 | (c) 非數字 | `abc` | `nonnumeric-fallback` | 1783862026 | 1783862026 | **0** | 0 |
| PS 5.1 | (d) bonus：空字串 | `""` | `absent-fallback` | 1783862027 | 1783862027 | 0 | 0 |
| pwsh 7 | (a) 未設 | （unset） | `absent-fallback` | 1783862028 | 1783862028 | **0** | 0 |
| pwsh 7 | (b) 合法 | `1783497600` | `legit-parsed` | **1783497600**（原值） | 1783862028 | 364428（同上，非驗收項） | 0 |
| pwsh 7 | (c) 非數字 | `abc` | `nonnumeric-fallback` | 1783862029 | 1783862029 | **0** | 0 |
| pwsh 7 | (d) bonus：空字串 | `""` | `absent-fallback` | 1783862029 | 1783862029 | 0 | 0 |

驗收判定（依 TASKS 措辭逐條核對）：
- **未設 → 真時鐘（差 <5s）**：PS 5.1／pwsh 7 皆 diff=0 ✅
- **合法 → 原值**：PS 5.1／pwsh 7 皆原樣輸出 `1783497600` ✅（`diff`
  欄位在此路是「注入值 vs 當下真時鐘」的差距，數字大是**預期且正確**——
  代表沒有被真時鐘污染，不是驗收失敗項，特此註記避免誤讀表格）
- **非數字 → 靜默回落真時鐘且 exit 0**：PS 5.1／pwsh 7 皆 diff=0、
  `exit: 0` ✅，兩版皆未中止腳本
- （bonus）空字串顯式設定 → 與「未設」同一路徑、非「合法值 0」✅，
  印證 §2.1／§2.2 討論的陷阱已被正確擋下

六案（+2 bonus 共 8 案）全數通過。

---

## 3. 兩端最終釘死 idiom（可直接抄進 emitter）

### jq（`emit-bash.ts` 產出腳本內嵌）

```jq
(env.STATUSLINE_NOW_EPOCH // empty | tonumber?) // (now|floor)
```

### ps1（`emit-ps1.ts` 產出腳本內嵌）

```powershell
$e = $env:STATUSLINE_NOW_EPOCH
if ([string]::IsNullOrEmpty($e)) {
    $n = [DateTimeOffset]::Now.ToUnixTimeSeconds()
} else {
    $parsed = 0L
    if ([long]::TryParse($e, [ref]$parsed)) {
        $n = $parsed
    } else {
        $n = [DateTimeOffset]::Now.ToUnixTimeSeconds()
    }
}
```

兩端行為對齊總表：

| 路 | jq | ps1 |
|---|---|---|
| 未設 | `// empty` 觸發 → `now\|floor` | `IsNullOrEmpty` 為真 → `DateTimeOffset.Now` |
| 合法 | `tonumber` 成功 → 原值 | `TryParse` 成功 → `$parsed` |
| 非數字 | `tonumber?` 吞錯 → `now\|floor`，exit 0 | `TryParse` 回傳 `False` → `DateTimeOffset.Now`，exit 0 |

---

## 4. 附錄：完整原始輸出

見同目錄 `run-all.out.txt`（`run-all.sh` 本次實跑逐行輸出，本報告所有
數字皆可在該檔案對應行核對，行號已於各節標註）。
