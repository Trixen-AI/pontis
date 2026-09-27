// Isolated-margin sizing in SOL. Pure functions, shared by the order ticket and the positions view.

export type Side = 'long' | 'short'

export type OrderInput = {
  side: Side
  collateralSol: number
  leverage: number
  priceUsd: number // mark price the order is sized against
  solUsd: number
  feeBps: number
  maintenanceMarginBps: number
  slippageBps: number
}

export type OrderPreview = {
  sizeSol: number // notional in SOL
  sizeUsd: number
  tokenAmount: number
  feeSol: number
  marginSol: number // collateral left after the open fee
  liquidationPrice: number
  /** Price move to liquidation, as a fraction of entry (0.08 = an 8% move). */
  liquidationDistance: number
  acceptablePrice: number // price bound signed with the order
}

export function previewOrder(o: OrderInput): OrderPreview {
  const sizeSol = o.collateralSol * o.leverage
  const sizeUsd = sizeSol * o.solUsd
  const feeSol = (sizeSol * o.feeBps) / 10_000
  const marginSol = Math.max(0, o.collateralSol - feeSol)
  const mmr = o.maintenanceMarginBps / 10_000
  const marginRatio = sizeSol > 0 ? marginSol / sizeSol : 0
  // Liquidated when equity falls to the maintenance margin of the position.
  const liquidationPrice = o.side === 'long' ? o.priceUsd * (1 - marginRatio + mmr) : o.priceUsd * (1 + marginRatio - mmr)
  const slip = o.slippageBps / 10_000
  return {
    sizeSol,
    sizeUsd,
    tokenAmount: o.priceUsd > 0 ? sizeUsd / o.priceUsd : 0,
    feeSol,
    marginSol,
    liquidationPrice: Math.max(0, liquidationPrice),
    liquidationDistance: o.priceUsd > 0 ? Math.abs(o.priceUsd - liquidationPrice) / o.priceUsd : 0,
    acceptablePrice: o.side === 'long' ? o.priceUsd * (1 + slip) : o.priceUsd * (1 - slip),
  }
}

/** Unrealised PnL in SOL for a position at a mark price. */
export function positionPnl(p: { isLong: boolean; sizeSol: number; entryPrice: number }, mark: number): number {
  if (!p.entryPrice || !mark) return 0
  const move = mark / p.entryPrice - 1
  return p.sizeSol * (p.isLong ? move : -move)
}
