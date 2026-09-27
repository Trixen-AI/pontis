// Order ticket as a compound component: <Trade.Provider> owns the order state,
// the parts below read it through context and never know how it is stored.
import {
  Box,
  Flex,
  Modal,
  ModalBody,
  ModalContent,
  ModalOverlay,
  Slider,
  SliderFilledTrack,
  SliderMark,
  SliderThumb,
  SliderTrack,
  Text,
  chakra,
} from '@chakra-ui/react'
import { createContext, use, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { PROTOCOL } from '@/app/config'
import { useMarketParams, type MarketRisk } from '@/app/hooks/usePerps'
import { useMessageSigner, useSolBalance, useWalletState } from '@/app/hooks/useWallet'
import { formatNumber, formatPrice, formatSol, formatUsd } from '@/app/lib/format'
import { type OrderPreview, type Side, previewOrder } from '@/app/lib/perps/math'
import { type SignedOrder, newNonce, saveOrder, signOrder } from '@/app/lib/perps/order'
import { openWallet, walletReady } from '@/app/web3/appkit'

type Market = { token: string; symbol: string; priceUsd: number | undefined; risk: MarketRisk }

/** Approval of an order: a Solana message signature over the exact order text. */
type ApproveState =
  | { status: 'idle' }
  | { status: 'signing' }
  | { status: 'approved'; order: SignedOrder }
  | { status: 'failed'; message: string }

type Ctx = {
  state: { side: Side; collateral: string; leverage: number; reviewing: boolean }
  actions: {
    setSide: (s: Side) => void
    setCollateral: (v: string) => void
    setLeverage: (v: number) => void
    openReview: () => void
    closeReview: () => void
    approve: () => void
  }
  meta: {
    market: Market
    params: ReturnType<typeof useMarketParams>
    solUsd: number | undefined
    solBalance: number | undefined
    preview: OrderPreview | null
    hedgeUsd?: number
    approval: ApproveState
  }
}

const TradeCtx = createContext<Ctx | null>(null)
const useTrade = () => {
  const c = use(TradeCtx)
  if (!c) throw new Error('Trade parts must sit inside <Trade.Provider>')
  return c
}

const ORDER_TTL_S = 15 * 60
/** Keep a little SOL back for network fees when "Max" is used. */
const FEE_RESERVE_SOL = 0.01

type ProviderProps = {
  market: Market
  solUsd: number | undefined
  initialSide?: Side
  /** Pre-size the ticket to hedge a spot holding worth this many USD. */
  hedgeUsd?: number
  children: ReactNode
}

export function TradeProvider({ market, solUsd, initialSide = 'long', hedgeUsd, children }: ProviderProps) {
  const params = useMarketParams(market.token, market.risk)
  const { address } = useWalletState()
  const { sol: solBalance } = useSolBalance(address)
  const sign = useMessageSigner()

  const cap = Math.max(1, params.maxLeverage || 1)
  const [side, setSide] = useState<Side>(initialSide)
  // Only explicit choices are stored. Defaults are derived at render time, because the market's
  // cap and the SOL price usually arrive a moment after the ticket mounts.
  const [pickedLeverage, setLeverageRaw] = useState<number | null>(null)
  const [typedCollateral, setCollateral] = useState<string | null>(null)
  const [reviewing, setReviewing] = useState(false)
  const [approval, setApproval] = useState<ApproveState>({ status: 'idle' })

  const lev = Math.min(pickedLeverage ?? (hedgeUsd ? 2 : 3), cap)
  const hedgeCollateral = hedgeUsd && solUsd ? (hedgeUsd / lev / solUsd).toFixed(4) : ''
  const collateral = typedCollateral ?? hedgeCollateral
  const collateralSol = Number(collateral)
  const preview =
    collateralSol > 0 && market.priceUsd && solUsd
      ? previewOrder({
          side,
          collateralSol,
          leverage: lev,
          priceUsd: market.priceUsd,
          solUsd,
          feeBps: params.tradingFeeBps,
          maintenanceMarginBps: params.maintenanceMarginBps,
          slippageBps: PROTOCOL.slippageBps,
        })
      : null

  const approve = async () => {
    if (!preview || !address || !market.priceUsd || !sign) return
    setApproval({ status: 'signing' })
    try {
      const order = await signOrder(
        {
          trader: address,
          market: market.token,
          symbol: market.symbol,
          isLong: side === 'long',
          leverage: lev,
          collateralSol,
          sizeSol: preview.sizeSol,
          sizeUsd: preview.sizeUsd,
          tokenAmount: preview.tokenAmount,
          entryPrice: market.priceUsd,
          liquidationPrice: preview.liquidationPrice,
          acceptablePrice: preview.acceptablePrice,
          feeSol: preview.feeSol,
          nonce: newNonce(),
          deadline: Math.floor(Date.now() / 1000) + ORDER_TTL_S,
        },
        sign,
      )
      saveOrder(order)
      setApproval({ status: 'approved', order })
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e)
      setApproval({ status: 'failed', message: /reject|denied|cancel|declin/i.test(raw) ? 'You rejected the request in your wallet.' : raw })
    }
  }

  const value: Ctx = {
    state: { side, collateral, leverage: lev, reviewing },
    actions: {
      setSide,
      setCollateral,
      setLeverage: setLeverageRaw,
      openReview: () => {
        setApproval({ status: 'idle' })
        setReviewing(true)
      },
      closeReview: () => setReviewing(false),
      approve: () => void approve(),
    },
    meta: { market, params, solUsd, solBalance, preview, hedgeUsd, approval },
  }
  return <TradeCtx value={value}>{children}</TradeCtx>
}

