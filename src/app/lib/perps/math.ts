// Isolated-margin sizing. Pure functions, shared by the order ticket and the positions table.
import { formatUnits, parseUnits } from 'viem'

export type Side = 'long' | 'short'

export type OrderInput = {
  side: Side
  collateralEth: number
  leverage: number
  priceUsd: number // mark price the order is sized against
  ethUsd: number
  feeBps: number
  maintenanceMarginBps: number
  slippageBps: number
}

export type OrderPreview = {
  sizeEth: number // notional in ETH
  sizeUsd: number
  tokenAmount: number
  feeEth: number
  marginEth: number // collateral left after the open fee
  liquidationPrice: number
  /** Price-move to liquidation, as a fraction of entry (0.08 = an 8% move). */
  liquidationDistance: number
  acceptablePrice: number // price bound sent with the order
}

export function previewOrder(o: OrderInput): OrderPreview {
  const sizeEth = o.collateralEth * o.leverage
  const sizeUsd = sizeEth * o.ethUsd
  const feeEth = (sizeEth * o.feeBps) / 10_000
  const marginEth = Math.max(0, o.collateralEth - feeEth)
  const mmr = o.maintenanceMarginBps / 10_000
  const marginRatio = sizeEth > 0 ? marginEth / sizeEth : 0
  // Liquidated when equity falls to the maintenance margin of the position.
  const liquidationPrice =
    o.side === 'long' ? o.priceUsd * (1 - marginRatio + mmr) : o.priceUsd * (1 + marginRatio - mmr)
  const slip = o.slippageBps / 10_000
  return {
    sizeEth,
    sizeUsd,
    tokenAmount: o.priceUsd > 0 ? sizeUsd / o.priceUsd : 0,
    feeEth,
    marginEth,
    liquidationPrice: Math.max(0, liquidationPrice),
    liquidationDistance: o.priceUsd > 0 ? Math.abs(o.priceUsd - liquidationPrice) / o.priceUsd : 0,
    acceptablePrice: o.side === 'long' ? o.priceUsd * (1 + slip) : o.priceUsd * (1 - slip),
  }
}

/** Unrealised PnL in ETH for an open position at a mark price. */
export function positionPnlEth(p: { isLong: boolean; sizeEth: number; entryPrice: number }, mark: number): number {
  if (!p.entryPrice || !mark) return 0
  const move = mark / p.entryPrice - 1
  return p.sizeEth * (p.isLong ? move : -move)
}

/** USD value (float) <-> 1e18 fixed point, exact enough for micro-priced tokens (1e-9 and below). */
export const toWad = (v: number): bigint => (Number.isFinite(v) && v > 0 ? parseUnits(v.toFixed(18), 18) : 0n)
export const fromWad = (v: bigint): number => Number(formatUnits(v, 18))
