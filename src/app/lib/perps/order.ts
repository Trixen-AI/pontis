// Signed perp orders on Solana. The trader approves an exact, human-readable order in their wallet
// (signMessage), the same pattern off-chain order books use. No funds move when approving.
// Approved orders are kept in this browser, per wallet, and listed in Positions.
import bs58 from 'bs58'
import { useSyncExternalStore } from 'react'
import { SOLANA_MAINNET } from '@/app/config'

/** What the dashboard keeps about an approved order (numbers for display, signature for the engine). */
export type SignedOrder = {
  id: string
  trader: string
  market: string
  symbol: string
  isLong: boolean
  leverage: number
  collateralSol: number
  sizeSol: number
  sizeUsd: number
  tokenAmount: number
  entryPrice: number
  liquidationPrice: number
  acceptablePrice: number
  feeSol: number
  nonce: string
  deadline: number // unix seconds
  message: string
  signature: string // base58
  signedAt: number
}

export type OrderDraft = Omit<SignedOrder, 'id' | 'message' | 'signature' | 'signedAt'>

/** The exact text the wallet shows and signs. Keep it stable: the engine will verify this format. */
export function orderMessage(o: OrderDraft): string {
  return [
    'FunPerps order',
    '',
    `Market: ${o.symbol}-PERP (${o.market})`,
    `Side: ${o.isLong ? 'LONG' : 'SHORT'}`,
    `Collateral: ${o.collateralSol} SOL`,
    `Leverage: ${o.leverage}x`,
    `Size: ${o.sizeSol.toFixed(9)} SOL`,
    `Price protection: ${o.acceptablePrice.toPrecision(8)} USD`,
    `Trader: ${o.trader}`,
    `Nonce: ${o.nonce}`,
    `Expires: ${new Date(o.deadline * 1000).toISOString()}`,
    `Chain: ${SOLANA_MAINNET}`,
    '',
    'Signing approves this order. It does not move funds.',
  ].join('\n')
}

export async function signOrder(draft: OrderDraft, sign: (m: Uint8Array) => Promise<Uint8Array>): Promise<SignedOrder> {
  const message = orderMessage(draft)
  const sig = await sign(new TextEncoder().encode(message))
  const signature = bs58.encode(sig)
  return { ...draft, id: signature.slice(0, 16), message, signature, signedAt: Date.now() }
}

// ---- tiny per-wallet store over localStorage, shared by every component ----
const VERSION = 'v2'
const keyFor = (trader: string) => `funperps:orders:${VERSION}:${trader}`
const EVENT = 'funperps-orders'
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
    if (e instanceof StorageEvent && e.key?.startsWith('funperps:orders:')) cache.delete(e.key)
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
export function useSignedOrders(trader: string | undefined): SignedOrder[] {
  return useSyncExternalStore(subscribe, () => (trader ? read(trader) : EMPTY))
}

export function saveOrder(o: SignedOrder) {
  write(o.trader, [o, ...read(o.trader).filter((x) => x.id !== o.id)])
}

export function cancelOrder(trader: string, id: string) {
  write(trader, read(trader).filter((x) => x.id !== id))
}

export const newNonce = () => `${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`
