// GeckoTerminal public API on Solana (network "solana"). Addresses are case-sensitive base58.
// Free tier allows ~30 calls/min per IP, so every call goes through one spaced queue.
import { PUMP_DEXES } from '@/app/config'

const BASE = 'https://api.geckoterminal.com/api/v2/networks/solana'
const GAP_MS = 2100
let chain: Promise<unknown> = Promise.resolve()
let last = 0

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function spaced<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const wait = last + GAP_MS - Date.now()
    if (wait > 0) await sleep(wait)
    last = Date.now()
    return fn()
  })
  chain = run.catch(() => undefined)
  return run
}

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const attempt = async () => {
    const res = await fetch(`${BASE}${path}`, { headers: { accept: 'application/json' }, signal })
    if (!res.ok) throw new Error(`GeckoTerminal ${res.status}`)
    return (await res.json()) as T
  }
  try {
    return await spaced(attempt)
  } catch (e) {
    if (signal?.aborted) throw e
    // A 429 arrives without CORS headers, which surfaces as a TypeError: back off once.
    await sleep(12_000)
    return spaced(attempt)
  }
}

// ---- types ----
type Change = Partial<Record<'m5' | 'm15' | 'm30' | 'h1' | 'h6' | 'h24', string>>
type PoolAttrs = {
  address: string
  name: string
  base_token_price_usd: string | null
  base_token_price_native_currency: string | null
  pool_created_at: string | null
  fdv_usd: string | null
  market_cap_usd: string | null
  price_change_percentage: Change
  transactions: { h24?: { buys: number; sells: number } }
  volume_usd: Partial<Record<'h1' | 'h6' | 'h24', string>>
  reserve_in_usd: string | null
}
type Rel = { data: { id: string } }
type PoolItem = { id: string; attributes: PoolAttrs; relationships: { base_token: Rel; quote_token: Rel; dex: Rel } }
type TokenItem = { id: string; attributes: { address: string; name: string; symbol: string; decimals: number; image_url: string | null } }
type PoolList = { data: PoolItem[]; included?: TokenItem[] }

export type Stage = 'curve' | 'graduated' | 'dex'
export type Market = {
  token: string
  symbol: string
  name: string
  image?: string
  pool: string
  poolName: string
  dex: string
  stage: Stage
  priceUsd: number
  change: { m5: number; h1: number; h6: number; h24: number }
  volume24h: number
  liquidityUsd: number
  fdvUsd: number
  createdAt?: number
  buys24h: number
  sells24h: number
  /** Share of the Pump.fun curve sold, 0..1 (set after on-chain verification). */
  progress?: number
}

const n = (v: string | null | undefined) => (v == null ? NaN : Number(v))
const stageOf = (dex: string): Stage =>
  dex === PUMP_DEXES.curve ? 'curve' : dex === PUMP_DEXES.graduated ? 'graduated' : 'dex'
const idToAddress = (id: string) => id.slice(id.indexOf('_') + 1)

function toMarkets(list: PoolList): Market[] {
  const tokens = new Map((list.included ?? []).filter((t) => t.id.startsWith('solana_')).map((t) => [t.id, t.attributes]))
  return list.data.map((p) => {
    const a = p.attributes
    const dex = p.relationships.dex.data.id
    const t = tokens.get(p.relationships.base_token.data.id)
    return {
      token: idToAddress(p.relationships.base_token.data.id),
      symbol: t?.symbol ?? a.name.split(' / ')[0],
      name: t?.name ?? a.name.split(' / ')[0],
      image: t?.image_url && !t.image_url.includes('missing') ? t.image_url : undefined,
      pool: a.address,
      poolName: a.name,
      dex,
      stage: stageOf(dex),
      priceUsd: n(a.base_token_price_usd),
      change: {
        m5: n(a.price_change_percentage.m5),
        h1: n(a.price_change_percentage.h1),
        h6: n(a.price_change_percentage.h6),
        h24: n(a.price_change_percentage.h24),
      },
      volume24h: n(a.volume_usd.h24),
      // GeckoTerminal reports PumpSwap reserves as near-zero noise; those are filled from DexScreener instead.
      liquidityUsd: dex === PUMP_DEXES.graduated ? NaN : n(a.reserve_in_usd),
      fdvUsd: n(a.fdv_usd),
      createdAt: a.pool_created_at ? Date.parse(a.pool_created_at) : undefined,
      buys24h: a.transactions.h24?.buys ?? 0,
      sells24h: a.transactions.h24?.sells ?? 0,
    }
  })
}

/** Top pools of one Pump.fun dex by 24h volume. */
export async function getDexMarkets(dex: string, signal?: AbortSignal) {
  return toMarkets(await get<PoolList>(`/dexes/${dex}/pools?page=1&sort=h24_volume_usd_desc&include=base_token`, signal))
}

