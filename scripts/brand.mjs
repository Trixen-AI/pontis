// Builds the Ponsia Perps logo from one source of truth:
//   - the mark: two candlesticks locked into a "P". A tall long candle (wick up) is the stem,
//     a short candle (wick down) is the bowl. Both sides of a perp in one letter.
//   - the "Ponsia" + italic "Perps" wordmark, outlined to paths from Newsreader Light
// Writes src/brand/generated.ts, public/brand/*.svg (+ PNG exports) and public/favicon.svg.
// Run: npm run brand
import fs from 'node:fs'
import path from 'node:path'
import opentype from 'opentype.js'
import { Resvg } from '@resvg/resvg-js'

const root = path.resolve(import.meta.dirname, '..')
const fontDir = path.join(root, 'node_modules/@fontsource/newsreader/files')

// Brand tokens (mirrors src/styles/tokens.css)
const INK = '#072723'
const ACCENT = '#97FCE4' // long
const RUG = '#EC6853' // short
const PAPER = '#F5FEFD'

// ---- Mark: 100x100 box, rects only. [x, y, w, h] ----
// The short candle's body is the P's bowl: square on the stem side, rounded on the outside.
const bowl = (x, y, w, h, r, R) =>
  `M${x + r} ${y}H${x + w - R}A${R} ${R} 0 0 1 ${x + w} ${y + R}V${y + h - R}A${R} ${R} 0 0 1 ${x + w - R} ${y + h}` +
  `H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`
const MARK = {
  long: { wick: [24.5, 14, 7, 22], body: [15, 32, 26, 54] },
  short: { bodyPath: bowl(47, 32, 38, 32, 4, 13), wick: [62.5, 58, 7, 22] },
  bodyR: 4,
  wickR: 3.5,
  bounds: [15, 14, 70, 72], // visual box inside the 100 grid
}

