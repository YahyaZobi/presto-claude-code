// Vector art for the desktop app and VS Code: Claude's mascot riding a Presto
// delivery scooter (the spinner beside the working indicator).

export const BRAND = {
  red: '#FF3000',
  dot: '#FF8E00',
  ink: '#16141A',
  line: '#2A2730',
  text: '#F7F4F2',
  soft: '#A9A3AE',
  faint: '#6E6874',
} as const

const CLAUDE = '#D97757'
const CLAUDE_DARK = '#B85E41'
const INK = '#141218'
const CHROME_DARK = '#7E848D'

/** The Presto mark for the delivery box: assets/presto-logo-flat.svg geometry, unchanged. */
const MARK =
  `<g fill="none" stroke="#FFFFFF" stroke-width="58.8" stroke-linecap="round" stroke-linejoin="round">` +
  `<path d="M173.2 100.4 L328.27 255.47 A88.7 88.7 0 0 1 202.83 380.91 L173.27 351.35"/><path d="M173 224.2 L261.3 312.5"/>` +
  `</g>` +
  `<g fill="${BRAND.dot}"><circle cx="173" cy="100.3" r="29.2"/><circle cx="261.4" cy="312.7" r="29.2"/><circle cx="173" cy="351.2" r="29.2"/></g>`

const DEFS =
  `<defs>` +
  `<linearGradient id="paint" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF6A3D"/><stop offset=".45" stop-color="#FF3000"/><stop offset="1" stop-color="#C42200"/></linearGradient>` +
  `<linearGradient id="box" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF4B1C"/><stop offset="1" stop-color="#D92800"/></linearGradient>` +
  `<linearGradient id="skin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E58A6B"/><stop offset="1" stop-color="${CLAUDE_DARK}"/></linearGradient>` +
  `<linearGradient id="seat" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#34313B"/><stop offset="1" stop-color="${INK}"/></linearGradient>` +
  `<radialGradient id="rim"><stop offset="0" stop-color="#F2F4F6"/><stop offset="1" stop-color="#A7ADB5"/></radialGradient>` +
  `<linearGradient id="chrome" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#9AA0A8"/></linearGradient>` +
  `<radialGradient id="beam" cx="0" cy=".5" r="1"><stop offset="0" stop-color="#FFF6D6" stop-opacity=".9"/><stop offset="1" stop-color="#FFF6D6" stop-opacity="0"/></radialGradient>` +
  `</defs>`

const wheel = (cx: number, cy: number) =>
  `<circle cx="${cx}" cy="${cy}" r="17" fill="${INK}"/>` +
  `<circle cx="${cx}" cy="${cy}" r="15.5" fill="none" stroke="#3A3742" stroke-width="1.2"/>` +
  `<circle cx="${cx}" cy="${cy}" r="10.5" fill="url(#rim)"/>` +
  `<g class="spin" style="transform-origin:${cx}px ${cy}px">` +
  [0, 72, 144, 216, 288]
    .map(a => `<path d="M${cx} ${cy - 3} L${cx - 1.6} ${cy - 9} L${cx + 1.6} ${cy - 9} Z" fill="${CHROME_DARK}" transform="rotate(${a} ${cx} ${cy})"/>`)
    .join('') +
  `</g>` +
  `<circle cx="${cx}" cy="${cy}" r="3.2" fill="#5D636B"/>` +
  `<circle cx="${cx - 0.8}" cy="${cy - 0.8}" r="1" fill="#FFFFFF" opacity=".7"/>`

