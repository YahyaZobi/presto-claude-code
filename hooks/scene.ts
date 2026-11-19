// Vector art for the desktop app and VS Code: Claude's mascot riding a Presto
// delivery scooter (the spinner beside the working indicator). The drawing
// itself lives in rider.ts, shared with the card.

import { riderArt, riderCss } from './rider'

/** Claude on the scooter alone (the spinner). */
export function riderVector(opts: { moving: boolean; width?: number }): string {
  const w = opts.width ?? 64
  const h = Math.round((w * 120) / 232)
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 232 120" width="${w}" height="${h}">` +
    (opts.moving ? `<style>${riderCss('')}</style>` : '') +
    riderArt({ c: '', id: 'r', moving: opts.moving }) +
    `</svg>`
  )
}
