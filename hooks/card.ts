// The Presto mode status card (hand-off v3), ported from the reference Web
// Component to one SVG. Every value comes from the pack's tokens.json.
//
// The card is redrawn as its values change. Each loop is phased off the wall
// clock (a negative animation-delay of `now % period`), so a redraw lands on
// the same frame the last one was showing: updates never restart the motion.

import { FONT_FACES, INTER_METRICS, INTER_WIDTHS, MONO_ADVANCE, MONO_METRICS } from './fonts'

export type CardStatus = 'working' | 'input' | 'done' | 'error'

export type CardData = {
  status: CardStatus
  /** Overrides the pill label (for example "Stopped" for a cancelled request). */
  label?: string
  task: string
  elapsed: string
  steps: number
  context: number
  /** The 5-hour limit, 0 to 100, and when it resets ("3:40 PM"). */
  fiveHour: number
  fiveResets: string
  week: number
  resets: string
  /** What the session has cost so far ("$1.84"); absent, no cost is shown. */
  cost?: string
  /**
   * Where the logo sits: `tile`, the 80 px tile on the left; `compact`, a 56 px
   * tile; `inline`, a small badge in the header so the meters take the full width.
   */
  logo?: 'tile' | 'compact' | 'inline'
  /** When the request finished, in ms: on Done, Claude delivers a Presto box. */
  doneAt?: number
  /** The wall clock, in ms: phases every loop. */
  now: number
  /** When the request was sent, in ms: the rider drives by right after. */
  sentAt?: number
  /**
   * Seconds the request has run, at `now`, while it is still running. Given, the
   * clock counts up inside the SVG itself, so the card need not be redrawn each second.
   */
  liveFrom?: number
  /** Meter values a moment ago and when they changed, to animate the fill. */
  from?: { context?: { pct: number; at: number }; five?: { pct: number; at: number }; week?: { pct: number; at: number } }
}

// ─── tokens.json ────────────────────────────────────────────────────────────
const C = {
  surface: '#0F0D12',
  surfaceHigh: '#17141A',
  text: '#F5F1EF',
  textMuted: '#A9A1A6',
  textSubtle: '#8F888E',
  meta: '#B6AEB3',
  separator: '#4F494E',
  knob: '#FFF6F0',
  brandTag: '#FF5C2E',
} as const

const STATUS = {
  working: { label: 'Working', tone: '#FF4A1A', bg: 'rgba(255,74,26,0.13)', ring: 'rgba(255,74,26,0.36)', text: '#FFAE94', glow: 'rgba(255,72,20,0.14)', edge: 'rgba(255,74,26,0.32)', pulse: true },
  input: { label: 'Needs your input', tone: '#FFB547', bg: 'rgba(255,181,71,0.12)', ring: 'rgba(255,181,71,0.34)', text: '#FFD592', glow: 'rgba(255,181,71,0.15)', edge: 'rgba(255,181,71,0.32)', pulse: true },
  done: { label: 'Done', tone: '#3DDC97', bg: 'rgba(61,220,151,0.11)', ring: 'rgba(61,220,151,0.32)', text: '#9DF2CB', glow: 'rgba(61,220,151,0.12)', edge: 'rgba(61,220,151,0.28)', pulse: false },
  error: { label: 'Failed', tone: '#FF4D6A', bg: 'rgba(255,77,106,0.13)', ring: 'rgba(255,77,106,0.36)', text: '#FFA7B5', glow: 'rgba(255,77,106,0.15)', edge: 'rgba(255,77,106,0.32)', pulse: false },
} as const

type Level = 'ok' | 'warn' | 'hot'
const LEVEL = {
  ok: { stops: [['0', '#FF3000'], ['0.45', '#FF5A10'], ['1', '#FF8E00']], glow: 'rgba(255,72,20,0.45)', ring: 'rgba(255,90,20,0.32)', value: '#F5F1EF', note: 'Plenty of room', noteColor: '#8F888E' },
  warn: { stops: [['0', '#FFA41C'], ['1', '#FFD15C']], glow: 'rgba(255,190,70,0.45)', ring: 'rgba(255,190,70,0.34)', value: '#FFD98A', note: 'Filling up', noteColor: '#E8BC6A' },
  hot: { stops: [['0', '#FF2D55'], ['1', '#FF5C8A']], glow: 'rgba(255,45,85,0.6)', ring: 'rgba(255,45,85,0.4)', value: '#FF9BB4', note: 'Compacting soon', noteColor: '#FF8FA8' },
} as const

/** Meter level thresholds: 0–59 ok, 60–84 warn, 85–100 hot. */
export const meterLevel = (pct: number): Level => (pct >= 85 ? 'hot' : pct >= 60 ? 'warn' : 'ok')

const W = 720
const H_TILE = 148
const R = 22
const PAD = { top: 22, right: 26, bottom: 22, left: 24 }
const SANS = `Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif`
const MONO = `'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace`

// ─── Text layout ────────────────────────────────────────────────────────────
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function measure(text: string, size: number, weight: 400 | 500 | 600, spacingEm = 0): number {
  const table = INTER_WIDTHS[weight]!
  let em = 0
  for (const ch of text) em += table[ch] ?? 0.62
  return (em + spacingEm * [...text].length) * size
}
const monoWidth = (text: string, size: number) => [...text].length * MONO_ADVANCE * size

