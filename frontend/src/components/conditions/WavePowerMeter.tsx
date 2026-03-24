import { motion } from 'framer-motion'

interface Props {
  kw: number   // kW/m
  maxKw?: number
}

// Color stops: flat -> small -> medium -> solid -> overhead -> XXL
function kwToColor(kw: number): string {
  if (kw < 1) return '#4a5568'
  if (kw < 5) return '#2563eb'
  if (kw < 15) return '#0891b2'
  if (kw < 30) return '#059669'
  if (kw < 60) return '#d97706'
  return '#dc2626'
}

function kwToLabel(kw: number): string {
  if (kw < 1) return 'Flat'
  if (kw < 5) return 'Small'
  if (kw < 15) return 'Medium'
  if (kw < 30) return 'Solid'
  if (kw < 60) return 'Powerful'
  return 'Maxed Out'
}

export function WavePowerMeter({ kw, maxKw = 80 }: Props) {
  const size = 72
  const cx = size / 2
  const cy = size / 2
  const r = 28
  const strokeWidth = 6

  // 270-degree arc
  const startAngle = 135
  const endAngle = 405
  const sweepDeg = endAngle - startAngle  // 270
  const pct = Math.min(kw / maxKw, 1)
  const activeSweep = sweepDeg * pct

  const toRad = (d: number) => (d * Math.PI) / 180
  const arcPath = (start: number, sweep: number) => {
    const s = toRad(start)
    const e = toRad(start + sweep)
    const x1 = cx + r * Math.cos(s)
    const y1 = cy + r * Math.sin(s)
    const x2 = cx + r * Math.cos(e)
    const y2 = cy + r * Math.sin(e)
    const large = sweep > 180 ? 1 : 0
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`
  }

  const color = kwToColor(kw)
  const label = kwToLabel(kw)

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <path
          d={arcPath(startAngle, sweepDeg)}
          fill="none"
          stroke="#123055"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Active arc */}
        <motion.path
          d={arcPath(startAngle, activeSweep)}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
        {/* Center value */}
        <text x={cx} y={cy - 3} textAnchor="middle" fill={color} fontSize="11" fontWeight="800" fontFamily="Inter">
          {kw < 10 ? kw.toFixed(1) : kw.toFixed(0)}
        </text>
        <text x={cx} y={cy + 9} textAnchor="middle" fill="#6aa3d4" fontSize="7" fontFamily="Inter">
          kW/m
        </text>
      </svg>
      <p className="text-xs font-semibold mt-0.5" style={{ color }}>{label}</p>
    </div>
  )
}
