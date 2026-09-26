import { Box, Flex, Text, chakra } from '@chakra-ui/react'
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts'
import { useEffect, useRef, useState } from 'react'
import { type Candle, TIMEFRAMES, type Timeframe } from '@/app/lib/api/gecko'
import { formatPrice, formatUsd } from '@/app/lib/format'
import { useCandles } from '@/app/hooks/useMarketData'
import { Skeleton } from './ui'

// Chart-only steps of the long/short hues (see tokens.css): validated for the dark surface.
const UP = '#80a21b'
const DOWN = '#b53627'
const INK_MUTED = '#b9c2b3'
const LINE = '#2b3b2d'
const GRID = 'rgba(255,255,255,0.045)'

type Readout = Pick<Candle, 'open' | 'high' | 'low' | 'close' | 'volume'> & { time: number }

/**
 * Candles + volume for one pool, from GeckoTerminal OHLCV.
 * Up candles are hollow and down candles filled, so direction never rests on color alone.
 * Volume sits in its own pane: one price axis per pane.
 */
export function PriceChart({ pool, symbol }: { pool: string | undefined; symbol: string }) {
  const [tf, setTf] = useState<Timeframe>(TIMEFRAMES[1])
  const { data, isPending, isError } = useCandles(pool, tf)
  const host = useRef<HTMLDivElement>(null)
  const chart = useRef<IChartApi | null>(null)
  const candles = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volume = useRef<ISeriesApi<'Histogram'> | null>(null)
  const [hover, setHover] = useState<Readout | null>(null)

  // create once
  useEffect(() => {
    if (!host.current) return
    const c = createChart(host.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: INK_MUTED,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 11,
        panes: { separatorColor: LINE, separatorHoverColor: LINE },
        attributionLogo: true,
      },
      grid: { vertLines: { color: GRID }, horzLines: { color: GRID } },
      rightPriceScale: { borderColor: LINE },
      timeScale: { borderColor: LINE, timeVisible: true, secondsVisible: false },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: 'rgba(210,255,77,0.35)', labelBackgroundColor: '#1b2413' },
        horzLine: { color: 'rgba(210,255,77,0.35)', labelBackgroundColor: '#1b2413' },
      },
    })
    const cs = c.addSeries(CandlestickSeries, {
      upColor: 'rgba(0,0,0,0)',
      borderUpColor: UP,
      wickUpColor: UP,
      downColor: DOWN,
      borderDownColor: DOWN,
      wickDownColor: DOWN,
      priceFormat: { type: 'custom', minMove: 1e-12, formatter: (p: number) => formatPrice(p).replace('$', '') },
    })
    const vs = c.addSeries(HistogramSeries, { priceFormat: { type: 'volume' }, priceLineVisible: false, lastValueVisible: false }, 1)
    c.panes()[1]?.setHeight(88)
    c.subscribeCrosshairMove((param) => {
      const bar = param.seriesData.get(cs) as { open: number; high: number; low: number; close: number } | undefined
      const v = param.seriesData.get(vs) as { value: number } | undefined
      setHover(bar && param.time ? { ...bar, volume: v?.value ?? 0, time: Number(param.time) } : null)
    })
    chart.current = c
    candles.current = cs
    volume.current = vs
    return () => {
      c.remove()
      chart.current = null
    }
  }, [])

  // feed data
  useEffect(() => {
    if (!data || !candles.current || !volume.current) return
    candles.current.setData(data.map((d) => ({ time: d.time as UTCTimestamp, open: d.open, high: d.high, low: d.low, close: d.close })))
    volume.current.setData(
      data.map((d) => ({ time: d.time as UTCTimestamp, value: d.volume, color: d.close >= d.open ? 'rgba(128,162,27,0.55)' : 'rgba(181,54,39,0.6)' })),
    )
    chart.current?.timeScale().fitContent()
  }, [data])

  const last = data?.at(-1)
  const shown: Readout | undefined = hover ?? (last ? { ...last } : undefined)
  const first = data?.[0]

  return (
    <Box>
      <Flex align="center" justify="space-between" gap="12px" wrap="wrap" px="16px" pt="14px" pb="6px">
        <Flex gap="14px" wrap="wrap" fontSize="12px" color="var(--muted)" className="tabular" aria-live="off">
          {shown ? (
            <>
              <span>O <chakra.span color="var(--white)">{formatPrice(shown.open)}</chakra.span></span>
              <span>H <chakra.span color="var(--white)">{formatPrice(shown.high)}</chakra.span></span>
              <span>L <chakra.span color="var(--white)">{formatPrice(shown.low)}</chakra.span></span>
              <span>C <chakra.span color="var(--white)">{formatPrice(shown.close)}</chakra.span></span>
              <span>Vol <chakra.span color="var(--white)">{formatUsd(shown.volume)}</chakra.span></span>
            </>
          ) : (
            <span>{symbol} price</span>
          )}
        </Flex>
        <Flex role="tablist" aria-label="Timeframe" gap="4px">
          {TIMEFRAMES.map((t) => (
            <chakra.button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={t.key === tf.key}
              onClick={() => setTf(t)}
              h="26px"
              px="10px"
              borderRadius="60px"
              border="none"
              fontSize="12px"
              cursor="pointer"
              bg={t.key === tf.key ? 'var(--accent)' : 'transparent'}
              color={t.key === tf.key ? 'var(--accent-ink)' : 'var(--white-80)'}
            >
              {t.label}
            </chakra.button>
          ))}
        </Flex>
      </Flex>
      <Box position="relative" h={{ base: '300px', md: '380px' }}>
        <Box ref={host} position="absolute" inset="0" aria-hidden="true" />
        {(isPending || !pool) && (
          <Flex position="absolute" inset="0" p="16px" direction="column" gap="10px" justify="flex-end">
            <Skeleton h="60%" />
            <Skeleton h="18%" />
          </Flex>
        )}
        {isError && (
          <Flex position="absolute" inset="0" align="center" justify="center">
            <Text m="0" fontSize="14px" color="var(--muted)">Price history is unavailable right now. Retrying…</Text>
          </Flex>
        )}
        {data && data.length === 0 && (
          <Flex position="absolute" inset="0" align="center" justify="center">
            <Text m="0" fontSize="14px" color="var(--muted)">No trades in this window yet.</Text>
          </Flex>
        )}
      </Box>
      {first && last && (
        <p className="sr-only">
          {symbol} {tf.label} candles: opened the window at {formatPrice(first.open)}, last {formatPrice(last.close)}.
        </p>
      )}
    </Box>
  )
}
