import { useSpotStore } from '../../store/spotStore'

// Location-pin clip-path: rounded top, pointed bottom
// 64px wide × 82px tall
const PIN_CLIP = `path('M 32 80 C 14 60 2 48 2 30 A 30 30 0 0 0 62 30 C 62 48 50 60 32 80 Z')`

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
        right: 256,   // left of the surfboard button
        width: 64,
        height: 82,
        clipPath: PIN_CLIP,
        border: 'none',
        cursor: 'pointer',
        zIndex: 50,
        // Parchment / nautical-chart paper
        background: active
          ? 'linear-gradient(160deg, #C8E890 0%, #88B840 35%, #507820 65%, #88B840 100%)'
          : 'linear-gradient(160deg, #E8D890 0%, #C4A840 35%, #8A6820 65%, #C4A840 100%)',
        boxShadow: active
          ? '0 8px 28px rgba(0,0,0,0.50), 0 3px 10px rgba(80,120,30,0.40), inset 0 1px 0 rgba(255,240,160,0.30)'
          : '0 8px 28px rgba(0,0,0,0.50), 0 3px 10px rgba(100,70,10,0.40), inset 0 1px 0 rgba(255,240,160,0.30)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingBottom: 16,  // shift content up (away from the point)
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-4px)'
        ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 16px 40px rgba(0,0,0,0.60), 0 5px 16px rgba(100,70,10,0.40)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'
        ;(e.currentTarget as HTMLButtonElement).style.boxShadow = active
          ? '0 8px 28px rgba(0,0,0,0.50), 0 3px 10px rgba(80,120,30,0.40)'
          : '0 8px 28px rgba(0,0,0,0.50), 0 3px 10px rgba(100,70,10,0.40)'
      }}
    >
      {/* Pin outline */}
      <div style={{
        position: 'absolute', inset: 0,
        clipPath: PIN_CLIP,
        boxShadow: 'inset 0 0 0 2px rgba(30,15,0,0.35)',
        pointerEvents: 'none',
      }} />

      {/* Inner hole circle — classic map pin look */}
      <div style={{
        position: 'absolute',
        top: 14, left: '50%',
        transform: 'translateX(-50%)',
        width: 16, height: 16,
        borderRadius: '50%',
        background: 'rgba(20,10,0,0.30)',
        border: '1.5px solid rgba(20,10,0,0.25)',
        pointerEvents: 'none',
      }} />

      {/* MAP label */}
      <span style={{
        fontFamily: "'Bangers', Impact, system-ui",
        fontSize: 14,
        letterSpacing: '0.14em',
        color: active ? 'rgba(10,30,0,0.90)' : 'rgba(40,20,0,0.85)',
        textShadow: '0 1px 2px rgba(255,240,160,0.40)',
        position: 'relative',
        zIndex: 1,
        marginTop: 8,
      }}>
        MAP
      </span>
    </button>
  )
}
