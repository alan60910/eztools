/**
 * S5-T2.1（magi/05-statusline-builder/PLAN.md §Segment 目錄／§型別契約
 * SegmentDescriptor／§格式化對等規則／§Verification 1）：目錄結構不變量
 * （25 段、順序、icon 凍結碼位、nullPolicy 對應、tri-path idiom）、
 * tsPath 各情境 spot-check、TS 參考格式器對抗值（補尾零／float 乘積
 * 下緣／整數除法三階／10⁶ 門檻——跨後端行為相等歸 §3 真執行，本層
 * 不做跨後端斷言）、catalog×config.deserializeConfig integration
 * （真目錄餵清洗）。
 */
import { describe, expect, it } from 'vitest'
import { defaultConfig, deserializeConfig, serializeConfig } from './config.js'
import {
  CWD_VARIANTS,
  DESCRIPTORS_BY_ID,
  defaultVariant,
  formatClockHM,
  formatContextSize,
  formatCost,
  formatDuration,
  formatLinesChanged,
  formatPath,
  formatPercentage,
  formatResetsAt,
  formatValue,
  isValueDead,
  RATE_VARIANTS,
  resetsAtSuffix,
  SEGMENT_CATALOG,
  SEGMENT_DESCRIPTORS,
  SEGMENT_IDS,
  type SegmentId,
  type StatusData,
} from './segments.js'

/** 永在欄齊備的最小 StatusData（current_dir 刻意 ≠ cwd——證 cwd 段取 top-level）。 */
function makeStatusData(overrides: Partial<StatusData> = {}): StatusData {
  return {
    cwd: '/home/u/proj',
    session_id: 'sess-1',
    transcript_path: '/home/u/.claude/t.jsonl',
    version: '2.1.196',
    model: { id: 'claude-fable-5', display_name: 'Fable 5' },
    workspace: {
      current_dir: '/home/u/proj/sub',
      project_dir: '/home/u/proj',
      added_dirs: [],
    },
    output_style: { name: 'default' },
    cost: {
      total_cost_usd: 1.5,
      total_duration_ms: 61000,
      total_api_duration_ms: 30000,
      total_lines_added: 3,
      total_lines_removed: 1,
    },
    context_window: {
      total_input_tokens: 1200,
      total_output_tokens: 300,
      context_window_size: 200000,
      used_percentage: 42.5,
      remaining_percentage: 57.5,
      current_usage: null,
    },
    exceeds_200k_tokens: false,
    thinking: { enabled: true },
    ...overrides,
  }
}

const tsValue = (id: SegmentId, d: StatusData): unknown => DESCRIPTORS_BY_ID[id].tsPath(d)

// ── 目錄結構不變量 ──

