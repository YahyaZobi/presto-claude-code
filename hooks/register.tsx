import { atom, read, update } from 'claude-code'
import type { Register, ThemeSetArgs } from 'claude-code'

import type { Job, JobStatus, Usage } from '../types'
import { PRESTO, RIDER_COLUMNS, RIDER_ROWS, riderCells } from './art'
import { cardSvg, clockShape, meterLevel } from './card'
import { riderVector } from './scene'
import { makeColors } from './make-colors.js'

// ─── State ──────────────────────────────────────────────────────────────────
const job = atom({ plugin: 'presto', key: 'job' } as const, null)
const usage = atom({ plugin: 'presto', key: 'usage' } as const, {})

// ─── Look: Presto orange on warm paper by day, on ink by night ──────────────
const { theme, problems } = makeColors({
  label: 'Presto',
  roles: { accent: PRESTO.brand, danger: PRESTO.red, success: PRESTO.green, warning: PRESTO.gold, pro: '#8B5CF6' },
  light: {
    gray: {
      anchors: {
        'surface-0': '#F6EFE9',
        'surface-1': '#FBF6F2',
        'surface-2': '#FFFFFF',
        'text-primary': PRESTO.ink,
        'text-secondary': '#3D3A42',
        'text-muted': '#5C5660',
      },
    },
    git: { added: PRESTO.green, removed: '#B91C1C', modified: '#C2410C' },
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#141217',
        'surface-1': '#1B181D',
        'surface-2': '#221E23',
        'surface-3': '#29242A',
        'text-primary': '#F7F0EA',
        'text-secondary': '#D8CDC5',
        'text-muted': '#ADA198',
      },
    },
    git: { added: '#4ADE80', removed: '#F87171', modified: PRESTO.o400 },
  },
})
const LOOK: ThemeSetArgs = { colors: theme }

const LABEL: Record<JobStatus, string> = { working: 'Working', input: 'Needs your input', done: 'Done', error: 'Failed' }
const NOTE = { ok: 'Plenty of room', warn: 'Filling up', hot: 'Compacting soon' } as const

