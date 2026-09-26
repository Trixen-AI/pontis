// Pontis perps engine interface.
//
// This is the contract surface the dashboard talks to. The engine is not deployed yet:
// set VITE_PONTIS_PERPS_ADDRESS to a contract implementing exactly these functions and events,
// and trading turns on with no other change.
//
// Units
//   collateral, size ........ wei of ETH (size = notional exposure, collateral x leverage)
//   prices .................. USD per whole token, 18 decimals (1e18 = $1)
//   bps ..................... basis points (10_000 = 100%)
//   leverage ................ x100 (1000 = 10x)
import { parseAbi } from 'viem'

export const perpsAbi = parseAbi([
  // trading (collateral is sent as msg.value)
  'function openPosition(address token, bool isLong, uint256 size, uint256 acceptablePrice) payable returns (uint256 positionId)',
  'function closePosition(uint256 positionId, uint256 acceptablePrice)',
  'function addCollateral(uint256 positionId) payable',

  // reads
  'function positionsOf(address trader) view returns ((uint256 id, address token, bool isLong, uint256 collateral, uint256 size, uint256 entryPrice, uint256 openedAt)[])',
  'function liquidationPrice(uint256 positionId) view returns (uint256)',
  'function markPrice(address token) view returns (uint256)',
  'function isMarketListed(address token) view returns (bool)',
  'function maxLeverage(address token) view returns (uint256)',
  'function maintenanceMarginBps() view returns (uint256)',
  'function tradingFeeBps() view returns (uint256)',

  // history
  'event PositionOpened(uint256 indexed id, address indexed trader, address indexed token, bool isLong, uint256 collateral, uint256 size, uint256 entryPrice)',
  'event PositionClosed(uint256 indexed id, address indexed trader, address indexed token, int256 pnl, uint256 exitPrice)',
  'event PositionLiquidated(uint256 indexed id, address indexed trader, address indexed token, uint256 price)',
])

export type EnginePosition = {
  id: bigint
  token: `0x${string}`
  isLong: boolean
  collateral: bigint
  size: bigint
  entryPrice: bigint
  openedAt: bigint
}
