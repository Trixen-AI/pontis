import { Flex } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { Mark } from '@/components/ui/Brand'

/** Full-screen ink cover with the animated mark; fades once the page has loaded. */
export function Loader() {
  const [phase, setPhase] = useState<'on' | 'fading' | 'off'>('on')

  useEffect(() => {
    const start = performance.now()
    let t1 = 0
    let t2 = 0
    const done = () => {
      const wait = Math.max(0, 900 - (performance.now() - start))
      t1 = window.setTimeout(() => {
        setPhase('fading')
        t2 = window.setTimeout(() => setPhase('off'), 600)
      }, wait)
    }
    if (document.readyState === 'complete') done()
    else window.addEventListener('load', done, { once: true })
    return () => {
      window.removeEventListener('load', done)
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  if (phase === 'off') return null
  return (
    <Flex
      position="fixed"
      inset="0"
      zIndex={50}
      bg="var(--ink)"
      align="center"
      justify="center"
      opacity={phase === 'fading' ? 0 : 1}
      transition="opacity 0.6s ease"
      pointerEvents={phase === 'fading' ? 'none' : 'auto'}
      aria-hidden="true"
    >
      <Mark size={100} animate />
    </Flex>
  )
}
