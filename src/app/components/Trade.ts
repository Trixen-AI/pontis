// Namespace for the order ticket's compound parts: <Trade.Provider>, <Trade.SideToggle>, ...
import {
  TradeCollateral,
  TradeLeverage,
  TradeProvider,
  TradeSideToggle,
  TradeSubmit,
  TradeSummary,
} from './TradeTicket'

export const Trade = {
  Provider: TradeProvider,
  SideToggle: TradeSideToggle,
  CollateralInput: TradeCollateral,
  LeverageSlider: TradeLeverage,
  Summary: TradeSummary,
  Submit: TradeSubmit,
}
