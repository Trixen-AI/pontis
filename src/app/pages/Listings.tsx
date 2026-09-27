import { Box, Flex, Text, chakra } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { explorerToken } from '@/app/config'
import { EmptyState, PageHeader, Panel, PillOutline, Skeleton, Stat, StageChip, Tabs, TokenAvatar } from '@/app/components/ui'
import { type LaunchRow, useLaunchFeed } from '@/app/hooks/useLaunches'
import { formatNumber, formatPrice, formatUsd, shortAddress, timeAgo } from '@/app/lib/format'
import { useSeo } from '@/lib/seo'

type View = 'launches' | 'graduations'

/** Re-render every few seconds so "12s ago" stays true. */
function useNow(ms = 5_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}

/** Launches per minute, from the spread of creation times in the rows we hold. */
function launchRate(rows: LaunchRow[]): number | undefined {
  const times = rows.map((r) => r.createdAt).filter((t): t is number => !!t)
  if (times.length < 5) return undefined
  const span = (Math.max(...times) - Math.min(...times)) / 60_000
  return span > 0 ? (times.length - 1) / span : undefined
}

export default function Listings() {
  useSeo({
    title: 'Listings',
    description: 'Live feed of new Pump.fun launches and graduations on Solana, each with a FunPerps market.',
    path: '/app/listings',
  })
  const [view, setView] = useState<View>('launches')
  const feed = useLaunchFeed()
  const now = useNow()
  const navigate = useNavigate()
  const rows = view === 'launches' ? feed.launches : feed.graduations
  const rate = launchRate(feed.launches)

  return (
    <>
      <PageHeader
        title="Listings"
        sub="Every token launched on Pump.fun gets a market here as soon as it trades. Each one is checked against its bonding curve on Solana."
        right={
          <Flex align="center" gap="8px" fontSize="12px" color="var(--muted)" className="tabular">
            <Box w="8px" h="8px" borderRadius="50%" bg={feed.status === 'live' ? 'var(--long)' : feed.status === 'error' ? 'var(--short)' : 'var(--muted)'} className={feed.status === 'live' ? 'live-dot' : undefined} />
            {feed.status === 'live' ? `Live · updated ${timeAgo(feed.updatedAt, now)}` : feed.status === 'error' ? 'Data source unavailable, retrying' : 'Reading the newest launches…'}
          </Flex>
        }
      />

      <Panel p={{ base: '20px', md: '28px 32px' }} mb="24px">
        <Flex gap={{ base: '20px', md: '48px' }} wrap="wrap">
          <Stat label="Newest launch" value={feed.launches[0]?.createdAt ? timeAgo(feed.launches[0].createdAt, now) : '…'} />
          <Stat label="Launch pace" value={rate ? `${rate.toFixed(1)} / min` : '…'} sub="Across the launches in view" />
          <Stat label="Graduations seen" value={feed.status === 'loading' ? '…' : formatNumber(feed.graduations.length)} sub="Curve completed, now on PumpSwap" />
        </Flex>
      </Panel>

      <Flex mb="14px">
        <Tabs
          label="Feed"
          value={view}
          onChange={setView}
          options={[
            { value: 'launches', label: 'New launches', short: 'Launches' },
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
        ) : feed.status === 'error' && !rows.length ? (
          <EmptyState title="Can't read the feed right now">The launch data source did not answer. The feed keeps retrying every 30 seconds.</EmptyState>
        ) : rows.length === 0 ? (
          <EmptyState title={view === 'launches' ? 'No launches yet' : 'No graduations yet'}>
            {view === 'launches' ? 'New Pump.fun launches appear here as soon as they trade.' : 'When a curve completes, its token moves to PumpSwap and shows up here.'}
          </EmptyState>
        ) : (
          <Box overflowX="auto">
            <chakra.table w="100%" style={{ borderCollapse: 'collapse' }} className="tabular">
              <thead>
                <tr>
                  {['Token', 'Stage', 'Price', 'Market cap', view === 'launches' ? 'Curve' : 'Liquidity', view === 'launches' ? 'Launched' : 'Pool opened', ''].map((h, i) => (
                    <chakra.th
                      key={h || 'actions'}
                      textAlign={i === 0 || i === 1 ? 'left' : 'right'}
                      fontWeight={400}
                      fontSize="12px"
                      color="var(--muted)"
                      px={{ base: '10px', md: '14px' }}
                      py="12px"
                      whiteSpace="nowrap"
                      borderBottom="0.8px solid var(--line)"
                      display={i === 3 || i === 4 ? { base: 'none', md: 'table-cell' } : i === 1 || i === 6 ? { base: 'none', sm: 'table-cell' } : undefined}
                    >
                      {h || <span className="sr-only">Actions</span>}
                    </chakra.th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 80).map((r) => {
                  const href = `/app/markets/${r.token}`
                  return (
                    <chakra.tr key={r.pool} cursor="pointer" _hover={{ bg: 'rgba(255,255,255,0.03)' }} onClick={() => navigate(href)}>
                      <chakra.td px={{ base: '10px', md: '14px' }} py="10px" borderBottom="0.8px solid var(--line)">
                        <Flex align="center" gap="10px" minW="0">
                          <TokenAvatar src={r.image} symbol={r.symbol} />
                          <Box minW="0">
                            <Text m="0" fontSize="15px" color="var(--white)" maxW={{ base: '120px', md: '200px' }} overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                              {r.symbol}
                            </Text>
                            <chakra.a
                              href={explorerToken(r.token)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              fontSize="12px"
                              color="var(--muted)"
                            >
                              {shortAddress(r.token)}
                            </chakra.a>
                          </Box>
                        </Flex>
                      </chakra.td>
                      <chakra.td px={{ base: '10px', md: '14px' }} borderBottom="0.8px solid var(--line)" display={{ base: 'none', sm: 'table-cell' }}>
                        <StageChip stage={view === 'launches' ? 'curve' : 'graduated'} />
                      </chakra.td>
                      <chakra.td px={{ base: '10px', md: '14px' }} textAlign="right" borderBottom="0.8px solid var(--line)" color="var(--white)" fontSize="14px" whiteSpace="nowrap">
                        {formatPrice(r.priceUsd)}
                      </chakra.td>
                      <chakra.td px={{ base: '10px', md: '14px' }} textAlign="right" borderBottom="0.8px solid var(--line)" color="var(--white-80)" fontSize="14px" display={{ base: 'none', md: 'table-cell' }}>
                        {formatUsd(r.fdvUsd)}
                      </chakra.td>
                      <chakra.td px={{ base: '10px', md: '14px' }} textAlign="right" borderBottom="0.8px solid var(--line)" color="var(--white-80)" fontSize="14px" display={{ base: 'none', md: 'table-cell' }}>
                        {view === 'launches' ? (r.progress != null ? `${(r.progress * 100).toFixed(1)}%` : '–') : formatUsd(r.liquidityUsd)}
                      </chakra.td>
                      <chakra.td px={{ base: '10px', md: '14px' }} textAlign="right" borderBottom="0.8px solid var(--line)" fontSize="13px" color="var(--muted)" whiteSpace="nowrap">
                        {timeAgo(r.createdAt, now)}
                      </chakra.td>
                      <chakra.td px={{ base: '10px', md: '14px' }} textAlign="right" borderBottom="0.8px solid var(--line)" onClick={(e) => e.stopPropagation()} display={{ base: 'none', sm: 'table-cell' }}>
                        <PillOutline to={href}>Trade</PillOutline>
                      </chakra.td>
                    </chakra.tr>
                  )
                })}
              </tbody>
            </chakra.table>
          </Box>
        )}
      </Panel>
    </>
  )
}
