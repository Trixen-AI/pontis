import { useQuery } from '@tanstack/react-query'
import { useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'
import type { Provider } from '@reown/appkit-adapter-solana/react'
import { getQuotes, getSolUsd } from '@/app/lib/api/dexscreener'
import { getTokenPrices } from '@/app/lib/api/gecko'
import { getActivity, getBondingCurves, getSolBalance, getWalletTokens } from '@/app/lib/solana'
import { walletReady } from '@/app/web3/appkit'

export type WalletState = { address?: string; isConnected: boolean; connecting: boolean }

// AppKit hooks throw when AppKit was never created (no project ID), so pick the implementation once,
// at module load. Each variant always calls the same hooks, so the rules of hooks hold.
function useWalletAppKit(): WalletState {
  const a = useAppKitAccount({ namespace: 'solana' })
  return { address: a.isConnected ? a.address : undefined, isConnected: a.isConnected, connecting: a.status === 'connecting' || a.status === 'reconnecting' }
}
function useWalletNone(): WalletState {
  return { address: undefined, isConnected: false, connecting: false }
}
export const useWalletState = walletReady ? useWalletAppKit : useWalletNone

type Signer = (message: Uint8Array) => Promise<Uint8Array>
function useSignerAppKit(): Signer | undefined {
  const { walletProvider } = useAppKitProvider<Provider>('solana')
  return walletProvider ? (message) => walletProvider.signMessage(message) : undefined
}
function useSignerNone(): Signer | undefined {
  return undefined
}
/** Signs raw bytes with the connected Solana wallet (used to approve orders). */
export const useMessageSigner = walletReady ? useSignerAppKit : useSignerNone

export function useSolUsd() {
  return useQuery({ queryKey: ['sol-usd'], queryFn: ({ signal }) => getSolUsd(signal), staleTime: 60_000, refetchInterval: 60_000 })
}

export function useSolBalance(address: string | undefined) {
  const q = useQuery({ queryKey: ['sol-balance', address], queryFn: () => getSolBalance(address!), enabled: !!address, refetchInterval: 15_000 })
  return { ...q, sol: q.data }
}

export type PumpHolding = {
  token: string
  symbol: string
  name: string
  icon?: string
  amount: number
  priceUsd?: number
  valueUsd?: number
  change24h?: number
  liquidityUsd?: number
  volume24h?: number
  onCurve: boolean
}

/**
 * The wallet's Pump.fun tokens: every SPL / Token-2022 balance, kept only when the mint has a
 * Pump.fun bonding curve on-chain, then priced (DexScreener, GeckoTerminal, else the curve itself).
 */
export function usePumpHoldings(address: string | undefined) {
  return useQuery({
    queryKey: ['pump-holdings', address],
    enabled: !!address,
    refetchInterval: 30_000,
    queryFn: async ({ signal }) => {
      const all = await getWalletTokens(address!)
      const curves = await getBondingCurves(all.map((t) => t.mint))
      const mine = all.filter((t) => curves.has(t.mint))
      const mints = mine.map((t) => t.mint)
      const [quotes, solUsd] = await Promise.all([getQuotes(mints, signal), getSolUsd(signal).catch(() => NaN)])
      const missing = mints.filter((m) => !quotes.has(m))
      const gecko = missing.length ? await getTokenPrices(missing, signal).catch(() => new Map()) : new Map()
      const rows: PumpHolding[] = mine.map((t) => {
        const q = quotes.get(t.mint)
        const g = gecko.get(t.mint)
        const c = curves.get(t.mint)!
        const curvePrice = !c.complete && Number.isFinite(solUsd) ? c.priceSol * solUsd : undefined
        const price = q && Number.isFinite(q.priceUsd) ? q.priceUsd : (g?.priceUsd ?? curvePrice)
        return {
          token: t.mint,
          symbol: q?.symbol ?? g?.symbol ?? `${t.mint.slice(0, 4)}…`,
          name: q?.name ?? g?.name ?? 'Pump.fun token',
          icon: q?.image ?? g?.image,
          amount: t.amount,
          priceUsd: price,
          valueUsd: price != null ? t.amount * price : undefined,
          change24h: q?.change24h,
          liquidityUsd: q?.liquidityUsd ?? g?.liquidityUsd,
          volume24h: q?.volume24h ?? g?.volume24h,
          onCurve: !c.complete,
        }
      })
      rows.sort((a, b) => (b.valueUsd ?? -1) - (a.valueUsd ?? -1))
      return { rows, otherTokens: all.length - mine.length }
    },
  })
}

export function useActivity(address: string | undefined) {
  return useQuery({ queryKey: ['activity', address], queryFn: () => getActivity(address!), enabled: !!address, refetchInterval: 30_000 })
}
