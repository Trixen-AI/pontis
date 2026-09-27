// DexScreener public API on Solana: fast batch quotes (up to 30 tokens per call, ~300 calls/min).
// Solana addresses are case-sensitive base58: they are used exactly as given, never lower-cased.
import { WSOL } from '@/app/config'

type Pair = {
  dexId: string
  pairAddress: string
  baseToken: { address: string; name: string; symbol: string }
  priceUsd?: string
  priceChange?: { h1?: number; h24?: number }
  volume?: { h24?: number }
  liquidity?: { usd?: number }
  fdv?: number
  marketCap?: number
  info?: { imageUrl?: string }
}

export type Quote = {
  token: string
  symbol: string
  name: string
  priceUsd: number
  change24h: number
  volume24h: number
  liquidityUsd: number
  fdvUsd: number
  image?: string
  pair: string
}

/** Best quote per token (deepest pair where the token is the base). Unknown tokens are simply absent. */
export async function getQuotes(tokens: readonly string[], signal?: AbortSignal): Promise<Map<string, Quote>> {
  const out = new Map<string, Quote>()
  const unique = [...new Set(tokens)]
  const wanted = new Set(unique)
  const chunks: string[][] = []
  for (let i = 0; i < unique.length; i += 30) chunks.push(unique.slice(i, i + 30))
  const results = await Promise.all(
    chunks.map(async (c) => {
      const res = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${c.join(',')}`, { signal })
      return res.ok ? ((await res.json()) as Pair[]) : []
    }),
  )
  for (const p of results.flat()) {
    const key = p.baseToken.address
    if (!wanted.has(key)) continue
    const prev = out.get(key)
    const liq = p.liquidity?.usd ?? 0
    if (prev && prev.liquidityUsd >= liq) continue
    out.set(key, {
      token: key,
      symbol: p.baseToken.symbol,
      name: p.baseToken.name,
      priceUsd: Number(p.priceUsd ?? NaN),
      change24h: p.priceChange?.h24 ?? NaN,
      volume24h: p.volume?.h24 ?? NaN,
      liquidityUsd: liq,
      fdvUsd: p.fdv ?? p.marketCap ?? NaN,
      image: p.info?.imageUrl,
      pair: p.pairAddress,
    })
  }
  return out
}

/** Fills liquidity (and a missing price or icon) from DexScreener. Markets it does not index keep their values. */
export async function withDexLiquidity<T extends { token: string; liquidityUsd: number; priceUsd: number; image?: string }>(
  markets: T[],
  signal?: AbortSignal,
): Promise<T[]> {
  if (!markets.length) return markets
  const quotes = await getQuotes(
    markets.map((m) => m.token),
    signal,
  ).catch(() => new Map<string, Quote>())
  return markets.map((m) => {
    const q = quotes.get(m.token)
    if (!q) return m
    return {
      ...m,
      liquidityUsd: q.liquidityUsd || m.liquidityUsd,
      priceUsd: Number.isFinite(m.priceUsd) ? m.priceUsd : q.priceUsd,
      image: m.image ?? q.image,
    }
  })
}

/** SOL/USD from the deepest wSOL pair. */
export async function getSolUsd(signal?: AbortSignal): Promise<number> {
  const q = (await getQuotes([WSOL], signal)).get(WSOL)
  return q?.priceUsd ?? NaN
}
