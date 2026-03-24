import { motion } from 'framer-motion'

interface Props {
  deg: number
  size?: number
  color?: string
  label?: string
}

export function CompassRose({ deg, size = 56, color = '#00d4c8', label }: Props) {
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox="0 0 56 56">
        {/* Outer ring */}
        <circle cx="28" cy="28" r="26" fill="none" stroke="#123055" strokeWidth="1.5" />
        {/* Cardinal labels */}
        {[['N', 28, 7], ['S', 28, 51], ['E', 50, 30], ['W', 6, 30]].map(([l, x, y]) => (
          <text
            key={l}
            x={x as number}
            y={y as number}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#6aa3d4"
            fontSize="7"
            fontWeight="600"
            fontFamily="Inter"
          >
            {l}
          </text>
        ))}
        {/* Needle — points in direction of deg */}
        <motion.g
          animate={{ rotate: deg }}
          transition={{ type: 'spring', stiffness: 80, damping: 20 }}
          style={{ originX: '28px', originY: '28px' }}
        >
          {/* Arrow head */}
          <polygon
            points="28,10 31,28 28,26 25,28"
            fill={color}
            opacity="0.95"
          />
          {/* Tail */}
          <polygon
            points="28,46 31,28 28,30 25,28"
            fill="#123055"
          />
        </motion.g>
        {/* Center dot */}
        <circle cx="28" cy="28" r="3" fill={color} />
      </svg>
      {label && <span className="stat-label text-center">{label}</span>}
    </div>
  )
}
