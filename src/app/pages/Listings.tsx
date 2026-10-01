import { Box, Flex, Text, chakra } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { zeroAddress } from 'viem'
import { useSeo } from '@/lib/seo'
import { explorerAddress, explorerTx } from '@/app/config'
import { useLaunchFeed, useQuotes } from '@/app/hooks/useLaunches'
import { formatNumber, formatPrice, formatUsd, shortAddress, timeAgo } from '@/app/lib/format'
import { EmptyState, PageHeader, Panel, PillOutline, Skeleton, Stat, StageChip, Tabs, TokenAvatar } from '@/app/components/ui'

type View = 'launches' | 'graduations'
const HOUR = 3_600_000

/** Re-render every few seconds so "12s ago" stays true. */
function useNow(ms = 5_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}

export default function Listings() {
  useSeo({
    title: 'Listings',
    description: 'Live feed of new PONS token launches and graduations on Robinhood Chain, each with a Ponsia Perps perp market.',
    path: '/app/listings',
  })
  const [view, setView] = useState<View>('launches')
  const feed = useLaunchFeed()
  const now = useNow()
  const navigate = useNavigate()
  const visible = feed.rows.slice(0, 60)
  const quotes = useQuotes(visible.map((r) => r.token))

  const lastHour = feed.rows.filter((r) => r.at && now - r.at < HOUR).length
  const gradsHour = feed.graduations.filter((g) => g.at && now - g.at < HOUR).length

  return (
    <>
      <PageHeader
        title="Listings"
        sub="Every token launched through Pons gets a market here the block it lands. Read live from the Pons factory on Robinhood Chain."
        right={
          <Flex align="center" gap="8px" fontSize="12px" color="var(--muted)" className="tabular">
            <Box w="8px" h="8px" borderRadius="50%" bg={feed.status === 'live' ? 'var(--accent)' : feed.status === 'error' ? 'var(--rug)' : 'var(--muted)'} className={feed.status === 'live' ? 'live-dot' : undefined} />
            {feed.status === 'live' ? `Live · block ${formatNumber(Number(feed.head))}` : feed.status === 'error' ? 'RPC unavailable, retrying' : 'Reading the last hour of blocks…'}
          </Flex>
        }
      />

      <Panel p={{ base: '20px', md: '28px 32px' }} mb="24px">
        <Flex gap={{ base: '20px', md: '48px' }} wrap="wrap">
          <Stat label="Launches, last hour" value={feed.status === 'loading' ? '…' : formatNumber(lastHour)} />
          <Stat label="Graduations, last hour" value={feed.status === 'loading' ? '…' : formatNumber(gradsHour)} sub="Curve filled, moved to a DEX pool" />
          <Stat label="Newest launch" value={feed.rows[0]?.at ? timeAgo(feed.rows[0].at, now) : '…'} />
        </Flex>
      </Panel>

      <Flex mb="14px">
        <Tabs
          label="Feed"
          value={view}
          onChange={setView}
          options={[
            { value: 'launches', label: 'New launches' },
            { value: 'graduations', label: 'Graduations' },
          ]}
        />
      </Flex>

      <Panel overflow="hidden">
        {feed.status === 'loading' ? (
          <Box p="20px" display="grid" gap="14px">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} h="22px" />
            ))}
          </Box>
        ) : feed.status === 'error' && !feed.rows.length ? (
          <EmptyState title="Can't read the chain right now">The public Robinhood Chain RPC did not answer. The feed keeps retrying every few seconds.</EmptyState>
        ) : view === 'launches' ? (
          visible.length === 0 ? (
            <EmptyState title="No launches in the last hour">New Pons launches appear here as soon as their block lands.</EmptyState>
          ) : (
            <Box overflowX="auto">
              <chakra.table w="100%" style={{ borderCollapse: 'collapse' }} className="tabular">
                <thead>
                  <tr>
                    {['Token', 'Stage', 'Price', 'Liquidity', 'Deployer', 'Launched', ''].map((h, i) => (
                      <chakra.th
                        key={h || 'actions'}
                        textAlign={i === 0 || i === 1 ? 'left' : 'right'}
                        fontWeight={400}
                        fontSize="12px"
                        color="var(--muted)"
                        px="14px"
                        py="12px"
                        borderBottom="0.8px solid var(--line)"
                        display={h === 'Deployer' || h === 'Liquidity' ? { base: 'none', md: 'table-cell' } : h === 'Stage' ? { base: 'none', sm: 'table-cell' } : undefined}
                      >
                        {h || <span className="sr-only">Actions</span>}
                      </chakra.th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => {
                    const q = quotes.data?.get(r.token.toLowerCase())
                    const symbol = r.meta?.symbol ?? '…'
                    const href = `/app/markets/${r.token}`
                    return (
                      <chakra.tr key={r.tx + r.logIndex} cursor="pointer" _hover={{ bg: 'rgba(255,255,255,0.025)' }} onClick={() => navigate(href)}>
                        <chakra.td px="14px" py="10px" borderBottom="0.8px solid var(--line)">
                          <Flex align="center" gap="10px">
                            <TokenAvatar src={q?.image} symbol={symbol} />
                            <Box minW="0">
                              <Text m="0" fontSize="15px" color="var(--white)">
                                {symbol}
                              </Text>
                              <Text m="0" fontSize="12px" color="var(--muted)" maxW="180px" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                                {r.meta?.name ?? shortAddress(r.token)} · {r.pairToken === zeroAddress ? 'ETH pair' : 'Stable pair'}
                              </Text>
                            </Box>
                          </Flex>
                        </chakra.td>
                        <chakra.td px="14px" borderBottom="0.8px solid var(--line)" display={{ base: 'none', sm: 'table-cell' }}>
                          <StageChip stage={r.graduated ? 'graduated' : 'curve'} />
                        </chakra.td>
                        <chakra.td px="14px" textAlign="right" borderBottom="0.8px solid var(--line)" color="var(--white)" fontSize="14px">
                          {q ? formatPrice(q.priceUsd) : '–'}
                        </chakra.td>
                        <chakra.td px="14px" textAlign="right" borderBottom="0.8px solid var(--line)" color="var(--white-80)" fontSize="14px" display={{ base: 'none', md: 'table-cell' }}>
                          {q ? formatUsd(q.liquidityUsd) : r.graduated ? '–' : 'On curve'}
                        </chakra.td>
                        <chakra.td px="14px" textAlign="right" borderBottom="0.8px solid var(--line)" fontSize="13px" display={{ base: 'none', md: 'table-cell' }}>
                          <chakra.a href={explorerAddress(r.deployer)} target="_blank" rel="noopener noreferrer" color="var(--white-80)" onClick={(e) => e.stopPropagation()}>
                            {shortAddress(r.deployer)}
                          </chakra.a>
                        </chakra.td>
                        <chakra.td px="14px" textAlign="right" borderBottom="0.8px solid var(--line)" fontSize="13px">
                          <chakra.a href={explorerTx(r.tx)} target="_blank" rel="noopener noreferrer" color="var(--muted)" onClick={(e) => e.stopPropagation()}>
                            {timeAgo(r.at, now)}
                          </chakra.a>
                        </chakra.td>
                        <chakra.td px="14px" textAlign="right" borderBottom="0.8px solid var(--line)" onClick={(e) => e.stopPropagation()}>
                          <PillOutline to={href}>Trade</PillOutline>
                        </chakra.td>
                      </chakra.tr>
                    )
                  })}
                </tbody>
              </chakra.table>
            </Box>
          )
        ) : feed.graduations.length === 0 ? (
          <EmptyState title="No graduations in the last hour">When a curve fills, its token moves to a DEX pool and shows up here.</EmptyState>
        ) : (
          <Box>
            {feed.graduations.slice(0, 60).map((g) => (
              <Flex key={g.tx + g.logIndex} align="center" justify="space-between" gap="12px" px="20px" py="12px" borderBottom="0.8px solid var(--line)" fontSize="14px" className="tabular">
                <Flex align="center" gap="10px" minW="0">
                  <StageChip stage="graduated" />
                  <chakra.a href={explorerAddress(g.token)} target="_blank" rel="noopener noreferrer" color="var(--white)">
                    {shortAddress(g.token)}
                  </chakra.a>
                </Flex>
                <Flex align="center" gap="12px">
                  <chakra.a href={explorerTx(g.tx)} target="_blank" rel="noopener noreferrer" color="var(--muted)" fontSize="13px">
                    {timeAgo(g.at, now)}
                  </chakra.a>
                  <PillOutline to={`/app/markets/${g.token}`}>Trade</PillOutline>
                </Flex>
              </Flex>
            ))}
          </Box>
        )}
      </Panel>
    </>
  )
}