describe('segment 目錄結構', () => {
  it('25 段、順序＝PLAN 目錄表序（永在 10→百分比 4→條件 8→shell-out 3）', () => {
    expect(SEGMENT_IDS).toEqual([
      'model', 'cwd', 'project-dir', 'output-style', 'version',
      'cost', 'duration', 'lines-changed', 'context-size', 'thinking',
      'context-used', 'context-remaining', 'rate-5h', 'rate-7d',
      'session-name', 'effort', 'vim-mode', 'agent-name', 'pr', 'repo',
      'worktree', 'worktree-branch',
      'git-branch', 'git-dirty', 'clock',
    ])
  })

  it('category 分佈：always×10／percentage×4／conditional×8／shell-out×3，且同類連續', () => {
    const categories = SEGMENT_DESCRIPTORS.map((d) => d.category)
    expect(categories).toEqual([
      ...Array<string>(10).fill('always'),
      ...Array<string>(4).fill('percentage'),
      ...Array<string>(8).fill('conditional'),
      ...Array<string>(3).fill('shell-out'),
    ])
  })

  it('id 唯一且 DESCRIPTORS_BY_ID 與清單一致', () => {
    expect(new Set(SEGMENT_IDS).size).toBe(25)
    for (const descriptor of SEGMENT_DESCRIPTORS) {
      expect(DESCRIPTORS_BY_ID[descriptor.id]).toBe(descriptor)
    }
  })

  it('provisional 體制（SP-0 對帳後）：僅 vim-mode／pr 維持 provisional', () => {
    const stillProvisional = SEGMENT_DESCRIPTORS.filter((d) => d.provisional).map((d) => d.id)
    expect(stillProvisional).toEqual(['vim-mode', 'pr'])
    // provisional 段附待驗 note；拆標段不留 stale note
    for (const d of SEGMENT_DESCRIPTORS) {
      if (d.provisional) expect(d.provisionalNote, d.id).toBeTruthy()
      else expect(d.provisionalNote, d.id).toBeUndefined()
    }
  })

  it('label／icon.ariaText 全非空（accessible name 素材）', () => {
    for (const d of SEGMENT_DESCRIPTORS) {
      expect(d.label.length, d.id).toBeGreaterThan(0)
      expect(d.icon.ariaText.length, d.id).toBeGreaterThan(0)
    }
  })

  it('目錄深凍結（descriptor／icon／variants／衍生 export 皆不可變）', () => {
    expect(Object.isFrozen(SEGMENT_DESCRIPTORS)).toBe(true)
    for (const d of SEGMENT_DESCRIPTORS) {
      expect(Object.isFrozen(d), d.id).toBe(true)
      expect(Object.isFrozen(d.icon), d.id).toBe(true)
      if (d.variants !== undefined) expect(Object.isFrozen(d.variants), d.id).toBe(true)
    }
    expect(Object.isFrozen(SEGMENT_IDS)).toBe(true)
    expect(Object.isFrozen(DESCRIPTORS_BY_ID)).toBe(true)
    expect(Object.isFrozen(SEGMENT_CATALOG)).toBe(true)
    expect(Object.isFrozen(SEGMENT_CATALOG.variantsById)).toBe(true)
  })
})

describe('icon 凍結碼位（T1.6 fonts/README.md 凍結表）', () => {
  it('25 段 glyph 逐一對應凍結碼位（單一 BMP PUA 字元）', () => {
    // fonts/README.md 凍結表鏡像：worktree（名稱段）採 U+F414
    // （oct-file_submodule）；worktree-branch 採 U+F418（oct-git_branch）。
    const frozen: Record<SegmentId, number> = {
      model: 0xf4bc,
      cwd: 0xf413,
      'project-dir': 0xf502,
      'output-style': 0xf48f,
      version: 0xf412,
      cost: 0xf439,
      duration: 0xf520,
      'lines-changed': 0xf440,
      'context-size': 0xf472,
      thinking: 0xf400,
      'context-used': 0xf463,
      'context-remaining': 0xf463,
      'rate-5h': 0xf4e3,
      'rate-7d': 0xf455,
      'session-name': 0xf461,
      effort: 0xf490,
      'vim-mode': 0xf448,
      'agent-name': 0xf477,
      pr: 0xf407,
      repo: 0xf401,
      worktree: 0xf414,
      'worktree-branch': 0xf418,
      'git-branch': 0xe0a0,
      'git-dirty': 0xf444,
      clock: 0xf43a,
    }
    const actual = Object.fromEntries(
      SEGMENT_DESCRIPTORS.map((d) => [d.id, d.icon.glyph.codePointAt(0)]),
    )
    expect(actual).toEqual(frozen)
    for (const d of SEGMENT_DESCRIPTORS) {
      expect(d.icon.glyph.length, d.id).toBe(1)
    }
  })
})

