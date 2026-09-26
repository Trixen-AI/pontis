import { Box, Flex, Text, chakra } from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import type { Address } from 'viem'
import { useSeo } from '@/lib/seo'
import { formatUnits, parseEther } from 'viem'
import { useReadContracts } from 'wagmi'
import { PERPS_ENGINE, PROTOCOL, explorerTx, robinhood } from '@/app/config'
import { useQuotes } from '@/app/hooks/useLaunches'
import { useEthUsd } from '@/app/hooks/useMarketData'
import { engineConfigured, useEngineTx, usePositions } from '@/app/hooks/usePerps'
import { useWalletState } from '@/app/hooks/useWallet'
import { formatEth, formatPrice, formatUsd, shortAddress } from '@/app/lib/format'
import { perpsAbi, type EnginePosition } from '@/app/lib/perps/abi'
import { fromWad, positionPnlEth, toWad } from '@/app/lib/perps/math'
import { type SignedOrder, cancelOrder, useSignedOrders } from '@/app/lib/perps/order'
import { publicClient } from '@/app/lib/pons'
import { openWallet, walletReady } from '@/app/web3/wagmi'
import { EmptyState, PageHeader, Panel, PanelHeader, PillOutline, PillSolid, Skeleton, Stat } from '@/app/components/ui'

export default function Positions() {
  useSeo({ title: 'Positions', path: '/app/positions', noindex: true })
  const { address, isConnected } = useWalletState()

  const header = <PageHeader title="Positions" sub="Your perps on PONS tokens, marked to the live spot price." />

  if (!walletReady)
    return (
      <>
        {header}
        <Panel>
          <EmptyState title="Wallet connection is not configured">Add VITE_REOWN_PROJECT_ID to .env and restart the dev server to connect a wallet.</EmptyState>
        </Panel>
      </>
    )
  if (!isConnected || !address)
    return (
      <>
        {header}
        <Panel>
          <EmptyState title="Connect a wallet to see your positions" action={<PillSolid onClick={() => openWallet()}>Connect wallet</PillSolid>}>
            Your orders and positions on Robinhood Chain show up here for the connected wallet.
          </EmptyState>
        </Panel>
      </>
    )
  if (!engineConfigured)
    return (
      <>
        {header}
        <ApprovedOrders trader={address} />
      </>
    )
  return (
    <>
      {header}
      <OpenPositions trader={address} />
      <History trader={address} />
    </>
  )
}

function OpenPositions({ trader }: { trader: `0x${string}` }) {
  const positions = usePositions(trader)
  const list = positions.data ?? []
  const quotes = useQuotes(list.map((p) => p.token))
  const { data: ethUsd } = useEthUsd()
  const liq = useReadContracts({
    contracts: list.map((p) => ({ address: PERPS_ENGINE!, abi: perpsAbi, functionName: 'liquidationPrice', args: [p.id], chainId: robinhood.id }) as const),
    query: { enabled: list.length > 0, refetchInterval: 15_000 },
  })

  const rows = list.map((p, i) => {
    const q = quotes.data?.get(p.token.toLowerCase())
    const sizeEth = Number(formatUnits(p.size, 18))
    const entry = fromWad(p.entryPrice)
    const mark = q?.priceUsd
    const pnl = mark ? positionPnlEth({ isLong: p.isLong, sizeEth, entryPrice: entry }, mark) : 0
    const liqRes = liq.data?.[i]
    return { p, q, sizeEth, entry, mark, pnl, liqPrice: liqRes?.status === 'success' ? fromWad(liqRes.result as bigint) : undefined }
  })
  const collateralEth = list.reduce((s, p) => s + Number(formatUnits(p.collateral, 18)), 0)
  const pnlEth = rows.reduce((s, r) => s + r.pnl, 0)

  return (
    <>
      <Panel p={{ base: '20px', md: '28px 32px' }} mb="24px">
        <Flex gap={{ base: '20px', md: '48px' }} wrap="wrap">
          <Stat label="Open positions" value={positions.isPending ? '…' : String(list.length)} />
          <Stat label="Collateral posted" value={formatEth(collateralEth)} sub={ethUsd ? formatUsd(collateralEth * ethUsd, false) : undefined} />
          <Stat
            label="Unrealised PnL"
            value={ethUsd ? formatUsd(pnlEth * ethUsd, false) : formatEth(pnlEth)}
            valueColor={pnlEth > 0 ? 'var(--accent)' : pnlEth < 0 ? 'var(--rug)' : undefined}
          />
        </Flex>
      </Panel>
      <Panel overflow="hidden" mb="24px">
        <PanelHeader title="Open" />
        {positions.isPending ? (
          <Box p="20px" display="grid" gap="12px">
            <Skeleton h="22px" />
            <Skeleton h="22px" />
          </Box>
        ) : positions.isError ? (
          <Text m="0" p="20px" fontSize="14px" color="var(--rug)">
            The engine did not answer: {positions.error.message}
          </Text>
        ) : rows.length === 0 ? (
          <EmptyState title="No open positions" action={<PillSolid to="/app/markets">Find a market</PillSolid>} />
        ) : (
          rows.map((r) => <PositionRow key={String(r.p.id)} {...r} ethUsd={ethUsd} />)
        )}
      </Panel>
    </>
  )
}

