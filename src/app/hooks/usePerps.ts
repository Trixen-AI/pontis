import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { Address } from 'viem'
import { useReadContract, useReadContracts, useWriteContract } from 'wagmi'
import { waitForTransactionReceipt } from 'wagmi/actions'
import { PERPS_ENGINE, PROTOCOL, maxLeverageFor, robinhood } from '@/app/config'
import { perpsAbi, type EnginePosition } from '@/app/lib/perps/abi'
import { wagmiConfig } from '@/app/web3/wagmi'

export const engineConfigured = PERPS_ENGINE !== undefined

export type MarketRisk = { liquidityUsd?: number; volume24h?: number; onCurve?: boolean }

/** Risk parameters for one market: on-chain when the engine exists, protocol defaults otherwise. */
export function useMarketParams(token: Address | undefined, risk: MarketRisk) {
  const q = useReadContracts({
    allowFailure: true,
    contracts: [
      { address: PERPS_ENGINE, abi: perpsAbi, functionName: 'maxLeverage', args: token ? [token] : undefined, chainId: robinhood.id },
      { address: PERPS_ENGINE, abi: perpsAbi, functionName: 'maintenanceMarginBps', chainId: robinhood.id },
      { address: PERPS_ENGINE, abi: perpsAbi, functionName: 'tradingFeeBps', chainId: robinhood.id },
      { address: PERPS_ENGINE, abi: perpsAbi, functionName: 'isMarketListed', args: token ? [token] : undefined, chainId: robinhood.id },
    ],
    query: { enabled: engineConfigured && !!token, staleTime: 60_000 },
  })
  const [lev, mmr, fee, listed] = q.data ?? []
  const onChain = engineConfigured && q.isSuccess
  const tierMax = maxLeverageFor(risk)
  return {
    source: onChain ? ('engine' as const) : ('defaults' as const),
    maxLeverage: onChain && lev?.status === 'success' ? Number(lev.result) / 100 : tierMax,
    maintenanceMarginBps: onChain && mmr?.status === 'success' ? Number(mmr.result) : PROTOCOL.maintenanceMarginBps,
    tradingFeeBps: onChain && fee?.status === 'success' ? Number(fee.result) : PROTOCOL.tradingFeeBps,
    listed: onChain ? listed?.status === 'success' && listed.result === true : tierMax > 0,
  }
}

export function usePositions(trader: Address | undefined) {
  return useReadContract({
    address: PERPS_ENGINE,
    abi: perpsAbi,
    functionName: 'positionsOf',
    args: trader ? [trader] : undefined,
    chainId: robinhood.id,
    query: { enabled: engineConfigured && !!trader, refetchInterval: 10_000, select: (d) => d as readonly EnginePosition[] },
  })
}

export type TxState =
  | { status: 'idle' }
  | { status: 'signing' }
  | { status: 'pending'; hash: `0x${string}` }
  | { status: 'confirmed'; hash: `0x${string}` }
  | { status: 'failed'; message: string; hash?: `0x${string}` }

/** The three state-changing engine calls. Collateral travels as msg.value. */
export type EngineCall =
  | { fn: 'openPosition'; args: readonly [Address, boolean, bigint, bigint]; value: bigint }
  | { fn: 'closePosition'; args: readonly [bigint, bigint] }
  | { fn: 'addCollateral'; args: readonly [bigint]; value: bigint }

/** Sends one engine transaction and follows it to a receipt. Refreshes positions + balances after. */
export function useEngineTx() {
  const [tx, setTx] = useState<TxState>({ status: 'idle' })
  const { writeContractAsync } = useWriteContract()
  const qc = useQueryClient()

  const write = (call: EngineCall, address: Address) => {
    const base = { address, abi: perpsAbi, chainId: robinhood.id } as const
    switch (call.fn) {
      case 'openPosition':
        return writeContractAsync({ ...base, functionName: 'openPosition', args: call.args, value: call.value })
      case 'closePosition':
        return writeContractAsync({ ...base, functionName: 'closePosition', args: call.args })
      case 'addCollateral':
        return writeContractAsync({ ...base, functionName: 'addCollateral', args: call.args, value: call.value })
    }
  }

  async function send(call: EngineCall) {
    if (!PERPS_ENGINE) return
    setTx({ status: 'signing' })
    let hash: `0x${string}` | undefined
    try {
      hash = await write(call, PERPS_ENGINE)
      setTx({ status: 'pending', hash })
      const receipt = await waitForTransactionReceipt(wagmiConfig, { hash, chainId: robinhood.id })
      if (receipt.status !== 'success') throw new Error('Transaction reverted')
      setTx({ status: 'confirmed', hash })
      await qc.invalidateQueries()
    } catch (e) {
      const message = e instanceof Error ? (e as { shortMessage?: string }).shortMessage ?? e.message : String(e)
      setTx({ status: 'failed', message, hash })
    }
  }

  return { tx, send, reset: () => setTx({ status: 'idle' }) }
}
