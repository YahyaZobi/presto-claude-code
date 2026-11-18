import { atom, read, update } from 'claude-code'
import type { Register, ThemeSetArgs } from 'claude-code'

import type { Job, Usage } from '../types'
import { PRESTO, RIDER_COLUMNS, RIDER_ROWS, riderCells } from './art'
import { BRAND, logoSvg, metersSvg, riderVector, streetSvg } from './scene'
import type { MeterSpec } from './scene'
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

const WRITE_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit'])

// ─── Small helpers ──────────────────────────────────────────────────────────
const base = (path: string) => path.split('/').filter(Boolean).pop() ?? path
const clock = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000))
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`
}
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const resetsLabel = (iso?: string) => {
  if (!iso) return undefined
  try {
    const at = new Date(iso)
    const soon = at.getTime() - Date.now() < 20 * 3600_000
    return new Intl.DateTimeFormat(undefined, soon ? { hour: '2-digit', minute: '2-digit' } : { weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(at)
  } catch {
    return undefined
  }
}
const bar = (pct: number, width = 8) => {
  const filled = Math.round((Math.min(100, Math.max(0, pct)) / 100) * width)
  return '▰'.repeat(filled) + '▱'.repeat(width - filled)
}

/** What a tool call means, in a few words. */
function describe(tool: string, input: Record<string, unknown>): string {
  const file = typeof input.file_path === 'string' ? input.file_path : typeof input.notebook_path === 'string' ? input.notebook_path : undefined
  const pattern = typeof input.pattern === 'string' ? input.pattern : undefined
  switch (tool) {
    case 'Edit':
    case 'MultiEdit':
    case 'NotebookEdit':
      return file ? `Editing ${base(file)}` : 'Editing a file'
    case 'Write':
      return file ? `Writing ${base(file)}` : 'Writing a file'
    case 'Read':
      return file ? `Reading ${base(file)}` : 'Reading a file'
    case 'Bash':
      return typeof input.description === 'string' && input.description.length > 0 ? input.description : 'Running a command'
    case 'Grep':
    case 'Glob':
      return pattern ? `Searching for ${pattern}` : 'Searching the code'
    case 'WebSearch':
    case 'WebFetch':
      return 'Looking it up on the web'
    case 'Agent':
    case 'Task':
      return 'Working with a helper agent'
    default:
      return tool.startsWith('mcp__') ? `Using ${tool.split('__')[1] ?? 'a connector'}` : `Using ${tool}`
  }
}

export const register: Register = on => {
  // Module values: lost on a reload, and only used to animate a live request.
  let ticker: { cancel: () => void } | undefined
  let tick = 0
  let bandId: string | undefined

  const stopTicker = () => {
    ticker?.cancel?.()
    ticker = undefined
  }

  on('session.start', async ($, e, next) => {
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))
    if (unpainted !== undefined) $.ui.toast(`presto: ${unpainted}`)
    await $.theme.set(LOOK)
    const u = await $.session.usage()
    await update($, usage, () => toUsage(u.context.percent, u.rateLimits))
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    // The card is decoration: never let it hold up a prompt.
    try {
      const now = await $.clock.now()
      const fresh: Job = { status: 'working', startedAt: now, endedAt: null, activity: 'Thinking', files: [], tools: 0 }
      await update($, job, () => fresh)

      stopTicker()
      tick = 0
      ticker = $.clock.every(350, () => {
        tick += 1
        if (bandId !== undefined) {
          void $.ui.blit({ requestId: bandId, key: 'rider', cells: riderCells(tick % 2), columns: RIDER_COLUMNS, rows: RIDER_ROWS })
        }
        if (tick % 3 === 0) $.ui.invalidate('ui.render')
      })
    } catch {}
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    if (e.agentId === undefined) try {
      const input = e as unknown as Record<string, unknown>
      const path = typeof input.file_path === 'string' ? input.file_path : typeof input.notebook_path === 'string' ? input.notebook_path : undefined
      const isWrite = WRITE_TOOLS.has(e.tool) && path !== undefined
      const activity = describe(e.tool, input)
      await update($, job, (j): Job | null => {
        if (!j || j.endedAt !== null) return j
        const files = isWrite && !j.files.includes(path!) ? [...j.files, path!] : j.files
        return { ...j, activity, tools: j.tools + 1, files }
      })
    } catch {}
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      stopTicker()
      const now = await $.clock.now()
      await update($, job, (j): Job | null => (j && j.endedAt === null ? { ...j, status: e.isAborted ? 'stopped' : 'done', endedAt: now, activity: null } : j))
    }
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    await update($, usage, () => toUsage(e.context.percent, e.rateLimits))
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

  // ─── The card above the prompt: the request and usage ─────────────────────
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    if (e.surface !== 'terminal' && e.surface !== 'desktop' && e.surface !== 'vscode') return next(e)
    bandId = e.surface === 'terminal' ? e.requestId : undefined

    const j = await read($, job)
    const u = (await read($, usage)) as Usage
    const now = await $.clock.now()
    const live = j !== null && j.endedAt === null
    const elapsed = j === null ? '' : clock((j.endedAt ?? now) - j.startedAt)
    const { Box, Text } = $.ui.resolve(e)

    // The headline: what is happening, or what happened.
    const title =
      j === null ? 'Ready when you are' : live ? (j.activity ?? 'Working') : j.status === 'stopped' ? 'Stopped' : 'Done'
    const facts =
      j === null
        ? ['Ask for anything to get started']
        : [
            elapsed,
            ...(j.files.length > 0 ? [plural(j.files.length, 'file') + ' changed'] : live ? [] : ['no files changed']),
            ...(j.tools > 0 ? [plural(j.tools, 'step')] : []),
          ]
    const files = j === null || j.files.length === 0 ? null : j.files.map(base).join('  ·  ')

    const specs: MeterSpec[] = [
      ...(u.context === undefined ? [] : [{ label: 'Context', percent: u.context }]),
      ...(u.fiveHour ? [{ label: '5-hour', percent: u.fiveHour.percent, ...(resetsLabel(u.fiveHour.resetsAt) ? { note: `resets ${resetsLabel(u.fiveHour.resetsAt)}` } : {}) }] : []),
      ...(u.week ? [{ label: 'Week', percent: u.week.percent, ...(resetsLabel(u.week.resetsAt) ? { note: `resets ${resetsLabel(u.week.resetsAt)}` } : {}) }] : []),
    ]

    // ── Terminal: the pixel rider and three plain lines.
    if (e.surface === 'terminal') {
      const { Raster } = $.ui.resolve(e)
      const showRider = e.props.bodyColumns >= 70 && e.props.maxRows >= RIDER_ROWS
      const meterColor = (pct: number) => (pct >= 90 ? PRESTO.red : pct >= 70 ? PRESTO.gold : PRESTO.o500)
      return (
        <Box flexDirection="row" gap={2}>
          {showRider ? <Raster key="rider" columns={RIDER_COLUMNS} rows={RIDER_ROWS} cells={riderCells(live ? tick % 2 : 'parked')} /> : null}
          <Box flexDirection="column" flexGrow={1} flexShrink={1}>
            <Text wrap="truncate-end">
              <Text color={PRESTO.brand} weight="bold">PRESTO </Text>
              <Text weight="bold">{title}</Text>
              <Text dimColor> · {facts.join(' · ')}</Text>
            </Text>
            {files === null ? null : <Text wrap="truncate-end" dimColor>{files}</Text>}
            {specs.length === 0 ? (
              <Text dimColor>Usage appears after the first reply</Text>
            ) : (
              <Box flexDirection="row" columnGap={3} flexWrap="wrap">
                {specs.map(m => (
                  <Text key={m.label}>
                    <Text dimColor>{m.label} </Text>
                    <Text color={meterColor(m.percent)}>{bar(m.percent)}</Text>
                    <Text weight="bold" tabular> {Math.round(m.percent)}%</Text>
                    {m.note ? <Text dimColor> {m.note}</Text> : null}
                  </Text>
                ))}
              </Box>
            )}
          </Box>
        </Box>
      )
    }

    // ── Desktop and VS Code: an ink card with the logo, the street and the meters.
    const { Svg } = $.ui.resolve(e)
    const cols = e.props.bodyColumns
    const wide = cols >= 96
    const metersWidth = wide ? 360 : 300
    return (
      <Box
        flexDirection="row"
        alignItems="center"
        gap={2}
        backgroundColor={BRAND.ink}
        borderStyle="round"
        borderColor={BRAND.line}
        paddingX={2}
        paddingY={1}
      >
        <Svg source={logoSvg(44)} alt="Presto" width={44} height={44} />
        <Box flexDirection="column" flexGrow={1} flexShrink={1} gap="xs">
          <Text wrap="truncate-end">
            {live ? <Text color={BRAND.red}>● </Text> : j?.status === 'done' ? <Text color={BRAND.dot}>✓ </Text> : null}
            <Text color={BRAND.text} weight="bold">{title}</Text>
          </Text>
          <Text wrap="truncate-end" size="footnote" color={BRAND.soft} tabular>
            {facts.join('   ·   ')}
          </Text>
          {files === null ? null : (
            <Text wrap="truncate-end" size="footnote" color={BRAND.faint}>
              {files}
            </Text>
          )}
          {specs.length === 0 ? (
            <Text size="footnote" color={BRAND.faint}>Usage appears after the first reply</Text>
          ) : (
            <Svg
              source={metersSvg(specs, metersWidth)}
              alt={specs.map(m => `${m.label} ${Math.round(m.percent)}%`).join(', ')}
              width={metersWidth}
              height={specs.some(m => m.note) ? 46 : 30}
            />
          )}
        </Box>
        {wide ? (
          <Svg
            source={streetSvg({ moving: live, width: 216 })}
            alt={live ? 'Claude riding a Presto scooter' : 'Claude on a parked Presto scooter'}
            width={216}
            height={68}
          />
        ) : null}
      </Box>
    )
  })
}

function toUsage(contextPercent: number | undefined, limits: readonly { kind: string; percentUsed: number; resetsAt?: string }[]): Usage {
  const five = limits.find(l => l.kind === 'five_hour')
  const week = limits.find(l => l.kind === 'seven_day')
  return {
    ...(contextPercent === undefined ? {} : { context: contextPercent }),
    ...(five ? { fiveHour: { percent: five.percentUsed, ...(five.resetsAt ? { resetsAt: five.resetsAt } : {}) } } : {}),
    ...(week ? { week: { percent: week.percentUsed, ...(week.resetsAt ? { resetsAt: week.resetsAt } : {}) } } : {}),
  }
}
