import { Box, Flex, Text, chakra } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { EmptyState, PageHeader, Panel, PanelHeader, PillOutline, PillSolid, Stat } from '@/app/components/ui'
import { useQuotes } from '@/app/hooks/useLaunches'
import { useSolUsd, useWalletState } from '@/app/hooks/useWallet'
import { formatPrice, formatSol, formatUsd } from '@/app/lib/format'
import { positionPnl } from '@/app/lib/perps/math'
import { type SignedOrder, cancelOrder, useSignedOrders } from '@/app/lib/perps/order'
import { openWallet, walletReady } from '@/app/web3/appkit'
import { useSeo } from '@/lib/seo'

export default function Positions() {
  useSeo({ title: 'Positions', path: '/app/positions', noindex: true })
  const { address, isConnected } = useWalletState()
  const header = <PageHeader title="Positions" sub="Your perps on Pump.fun tokens, marked to the live spot price." />

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
            Your orders and positions show up here for the connected Solana wallet.
          </EmptyState>
        </Panel>
      </>
    )
  return (
    <>
      {header}
      <ApprovedOrders trader={address} />
    </>
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

/** Orders the wallet approved (signed in the wallet), marked to the live price. */
function ApprovedOrders({ trader }: { trader: string }) {
  const orders = useSignedOrders(trader)
  const quotes = useQuotes(orders.map((o) => o.market))
  const { data: solUsd } = useSolUsd()
  const now = useNow()

  const marks = orders.map((o) => quotes.data?.get(o.market)?.priceUsd)
  const pnls = orders.map((o, i) => (marks[i] ? positionPnl({ isLong: o.isLong, sizeSol: o.sizeSol, entryPrice: o.entryPrice }, marks[i]!) : 0))
  const collateral = orders.reduce((s, o) => s + o.collateralSol, 0)
  const pnl = pnls.reduce((s, x) => s + x, 0)

  return (
    <>
      <Panel p={{ base: '20px', md: '28px 32px' }} mb="24px">
        <Flex gap={{ base: '20px', md: '48px' }} wrap="wrap">
          <Stat label="Approved orders" value={String(orders.length)} />
          <Stat label="Collateral in orders" value={formatSol(collateral)} sub={solUsd ? formatUsd(collateral * solUsd, false) : undefined} />
          <Stat label="PnL at mark" value={solUsd ? formatUsd(pnl * solUsd, false) : formatSol(pnl)} valueColor={pnl > 0 ? 'var(--long)' : pnl < 0 ? 'var(--short)' : undefined} />
        </Flex>
      </Panel>
      <Panel overflow="hidden">
        <PanelHeader title="Orders" />
        {orders.length === 0 ? (
          <EmptyState title="No orders yet" action={<PillSolid to="/app/markets">Find a market</PillSolid>}>
            Pick a Pump.fun market, set your side, collateral and leverage, then review and approve the order in your wallet.
          </EmptyState>
        ) : (
          orders.map((o, i) => <OrderRow key={o.id} order={o} mark={marks[i]} pnl={pnls[i]} solUsd={solUsd} now={now} />)
        )}
      </Panel>
    </>
  )
}

function OrderRow({ order: o, mark, pnl, solUsd, now }: { order: SignedOrder; mark: number | undefined; pnl: number; solUsd: number | undefined; now: number }) {
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
            bg={o.isLong ? 'var(--long)' : 'var(--short)'}
            color={o.isLong ? 'var(--long-ink)' : 'var(--short-ink)'}
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
      <Box mt="12px" display="grid" gridTemplateColumns={{ base: 'repeat(2, minmax(0, 1fr))', md: 'repeat(6, minmax(0, 1fr))' }} gap="10px 16px" fontSize="13px" className="tabular">
        <Cell label="Size" value={solUsd ? formatUsd(o.sizeSol * solUsd, false) : formatSol(o.sizeSol)} />
        <Cell label="Collateral" value={formatSol(o.collateralSol, 4)} />
        <Cell label="Entry" value={formatPrice(o.entryPrice)} />
        <Cell label="Mark" value={formatPrice(mark)} />
        <Cell label="Liq. price" value={formatPrice(o.liquidationPrice)} tone="var(--short)" />
        <Cell label="PnL at mark" value={solUsd && mark ? formatUsd(pnl * solUsd, false) : '–'} tone={pnl > 0 ? 'var(--long)' : pnl < 0 ? 'var(--short)' : undefined} />
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
