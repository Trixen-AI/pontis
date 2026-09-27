import { PROTOCOL, maxLeverageFor } from '@/app/config'

export type MarketRisk = { liquidityUsd?: number; volume24h?: number; onCurve?: boolean }

/** Risk parameters for one market. Protocol defaults until the FunPerps engine publishes its own. */
export function useMarketParams(_token: string | undefined, risk: MarketRisk) {
  const tierMax = maxLeverageFor(risk)
  return {
    source: 'defaults' as const,
    maxLeverage: tierMax,
    maintenanceMarginBps: PROTOCOL.maintenanceMarginBps,
    tradingFeeBps: PROTOCOL.tradingFeeBps,
    listed: tierMax > 0,
  }
}