function truncate(text: string, max: number, size: number, weight: 400 | 500 | 600, spacingEm = 0): string {
  if (measure(text, size, weight, spacingEm) <= max) return text
  const chars = [...text]
  while (chars.length > 0 && measure(chars.join('').trimEnd() + '…', size, weight, spacingEm) > max) chars.pop()
  return chars.join('').trimEnd() + '…'
}

/** The baseline of a line box, as CSS places it. */
const baseline = (top: number, lineHeight: number, size: number, mono = false) => {
  const m = mono ? MONO_METRICS : INTER_METRICS
  return top + (lineHeight - (m.ascender + m.descender) * size) / 2 + m.ascender * size
}

// ─── Pieces ─────────────────────────────────────────────────────────────────
/** assets/presto-logo-rendered.svg, unchanged: geometry, lighting and rim. */
const LOGO_SVG =
  `<svg viewBox="0 0 512 512">` +
  `<defs>` +
  `<clipPath id="pClip"><rect width="512" height="512" rx="75.8"/></clipPath>` +
  `<radialGradient id="pSpec" gradientUnits="userSpaceOnUse" cx="140" cy="-20" r="420"><stop offset="0" stop-color="#FFA27A" stop-opacity="0.42"/><stop offset="0.45" stop-color="#FF7A45" stop-opacity="0.18"/><stop offset="1" stop-color="#FF3000" stop-opacity="0"/></radialGradient>` +
  `<linearGradient id="pShade" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="512"><stop offset="0.55" stop-color="#7A0E00" stop-opacity="0"/><stop offset="1" stop-color="#7A0E00" stop-opacity="0.26"/></linearGradient>` +
  `<radialGradient id="pBounce" gradientUnits="userSpaceOnUse" cx="400" cy="560" r="260"><stop offset="0" stop-color="#FF6A2A" stop-opacity="0.35"/><stop offset="1" stop-color="#FF6A2A" stop-opacity="0"/></radialGradient>` +
  `<linearGradient id="pRim" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="512"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.5"/><stop offset="0.2" stop-color="#FFFFFF" stop-opacity="0.1"/><stop offset="0.6" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="1" stop-color="#FFD2BF" stop-opacity="0.14"/></linearGradient>` +
  `<linearGradient id="pInk" gradientUnits="userSpaceOnUse" x1="0" y1="70" x2="0" y2="440"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#FFF5F0"/></linearGradient>` +
  `<radialGradient id="pDot" cx="0.36" cy="0.3" r="0.78"><stop offset="0" stop-color="#FFAA38"/><stop offset="0.55" stop-color="#FF8E00"/><stop offset="1" stop-color="#F77F00"/></radialGradient>` +
  `<filter id="pLift" x="-15%" y="-15%" width="130%" height="140%"><feDropShadow dx="0" dy="9" stdDeviation="9" flood-color="#6E1000" flood-opacity="0.42"/></filter>` +
  `</defs>` +
  `<g clip-path="url(#pClip)">` +
  `<rect width="512" height="512" fill="#FF3000"/><rect width="512" height="512" fill="url(#pSpec)"/><rect width="512" height="512" fill="url(#pBounce)"/><rect width="512" height="512" fill="url(#pShade)"/>` +
  `<g filter="url(#pLift)">` +
  `<g fill="none" stroke="url(#pInk)" stroke-width="58.8" stroke-linecap="round" stroke-linejoin="round">` +
  `<path d="M173.2 100.4 L328.27 255.47 A88.7 88.7 0 0 1 202.83 380.91 L173.27 351.35"/><path d="M173 224.2 L261.3 312.5"/>` +
  `</g>` +
  `<circle cx="173" cy="100.3" r="29.2" fill="url(#pDot)"/><circle cx="261.4" cy="312.7" r="29.2" fill="url(#pDot)"/><circle cx="173" cy="351.2" r="29.2" fill="url(#pDot)"/>` +
  `</g></g>` +
  `<rect x="1.5" y="1.5" width="509" height="509" rx="74.3" fill="none" stroke="url(#pRim)" stroke-width="3"/>` +
  `</svg>`

/**
 * The header badge: a flat squircle in Presto red with the mark in white. Flat
 * colour and a single-colour mark stay crisp at 30 px, where the rendered logo's
 * gradients and rim turn muddy.
 */
const BADGE_SVG =
  `<defs><linearGradient id="pbF" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF4A1C"/><stop offset="1" stop-color="#F02C00"/></linearGradient>` +
  `<linearGradient id="pbH" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".3"/><stop offset=".45" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient></defs>` +
  `<rect width="512" height="512" rx="128" fill="url(#pbF)"/>` +
  `<g transform="translate(256 256) scale(1.08) translate(-262 -254)">` +
  `<g fill="none" stroke="#FFFFFF" stroke-width="58.8" stroke-linecap="round" stroke-linejoin="round">` +
  `<path d="M173.2 100.4 L328.27 255.47 A88.7 88.7 0 0 1 202.83 380.91 L173.27 351.35"/><path d="M173 224.2 L261.3 312.5"/></g>` +
  `<g fill="#FFFFFF"><circle cx="173" cy="100.3" r="29.2"/><circle cx="261.4" cy="312.7" r="29.2"/><circle cx="173" cy="351.2" r="29.2"/></g></g>` +
  `<rect x="8" y="8" width="496" height="496" rx="120" fill="none" stroke="url(#pbH)" stroke-width="16"/>`

