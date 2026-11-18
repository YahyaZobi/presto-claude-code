// The Presto rider: Claude's little mascot in a red helmet on a delivery scooter,
// a Presto box on the back. One pixel grid, drawn two ways: terminal cells
// (half blocks, two pixels per cell) and a crisp SVG for the desktop app.

/** Presto palette: brand #FF3000, the orange ramp, ink and gold. */
export const PRESTO = {
  brand: '#FF3000',
  o300: '#FDBA74',
  o400: '#FB923C',
  o500: '#F97316',
  o600: '#EA580C',
  ink: '#14141A',
  gold: '#F5B33C',
  green: '#15803D',
  red: '#DC2626',
  white: '#FFFFFF',
} as const

const PIXEL: Record<string, string> = {
  B: PRESTO.brand, // delivery box
  W: PRESTO.white, // box stripe
  H: PRESTO.brand, // helmet
  O: PRESTO.o500, // the mascot's body
  E: PRESTO.ink, // eyes
  C: '#9B9DA5', // handlebar, hubs
  S: '#E6E8E4', // scooter body
  G: PRESTO.gold, // headlight
  K: '#3A3A44', // tyres
  L: PRESTO.o400, // speed lines
}

const W = 20
const H = 10

// Two frames: the hubs turn and the speed lines flicker. Rows 0-4 are the
// rider and the box (they bob); rows 5-9 are the scooter (it stays on the road).
const FRAMES: readonly (readonly string[])[] = [
  [
    '          HHHH      ',
    '  BBBBB  HHHHHH  CC ',
    '  BWWWB  OOOOOO  C  ',
    'L BBBBB  OEOOEOOOC  ',
    '  BBBBB  OOOOOO  C  ',
    'LLSSSSSSSSSSSSSSSCG ',
    '  SSSSSSSSSSSSSSSS  ',
    ' KKKK          KKKK ',
    'KKCCKK        KKCCKK',
    ' KKKK          KKKK ',
  ],
  [
    '          HHHH      ',
    '  BBBBB  HHHHHH  CC ',
    'L BWWWB  OOOOOO  C  ',
    '  BBBBB  OEOOEOOOC  ',
    'L BBBBB  OOOOOO  C  ',
    ' LSSSSSSSSSSSSSSSCG ',
    '  SSSSSSSSSSSSSSSS  ',
    ' KCKK          KCKK ',
    'KKKKKK        KKKKKK',
    ' KKCK          KKCK ',
  ],
]

/** A parked rider: no speed lines. */
const PARKED: readonly string[] = FRAMES[0]!.map(row => row.replace(/L/g, ' '))

const hex = (color: string) => parseInt(color.slice(1), 16)
const DEFAULT = 0x01000000
const UPPER = 0x2580 // ▀
const LOWER = 0x2584 // ▄
const SPACE = 0x20

export const RIDER_COLUMNS = W
export const RIDER_ROWS = H / 2

/** Terminal cells for the rider: frame 0 or 1 while moving, or parked. */
export function riderCells(frame: number | 'parked'): string {
  const grid = frame === 'parked' ? PARKED : FRAMES[frame % FRAMES.length]!
  const words = new Uint32Array(W * RIDER_ROWS * 3)
  let i = 0
  for (let row = 0; row < RIDER_ROWS; row++) {
    for (let col = 0; col < W; col++) {
      const top = PIXEL[grid[row * 2]![col]!]
      const bottom = PIXEL[grid[row * 2 + 1]![col]!]
      if (top && bottom) {
        words.set([UPPER, hex(top), hex(bottom)], i)
      } else if (top) {
        words.set([UPPER, hex(top), DEFAULT], i)
      } else if (bottom) {
        words.set([LOWER, hex(bottom), DEFAULT], i)
      } else {
        words.set([SPACE, DEFAULT, DEFAULT], i)
      }
      i += 3
    }
  }
  return toBase64(new Uint8Array(words.buffer))
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function toBase64(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!
    const b = bytes[i + 1]
    const c = bytes[i + 2]
    const n = (a << 16) | ((b ?? 0) << 8) | (c ?? 0)
    out += B64[(n >> 18) & 63]! + B64[(n >> 12) & 63]!
    out += b === undefined ? '=' : B64[(n >> 6) & 63]!
    out += c === undefined ? '=' : B64[n & 63]!
  }
  return out
}

function rects(grid: readonly string[], skip = ''): string {
  let out = ''
  grid.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]!
      const fill = PIXEL[ch]
      if (fill && !skip.includes(ch)) out += `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${fill}"/>`
    }
  })
  return out
}

/**
 * The rider as SVG. `moving` animates it (hubs turn, the body bobs, the road
 * rolls past); otherwise it is parked. `road` draws a road under it, as wide as
 * `roadWidth` pixel units, with the rider at `at` (0 to 1) along it.
 */
export function riderSvg(opts: { moving: boolean; road?: boolean; roadWidth?: number; at?: number; scale?: number }): string {
  const scale = opts.scale ?? 3
  const roadWidth = opts.road ? Math.max(W, opts.roadWidth ?? 60) : W
  const height = opts.road ? H + 2 : H
  const x0 = opts.road ? Math.round((roadWidth - W) * Math.min(1, Math.max(0, opts.at ?? 0))) : 0
  // Body and box bob together; wheels and scooter stay on the road.
  const top = FRAMES[0]!.slice(0, 5)
  const bottomA = FRAMES[0]!.slice(5)
  const bottomB = FRAMES[1]!.slice(5)
  const bottomRows = (rows: readonly string[]) => ['', '', '', '', '', ...rows]
  const css = opts.moving
    ? `<style>
.bob{animation:bob .36s steps(2) infinite}
.fa{animation:fa .3s steps(1) infinite}
.fb{animation:fb .3s steps(1) infinite}
.dash{animation:roll .45s linear infinite}
@keyframes bob{0%{transform:translateY(0)}50%{transform:translateY(-.5px)}}
@keyframes fa{0%{opacity:1}50%{opacity:0}}
@keyframes fb{0%{opacity:0}50%{opacity:1}}
@keyframes roll{from{stroke-dashoffset:0}to{stroke-dashoffset:4}}
</style>`
    : ''
  const road = opts.road
    ? `<line x1="0" y1="${H + 0.6}" x2="${roadWidth}" y2="${H + 0.6}" stroke="#5F5860" stroke-width=".35"/>` +
      `<line class="dash" x1="0" y1="${H + 1.5}" x2="${roadWidth}" y2="${H + 1.5}" stroke="${PRESTO.o400}" stroke-width=".35" stroke-dasharray="2 2"/>`
    : ''
  const rider = opts.moving
    ? `<g class="bob">${rects(top)}</g><g class="fa">${rects(bottomRows(bottomA))}</g><g class="fb">${rects(bottomRows(bottomB))}</g>`
    : rects(PARKED)
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${roadWidth} ${height}" width="${roadWidth * scale}" height="${height * scale}" shape-rendering="crispEdges">` +
    css +
    road +
    `<g transform="translate(${x0} 0)">${rider}</g>` +
    `</svg>`
  )
}