/**
 * Newest Solana pools on the Pump.fun curve and on PumpSwap, newest first. Per-dex lists cannot be sorted
 * by age, so this reads the network-wide new-pools feed and keeps the two Pump.fun dexes.
 */
export async function getNewPumpMarkets(pages = 1, signal?: AbortSignal) {
  const out: Market[] = []
  for (let page = 1; page <= pages; page++) {
    const list = await get<PoolList>(`/new_pools?page=${page}&include=base_token`, signal)
    out.push(...toMarkets(list).filter((m) => m.stage !== 'dex'))
  }
  return out
}

/** Every pool that trades a token, most traded first (the live pool after a graduation). */
export async function getTokenMarkets(token: string, signal?: AbortSignal) {
  const markets = toMarkets(await get<PoolList>(`/tokens/${token}/pools?page=1&include=base_token`, signal))
  // keep pools where this token is the base, most traded first
  return markets.filter((m) => m.token === token).sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0))
}

export type TokenPrice = { symbol: string; name: string; priceUsd: number; volume24h: number; liquidityUsd: number; image?: string }
type MultiToken = {
  attributes: {
    address: string
    symbol: string
    name: string
    price_usd: string | null
    volume_usd: { h24?: string | null }
    total_reserve_in_usd: string | null
    image_url: string | null
  }
}

/**
 * Prices for up to 30 tokens in one call. Covers Pump.fun bonding-curve tokens, which DexScreener often does not index yet.
 * Keys are the exact mint addresses; unpriced tokens are absent.
 */
export async function getTokenPrices(tokens: readonly string[], signal?: AbortSignal): Promise<Map<string, TokenPrice>> {
  const out = new Map<string, TokenPrice>()
  const list = [...new Set(tokens)].slice(0, 30)
  if (!list.length) return out
  const res = await get<{ data: MultiToken[] }>(`/tokens/multi/${list.join(',')}`, signal)
  for (const { attributes: a } of res.data) {
    const price = n(a.price_usd)
    if (!Number.isFinite(price)) continue
    out.set(a.address, {
      symbol: a.symbol,
      name: a.name,
      priceUsd: price,
      volume24h: n(a.volume_usd.h24),
      liquidityUsd: n(a.total_reserve_in_usd),
      image: a.image_url && !a.image_url.includes('missing') ? a.image_url : undefined,
    })
  }
  return out
}

export type Timeframe = { key: string; label: string; path: 'minute' | 'hour' | 'day'; aggregate: number }
export const TIMEFRAMES: Timeframe[] = [
  { key: '15m', label: '15m', path: 'minute', aggregate: 15 },
  { key: '1h', label: '1H', path: 'hour', aggregate: 1 },
  { key: '4h', label: '4H', path: 'hour', aggregate: 4 },
  { key: '1d', label: '1D', path: 'day', aggregate: 1 },
]

export type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number }
export async function getCandles(pool: string, tf: Timeframe, signal?: AbortSignal): Promise<Candle[]> {
  const res = await get<{ data: { attributes: { ohlcv_list: number[][] } } }>(
    `/pools/${pool}/ohlcv/${tf.path}?aggregate=${tf.aggregate}&limit=300&currency=usd&token=base`,
    signal,
  )
  return res.data.attributes.ohlcv_list
    .map(([time, open, high, low, close, volume]) => ({ time, open, high, low, close, volume }))
    .sort((a, b) => a.time - b.time)
}

export type Trade = { hash: string; kind: 'buy' | 'sell'; usd: number; priceUsd: number; tokenAmount: number; from: string; at: number }
type TradeItem = {
  attributes: {
    tx_hash: string
    kind: 'buy' | 'sell'
    volume_in_usd: string
    price_to_in_usd: string
    price_from_in_usd: string
    from_token_amount: string
    to_token_amount: string
    tx_from_address: string
    block_timestamp: string
  }
}
export async function getTrades(pool: string, signal?: AbortSignal): Promise<Trade[]> {
  const res = await get<{ data: TradeItem[] }>(`/pools/${pool}/trades`, signal)
  return res.data.slice(0, 40).map(({ attributes: a }) => ({
    hash: a.tx_hash,
    kind: a.kind,
    usd: Number(a.volume_in_usd),
    // on a buy the base token is received ("to"), on a sell it is sent ("from")
    priceUsd: Number(a.kind === 'buy' ? a.price_to_in_usd : a.price_from_in_usd),
    tokenAmount: Number(a.kind === 'buy' ? a.to_token_amount : a.from_token_amount),
    from: a.tx_from_address,
    at: Date.parse(a.block_timestamp),
  }))
}
