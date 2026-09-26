import { Box, Flex, Grid, Text, chakra } from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import { useSeo } from '@/lib/seo'
import { useParams, useSearchParams } from 'react-router'
import { type Address, erc20Abi, formatUnits, getAddress, isAddress } from 'viem'
import { useReadContract } from 'wagmi'
import { explorerAddress, explorerToken, explorerTx, robinhood } from '@/app/config'
import { useEthUsd, useMarket, useTrades } from '@/app/hooks/useMarketData'
import { engineConfigured, useMarketParams, usePositions, type MarketRisk } from '@/app/hooks/usePerps'
import { useSignedOrders } from '@/app/lib/perps/order'
import { useWalletState } from '@/app/hooks/useWallet'
import { formatNumber, formatPrice, formatUsd, shortAddress, timeAgo } from '@/app/lib/format'
import { fromWad, positionPnlEth } from '@/app/lib/perps/math'
import { getTokenMeta } from '@/app/lib/pons'
import type { Side } from '@/app/lib/perps/math'
import { PriceChart } from '@/app/components/PriceChart'
import { Trade } from '@/app/components/Trade'
import { Change, EmptyState, Panel, PanelHeader, PillOutline, PillSolid, Skeleton, Stat, StageChip, TokenAvatar } from '@/app/components/ui'

export default function MarketPage() {
  const { token: raw } = useParams()
  if (!raw || !isAddress(raw))
    return (
      <EmptyState title="That is not a token address" action={<PillSolid to="/app/markets">Back to markets</PillSolid>}>
        Market pages live at /app/markets/ followed by a Robinhood Chain token address.
      </EmptyState>
    )
  return <MarketView key={raw.toLowerCase()} token={getAddress(raw)} />
}

