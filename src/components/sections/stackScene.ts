// Geometry for the isometric "inside FunPerps" scene, in a 1320 x 615 artboard.
// Candles stand on two engine plates, which sit on the Solana base.

export const ART_W = 1320
export const ART_H = 615

const U = 36 // px per grid unit
const OX = 640 // screen x of grid origin
const OY = 236 // screen y of grid origin
const C30 = Math.cos(Math.PI / 6)

export type P = [number, number]
/** grid (x right-down, y left-down, z up) -> screen */
export const iso = (x: number, y: number, z: number): P => [OX + (x - y) * C30 * U, OY + (x + y) * 0.5 * U - z * U]

const pts = (ps: P[]) => ps.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ')

export type Box = {
  x: number; y: number; z: number; w: number; d: number; h: number
}

/** Three visible faces of a box: top, front-left (+y), front-right (+x). */
export function boxFaces(b: Box) {
  const { x, y, z, w, d, h } = b
  const x2 = x + w
  const y2 = y + d
  const z2 = z + h
  return {
    top: pts([iso(x, y, z2), iso(x2, y, z2), iso(x2, y2, z2), iso(x, y2, z2)]),
    left: pts([iso(x, y2, z2), iso(x2, y2, z2), iso(x2, y2, z), iso(x, y2, z)]),
    right: pts([iso(x2, y, z2), iso(x2, y2, z2), iso(x2, y2, z), iso(x2, y, z)]),
  }
}

/** SVG matrix that lays text on the +y face, reading upward. Origin = bottom-left of the face. */
export function upFaceText(b: Box, inset = 0.5): string {
  const [ex, ey] = iso(b.x + inset, b.y + b.d, b.z + 0.22)
  // baseline -> screen up; glyph "down" -> +x direction
  return `matrix(0 -1 ${C30.toFixed(4)} 0.5 ${ex.toFixed(1)} ${ey.toFixed(1)})`
}

/** SVG matrix that lays text along the +y face, reading left to right (for plate labels). */
export function alongFaceText(b: Box, along = 0.6, drop = 0.28): string {
  const [ex, ey] = iso(b.x + along, b.y + b.d, b.z + b.h - drop)
  return `matrix(${C30.toFixed(4)} 0.5 0 1 ${ex.toFixed(1)} ${ey.toFixed(1)})`
}

export const BASE: Box = { x: 0, y: 0, z: 0, w: 10, d: 10, h: 0.9 }
export const BASE_SHADOW: Box = { x: 0.15, y: 0.15, z: -0.9, w: 9.7, d: 9.7, h: 0.9 }
export const PLATE_L: Box = { x: 0.45, y: 0.45, z: 1.25, w: 3.85, d: 9.1, h: 0.8 }
export const PLATE_R: Box = { x: 4.65, y: 0.45, z: 1.25, w: 4.9, d: 9.1, h: 0.8 }

const TOP = PLATE_L.z + PLATE_L.h
export type CandleDef = { id: string; x: number; y: number; h: number; wick: number }
// footprint 1.1 x 1.1; wick = length of the upper wick in grid units
export const CANDLES: CandleDef[] = [
  { id: 'listings', x: 0.9, y: 1.9, h: 2.7, wick: 0.7 },
  { id: 'funding', x: 4.9, y: 1.2, h: 3.0, wick: 0.5 },
  { id: 'mark', x: 7.9, y: 0.6, h: 4.3, wick: 0.9 },
  { id: 'every', x: 2.8, y: 1.0, h: 4.9, wick: 0.6 },
  { id: 'insurance', x: 8.3, y: 3.6, h: 3.5, wick: 0.4 },
  { id: 'liq', x: 5.6, y: 4.6, h: 2.3, wick: 1.4 },
  { id: 'longs', x: 0.9, y: 7.3, h: 3.4, wick: 0.8 },
  { id: 'vaults', x: 6.5, y: 7.4, h: 2.6, wick: 0.5 },
  { id: 'shorts', x: 3.05, y: 7.5, h: 1.7, wick: 1.9 },
]
export const candleBox = (c: CandleDef): Box => ({ x: c.x, y: c.y, z: TOP, w: 1.1, d: 1.1, h: c.h })
export const wickLine = (c: CandleDef): [P, P] => {
  const cx = c.x + 0.55
  const cy = c.y + 0.55
  return [iso(cx, cy, TOP + c.h), iso(cx, cy, TOP + c.h + c.wick)]
}

// Callout layout (artboard px). `line` is the leader: underline start/end then the elbow to the target.
export const CALLOUTS = [
  { x: 70, y: 70, w: 260, target: iso(0.9 + 0.1, 7.3 + 1.1, TOP + 3.4 - 0.3), side: 'left', underline: 172 },
  { x: 70, y: 458, w: 300, target: iso(0.9 + 0.3, 1.9 + 1.1, TOP + 0.9), side: 'left', underline: 446 },
  { x: 1016, y: 40, w: 300, target: iso(PLATE_R.x + PLATE_R.w, PLATE_R.y + 1.2, PLATE_R.z + 0.4), side: 'right', underline: 272 },
  { x: 1016, y: 470, w: 290, target: iso(BASE.x + BASE.w, BASE.y + 5.8, 0.45), side: 'right', underline: 456 },
] as const
