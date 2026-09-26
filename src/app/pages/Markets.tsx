import { Box, Flex, Text, chakra } from '@chakra-ui/react'
import { useDeferredValue, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { isAddress } from 'viem'
import { useSeo } from '@/lib/seo'
import { maxLeverageFor } from '@/app/config'
import { useMarkets, useNewCurveMarkets } from '@/app/hooks/useMarketData'
import type { Market } from '@/app/lib/api/gecko'
import { formatNumber, formatPrice, formatUsd, timeAgo } from '@/app/lib/format'
import { Change, EmptyState, PageHeader, Panel, PillOutline, Skeleton, Stat, StageChip, Tabs, TokenAvatar } from '@/app/components/ui'

type Tab = 'runners' | 'rugs' | 'volume' | 'new'
const TABS: { value: Tab; label: string; short?: string }[] = [
  { value: 'runners', label: 'Runners' },
  { value: 'rugs', label: 'Rugs' },
  { value: 'volume', label: 'Most traded', short: 'Top' },
  { value: 'new', label: 'New on curve', short: 'New' },
]
const isTab = (v: string | null): v is Tab => TABS.some((t) => t.value === v)

function rowsFor(tab: Tab, markets: Market[], fresh: Market[] | undefined): Market[] {
  switch (tab) {
    case 'runners':
      return markets.filter((m) => m.change.h24 > 0).toSorted((a, b) => b.change.h24 - a.change.h24)
    case 'rugs':
      return markets.filter((m) => m.change.h24 < 0).toSorted((a, b) => a.change.h24 - b.change.h24)
    case 'volume':
      return markets.toSorted((a, b) => (b.volume24h || 0) - (a.volume24h || 0))
    case 'new':
      return (fresh ?? []).toSorted((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
  }
}

export default function Markets() {
  useSeo({
    title: 'Markets',
    description: 'Every PONS token with a live price is a perp market on Pontis. Browse runners, rugs and new curve launches on Robinhood Chain.',
    path: '/app/markets',
  })
  const [params, setParams] = useSearchParams()
  const tab: Tab = isTab(params.get('tab')) ? (params.get('tab') as Tab) : 'runners'
  const [query, setQuery] = useState('')
  const q = useDeferredValue(query.trim())
  const navigate = useNavigate()

  const { markets, isLoading, loaded, total, updatedAt, failed } = useMarkets()
  const fresh = useNewCurveMarkets(tab === 'new')

  const all = rowsFor(tab, markets, fresh.data)
  const needle = q.toLowerCase()
  const rows = needle && !isAddress(q) ? all.filter((m) => m.symbol.toLowerCase().includes(needle) || m.name.toLowerCase().includes(needle)) : all

  // Headline numbers across every market currently loaded
  let volume = 0
  let runners = 0
  let rugs = 0
  for (const m of markets) {
    volume += m.volume24h || 0
    if (m.change.h24 > 0) runners++
    else if (m.change.h24 < 0) rugs++
  }

  const listLoading = tab === 'new' ? fresh.isPending : isLoading

  return (
    <>
      <PageHeader
        title="Markets"
        sub="Every PONS token with a live price is a perp market. Long the runners, short the rugs."
        right={
          <Text m="0" fontSize="12px" color="var(--muted)" className="tabular">
            {loaded < total ? `Loading sources ${loaded}/${total}…` : `Updated ${timeAgo(updatedAt)}`}
            {failed ? ` · ${failed} source retrying` : ''}
          </Text>
        }
      />

      <Panel p={{ base: '20px', md: '28px 32px' }} mb="24px">
        <Flex gap={{ base: '20px', md: '48px' }} wrap="wrap">
          <Stat label="Markets tracked" value={isLoading ? '…' : formatNumber(markets.length)} sub="Pons curve, graduated and V1 pools" />
          <Stat label="24h volume" value={isLoading ? '…' : formatUsd(volume)} sub="Across tracked markets" />
          <Stat label="Runners" value={isLoading ? '…' : formatNumber(runners)} valueColor="var(--accent)" sub="Up over 24h" />
          <Stat label="Rugs" value={isLoading ? '…' : formatNumber(rugs)} valueColor="var(--rug)" sub="Down over 24h" />
        </Flex>
      </Panel>

      <Flex justify="space-between" align={{ base: 'stretch', md: 'center' }} direction={{ base: 'column', md: 'row' }} gap="12px" mb="14px">
        <Tabs label="Market lists" value={tab} options={TABS} onChange={(v) => setParams({ tab: v }, { replace: true })} />
        <Flex align="center" h="42px" px="16px" gap="10px" border="0.8px solid var(--line)" borderRadius="60px" w={{ base: '100%', md: '320px' }} _focusWithin={{ borderColor: 'var(--accent)' }}>
          <chakra.input
            aria-label="Search markets by name, symbol or token address"
            placeholder="Search or paste a token address"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            flex="1"
            minW="0"
            bg="transparent"
            border="none"
            outline="none"
            color="var(--white)"
            fontSize="14px"
          />
        </Flex>
      </Flex>

      {isAddress(q) && (
        <Panel p="16px 20px" mb="14px">
          <Flex align="center" justify="space-between" gap="12px" wrap="wrap">
            <Text m="0" fontSize="14px" color="var(--white-80)">
              Open the market for <chakra.span color="var(--white)" className="tabular">{q}</chakra.span>. Pontis checks the Pons factory on-chain first.
            </Text>
            <PillOutline onClick={() => navigate(`/app/markets/${q}`)}>Open market</PillOutline>
          </Flex>
        </Panel>
      )}

      <Panel overflow="hidden">
        <MarketTable rows={rows} loading={listLoading} tab={tab} />
      </Panel>
    </>
  )
}

const TH = (props: React.ComponentProps<typeof chakra.th>) => (
  <chakra.th textAlign="right" fontWeight={400} fontSize="12px" color="var(--muted)" py="12px" px={{ base: '12px', md: '14px' }} whiteSpace="nowrap" borderBottom="0.8px solid var(--line)" {...props} />
)
const TD = (props: React.ComponentProps<typeof chakra.td>) => (
  <chakra.td textAlign="right" fontSize="14px" py="12px" px={{ base: '12px', md: '14px' }} borderBottom="0.8px solid var(--line)" className="tabular" whiteSpace="nowrap" {...props} />
)

function MarketTable({ rows, loading, tab }: { rows: Market[]; loading: boolean; tab: Tab }) {
  const navigate = useNavigate()
  if (loading)
    return (
      <Box p="20px" display="grid" gap="14px">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} h="22px" />
        ))}
      </Box>
    )
  if (!rows.length)
    return (
      <EmptyState title={tab === 'runners' ? 'No runners right now' : tab === 'rugs' ? 'No rugs right now' : 'Nothing to show'}>
        {tab === 'new' ? 'No new curve pools have been indexed yet. The Listings page reads launches straight from the chain.' : 'Try another list or clear the search.'}
      </EmptyState>
    )
  return (
    <Box overflowX="auto">
      <chakra.table w="100%" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <TH textAlign="left">Market</TH>
            <TH display={{ base: 'none', lg: 'table-cell' }} textAlign="left">
              Stage
            </TH>
            <TH>
              Price<chakra.span display={{ base: 'inline', sm: 'none' }}> · 24h</chakra.span>
            </TH>
            <TH display={{ base: 'none', sm: 'table-cell' }}>24h</TH>
            <TH display={{ base: 'none', md: 'table-cell' }}>Volume 24h</TH>
            <TH display={{ base: 'none', md: 'table-cell' }}>Liquidity</TH>
            <TH display={{ base: 'none', lg: 'table-cell' }}>Max lev.</TH>
            <TH display={{ base: 'none', sm: 'table-cell' }}>
              <span className="sr-only">Trade</span>
            </TH>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 100).map((m) => {
            const onCurve = m.stage === 'curve'
            const lev = maxLeverageFor({ liquidityUsd: m.liquidityUsd, volume24h: m.volume24h, onCurve })
            const href = `/app/markets/${m.token}`
            return (
              <chakra.tr key={m.token} cursor="pointer" _hover={{ bg: 'rgba(255,255,255,0.025)' }} onClick={() => navigate(href)}>
                <TD textAlign="left">
                  <Flex align="center" gap="10px">
                    <TokenAvatar src={m.image} symbol={m.symbol} />
                    <Box minW="0">
                      <chakra.a as={Link} {...{ to: href }} color="var(--white)" fontSize="15px" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                        {m.symbol}
                      </chakra.a>
                      <Text m="0" fontSize="12px" color="var(--muted)" maxW={{ base: '130px', md: '180px' }} overflow="hidden" textOverflow="ellipsis">
                        {m.name}
                      </Text>
                    </Box>
                  </Flex>
                </TD>
                <TD textAlign="left" display={{ base: 'none', lg: 'table-cell' }}>
                  <StageChip stage={m.stage} />
                </TD>
                <TD color="var(--white)">
                  {formatPrice(m.priceUsd)}
                  <Box display={{ base: 'block', sm: 'none' }} mt="2px">
                    <Change value={m.change.h24} fontSize="12px" />
                  </Box>
                </TD>
                <TD display={{ base: 'none', sm: 'table-cell' }}>
                  <Change value={m.change.h24} />
                </TD>
                <TD display={{ base: 'none', md: 'table-cell' }} color="var(--white-80)">
                  {formatUsd(m.volume24h)}
                </TD>
                <TD display={{ base: 'none', md: 'table-cell' }} color="var(--white-80)">
                  {onCurve ? 'On curve' : formatUsd(m.liquidityUsd)}
                </TD>
                <TD display={{ base: 'none', lg: 'table-cell' }} color={lev ? 'var(--white)' : 'var(--muted)'}>
                  {lev ? `${lev}x` : 'View only'}
                </TD>
                <TD display={{ base: 'none', sm: 'table-cell' }} onClick={(e) => e.stopPropagation()}>
                  <Flex gap="6px" justify="flex-end">
                    <PillOutline to={`${href}?side=long`}>Long</PillOutline>
                    <PillOutline to={`${href}?side=short`} tone="rug">
                      Short
                    </PillOutline>
                  </Flex>
                </TD>
              </chakra.tr>
            )
          })}
        </tbody>
      </chakra.table>
    </Box>
  )
}