const rect = ([x, y, w, h], r, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"/>`
/** Mark markup in the 100 grid. Wicks sit under bodies so the joins stay clean. */
const markInner = (longFill, shortFill) =>
  rect(MARK.long.wick, MARK.wickR, longFill) +
  rect(MARK.long.body, MARK.bodyR, longFill) +
  rect(MARK.short.wick, MARK.wickR, shortFill) +
  `<path d="${MARK.short.bodyPath}" fill="${shortFill}"/>`

// ---- Wordmark ----
const load = (f) => {
  const buf = fs.readFileSync(path.join(fontDir, f))
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
}
const roman = load('newsreader-latin-300-normal.woff')
const italic = load('newsreader-latin-300-italic.woff')

// opentype.js toPathData() can emit "NaN" for some glyph positions (seen on "e" at x≈415, 96px),
// which makes renderers drop the rest of the path. Serialize the commands ourselves instead.
const f2 = (n) => String(Math.round(n * 100) / 100)
function pathToD(p) {
  let d = ''
  for (const c of p.commands) {
    if (c.type === 'M' || c.type === 'L') d += `${c.type}${f2(c.x)} ${f2(c.y)}`
    else if (c.type === 'Q') d += `Q${f2(c.x1)} ${f2(c.y1)} ${f2(c.x)} ${f2(c.y)}`
    else if (c.type === 'C') d += `C${f2(c.x1)} ${f2(c.y1)} ${f2(c.x2)} ${f2(c.y2)} ${f2(c.x)} ${f2(c.y)}`
    else if (c.type === 'Z') d += 'Z'
  }
  return d
}

const SIZE = 100 // font units -> px at 100px
const TRACK = -1.5 // px of tracking at 100px (tight, display setting)

function outline(track = TRACK) {
  let x = 0
  const parts = []
  const run = (font, text) => {
    for (const ch of text) {
      const g = font.charToGlyph(ch)
      const p = g.getPath(x, 0, SIZE)
      parts.push(p)
      x += (g.advanceWidth / font.unitsPerEm) * SIZE + track
    }
  }
  run(roman, 'Ponsia')
  // word space, then the italic "Perps"
  x += (roman.charToGlyph(' ').advanceWidth / roman.unitsPerEm) * SIZE + track
  run(italic, 'Perps')
  const d = parts.map((p) => pathToD(p)).join('')
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity
  for (const p of parts) {
    const b = p.getBoundingBox()
    if (b.x1 === b.x2) continue
    x1 = Math.min(x1, b.x1); y1 = Math.min(y1, b.y1); x2 = Math.max(x2, b.x2); y2 = Math.max(y2, b.y2)
  }
  const capHeight = (roman.tables.os2.sCapHeight / roman.unitsPerEm) * SIZE
  return { d, box: [x1, y1, x2 - x1, y2 - y1].map((n) => +n.toFixed(2)), capHeight: +capHeight.toFixed(2) }
}
const word = outline()
// Display cut for the giant footer wordmark: slightly open tracking for the full-width band
const wordWide = outline(4)

// ---- Lockup (mark + wordmark) ----
// The mark's visual box is sized a touch over cap height and sits on the baseline.
const [bx, by, bw, bh] = MARK.bounds
const S = (word.capHeight * 1.06) / bh
const MARK_X = -bx * S
const MARK_Y = -(by + bh) * S
const TEXT_X = bw * S + word.capHeight * 0.3 - word.box[0]
const L_TOP = Math.min(MARK_Y + by * S, word.box[1])
const L_W = TEXT_X + word.box[0] + word.box[2]
const L_H = Math.max(0, word.box[1] + word.box[3]) - L_TOP

function lockupSvg({ color, longFill, shortFill, bg }, pad = 0) {
  const vb = `${(-pad).toFixed(2)} ${(L_TOP - pad).toFixed(2)} ${(L_W + pad * 2).toFixed(2)} ${(L_H + pad * 2).toFixed(2)}`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${bg ? `<rect x="${-pad}" y="${L_TOP - pad}" width="${L_W + pad * 2}" height="${L_H + pad * 2}" fill="${bg}"/>` : ''}<g transform="translate(${MARK_X.toFixed(2)} ${MARK_Y.toFixed(2)}) scale(${S.toFixed(4)})">${markInner(longFill, shortFill)}</g><path transform="translate(${TEXT_X.toFixed(2)} 0)" d="${word.d}" fill="${color}"/></svg>`
}

// Square mark (favicon + mark exports)
const markSvg = (longFill, shortFill, bg, pad = 12) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${100 + pad * 2} ${100 + pad * 2}">${bg ? `<rect x="${-pad}" y="${-pad}" width="${100 + pad * 2}" height="${100 + pad * 2}" rx="${bg === INK ? 22 : 0}" fill="${bg}"/>` : ''}${markInner(longFill, shortFill)}</svg>`

// ---- write files ----
fs.mkdirSync(path.join(root, 'src/brand'), { recursive: true })
fs.mkdirSync(path.join(root, 'public/brand'), { recursive: true })

const r2 = (n) => +n.toFixed(3)
const ts = `// Generated by scripts/brand.mjs. Do not edit by hand: run \`npm run brand\`.
/** Two-candle mark in a 100 grid. Rects are [x, y, w, h]. */
export const MARK = ${JSON.stringify(MARK, null, 2)} as const
/** Wordmark "Ponsia" + italic "Perps", Newsreader Light outlined at 100px. box = [x, y, w, h] (baseline at y=0). */
export const WORDMARK = ${JSON.stringify(word, null, 2)} as const
/** Wide-tracked display cut of the wordmark (footer band). */
export const WORDMARK_WIDE = ${JSON.stringify(wordWide, null, 2)} as const
/** Header lockup geometry (same units as WORDMARK). */
export const LOCKUP = ${JSON.stringify({ width: r2(L_W), height: r2(L_H), top: r2(L_TOP), markScale: r2(S), markX: r2(MARK_X), markY: r2(MARK_Y), textX: r2(TEXT_X) }, null, 2)} as const
`
fs.writeFileSync(path.join(root, 'src/brand/generated.ts'), ts)

// Lockups: mono ink (light surfaces), two-tone on dark (inverted)
fs.writeFileSync(path.join(root, 'public/brand/logo.svg'), lockupSvg({ color: INK, longFill: INK, shortFill: INK }, 4))
fs.writeFileSync(path.join(root, 'public/brand/logo-inverted.svg'), lockupSvg({ color: PAPER, longFill: ACCENT, shortFill: RUG }, 4))
fs.writeFileSync(path.join(root, 'public/brand/mark.svg'), markSvg(INK, INK, null, 0))
fs.writeFileSync(path.join(root, 'public/brand/mark-duo.svg'), markSvg(ACCENT, RUG, null, 0))
// favicon: two-tone mark on an ink tile, readable at 16px
fs.writeFileSync(path.join(root, 'public/favicon.svg'), markSvg(ACCENT, RUG, INK, 10))

// 500x500 exports: lockup centred with ~12% padding
function exportPng(file, opts) {
  const inner = 500 * 0.76
  const scale = inner / L_W
  const h = L_H * scale
  const body = lockupSvg(opts).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500" viewBox="0 0 500 500">${opts.bg ? `<rect width="500" height="500" fill="${opts.bg}"/>` : ''}<g transform="translate(${(500 - inner) / 2} ${((500 - h) / 2 - L_TOP * scale).toFixed(2)}) scale(${scale.toFixed(5)})">${body.replace(/^<rect[^>]*\/>/, '')}</g></svg>`
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 500 }, background: opts.bg ? undefined : 'rgba(0,0,0,0)' }).render().asPng()
  fs.writeFileSync(path.join(root, 'public/brand', file), png)
}
exportPng('logo-500.png', { color: PAPER, longFill: ACCENT, shortFill: RUG, bg: INK })
exportPng('logo-500-transparent.png', { color: INK, longFill: INK, shortFill: INK })

