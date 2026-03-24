interface Props {
  deg: number
  size?: number
  color?: string
  label?: string
}

export function CompassRose({ deg, size = 56, color = '#78B8D8', label }: Props) {
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox="0 0 56 56">
        {/* Outer ring */}
        <circle cx="28" cy="28" r="26" fill="none" stroke="rgba(26,48,72,0.90)" strokeWidth="1.5" />
        {/* Cardinal labels */}
        {([['N', 28, 7], ['S', 28, 51], ['E', 50, 30], ['W', 6, 30]] as const).map(([l, x, y]) => (
          <text key={l} x={x} y={y}
            textAnchor="middle" dominantBaseline="middle"
            fill="rgba(168,200,220,0.55)" fontSize="7" fontWeight="600" fontFamily="Inter">
            {l}
          </text>
        ))}
        {/* Needle — rotated using SVG transform so origin is exact center */}
        <g transform={`rotate(${deg}, 28, 28)`}>
          {/* Arrow head (colored, points in wind direction) */}
          <polygon points="28,10 31,28 28,26 25,28" fill={color} opacity="0.95" />
          {/* Tail */}
          <polygon points="28,46 31,28 28,30 25,28" fill="rgba(26,48,72,0.80)" />
        </g>
        {/* Center dot */}
        <circle cx="28" cy="28" r="3" fill={color} />
      </svg>
      {label && <span className="stat-label text-center">{label}</span>}
    </div>
  )
}