describe('tri-path idiom 不變量', () => {
  it('shell-out 段：jqPath/ps1Path 空字串＋shellOut 齊備；其餘段相反', () => {
    for (const d of SEGMENT_DESCRIPTORS) {
      if (d.category === 'shell-out') {
        expect(d.jqPath, d.id).toBe('')
        expect(d.ps1Path, d.id).toBe('')
        expect(d.shellOut, d.id).toBeDefined()
      } else {
        expect(d.jqPath.startsWith('.'), d.id).toBe(true)
        expect(d.ps1Path.length, d.id).toBeGreaterThan(0)
        expect(d.shellOut, d.id).toBeUndefined()
      }
    }
  })

  it('worktree 以外的 stdin 段：ps1Path === "$d" + jqPath（機械同構）', () => {
    for (const d of SEGMENT_DESCRIPTORS) {
      if (d.category === 'shell-out' || d.id === 'worktree') continue
      expect(d.ps1Path, d.id).toBe(`$d${d.jqPath}`)
      if (d.resetsAt !== undefined) {
        expect(d.resetsAt.ps1Path, `${d.id} resetsAt`).toBe(`$d${d.resetsAt.jqPath}`)
      }
    }
  })

  it('worktree 雙表述併一：fallback 鏈字面釘死（下游 emitter 逐字抄）', () => {
    const d = DESCRIPTORS_BY_ID['worktree']
    expect(d.jqPath).toBe('.workspace.git_worktree // .worktree.name')
    expect(d.ps1Path).toBe(
      '$(if ($null -ne $d.workspace.git_worktree) { $d.workspace.git_worktree } else { $d.worktree.name })',
    )
  })

  it('shellOut 核心命令字面釘死（防禦包裹歸 emitter 契約 9）', () => {
    expect(DESCRIPTORS_BY_ID['git-branch'].shellOut).toEqual({
      bash: 'git branch --show-current',
      ps1: 'git branch --show-current',
    })
    expect(DESCRIPTORS_BY_ID['git-dirty'].shellOut).toEqual({
      bash: 'git status --porcelain',
      ps1: 'git status --porcelain',
    })
    expect(DESCRIPTORS_BY_ID['clock'].shellOut).toEqual({
      bash: 'date +%H:%M',
      ps1: 'Get-Date -Format HH:mm',
    })
  })

  it('resetsAt 僅 rate 兩段有', () => {
    const withResetsAt = SEGMENT_DESCRIPTORS.filter((d) => d.resetsAt !== undefined).map((d) => d.id)
    expect(withResetsAt).toEqual(['rate-5h', 'rate-7d'])
  })
})

describe('nullPolicy 對應（產生器契約 3）', () => {
  it('全 25 段逐一釘死：percentage=dash、conditional=hide、thinking/clock=empty、git 兩段=hide', () => {
    const actual = Object.fromEntries(SEGMENT_DESCRIPTORS.map((d) => [d.id, d.nullPolicy]))
    expect(actual).toEqual({
      model: 'empty',
      cwd: 'empty',
      'project-dir': 'empty',
      'output-style': 'empty',
      version: 'empty',
      cost: 'empty',
      duration: 'empty',
      'lines-changed': 'empty',
      'context-size': 'empty',
      thinking: 'empty',
      'context-used': 'dash',
      'context-remaining': 'dash',
      'rate-5h': 'dash',
      'rate-7d': 'dash',
      'session-name': 'hide',
      effort: 'hide',
      'vim-mode': 'hide',
      'agent-name': 'hide',
      pr: 'hide',
      repo: 'hide',
      worktree: 'hide',
      'worktree-branch': 'hide',
      'git-branch': 'hide',
      'git-dirty': 'hide',
      clock: 'empty',
    })
  })
})

describe('variants', () => {
  it('僅 cwd／rate-5h／rate-7d 有 variants，內容＝表列常數', () => {
    const withVariants = SEGMENT_DESCRIPTORS.filter((d) => d.variants !== undefined).map((d) => d.id)
    expect(withVariants).toEqual(['cwd', 'rate-5h', 'rate-7d'])
    expect(DESCRIPTORS_BY_ID['cwd'].variants).toEqual(['full', 'basename', 'tilde'])
    expect(DESCRIPTORS_BY_ID['rate-5h'].variants).toEqual(['percent', 'percent-reset'])
    expect(DESCRIPTORS_BY_ID['rate-7d'].variants).toEqual(['percent', 'percent-reset'])
  })

  it('defaultVariant＝表列第一項；無 variants 段回 undefined', () => {
    expect(defaultVariant(DESCRIPTORS_BY_ID['cwd'])).toBe('full')
    expect(defaultVariant(DESCRIPTORS_BY_ID['rate-5h'])).toBe(RATE_VARIANTS[0])
    expect(defaultVariant(DESCRIPTORS_BY_ID['model'])).toBeUndefined()
  })
})

// ── tsPath spot-check ──

