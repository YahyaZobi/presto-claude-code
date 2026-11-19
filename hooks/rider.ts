// Claude's mascot on a Presto delivery scooter, facing right, in a 232 x 120 box.
// One drawing for the card (the drive-by and the delivery) and the spinner.
//
// Drawn to stay sharp when small: flat two-tone shading with crisp highlight
// shapes rather than soft gradients, a light sidewall on the dark tyres so they
// read on a dark card, and a few bold details (delivery vest, scarf, hub caps).

const SKIN = '#D97757'
const SKIN_DARK = '#B85E41'
const SKIN_LIGHT = '#EE9A7C'
const INK = '#141218'
const RED = '#FF3000'
const RED_DARK = '#C42200'
const RED_DEEP = '#8F1A00'
const RED_LIGHT = '#FF6A3D'
const ORANGE = '#FF8E00'
const CHROME = '#C9CED5'
const CHROME_DARK = '#7E848D'

const MARK =
  `<g fill="none" stroke="#FFFFFF" stroke-width="58.8" stroke-linecap="round" stroke-linejoin="round">` +
  `<path d="M173.2 100.4 L328.27 255.47 A88.7 88.7 0 0 1 202.83 380.91 L173.27 351.35"/><path d="M173 224.2 L261.3 312.5"/></g>` +
  `<g fill="${ORANGE}"><circle cx="173" cy="100.3" r="29.2"/><circle cx="261.4" cy="312.7" r="29.2"/><circle cx="173" cy="351.2" r="29.2"/></g>`

export type RiderOpts = {
  /** Class prefix, so the card ('pm-') and the spinner ('') keep their own CSS. */
  c: string
  /** Id prefix for the gradients; the card's must look like `pmX…` so it is made unique per card. */
  id: string
  /** Speed lines and exhaust puffs. */
  moving: boolean
}

