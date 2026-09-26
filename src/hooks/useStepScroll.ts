import { useEffect, useRef, useState } from 'react'

/**
 * Pinned multi-step section: the section is (steps + 1) viewports tall, its stage is sticky.
 * Step k is active around sectionTop + k * vh; step `steps` means "all lit".
 * Wheel gestures inside the pinned range advance exactly one step (smooth scroll), like the reference.
 */
export function useStepScroll(steps: number) {
  const ref = useRef<HTMLElement>(null)
  const [step, setStep] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const top = () => el.getBoundingClientRect().top + window.scrollY
    const read = () => {
      const k = Math.round((window.scrollY - top()) / window.innerHeight)
      setStep(Math.min(steps, Math.max(0, k)))
    }
    read()
    window.addEventListener('scroll', read, { passive: true })
    window.addEventListener('resize', read)

    // Wheel snapping between steps (desktop only; touch keeps native scroll).
    let lockUntil = 0
    const onWheel = (e: WheelEvent) => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      if (Math.abs(e.deltaY) < 4 || e.ctrlKey) return
      const vh = window.innerHeight
      const t = top()
      const pos = (window.scrollY - t) / vh
      const dir = e.deltaY > 0 ? 1 : -1
      // only while the stage is pinned (between the first and last step)
      if (pos < -0.02 || pos > steps + 0.02) return
      const cur = Math.round(pos)
      const next = cur + dir
      if (next < 0 || next > steps) return
      e.preventDefault()
      const now = performance.now()
      if (now < lockUntil) return
      lockUntil = now + 750
      window.scrollTo({ top: t + next * vh, behavior: 'smooth' })
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      window.removeEventListener('scroll', read)
      window.removeEventListener('resize', read)
      window.removeEventListener('wheel', onWheel)
    }
  }, [steps])

  return { ref, step }
}
