import { useSpotStore } from '../../store/spotStore'

const W = 104, H = 82

// Torn/jagged left and right edges — like a ripped map sheet
const MAP_PATH = `
  M 8 0
  L 96 0
  L 100 10  L 95 20  L 101 30  L 95 40  L 101 50  L 95 60  L 100 70  L 96 ${H}
  L 8 ${H}
  L 4 70  L 9 60  L 3 50  L 9 40  L 3 30  L 9 20  L 4 10
  Z
`

export function MapFAB() {
  const { mobileTab, setMobileTab } = useSpotStore()
  const active = mobileTab === 'spots'

  const paper  = active ? '#B8E070' : '#E2CC88'
  const fold   = active ? '#80AA40' : '#B89850'
  const ink    = active ? '#1A4008' : '#3A2008'
  const grid   = active ? '#507820' : '#8A6820'
  const land   = active ? '#7EC030' : '#C09030'

  return (
    <button
      onClick={() => setMobileTab(active ? 'waves' : 'spots')}
      title="Map"
      className="map-fab"
      style={{
        position: 'fixed',
        bottom: 'calc(env(safe-area-inset-bottom) + 88px)',
        right: 74,
        width: W, height: H,
        border: 'none', background: 'none',
        cursor: 'pointer', padding: 0, zIndex: 50,
        filter: 'drop-shadow(0 6px 18px rgba(0,0,0,0.50))',
        transition: 'transform 0.2s ease, filter 0.2s ease',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-4px)'
        ;(e.currentTarget as HTMLButtonElement).style.filter = 'drop-shadow(0 12px 28px rgba(0,0,0,0.60))'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'
        ;(e.currentTarget as HTMLButtonElement).style.filter = 'drop-shadow(0 6px 18px rgba(0,0,0,0.50))'
      }}
    >
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        {/* Paper fill */}
        <path d={MAP_PATH} fill={paper} />

        {/* Map grid lines — horizontal */}
        {[24, 36, 48, 60].map(y => (
          <line key={`h${y}`} x1={8} y1={y} x2={W - 8} y2={y}
            stroke={grid} strokeWidth="0.6" opacity="0.40" />
        ))}

        {/* Map grid lines — vertical */}
        {[26, 42, 58, 74].map(x => (
          <line key={`v${x}`} x1={x} y1={4} x2={x} y2={H - 4}
            stroke={grid} strokeWidth="0.6" opacity="0.40" />
        ))}

        {/* Land mass */}
        <ellipse cx="52" cy="55" rx="20" ry="10" fill={land} opacity="0.40" />

        {/* Coastline */}
        <path d="M 30 56 C 36 46 44 52 52 48 C 60 44 66 50 74 46"
          fill="none" stroke={fold} strokeWidth="1.5"
          strokeLinecap="round" opacity="0.60" />

        {/* Location pin dot */}
        <circle cx="52" cy="52" r="3.5" fill={ink} opacity="0.65" />
        <circle cx="52" cy="52" r="1.8" fill={active ? '#A0E040' : '#F0C040'} />

        {/* Torn-edge shadow lines for depth */}
        <path d={MAP_PATH} fill="none"
          stroke={ink} strokeWidth="1.0" opacity="0.30" />

        {/* MAP — big, centered */}
        <text x={W / 2} y={20} textAnchor="middle" dominantBaseline="middle"
          fill={ink}
          fontSize="22" fontFamily="'Bangers', Impact, system-ui"
          letterSpacing="0.22em"
          style={{ textShadow: `0 1px 0 rgba(255,255,255,0.25)` }}>
          MAP
        </text>
      </svg>
    </button>
  )
}