function MarketView({ token }: { token: Address }) {
  const [params] = useSearchParams()
  const side: Side = params.get('side') === 'short' ? 'short' : 'long'
  const hedge = Number(params.get('hedge'))
  const { verify, pools, quote, stats, primary, priceUsd } = useMarket(token)
  const meta = useQuery({ queryKey: ['meta', token], queryFn: async () => (await getTokenMeta([token])).get(token.toLowerCase()), staleTime: Infinity })
  const { data: ethUsd } = useEthUsd()
  const seoSymbol = primary?.symbol ?? meta.data?.symbol ?? quote.data?.symbol
  useSeo({
    title: seoSymbol ? `${seoSymbol}-PERP` : 'Market',
    description: seoSymbol
      ? `Long or short ${seoSymbol} on Pontis: live price, chart and order ticket for the ${seoSymbol} perp on Robinhood Chain.`
      : undefined,
    path: `/app/markets/${token}`,
  })

  if (verify.isPending)
    return (
      <Box display="grid" gap="16px">
        <Skeleton h="56px" w="360px" />
        <Skeleton h="420px" />
      </Box>
    )
  if (verify.isError)
    return <EmptyState title="Could not reach Robinhood Chain">The RPC did not answer. The page will retry when you come back to it.</EmptyState>
  if (!verify.data?.isPons)
    return (
      <EmptyState
        title="Not a PONS token"
        action={
          <Flex gap="10px" justify="center" wrap="wrap">
            <PillSolid to="/app/markets">Browse PONS markets</PillSolid>
            <PillOutline onClick={() => window.open(explorerToken(token), '_blank', 'noopener')}>View on explorer</PillOutline>
          </Flex>
        }
      >
        {shortAddress(token)} was not launched through the Pons factories on Robinhood Chain, so Pontis does not list a perp for it.
      </EmptyState>
    )

  const info = verify.data
  const symbol = primary?.symbol ?? meta.data?.symbol ?? quote.data?.symbol ?? '…'
  const name = primary?.name ?? meta.data?.name ?? quote.data?.name ?? ''
  const image = primary?.image ?? quote.data?.image
  const liquidity = primary?.liquidityUsd ?? quote.data?.liquidityUsd
  const change24 = primary?.change.h24 ?? quote.data?.change24h
  const risk = { liquidityUsd: liquidity, volume24h: primary?.volume24h ?? quote.data?.volume24h, onCurve: info.phase === 'curve' }
  const stage = info.phase === 'curve' ? 'curve' : info.phase === 'graduating' ? 'graduating' : info.version === 'v1' ? 'legacy' : 'graduated'

  return (
    <>
      {/* header */}
      <Flex justify="space-between" align={{ base: 'flex-start', md: 'flex-end' }} direction={{ base: 'column', md: 'row' }} gap="16px" mb="20px">
        <Flex align="center" gap="14px">
          <TokenAvatar src={image} symbol={symbol} size={48} />
          <Box>
            <Flex align="center" gap="10px" wrap="wrap">
              <Text as="h1" m="0" fontFamily="var(--font-serif)" fontWeight={300} fontSize={{ base: '36px', md: '48px' }} lineHeight="1" color="var(--white)">
                {symbol}-PERP
              </Text>
              <StageChip stage={stage} />
            </Flex>
            <Text m="0" mt="6px" fontSize="13px" color="var(--muted)">
              {name} ·{' '}
              <chakra.a href={explorerToken(token)} target="_blank" rel="noopener noreferrer" color="var(--white-80)" className="tabular">
                {shortAddress(token)}
              </chakra.a>{' '}
              · deployed by{' '}
              <chakra.a href={explorerAddress(info.deployer)} target="_blank" rel="noopener noreferrer" color="var(--white-80)" className="tabular">
                {shortAddress(info.deployer)}
              </chakra.a>
            </Text>
          </Box>
        </Flex>
        <Box textAlign={{ base: 'left', md: 'right' }}>
          <Text m="0" fontSize={{ base: '32px', md: '40px' }} lineHeight="1" color="var(--white)" className="tabular">
            {formatPrice(priceUsd)}
          </Text>
          <Box mt="6px">
            <Change value={change24} fontSize="15px" /> <chakra.span fontSize="13px" color="var(--muted)">24h</chakra.span>
          </Box>
        </Box>
      </Flex>

      <Panel p={{ base: '18px', md: '20px 28px' }} mb="20px">
        <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' }} gap="18px">
          <Stat label="Volume 24h" value={formatUsd(primary?.volume24h ?? quote.data?.volume24h)} />
          <Stat label="Liquidity" value={formatUsd(liquidity)} sub={primary ? primary.poolName : undefined} />
          <Stat label="FDV" value={formatUsd(primary?.fdvUsd ?? quote.data?.fdvUsd)} />
          <Stat label="Holders" value={stats.data ? formatNumber(stats.data.holders) : '…'} />
          <Stat
            label="Trades 24h"
            value={primary ? formatNumber(primary.buys24h + primary.sells24h) : '–'}
            sub={primary ? `${formatNumber(primary.buys24h)} buys · ${formatNumber(primary.sells24h)} sells` : undefined}
          />
        </Grid>
      </Panel>

      <Grid templateColumns={{ base: 'minmax(0, 1fr)', lg: 'minmax(0, 1fr) 360px' }} gap="20px" alignItems="start">
        <Box display="grid" gap="20px" minW="0">
          <Panel overflow="hidden">
            {pools.isSuccess && !primary ? (
              <EmptyState title="No priced pool yet">
                This token has no indexed pool with trades yet. The chart and the ticket light up once it trades.
              </EmptyState>
            ) : (
              <PriceChart pool={primary?.pool} symbol={symbol} />
            )}
          </Panel>
          <YourMarket token={token} symbol={symbol} priceUsd={priceUsd} ethUsd={ethUsd} />
          <RecentTrades pool={primary?.pool} symbol={symbol} />
        </Box>

        <Box position={{ base: 'static', lg: 'sticky' }} top="100px" minW="0">
          <Panel p="20px">
            <Trade.Provider
              key={`${side}-${hedge || 0}`}
              market={{ token, symbol, priceUsd, risk }}
              ethUsd={ethUsd}
              initialSide={side}
              hedgeUsd={hedge > 0 ? hedge : undefined}
            >
              <Box display="grid" gridTemplateColumns="minmax(0, 1fr)" gap="18px">
                <Trade.SideToggle />
                <Trade.CollateralInput />
                <Trade.LeverageSlider />
                <Trade.Summary />
                <Trade.Submit />
              </Box>
            </Trade.Provider>
          </Panel>
          <MarketRules risk={risk} token={token} />
        </Box>
      </Grid>
    </>
  )
}

