// DexScreener public API: fast batch quotes (up to 30 tokens per call, ~300 calls/min).
import type { Address } from 'viem'
import { getAddress } from 'viem'

type Pair = {
  dexId: string
  pairAddress: string
  baseToken: { address: string; name: string; symbol: string }
  priceUsd?: string
  priceChange?: { h1?: number; h24?: number }
  volume?: { h24?: number }
  liquidity?: { usd?: number }
  fdv?: number
  info?: { imageUrl?: string }
}

export type Quote = {
  token: Address
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
  const unique = [...new Set(tokens.map((t) => t.toLowerCase()))]
  const chunks: string[][] = []
  for (let i = 0; i < unique.length; i += 30) chunks.push(unique.slice(i, i + 30))
  const results = await Promise.all(
    chunks.map(async (c) => {
      const res = await fetch(`https://api.dexscreener.com/tokens/v1/robinhood/${c.join(',')}`, { signal })
      return res.ok ? ((await res.json()) as Pair[]) : []
    }),
  )
  for (const p of results.flat()) {
    const key = p.baseToken.address.toLowerCase()
    if (!unique.includes(key)) continue
    const prev = out.get(key)
    const liq = p.liquidity?.usd ?? 0
    if (prev && prev.liquidityUsd >= liq) continue
    out.set(key, {
      token: getAddress(p.baseToken.address),
      symbol: p.baseToken.symbol,
      name: p.baseToken.name,
      priceUsd: Number(p.priceUsd ?? NaN),
      change24h: p.priceChange?.h24 ?? NaN,
      volume24h: p.volume?.h24 ?? NaN,
      liquidityUsd: liq,
      fdvUsd: p.fdv ?? NaN,
      image: p.info?.imageUrl,
      pair: p.pairAddress,
    })
  }
  return out
}
