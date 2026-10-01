import type { Address } from 'viem'
import { isAddress } from 'viem'
import { robinhood as robinhoodChain } from 'viem/chains'

// ---- environment ----
const env = import.meta.env
export const REOWN_PROJECT_ID: string | undefined = env.VITE_REOWN_PROJECT_ID?.trim() || undefined
const rpcOverride: string | undefined = env.VITE_ROBINHOOD_RPC_URL?.trim() || undefined
const perpsRaw: string | undefined = env.VITE_PONSIA_PERPS_ADDRESS?.trim() || undefined
/** Ponsia Perps engine. `undefined` until the contract is deployed and configured. */
export const PERPS_ENGINE: Address | undefined = perpsRaw && isAddress(perpsRaw) ? perpsRaw : undefined

// ---- chain ----
export const RPC_URL = rpcOverride ?? robinhoodChain.rpcUrls.default.http[0]
export const robinhood = rpcOverride
  ? { ...robinhoodChain, rpcUrls: { default: { http: [rpcOverride] } } }
  : robinhoodChain
export const EXPLORER = robinhoodChain.blockExplorers.default.url
export const explorerTx = (hash: string) => `${EXPLORER}/tx/${hash}`
export const explorerAddress = (address: string) => `${EXPLORER}/address/${address}`
export const explorerToken = (address: string) => `${EXPLORER}/token/${address}`

// ---- Pons launchpad (verified on Robinhood Chain) ----
export const PONS = {
  /** The PONS token itself (launched by the legacy V1 factory). */
  token: '0x39dBED3a2bd333467115dE45665cC57F813C4571',
  /** PonsV2LaunchFactory: emits TokenLaunched + PoolGraduated; getLaunchedToken(token). */
  v2Factory: '0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e',
  /** Legacy V1 factory: launched straight into Uniswap V3 pools. Launching is disabled. */
  v1Factory: '0x0c37a24F5D23A486FA692d1500881d698B1F77a4',
} as const satisfies Record<string, Address>

/** GeckoTerminal dex ids that carry Pons markets. */
export const PONS_DEXES = {
  curve: 'pons-v2', // bonding curve, pre-graduation
  graduated: 'pons-v2-dex', // graduated V2 pools
  legacy: 'pons-dot-family', // V1 launches
} as const

// ---- protocol parameters ----
// Used for sizing previews. When the perps engine is configured, on-chain values replace these.
export const PROTOCOL = {
  maxLeverage: 10,
  maintenanceMarginBps: 500, // 5%
  tradingFeeBps: 10, // 0.10% of notional, on open
  slippageBps: 100, // 1% default price protection
  /** Markets thinner than this are view-only: a perp needs a price that is hard to move. */
  minLiquidityUsd: 10_000,
  /** Max leverage steps down with pool depth. */
  leverageTiers: [
    { minLiquidityUsd: 250_000, maxLeverage: 10 },
    { minLiquidityUsd: 50_000, maxLeverage: 5 },
    { minLiquidityUsd: 10_000, maxLeverage: 3 },
  ],
  /** Tokens still on their bonding curve have no pool depth; they list at a low cap once they trade. */
  curveTier: { minVolume24hUsd: 25_000, maxLeverage: 2 },
} as const

type RiskInput = { liquidityUsd?: number; volume24h?: number; onCurve?: boolean }

/** Max leverage for a market: by pool depth once graduated, by curve activity before. 0 = view only. */
export function maxLeverageFor({ liquidityUsd, volume24h, onCurve }: RiskInput): number {
  if (onCurve) return (volume24h ?? 0) >= PROTOCOL.curveTier.minVolume24hUsd ? PROTOCOL.curveTier.maxLeverage : 0
  if (!liquidityUsd) return 0
  for (const t of PROTOCOL.leverageTiers) if (liquidityUsd >= t.minLiquidityUsd) return t.maxLeverage
  return 0
}
