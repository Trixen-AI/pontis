import { Box, Flex, Text } from '@chakra-ui/react'
import { useEffect, useMemo, useRef } from 'react'
import { pledge } from '@/data/content'

// Topographic rings around a lopsided summit: a runner's peak with a rug's cliff on one side.
function contourPaths(rings = 14) {
  const out: string[] = []
  const N = 96
  for (let k = 0; k < rings; k++) {
    const base = 60 + k * 34
    const pts: string[] = []
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * Math.PI * 2
      const lob = 1 + 0.22 * Math.sin(2 * t + 0.6 + k * 0.05) + 0.1 * Math.sin(3 * t - 0.4) + 0.06 * Math.cos(5 * t + k * 0.12)
      // the cliff: rings bunch up on the right-hand side
      const da = Math.atan2(Math.sin(t - 0.25), Math.cos(t - 0.25)) // wrapped angular distance
      const cliff = 1 - 0.28 * Math.exp(-(da ** 2) / 0.18) * Math.min(1, k / 6)
      const r = base * lob * cliff
      const x = 800 + Math.cos(t) * r * 1.25
      const y = 560 + Math.sin(t) * r * 0.92
      pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`)
    }
    out.push(pts.join('') + 'Z')
  }
  return out
}

/** 100vh light band. The contour field grows as the band scrolls through (51.6% -> ~244% width). */
export function Pledge() {
  const section = useRef<HTMLElement>(null)
  const art = useRef<HTMLDivElement>(null)
  const paths = useMemo(() => contourPaths(), [])

  useEffect(() => {
    const el = section.current
    const a = art.current
    if (!el || !a) return
    let raf = 0
    const update = () => {
      raf = 0
      const top = el.getBoundingClientRect().top
      const vh = window.innerHeight
      // same linear rate as the reference: +0.0889% width per px scrolled, from 51.6% at entry
      const pct = Math.max(51.6, 51.6 + (vh - top) * 0.0889)
      a.style.width = `${pct}%`
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <Box as="section" ref={section} position="relative" h="100vh" minH="560px" bg="var(--paper)" overflow="hidden">
      <Box ref={art} position="absolute" left="50%" top="50%" w="51.6%" transform="translate(-50%, -50%)" aria-hidden="true">
        <svg viewBox="0 0 1600 1120" width="100%" style={{ display: 'block' }}>
          {paths.map((d, i) => (
            <path key={i} d={d} fill="none" stroke="var(--contour)" strokeWidth={1.1} opacity={0.35 + (i / paths.length) * 0.5} vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
      </Box>
      <Flex position="relative" h="100%" direction="column" align="center" justify="center" textAlign="center" px="16px">
        <Text m="0" pt="40px" fontSize={{ base: '16px', md: '20px' }} lineHeight="30px" color="var(--ink)">
          {pledge.kicker}
        </Text>
        <Text as="h2" m="0" fontFamily="var(--font-serif)" fontWeight={300} fontSize={{ base: '52px', md: '90px' }} lineHeight={{ base: '56px', md: '90px' }} letterSpacing="-0.01em" color="var(--ink)">
          {pledge.title}
        </Text>
      </Flex>
    </Box>
  )
}