describe('tsPath spot-check', () => {
  const d = makeStatusData()

  it('永在段取值（cwd 取 top-level .cwd、非 workspace.current_dir）', () => {
    expect(tsValue('model', d)).toBe('Fable 5')
    expect(tsValue('cwd', d)).toBe('/home/u/proj')
    expect(tsValue('project-dir', d)).toBe('/home/u/proj')
    expect(tsValue('output-style', d)).toBe('default')
    expect(tsValue('version', d)).toBe('2.1.196')
    expect(tsValue('cost', d)).toBe(1.5)
    expect(tsValue('duration', d)).toBe(61000)
    expect(tsValue('lines-changed', d)).toBe(d.cost)
    expect(tsValue('context-size', d)).toBe(d.context_window)
    expect(tsValue('thinking', d)).toBe(true)
    expect(tsValue('thinking', makeStatusData({ thinking: { enabled: false } }))).toBe(false)
  })

  it('百分比段：值原樣、null 原樣穿透（dash 顯示歸 resolve 層）', () => {
    expect(tsValue('context-used', d)).toBe(42.5)
    expect(tsValue('context-remaining', d)).toBe(57.5)
    const early = makeStatusData({
      context_window: { ...d.context_window, used_percentage: null, remaining_percentage: null },
    })
    expect(tsValue('context-used', early)).toBeNull()
    expect(tsValue('context-remaining', early)).toBeNull()
  })

  it('rate 段：整包缺席→undefined、視窗缺席→undefined、值 null→null、齊備→值', () => {
    expect(tsValue('rate-5h', d)).toBeUndefined()
    expect(tsValue('rate-7d', d)).toBeUndefined()
    const partial = makeStatusData({
      rate_limits: { five_hour: { used_percentage: null, resets_at: null } },
    })
    expect(tsValue('rate-5h', partial)).toBeNull()
    expect(tsValue('rate-7d', partial)).toBeUndefined()
    const rated = makeStatusData({
      rate_limits: {
        five_hour: { used_percentage: 63.2, resets_at: 1783497600 },
        seven_day: { used_percentage: 21, resets_at: null },
      },
    })
    expect(tsValue('rate-5h', rated)).toBe(63.2)
    expect(tsValue('rate-7d', rated)).toBe(21)
  })

  it('resetsAt tri-path：缺席→undefined、null→null、齊備→epoch', () => {
    const rate5h = DESCRIPTORS_BY_ID['rate-5h']
    const rate7d = DESCRIPTORS_BY_ID['rate-7d']
    expect(rate5h.resetsAt!.tsPath(d)).toBeUndefined()
    const rated = makeStatusData({
      rate_limits: {
        five_hour: { used_percentage: 63.2, resets_at: 1783497600 },
        seven_day: { used_percentage: 21, resets_at: null },
      },
    })
    expect(rate5h.resetsAt!.tsPath(rated)).toBe(1783497600)
    expect(rate7d.resetsAt!.tsPath(rated)).toBeNull()
  })

  it('條件段：缺席一律 undefined（hide 剔段素材）', () => {
    const conditionalIds = SEGMENT_DESCRIPTORS.filter((s) => s.category === 'conditional').map(
      (s) => s.id,
    )
    for (const id of conditionalIds) {
      expect(tsValue(id, d), id).toBeUndefined()
    }
  })

  it('條件段：在席取值', () => {
    const present = makeStatusData({
      session_name: 'sprint-05',
      effort: { level: 'high' },
      vim: { mode: 'INSERT' },
      agent: { name: 'reviewer' },
      pr: { number: 42, url: 'https://example.com/pr/42', review_state: 'APPROVED' },
      workspace: { ...d.workspace, repo: { host: 'github.com', owner: 'alanwu', name: 'eztools' } },
    })
    expect(tsValue('session-name', present)).toBe('sprint-05')
    expect(tsValue('effort', present)).toBe('high')
    expect(tsValue('vim-mode', present)).toBe('INSERT')
    expect(tsValue('agent-name', present)).toBe('reviewer')
    expect(tsValue('pr', present)).toBe(present.pr)
    expect(tsValue('repo', present)).toBe(present.workspace.repo)
  })

  it('worktree fallback 鏈：git_worktree 優先→worktree.name→undefined', () => {
    const both = makeStatusData({
      workspace: { ...d.workspace, git_worktree: 'primary' },
      worktree: { name: 'secondary' },
    })
    expect(tsValue('worktree', both)).toBe('primary')
    const onlyTop = makeStatusData({ worktree: { name: 'secondary' } })
    expect(tsValue('worktree', onlyTop)).toBe('secondary')
    const onlyWs = makeStatusData({ workspace: { ...d.workspace, git_worktree: 'primary' } })
    expect(tsValue('worktree', onlyWs)).toBe('primary')
    expect(tsValue('worktree', d)).toBeUndefined()
    expect(tsValue('worktree', makeStatusData({ worktree: {} }))).toBeUndefined()
  })

  it('shell-out 段：tsPath 恆 undefined（值走 mock shell 通道）', () => {
    for (const id of ['git-branch', 'git-dirty', 'clock'] as const) {
      expect(tsValue(id, d), id).toBeUndefined()
    }
  })
})

