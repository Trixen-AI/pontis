// Robinhood Chain Blockscout API v2 (CORS-enabled from the browser).
import type { Address } from 'viem'
import { getAddress } from 'viem'

const BASE = 'https://robinhoodchain.blockscout.com/api/v2'

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { signal })
  if (!res.ok) throw new Error(`Blockscout ${res.status}`)
  return (await res.json()) as T
}

export type Holding = {
  token: Address
  symbol: string
  name: string
  decimals: number
  balance: bigint
  icon?: string
}

type TokenBalance = {
  value: string
  token: { address_hash: string; symbol: string | null; name: string | null; decimals: string | null; type: string; icon_url: string | null }
}

/** Every ERC-20 the wallet holds (non-zero). */
export async function getHoldings(address: string, signal?: AbortSignal): Promise<Holding[]> {
  const list = await get<TokenBalance[]>(`/addresses/${address}/token-balances`, signal)
  return list
    .filter((b) => b.token.type === 'ERC-20' && b.value !== '0')
    .map((b) => ({
      token: getAddress(b.token.address_hash),
      symbol: b.token.symbol ?? '?',
      name: b.token.name ?? 'Unknown',
      decimals: Number(b.token.decimals ?? 18),
      balance: BigInt(b.value),
      icon: b.token.icon_url ?? undefined,
    }))
}

export type Activity = {
  hash: string
  method: string | null
  status: 'ok' | 'error' | null
  at: number
  to?: string
  toName?: string | null
  valueEth: number
  feeEth: number
}

type TxItem = {
  hash: string
  method: string | null
  status: 'ok' | 'error' | null
  timestamp: string
  to: { hash: string; name: string | null } | null
  value: string
  fee: { value: string } | null
}

/** Most recent transactions sent from or to the wallet. */
export async function getActivity(address: string, signal?: AbortSignal): Promise<Activity[]> {
  const res = await get<{ items: TxItem[] }>(`/addresses/${address}/transactions`, signal)
  return res.items.slice(0, 12).map((t) => ({
    hash: t.hash,
    method: t.method,
    status: t.status,
    at: Date.parse(t.timestamp),
    to: t.to?.hash,
    toName: t.to?.name,
    valueEth: Number(t.value) / 1e18,
    feeEth: Number(t.fee?.value ?? 0) / 1e18,
  }))
}

export type TokenStats = { holders: number; totalSupply: bigint; decimals: number }
export async function getTokenStats(token: string, signal?: AbortSignal): Promise<TokenStats> {
  const t = await get<{ holders_count: string | null; total_supply: string | null; decimals: string | null }>(`/tokens/${token}`, signal)
  return { holders: Number(t.holders_count ?? 0), totalSupply: BigInt(t.total_supply ?? 0), decimals: Number(t.decimals ?? 18) }
}

/** ETH/USD as reported by the explorer (CoinGecko-sourced). */
export async function getEthUsd(signal?: AbortSignal): Promise<number> {
  const s = await get<{ coin_price: string | null }>(`/stats`, signal)
  return Number(s.coin_price ?? NaN)
}