/** The rider and scooter, facing right, in a 230 x 118 box. */
function rider(moving: boolean, beam: boolean): string {
  const shadow = `<ellipse cx="128" cy="117" rx="98" ry="3.2" fill="#000000" opacity=".22"/>`

  const box =
    `<path d="M22 66 L78 66 L86 72" fill="none" stroke="${CHROME_DARK}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<rect x="14" y="20" width="60" height="46" rx="5" fill="url(#box)"/>` +
    `<path d="M14 28 L74 28" stroke="#A81E00" stroke-width="1.2" opacity=".55"/>` +
    `<rect x="14" y="20" width="60" height="8" rx="4" fill="#FFFFFF" opacity=".12"/>` +
    `<rect x="36" y="16.5" width="16" height="4" rx="2" fill="${INK}"/>` +
    `<rect x="14" y="58" width="60" height="2.4" fill="#FFFFFF" opacity=".55"/>` +
    `<rect x="16.5" y="30" width="2" height="26" rx="1" fill="#FFFFFF" opacity=".22"/>` +
    // The real logo mark, white on the box.
    `<g transform="translate(27 26) scale(.062)">${MARK}</g>`

  const body =
    // Far leg, then near leg: thigh along the seat, shin down to the floorboard.
    `<path d="M104 60 L127 62 L134 87" fill="none" stroke="${CLAUDE_DARK}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="M108 60 L131 60 L139 87" fill="none" stroke="${CLAUDE}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="M133 84.5 h13 a4 4 0 0 1 0 7 h-15 z" fill="${INK}"/>` +
    `<g transform="rotate(-7 104 44)">` +
    // Claude's blocky body.
    `<rect x="86" y="25" width="38" height="37" rx="6" fill="url(#skin)"/>` +
    `<rect x="88" y="27" width="4" height="30" rx="2" fill="#FFFFFF" opacity=".16"/>` +
    // Eyes.
    `<rect x="108" y="36" width="4.2" height="8.5" rx="1.4" fill="${INK}"/>` +
    `<rect x="116" y="36" width="4.2" height="8.5" rx="1.4" fill="${INK}"/>` +
    `<circle cx="110" cy="38" r=".9" fill="#FFFFFF"/><circle cx="118" cy="38" r=".9" fill="#FFFFFF"/>` +
    // Presto helmet: glossy red shell, white stripe, smoked visor.
    `<path d="M82 31 C82 13 95 7 106 7 C120 7 129 16 129 31 Z" fill="url(#paint)"/>` +
    `<path d="M96 9.5 C99.5 8.2 102.5 7.6 105 7.4 L105.5 31 L99 31 Z" fill="#FFFFFF" opacity=".92"/>` +
    `<path d="M114 14 C122 16.5 128 22.5 129 31 L113 31 Z" fill="#20232C" opacity=".88"/>` +
    `<path d="M117 17.5 C121 19.5 124 22.5 125.5 26" fill="none" stroke="#FFFFFF" stroke-width="1.3" opacity=".55" stroke-linecap="round"/>` +
    `<path d="M87 20 C89 14 94 11 99 10" fill="none" stroke="#FFFFFF" stroke-width="1.6" opacity=".45" stroke-linecap="round"/>` +
    `<rect x="81" y="29" width="49" height="4.2" rx="2.1" fill="#9E1C00"/>` +
    `</g>` +
    // Arm to the grip.
    `<path d="M113 46 Q139 51 161 38.5" fill="none" stroke="${CLAUDE_DARK}" stroke-width="7.4" stroke-linecap="round"/>` +
    `<path d="M113 45 Q139 50 161 37.5" fill="none" stroke="${CLAUDE}" stroke-width="5" stroke-linecap="round"/>` +
    `<circle cx="161.5" cy="38" r="4.4" fill="${CLAUDE_DARK}"/>`

  const scooter =
    // Exhaust.
    `<rect x="42" y="96" width="42" height="7.5" rx="3.75" fill="url(#chrome)"/>` +
    `<rect x="40" y="97.5" width="5" height="4.5" rx="2" fill="#5D636B"/>` +
    // Rear cowl.
    `<path d="M35 93 C33 76 46 63 71 62.5 L121 62.5 C131 62.5 133 72 130 82 L125 95 Z" fill="url(#paint)"/>` +
    `<path d="M44 76 C50 68.5 62 66 77 66 L106 66" fill="none" stroke="#FFFFFF" stroke-width="2.6" opacity=".4" stroke-linecap="round"/>` +
    `<path d="M37 92 L124 94" stroke="${CHROME_DARK}" stroke-width="1.6" opacity=".9"/>` +
    `<rect x="31" y="73" width="8" height="6.5" rx="2" fill="#FF8A75"/>` +
    // Seat.
    `<path d="M66 55.5 L124 55.5 C131 55.5 131 64.5 124 64.5 L66 64.5 C59 64.5 59 55.5 66 55.5 Z" fill="url(#seat)"/>` +
    `<path d="M68 58 L122 58" stroke="#FFFFFF" stroke-width=".8" opacity=".18" stroke-dasharray="2 2"/>` +
    // Floorboard with its rubber mat, and the leg shield up to the column.
    `<path d="M121 90.5 L160 90.5 L158 98 L119 98 Z" fill="#B21F00"/>` +
    `<rect x="122" y="89.5" width="36" height="2.4" rx="1" fill="${INK}"/>` +
    `<path d="M147 98 L162 98 C172 80 178 60 180.5 37.5 L171 36 C168 58 160 78 147 92 Z" fill="url(#paint)"/>` +
    `<path d="M170.5 42 C168 60 162 76 154 88" fill="none" stroke="#FFFFFF" stroke-width="1.8" opacity=".45" stroke-linecap="round"/>` +
    // Fork and front mudguard.
    `<path d="M178 46 L194 99" stroke="url(#chrome)" stroke-width="4.2" stroke-linecap="round"/>` +
    `<path d="M176 88.5 C182 74 206 74 212.5 88.5 L208.5 90.5 C202 80.5 186 80.5 180 90.5 Z" fill="url(#paint)"/>` +
    // Headset, headlight (and its beam on the street), mirror, grip.
    (beam ? `<path d="M189 38 L232 26 L232 52 Z" fill="url(#beam)"/>` : '') +
    `<rect x="165.5" y="31.5" width="21" height="9.5" rx="4.75" fill="url(#paint)"/>` +
    `<ellipse cx="187" cy="38" rx="4.2" ry="4.6" fill="#FFF3C4"/>` +
    `<ellipse cx="187.8" cy="37" rx="1.6" ry="1.8" fill="#FFFFFF"/>` +
    `<path d="M172 32 L167.5 18" stroke="${CHROME_DARK}" stroke-width="2" stroke-linecap="round"/>` +
    `<ellipse cx="166.5" cy="15" rx="5.2" ry="3.6" fill="${INK}"/>` +
    `<ellipse cx="165.5" cy="14" rx="2.4" ry="1.2" fill="#FFFFFF" opacity=".35"/>` +
    `<rect x="155.5" y="34" width="12" height="6" rx="3" fill="${INK}"/>` +
    wheel(62, 100) +
    wheel(194, 100)

  const motion = moving
    ? `<g class="lines" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round">` +
      `<line x1="0" y1="34" x2="9" y2="34" opacity=".7"/><line x1="3" y1="46" x2="11" y2="46" opacity=".5"/><line x1="0" y1="82" x2="24" y2="82" opacity=".6"/>` +
      `</g>` +
      `<g class="puff" fill="#D9D2CD"><circle cx="35" cy="100" r="4"/><circle cx="27" cy="97.5" r="3"/><circle cx="20" cy="100.5" r="2"/></g>`
    : ''

  return `${shadow}${motion}${box}<g class="bob">${body}</g>${scooter}`
}

const CSS = `<style>
.spin{animation:spin .45s linear infinite}
.bob{animation:bob .5s ease-in-out infinite}
.lines{animation:lines .32s steps(2) infinite}
.puff{animation:puff .7s ease-out infinite}
.road{animation:road .45s linear infinite}
.city{animation:city 9s linear infinite}
.near{animation:city 4.5s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.2px)}}
@keyframes lines{0%{transform:translateX(0);opacity:1}50%{transform:translateX(-5px);opacity:.35}}
@keyframes puff{0%{transform:translateX(0) scale(1);opacity:.9}100%{transform:translateX(-12px) scale(1.4);opacity:0}}
@keyframes road{to{stroke-dashoffset:-30}}
@keyframes city{to{transform:translateX(-240px)}}
</style>`

/** Claude on the scooter alone (the spinner). */
export function riderVector(opts: { moving: boolean; width?: number }): string {
  const w = opts.width ?? 64
  const h = Math.round((w * 120) / 232)
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 232 120" width="${w}" height="${h}">` +
    DEFS +
    (opts.moving ? CSS : '') +
    rider(opts.moving, false) +
    `</svg>`
  )
}