const sideColors = (side: Side) => (side === 'short' ? { bg: 'var(--short)', color: 'var(--short-ink)' } : { bg: 'var(--long)', color: 'var(--long-ink)' })

export function TradeSideToggle() {
  const { state, actions } = useTrade()
  return (
    <Flex role="tablist" aria-label="Side" p="4px" gap="4px" border="0.8px solid var(--line)" borderRadius="60px" minW="0">
      {(['long', 'short'] as const).map((s) => {
        const active = state.side === s
        const c = sideColors(s)
        return (
          <chakra.button
            key={s}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => actions.setSide(s)}
            flex="1 1 0"
            minW="0"
            h="38px"
            borderRadius="60px"
            border="none"
            cursor="pointer"
            fontSize="15px"
            bg={active ? c.bg : 'transparent'}
            color={active ? c.color : 'var(--white-80)'}
            transition="background 0.2s, color 0.2s"
          >
            {s === 'long' ? 'Long' : 'Short'}
          </chakra.button>
        )
      })}
    </Flex>
  )
}

export function TradeCollateral() {
  const { state, actions, meta } = useTrade()
  const usd = Number(state.collateral) > 0 && meta.solUsd ? Number(state.collateral) * meta.solUsd : undefined
  return (
    <Box minW="0">
      <Flex justify="space-between" align="baseline" gap="8px" mb="6px">
        <chakra.label htmlFor="collateral" fontSize="13px" color="var(--accent)" flexShrink={0}>
          Collateral
        </chakra.label>
        <chakra.button
          type="button"
          onClick={() => meta.solBalance && actions.setCollateral(Math.max(0, meta.solBalance - FEE_RESERVE_SOL).toFixed(4))}
          disabled={!meta.solBalance}
          bg="transparent"
          border="none"
          p="0"
          fontSize="12px"
          color="var(--muted)"
          cursor={meta.solBalance ? 'pointer' : 'default'}
          className="tabular"
          minW="0"
          overflow="hidden"
          textOverflow="ellipsis"
          whiteSpace="nowrap"
        >
          Wallet {formatSol(meta.solBalance)} {meta.solBalance ? '· Max' : ''}
        </chakra.button>
      </Flex>
      <Flex align="center" gap="10px" h="48px" px="14px" border="0.8px solid var(--line)" borderRadius="12px" bg="var(--ink)" _focusWithin={{ borderColor: 'var(--accent)' }}>
        <chakra.input
          id="collateral"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0.00"
          value={state.collateral}
          onChange={(e) => {
            const v = e.target.value.replace(',', '.')
            if (/^\d*\.?\d{0,9}$/.test(v)) actions.setCollateral(v)
          }}
          flex="1"
          minW="0"
          w="0"
          bg="transparent"
          border="none"
          outline="none"
          color="var(--white)"
          fontSize="20px"
          className="tabular"
        />
        <Text m="0" fontSize="14px" color="var(--white-80)" flexShrink={0}>
          SOL
        </Text>
      </Flex>
      <Text m="0" mt="6px" fontSize="12px" color="var(--muted)" className="tabular">
        {usd ? `≈ ${formatUsd(usd, false)}` : 'Margin is posted in SOL on Solana.'}
      </Text>
    </Box>
  )
}