export function riderArt(o: RiderOpts): string {
  const { c, id } = o
  const g = (n: string) => `${id}${n}`

  const defs =
    `<defs>` +
    `<linearGradient id="${g('Paint')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${RED_LIGHT}"/><stop offset=".38" stop-color="${RED}"/><stop offset="1" stop-color="${RED_DARK}"/></linearGradient>` +
    `<linearGradient id="${g('Box')}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF4B1C"/><stop offset="1" stop-color="#D92800"/></linearGradient>` +
    `<linearGradient id="${g('Skin')}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${SKIN_LIGHT}"/><stop offset="1" stop-color="${SKIN_DARK}"/></linearGradient>` +
    `<linearGradient id="${g('Chrome')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".55" stop-color="${CHROME}"/><stop offset="1" stop-color="${CHROME_DARK}"/></linearGradient>` +
    `<linearGradient id="${g('Visor')}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3A4252"/><stop offset="1" stop-color="#11141B"/></linearGradient>` +
    `</defs>`

  const wheel = (cx: number) =>
    `<circle cx="${cx}" cy="100" r="17" fill="${INK}"/>` +
    // Light sidewall and tread ring, so the tyre reads on a dark card.
    `<circle cx="${cx}" cy="100" r="15.2" fill="none" stroke="#4E4956" stroke-width="2.4"/>` +
    `<circle cx="${cx}" cy="100" r="11" fill="url(#${g('Chrome')})"/>` +
    `<circle cx="${cx}" cy="100" r="8.6" fill="#9AA0A8"/>` +
    `<g class="${c}spin" style="transform-origin:${cx}px 100px">` +
    [0, 72, 144, 216, 288].map(a => `<path d="M${cx - 1.4} 100 L${cx} 91.6 L${cx + 1.4} 100 Z" fill="#E9ECEF" transform="rotate(${a} ${cx} 100)"/>`).join('') +
    `</g>` +
    // Presto-red hub cap with a glint.
    `<circle cx="${cx}" cy="100" r="3.6" fill="${RED}"/><circle cx="${cx - 1}" cy="98.9" r="1.1" fill="#FFFFFF" opacity=".8"/>`

  const motion = o.moving
    ? `<g class="${c}lines" stroke="#FFFFFF" stroke-linecap="round">` +
      `<line x1="0" y1="36" x2="10" y2="36" stroke-width="2.4" opacity=".55"/><line x1="4" y1="48" x2="12" y2="48" stroke-width="2" opacity=".35"/><line x1="0" y1="84" x2="22" y2="84" stroke-width="2.4" opacity=".5"/>` +
      `</g>` +
      `<g class="${c}puff" fill="#CFC7C2"><circle cx="34" cy="100" r="4.2"/><circle cx="25.5" cy="97" r="3.2"/><circle cx="18" cy="100.5" r="2.2"/></g>`
    : ''

  // Delivery box on its rack: front face, lid, side shade, latch, the Presto mark.
  const box =
    `<path d="M20 67 L80 67 L88 73" fill="none" stroke="${CHROME_DARK}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<rect x="12" y="17" width="62" height="50" rx="6" fill="${RED_DEEP}"/>` +
    `<rect x="12" y="17" width="60" height="48" rx="6" fill="url(#${g('Box')})"/>` +
    `<path d="M18 17 H66 a6 6 0 0 1 6 6 V27 H12 V23 a6 6 0 0 1 6-6 Z" fill="${RED_LIGHT}"/>` +
    `<rect x="12" y="27" width="60" height="1.6" fill="${RED_DEEP}" opacity=".7"/>` +
    `<rect x="35" y="13.5" width="14" height="4.5" rx="2.25" fill="${INK}"/>` +
    `<rect x="38" y="25.5" width="8" height="5" rx="1.5" fill="${CHROME}"/>` +
    `<rect x="12" y="57" width="60" height="2.6" fill="#FFFFFF" opacity=".6"/>` +
    `<rect x="15" y="31" width="2.2" height="23" rx="1.1" fill="#FFFFFF" opacity=".25"/>` +
    `<g transform="translate(27 29.5) scale(.056)">${MARK}</g>`

  // Claude: legs, a red Presto delivery vest with a reflective stripe, helmet, arm.
  const body =
    `<path d="M104 60 L127 62 L134 87" fill="none" stroke="${SKIN_DARK}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="M108 60 L131 60 L139 87" fill="none" stroke="${SKIN}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="M132 83.5 h14.5 a4.5 4.5 0 0 1 0 8 h-16.5 z" fill="${INK}"/><path d="M131 90 h16" stroke="#4E4956" stroke-width="1.4"/>` +
    // The scarf trails back from the neck over the box, and flutters.
    `<g class="${c}scarf" style="transform-origin:90px 40px"><path d="M92 37 C82 33 74 38 62 34 C66 40 74 42 80 41.5 C75 45.5 68 46.5 62 45.5 C70 50 84 47 93 43 Z" fill="${ORANGE}"/><path d="M91 38 C82 36 75 38.5 67 37" fill="none" stroke="#FFC27A" stroke-width="1.3" stroke-linecap="round"/></g>` +
    `<g transform="rotate(-7 104 44)">` +
    `<rect x="86" y="25" width="38" height="37" rx="6" fill="url(#${g('Skin')})"/>` +
    `<rect x="88.5" y="28" width="3.6" height="14" rx="1.8" fill="#FFFFFF" opacity=".22"/>` +
    // Vest over the lower body.
    `<path d="M86 47 H124 V56 a6 6 0 0 1 -6 6 H92 a6 6 0 0 1 -6 -6 Z" fill="url(#${g('Paint')})"/>` +
    `<rect x="86" y="51.5" width="38" height="2.6" fill="#FFFFFF" opacity=".75"/>` +
    `<rect x="86" y="47" width="38" height="1.4" fill="${RED_DEEP}" opacity=".6"/>` +
    // Eyes, with a catch-light.
    `<rect x="108" y="35" width="4.4" height="8.6" rx="1.5" fill="${INK}"/><rect x="116.2" y="35" width="4.4" height="8.6" rx="1.5" fill="${INK}"/>` +
    `<circle cx="110.6" cy="37" r="1" fill="#FFFFFF"/><circle cx="118.8" cy="37" r="1" fill="#FFFFFF"/>` +
    // Helmet: glossy shell, white racing stripe, smoked visor with a reflection, vents.
    `<path d="M82 31 C82 12.5 95 6.5 106 6.5 C120.5 6.5 129.5 15.5 129.5 31 Z" fill="url(#${g('Paint')})"/>` +
    `<path d="M95.5 9.4 C99 8 102 7.4 104.6 7.1 L105.2 31 L98.6 31 Z" fill="#FFFFFF"/>` +
    `<path d="M113.5 13.2 C122.5 15.8 128.6 22.4 129.5 31 L112.6 31 Z" fill="url(#${g('Visor')})"/>` +
    `<path d="M117.5 16.8 C121.6 18.8 124.6 22 126 25.6" fill="none" stroke="#FFFFFF" stroke-width="1.5" opacity=".6" stroke-linecap="round"/>` +
    `<path d="M86.5 21 C88.4 15 93 11.4 98 10" fill="none" stroke="#FFFFFF" stroke-width="1.8" opacity=".5" stroke-linecap="round"/>` +
    `<circle cx="90" cy="25" r="1.2" fill="${RED_DEEP}"/><circle cx="94" cy="25" r="1.2" fill="${RED_DEEP}"/>` +
    `<rect x="80.5" y="29" width="50" height="4.4" rx="2.2" fill="${RED_DEEP}"/>` +
    `<path d="M122 33.4 L121 40" stroke="${INK}" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>` +
    `</g>` +
    // Arm to the grip, in a glove.
    `<path d="M113 46 Q139 51 160 38.5" fill="none" stroke="${SKIN_DARK}" stroke-width="7.6" stroke-linecap="round"/>` +
    `<path d="M113 45 Q139 50 160 37.5" fill="none" stroke="${SKIN}" stroke-width="5.2" stroke-linecap="round"/>` +
    `<circle cx="161" cy="38" r="5" fill="${INK}"/><circle cx="159.6" cy="36.6" r="1.4" fill="#4E4956"/>`

  const scooter =
    // Floorboard with its mat, and the leg shield up to the column.
    `<path d="M121 90.5 L160 90.5 L158 98 L119 98 Z" fill="${RED_DARK}"/>` +
    `<rect x="122" y="89" width="36" height="2.6" rx="1.2" fill="${INK}"/>` +
    `<path d="M147 98 L162 98 C172 80 178 60 180.5 37.5 L171 36 C168 58 160 78 147 92 Z" fill="url(#${g('Paint')})"/>` +
    `<path d="M170.4 42 C168 60 162 76 153.5 88.5" fill="none" stroke="#FFFFFF" stroke-width="2" opacity=".6" stroke-linecap="round"/>` +
    // Fork, front mudguard with highlight.
    `<path d="M178 46 L194 99" stroke="url(#${g('Chrome')})" stroke-width="4.6" stroke-linecap="round"/>` +
    `<path d="M176 88.5 C182 74 206 74 212.5 88.5 L208.5 90.5 C202 80.5 186 80.5 180 90.5 Z" fill="url(#${g('Paint')})"/>` +
    `<path d="M183 82.5 C188.5 78.5 198 78 204 81" fill="none" stroke="#FFFFFF" stroke-width="1.6" opacity=".55" stroke-linecap="round"/>` +
    // Headset, headlight in a chrome ring, mirror, grip.
    `<rect x="165" y="31" width="22" height="10" rx="5" fill="url(#${g('Paint')})"/>` +
    `<rect x="167" y="32" width="15" height="2.4" rx="1.2" fill="#FFFFFF" opacity=".4"/>` +
    `<circle cx="187.5" cy="37.5" r="6" fill="url(#${g('Chrome')})"/><circle cx="188" cy="37.5" r="4.4" fill="#FFF3C4"/><circle cx="189" cy="36.2" r="1.6" fill="#FFFFFF"/>` +
    `<path d="M172 32 L167.5 18" stroke="${CHROME_DARK}" stroke-width="2.2" stroke-linecap="round"/>` +
    `<ellipse cx="166.5" cy="15" rx="5.4" ry="3.8" fill="${INK}"/><ellipse cx="165.4" cy="13.9" rx="2.6" ry="1.3" fill="#FFFFFF" opacity=".4"/>` +
    `<rect x="155" y="34" width="12" height="6.4" rx="3.2" fill="${INK}"/>` +
    wheel(62) +
    wheel(194)

  const back =
    // Exhaust.
    `<rect x="42" y="95.5" width="44" height="8" rx="4" fill="url(#${g('Chrome')})"/>` +
    `<rect x="39.5" y="97" width="5.5" height="5" rx="2" fill="#4E5157"/>` +
    // Rear cowl: two-tone with a crisp top highlight, panel line, tail light.
    `<path d="M35 93 C33 76 46 63 71 62.5 L121 62.5 C131 62.5 133 72 130 82 L125 95 Z" fill="url(#${g('Paint')})"/>` +
    `<path d="M37 88 C38 92 40 94 44 94.5 L124.5 95 L125 95 L127 89 Z" fill="${RED_DARK}"/>` +
    `<path d="M43 76 C49 68.5 61 66 77 66 L108 66" fill="none" stroke="#FFFFFF" stroke-width="2.8" opacity=".55" stroke-linecap="round"/>` +
    `<path d="M50 84 L118 84" stroke="#FFFFFF" stroke-width="1.6" opacity=".35" stroke-linecap="round"/>` +
    `<rect x="30" y="72" width="9" height="7" rx="2.4" fill="#FF6B6B"/><rect x="31.5" y="73.3" width="3" height="2" rx="1" fill="#FFFFFF" opacity=".8"/>` +
    // Seat with stitching.
    `<path d="M66 55 L124 55 C131.5 55 131.5 64.5 124 64.5 L66 64.5 C58.5 64.5 58.5 55 66 55 Z" fill="#2A2730"/>` +
    `<path d="M66 55 L124 55 C129 55 130.5 57.5 130.5 59 L59.5 59 C59.5 57.5 61 55 66 55 Z" fill="#45414D"/>` +
    `<path d="M67 61 L123 61" stroke="#FFFFFF" stroke-width=".9" opacity=".25" stroke-dasharray="2.2 2"/>`

  const shadow = `<ellipse cx="128" cy="117.5" rx="96" ry="3.4" fill="#000000" opacity=".35"/>`
  return `${defs}${shadow}${motion}${box}${back}<g class="${c}bob">${body}</g>${scooter}`
}

/** CSS for the classes the drawing uses, with a class prefix. */
export const riderCss = (c: string) =>
  `.${c}spin{animation:${c}spin .42s linear infinite}` +
  `.${c}bob{animation:${c}bob .5s ease-in-out infinite}` +
  `.${c}scarf{animation:${c}scarf .36s ease-in-out infinite alternate}` +
  `.${c}lines{animation:${c}lines .32s steps(2) infinite}` +
  `.${c}puff{animation:${c}puff .7s ease-out infinite}` +
  `@keyframes ${c}spin{to{transform:rotate(360deg)}}` +
  `@keyframes ${c}bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.4px)}}` +
  `@keyframes ${c}scarf{from{transform:skewY(0deg) scaleY(1)}to{transform:skewY(-7deg) scaleY(.82)}}` +
  `@keyframes ${c}lines{0%{transform:translateX(0);opacity:1}50%{transform:translateX(-5px);opacity:.35}}` +
  `@keyframes ${c}puff{0%{transform:translateX(0) scale(1);opacity:.9}100%{transform:translateX(-12px) scale(1.4);opacity:0}}`
