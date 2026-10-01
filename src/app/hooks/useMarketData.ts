import { useQueries, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { Address } from 'viem'
import { PONS, PONS_DEXES } from '@/app/config'
import { getEthUsd, getTokenStats } from '@/app/lib/api/blockscout'
import { getQuotes } from '@/app/lib/api/dexscreener'
import { type Market, type Timeframe, getCandles, getDexMarkets, getTokenMarkets, getTrades } from '@/app/lib/api/gecko'
import { getPonsInfo } from '@/app/lib/pons'

const MIN = 60_000

export function useEthUsd() {
  return useQuery({ queryKey: ['eth-usd'], queryFn: ({ signal }) => getEthUsd(signal), staleTime: MIN, refetchInterval: MIN })
}

const SOURCES = [
  { key: 'graduated', load: (s?: AbortSignal) => getDexMarkets(PONS_DEXES.graduated, 'volume', s) },
  { key: 'curve', load: (s?: AbortSignal) => getDexMarkets(PONS_DEXES.curve, 'volume', s) },
  { key: 'legacy', load: (s?: AbortSignal) => getDexMarkets(PONS_DEXES.legacy, 'volume', s) },
  { key: 'pons', load: (s?: AbortSignal) => getTokenMarkets(PONS.token, s) },
] as const

/**
 * Every PONS market we can price: the top pools of each Pons dex plus PONS itself.
 * One row per token (its deepest pool). Sources stream in independently.
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
  const markets = useMemo(() => {
    const byToken = new Map<string, Market>()
    for (const r of results) {
      for (const m of r.data ?? []) {
        const key = m.token.toLowerCase()
        const prev = byToken.get(key)
        if (!prev || (m.liquidityUsd || 0) > (prev.liquidityUsd || 0)) byToken.set(key, m)
      }
    }
    return [...byToken.values()]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results.map((r) => r.dataUpdatedAt).join()])
  return {
    markets,
    isLoading: results.every((r) => r.isPending),
    isFetching: results.some((r) => r.isFetching),
    loaded: results.filter((r) => r.isSuccess).length,
    total: results.length,
    updatedAt: Math.max(0, ...results.map((r) => r.dataUpdatedAt)),
    failed: results.filter((r) => r.isError).length,
  }
}

export function useNewCurveMarkets(enabled: boolean) {
  return useQuery({
    queryKey: ['markets', 'curve-new'],
    queryFn: ({ signal }) => getDexMarkets(PONS_DEXES.curve, 'new', signal),
    enabled,
    staleTime: 30_000,
    refetchInterval: enabled ? 30_000 : false,
  })
}

/** Everything the market page needs, fetched in parallel. */
export function useMarket(token: Address | undefined) {
  const verify = useQuery({
    queryKey: ['pons-info', token],
    queryFn: () => getPonsInfo(token!),
    enabled: !!token,
    staleTime: 5 * MIN,
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
    queryFn: async ({ signal }) => (await getQuotes([token!], signal)).get(token!.toLowerCase()) ?? null,
    enabled: !!token,
    refetchInterval: 15_000,
  })
  const stats = useQuery({
    queryKey: ['token-stats', token],
    queryFn: ({ signal }) => getTokenStats(token!, signal),
    enabled: !!token,
    staleTime: 5 * MIN,
  })
  const primary = pools.data?.[0]
  // Live price: DexScreener refreshes fastest; fall back to the pool snapshot.
  const priceUsd = quote.data?.priceUsd && Number.isFinite(quote.data.priceUsd) ? quote.data.priceUsd : primary?.priceUsd
  return { verify, pools, quote, stats, primary, priceUsd }
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
