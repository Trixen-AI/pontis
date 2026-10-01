import { LOCKUP, MARK, WORDMARK } from '@/brand/generated'

type Rect = readonly [number, number, number, number]
const r = ([x, y, width, height]: Rect) => ({ x, y, width, height })

type MarkProps = {
  size: number
  /** duo = mint long + coral short (dark surfaces); mono = one colour (light surfaces, nav) */
  tone?: 'duo' | 'mono'
  color?: string
  /** Loop the "diverge and lock" motion: long lifts, short sinks, both snap back into the P. */
  animate?: boolean
  className?: string
  title?: string
}

/** The Ponsia Perps mark: a long candle and a short candle locked into a "P". */
export function Mark({ size, tone = 'duo', color = 'currentColor', animate = false, className, title }: MarkProps) {
  const long = tone === 'duo' ? 'var(--accent)' : color
  const short = tone === 'duo' ? 'var(--rug)' : color
  const cls = ['pmark', animate ? 'pmark--live' : '', className ?? ''].filter(Boolean).join(' ')
  return (
    <svg
      className={cls}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      overflow="visible"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <g className="pmark-long">
        <rect className="pmark-long-wick" {...r(MARK.long.wick)} rx={MARK.wickR} fill={long} />
        <rect {...r(MARK.long.body)} rx={MARK.bodyR} fill={long} />
      </g>
      <g className="pmark-short">
        <rect className="pmark-short-wick" {...r(MARK.short.wick)} rx={MARK.wickR} fill={short} />
        <path d={MARK.short.bodyPath} fill={short} />
      </g>
    </svg>
  )
}

/** Wordmark "Ponsia" + italic "Perps", outlined. `height` sets the glyph box height. */
export function Wordmark({ height, color = 'currentColor', className }: { height: number; color?: string; className?: string }) {
  const [x, y, w, h] = WORDMARK.box
  return (
    <svg className={className} height={height} width={(height * w) / h} viewBox={`${x} ${y} ${w} ${h}`} aria-hidden="true">
      <path d={WORDMARK.d} fill={color} />
    </svg>
  )
}

/** Header lockup: mono mark + wordmark in one SVG. */
export function Lockup({ height, color = 'currentColor', title = 'Ponsia Perps' }: { height: number; color?: string; title?: string }) {
  const { width, height: H, top, markScale, markX, markY, textX } = LOCKUP
  return (
    <svg height={height} width={(height * width) / H} viewBox={`0 ${top} ${width} ${H}`} role="img" aria-label={title}>
      <g transform={`translate(${markX} ${markY}) scale(${markScale})`} fill={color}>
        <rect {...r(MARK.long.wick)} rx={MARK.wickR} />
        <rect {...r(MARK.long.body)} rx={MARK.bodyR} />
        <rect {...r(MARK.short.wick)} rx={MARK.wickR} />
        <path d={MARK.short.bodyPath} />
      </g>
      <path transform={`translate(${textX} 0)`} d={WORDMARK.d} fill={color} />
    </svg>
  )
}