// ---- social + app icons ----
const MUTED = '#B0C5C1'
const inter = opentype.parse(
  (() => {
    const b = fs.readFileSync(path.join(root, 'node_modules/@fontsource/inter/files/inter-latin-400-normal.woff'))
    return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)
  })(),
)

/** Any line of text as one outlined path. Returns the path data and its advance width. */
function textPath(font, text, size, x, y, track = 0) {
  let cx = x
  let d = ''
  for (const ch of text) {
    const g = font.charToGlyph(ch)
    d += pathToD(g.getPath(cx, y, size))
    cx += (g.advanceWidth / font.unitsPerEm) * size + track
  }
  return { d, width: cx - x }
}

const png = (svg, w) => new Resvg(svg, { fitTo: { mode: 'width', value: w } }).render().asPng()

// Open Graph / X card, 1200x630
{
  const W = 1200
  const H = 630
  const lockH = 56 // lockup height on the card
  const ls = lockH / L_H
  const lockup = lockupSvg({ color: PAPER, longFill: ACCENT, shortFill: RUG }).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')
  const h1a = textPath(roman, 'Perps for every', 96, 80, 318, -1.5)
  const h1b = textPath(roman, 'PONS token.', 96, 80, 424, -1.5)
  const sub = textPath(inter, 'Long the runners. Short the rugs. Built on Robinhood Chain.', 27, 82, 494)
  const url = textPath(inter, 'ponsia.xyz', 24, 82, 566)
  const markSize = 330
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs><radialGradient id="g" cx="0.08" cy="1.05" r="0.75"><stop offset="0" stop-color="${ACCENT}" stop-opacity="0.38"/><stop offset="1" stop-color="${ACCENT}" stop-opacity="0"/></radialGradient></defs>
  <rect width="${W}" height="${H}" fill="${INK}"/><rect width="${W}" height="${H}" fill="url(#g)"/>
  <g transform="translate(80 ${(76 - L_TOP * ls).toFixed(2)}) scale(${ls.toFixed(5)})">${lockup}</g>
  <path d="${h1a.d}" fill="#FFFFFF"/><path d="${h1b.d}" fill="#FFFFFF"/>
  <path d="${sub.d}" fill="${MUTED}"/><path d="${url.d}" fill="${ACCENT}"/>
  <g transform="translate(${W - markSize - 70} ${(H - markSize) / 2 - 10}) scale(${markSize / 100})">${markInner(ACCENT, RUG)}</g>
</svg>`
  fs.writeFileSync(path.join(root, 'public/og-image.png'), png(svg, W))
}

// Home-screen and PWA icons: two-tone mark on a square ink tile (platforms round the corners)
const squareIcon = (pad) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${100 + pad * 2} ${100 + pad * 2}"><rect x="${-pad}" y="${-pad}" width="${100 + pad * 2}" height="${100 + pad * 2}" fill="${INK}"/>${markInner(ACCENT, RUG)}</svg>`
fs.writeFileSync(path.join(root, 'public/apple-touch-icon.png'), png(squareIcon(16), 180))
fs.writeFileSync(path.join(root, 'public/icon-192.png'), png(squareIcon(16), 192))
// maskable: keep the mark inside the 80% safe zone
fs.writeFileSync(path.join(root, 'public/icon-512.png'), png(squareIcon(30), 512))

console.log('brand: lockup', L_W.toFixed(1), 'x', L_H.toFixed(1), 'mark scale', S.toFixed(3), '| og-image + app icons written')
