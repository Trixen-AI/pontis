import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import type { Address } from 'viem'
import { type Quote, getQuotes } from '@/app/lib/api/dexscreener'
import { getTokenPrices } from '@/app/lib/api/gecko'
import { type Graduation, type Launch, type TokenMeta, getBlockTimes, getFactoryEvents, getTokenMeta, publicClient } from '@/app/lib/pons'

const WINDOW_BLOCKS = 36_000n // ~1 hour at ~100 ms blocks
const POLL_MS = 5_000
const KEEP = 150

export type LaunchRow = Launch & { at?: number; meta?: TokenMeta; graduated: boolean }
type FeedState = {
  launches: Launch[]
  graduations: Graduation[]
  times: Map<bigint, number>
  meta: Map<string, TokenMeta>
  head: bigint
  status: 'loading' | 'live' | 'error'
  error?: string
}

const initial: FeedState = { launches: [], graduations: [], times: new Map(), meta: new Map(), head: 0n, status: 'loading' }
const newestFirst = (a: { block: bigint; logIndex: number }, b: { block: bigint; logIndex: number }) =>
  a.block === b.block ? b.logIndex - a.logIndex : a.block > b.block ? -1 : 1

/**
 * Live feed of Pons V2 launches and graduations, read straight from the factory's logs.
 * Loads the last hour, then polls new blocks every few seconds.
 */
export function useLaunchFeed() {
  const [state, setState] = useState<FeedState>(initial)

  useEffect(() => {
    let cancelled = false
    let timer = 0
    let head = 0n

    const enrich = async (launches: Launch[], graduations: Graduation[]) => {
      const blocks = [...launches.slice(0, KEEP), ...graduations.slice(0, KEEP)].map((l) => l.block)
      const [times, meta] = await Promise.all([
        blocks.length ? getBlockTimes(blocks) : Promise.resolve(new Map<bigint, number>()),
        launches.length ? getTokenMeta(launches.slice(0, KEEP).map((l) => l.token)) : Promise.resolve(new Map<string, TokenMeta>()),
      ])
      return { times, meta }
    }

    const tick = async () => {
      try {
        const latest = await publicClient.getBlockNumber()
        const from = head === 0n ? latest - WINDOW_BLOCKS : head + 1n
        if (from <= latest) {
          const { launches, graduations } = await getFactoryEvents(from, latest)
          launches.sort(newestFirst)
          graduations.sort(newestFirst)
          const extra = await enrich(launches, graduations)
          if (cancelled) return
          head = latest
          setState((s) => ({
            launches: [...launches, ...s.launches].slice(0, 2_000),
            graduations: [...graduations, ...s.graduations].slice(0, 2_000),
            times: new Map([...s.times, ...extra.times]),
            meta: new Map([...s.meta, ...extra.meta]),
            head: latest,
            status: 'live',
          }))
        }
      } catch (e) {
        if (!cancelled) setState((s) => ({ ...s, status: s.head ? 'live' : 'error', error: e instanceof Error ? e.message : String(e) }))
      }
      if (!cancelled) timer = window.setTimeout(tick, POLL_MS)
    }
    tick()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [])

  const graduatedSet = new Set(state.graduations.map((g) => g.token.toLowerCase()))
  const rows: LaunchRow[] = state.launches.slice(0, KEEP).map((l) => ({
    ...l,
    at: state.times.get(l.block),
    meta: state.meta.get(l.token.toLowerCase()),
    graduated: graduatedSet.has(l.token.toLowerCase()),
  }))
  const gradRows = state.graduations.slice(0, KEEP).map((g) => ({ ...g, at: state.times.get(g.block) }))
  return { rows, graduations: gradRows, launchCount: state.launches.length, head: state.head, status: state.status, error: state.error }
}

/** Quotes for the tokens in view: DexScreener first, GeckoTerminal for curve tokens it does not index. */
export function useQuotes(tokens: readonly Address[]) {
  const key = tokens.map((t) => t.toLowerCase()).sort().join(',')
  return useQuery({
    queryKey: ['quotes', key],
    queryFn: async ({ signal }) => {
      const quotes = await getQuotes(tokens, signal)
      const missing = tokens.filter((t) => !quotes.has(t.toLowerCase()))
      if (missing.length) {
        const curve = await getTokenPrices(missing, signal).catch(() => new Map())
        for (const [key, g] of curve) {
          const q: Quote = { token: key as Address, symbol: g.symbol, name: g.name, priceUsd: g.priceUsd, change24h: NaN, volume24h: g.volume24h, liquidityUsd: g.liquidityUsd, fdvUsd: NaN, image: g.image, pair: '' }
          quotes.set(key, q)
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
