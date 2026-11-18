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

test('the card says what Claude is doing, then what it changed', async ($, on) => {
  engine(on)
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('tool.call', () => ({ result: {} }))
  on('turn.complete', () => ({ text: '' }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  for (const surface of ['terminal', 'desktop'] as const) {
    const before = await $.ui.mount({ ...BAND, surface })
    expect((await before.find({ type: 'Text', text: /Ready when you are/ }))?.text).toContain('Ready when you are')
    await before.unmount()
  }

  await $.prompt.submit({ text: 'add a dbt model' } as never)
  await $.tool.call({ tool: 'Edit', file_path: '/repo/models/orders_daily.sql', old_string: 'a', new_string: 'b' })

  const working = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect((await working.find({ type: 'Text', text: /^Editing orders_daily\.sql$/ }))?.text).toBe('Editing orders_daily.sql')
  await working.unmount()

  await $.turn.complete({ answer: 'done', durationMs: 4000, isAborted: false, turnId: 't1', reason: 'answer' })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect((await ui.find({ type: 'Text', text: /^Done$/ }))?.text).toBe('Done')
    expect((await ui.find({ type: 'Text', text: /1 file changed/ }))?.text).toContain('1 file changed')
    expect((await ui.find({ type: 'Text', text: /orders_daily\.sql/ }))?.text).toContain('orders_daily.sql')
    expect(JSON.stringify((await ui.find({ type: 'Text', text: /Received|Preparing|On the way|Delivered/ })) ?? null)).toBe('null')
    await ui.unmount()
  }
})

test('usage meters show context, 5-hour and weekly use', async ($, on) => {
  engine(on)
  on('session.measure', (_, e) => ({ changed: e.changed }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.session.measure({
    context: { window: 1_000_000, tokens: 420_000, percent: 42 },
    rateLimits: [
      { kind: 'five_hour', percentUsed: 73 },
      { kind: 'seven_day', percentUsed: 18.5 },
    ],
    changed: ['context', 'rateLimits'],
  })

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /^ 42%$/ }))?.text).toBe(' 42%')
  expect((await ui.find({ type: 'Text', text: /^ 73%$/ }))?.text).toBe(' 73%')
  expect((await ui.find({ type: 'Text', text: /^ 19%$/ }))?.text).toBe(' 19%')
  await ui.unmount()

  const desk = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(((await desk.find({ type: 'Svg', props: { alt: 'Context 42%, 5-hour 73%, Week 19%' } } as never)) as { type?: string } | undefined)?.type).toBe('Svg')
  await desk.unmount()
})

test('the spinner keeps its words and the rider rides on desktop', async ($, on) => {
  engine(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const SPIN = { plugin: 'presto', component: 'Spinner', requestId: 'main', props: { word: 'Sauteing', message: null, suffix: '…', mode: 'tool-use' } } as const

  const desk = await $.ui.mount({ ...SPIN, surface: 'desktop' })
  expect((await desk.find({ type: 'Svg' }))?.type).toBe('Svg')
  await desk.unmount()
})

test('the desktop card is ink with the Presto logo instead of the word', async ($, on) => {
  engine(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(((await ui.find({ type: 'Box', props: { backgroundColor: '#16141A' } } as never)) as { type?: string } | undefined)?.type).toBe('Box')
  expect(((await ui.find({ type: 'Svg', props: { alt: 'Presto' } } as never)) as { type?: string } | undefined)?.type).toBe('Svg')
  expect(JSON.stringify((await ui.find({ type: 'Text', text: /PRESTO/ })) ?? null)).toBe('null')
  await ui.unmount()
})
