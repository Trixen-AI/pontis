import { useEffect, useRef } from 'react'

// Full-bleed looping backdrop: soft orange and mint glows and ink shadows drifting on slow Lissajous paths.
// Rendered to a small canvas and scaled up with CSS so the gradients stay smooth and cheap.
type Glow = { x: number; y: number; r: number; ax: number; ay: number; fx: number; fy: number; p: number; color: string; alpha: number }

const GLOWS: Glow[] = [
  { x: 0.08, y: 0.78, r: 0.55, ax: 0.08, ay: 0.1, fx: 0.07, fy: 0.05, p: 0.0, color: '249,133,0', alpha: 0.6 },
  { x: 0.22, y: 0.35, r: 0.42, ax: 0.1, ay: 0.08, fx: 0.05, fy: 0.08, p: 1.3, color: '160,82,0', alpha: 0.55 },
  { x: 0.72, y: 0.2, r: 0.5, ax: 0.12, ay: 0.06, fx: 0.04, fy: 0.06, p: 2.1, color: '90,48,0', alpha: 0.5 },
  { x: 0.9, y: 0.7, r: 0.38, ax: 0.06, ay: 0.12, fx: 0.06, fy: 0.035, p: 3.4, color: '113,207,163', alpha: 0.3 },
  { x: 0.5, y: 0.95, r: 0.45, ax: 0.14, ay: 0.05, fx: 0.03, fy: 0.07, p: 4.2, color: '200,105,0', alpha: 0.4 },
]
// Dark lobes carve depth into the light, like overlapping shapes in front of the glow.
const SHADOWS = [
  { x: 0.45, y: 0.15, r: 0.32, ax: 0.1, ay: 0.06, fx: 0.05, fy: 0.04, p: 0.7 },
  { x: 0.78, y: 0.55, r: 0.3, ax: 0.08, ay: 0.1, fx: 0.04, fy: 0.06, p: 2.6 },
  { x: 0.3, y: 0.62, r: 0.26, ax: 0.09, ay: 0.08, fx: 0.06, fy: 0.05, p: 5.0 },
]

export function HeroField() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    let visible = true
    const W = 320
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = W
      canvas.height = Math.max(1, Math.round((W * rect.height) / Math.max(1, rect.width)))
    }
    resize()

    const draw = (t: number) => {
      const w = canvas.width
      const h = canvas.height
      const m = Math.max(w, h)
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = '#0a0a0b'
      ctx.fillRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'lighter'
      for (const g of GLOWS) {
        const cx = (g.x + Math.sin(t * g.fx + g.p) * g.ax) * w
        const cy = (g.y + Math.cos(t * g.fy + g.p) * g.ay) * h
        const r = g.r * m
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
        grad.addColorStop(0, `rgba(${g.color},${g.alpha})`)
        grad.addColorStop(0.55, `rgba(${g.color},${g.alpha * 0.35})`)
        grad.addColorStop(1, `rgba(${g.color},0)`)
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, w, h)
      }
      ctx.globalCompositeOperation = 'source-over'
      for (const s of SHADOWS) {
        const cx = (s.x + Math.sin(t * s.fx + s.p) * s.ax) * w
        const cy = (s.y + Math.cos(t * s.fy + s.p) * s.ay) * h
        const r = s.r * m
        const grad = ctx.createRadialGradient(cx, cy, r * 0.55, cx, cy, r)
        grad.addColorStop(0, 'rgba(10,10,11,0.82)')
        grad.addColorStop(1, 'rgba(10,10,11,0)')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.fill()
      }
      // vignette toward the lower right, keeps the headline area calm
      const v = ctx.createLinearGradient(0, 0, w, h)
      v.addColorStop(0.35, 'rgba(10,10,11,0)')
      v.addColorStop(1, 'rgba(10,10,11,0.75)')
      ctx.fillStyle = v
      ctx.fillRect(0, 0, w, h)
    }

    const loop = (now: number) => {
      draw(now / 1000)
      if (visible && !reduce) raf = requestAnimationFrame(loop)
    }
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      cancelAnimationFrame(raf)
      if (visible && !reduce) raf = requestAnimationFrame(loop)
    })
    io.observe(canvas)
    draw(8)
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', filter: 'blur(6px)', transform: 'scale(1.04)' }}
    />
  )
}
