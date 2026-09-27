const usdCompact = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2 })
const usdFull = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
const num = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })
const numCompact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 })

const SUB = '₀₁₂₃₄₅₆₇₈₉'
const subscript = (n: number) => String(n).replace(/\d/g, (d) => SUB[Number(d)])

/** Token prices span 1e-9..1e4: keep ~4 significant digits; long zero runs use the subscript form ($0.0₆1234). */
export function formatPrice(v: number | undefined | null): string {
  if (v == null || !Number.isFinite(v)) return '–'
  if (v === 0) return '$0'
  const abs = Math.abs(v)
  if (abs >= 1) return usdFull.format(v)
  if (abs >= 0.0001) return `$${v.toPrecision(4)}`
  const zeros = Math.floor(-Math.log10(abs)) - 1
  const digits = Math.round(abs * 10 ** (zeros + 4)).toString().slice(0, 4)
  return `$0.0${subscript(zeros)}${digits}`
}

export const formatUsd = (v: number | undefined | null, compact = true) =>
  v == null || !Number.isFinite(v) ? '–' : compact && Math.abs(v) >= 10_000 ? usdCompact.format(v) : usdFull.format(v)

export const formatNumber = (v: number | undefined | null, compact = false) =>
  v == null || !Number.isFinite(v) ? '–' : compact ? numCompact.format(v) : num.format(v)

export function formatPct(v: number | undefined | null): string {
  if (v == null || !Number.isFinite(v)) return '–'
  const s = Math.abs(v) >= 1000 ? numCompact.format(v) : v.toFixed(2)
  return `${v > 0 ? '+' : ''}${s}%`
}

export function formatSol(v: number | undefined | null, digits = 4): string {
  if (v == null || !Number.isFinite(v)) return '–'
  if (v !== 0 && Math.abs(v) < 10 ** -digits) return `<${(10 ** -digits).toFixed(digits)} SOL`
  return `${v.toLocaleString('en-US', { maximumFractionDigits: digits })} SOL`
}

export const shortAddress = (a: string | undefined) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '–')

export function timeAgo(ms: number | undefined, now = Date.now()): string {
  if (!ms) return '–'
  const s = Math.max(0, Math.round((now - ms) / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 48) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}

/** Sign → side colour (up = long, down = short). */
export const changeColor = (v: number | undefined | null) =>
  v == null || !Number.isFinite(v) || v === 0 ? 'var(--muted)' : v > 0 ? 'var(--long)' : 'var(--short)'
