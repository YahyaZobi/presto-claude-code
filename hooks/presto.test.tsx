import { expect, test } from 'claude-code/testing'

const BAND = {
  plugin: 'presto',
  component: 'AbovePrompt',
  requestId: 'band',
  props: {
    hasSurvey: false,
    isCollapsed: false,
    isWorking: false,
    maxRows: 8,
    bodyColumns: 120,
    scroll: { offset: 0, bodyRows: 8 },
    view: {},
  },
} as const

// Stand-ins for the engine calls the mod makes.
function engine(on: any) {
  const store = new Map<string, unknown>()
  let now = 1_763_500_000_000
  on('clock.after', () => ({ value: {} }))
  on('clock.every', () => ({ value: {} }))
  on('theme.set', () => ({ value: { isDrawn: true } }))
  on('clock.now', () => ({ value: (now += 1000) }))
  on('session.usage', () => ({ value: { startedAt: now, context: { window: 1_000_000 }, rateLimits: [] } }))
  on('store.get', (_: unknown, e: { key: string }) => ({ value: store.get(e.key) }))
  on('store.set', (_: unknown, e: { key: string; value: unknown }) => (store.set(e.key, e.value), { value: undefined }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.blit', () => ({ value: {} }))
  on('session.start', (_: unknown, e: { cwd: string }) => ({ cwd: e.cwd }))
}

const svgOf = async (ui: { find: (q: never) => Promise<unknown> }) =>
  ((await ui.find({ type: 'Svg' } as never)) as { props?: { source?: string } } | undefined)?.props?.source ?? ''

test('a request becomes the card: working, steps, then done', async ($, on) => {
  engine(on)
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('tool.call', () => ({ result: {} }))
  on('turn.complete', () => ({ text: '' }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  await $.prompt.submit({ text: 'Add marketplace, MIT license and install section, then validate' } as never)
  await $.tool.call({ tool: 'Edit', file_path: '/repo/a.ts', old_string: 'a', new_string: 'b' })
  await $.tool.call({ tool: 'Read', file_path: '/repo/b.ts' })

  const working = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const w = await svgOf(working)
  expect(w).toContain('>Working<')
  expect(w).toContain('Add marketplace, MIT license and install section, then validate')
  expect(w).toContain('2 steps')
  expect(w).toContain('Presto</tspan>')
  expect(w).toContain('#FF4A1A')
  expect(w).toContain('class="pm-ride"')
  await working.unmount()

  await $.turn.complete({ answer: 'done', durationMs: 4000, isAborted: false, turnId: 't1', reason: 'answer' })
  const done = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const d = await svgOf(done)
  expect(d).toContain('>Done<')
  expect(d).toContain('#3DDC97')
  expect(d.includes('class="pm-pulse"')).toBe(false)
  await done.unmount()

  const term = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await term.find({ type: 'Text', text: /● Done/ }))?.text).toContain('Done')
  await term.unmount()
})

test('a question to the person shows "Needs your input", and a failure shows "Failed"', async ($, on) => {
  engine(on)
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('tool.call', () => ({ result: {} }))
  on('turn.complete', () => ({ text: '' }))
  on('classic.PermissionRequest', () => ({}))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.prompt.submit({ text: 'Ship it' } as never)

  // A permission ask: the card says what Claude wants to do.
  await ($ as any).classic.PermissionRequest({ tool_name: 'Bash', tool_input: { command: 'npm publish --access public' } })
  const asking = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const seen = await svgOf(asking)
  await asking.unmount()
  expect(seen).toContain('Needs your input')
  expect(seen).toContain('Allow Bash: npm publish --access public?')
  expect(seen).toContain('#FFB547')

  // Once the tool runs, it is back to work.
  await $.tool.call({ tool: 'Bash', command: 'npm publish --access public' })

  const after = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await svgOf(after)).toContain('>Working<')
  await after.unmount()

  await $.turn.complete({ answer: '', durationMs: 1000, isAborted: false, turnId: 't2', reason: 'error' })
  const failed = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const f = await svgOf(failed)
  expect(f).toContain('>Failed<')
  expect(f).toContain('#FF4D6A')
  await failed.unmount()
})

test('meters switch level at 60% and 85%, and Week shows the reset time', async ($, on) => {
  engine(on)
  on('session.measure', (_, e) => ({ changed: e.changed }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.session.measure({
    context: { window: 1_000_000, tokens: 620_000, percent: 62 },
    rateLimits: [{ kind: 'seven_day', percentUsed: 88, resetsAt: '2026-11-24T06:00:00Z' }],
    changed: ['context', 'rateLimits'],
  })
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const s = await svgOf(ui)
  expect(s).toContain('>62<tspan')
  expect(s).toContain('Filling up')
  expect(s).toContain('#FFA41C')
  expect(s).toContain('>88<tspan')
  expect(s).toContain('#FF2D55')
  expect(s).toContain('Resets ')
  await ui.unmount()

  await $.session.measure({ context: { window: 1_000_000, tokens: 900_000, percent: 91 }, rateLimits: [], changed: ['context'] } as never)
  const hot = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await svgOf(hot)).toContain('Compacting soon')
  await hot.unmount()
})

test('a long title stays on one line with an ellipsis', async ($, on) => {
  engine(on)
  on('prompt.submit', (_, e) => ({ text: e.text }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const long = 'Refactor the warehouse ingestion pipeline so that every dbt model in the orders domain is incremental and documented'
  await $.prompt.submit({ text: long } as never)
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const s = await svgOf(ui)
  expect(s).toContain(`<title>${long}</title>`)
  expect(s).toContain('…</text>')
  expect(s).toContain('prefers-reduced-motion')
  await ui.unmount()
})

test('the spinner keeps its words and the rider rides on desktop', async ($, on) => {
  engine(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const SPIN = { plugin: 'presto', component: 'Spinner', requestId: 'main', props: { word: 'Sauteing', message: null, suffix: '…', mode: 'tool-use' } } as const
  const desk = await $.ui.mount({ ...SPIN, surface: 'desktop' })
  expect((await desk.find({ type: 'Svg' }))?.type).toBe('Svg')
  await desk.unmount()
})

test('the card keeps the same markup while only time passes, so it never blinks', async ($, on) => {
  engine(on)
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('tool.call', () => ({ result: {} }))
  on('turn.complete', () => ({ text: '' }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.prompt.submit({ text: 'Tidy the README' } as never)

  // Each mount reads the clock, which moves a second each time.
  const a = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const first = await svgOf(a)
  const svgEl = (await a.find({ type: 'Svg' } as never)) as { props?: { isInteractive?: boolean } }
  expect(svgEl.props?.isInteractive).toBeUndefined()
  // No sweeping glare.
  expect(first).not.toContain('pm-glare')
  await a.unmount()
  const b = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const second = await svgOf(b)
  await b.unmount()
  expect(second).toBe(first)
  // The running clock counts up inside the SVG.
  expect(first).toContain('<animate attributeName="visibility"')

  // A new step is something to show: the card is rebuilt.
  await $.tool.call({ tool: 'Read', file_path: '/repo/b.ts' })
  const c = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const third = await svgOf(c)
  await c.unmount()
  expect(third).not.toBe(first)
  expect(third).toContain('1 steps')

  // Done: redraws from anywhere else leave it alone.
  await $.turn.complete({ answer: 'done', durationMs: 4000, isAborted: false, turnId: 't1', reason: 'answer' })
  const d1 = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const done1 = await svgOf(d1)
  await d1.unmount()
  const d2 = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await svgOf(d2)).toBe(done1)
  expect(done1).not.toContain('<animate attributeName="visibility"')
  await d2.unmount()
})