// ── 存活語意 ──

describe('isValueDead', () => {
  it('null／undefined／""／false＝死；0／"0"／true／物件＝活（0% 合法）', () => {
    expect(isValueDead(null)).toBe(true)
    expect(isValueDead(undefined)).toBe(true)
    expect(isValueDead('')).toBe(true)
    expect(isValueDead(false)).toBe(true)
    expect(isValueDead(0)).toBe(false)
    expect(isValueDead('0')).toBe(false)
    expect(isValueDead(true)).toBe(false)
    expect(isValueDead({})).toBe(false)
  })
})

// ── 格式化純函式（對抗值） ──

describe('formatCost（單次浮點乘 floor＋4 位補尾零）', () => {
  it('補尾零案：1.0→$1.0000、0.5→$0.5000、0.005→$0.0050', () => {
    expect(formatCost(1.0)).toBe('$1.0000')
    expect(formatCost(0.5)).toBe('$0.5000')
    expect(formatCost(0.005)).toBe('$0.0050')
  })

  it('截尾非捨入：0.01235→$0.0123（捨入半值不進位）', () => {
    expect(formatCost(0.01235)).toBe('$0.0123')
  })

  it('float 乘積下緣一致偏：0.0029→$0.0028（28.999…floor；三後端同 double 同偏）', () => {
    expect(formatCost(0.0029)).toBe('$0.0028')
  })

  it('零／整數位進位／大額', () => {
    expect(formatCost(0)).toBe('$0.0000')
    expect(formatCost(3.3341)).toBe('$3.3341')
    expect(formatCost(12.34567)).toBe('$12.3456')
    expect(formatCost(123.4)).toBe('$123.4000')
  })

  it('負值 clamp 0（cost 恆 ≥0 假設）', () => {
    expect(formatCost(-0.5)).toBe('$0.0000')
  })
})

describe('formatDuration（整數除法三階）', () => {
  it('秒階：0→0s、999→0s、1000→1s、59999→59s', () => {
    expect(formatDuration(0)).toBe('0s')
    expect(formatDuration(999)).toBe('0s')
    expect(formatDuration(1000)).toBe('1s')
    expect(formatDuration(59999)).toBe('59s')
  })

  it('分階：60000→1m0s、61000→1m1s、3599999→59m59s', () => {
    expect(formatDuration(60000)).toBe('1m0s')
    expect(formatDuration(61000)).toBe('1m1s')
    expect(formatDuration(3599999)).toBe('59m59s')
  })

  it('時階：3600000→1h0m、3661000→1h1m、86399999→23h59m、90000000→25h0m（不折日）', () => {
    expect(formatDuration(3600000)).toBe('1h0m')
    expect(formatDuration(3661000)).toBe('1h1m')
    expect(formatDuration(86399999)).toBe('23h59m')
    expect(formatDuration(90000000)).toBe('25h0m')
  })
})