const icon = (paths: string, x: number, y: number, size: number, stroke: string, width: number) =>
  `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`
const ICON_CLOCK = `<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>`
const ICON_STEPS = `<path d="M3 20h5v-5h5v-5h5V5h3"/>`
const ICON_RESET = `<path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 21v-5h5"/>`

/** A loop's delay so it shows the frame the wall clock says it is on. */
const phase = (now: number, periodMs: number) => `${(-(now % periodMs) / 1000).toFixed(3)}s`

// ─── The rider: Claude's mascot on a Presto scooter, facing right ───────────
// 232 x 120 units; drawn small, it drives along the card's bottom edge right
// after a request is sent, and its wheels turn.
function rider(): string {
  const wheel = (cx: number) =>
    `<circle cx="${cx}" cy="100" r="17" fill="#141218"/><circle cx="${cx}" cy="100" r="10.5" fill="#C9CED5"/>` +
    `<g class="pm-spin" style="transform-origin:${cx}px 100px">` +
    [0, 72, 144, 216, 288].map(a => `<path d="M${cx} 97 L${cx - 1.6} 91 L${cx + 1.6} 91 Z" fill="#7E848D" transform="rotate(${a} ${cx} 100)"/>`).join('') +
    `</g><circle cx="${cx}" cy="100" r="3.2" fill="#5D636B"/>`
  return (
    `<g class="pm-puff" fill="#3A343D"><circle cx="35" cy="100" r="4"/><circle cx="26" cy="97" r="3"/><circle cx="18" cy="100" r="2"/></g>` +
    `<path d="M22 66 L78 66 L86 72" fill="none" stroke="#7E848D" stroke-width="2.6" stroke-linecap="round"/>` +
    `<rect x="14" y="20" width="60" height="46" rx="5" fill="#FF3000"/><rect x="14" y="20" width="60" height="8" rx="4" fill="#FFFFFF" opacity=".12"/>` +
    `<rect x="14" y="58" width="60" height="2.4" fill="#FFFFFF" opacity=".5"/>` +
    `<g transform="translate(27 26) scale(.062)"><g fill="none" stroke="#FFFFFF" stroke-width="58.8" stroke-linecap="round" stroke-linejoin="round"><path d="M173.2 100.4 L328.27 255.47 A88.7 88.7 0 0 1 202.83 380.91 L173.27 351.35"/><path d="M173 224.2 L261.3 312.5"/></g><g fill="#FF8E00"><circle cx="173" cy="100.3" r="29.2"/><circle cx="261.4" cy="312.7" r="29.2"/><circle cx="173" cy="351.2" r="29.2"/></g></g>` +
    `<g class="pm-bob">` +
    `<path d="M108 60 L131 60 L139 87" fill="none" stroke="#D97757" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="M133 84.5 h13 a4 4 0 0 1 0 7 h-15 z" fill="#141218"/>` +
    `<g transform="rotate(-7 104 44)">` +
    `<rect x="86" y="25" width="38" height="37" rx="6" fill="#D97757"/>` +
    `<rect x="108" y="36" width="4.2" height="8.5" rx="1.4" fill="#141218"/><rect x="116" y="36" width="4.2" height="8.5" rx="1.4" fill="#141218"/>` +
    `<path d="M82 31 C82 13 95 7 106 7 C120 7 129 16 129 31 Z" fill="#FF3000"/>` +
    `<path d="M96 9.5 C99.5 8.2 102.5 7.6 105 7.4 L105.5 31 L99 31 Z" fill="#FFFFFF" opacity=".92"/>` +
    `<path d="M114 14 C122 16.5 128 22.5 129 31 L113 31 Z" fill="#20232C" opacity=".9"/>` +
    `<rect x="81" y="29" width="49" height="4.2" rx="2.1" fill="#9E1C00"/>` +
    `</g>` +
    `<path d="M113 45 Q139 50 161 37.5" fill="none" stroke="#D97757" stroke-width="6" stroke-linecap="round"/>` +
    `</g>` +
    `<rect x="42" y="96" width="42" height="7.5" rx="3.75" fill="#C9CED5"/>` +
    `<path d="M35 93 C33 76 46 63 71 62.5 L121 62.5 C131 62.5 133 72 130 82 L125 95 Z" fill="#FF3000"/>` +
    `<path d="M44 76 C50 68.5 62 66 77 66 L106 66" fill="none" stroke="#FFFFFF" stroke-width="2.6" opacity=".4" stroke-linecap="round"/>` +
    `<path d="M66 55.5 L124 55.5 C131 55.5 131 64.5 124 64.5 L66 64.5 C59 64.5 59 55.5 66 55.5 Z" fill="#141218"/>` +
    `<path d="M121 90.5 L160 90.5 L158 98 L119 98 Z" fill="#B21F00"/>` +
    `<path d="M147 98 L162 98 C172 80 178 60 180.5 37.5 L171 36 C168 58 160 78 147 92 Z" fill="#FF3000"/>` +
    `<path d="M178 46 L194 99" stroke="#C9CED5" stroke-width="4.2" stroke-linecap="round"/>` +
    `<path d="M176 88.5 C182 74 206 74 212.5 88.5 L208.5 90.5 C202 80.5 186 80.5 180 90.5 Z" fill="#FF3000"/>` +
    `<path d="M189 38 L236 24 L236 52 Z" fill="#FFF3C4" opacity=".16"/>` +
    `<rect x="165.5" y="31.5" width="21" height="9.5" rx="4.75" fill="#FF3000"/><ellipse cx="187" cy="38" rx="4.2" ry="4.6" fill="#FFF3C4"/>` +
    `<path d="M172 32 L167.5 18" stroke="#7E848D" stroke-width="2" stroke-linecap="round"/><ellipse cx="166.5" cy="15" rx="5.2" ry="3.6" fill="#141218"/>` +
    `<rect x="155.5" y="34" width="12" height="6" rx="3" fill="#141218"/>` +
    wheel(62) +
    wheel(194)
  )
}