// ─── Small helpers ──────────────────────────────────────────────────────────
const base = (path: string) => path.split('/').filter(Boolean).pop() ?? path
const clock = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000))
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`
}
const pct = (n: number | undefined) => Math.max(0, Math.min(100, Math.round(n ?? 0)))

/** "Tue 08:00 AM", in the viewer's own time zone. */
const timeLabel = (iso?: string) => {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso))
  } catch {
    return '—'
  }
}

const costLabel = (usd?: number) => (usd === undefined ? undefined : usd > 0 && usd < 0.01 ? '<$0.01' : `$${usd.toFixed(2)}`)

const resetsLabel = (iso?: string) => {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso))
  } catch {
    return '—'
  }
}

/** The card's title while a permission ask waits on the person. */
function askTitle(tool: string, input: Record<string, unknown>): string {
  if (tool === 'Bash' && typeof input.command === 'string') return `Allow Bash: ${input.command.split('\n')[0]}?`
  if (typeof input.file_path === 'string') return `Allow ${tool}: ${base(input.file_path)}?`
  if (typeof input.url === 'string') return `Allow ${tool}: ${input.url}?`
  return `Allow ${tool.startsWith('mcp__') ? tool.split('__').slice(1).join(' · ') : tool}?`
}

/** The first question of an AskUserQuestion call. */
function firstQuestion(input: Record<string, unknown>): string | null {
  const qs = input.questions
  if (Array.isArray(qs) && qs.length > 0 && typeof (qs[0] as { question?: unknown }).question === 'string') return (qs[0] as { question: string }).question
  return null
}

const bar = (p: number, width = 8) => {
  const filled = Math.round((Math.min(100, Math.max(0, p)) / 100) * width)
  return '▰'.repeat(filled) + '▱'.repeat(width - filled)
}

export const register: Register = on => {
  // Module values: lost on a reload, and only used for motion.
  let ticker: { cancel: () => void } | undefined
  let tick = 0
  let bandId: string | undefined
  // The meters' last values and when they changed, so a change eases in.
  const meters: Record<'context' | 'five' | 'week', { pct: number; from?: { pct: number; at: number } } | undefined> = { context: undefined, five: undefined, week: undefined }
  // The last card drawn. It is drawn as an image (not an interactive frame, which goes
  // blank while it reloads), and rebuilt only when something it shows changes; a
  // running clock counts up inside the SVG between rebuilds.
  let card: { key: string; source: string; alt: string } | undefined

  const stopTicker = () => {
    ticker?.cancel?.()
    ticker = undefined
  }

  on('session.start', async ($, e, next) => {
    try {
      const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))
      if (unpainted !== undefined) $.ui.toast(`presto: ${unpainted}`)
      await $.theme.set(LOOK)
      const u = await $.session.usage()
      await update($, usage, () => toUsage(u.context.percent, u.rateLimits, u.cost?.usd))
    } catch {}
    return next(e)
  })

  // A new request: the card shows it, and Claude drives by.
  on('prompt.submit', async ($, e, next) => {
    try {
      const now = await $.clock.now()
      const task = (typeof e.text === 'string' ? e.text : '').split('\n').find(l => l.trim().length > 0)?.trim() ?? 'New request'
      const fresh: Job = { status: 'working', task, question: null, stopped: false, startedAt: now, endedAt: null, tools: 0 }
      await update($, job, () => fresh)

      stopTicker()
      tick = 0
      let lastShape = clockShape(0)
      ticker = $.clock.every(350, () => {
        tick += 1
        if (bandId !== undefined) {
          void $.ui.blit({ requestId: bandId, key: 'rider', cells: riderCells(tick % 2), columns: RIDER_COLUMNS, rows: RIDER_ROWS })
        }
        if (bandId !== undefined) {
          // The terminal prints the elapsed time as text: about once a second.
          if (tick % 3 === 0) $.ui.invalidate('ui.render')
        } else {
          // The desktop card counts by itself; redraw only when the clock's layout changes.
          const shape = clockShape(tick * 0.35)
          if (shape !== lastShape) {
            lastShape = shape
            $.ui.invalidate('ui.render')
          }
        }
      })
    } catch {}
    return next(e)
  })

  // Each main-thread tool call is a step. A question to the person waits on them.
  on('tool.call', async ($, e, next) => {
    const main = e.agentId === undefined
    if (main) {
      try {
        const input = e as unknown as Record<string, unknown>
        const question = e.tool === 'AskUserQuestion' ? firstQuestion(input) : null
        await update($, job, (j): Job | null =>
          !j || j.endedAt !== null ? j : { ...j, tools: j.tools + 1, ...(question ? { status: 'input' as const, question } : { status: 'working' as const, question: null }) },
        )
      } catch {}
    }
    const result = await next(e)
    if (main) {
      try {
        await update($, job, (j): Job | null => (j && j.endedAt === null && j.status === 'input' ? { ...j, status: 'working', question: null } : j))
      } catch {}
    }
    return result
  })

  // A permission ask: the card says what Claude wants to do.
  on('classic.PermissionRequest', async ($, e, next) => {
    try {
      const question = askTitle(e.tool_name, (e.tool_input ?? {}) as Record<string, unknown>)
      await update($, job, (j): Job | null => (j && j.endedAt === null ? { ...j, status: 'input', question } : j))
    } catch {}
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      stopTicker()
      try {
        const now = await $.clock.now()
        const failed = e.reason === 'error' || e.reason === 'refusal'
        await update($, job, (j): Job | null =>
          j && j.endedAt === null ? { ...j, status: failed || e.isAborted ? 'error' : 'done', stopped: e.isAborted && !failed, question: null, endedAt: now } : j,
        )
      } catch {}
    }
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    try {
      await update($, usage, () => toUsage(e.context.percent, e.rateLimits, e.cost?.usd))
    } catch {}
    return next(e)
  })

  on('session.end', ($, e, next) => {
    stopTicker()
    return next(e)
  })

  // ─── The spinner: Claude rides while it works ─────────────────────────────
  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    if (e.surface === 'terminal') return next({ ...e, props: { ...e.props, word: `🛵 ${e.props.word}` } })
    if (e.surface === 'desktop' || e.surface === 'vscode') {
      const { Box, Svg } = $.ui.resolve(e)
      return (
        <Box flexDirection="row" alignItems="center" gap={1}>
          <Svg source={riderVector({ moving: true, width: 52 })} alt="Claude riding a Presto scooter" width={52} height={27} />
          {await next(e)}
        </Box>
      )
    }
    return next(e)
  })

  // ─── The Presto Dev card above the prompt ────────────────────────────────
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    if (e.surface !== 'terminal' && e.surface !== 'desktop' && e.surface !== 'vscode') return next(e)
    bandId = e.surface === 'terminal' ? e.requestId : undefined

    const j = await read($, job)
    const u = (await read($, usage)) as Usage
    const now = await $.clock.now()
    const live = j !== null && j.endedAt === null

    const status: JobStatus = j?.status ?? 'done'
    const label = j === null ? 'Ready' : j.stopped ? 'Stopped' : LABEL[status]
    const task = j === null ? 'Ready for your first request' : status === 'input' && j.question ? j.question : j.task
    const elapsed = j === null ? '0s' : clock((j.endedAt ?? now) - j.startedAt)
    const steps = j?.tools ?? 0
    const context = pct(u.context)
    const week = pct(u.week?.percent)
    const resets = resetsLabel(u.week?.resetsAt)
    const fiveHour = pct(u.fiveHour?.percent)
    const fiveResets = timeLabel(u.fiveHour?.resetsAt)
    const cost = costLabel(u.cost)

    const { Box, Text } = $.ui.resolve(e)

    // ── Terminal: the pixel rider and three plain lines, same fields.
    if (e.surface === 'terminal') {
      const { Raster } = $.ui.resolve(e)
      const showRider = e.props.bodyColumns >= 70 && e.props.maxRows >= RIDER_ROWS
      const tone = { working: '#FF4A1A', input: '#FFB547', done: '#3DDC97', error: '#FF4D6A' }[status]
      const meterColor = (p: number) => (p >= 85 ? '#FF2D55' : p >= 60 ? '#FFA41C' : PRESTO.brand)
      return (
        <Box flexDirection="row" gap={2}>
          {showRider ? <Raster key="rider" columns={RIDER_COLUMNS} rows={RIDER_ROWS} cells={riderCells(live ? tick % 2 : 'parked')} /> : null}
          <Box flexDirection="column" flexGrow={1} flexShrink={1}>
            <Text wrap="truncate-end">
              <Text color={tone} weight="bold">● {label}</Text>
              <Text color="#FF5C2E" weight="bold">  Presto</Text>
              <Text dimColor> mode · {elapsed} · {steps} steps{cost === undefined ? '' : ` · ${cost}`}</Text>
            </Text>
            <Text wrap="truncate-end">
              <Text dimColor>Context </Text>
              <Text color={meterColor(context)}>{bar(context)}</Text>
              <Text weight="bold" tabular> {context}%</Text>
              <Text dimColor> {NOTE[meterLevel(context)]}   5-hour </Text>
              <Text color={meterColor(fiveHour)}>{bar(fiveHour)}</Text>
              <Text weight="bold" tabular> {fiveHour}%</Text>
              <Text dimColor> Resets {fiveResets}</Text>
            </Text>
            <Text wrap="truncate-end">
              <Text dimColor>Week </Text>
              <Text color={meterColor(week)}>{bar(week)}</Text>
              <Text weight="bold" tabular> {week}%</Text>
              <Text dimColor> Resets {resets}</Text>
            </Text>
          </Box>
        </Box>
      )
    }

    // ── Desktop and VS Code: the hand-off card, drawn as one SVG.
    const runFor = live && j !== null ? (now - j.startedAt) / 1000 : undefined
    const key = JSON.stringify([e.surface, status, label, task, steps, context, fiveHour, fiveResets, week, resets, cost ?? null, j?.startedAt ?? null, runFor === undefined ? elapsed : clockShape(runFor)])
    if (card === undefined || card.key !== key) {
      const from: { context?: { pct: number; at: number }; five?: { pct: number; at: number }; week?: { pct: number; at: number } } = {}
      for (const [name, value] of [['context', context], ['five', fiveHour], ['week', week]] as const) {
        const m = meters[name]
        if (m === undefined) meters[name] = { pct: value }
        else if (m.pct !== value) meters[name] = { pct: value, from: { pct: m.pct, at: now } }
        const f = meters[name]!.from
        if (f) from[name] = f
      }
      const sentAt = j?.startedAt
      card = {
        key,
        source: cardSvg({ status, label, task, elapsed, steps, context, fiveHour, fiveResets, week, resets, now, ...(cost !== undefined ? { cost } : {}), ...(j?.endedAt ? { doneAt: j.endedAt } : {}), ...(sentAt !== undefined ? { sentAt } : {}), ...(runFor !== undefined ? { liveFrom: runFor } : {}), from }),
        alt: `Presto Dev. ${label}. ${runFor === undefined ? `${elapsed}, ` : ''}${steps} steps${cost === undefined ? '' : `, ${cost}`}. Context ${context}%, 5-hour ${fiveHour}% (resets ${fiveResets}), week ${week}% (resets ${resets}).`,
      }
    }

    const { Svg } = $.ui.resolve(e)
    return (
      <Svg
        source={card.source}
        alt={card.alt}
      />
    )
  })
}

function toUsage(contextPercent: number | undefined, limits: readonly { kind: string; percentUsed: number; resetsAt?: string }[], usd?: number): Usage {
  const five = limits.find(l => l.kind === 'five_hour')
  const week = limits.find(l => l.kind === 'seven_day')
  return {
    ...(contextPercent === undefined ? {} : { context: contextPercent }),
    ...(five ? { fiveHour: { percent: five.percentUsed, ...(five.resetsAt ? { resetsAt: five.resetsAt } : {}) } } : {}),
    ...(week ? { week: { percent: week.percentUsed, ...(week.resetsAt ? { resetsAt: week.resetsAt } : {}) } } : {}),
    ...(usd === undefined ? {} : { cost: usd }),
  }
}
