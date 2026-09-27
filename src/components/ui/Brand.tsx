import { LOCKUP, MARK, WORDMARK } from '@/brand/generated'

type Rect = readonly [number, number, number, number]
const r = ([x, y, width, height]: Rect) => ({ x, y, width, height })

type MarkProps = {
  size: number
  /** duo = mint long eye + orange short eye + white grin (dark surfaces); mono = one colour (light surfaces, nav) */
  tone?: 'duo' | 'mono'
  color?: string
  /** Grin colour in duo tone. */
  faceColor?: string
  /** Loop the "diverge and lock" motion: the long eye lifts, the short eye sinks, both snap back. */
  animate?: boolean
  className?: string
  title?: string
}

/** The FunPerps mark: a grin whose eyes are a long candle and a short candle. */
export function Mark({ size, tone = 'duo', color = 'currentColor', faceColor = 'var(--white)', animate = false, className, title }: MarkProps) {
  const long = tone === 'duo' ? 'var(--long)' : color
  const short = tone === 'duo' ? 'var(--short)' : color
  const face = tone === 'duo' ? faceColor : color
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
        <rect {...r(MARK.short.body)} rx={MARK.bodyR} fill={short} />
      </g>
      <path d={MARK.smile.d} fill="none" stroke={face} strokeWidth={MARK.smile.width} strokeLinecap="round" />
    </svg>
  )
}

/** Wordmark "Fun" + italic "Perps", outlined. `height` sets the glyph box height. */
export function Wordmark({ height, color = 'currentColor', className }: { height: number; color?: string; className?: string }) {
  const [x, y, w, h] = WORDMARK.box
  return (
    <svg className={className} height={height} width={(height * w) / h} viewBox={`${x} ${y} ${w} ${h}`} aria-hidden="true">
      <path d={WORDMARK.d} fill={color} />
    </svg>
  )
}

/** Header lockup: mono mark + wordmark in one SVG. */
export function Lockup({ height, color = 'currentColor', title = 'FunPerps' }: { height: number; color?: string; title?: string }) {
  const { width, height: H, top, markScale, markX, markY, textX } = LOCKUP
  return (
    <svg height={height} width={(height * width) / H} viewBox={`0 ${top} ${width} ${H}`} role="img" aria-label={title}>
      <g transform={`translate(${markX} ${markY}) scale(${markScale})`} fill={color}>
        <rect {...r(MARK.long.wick)} rx={MARK.wickR} />
        <rect {...r(MARK.long.body)} rx={MARK.bodyR} />
        <rect {...r(MARK.short.wick)} rx={MARK.wickR} />
        <rect {...r(MARK.short.body)} rx={MARK.bodyR} />
        <path d={MARK.smile.d} fill="none" stroke={color} strokeWidth={MARK.smile.width} strokeLinecap="round" />
      </g>
      <path transform={`translate(${textX} 0)`} d={WORDMARK.d} fill={color} />
    </svg>
  )
}
