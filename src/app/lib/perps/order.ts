// Signed perp orders (EIP-712), the same pattern off-chain order books use: the trader approves
// an exact order in their wallet, no funds move. Until the engine contract exists, approved orders
// are kept in this browser, per wallet, and listed in Positions.
import { useSyncExternalStore } from 'react'
import type { Address, Hex } from 'viem'
import { PERPS_ENGINE, robinhood } from '@/app/config'

export const orderDomain = {
  name: 'Pontis',
  version: '1',
  chainId: robinhood.id,
  ...(PERPS_ENGINE ? { verifyingContract: PERPS_ENGINE } : {}),
} as const

export const orderTypes = {
  Order: [
    { name: 'trader', type: 'address' },
    { name: 'market', type: 'address' },
    { name: 'isLong', type: 'bool' },
    { name: 'collateral', type: 'uint256' }, // wei
    { name: 'size', type: 'uint256' }, // wei of notional
    { name: 'acceptablePrice', type: 'uint256' }, // USD, 18 decimals
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' }, // unix seconds
  ],
} as const

/** What the dashboard keeps about an approved order (numbers for display, signature for the engine). */
export type SignedOrder = {
  id: string
  trader: Address
  market: Address
  symbol: string
  isLong: boolean
  leverage: number
  collateralEth: number
  sizeEth: number
  sizeUsd: number
  tokenAmount: number
  entryPrice: number
  liquidationPrice: number
  acceptablePrice: number
  feeEth: number
  nonce: string
  deadline: number
  signature: Hex
  signedAt: number
}

// ---- tiny per-wallet store over localStorage, shared by every component ----
const VERSION = 'v1'
const keyFor = (trader: string) => `pontis:orders:${VERSION}:${trader.toLowerCase()}`
const EVENT = 'pontis-orders'
const EMPTY: SignedOrder[] = []
const cache = new Map<string, SignedOrder[]>()

function read(trader: string): SignedOrder[] {
  const k = keyFor(trader)
  const hit = cache.get(k)
  if (hit) return hit
  let list = EMPTY
  try {
    const raw = localStorage.getItem(k)
    if (raw) list = JSON.parse(raw) as SignedOrder[]
  } catch {
    list = EMPTY
  }
  cache.set(k, list)
  return list
}

function write(trader: string, list: SignedOrder[]) {
  const k = keyFor(trader)
  cache.set(k, list)
  try {
    localStorage.setItem(k, JSON.stringify(list))
  } catch {
    // storage full or blocked: the orders still live for this session
  }
  window.dispatchEvent(new Event(EVENT))
}

function subscribe(onChange: () => void) {
  const sync = (e: Event) => {
    if (e instanceof StorageEvent && e.key?.startsWith('pontis:orders:')) cache.delete(e.key)
    onChange()
  }
  window.addEventListener(EVENT, sync)
  window.addEventListener('storage', sync)
  return () => {
    window.removeEventListener(EVENT, sync)
    window.removeEventListener('storage', sync)
  }
}

/** Approved orders for one wallet, newest first. Re-renders when any tab adds or cancels one. */
export function useSignedOrders(trader: Address | undefined): SignedOrder[] {
  return useSyncExternalStore(subscribe, () => (trader ? read(trader) : EMPTY))
}

export function saveOrder(o: SignedOrder) {
  write(o.trader, [o, ...read(o.trader).filter((x) => x.id !== o.id)])
}

export function cancelOrder(trader: Address, id: string) {
  write(trader, read(trader).filter((x) => x.id !== id))
}

export const newNonce = () => BigInt(Date.now()) * 1000n + BigInt(Math.floor(Math.random() * 1000))