describe('formatPercentage（⌊p⌋%）', () => {
  it('floor 邊界：0／9.99→9％界／10.0／55／99.9／100／105（顯示層不 clamp）', () => {
    expect(formatPercentage(0)).toBe('0%')
    expect(formatPercentage(9.99)).toBe('9%')
    expect(formatPercentage(10.0)).toBe('10%')
    expect(formatPercentage(55)).toBe('55%')
    expect(formatPercentage(99.9)).toBe('99%')
    expect(formatPercentage(100)).toBe('100%')
    expect(formatPercentage(105)).toBe('105%')
  })
})

describe('formatContextSize（10⁶ 門檻 M-k）', () => {
  it('k 域：0→0k、999→0k、1000→1k、999999→999k', () => {
    expect(formatContextSize(0)).toBe('0k')
    expect(formatContextSize(999)).toBe('0k')
    expect(formatContextSize(1000)).toBe('1k')
    expect(formatContextSize(999999)).toBe('999k')
  })

  it('M 域：1000000→1M、1999999→1M、12345678→12M', () => {
    expect(formatContextSize(1_000_000)).toBe('1M')
    expect(formatContextSize(1_999_999)).toBe('1M')
    expect(formatContextSize(12_345_678)).toBe('12M')
  })
})

describe('formatLinesChanged／formatClockHM', () => {
  it('lines-changed：+A/-R 原整數（含全零）', () => {
    expect(formatLinesChanged(120, 45)).toBe('+120/-45')
    expect(formatLinesChanged(0, 0)).toBe('+0/-0')
  })

  it('HH:mm 兩欄皆零填補', () => {
    expect(formatClockHM(9, 5)).toBe('09:05')
    expect(formatClockHM(0, 0)).toBe('00:00')
    expect(formatClockHM(23, 58)).toBe('23:58')
  })
})

describe('formatResetsAt／resetsAtSuffix', () => {
  /** 以本地時間建 epoch（測試不依賴時區）。 */
  const epochAtLocal = (h: number, m: number): number =>
    new Date(2026, 6, 8, h, m, 0, 0).getTime() / 1000

  it('epoch 秒→本地 HH:mm（零填補）', () => {
    expect(formatResetsAt(epochAtLocal(14, 30))).toBe('14:30')
    expect(formatResetsAt(epochAtLocal(0, 5))).toBe('00:05')
  })

  it('後綴形：null/undefined→無後綴、epoch→" (HH:mm)"', () => {
    expect(resetsAtSuffix(null)).toBe('')
    expect(resetsAtSuffix(undefined)).toBe('')
    expect(resetsAtSuffix(epochAtLocal(9, 5))).toBe(' (09:05)')
  })

  it('非 number 非 null＝epoch 假設破產→TypeError（SP-0 對帳點）', () => {
    expect(() => resetsAtSuffix('soon')).toThrow(TypeError)
    expect(() => resetsAtSuffix(Number.NaN)).toThrow(TypeError)
  })
})

describe('formatPath（cwd variants）', () => {
  it('full：原樣', () => {
    expect(formatPath('/home/u/proj', 'full', '/home/u')).toBe('/home/u/proj')
  })

  it('basename：斜線／反斜線／混用皆為分隔、尾分隔忽略、根路徑原樣', () => {
    expect(formatPath('/a/b/c', 'basename', '')).toBe('c')
    expect(formatPath('C:\\Users\\alan', 'basename', '')).toBe('alan')
    expect(formatPath('D:\\x/y', 'basename', '')).toBe('y')
    expect(formatPath('/a/b/', 'basename', '')).toBe('b')
    expect(formatPath('/', 'basename', '')).toBe('/')
    expect(formatPath('D:\\個人檔案\\工具箱', 'basename', '')).toBe('工具箱')
  })

  it('tilde：home 前綴嚴格逐字比對（含大小寫）、雙分隔符風格', () => {
    expect(formatPath('/home/alan', 'tilde', '/home/alan')).toBe('~')
    expect(formatPath('/home/alan/x', 'tilde', '/home/alan')).toBe('~/x')
    expect(formatPath('C:\\Users\\阿藍\\專案', 'tilde', 'C:\\Users\\阿藍')).toBe('~\\專案')
    // 假前綴（/home/alanb 非 /home/alan 子路徑）不縮
    expect(formatPath('/home/alanb/x', 'tilde', '/home/alan')).toBe('/home/alanb/x')
    // 大小寫不合不縮（Windows 寬鬆比對刻意不做）
    expect(formatPath('c:\\users\\阿藍\\x', 'tilde', 'C:\\Users\\阿藍')).toBe('c:\\users\\阿藍\\x')
    // home 空字串：原樣
    expect(formatPath('/home/alan/x', 'tilde', '')).toBe('/home/alan/x')
  })
})