export function TradeLeverage() {
  const { state, actions, meta } = useTrade()
  const max = Math.max(1, meta.params.maxLeverage || 1)
  const marks = [1, Math.round(max / 2), max].filter((v, i, a) => a.indexOf(v) === i)
  return (
    <Box minW="0">
      <Flex justify="space-between" align="baseline" mb="10px">
        <Text as="span" m="0" fontSize="13px" color="var(--accent)" id="lev-label">
          Leverage
        </Text>
        <Text as="span" m="0" fontSize="18px" color="var(--white)" className="tabular">
          {state.leverage}x
        </Text>
      </Flex>
      <Box px="8px" pb="18px">
        <Slider aria-labelledby="lev-label" min={1} max={max} step={1} value={state.leverage} onChange={actions.setLeverage} isDisabled={max <= 1}>
          {marks.map((m) => (
            <SliderMark
              key={m}
              value={m}
              mt="12px"
              fontSize="11px"
              color="var(--muted)"
              // first label sits right of its tick, last sits left of it, so neither leaves the track
              transform={m === 1 ? 'none' : m === max ? 'translateX(-100%)' : 'translateX(-50%)'}
            >
              {m}x
            </SliderMark>
          ))}
          <SliderTrack bg="var(--line)" h="4px">
            <SliderFilledTrack bg={state.side === 'long' ? 'var(--long)' : 'var(--short)'} />
          </SliderTrack>
          <SliderThumb boxSize="16px" bg="var(--white)" />
        </Slider>
      </Box>
      <Text m="0" fontSize="12px" color="var(--muted)">
        Max {max}x on this market, set by {meta.market.risk.onCurve ? 'curve activity' : 'pool depth'}.
      </Text>
    </Box>
  )
}

function Row({ label, value, tone }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <Flex justify="space-between" align="baseline" gap="12px" fontSize="13px" lineHeight="22px" minW="0">
      <Text as="span" m="0" color="var(--muted)" flexShrink={0}>
        {label}
      </Text>
      <Text as="span" m="0" color={tone ?? 'var(--white)'} className="tabular" textAlign="right" minW="0" overflowWrap="anywhere">
        {value}
      </Text>
    </Flex>
  )
}

/** The order's numbers, shared by the ticket and the review sheet. */
function OrderRows() {
  const { meta } = useTrade()
  const p = meta.preview
  const warnLiq = p && p.liquidationDistance < 0.1
  return (
    <>
      <Row label="Entry (mark)" value={formatPrice(meta.market.priceUsd)} />
      <Row label="Position size" value={p ? `${formatUsd(p.sizeUsd, false)} · ${formatNumber(p.tokenAmount, true)} ${meta.market.symbol}` : '–'} />
      <Row
        label="Liquidation price"
        value={p ? `${formatPrice(p.liquidationPrice)} (${(p.liquidationDistance * 100).toFixed(1)}% away)` : '–'}
        tone={warnLiq ? 'var(--short)' : undefined}
      />
      <Row label={`Open fee (${(meta.params.tradingFeeBps / 100).toFixed(2)}%)`} value={p ? formatSol(p.feeSol, 6) : '–'} />
      <Row label={`Price protection (${PROTOCOL.slippageBps / 100}%)`} value={p ? formatPrice(p.acceptablePrice) : '–'} />
    </>
  )
}

export function TradeSummary() {
  const { state, meta } = useTrade()
  return (
    <Box borderTop="0.8px solid var(--line)" pt="14px" minW="0">
      <OrderRows />
      {meta.hedgeUsd ? (
        <Text m="0" mt="8px" fontSize="12px" color="var(--muted)">
          Sized to hedge {formatUsd(meta.hedgeUsd, false)} of spot {meta.market.symbol} at {state.leverage}x.
        </Text>
      ) : null}
    </Box>
  )
}

export function TradeSubmit() {
  const { state, actions, meta } = useTrade()
  const { isConnected } = useWalletState()
  const amount = Number(state.collateral)

  let label: string
  let onClick: (() => void) | undefined
  if (!walletReady) label = 'Wallet not configured'
  else if (!isConnected) [label, onClick] = ['Connect wallet', () => openWallet()]
  else if (!meta.params.listed) label = 'View only: liquidity too thin'
  else if (!(amount > 0)) label = 'Enter collateral'
  else if (meta.solBalance != null && amount > meta.solBalance) label = 'Not enough SOL'
  else if (!meta.market.priceUsd || !meta.solUsd) label = 'Waiting for price'
  else [label, onClick] = [`Review ${state.side} ${state.leverage}x`, actions.openReview]

  const c = sideColors(state.side)
  return (
    <Box minW="0">
      <chakra.button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        w="100%"
        h="48px"
        borderRadius="60px"
        border="none"
        fontSize="16px"
        cursor={onClick ? 'pointer' : 'not-allowed'}
        bg={c.bg}
        color={c.color}
        opacity={onClick ? 1 : 0.5}
        transition="opacity 0.2s"
      >
        {label}
      </chakra.button>
      <ReviewSheet />
    </Box>
  )
}

