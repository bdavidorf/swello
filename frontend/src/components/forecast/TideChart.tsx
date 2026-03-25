import { useRef, useEffect, useState, useCallback } from 'react'
import { format } from 'date-fns'
import type { TidePrediction, TideEvent } from '../../types/surf'

interface Props {
  predictions: TidePrediction[]
  events: TideEvent[]
  hoursToShow?: number
}

const PAD = { top: 20, right: 20, bottom: 32, left: 38 }

export function TideChart({ predictions, events, hoursToShow = 36 }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const slice      = predictions.slice(0, hoursToShow)
  const [scrubIdx, setScrubIdx] = useState<number | null>(null)

  // ── Shared helpers (must match what useEffect uses) ──────────────────────────
  const getPlotDims = (W: number, H: number) => ({
    plotW: W - PAD.left - PAD.right,
    plotH: H - PAD.top  - PAD.bottom,
  })

  // ── Pointer / touch → scrub index ────────────────────────────────────────────
  const xToIdx = useCallback((clientX: number) => {
    const canvas = canvasRef.current
    if (!canvas || slice.length === 0) return null
    const rect  = canvas.getBoundingClientRect()
    const x     = clientX - rect.left
    const plotW = rect.width - PAD.left - PAD.right
    const frac  = Math.max(0, Math.min(1, (x - PAD.left) / plotW))
    return Math.round(frac * (slice.length - 1))
  }, [slice.length])

  const onPointerMove  = useCallback((e: React.PointerEvent) => setScrubIdx(xToIdx(e.clientX)), [xToIdx])
  const onPointerLeave = useCallback(() => setScrubIdx(null), [])
  const onTouchMove    = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    setScrubIdx(xToIdx(e.touches[0].clientX))
  }, [xToIdx])
  const onTouchEnd     = useCallback(() => setScrubIdx(null), [])

  // ── Draw ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || slice.length === 0) return

    const dpr  = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    const W    = rect.width
    const H    = rect.height
    canvas.width  = Math.round(W * dpr)
    canvas.height = Math.round(H * dpr)

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)

    const { plotW, plotH } = getPlotDims(W, H)
    const heights = slice.map(p => p.height_ft)
    const minH    = Math.min(...heights) - 0.4
    const maxH    = Math.max(...heights) + 0.4

    const toX = (i: number) => PAD.left + (i / (slice.length - 1)) * plotW
    const toY = (h: number) => PAD.top  + (1 - (h - minH) / (maxH - minH)) * plotH

    ctx.clearRect(0, 0, W, H)

    // ── Grid lines ──────────────────────────────────────────────────────────────
    ctx.strokeStyle = '#0d2035'
    ctx.lineWidth   = 1
    for (let h = Math.ceil(minH); h <= Math.floor(maxH) + 1; h++) {
      const y = toY(h)
      if (y < PAD.top || y > H - PAD.bottom) continue
      ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(W - PAD.right, y); ctx.stroke()
    }

    // ── Gradient fill ───────────────────────────────────────────────────────────
    const grad = ctx.createLinearGradient(0, PAD.top, 0, H - PAD.bottom)
    grad.addColorStop(0, 'rgba(0, 212, 200, 0.22)')
    grad.addColorStop(1, 'rgba(0, 212, 200, 0.02)')

    const drawCurve = () => {
      ctx.beginPath()
      for (let i = 0; i < slice.length; i++) {
        const x = toX(i), y = toY(heights[i])
        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          const px = toX(i - 1), py = toY(heights[i - 1])
          const cpX = (px + x) / 2
          ctx.bezierCurveTo(cpX, py, cpX, y, x, y)
        }
      }
    }

    drawCurve()
    ctx.lineTo(toX(slice.length - 1), H - PAD.bottom)
    ctx.lineTo(PAD.left, H - PAD.bottom)
    ctx.closePath()
    ctx.fillStyle = grad
    ctx.fill()

    drawCurve()
    ctx.strokeStyle = '#00d4c8'
    ctx.lineWidth   = 2.5
    ctx.lineJoin    = 'round'
    ctx.stroke()

    // ── "Now" marker ────────────────────────────────────────────────────────────
    const now     = new Date()
    const firstTs = new Date(slice[0].timestamp)
    const lastTs  = new Date(slice[slice.length - 1].timestamp)
    const totalMs = lastTs.getTime() - firstTs.getTime()
    const nowMs   = now.getTime()    - firstTs.getTime()
    if (nowMs > 0 && nowMs < totalMs) {
      const nowX = PAD.left + (nowMs / totalMs) * plotW
      ctx.save()
      ctx.setLineDash([5, 4])
      ctx.strokeStyle = 'rgba(244,199,122,0.75)'
      ctx.lineWidth   = 1.5
      ctx.beginPath(); ctx.moveTo(nowX, PAD.top); ctx.lineTo(nowX, H - PAD.bottom); ctx.stroke()
      ctx.restore()
      ctx.fillStyle = '#f4c77a'
      ctx.font      = 'bold 10px Inter, system-ui'
      ctx.textAlign = 'center'
      ctx.fillText('Now', nowX, PAD.top - 6)
    }

    // ── Y-axis labels ───────────────────────────────────────────────────────────
    ctx.fillStyle = '#5a90b8'
    ctx.font      = '11px Inter, system-ui'
    ctx.textAlign = 'right'
    for (let h = Math.round(minH); h <= Math.round(maxH); h++) {
      const y = toY(h)
      if (y < PAD.top || y > H - PAD.bottom) continue
      ctx.fillText(`${h}ft`, PAD.left - 6, y + 4)
    }

    // ── X-axis labels (every 6 hours) ───────────────────────────────────────────
    ctx.fillStyle = '#5a90b8'
    ctx.textAlign = 'center'
    for (let i = 0; i < slice.length; i += 6) {
      ctx.fillText(format(new Date(slice[i].timestamp), 'ha').toLowerCase(), toX(i), H - PAD.bottom + 14)
    }

    // ── High / low event dots ───────────────────────────────────────────────────
    events.slice(0, 8).forEach(ev => {
      const idx = slice.findIndex(p =>
        Math.abs(new Date(p.timestamp).getTime() - new Date(ev.timestamp).getTime()) < 40 * 60 * 1000
      )
      if (idx < 0) return
      const x = toX(idx), y = toY(heights[idx])
      const isHigh = ev.event_type === 'high'
      const dotColor = isHigh ? '#00d4c8' : '#6aa3d4'
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fillStyle = dotColor; ctx.fill()
      ctx.fillStyle = dotColor
      ctx.font      = 'bold 11px Inter, system-ui'
      ctx.textAlign = 'center'
      ctx.fillText(`${isHigh ? '▲' : '▼'} ${ev.height_ft.toFixed(1)}ft`, x, isHigh ? y - 11 : y + 16)
    })

    // ── Scrubber ────────────────────────────────────────────────────────────────
    if (scrubIdx !== null) {
      const sx = toX(scrubIdx)
      const sy = toY(heights[scrubIdx])
      const p  = slice[scrubIdx]

      // Vertical line
      ctx.save()
      ctx.strokeStyle = 'rgba(255,255,255,0.70)'
      ctx.lineWidth   = 1.5
      ctx.beginPath(); ctx.moveTo(sx, PAD.top); ctx.lineTo(sx, H - PAD.bottom); ctx.stroke()
      ctx.restore()

      // Dot on curve
      ctx.beginPath()
      ctx.arc(sx, sy, 5, 0, Math.PI * 2)
      ctx.fillStyle   = '#ffffff'
      ctx.strokeStyle = '#00d4c8'
      ctx.lineWidth   = 2
      ctx.fill()
      ctx.stroke()

      // Tooltip bubble
      const timeLabel   = format(new Date(p.timestamp), 'h:mm a')
      const heightLabel = `${p.height_ft.toFixed(2)}ft`
      const label       = `${timeLabel}  ${heightLabel}`

      ctx.font = 'bold 11px Inter, system-ui'
      const tw = ctx.measureText(label).width
      const bw = tw + 16, bh = 22, br = 6
      let bx = sx - bw / 2
      // Keep inside plot
      bx = Math.max(PAD.left, Math.min(W - PAD.right - bw, bx))
      const by = PAD.top + 2

      // Box
      ctx.beginPath()
      ctx.roundRect(bx, by, bw, bh, br)
      ctx.fillStyle = 'rgba(10,24,38,0.92)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,212,200,0.40)'
      ctx.lineWidth   = 1
      ctx.stroke()

      // Text
      ctx.fillStyle = '#EAF6FF'
      ctx.textAlign = 'center'
      ctx.fillText(label, bx + bw / 2, by + 14)
    }

  }, [slice, events, scrubIdx])

  return (
    <div className="card p-5">
      <p className="stat-label mb-3">Tide — Next 36 Hours</p>
      <div style={{ width: '100%', height: 150, cursor: 'crosshair', userSelect: 'none' }}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        />
      </div>
    </div>
  )
}