function MarketRules({ risk, token }: { risk: MarketRisk; token: Address }) {
  const p = useMarketParams(token, risk)
  return (
    <Box mt="14px" px="4px">
      <Text m="0" fontSize="12px" lineHeight="18px" color="var(--muted)">
        Isolated margin in ETH. Maintenance margin {(p.maintenanceMarginBps / 100).toFixed(1)}%, open fee {(p.tradingFeeBps / 100).toFixed(2)}%.{' '}
        {p.source === 'engine'
          ? 'Parameters read from the engine contract.'
          : risk.onCurve
            ? 'This token is still on its bonding curve: up to 2x once it does $25k of daily volume, more after it graduates.'
            : 'Leverage caps follow pool depth: 3x from $10k, 5x from $50k, 10x from $250k.'}
      </Text>
    </Box>
  )
}

/** The connected wallet's exposure to this token: spot balance and its perps (positions or approved orders). */
function YourMarket({ token, symbol, priceUsd, ethUsd }: { token: Address; symbol: string; priceUsd: number | undefined; ethUsd: number | undefined }) {
  const { address, isConnected } = useWalletState()
  const bal = useReadContract({ address: token, abi: erc20Abi, functionName: 'balanceOf', args: address ? [address] : undefined, chainId: robinhood.id, query: { enabled: !!address, refetchInterval: 20_000 } })
  const dec = useReadContract({ address: token, abi: erc20Abi, functionName: 'decimals', chainId: robinhood.id, query: { enabled: !!address, staleTime: Infinity } })
  const positions = usePositions(address)
  const orders = useSignedOrders(address)
  if (!isConnected) return null

  const amount = bal.data != null && dec.data != null ? Number(formatUnits(bal.data, dec.data)) : undefined
  const value = amount != null && priceUsd ? amount * priceUsd : undefined
  const isThis = (t: string) => t.toLowerCase() === token.toLowerCase()
  const rows = engineConfigured
    ? (positions.data ?? []).filter((p) => isThis(p.token)).map((p) => ({ key: String(p.id), isLong: p.isLong, sizeEth: Number(formatUnits(p.size, 18)), entry: fromWad(p.entryPrice), tag: `#${String(p.id)}` }))
    : orders.filter((o) => isThis(o.market)).map((o) => ({ key: o.id, isLong: o.isLong, sizeEth: o.sizeEth, entry: o.entryPrice, tag: `${o.leverage}x` }))

  return (
    <Panel>
      <PanelHeader title={`Your ${symbol}`} />
      <Flex p="18px 20px" gap="24px" wrap="wrap" align="center" justify="space-between">
        <Flex gap="32px" wrap="wrap">
          <Stat label="Spot balance" value={amount != null ? `${formatNumber(amount, true)} ${symbol}` : '…'} sub={value != null ? formatUsd(value, false) : undefined} />
          <Stat label={engineConfigured ? 'Open perps' : 'Approved orders'} value={String(rows.length)} />
        </Flex>
        {value && value > 1 ? (
          <PillOutline to={`/app/markets/${token}?side=short&hedge=${value.toFixed(2)}`} tone="rug">
            Hedge spot with a short
          </PillOutline>
        ) : null}
      </Flex>
      {rows.length > 0 && ethUsd && priceUsd ? (
        <Box px="20px" pb="18px" display="grid" gap="8px">
          {rows.map((r) => {
            const pnlEth = positionPnlEth({ isLong: r.isLong, sizeEth: r.sizeEth, entryPrice: r.entry }, priceUsd)
            return (
              <Flex key={r.key} justify="space-between" gap="10px" wrap="wrap" fontSize="13px" className="tabular">
                <chakra.span color={r.isLong ? 'var(--accent)' : 'var(--rug)'}>
                  {r.isLong ? 'Long' : 'Short'} {r.tag}
                </chakra.span>
                <span>
                  {formatUsd(r.sizeEth * ethUsd, false)} at {formatPrice(r.entry)}
                </span>
                <chakra.span color={pnlEth >= 0 ? 'var(--accent)' : 'var(--rug)'}>{formatUsd(pnlEth * ethUsd, false)}</chakra.span>
              </Flex>
            )
          })}
          <PillOutline to="/app/positions" tone="muted">
            Manage in Positions
          </PillOutline>
        </Box>
      ) : null}
    </Panel>
  )
}

