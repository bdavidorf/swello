import { useSpotStore } from '../../store/spotStore'

// Folded paper map shape: rectangle with dog-eared top-right corner
// 92px wide × 80px tall, fold at 68px across / 24px down
const W = 92, H = 80, FX = 68, FY = 24
const MAP_CLIP = `polygon(0px 0px, ${FX}px 0px, ${W}px ${FY}px, ${W}px ${H}px, 0px ${H}px)`

export function MapFAB() {
  const { mobileTab, setMobileTab } = useSpotStore()
  const active = mobileTab === 'spots'

  return (
    <button
      onClick={() => setMobileTab(active ? 'waves' : 'spots')}
      title="Map"
      style={{
        position: 'fixed',
        bottom: 'calc(env(safe-area-inset-bottom) + 88px)',
        right: 252,
        width: W,
        height: H,
        clipPath: MAP_CLIP,
        border: 'none',
        cursor: 'pointer',
        zIndex: 50,
        padding: 0,
        background: 'none',
        transition: 'transform 0.2s ease, filter 0.2s ease',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-4px)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)' }}
    >
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        {/* Paper base — parchment */}
        <polygon
          points={`0,0 ${FX},0 ${W},${FY} ${W},${H} 0,${H}`}
          fill={active ? '#C8E890' : '#E2CC88'}
        />

        {/* Fold triangle — slightly darker corner */}
        <polygon
          points={`${FX},0 ${W},${FY} ${FX},${FY}`}
          fill={active ? '#90B850' : '#B8A060'}
          opacity="0.85"
        />

        {/* Fold crease line */}
        <line x1={FX} y1={0} x2={W} y2={FY}
          stroke={active ? '#70983A' : '#8A7040'} strokeWidth="0.8" opacity="0.6" />

        {/* Map grid lines — horizontal */}
        {[22, 34, 46, 58].map(y => (
          <line key={`h${y}`} x1={4} y1={y} x2={FX - 2} y2={y}
            stroke={active ? '#507820' : '#8A6820'} strokeWidth="0.7" opacity="0.45" />
        ))}
        {/* Grid lines continuing past the fold area */}
        {[46, 58].map(y => (
          <line key={`hf${y}`} x1={FX - 2} y1={y} x2={W - 4} y2={y}
            stroke={active ? '#507820' : '#8A6820'} strokeWidth="0.7" opacity="0.45" />
        ))}

        {/* Map grid lines — vertical */}
        {[22, 38, 54].map(x => (
          <line key={`v${x}`} x1={x} y1={4} x2={x} y2={H - 4}
            stroke={active ? '#507820' : '#8A6820'} strokeWidth="0.7" opacity="0.45" />
        ))}

        {/* Simple coastline squiggle */}
        <path
          d="M 10 52 C 16 44 22 50 28 42 C 34 34 40 40 46 36 C 52 32 56 38 60 34"
          fill="none" stroke={active ? '#3A6010' : '#6A4810'}
          strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />

        {/* Land mass blob */}
        <ellipse cx="34" cy="48" rx="14" ry="8"
          fill={active ? '#88C040' : '#C8A040'} opacity="0.35" />

        {/* Small location dot */}
        <circle cx="34" cy="46" r="2.5"
          fill={active ? '#205010' : '#5A2A08'} opacity="0.75" />
        <circle cx="34" cy="46" r="1.2"
          fill={active ? '#80E040' : '#E8A040'} />

        {/* MAP label — top of the button */}
        <text x={FX / 2} y={14} textAnchor="middle"
          fill={active ? '#1A4008' : '#3A2008'}
          fontSize="13" fontWeight="bold"
          fontFamily="'Bangers', Impact, system-ui"
          letterSpacing="0.18em">
          MAP
        </text>

        {/* Outer edge shadow */}
        <polygon
          points={`0,0 ${FX},0 ${W},${FY} ${W},${H} 0,${H}`}
          fill="none"
          stroke={active ? '#3A7010' : '#7A5010'}
          strokeWidth="1.2" opacity="0.50" />
      </svg>
    </button>
  )
}
