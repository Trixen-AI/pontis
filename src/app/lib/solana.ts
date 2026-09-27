// On-chain reads on Solana mainnet: wallet balances, token accounts, activity, and Pump.fun bonding curves.
import { Connection, PublicKey } from '@solana/web3.js'
import { PUMP, RPC_URL, TOKEN_PROGRAMS } from '@/app/config'

export const connection = new Connection(RPC_URL, 'confirmed')

const LAMPORTS = 1_000_000_000

export async function getSolBalance(owner: string): Promise<number> {
  return (await connection.getBalance(new PublicKey(owner))) / LAMPORTS
}

export type WalletToken = { mint: string; amount: number; decimals: number }

/** Every non-zero SPL and Token-2022 balance the wallet holds. */
export async function getWalletTokens(owner: string): Promise<WalletToken[]> {
  const key = new PublicKey(owner)
  const results = await Promise.all(TOKEN_PROGRAMS.map((p) => connection.getParsedTokenAccountsByOwner(key, { programId: new PublicKey(p) })))
  const byMint = new Map<string, WalletToken>()
  for (const r of results) {
    for (const { account } of r.value) {
      const info = account.data.parsed?.info as { mint: string; tokenAmount: { uiAmount: number | null; decimals: number } } | undefined
      if (!info || !info.tokenAmount.uiAmount) continue
      const prev = byMint.get(info.mint)
      byMint.set(info.mint, { mint: info.mint, amount: (prev?.amount ?? 0) + info.tokenAmount.uiAmount, decimals: info.tokenAmount.decimals })
    }
  }
  return [...byMint.values()]
}

/** Balance of one mint for one wallet (0 when the wallet has no account for it). */
export async function getTokenBalance(owner: string, mint: string): Promise<number> {
  const r = await connection.getParsedTokenAccountsByOwner(new PublicKey(owner), { mint: new PublicKey(mint) })
  return r.value.reduce((s, { account }) => s + ((account.data.parsed?.info?.tokenAmount?.uiAmount as number | null) ?? 0), 0)
}

export type Activity = { signature: string; at: number | null; ok: boolean; memo: string | null }

export async function getActivity(owner: string, limit = 12): Promise<Activity[]> {
  const sigs = await connection.getSignaturesForAddress(new PublicKey(owner), { limit })
  return sigs.map((s) => ({ signature: s.signature, at: s.blockTime ? s.blockTime * 1000 : null, ok: !s.err, memo: s.memo }))
}

// ---- Pump.fun ----

export type BondingCurve = {
  /** Curve filled and the token migrated to an AMM (PumpSwap). */
  complete: boolean
  /** Price on the curve, SOL per whole token. Stale once complete. */
  priceSol: number
  /** Share of the curve sold, 0..1 (1 once complete). */
  progress: number
}

export const bondingCurvePda = (mint: string) =>
  PublicKey.findProgramAddressSync([new TextEncoder().encode('bonding-curve'), new PublicKey(mint).toBytes()], PUMP.program)[0]

function decodeCurve(data: Uint8Array): BondingCurve | null {
  // layout: 8-byte discriminator, then u64 virtualToken, virtualSol, realToken, realSol, supply, then bool complete
  if (data.length < 49) return null
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  const u64 = (o: number) => view.getBigUint64(o, true)
  const vTok = u64(8)
  const vSol = u64(16)
  const rTok = u64(24)
  const complete = data[48] === 1
  const priceSol = vTok > 0n ? Number(vSol) / 1e9 / (Number(vTok) / 10 ** PUMP.tokenDecimals) : 0
  const sold = 1 - Number(rTok) / Number(PUMP.initialRealTokenReserves)
  return { complete, priceSol, progress: complete ? 1 : Math.min(1, Math.max(0, sold)) }
}

/**
 * Bonding curves for many mints in as few calls as possible (100 accounts per request).
 * A mint is a Pump.fun token exactly when its curve PDA exists and is owned by the Pump program.
 */
export async function getBondingCurves(mints: readonly string[]): Promise<Map<string, BondingCurve>> {
  const out = new Map<string, BondingCurve>()
  const unique = [...new Set(mints)]
  for (let i = 0; i < unique.length; i += 100) {
    const chunk = unique.slice(i, i + 100)
    const infos = await connection.getMultipleAccountsInfo(chunk.map(bondingCurvePda))
    infos.forEach((info, j) => {
      if (!info || !info.owner.equals(PUMP.program)) return
      const curve = decodeCurve(info.data)
      if (curve) out.set(chunk[j], curve)
    })
  }
  return out
}

export async function getBondingCurve(mint: string): Promise<BondingCurve | null> {
  return (await getBondingCurves([mint])).get(mint) ?? null
}
