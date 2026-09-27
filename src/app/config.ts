import { PublicKey } from '@solana/web3.js'

// ---- environment ----
const env = import.meta.env
export const REOWN_PROJECT_ID: string | undefined = env.VITE_REOWN_PROJECT_ID?.trim() || undefined
const rpcOverride: string | undefined = env.VITE_SOLANA_RPC_URL?.trim() || undefined

// ---- chain: Solana mainnet ----
export const SOLANA_MAINNET = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'
/**
 * Browser-friendly RPC. Order: your own RPC (VITE_SOLANA_RPC_URL, e.g. Helius) > Reown's Solana RPC
 * (keyed by the project ID, CORS-enabled, supports token-account reads) > PublicNode (no wallet token reads).
 * The official api.mainnet-beta endpoint rejects browser requests, so it is never used here.
 */
export const RPC_URL =
  rpcOverride ??
  (REOWN_PROJECT_ID ? `https://rpc.walletconnect.org/v1/?chainId=${SOLANA_MAINNET}&projectId=${REOWN_PROJECT_ID}` : 'https://solana-rpc.publicnode.com')

export const EXPLORER = 'https://solscan.io'
export const explorerTx = (sig: string) => `${EXPLORER}/tx/${sig}`
export const explorerAddress = (address: string) => `${EXPLORER}/account/${address}`
export const explorerToken = (mint: string) => `${EXPLORER}/token/${mint}`

export const WSOL = 'So11111111111111111111111111111111111111112'
/** SPL Token and Token-2022: new Pump.fun mints use Token-2022. */
export const TOKEN_PROGRAMS = ['TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'] as const

// ---- Pump.fun (verified on mainnet) ----
export const PUMP = {
  /** Bonding-curve program. Every Pump.fun token has a PDA ["bonding-curve", mint] owned by it. */
  program: new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P'),
  /** Tokens on a fresh curve: 793.1M are sold through the curve before it completes. */
  initialRealTokenReserves: 793_100_000n * 1_000_000n,
  tokenDecimals: 6,
} as const

/** GeckoTerminal dex ids that carry Pump.fun markets. */
export const PUMP_DEXES = {
  curve: 'pump-fun', // bonding curve, pre-graduation
  graduated: 'pumpswap', // PumpSwap AMM (open to any token, so markets are checked on-chain)
} as const

/** A base58 string that decodes to a 32-byte Solana public key (wallets, mints and PDAs all qualify). */
export function isSolanaAddress(s: string): boolean {
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s)) return false
  try {
    return new PublicKey(s).toBytes().length === 32
  } catch {
    return false
  }
}

// ---- protocol parameters ----
// Used for sizing previews. Margin is posted in SOL.
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
