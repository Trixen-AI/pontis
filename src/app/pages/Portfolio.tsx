import { Box, Flex, Grid, Text, chakra } from '@chakra-ui/react'
import { explorerAddress, explorerTx, maxLeverageFor } from '@/app/config'
import { useEthUsd } from '@/app/hooks/useMarketData'
import { useActivity, useEthBalance, usePonsHoldings, useWalletState } from '@/app/hooks/useWallet'
import { formatEth, formatNumber, formatPrice, formatUsd, shortAddress, timeAgo } from '@/app/lib/format'
import { openWallet, walletReady } from '@/app/web3/wagmi'
import { useSeo } from '@/lib/seo'
import { Change, EmptyState, PageHeader, Panel, PanelHeader, PillOutline, PillSolid, Skeleton, Stat, TokenAvatar } from '@/app/components/ui'

export default function Portfolio() {
  useSeo({ title: 'Portfolio', path: '/app/portfolio', noindex: true })
  const { address, isConnected } = useWalletState()
  const header = <PageHeader title="Portfolio" sub="What the connected wallet holds on Robinhood Chain, and which of it you can hedge." />

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
          <EmptyState title="Connect a wallet to see your PONS bags" action={<PillSolid onClick={() => openWallet()}>Connect wallet</PillSolid>}>
            Pontis reads your balances straight from Robinhood Chain. Nothing is stored.
          </EmptyState>
        </Panel>
      </>
    )
  return (
    <>
      {header}
      <Overview address={address} />
      <Grid templateColumns={{ base: 'minmax(0, 1fr)', lg: 'minmax(0, 1fr) 360px' }} gap="20px" alignItems="start">
        <Holdings address={address} />
        <Activity address={address} />
      </Grid>
    </>
  )
}

function Overview({ address }: { address: `0x${string}` }) {
  const { eth, isPending } = useEthBalance(address)
  const { data: ethUsd } = useEthUsd()
  const holdings = usePonsHoldings(address)
  const ponsValue = holdings.data?.rows.reduce((s, r) => s + (r.valueUsd ?? 0), 0)
  const hedgeable = holdings.data?.rows.filter((r) => maxLeverageFor(r) > 0).length
  return (
    <Panel p={{ base: '20px', md: '28px 32px' }} mb="24px">
      <Flex gap={{ base: '20px', md: '48px' }} wrap="wrap" align="flex-end">
        <Stat label="ETH (margin)" value={isPending ? '…' : formatEth(eth)} sub={eth != null && ethUsd ? formatUsd(eth * ethUsd, false) : undefined} />
        <Stat label="PONS tokens value" value={holdings.isPending ? '…' : formatUsd(ponsValue)} sub={holdings.data ? `${holdings.data.rows.length} PONS tokens held` : undefined} />
        <Stat label="Hedgeable now" value={holdings.isPending ? '…' : formatNumber(hedgeable ?? 0)} sub="Markets deep enough to short" />
        <Box ml={{ base: 0, md: 'auto' }}>
          <chakra.a href={explorerAddress(address)} target="_blank" rel="noopener noreferrer" fontSize="13px" color="var(--white-80)" className="tabular">
            {shortAddress(address)} on Blockscout
          </chakra.a>
        </Box>
      </Flex>
    </Panel>
  )
}

function Holdings({ address }: { address: `0x${string}` }) {
  const { data, isPending, isError } = usePonsHoldings(address)
  return (
    <Panel overflow="hidden">
      <PanelHeader
        title="PONS holdings"
        right={
          data?.otherTokens ? (
            <Text m="0" fontSize="12px" color="var(--muted)">
              {data.otherTokens} other token{data.otherTokens === 1 ? '' : 's'} not launched on Pons
            </Text>
          ) : undefined
        }
      />
      {isPending ? (
        <Box p="20px" display="grid" gap="12px">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} h="22px" />
          ))}
        </Box>
      ) : isError ? (
        <Text m="0" p="20px" fontSize="14px" color="var(--muted)">
          Balances are unavailable right now. Retrying shortly.
        </Text>
      ) : !data?.rows.length ? (
        <EmptyState title="No PONS tokens in this wallet" action={<PillSolid to="/app/listings">See new launches</PillSolid>}>
          Tokens you buy on Pons show up here with a one-click hedge.
        </EmptyState>
      ) : (
        data.rows.map((r) => {
          const lev = maxLeverageFor(r)
          const market = `/app/markets/${r.token}`
          return (
            <Flex key={r.token} align="center" justify="space-between" gap="14px" px="20px" py="14px" borderBottom="0.8px solid var(--line)" wrap="wrap">
              <Flex align="center" gap="12px" minW="200px">
                <TokenAvatar src={r.icon} symbol={r.symbol} size={32} />
                <Box>
                  <Text m="0" fontSize="15px" color="var(--white)">
                    {r.symbol}
                  </Text>
                  <Text m="0" fontSize="12px" color="var(--muted)" className="tabular">
                    {formatNumber(r.amount, true)} · {formatPrice(r.priceUsd)}
                  </Text>
                </Box>
              </Flex>
              <Flex align="center" gap="18px" className="tabular" fontSize="14px">
                <Box textAlign="right">
                  <Text m="0" color="var(--white)">{formatUsd(r.valueUsd, false)}</Text>
                  <Change value={r.change24h} fontSize="12px" />
                </Box>
                <Flex gap="6px">
                  {lev > 0 && r.valueUsd && r.valueUsd > 1 ? (
                    <PillOutline to={`${market}?side=short&hedge=${r.valueUsd.toFixed(2)}`} tone="rug">
                      Hedge
                    </PillOutline>
                  ) : null}
                  <PillOutline to={market} tone="muted">
                    {lev > 0 ? 'Trade' : 'View'}
                  </PillOutline>
                </Flex>
              </Flex>
            </Flex>
          )
        })
      )}
    </Panel>
  )
}

function Activity({ address }: { address: `0x${string}` }) {
  const { data, isPending, isError } = useActivity(address)
  return (
    <Panel overflow="hidden">
      <PanelHeader title="Recent activity" />
      {isPending ? (
        <Box p="20px" display="grid" gap="12px">
          <Skeleton h="18px" />
          <Skeleton h="18px" />
        </Box>
      ) : isError || !data?.length ? (
        <Text m="0" p="20px" fontSize="14px" color="var(--muted)">
          {isError ? 'Activity is unavailable right now.' : 'No transactions yet on Robinhood Chain.'}
        </Text>
      ) : (
        data.map((t) => (
          <chakra.a key={t.hash} href={explorerTx(t.hash)} target="_blank" rel="noopener noreferrer" display="flex" justifyContent="space-between" gap="10px" px="20px" py="11px" borderBottom="0.8px solid var(--line)" _hover={{ bg: 'rgba(255,255,255,0.025)' }}>
            <Box minW="0">
              <Text m="0" fontSize="14px" color={t.status === 'error' ? 'var(--rug)' : 'var(--white)'} overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                {t.method ?? 'Transfer'}
                {t.status === 'error' ? ' · failed' : ''}
              </Text>
              <Text m="0" fontSize="12px" color="var(--muted)" className="tabular">
                {t.toName ?? shortAddress(t.to)}
              </Text>
            </Box>
            <Box textAlign="right" flexShrink={0}>
              <Text m="0" fontSize="13px" color="var(--white-80)" className="tabular">
                {t.valueEth ? formatEth(t.valueEth) : ''}
              </Text>
              <Text m="0" fontSize="12px" color="var(--muted)">
                {timeAgo(t.at)}
              </Text>
            </Box>
          </chakra.a>
        ))
      )}
    </Panel>
  )
}