function RecentTrades({ pool, symbol }: { pool: string | undefined; symbol: string }) {
  const { data, isPending, isError } = useTrades(pool)
  return (
    <Panel overflow="hidden">
      <PanelHeader title="Spot trades" right={<Text m="0" fontSize="12px" color="var(--muted)">The market the mark price comes from</Text>} />
      {!pool || isPending ? (
        <Box p="16px 20px" display="grid" gap="10px">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} h="18px" />
          ))}
        </Box>
      ) : isError || !data?.length ? (
        <Text m="0" p="18px 20px" fontSize="14px" color="var(--muted)">
          {isError ? 'Trades are unavailable right now.' : 'No trades yet.'}
        </Text>
      ) : (
        <Box maxH="340px" overflowY="auto">
          <chakra.table w="100%" style={{ borderCollapse: 'collapse' }} fontSize="13px" className="tabular">
            <thead>
              <tr>
                {['Side', 'Price', 'Amount', 'Value', 'Wallet', 'Time'].map((h, i) => (
                  <chakra.th key={h} textAlign={i === 0 ? 'left' : 'right'} fontWeight={400} fontSize="12px" color="var(--muted)" px={{ base: '10px', md: '16px' }} py="8px" display={h === 'Wallet' || h === 'Amount' ? { base: 'none', md: 'table-cell' } : undefined} whiteSpace="nowrap">
                    {h}
                  </chakra.th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((t) => (
                <tr key={t.hash + t.at}>
                  <chakra.td px={{ base: '10px', md: '16px' }} py="6px" color={t.kind === 'buy' ? 'var(--accent)' : 'var(--rug)'}>
                    {t.kind === 'buy' ? 'Buy' : 'Sell'}
                  </chakra.td>
                  <chakra.td px={{ base: '10px', md: '16px' }} textAlign="right">{formatPrice(t.priceUsd)}</chakra.td>
                  <chakra.td px={{ base: '10px', md: '16px' }} textAlign="right" color="var(--white-80)" whiteSpace="nowrap" display={{ base: 'none', md: 'table-cell' }}>
                    {formatNumber(t.tokenAmount, true)} {symbol}
                  </chakra.td>
                  <chakra.td px={{ base: '10px', md: '16px' }} textAlign="right">{formatUsd(t.usd, false)}</chakra.td>
                  <chakra.td px={{ base: '10px', md: '16px' }} textAlign="right" display={{ base: 'none', md: 'table-cell' }}>
                    <chakra.a href={explorerAddress(t.from)} target="_blank" rel="noopener noreferrer" color="var(--white-80)">
                      {shortAddress(t.from)}
                    </chakra.a>
                  </chakra.td>
                  <chakra.td px={{ base: '10px', md: '16px' }} textAlign="right">
                    <chakra.a href={explorerTx(t.hash)} target="_blank" rel="noopener noreferrer" color="var(--muted)">
                      {timeAgo(t.at)}
                    </chakra.a>
                  </chakra.td>
                </tr>
              ))}
            </tbody>
          </chakra.table>
        </Box>
      )}
    </Panel>
  )
}