/**
 * Which layout the running clock is in: "9s", "59s", "9m 59s", "99m 59s", and so
 * on. Within one, the clock's width stays put and its digits count up by SMIL, so
 * the card only has to be redrawn when this changes.
 */
export function clockShape(seconds: number): string {
  const e = Math.max(0, Math.floor(seconds))
  if (e < 10) return 's1'
  if (e < 60) return 's2'
  const m = Math.floor(e / 60)
  const n = String(m).length
  // Minute labels come in windows of at most 120, so a long run stays small.
  return `m${n}w${Math.floor((m - 10 ** (n - 1)) / 120)}`
}

/** A clock that counts up from `from` seconds by itself (SMIL visibility steps). */
function liveClock(from: number): { chars: number; svg: (x: number, y: number, attrs: string) => string } {
  const e = Math.max(0, Math.floor(from))
  const begin = `${(-Math.max(0, from)).toFixed(3)}s`
  const adv = MONO_ADVANCE * 12
  // One glyph, shown while the clock (in seconds since the request) is in
  // [lo, hi) of each `period`; repeatCount 1 when `period` covers the whole run.
  const glyph = (ch: string, x: number, y: number, attrs: string, period: number, lo: number, hi: number, once = false) => {
    const k = (t: number) => +(t / period).toFixed(6)
    const [values, times] =
      lo === 0 ? (hi >= period ? ['visible', '0'] : ['visible;hidden', `0;${k(hi)}`]) : hi >= period ? ['hidden;visible', `0;${k(lo)}`] : ['hidden;visible;hidden', `0;${k(lo)};${k(hi)}`]
    const repeat = once ? 'repeatCount="1" fill="freeze"' : 'repeatCount="indefinite"'
    return `<text x="${x.toFixed(2)}" y="${y}" ${attrs} visibility="hidden">${ch}<animate attributeName="visibility" calcMode="discrete" dur="${period}s" begin="${begin}" ${repeat} values="${values}" keyTimes="${times}"/></text>`
  }
  const units = (x: number, y: number, a: string) => Array.from({ length: 10 }, (_, d) => glyph(String(d), x, y, a, 10, d, d + 1)).join('')
  const tens = (x: number, y: number, a: string, first: number) =>
    Array.from({ length: 6 - first }, (_, i) => first + i).map(d => glyph(String(d), x, y, a, 60, d * 10, d * 10 + 10)).join('')
  const fixed = (ch: string, x: number, y: number, a: string) => `<text x="${x.toFixed(2)}" y="${y}" ${a}>${ch}</text>`

  if (e < 10) return { chars: 2, svg: (x, y, a) => units(x, y, a) + fixed('s', x + adv, y, a) }
  if (e < 60) return { chars: 3, svg: (x, y, a) => tens(x, y, a, 1) + units(x + adv, y, a) + fixed('s', x + 2 * adv, y, a) }
  const m0 = Math.floor(e / 60)
  const n = String(m0).length
  const lo = 10 ** (n - 1)
  const winStart = lo + Math.floor((m0 - lo) / 120) * 120
  const last = Math.min(10 ** n - 1, winStart + 119)
  return {
    chars: n + 4,
    svg: (x, y, a) => {
      let out = ''
      const span = (last + 1) * 60
      for (let m = m0; m <= last; m++) out += glyph(String(m), x, y, a, span, m * 60, m * 60 + 60, true)
      const sx = x + n * adv
      return out + fixed('m', sx, y, a) + tens(sx + 2 * adv, y, a, 0) + units(sx + 3 * adv, y, a) + fixed('s', sx + 4 * adv, y, a)
    },
  }
}

/** How long the delivery on Done takes: ride in, drop the box, ride off. */
export const DELIVER_MS = 3600

/** How long the drive-by takes, from one side of the card to the other. */
export const RIDE_MS = 3400