describe('formatValue（FormatKind 派發）', () => {
  it('text／path（含 ctx.variant 預設 full）', () => {
    expect(formatValue('text', 'Fable 5')).toBe('Fable 5')
    expect(formatValue('path', '/a/b/c')).toBe('/a/b/c')
    expect(formatValue('path', '/a/b/c', { variant: 'basename' })).toBe('c')
    expect(formatValue('path', '/home/u/x', { variant: 'tilde', home: '/home/u' })).toBe('~/x')
  })

  it('cost／duration／percentage', () => {
    expect(formatValue('cost', 0.5)).toBe('$0.5000')
    expect(formatValue('duration', 60000)).toBe('1m0s')
    expect(formatValue('percentage', 9.99)).toBe('9%')
  })

  it('context-size：節點 in+out 總和過門檻', () => {
    const node = makeStatusData().context_window
    expect(formatValue('context-size', node)).toBe('1k') // 1200+300=1500
    expect(
      formatValue('context-size', { ...node, total_input_tokens: 998000, total_output_tokens: 152000 }),
    ).toBe('1M')
  })

  it('lines-changed：cost 節點雙欄', () => {
    expect(formatValue('lines-changed', makeStatusData().cost)).toBe('+3/-1')
  })

  it('flag／dirty：只對 true 呼叫（false 屬剔段路徑→TypeError）', () => {
    expect(formatValue('flag', true)).toBe('on')
    expect(formatValue('dirty', true)).toBe('*')
    expect(() => formatValue('flag', false)).toThrow(TypeError)
    expect(() => formatValue('dirty', null)).toThrow(TypeError)
  })

  it('pr／repo／clock', () => {
    expect(formatValue('pr', { number: 42, url: 'u', review_state: 'APPROVED' })).toBe('#42')
    expect(formatValue('repo', { host: 'github.com', owner: 'alanwu', name: 'eztools' })).toBe(
      'alanwu/eztools',
    )
    expect(formatValue('clock', { hours: 7, minutes: 3 })).toBe('07:03')
  })

  it('形狀不符＝programmer error→TypeError（驗證閘在上游）', () => {
    expect(() => formatValue('text', 42)).toThrow(TypeError)
    expect(() => formatValue('cost', '1.5')).toThrow(TypeError)
    expect(() => formatValue('percentage', Number.NaN)).toThrow(TypeError)
    expect(() => formatValue('context-size', 1500)).toThrow(TypeError)
    expect(() => formatValue('pr', { url: 'u' })).toThrow(TypeError)
    expect(() => formatValue('path', '/a', { variant: 'bogus' })).toThrow(TypeError)
  })
})

// ── catalog × config integration（真目錄餵清洗） ──

