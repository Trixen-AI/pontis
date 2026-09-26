import { Box, Flex, Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { Wordmark } from '@/components/ui/Brand'
import { stack } from '@/data/content'
import { useStepScroll } from '@/hooks/useStepScroll'
import {
  ART_H, ART_W, BASE, BASE_SHADOW, CALLOUTS, CANDLES, PLATE_L, PLATE_R,
  alongFaceText, boxFaces, candleBox, upFaceText, wickLine, type Box as IsoBox,
} from './stackScene'

const STEPS = stack.steps.length // 4 steps + "all lit"
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'
const T = `opacity 0.6s ${EASE}, transform 0.6s ${EASE}, fill 0.4s ease, stroke 0.4s ease, color 0.4s ease`

const FACES = {
  long: { top: '#e9ffa6', left: '#d2ff4d', right: '#a8cf35', ink: '#1b2413' },
  short: { top: '#ffb3a6', left: '#ff6a55', right: '#d44d3a', ink: '#2a0f0a' },
  plate: { top: '#1f2d22', left: '#18231a', right: '#131c15', ink: '#9fb487' },
  base: { top: '#18231b', left: '#131c15', right: '#0f1711', ink: '#9fb487' },
}

type Layer = 'sides' | 'markets' | 'engines' | 'chain'
/** Opacity + lift per layer at each step, mirroring the reference choreography. */
function layerState(step: number, layer: Layer, isSide: boolean) {
  if (step >= STEPS) return { on: true, lift: 0 }
  const focus = stack.steps[step].focus
  if (layer === 'sides' || layer === 'markets') {
    const lit = focus === 'markets' || (focus === 'sides' && isSide)
    const lifted = focus === 'sides' ? isSide : focus === 'markets' || focus === 'engines'
    return { on: lit, lift: lifted ? -40 : 0 }
  }
  return { on: focus === layer, lift: 0 }
}

function IsoSlab({ b, palette, label, on, labelOn }: { b: IsoBox; palette: typeof FACES.plate; label?: string; on: boolean; labelOn?: boolean }) {
  const f = boxFaces(b)
  return (
    <g style={{ opacity: on ? 1 : 0.3, transition: T }}>
      <polygon points={f.left} fill={palette.left} />
      <polygon points={f.right} fill={palette.right} />
      <polygon points={f.top} fill={palette.top} stroke="rgba(210,255,77,0.08)" strokeWidth={1} />
      {label && (
        <text
          transform={alongFaceText(b)}
          fontSize={13}
          fontFamily="var(--font-sans)"
          fill={labelOn ? 'var(--accent)' : palette.ink}
          style={{ transition: T }}
        >
          {label}
        </text>
      )}
    </g>
  )
}

function Scene({ step, leaders = true }: { step: number; leaders?: boolean }) {
  const all = step >= STEPS
  const focus = all ? null : stack.steps[step].focus
  const sorted = [...CANDLES].sort((a, b) => a.x + a.y - (b.x + b.y))
  return (
    <svg viewBox={`0 0 ${ART_W} ${ART_H}`} width={ART_W} height={ART_H} aria-hidden="true" style={{ overflow: 'visible' }}>
      <IsoSlab b={BASE_SHADOW} palette={{ ...FACES.base, top: '#111a13', left: '#0f1711', right: '#0c130e' }} on={all || focus === 'chain'} />
      <IsoSlab b={BASE} palette={FACES.base} label={stack.plates.base} on={all || focus === 'chain'} labelOn={focus === 'chain'} />
      <IsoSlab b={PLATE_L} palette={FACES.plate} label={stack.plates.left} on={all || focus === 'engines'} labelOn={focus === 'engines'} />
      <IsoSlab b={PLATE_R} palette={FACES.plate} label={stack.plates.right} on={all || focus === 'engines'} labelOn={focus === 'engines'} />
      {sorted.map((c) => {
        const def = stack.candles.find((d) => d.id === c.id)!
        const isSide = c.id === 'longs' || c.id === 'shorts'
        const s = layerState(step, isSide ? 'sides' : 'markets', isSide)
        const pal = def.side === 'short' ? FACES.short : FACES.long
        const b = candleBox(c)
        const f = boxFaces(b)
        const [w1, w2] = wickLine(c)
        return (
          <g key={c.id} style={{ opacity: s.on ? 1 : 0.3, transform: `translateY(${s.lift}px)`, transition: T }}>
            <line x1={w1[0]} y1={w1[1]} x2={w2[0]} y2={w2[1]} stroke={pal.right} strokeWidth={3} strokeLinecap="round" />
            <polygon points={f.left} fill={pal.left} />
            <polygon points={f.right} fill={pal.right} />
            <polygon points={f.top} fill={pal.top} />
            <text transform={upFaceText(b, 0.36)} fontSize={12.5} fontStyle="italic" fontFamily="var(--font-sans)" fill={pal.ink}>
              {def.label}
            </text>
          </g>
        )
      })}
      {leaders && CALLOUTS.map((c, i) => {
        const active = !all && i === step
        const x0 = c.x
        const x1 = c.x + c.w
        const elbow = c.side === 'left' ? x1 : x0
        const d = `M${c.side === 'left' ? x0 : x1} ${c.underline} H${elbow} L${c.target[0].toFixed(1)} ${c.target[1].toFixed(1)}`
        return (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={active ? 'var(--accent)' : 'var(--muted)'}
            strokeWidth={1}
            style={{ opacity: all || active ? (active ? 1 : 0.45) : 0.2, transition: T }}
          />
        )
      })}
    </svg>
  )
}

function Callouts({ step }: { step: number }) {
  const all = step >= STEPS
  return (
    <>
      {CALLOUTS.map((c, i) => {
        const active = !all && i === step
        const above = i === 0 || i === 2 // text sits above its underline
        return (
          <Text
            key={i}
            m="0"
            position="absolute"
            left={`${c.x}px`}
            w={`${c.w}px`}
            top={above ? undefined : `${c.underline + 13}px`}
            bottom={above ? `${ART_H - c.underline + 9}px` : undefined}
            fontSize="16px"
            lineHeight="20px"
            color={active ? 'var(--accent)' : 'var(--muted)'}
            opacity={all || active ? 1 : 0.2}
            transition={T}
          >
            {stack.steps[i].text}
          </Text>
        )
      })}
    </>
  )
}

/** Scales the 1320 x 615 artboard to fit the stage; below 900px the callouts move under the scene. */
function useArtScale() {
  const [s, setS] = useState({ scale: 1, compact: false, small: false })
  useEffect(() => {
    const fit = () => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const compact = vw < 900
      const byW = compact ? (vw - 16) / 900 : Math.min(1, vw / ART_W)
      const byH = compact ? (vh * 0.48) / ART_H : (vh - 277) / ART_H
      setS({ scale: Math.max(0.3, Math.min(byW, byH, 1)), compact, small: vw < 768 })
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])
  return s
}

export function Stack() {
  const { ref, step } = useStepScroll(STEPS)
  const { scale, compact, small } = useArtScale()
  const activeText = step < STEPS ? stack.steps[step].text : null

  return (
    <Box as="section" id="markets" ref={ref} position="relative" h={`${(STEPS + 1) * 100}vh`} bg="var(--ink-2)" aria-label="Inside Pontis perps">
      <Box position="sticky" top="0" h="100vh" overflow="hidden">
        <Flex direction="column" align="center" maxW="var(--container)" mx="auto" h="100%" pt={compact ? '0' : '142px'}
          justify={compact ? 'center' : 'flex-start'}>
          <Flex as="h2" m="0" align="flex-end" gap={{ base: '12px', md: '24px' }} fontWeight={300} color="var(--white-92)" fontFamily="var(--font-serif)" fontSize={{ base: '34px', md: '55px' }} lineHeight={{ base: '30px', md: '41.5px' }}>
            <span>{stack.titleBefore}</span>
            <Box as="span" display="flex" alignItems="flex-end" color="var(--white)">
              <Wordmark height={small ? 32 : 51} />
              <span className="sr-only">Pontis</span>
            </Box>
            <span>{stack.titleAfter}</span>
          </Flex>

          <Box position="relative" mt={compact ? '40px' : '50px'} w={`${(compact ? 900 : ART_W) * scale}px`} h={`${ART_H * scale}px`}>
            <Box position="absolute" top="0" left={compact ? `${-210 * scale}px` : '0'} w={`${ART_W}px`} h={`${ART_H}px`} transform={`scale(${scale})`} transformOrigin="top left">
              <Scene step={step} leaders={!compact} />
              {!compact && <Callouts step={step} />}
            </Box>
          </Box>

          {compact && (
            <Box px="16px" mt="24px" minH="100px" maxW="520px" textAlign="center" aria-live="polite">
              <Text m="0" fontSize="15px" lineHeight="20px" color={activeText ? 'var(--accent)' : 'var(--muted)'}>
                {activeText ?? stack.steps[stack.steps.length - 1].text}
              </Text>
            </Box>
          )}
        </Flex>
      </Box>
      {/* Readable copy for assistive tech; the scene itself is decorative. */}
      <Box className="sr-only">
        {stack.steps.map((s) => (
          <p key={s.focus}>{s.text}</p>
        ))}
      </Box>
    </Box>
  )
}
