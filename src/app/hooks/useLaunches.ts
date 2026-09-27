import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { PUMP_DEXES } from '@/app/config'
import { type Quote, getQuotes, withDexLiquidity } from '@/app/lib/api/dexscreener'
import { type Market, getNewPumpMarkets, getTokenPrices } from '@/app/lib/api/gecko'
import { getBondingCurves } from '@/app/lib/solana'

const POLL_MS = 30_000 // GeckoTerminal free tier: stay well under 30 calls/min
const KEEP = 150

export type LaunchRow = Market & { progress?: number }
type FeedState = { launches: LaunchRow[]; graduations: LaunchRow[]; status: 'loading' | 'live' | 'error'; updatedAt: number }

const mergeNewest = (incoming: LaunchRow[], prev: LaunchRow[]) => {
  const seen = new Set<string>()
  return [...incoming, ...prev]
    .filter((r) => (seen.has(r.token) ? false : (seen.add(r.token), true)))
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
    .slice(0, KEEP)
}

/**
 * Live feed of Pump.fun launches (newest bonding-curve pools) and graduations (newest PumpSwap pools
 * whose Pump.fun curve is complete on-chain). Accumulates across polls while the page is open.
 */
export function useLaunchFeed() {
  const [state, setState] = useState<FeedState>({ launches: [], graduations: [], status: 'loading', updatedAt: 0 })
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    let timer = 0
    const tick = async () => {
      try {
        const pools = await getNewPumpMarkets(2)
        const fresh = pools.filter((m) => m.dex === PUMP_DEXES.curve)
        const swapped = pools.filter((m) => m.dex === PUMP_DEXES.graduated)
        const curves = await getBondingCurves([...fresh, ...swapped].map((m) => m.token))
        const launches = fresh.filter((m) => curves.has(m.token)).map((m) => ({ ...m, progress: curves.get(m.token)!.progress }))
        const graduations = await withDexLiquidity(
          swapped.filter((m) => curves.get(m.token)?.complete).map((m) => ({ ...m, stage: 'graduated' as const, progress: 1 })),
        )
        if (!alive.current) return
        setState((s) => ({
          launches: mergeNewest(launches, s.launches),
          graduations: mergeNewest(graduations, s.graduations),
          status: 'live',
          updatedAt: Date.now(),
        }))
      } catch {
        if (alive.current) setState((s) => ({ ...s, status: s.launches.length ? 'live' : 'error' }))
      }
      if (alive.current) timer = window.setTimeout(tick, POLL_MS)
    }
    tick()
    return () => {
      alive.current = false
      clearTimeout(timer)
    }
  }, [])

  return state
}

/** Quotes for the tokens in view: DexScreener first, GeckoTerminal for curve tokens it does not index yet. */
export function useQuotes(tokens: readonly string[]) {
  const key = [...tokens].sort().join(',')
  return useQuery({
    queryKey: ['quotes', key],
    queryFn: async ({ signal }) => {
      const quotes = await getQuotes(tokens, signal)
      const missing = tokens.filter((t) => !quotes.has(t))
      if (missing.length) {
        const curve = await getTokenPrices(missing, signal).catch(() => new Map())
        for (const [mint, g] of curve) {
          const q: Quote = { token: mint, symbol: g.symbol, name: g.name, priceUsd: g.priceUsd, change24h: NaN, volume24h: g.volume24h, liquidityUsd: g.liquidityUsd, fdvUsd: NaN, image: g.image, pair: '' }
          quotes.set(mint, q)
        }
      }
      return quotes
    },
    enabled: tokens.length > 0,
    staleTime: 20_000,
    refetchInterval: 60_000,
    placeholderData: (prev) => prev,
  })
}
