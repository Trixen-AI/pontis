import { Box, Flex, Grid, Text, chakra } from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import { useParams, useSearchParams } from 'react-router'
import { explorerAddress, explorerToken, explorerTx, isSolanaAddress } from '@/app/config'
import { PriceChart } from '@/app/components/PriceChart'
import { Trade } from '@/app/components/Trade'
import { Change, EmptyState, Panel, PanelHeader, PillOutline, PillSolid, Skeleton, Stat, StageChip, TokenAvatar } from '@/app/components/ui'
import { useMarket, useTrades } from '@/app/hooks/useMarketData'
import { useMarketParams, type MarketRisk } from '@/app/hooks/usePerps'
import { useSolUsd, useWalletState } from '@/app/hooks/useWallet'
import { formatNumber, formatPrice, formatUsd, shortAddress, timeAgo } from '@/app/lib/format'
import { positionPnl } from '@/app/lib/perps/math'
import type { Side } from '@/app/lib/perps/math'
import { useSignedOrders } from '@/app/lib/perps/order'
import { getTokenBalance } from '@/app/lib/solana'
import { useSeo } from '@/lib/seo'

export default function MarketPage() {
  const { token } = useParams()
  if (!token || !isSolanaAddress(token))
    return (
      <EmptyState title="That is not a token address" action={<PillSolid to="/app/markets">Back to markets</PillSolid>}>
        Market pages live at /app/markets/ followed by a Solana token mint address.
      </EmptyState>
    )
  return <MarketView key={token} token={token} />
}

function MarketView({ token }: { token: string }) {
  const [params] = useSearchParams()
  const side: Side = params.get('side') === 'short' ? 'short' : 'long'
  const hedge = Number(params.get('hedge'))
  const { verify, pools, quote, primary, priceUsd } = useMarket(token)
  const { data: solUsd } = useSolUsd()
  const seoSymbol = primary?.symbol ?? quote.data?.symbol
  useSeo({
    title: seoSymbol ? `${seoSymbol}-PERP` : 'Market',
    description: seoSymbol ? `Long or short ${seoSymbol} on FunPerps: live price, chart and order ticket for the ${seoSymbol} perp on Solana.` : undefined,
    path: `/app/markets/${token}`,
  })

  if (verify.isPending)
    return (
      <Box display="grid" gap="16px">
        <Skeleton h="56px" w="320px" />
        <Skeleton h="420px" />
      </Box>
    )
  if (verify.isError) return <EmptyState title="Could not reach Solana">The RPC did not answer. The page will retry shortly.</EmptyState>
  if (!verify.data)
    return (
      <EmptyState
        title="Not a Pump.fun token"
        action={
          <Flex gap="10px" justify="center" wrap="wrap">
            <PillSolid to="/app/markets">Browse Pump.fun markets</PillSolid>
            <PillOutline onClick={() => window.open(explorerToken(token), '_blank', 'noopener')}>View on Solscan</PillOutline>
          </Flex>
        }
      >
        {shortAddress(token)} has no Pump.fun bonding curve on Solana, so FunPerps does not list a perp for it.
      </EmptyState>
    )

  const curve = verify.data
  const onCurve = !curve.complete
  const symbol = primary?.symbol ?? quote.data?.symbol ?? shortAddress(token)
  const name = primary?.name ?? quote.data?.name ?? 'Pump.fun token'
  const image = primary?.image ?? quote.data?.image
  const liquidity = quote.data?.liquidityUsd || primary?.liquidityUsd
  const change24 = primary?.change.h24 ?? quote.data?.change24h
  const volume24 = primary?.volume24h ?? quote.data?.volume24h
  // on the curve, fall back to the curve's own price when no pool has traded yet
  const price = priceUsd ?? (onCurve && solUsd ? curve.priceSol * solUsd : undefined)
  const risk: MarketRisk = { liquidityUsd: liquidity, volume24h: volume24, onCurve }

  return (
    <>
      <Flex justify="space-between" align={{ base: 'flex-start', md: 'flex-end' }} direction={{ base: 'column', md: 'row' }} gap="16px" mb="20px">
        <Flex align="center" gap="14px" minW="0">
          <TokenAvatar src={image} symbol={symbol} size={48} />
          <Box minW="0">
            <Flex align="center" gap="10px" wrap="wrap">
              <Text as="h1" m="0" fontFamily="var(--font-serif)" fontWeight={300} fontSize={{ base: '36px', md: '48px' }} lineHeight="1" color="var(--white)">
                {symbol}-PERP
              </Text>
              <StageChip stage={onCurve ? 'curve' : 'graduated'} />
            </Flex>
            <Text m="0" mt="6px" fontSize="13px" color="var(--muted)">
              {name} ·{' '}
              <chakra.a href={explorerToken(token)} target="_blank" rel="noopener noreferrer" color="var(--white-80)" className="tabular">
                {shortAddress(token)}
              </chakra.a>
            </Text>
          </Box>
        </Flex>
        <Box textAlign={{ base: 'left', md: 'right' }}>
          <Text m="0" fontSize={{ base: '32px', md: '40px' }} lineHeight="1" color="var(--white)" className="tabular">
            {formatPrice(price)}
          </Text>
          <Box mt="6px">
            <Change value={change24} fontSize="15px" /> <chakra.span fontSize="13px" color="var(--muted)">24h</chakra.span>
          </Box>
        </Box>
      </Flex>

      <Panel p={{ base: '18px', md: '20px 28px' }} mb="20px">
        <Grid templateColumns={{ base: 'repeat(2, minmax(0, 1fr))', md: 'repeat(5, minmax(0, 1fr))' }} gap="18px">
          <Stat label="Volume 24h" value={formatUsd(volume24)} />
          <Stat label="Liquidity" value={onCurve ? 'On curve' : formatUsd(liquidity)} sub={primary && !onCurve ? primary.poolName : undefined} />
          <Stat label="Market cap" value={formatUsd(primary?.fdvUsd ?? quote.data?.fdvUsd)} />
          <Stat label={onCurve ? 'Curve progress' : 'Curve'} value={onCurve ? `${(curve.progress * 100).toFixed(1)}%` : 'Graduated'} sub={onCurve ? 'Read on-chain' : 'Trading on PumpSwap'} />
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
              <EmptyState title="No priced pool yet">This token has no indexed pool with trades yet. The chart lights up once it trades.</EmptyState>
            ) : (
              <PriceChart pool={primary?.pool} symbol={symbol} />
            )}
          </Panel>
          <YourMarket token={token} symbol={symbol} priceUsd={price} solUsd={solUsd} />
          <RecentTrades pool={primary?.pool} symbol={symbol} />
        </Box>

        <Box position={{ base: 'static', lg: 'sticky' }} top="100px" minW="0">
          <Panel p="20px">
            <Trade.Provider key={`${side}-${hedge || 0}`} market={{ token, symbol, priceUsd: price, risk }} solUsd={solUsd} initialSide={side} hedgeUsd={hedge > 0 ? hedge : undefined}>
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

