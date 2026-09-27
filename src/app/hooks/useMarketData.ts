import { useQueries, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { PUMP_DEXES } from '@/app/config'
import { getQuotes, withDexLiquidity } from '@/app/lib/api/dexscreener'
import { type Market, type Timeframe, getCandles, getDexMarkets, getNewPumpMarkets, getTokenMarkets, getTrades } from '@/app/lib/api/gecko'
import { getBondingCurve, getBondingCurves } from '@/app/lib/solana'

const MIN = 60_000

const SOURCES = [
  { key: 'curve', load: (s?: AbortSignal) => getDexMarkets(PUMP_DEXES.curve, s) },
  { key: 'graduated', load: (s?: AbortSignal) => getDexMarkets(PUMP_DEXES.graduated, s) },
] as const

/**
 * Every Pump.fun market we can price: the most traded bonding curves plus the most traded PumpSwap pools.
 * PumpSwap is open to any token, so every pool is checked on-chain against the Pump.fun bonding-curve
 * program and only real Pump.fun launches are kept. One row per token (its most traded pool). PumpSwap liquidity comes from DexScreener.
 */
export function useMarkets() {
  const results = useQueries({
    queries: SOURCES.map((src) => ({
      queryKey: ['markets', src.key],
      queryFn: ({ signal }: { signal: AbortSignal }) => src.load(signal),
      staleTime: MIN,
      refetchInterval: MIN,
    })),
  })
  const stamp = results.map((r) => r.dataUpdatedAt).join()
  const candidates = useMemo(() => {
    const byToken = new Map<string, Market>()
    for (const r of results) {
      for (const m of r.data ?? []) {
        const prev = byToken.get(m.token)
        if (!prev || (m.volume24h || 0) > (prev.volume24h || 0)) byToken.set(m.token, m)
      }
    }
    return [...byToken.values()]
    // results is a new array each render; the timestamps say when its data actually changed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stamp])

  const mints = candidates.map((m) => m.token).sort().join(',')
  const verified = useQuery({
    queryKey: ['pump-verify', mints],
    queryFn: async ({ signal }) => {
      const curves = await getBondingCurves(candidates.map((m) => m.token))
      const liquid = await withDexLiquidity(
        candidates.filter((m) => curves.get(m.token)?.complete),
        signal,
      )
      return { curves, liquidity: new Map(liquid.map((m) => [m.token, m.liquidityUsd])) }
    },
    enabled: candidates.length > 0,
    staleTime: 5 * MIN,
    placeholderData: (prev) => prev,
  })

  const markets = useMemo(
    () =>
      verified.data
        ? candidates.flatMap((m) => {
            const c = verified.data.curves.get(m.token)
            if (!c) return [] // not a Pump.fun launch
            const stage = c.complete ? ('graduated' as const) : ('curve' as const)
            return [{ ...m, stage, progress: c.progress, liquidityUsd: verified.data.liquidity.get(m.token) ?? m.liquidityUsd }]
          })
        : [],
    [candidates, verified.data],
  )

  return {
    markets,
    isLoading: results.every((r) => r.isPending) || (candidates.length > 0 && verified.isPending),
    loaded: results.filter((r) => r.isSuccess).length + (verified.isSuccess ? 1 : 0),
    total: results.length + 1,
    updatedAt: Math.max(0, ...results.map((r) => r.dataUpdatedAt)),
    failed: results.filter((r) => r.isError).length + (verified.isError ? 1 : 0),
  }
}

export function useNewCurveMarkets(enabled: boolean) {
  return useQuery({
    queryKey: ['markets', 'curve-new'],
    queryFn: async ({ signal }) => {
      const fresh = (await getNewPumpMarkets(1, signal)).filter((m) => m.stage === 'curve')
      const curves = await getBondingCurves(fresh.map((m) => m.token))
      return fresh.flatMap((m) => {
        const c = curves.get(m.token)
        return c ? [{ ...m, progress: c.progress }] : []
      })
    },
    enabled,
    staleTime: 30_000,
    refetchInterval: enabled ? 30_000 : false,
  })
}

/** Everything the market page needs, fetched in parallel. */
export function useMarket(token: string | undefined) {
  const verify = useQuery({
    queryKey: ['pump-curve', token],
    queryFn: () => getBondingCurve(token!),
    enabled: !!token,
    refetchInterval: 30_000,
  })
  const pools = useQuery({
    queryKey: ['token-pools', token],
    queryFn: ({ signal }) => getTokenMarkets(token!, signal),
    enabled: !!token,
    staleTime: MIN,
    refetchInterval: MIN,
  })
  const quote = useQuery({
    queryKey: ['quote', token],
    queryFn: async ({ signal }) => (await getQuotes([token!], signal)).get(token!) ?? null,
    enabled: !!token,
    refetchInterval: 15_000,
  })
  const primary = pools.data?.[0]
  // Live price: DexScreener refreshes fastest; fall back to the pool snapshot.
  const priceUsd = quote.data?.priceUsd && Number.isFinite(quote.data.priceUsd) ? quote.data.priceUsd : primary?.priceUsd
  return { verify, pools, quote, primary, priceUsd }
}

export function useCandles(pool: string | undefined, tf: Timeframe) {
  return useQuery({
    queryKey: ['candles', pool, tf.key],
    queryFn: ({ signal }) => getCandles(pool!, tf, signal),
    enabled: !!pool,
    staleTime: MIN,
    refetchInterval: MIN,
  })
}

export function useTrades(pool: string | undefined) {
  return useQuery({
    queryKey: ['trades', pool],
    queryFn: ({ signal }) => getTrades(pool!, signal),
    enabled: !!pool,
    refetchInterval: 20_000,
  })
}