describe('SEGMENT_CATALOG × config.deserializeConfig', () => {
  it('catalog 注入面形狀：ids＝目錄序全 25、variantsById 僅三鍵', () => {
    expect(SEGMENT_CATALOG.ids).toEqual(SEGMENT_IDS)
    expect(Object.keys(SEGMENT_CATALOG.variantsById).sort()).toEqual(['cwd', 'rate-5h', 'rate-7d'])
    expect(SEGMENT_CATALOG.variantsById['cwd']).toEqual(CWD_VARIANTS)
    expect(SEGMENT_CATALOG.variantsById['rate-5h']).toEqual(RATE_VARIANTS)
  })

  it('defaultConfig(真 catalog)：25 列目錄序全停用；serialize→deserialize 冪等', () => {
    const config = defaultConfig(SEGMENT_CATALOG)
    expect(config.segments.map((s) => s.id)).toEqual([...SEGMENT_IDS])
    expect(config.segments.every((s) => !s.enabled)).toBe(true)
    expect(deserializeConfig(serializeConfig(config), SEGMENT_CATALOG)).toEqual(config)
  })

  it('未知舊 id（git-worktree）丟棄；worktree／worktree-branch 拆段後皆合法保留', () => {
    const legacy = JSON.stringify({
      version: 1,
      mode: 'plain',
      separator: { kind: 'preset', value: '|' },
      lastArrowCap: true,
      segments: [
        // git-worktree＝從未出貨的假想舊 id → 非 catalog.ids → 清洗丟棄
        { id: 'git-worktree', enabled: true, icon: true, color: { kind: 'ansi256', index: 2 } },
        // SP-0 拆段後 worktree-branch／worktree 皆為合法目錄 id → 保留（含設定）
        { id: 'worktree-branch', enabled: true, icon: true, color: { kind: 'ansi256', index: 3 } },
        { id: 'worktree', enabled: true, icon: false, color: { kind: 'default' } },
        { id: 'model', enabled: true, icon: false, color: { kind: 'default' } },
      ],
    })
    const cleaned = deserializeConfig(legacy, SEGMENT_CATALOG)
    const ids = cleaned.segments.map((s) => s.id)
    expect(ids).not.toContain('git-worktree') // 未知 → 丟
    expect(ids).toContain('worktree-branch') // 合法 → 留
    expect(ids).toContain('worktree')
    // 丟 git-worktree 後存檔序保留（首三列＝worktree-branch, worktree, model）、
    // 缺段依目錄序補於末→產出為 catalog.ids 排列
    expect(ids.slice(0, 3)).toEqual(['worktree-branch', 'worktree', 'model'])
    expect([...ids].sort()).toEqual([...SEGMENT_IDS].sort())
    // worktree-branch 保留使用者設定（enabled/icon/color）
    expect(cleaned.segments.find((s) => s.id === 'worktree-branch')).toEqual({
      id: 'worktree-branch',
      enabled: true,
      icon: true,
      color: { kind: 'ansi256', index: 3 },
    })
  })

  it('variant 清洗走真 variants 表：合法保留、未知丟、無 variants 段丟', () => {
    const json = JSON.stringify({
      version: 1,
      mode: 'plain',
      separator: { kind: 'preset', value: '|' },
      lastArrowCap: true,
      segments: [
        { id: 'cwd', enabled: true, icon: false, color: { kind: 'default' }, variant: 'basename' },
        { id: 'rate-5h', enabled: true, icon: false, color: { kind: 'default' }, variant: 'percent-reset' },
        { id: 'rate-7d', enabled: true, icon: false, color: { kind: 'default' }, variant: 'hourly' },
        { id: 'model', enabled: true, icon: false, color: { kind: 'default' }, variant: 'full' },
      ],
    })
    const cleaned = deserializeConfig(json, SEGMENT_CATALOG)
    const byId = new Map(cleaned.segments.map((s) => [s.id, s]))
    expect(byId.get('cwd')?.variant).toBe('basename')
    expect(byId.get('rate-5h')?.variant).toBe('percent-reset')
    expect(byId.get('rate-7d')?.variant).toBeUndefined()
    expect(byId.get('model')?.variant).toBeUndefined()
  })

  it('使用者拖曳序保留＋缺段依目錄序補於末', () => {
    const json = JSON.stringify({
      version: 1,
      mode: 'powerline',
      separator: { kind: 'preset', value: '›' },
      lastArrowCap: false,
      segments: [
        { id: 'clock', enabled: true, icon: true, color: { kind: 'ansi256', index: 39 } },
        { id: 'git-branch', enabled: true, icon: true, color: { kind: 'ansi256', index: 2 } },
        { id: 'model', enabled: true, icon: false, color: { kind: 'default' } },
      ],
    })
    const cleaned = deserializeConfig(json, SEGMENT_CATALOG)
    const ids = cleaned.segments.map((s) => s.id)
    expect(ids.slice(0, 3)).toEqual(['clock', 'git-branch', 'model'])
    expect(ids.slice(3)).toEqual(SEGMENT_IDS.filter((id) => !['clock', 'git-branch', 'model'].includes(id)))
  })
})