function MarketRules({ risk, token }: { risk: MarketRisk; token: string }) {
  const p = useMarketParams(token, risk)
  return (
    <Box mt="14px" px="4px">
      <Text m="0" fontSize="12px" lineHeight="18px" color="var(--muted)">
        Isolated margin in SOL. Maintenance margin {(p.maintenanceMarginBps / 100).toFixed(1)}%, open fee {(p.tradingFeeBps / 100).toFixed(2)}%.{' '}
        {risk.onCurve
          ? 'This token is still on its bonding curve: up to 2x once it does $25k of daily volume, more after it graduates.'
          : 'Leverage caps follow pool depth: 3x from $10k, 5x from $50k, 10x from $250k.'}
      </Text>
    </Box>
  )
}

/** The connected wallet's exposure to this token: spot balance and its approved orders. */
function YourMarket({ token, symbol, priceUsd, solUsd }: { token: string; symbol: string; priceUsd: number | undefined; solUsd: number | undefined }) {
  const { address, isConnected } = useWalletState()
  const bal = useQuery({ queryKey: ['token-balance', address, token], queryFn: () => getTokenBalance(address!, token), enabled: !!address, refetchInterval: 20_000 })
  const orders = useSignedOrders(address).filter((o) => o.market === token)
  if (!isConnected) return null

  const amount = bal.data
  const value = amount != null && priceUsd ? amount * priceUsd : undefined

  return (
    <Panel>
      <PanelHeader title={`Your ${symbol}`} />
      <Flex p="18px 20px" gap="24px" wrap="wrap" align="center" justify="space-between">
        <Flex gap="32px" wrap="wrap">
          <Stat label="Spot balance" value={amount != null ? `${formatNumber(amount, true)} ${symbol}` : '…'} sub={value != null ? formatUsd(value, false) : undefined} />
          <Stat label="Approved orders" value={String(orders.length)} />
        </Flex>
        {value && value > 1 ? (
          <PillOutline to={`/app/markets/${token}?side=short&hedge=${value.toFixed(2)}`} tone="short">
            Hedge spot with a short
          </PillOutline>
        ) : null}
      </Flex>
      {orders.length > 0 && solUsd && priceUsd ? (
        <Box px="20px" pb="18px" display="grid" gap="8px">
          {orders.map((o) => {
            const pnl = positionPnl({ isLong: o.isLong, sizeSol: o.sizeSol, entryPrice: o.entryPrice }, priceUsd)
            return (
              <Flex key={o.id} justify="space-between" gap="10px" wrap="wrap" fontSize="13px" className="tabular">
                <chakra.span color={o.isLong ? 'var(--long)' : 'var(--short)'}>
                  {o.isLong ? 'Long' : 'Short'} {o.leverage}x
                </chakra.span>
                <span>
                  {formatUsd(o.sizeSol * solUsd, false)} at {formatPrice(o.entryPrice)}
                </span>
                <chakra.span color={pnl >= 0 ? 'var(--long)' : 'var(--short)'}>{formatUsd(pnl * solUsd, false)}</chakra.span>
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
                  <chakra.th
                    key={h}
                    textAlign={i === 0 ? 'left' : 'right'}
                    fontWeight={400}
                    fontSize="12px"
                    color="var(--muted)"
                    px={{ base: '10px', md: '16px' }}
                    py="8px"
                    whiteSpace="nowrap"
                    display={h === 'Wallet' || h === 'Amount' ? { base: 'none', md: 'table-cell' } : undefined}
                  >
                    {h}
                  </chakra.th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((t) => (
                <tr key={t.hash + t.at}>
                  <chakra.td px={{ base: '10px', md: '16px' }} py="6px" color={t.kind === 'buy' ? 'var(--long)' : 'var(--short)'}>
                    {t.kind === 'buy' ? 'Buy' : 'Sell'}
                  </chakra.td>
                  <chakra.td px={{ base: '10px', md: '16px' }} textAlign="right">
                    {formatPrice(t.priceUsd)}
                  </chakra.td>
                  <chakra.td px={{ base: '10px', md: '16px' }} textAlign="right" color="var(--white-80)" whiteSpace="nowrap" display={{ base: 'none', md: 'table-cell' }}>
                    {formatNumber(t.tokenAmount, true)} {symbol}
                  </chakra.td>
                  <chakra.td px={{ base: '10px', md: '16px' }} textAlign="right">
                    {formatUsd(t.usd, false)}
                  </chakra.td>
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