/** Review step: the exact order, then Approve (signed in the wallet). */
function ReviewSheet() {
  const { state, actions, meta } = useTrade()
  const a = meta.approval
  const c = sideColors(state.side)
  const p = meta.preview
  const approved = a.status === 'approved'
  return (
    <Modal isOpen={state.reviewing} onClose={actions.closeReview} isCentered motionPreset="slideInBottom" closeOnOverlayClick={a.status !== 'signing'}>
      <ModalOverlay bg="rgba(10,10,11,0.75)" backdropFilter="blur(2px)" />
      <ModalContent bg="var(--ink-2)" border="0.8px solid var(--line)" borderRadius="20px" mx="16px" maxW="420px" color="var(--white-92)">
        <ModalBody p={{ base: '20px', md: '24px' }}>
          <Flex align="center" justify="space-between" gap="12px">
            <Text m="0" fontFamily="var(--font-serif)" fontWeight={300} fontSize="30px" lineHeight="34px" color="var(--white)">
              {approved ? 'Order approved' : 'Review order'}
            </Text>
            <chakra.span px="12px" h="26px" display="inline-flex" alignItems="center" borderRadius="60px" fontSize="13px" bg={c.bg} color={c.color} flexShrink={0}>
              {state.side === 'long' ? 'Long' : 'Short'} {state.leverage}x
            </chakra.span>
          </Flex>
          <Text m="0" mt="6px" fontSize="14px" color="var(--muted)">
            {meta.market.symbol}-PERP on Solana
          </Text>

          <Box mt="18px" p="14px 16px" border="0.8px solid var(--line)" borderRadius="12px" bg="var(--ink)">
            <Row label="Collateral" value={p ? `${formatSol(Number(state.collateral), 6)} · ${formatUsd(Number(state.collateral) * (meta.solUsd ?? 0), false)}` : '–'} />
            <OrderRows />
            <Row label="Valid for" value="15 minutes" />
          </Box>

          {a.status === 'failed' && (
            <Text m="0" mt="12px" fontSize="13px" color="var(--short)" role="alert">
              {a.message}
            </Text>
          )}
          {approved ? (
            <Text m="0" mt="12px" fontSize="13px" lineHeight="19px" color="var(--white-80)" role="status">
              Signed by your wallet. It is listed in Positions with your other orders.
            </Text>
          ) : (
            <Text m="0" mt="12px" fontSize="12px" lineHeight="18px" color="var(--muted)">
              Approving signs this exact order in your wallet. No funds move.
            </Text>
          )}

          <Flex mt="18px" gap="10px">
            {approved ? (
              <>
                <chakra.a
                  as={Link}
                  {...{ to: '/app/positions' }}
                  onClick={actions.closeReview}
                  flex="1"
                  h="46px"
                  display="inline-flex"
                  alignItems="center"
                  justifyContent="center"
                  borderRadius="60px"
                  fontSize="15px"
                  bg={c.bg}
                  color={c.color}
                >
                  View in Positions
                </chakra.a>
                <chakra.button type="button" onClick={actions.closeReview} flex="1" h="46px" borderRadius="60px" fontSize="15px" bg="transparent" color="var(--white-80)" border="0.8px solid var(--line)" cursor="pointer">
                  Done
                </chakra.button>
              </>
            ) : (
              <>
                <chakra.button
                  type="button"
                  onClick={actions.closeReview}
                  disabled={a.status === 'signing'}
                  flex="1"
                  h="46px"
                  borderRadius="60px"
                  fontSize="15px"
                  bg="transparent"
                  color="var(--white-80)"
                  border="0.8px solid var(--line)"
                  cursor="pointer"
                >
                  Cancel
                </chakra.button>
                <chakra.button
                  type="button"
                  onClick={actions.approve}
                  disabled={a.status === 'signing' || !p}
                  flex="1.4"
                  h="46px"
                  borderRadius="60px"
                  fontSize="15px"
                  border="none"
                  bg={c.bg}
                  color={c.color}
                  cursor={a.status === 'signing' ? 'wait' : 'pointer'}
                  opacity={a.status === 'signing' ? 0.6 : 1}
                >
                  {a.status === 'signing' ? 'Approve in wallet…' : a.status === 'failed' ? 'Try again' : 'Approve'}
                </chakra.button>
              </>
            )}
          </Flex>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