function PositionRow({ p, q, sizeEth, entry, mark, pnl, liqPrice, ethUsd }: { p: EnginePosition; q: { symbol: string } | undefined; sizeEth: number; entry: number; mark: number | undefined; pnl: number; liqPrice: number | undefined; ethUsd: number | undefined }) {
  const { tx, send } = useEngineTx()
  const [adding, setAdding] = useState('')
  const busy = tx.status === 'signing' || tx.status === 'pending'
  const close = () => {
    if (!mark) return
    const slip = PROTOCOL.slippageBps / 10_000
    // closing a long sells: accept a slightly lower price; closing a short buys: slightly higher
    const bound = p.isLong ? mark * (1 - slip) : mark * (1 + slip)
    send({ fn: 'closePosition', args: [p.id, toWad(bound)] })
  }
  const addCollateral = () => {
    const v = Number(adding)
    if (!(v > 0)) return
    send({ fn: 'addCollateral', args: [p.id], value: parseEther(v.toFixed(18)) })
  }
  return (
    <Box px="20px" py="16px" borderBottom="0.8px solid var(--line)">
      <Flex justify="space-between" align="center" gap="16px" wrap="wrap">
        <Flex align="center" gap="12px">
          <chakra.span color={p.isLong ? 'var(--accent)' : 'var(--rug)'} fontSize="15px">
            {p.isLong ? 'Long' : 'Short'}
          </chakra.span>
          <PillOutline to={`/app/markets/${p.token}`} tone="muted">
            {q?.symbol ?? shortAddress(p.token)}-PERP
          </PillOutline>
          <chakra.span fontSize="12px" color="var(--muted)">
            #{String(p.id)} · {sizeEth > 0 ? `${(sizeEth / Number(formatUnits(p.collateral, 18))).toFixed(1)}x` : ''}
          </chakra.span>
        </Flex>
        <Flex gap="24px" wrap="wrap" fontSize="13px" className="tabular">
          <span>Size {ethUsd ? formatUsd(sizeEth * ethUsd, false) : formatEth(sizeEth)}</span>
          <span>Entry {formatPrice(entry)}</span>
          <span>Mark {formatPrice(mark)}</span>
          <chakra.span color="var(--rug)">Liq {formatPrice(liqPrice)}</chakra.span>
          <chakra.span color={pnl >= 0 ? 'var(--accent)' : 'var(--rug)'}>PnL {ethUsd ? formatUsd(pnl * ethUsd, false) : formatEth(pnl)}</chakra.span>
        </Flex>
      </Flex>
      <Flex mt="12px" gap="10px" align="center" wrap="wrap">
        <Flex align="center" h="36px" px="12px" gap="8px" border="0.8px solid var(--line)" borderRadius="60px">
          <chakra.input
            aria-label="Collateral to add, in ETH"
            placeholder="Add ETH"
            inputMode="decimal"
            value={adding}
            onChange={(e) => /^\d*\.?\d{0,8}$/.test(e.target.value) && setAdding(e.target.value)}
            w="90px"
            bg="transparent"
            border="none"
            outline="none"
            color="var(--white)"
            fontSize="13px"
          />
          <chakra.button type="button" onClick={addCollateral} disabled={busy || !(Number(adding) > 0)} bg="transparent" border="none" color="var(--accent)" cursor="pointer" fontSize="13px">
            Add margin
          </chakra.button>
        </Flex>
        <PillOutline onClick={close} disabled={busy || !mark} tone="rug">
          {busy ? 'Working…' : 'Close position'}
        </PillOutline>
        {'hash' in tx && tx.hash ? (
          <chakra.a href={explorerTx(tx.hash)} target="_blank" rel="noopener noreferrer" fontSize="12px" color={tx.status === 'failed' ? 'var(--rug)' : 'var(--accent)'}>
            {tx.status === 'pending' ? 'Pending…' : tx.status === 'confirmed' ? 'Confirmed' : 'Failed'} · view tx
          </chakra.a>
        ) : tx.status === 'failed' ? (
          <chakra.span fontSize="12px" color="var(--rug)">
            {tx.message}
          </chakra.span>
        ) : null}
      </Flex>
    </Box>
  )
}

