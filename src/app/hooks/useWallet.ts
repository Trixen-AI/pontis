import { useQuery } from '@tanstack/react-query'
import type { Address } from 'viem'
import { formatUnits } from 'viem'
import { useAccount, useBalance } from 'wagmi'
import { robinhood } from '@/app/config'
import { getActivity, getHoldings } from '@/app/lib/api/blockscout'
import { getQuotes } from '@/app/lib/api/dexscreener'
import { getTokenPrices } from '@/app/lib/api/gecko'
import { filterPonsTokens } from '@/app/lib/pons'

/** Connection status, reduced to what the UI branches on. */
export function useWalletState() {
  const { address, isConnected, status, chainId } = useAccount()
  const wrongNetwork = isConnected && chainId != null && chainId !== robinhood.id
  return { address, isConnected, connecting: status === 'connecting' || status === 'reconnecting', wrongNetwork }
}

export function useEthBalance(address: Address | undefined) {
  const q = useBalance({ address, chainId: robinhood.id, query: { enabled: !!address, refetchInterval: 15_000 } })
  return { ...q, eth: q.data ? Number(formatUnits(q.data.value, q.data.decimals)) : undefined }
}

export type PonsHolding = {
  token: Address
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
 * The wallet's PONS tokens: every ERC-20 it holds, filtered on-chain against the Pons factories,
 * then priced. Non-PONS tokens are counted but not listed.
 */
export function usePonsHoldings(address: Address | undefined) {
  return useQuery({
    queryKey: ['pons-holdings', address],
    enabled: !!address,
    refetchInterval: 30_000,
    queryFn: async ({ signal }) => {
      const all = await getHoldings(address!, signal)
      const pons = await filterPonsTokens(all.map((h) => h.token))
      const mine = all.filter((h) => pons.has(h.token.toLowerCase()))
      const quotes = await getQuotes(
        mine.map((h) => h.token),
        signal,
      )
      // Curve tokens are not on DexScreener: price them from GeckoTerminal's Pons curve index.
      const unpriced = mine.filter((h) => !Number.isFinite(quotes.get(h.token.toLowerCase())?.priceUsd ?? NaN)).map((h) => h.token)
      const curvePrices = unpriced.length ? await getTokenPrices(unpriced, signal).catch(() => new Map()) : new Map()
      const rows: PonsHolding[] = mine.map((h) => {
        const key = h.token.toLowerCase()
        const q = quotes.get(key)
        const g = curvePrices.get(key)
        const amount = Number(formatUnits(h.balance, h.decimals))
        const price = q && Number.isFinite(q.priceUsd) ? q.priceUsd : g?.priceUsd
        return {
          token: h.token,
          symbol: h.symbol,
          name: h.name,
          icon: q?.image ?? g?.image ?? h.icon,
          amount,
          priceUsd: price,
          valueUsd: price != null ? amount * price : undefined,
          change24h: q?.change24h,
          liquidityUsd: q?.liquidityUsd ?? g?.liquidityUsd,
          volume24h: q?.volume24h ?? g?.volume24h,
          onCurve: pons.get(key)?.onCurve ?? false,
        }
      })
      rows.sort((a, b) => (b.valueUsd ?? -1) - (a.valueUsd ?? -1))
      return { rows, otherTokens: all.length - mine.length }
    },
  })
}

export function useActivity(address: Address | undefined) {
  return useQuery({
    queryKey: ['activity', address],
    queryFn: ({ signal }) => getActivity(address!, signal),
    enabled: !!address,
    refetchInterval: 30_000,
  })
}
