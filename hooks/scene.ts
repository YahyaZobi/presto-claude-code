// Vector art for the desktop app and VS Code: Claude's mascot riding a Presto
// delivery scooter (the spinner beside the working indicator). The drawing
// itself lives in rider.ts, shared with the card.

import { riderArt, riderCss } from './rider'

/** The spinner's box: room on the left for the smoke trail, below for the road. */
const VIEW = { x: -34, y: 0, w: 266, h: 124 }

/** Claude on the scooter alone (the spinner). */
export function riderVector(opts: { moving: boolean; width?: number }): string {
  const w = opts.width ?? 64
  const h = Math.round((w * VIEW.h) / VIEW.w)
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}" width="${w}" height="${h}">` +
    (opts.moving ? `<style>${riderCss('')}</style>` : '') +
    riderArt({ c: '', id: 'r', moving: opts.moving, road: opts.moving }) +
    `</svg>`
  )
}