const HISTORY_BLOCKS = 3_000_000n // ~3.5 days at ~100 ms blocks

function History({ trader }: { trader: `0x${string}` }) {
  const q = useQuery({
    queryKey: ['perps-history', trader],
    refetchInterval: 30_000,
    queryFn: async () => {
      const latest = await publicClient.getBlockNumber()
      const fromBlock = latest > HISTORY_BLOCKS ? latest - HISTORY_BLOCKS : 0n
      // one filtered query per event: viem applies indexed-arg filters to a single event at a time
      const byEvent = await Promise.all(
        (['PositionOpened', 'PositionClosed', 'PositionLiquidated'] as const).map((eventName) =>
          publicClient.getContractEvents({ address: PERPS_ENGINE!, abi: perpsAbi, eventName, args: { trader }, fromBlock, toBlock: latest }),
        ),
      )
      return byEvent
        .flat()
        .toSorted((a, b) => (a.blockNumber === b.blockNumber ? b.logIndex - a.logIndex : a.blockNumber > b.blockNumber ? -1 : 1))
        .slice(0, 30)
    },
  })
  return (
    <Panel overflow="hidden">
      <PanelHeader title="History" right={<Text m="0" fontSize="12px" color="var(--muted)">Last ~3 days</Text>} />
      {q.isPending ? (
        <Box p="20px">
          <Skeleton h="22px" />
        </Box>
      ) : !q.data?.length ? (
        <Text m="0" p="20px" fontSize="14px" color="var(--muted)">
          {q.isError ? 'History is unavailable right now.' : 'No opens, closes or liquidations in this window.'}
        </Text>
      ) : (
        q.data.map((l) => (
          <Flex key={l.transactionHash + l.logIndex} justify="space-between" px="20px" py="10px" borderBottom="0.8px solid var(--line)" fontSize="13px" className="tabular">
            <chakra.span color={l.eventName === 'PositionLiquidated' ? 'var(--rug)' : 'var(--white)'}>
              {l.eventName === 'PositionOpened' ? 'Opened' : l.eventName === 'PositionClosed' ? 'Closed' : 'Liquidated'} #{String(l.args.id)}
            </chakra.span>
            <chakra.a href={explorerTx(l.transactionHash)} target="_blank" rel="noopener noreferrer" color="var(--muted)">
              block {String(l.blockNumber)}
            </chakra.a>
          </Flex>
        ))
      )}
    </Panel>
  )
}

/** Re-render on an interval so "valid for 12m" and expiry stay true. */
function useNow(ms = 15_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}