// ─── The card ───────────────────────────────────────────────────────────────
export function cardSvg(d: CardData): string {
  const s = STATUS[d.status]
  const label = d.label ?? s.label
  const now = d.now

  // Content box: logo, then the main column, centred in the padded area.
  const mode = d.logo ?? 'inline'
  const LOGO = mode === 'tile' ? 80 : mode === 'compact' ? 56 : 0
  const GAP_LOGO = mode === 'tile' ? 22 : mode === 'compact' ? 20 : 0
  const mainBlockH = 24 + 20 + (15 + 8 + 4 + 8 + 14)
  const H = mode === 'tile' ? H_TILE : mainBlockH + 2 + 2 * 20
  const contentTop = 1 + (mode === 'tile' ? PAD.top : 20)
  const contentH = H - 2 - (mode === 'tile' ? PAD.top + PAD.bottom : 40)
  const logoX = 1 + PAD.left
  const logoY = contentTop + (contentH - LOGO) / 2
  const mainX = logoX + LOGO + GAP_LOGO
  const mainRight = W - 1 - PAD.right
  const mainW = mainRight - mainX
  const mainH = 24 + 20 + (15 + 8 + 4 + 8 + 14)
  const top = contentTop + (contentH - mainH) / 2

  // ── Header: badge + "Presto Dev" + pill, then clock · steps and the session cost on the right.
  const headMid = top + 12
  const pillLabelW = measure(label, 11.5, 600, 0.02)
  const pillW = 9 + 7 + 8 + pillLabelW + 11
  const BADGE = 30
  const tagW = measure('Presto', 12, 600) + measure(' Dev', 12, 500)
  const tagX = mode === 'inline' ? mainX + BADGE + 10 : mainX + pillW + 10
  const pillX = mode === 'inline' ? tagX + tagW + 14 : mainX
  const badge =
    mode === 'inline'
      ? (() => {
          // Whole pixels, so the edge stays sharp; a soft offset shadow lifts it off the card.
          const bx = Math.round(mainX)
          const by = Math.round(headMid - BADGE / 2)
          const rx = (BADGE * 128) / 512
          return (
            `<rect x="${bx + 0.5}" y="${by + 1.5}" width="${BADGE - 1}" height="${BADGE - 1}" rx="${rx}" fill="#000" opacity=".4"/>` +
            `<svg x="${bx}" y="${by}" width="${BADGE}" height="${BADGE}" viewBox="0 0 512 512">${BADGE_SVG}</svg>`
          )
        })()
      : ''
  const dotCx = pillX + 9 + 3.5
  const pill =
    `<rect x="${pillX}" y="${top}" width="${pillW}" height="24" rx="12" fill="${s.bg}"/>` +
    `<rect x="${pillX + 0.5}" y="${top + 0.5}" width="${pillW - 1}" height="23" rx="11.5" fill="none" stroke="${s.ring}" stroke-opacity=".6"/>` +
    (s.pulse ? `<circle class="pm-pulse" cx="${dotCx}" cy="${headMid}" r="3.5" fill="${s.tone}" style="animation-delay:${phase(now, 1800)}"/>` : '') +
    `<circle cx="${dotCx}" cy="${headMid}" r="3.5" fill="${s.tone}"/>` +
    `<text x="${pillX + 9 + 7 + 8}" y="${baseline(top, 24, 11.5) + 0.2}" font-family="${SANS}" font-size="11.5" font-weight="600" letter-spacing="0.23" fill="${s.text}">${esc(label)}</text>`
  const tag =
    `<text x="${tagX}" y="${baseline(headMid - 7.5, 15, 12)}" font-family="${SANS}" font-size="12">` +
    `<tspan font-weight="600" fill="${mode === 'inline' ? C.text : C.brandTag}">Presto</tspan><tspan font-weight="500" fill="${C.textSubtle}"> Dev</tspan></text>`

  const stepsText = `${d.steps} steps`
  const metaBase = baseline(headMid - 7.5, 15, 12, true)
  const stepsW = monoWidth(stepsText, 12)
  const costLabelW = measure('Session', 11, 500, 0.02)
  const costValueW = d.cost === undefined ? 0 : measure(d.cost, 13.5, 600, -0.01)
  const chipW = d.cost === undefined ? 0 : 11 + costLabelW + 7 + costValueW + 12
  const chipX = mainRight - chipW
  const chip =
    d.cost === undefined
      ? ''
      : `<rect x="${chipX}" y="${top}" width="${chipW}" height="24" rx="12" fill="#FFFFFF" fill-opacity=".05"/>` +
        `<rect x="${chipX + 0.5}" y="${top + 0.5}" width="${chipW - 1}" height="23" rx="11.5" fill="none" stroke="#FFFFFF" stroke-opacity=".1"/>` +
        `<text x="${chipX + 11}" y="${baseline(top, 24, 11) + 0.2}" font-family="${SANS}" font-size="11" font-weight="500" letter-spacing="0.22" fill="${C.textSubtle}">Session</text>` +
        `<text x="${chipX + 11 + costLabelW + 7}" y="${baseline(top, 24, 13.5) + 0.2}" font-family="${SANS}" font-size="13.5" font-weight="600" letter-spacing="-0.135" fill="${C.text}" style="font-variant-numeric:tabular-nums">${esc(d.cost)}</text>`
  const stepsTextX = d.cost === undefined ? mainRight - stepsW : chipX - 16 - stepsW
  const stepsIconX = stepsTextX - 6 - 13
  const sepCx = stepsIconX - 14 - 1.5
  const live = d.liveFrom === undefined ? null : liveClock(d.liveFrom)
  const elapsedW = live ? live.chars * MONO_ADVANCE * 12 : monoWidth(d.elapsed, 12)
  const elapsedX = sepCx - 1.5 - 14 - elapsedW
  const clockX = elapsedX - 6 - 13
  const meta =
    icon(ICON_CLOCK, clockX, headMid - 6.5, 13, C.textSubtle, 2) +
    (live
      ? live.svg(elapsedX, metaBase, `font-family="${MONO}" font-size="12" font-weight="500" fill="${C.meta}"`)
      : `<text x="${elapsedX}" y="${metaBase}" font-family="${MONO}" font-size="12" font-weight="500" fill="${C.meta}" style="font-variant-numeric:tabular-nums">${esc(d.elapsed)}</text>`) +
    `<circle cx="${sepCx}" cy="${headMid}" r="1.5" fill="${C.separator}"/>` +
    icon(ICON_STEPS, stepsIconX, headMid - 6.5, 13, C.textSubtle, 2) +
    `<text x="${stepsTextX}" y="${metaBase}" font-family="${MONO}" font-size="12" font-weight="500" fill="${C.meta}" style="font-variant-numeric:tabular-nums">${esc(stepsText)}</text>` +
    chip

  // ── Meters: three equal columns, 24 apart, under a hairline.
  const metersTop = top + 24 + 20
  const rule = `<rect x="${mainX}" y="${top + 24 + 10}" width="${mainW}" height="1" fill="#FFFFFF" fill-opacity=".08"/>`
  const GAP = 24
  const colW = (mainW - 2 * GAP) / 3
  const meter = (key: 'context' | 'five' | 'week', x: number, pctRaw: number, resets?: string) => {
    const pct = Math.max(0, Math.min(100, Math.round(pctRaw)))
    const lv = meterLevel(pct)
    const L = LEVEL[lv]
    const trackY = metersTop + 15 + 8
    const fillW = (colW * pct) / 100
    const noteTop = trackY + 4 + 8
    const head =
      `<text x="${x}" y="${baseline(metersTop, 15, 12)}" font-family="${SANS}" font-size="12" font-weight="500" fill="${C.textMuted}">${{ context: 'Context', five: '5-hour', week: 'Week' }[key]}</text>` +
      `<text x="${x + colW}" y="${baseline(metersTop, 15, 12.5, true)}" text-anchor="end" font-family="${MONO}" font-size="12.5" font-weight="600" fill="${L.value}" style="font-variant-numeric:tabular-nums">${pct}<tspan fill="${C.textSubtle}" font-weight="500">%</tspan></text>`

    // The fill eases from the last value to this one over 0.6 s.
    const from = d.from?.[key]
    const age = from ? now - from.at : Infinity
    const easing = from && age >= 0 && age < 600 && from.pct !== pct
    const fromW = easing ? (colW * Math.max(0, Math.min(100, from!.pct))) / 100 : fillW
    const anim = `pm-${key}-grow`
    const moveCss = easing
      ? `@keyframes ${anim}{from{transform:scaleX(${fromW / Math.max(fillW, 0.001)})}to{transform:scaleX(1)}}` +
        `.${anim}{transform-origin:${x}px 0;animation:${anim} .6s cubic-bezier(.2,.7,.2,1) ${(-age / 1000).toFixed(3)}s both}` 
      : ''

    const gid = `pmFill-${key}`
    const track =
      `<linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="${x}" y1="0" x2="${x + Math.max(fillW, 1)}" y2="0">` +
      L.stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('') +
      `</linearGradient>` +
      `<rect x="${x}" y="${trackY}" width="${colW}" height="4" rx="2" fill="rgba(255,255,255,0.07)"/>` +
      (pct > 0
        ? `<g class="${easing ? anim : ''}"><rect x="${x}" y="${trackY}" width="${Math.max(fillW, 4)}" height="4" rx="2" fill="url(#${gid})"/></g>`
        : '')

    const noteBase = baseline(noteTop, 14, 11.5)
    const note =
      key === 'context'
        ? `<text x="${x}" y="${noteBase}" font-family="${SANS}" font-size="11.5" font-weight="400" fill="${L.noteColor}">${L.note}</text>`
        : (() => {
            const color = lv === 'ok' ? C.textSubtle : L.noteColor
            return (
              icon(ICON_RESET, x, noteTop + 1.5, 11, color, 2.2) +
              `<text x="${x + 11 + 5}" y="${noteBase}" font-family="${SANS}" font-size="11.5" font-weight="400" fill="${color}">Resets ${esc(resets ?? '—')}</text>`
            )
          })()
    return { svg: head + track + note, css: moveCss }
  }
  const ctx = meter('context', mainX, d.context)
  const five = meter('five', mainX + colW + GAP, d.fiveHour, d.fiveResets)
  const wk = meter('week', mainX + 2 * (colW + GAP), d.week, d.resets)

  // ── The rider's lane. Inline: the header's empty stretch, on the hairline.
  const lane = mode === 'inline'
  const SC = lane ? 0.2 : 0.24
  const riderW = 232 * SC
  const laneL = pillX + pillW + 18
  const laneR = clockX - 18
  const laneOk = !lane || laneR - laneL >= riderW * 2 + 20
  const laneGround = top + 24 + 10

  // ── The drive-by: right after a request is sent, Claude rides by.
  const rideAge = d.sentAt === undefined ? Infinity : now - d.sentAt
  const riding = laneOk && rideAge >= 0 && rideAge < RIDE_MS
  const ride = riding
    ? lane
      ? `<g class="pm-ride-lane" style="animation-delay:${(-rideAge / 1000).toFixed(3)}s"><g transform="translate(0 ${(laneGround - 112 * SC).toFixed(1)}) scale(${SC})">${rider()}</g></g>`
      : `<g class="pm-ride" style="animation-delay:${(-rideAge / 1000).toFixed(3)}s"><g transform="translate(0 ${H - 33}) scale(.27)">${rider()}</g></g>`
    : ''

  // ── The delivery: on Done, Claude rides in, parks under the logo, drops a
  // Presto box that pops open in a burst of orange dots, and rides off.
  const deliverAge = d.status === 'done' && d.doneAt !== undefined ? now - d.doneAt : Infinity
  const delivering = laneOk && deliverAge >= 0 && deliverAge < DELIVER_MS
  const parkX = lane ? (laneL + laneR) / 2 - riderW / 2 + 8 : logoX + LOGO / 2 - riderW / 2 + 4
  const groundY = lane ? laneGround : H - 4
  const riderY = groundY - 112 * SC
  const boxS = lane ? 13 : 15
  const boxX = parkX - boxS - 3
  const burst = Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * Math.PI * 2 - Math.PI / 2
    const r = 16 + (i % 3) * 4
    return `<circle class="pm-dot" cx="0" cy="0" r="${i % 2 ? 1.6 : 2.2}" fill="${i % 3 === 0 ? '#FFB547' : '#FF7A1A'}" style="--dx:${(Math.cos(a) * r).toFixed(1)}px;--dy:${(Math.sin(a) * r * 0.8).toFixed(1)}px"/>`
  }).join('')
  const deliver = delivering
    ? `<g style="--d:${(-deliverAge / 1000).toFixed(3)}s">` +
      `<g class="pm-dl-rider"><g transform="translate(0 ${riderY.toFixed(1)}) scale(${SC})">${rider()}</g></g>` +
      `<g class="pm-dl-box" transform="translate(${boxX.toFixed(1)} ${(groundY - boxS).toFixed(1)})">` +
      `<g class="pm-dl-boxin">` +
      `<rect width="${boxS}" height="${boxS}" rx="2.5" fill="#FF3000"/><rect width="${boxS}" height="3.5" rx="1.5" fill="#FFFFFF" opacity=".18"/>` +
      `<g transform="translate(3.6 2.6) scale(.017)"><g fill="none" stroke="#FFFFFF" stroke-width="58.8" stroke-linecap="round" stroke-linejoin="round"><path d="M173.2 100.4 L328.27 255.47 A88.7 88.7 0 0 1 202.83 380.91 L173.27 351.35"/><path d="M173 224.2 L261.3 312.5"/></g></g>` +
      `</g>` +
      `<g transform="translate(${boxS / 2} ${boxS / 2})">${burst}</g>` +
      `</g>` +
      `</g>`
    : ''
  const dl = DELIVER_MS
  const deliverCss =
    `.pm-dl-rider{animation:pm-dl-ride ${dl}ms linear var(--d) both}` +
    `.pm-dl-boxin{transform-box:fill-box;transform-origin:50% 100%;animation:pm-dl-box ${dl}ms linear var(--d) both}` +
    `.pm-dot{opacity:0;animation:pm-dl-dot ${dl}ms linear var(--d) both}` +
    // 0–30% ride in (ease out), 30–62% parked, 62–100% ride off (ease in).
    (lane
      ? `@keyframes pm-dl-ride{0%{opacity:0;transform:translateX(${laneL.toFixed(1)}px);animation-timing-function:cubic-bezier(.15,.7,.3,1)}8%{opacity:1}30%{transform:translateX(${parkX.toFixed(1)}px)}62%{opacity:1;transform:translateX(${parkX.toFixed(1)}px);animation-timing-function:cubic-bezier(.6,0,.85,.3)}92%{opacity:1}100%{opacity:0;transform:translateX(${(laneR - riderW).toFixed(1)}px)}}`
      : `@keyframes pm-dl-ride{0%{transform:translateX(-70px);animation-timing-function:cubic-bezier(.15,.7,.3,1)}30%{transform:translateX(${parkX.toFixed(1)}px)}62%{transform:translateX(${parkX.toFixed(1)}px);animation-timing-function:cubic-bezier(.6,0,.85,.3)}100%{transform:translateX(${W + 20}px)}}`) +
    // The box drops off the back at 34%, lands, pops at 52%, then shrinks away.
    `@keyframes pm-dl-box{0%,33%{opacity:0;transform:translate(10px,-14px) scale(.7)}36%{opacity:1;transform:translate(4px,-10px) scale(.85)}42%{transform:translate(0,0) scale(1.08,.9)}46%{transform:scale(.96,1.05)}50%{transform:scale(1)}54%{transform:scale(1.18)}60%{opacity:1;transform:scale(1.04)}80%{opacity:1;transform:scale(1)}92%,100%{opacity:0;transform:scale(.6)}}` +
    `@keyframes pm-dl-dot{0%,53%{opacity:0;transform:translate(0,0) scale(.4)}57%{opacity:1}75%{opacity:.9;transform:translate(var(--dx),var(--dy)) scale(1)}88%,100%{opacity:0;transform:translate(calc(var(--dx) * 1.25),calc(var(--dy) * 1.25 + 4px)) scale(.6)}}`

  const css =
    FONT_FACES +
    `.pm-pulse{transform-box:fill-box;transform-origin:center;opacity:0;animation:pm-pulse 1.8s cubic-bezier(.2,.6,.3,1) infinite}` +
    `.pm-ride{animation:pm-ride ${RIDE_MS}ms cubic-bezier(.45,.05,.4,1) both}` +
    `.pm-ride-lane{animation:pm-ride-lane ${RIDE_MS}ms cubic-bezier(.45,.05,.4,1) both}` +
    `@keyframes pm-ride-lane{0%{opacity:0;transform:translateX(${laneL.toFixed(1)}px)}12%{opacity:1}88%{opacity:1}100%{opacity:0;transform:translateX(${(laneR - riderW).toFixed(1)}px)}}` +
    `.pm-spin{animation:pm-spin .4s linear infinite}` +
    `.pm-bob{animation:pm-bob .45s ease-in-out infinite}` +
    `.pm-puff{animation:pm-puff .6s ease-out infinite}` +
    `@keyframes pm-pulse{0%{transform:scale(1);opacity:.55}70%{transform:scale(2.6);opacity:0}100%{transform:scale(2.6);opacity:0}}` +
    `@keyframes pm-ride{0%{transform:translateX(-80px)}100%{transform:translateX(${W + 10}px)}}` +
    `@keyframes pm-spin{to{transform:rotate(360deg)}}` +
    `@keyframes pm-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.2px)}}` +
    `@keyframes pm-puff{0%{transform:translateX(0);opacity:.9}100%{transform:translateX(-12px);opacity:0}}` +
    (delivering ? deliverCss : '') +
    ctx.css +
    five.css +
    wk.css +
    `@media (prefers-reduced-motion: reduce){*{animation:none!important;transition:none!important}.pm-ride,.pm-ride-lane,.pm-dl-rider,.pm-dl-box{display:none}}`

  // Ids unique to this drawing, so two cards on one page never share gradients.
  const u = `${d.status}${Math.round(d.context)}x${Math.round(d.week)}`
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Presto Dev: ${esc(label)}">` +
    `<style>${css}</style>` +
    `<defs>` +
    `<linearGradient id="pmBorder" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".13"/><stop offset=".5" stop-color="#FFFFFF" stop-opacity=".06"/><stop offset="1" stop-color="#FFFFFF" stop-opacity=".04"/></linearGradient>` +
    `<linearGradient id="pmSurface" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.surfaceHigh}"/><stop offset="1" stop-color="${C.surface}"/></linearGradient>` +
    `<radialGradient id="pmLight" gradientUnits="userSpaceOnUse" cx="${W * 0.62}" cy="-40" r="${W * 0.55}" gradientTransform="translate(0 -40) scale(1 .45) translate(0 40)"><stop offset="0" stop-color="#FF5C2E" stop-opacity=".09"/><stop offset="1" stop-color="#FF5C2E" stop-opacity="0"/></radialGradient>` +
    `<clipPath id="pmSurfaceClip"><rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="${R - 1}"/></clipPath>` +
    `<filter id="pmBadgeShadow" x="-40%" y="-40%" width="180%" height="190%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity=".45"/></filter>` +
    `<filter id="pmLogoShadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="6" stdDeviation="7" flood-color="#000" flood-opacity=".45"/><feDropShadow dx="0" dy="1" stdDeviation=".75" flood-color="#000" flood-opacity=".35"/></filter>` +
    `</defs>` +
    // 1. Border shell over the surface colour; 2. the surface.
    `<rect width="${W}" height="${H}" rx="${R}" fill="${C.surface}"/>` +
    `<rect width="${W}" height="${H}" rx="${R}" fill="url(#pmBorder)"/>` +
    `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="${R - 1}" fill="url(#pmSurface)"/>` +
    // A soft warm light from above, kept clear of the logo.
    `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="${R - 1}" fill="url(#pmLight)" pointer-events="none"/>` +
    (mode === 'inline' ? badge : `<g filter="url(#pmLogoShadow)"><svg x="${logoX}" y="${logoY}" width="${LOGO}" height="${LOGO}" viewBox="0 0 512 512">${LOGO_SVG.replace(/^<svg viewBox="0 0 512 512">/, '').replace(/<\/svg>$/, '')}</svg></g>`) +
    pill +
    tag +
    meta +
    rule +
    ctx.svg +
    five.svg +
    wk.svg +
    `<g clip-path="url(#pmSurfaceClip)" pointer-events="none">${ride}${deliver}</g>` +
    `</svg>`
  return svg.replace(/(id="|url\(#)pm([A-Z])/g, `$1pm${u}$2`).replace(/(id="|url\(#)pmFill-/g, `$1pm${u}Fill-`).replace(/(id="|url\(#)pmClip-/g, `$1pm${u}Clip-`)
}