/** Orders the wallet approved (EIP-712 signed), marked to the live price. */
function ApprovedOrders({ trader }: { trader: Address }) {
  const orders = useSignedOrders(trader)
  const quotes = useQuotes(orders.map((o) => o.market))
  const { data: ethUsd } = useEthUsd()
  const now = useNow()

  const marks = orders.map((o) => quotes.data?.get(o.market.toLowerCase())?.priceUsd)
  const pnls = orders.map((o, i) => (marks[i] ? positionPnlEth({ isLong: o.isLong, sizeEth: o.sizeEth, entryPrice: o.entryPrice }, marks[i]!) : 0))
  const collateralEth = orders.reduce((s, o) => s + o.collateralEth, 0)
  const pnlEth = pnls.reduce((s, x) => s + x, 0)

  return (
    <>
      <Panel p={{ base: '20px', md: '28px 32px' }} mb="24px">
        <Flex gap={{ base: '20px', md: '48px' }} wrap="wrap">
          <Stat label="Approved orders" value={String(orders.length)} />
          <Stat label="Collateral in orders" value={formatEth(collateralEth)} sub={ethUsd ? formatUsd(collateralEth * ethUsd, false) : undefined} />
          <Stat label="PnL at mark" value={ethUsd ? formatUsd(pnlEth * ethUsd, false) : formatEth(pnlEth)} valueColor={pnlEth > 0 ? 'var(--accent)' : pnlEth < 0 ? 'var(--rug)' : undefined} />
        </Flex>
      </Panel>
      <Panel overflow="hidden">
        <PanelHeader title="Orders" />
        {orders.length === 0 ? (
          <EmptyState title="No orders yet" action={<PillSolid to="/app/markets">Find a market</PillSolid>}>
            Pick a PONS market, set your side, collateral and leverage, then review and approve the order in your wallet.
          </EmptyState>
        ) : (
          orders.map((o, i) => <OrderRow key={o.id} order={o} mark={marks[i]} pnlEth={pnls[i]} ethUsd={ethUsd} now={now} />)
        )}
      </Panel>
    </>
  )
}

function OrderRow({ order: o, mark, pnlEth, ethUsd, now }: { order: SignedOrder; mark: number | undefined; pnlEth: number; ethUsd: number | undefined; now: number }) {
  const expired = o.deadline * 1000 <= now
  const minsLeft = Math.max(0, Math.ceil((o.deadline * 1000 - now) / 60_000))
  return (
    <Box px="20px" py="16px" borderBottom="0.8px solid var(--line)">
      <Flex justify="space-between" align="center" gap="12px" wrap="wrap">
        <Flex align="center" gap="10px" wrap="wrap">
          <chakra.span
            px="10px"
            h="24px"
            display="inline-flex"
            alignItems="center"
            borderRadius="60px"
            fontSize="12px"
            bg={o.isLong ? 'var(--accent)' : 'var(--rug)'}
            color={o.isLong ? 'var(--accent-ink)' : 'var(--white)'}
          >
            {o.isLong ? 'Long' : 'Short'} {o.leverage}x
          </chakra.span>
          <PillOutline to={`/app/markets/${o.market}`} tone="muted">
            {o.symbol}-PERP
          </PillOutline>
          <chakra.span fontSize="12px" color={expired ? 'var(--muted)' : 'var(--accent)'}>
            {expired ? 'Expired' : `Signed · valid ${minsLeft}m`}
          </chakra.span>
        </Flex>
        <chakra.button
          type="button"
          onClick={() => cancelOrder(o.trader, o.id)}
          h="32px"
          px="14px"
          borderRadius="60px"
          fontSize="13px"
          bg="transparent"
          color="var(--white-80)"
          border="0.8px solid var(--line)"
          cursor="pointer"
        >
          {expired ? 'Remove' : 'Cancel'}
        </chakra.button>
      </Flex>
      <Box mt="12px" display="grid" gridTemplateColumns={{ base: 'repeat(2, minmax(0, 1fr))', md: 'repeat(5, minmax(0, 1fr))' }} gap="10px 16px" fontSize="13px" className="tabular">
        <Cell label="Size" value={ethUsd ? formatUsd(o.sizeEth * ethUsd, false) : formatEth(o.sizeEth)} />
        <Cell label="Collateral" value={formatEth(o.collateralEth, 5)} />
        <Cell label="Entry" value={formatPrice(o.entryPrice)} />
        <Cell label="Mark" value={formatPrice(mark)} />
        <Cell label="Liq. price" value={formatPrice(o.liquidationPrice)} tone="var(--rug)" />
        <Cell label="PnL at mark" value={ethUsd && mark ? formatUsd(pnlEth * ethUsd, false) : '–'} tone={pnlEth > 0 ? 'var(--accent)' : pnlEth < 0 ? 'var(--rug)' : undefined} />
      </Box>
    </Box>
  )
}

function Cell({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Box minW="0">
      <Text m="0" fontSize="11px" color="var(--muted)">
        {label}
      </Text>
      <Text m="0" color={tone ?? 'var(--white)'} overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
        {value}
      </Text>
    </Box>
  )
}
