import { useQuery } from '@tanstack/react-query'
import { fetchSpotAnalysis } from '../../api/client'
import type { SurfCondition, SpotMeta } from '../../types/surf'

interface Props {
  condition: SurfCondition
  spotMeta?: SpotMeta
}

export function AISpotAnalysis({ condition, spotMeta }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['spot-analysis', condition.spot_id],
    queryFn: () =>
      fetchSpotAnalysis(condition, {
        break_type: spotMeta?.break_type ?? '',
        difficulty: spotMeta?.difficulty ?? '',
        facing_dir: spotMeta?.facing_dir ?? '',
      }),
    staleTime: 5 * 60 * 1000,
    enabled: !!condition,
  })

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric',
  })

  return (
    <div className="post-it" style={{ padding: '16px 20px 20px' }}>
      {/* Push-pin */}
      <div style={{
        position: 'absolute',
        top: -10, left: '50%', transform: 'translateX(-50%)',
        width: 16, height: 16, borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 35%, #E07A5F, #A04030)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.20)',
        zIndex: 10,
      }} />

      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        borderBottom: '1.5px solid rgba(0,0,0,0.10)',
        paddingBottom: 8, marginBottom: 10,
      }}>
        <span style={{
          fontFamily: "'Permanent Marker', cursive",
          fontSize: 13,
          color: '#3D2A1A',
          letterSpacing: '0.02em',
        }}>
          The Forecast
        </span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9,
          color: '#8A7060',
          letterSpacing: '0.08em',
        }}>
          {today}
        </span>
      </div>

      {/* Body */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[100, 88, 95, 80].map((w, i) => (
            <div key={i} style={{
              height: 12, width: `${w}%`,
              background: 'rgba(0,0,0,0.08)',
              borderRadius: 2,
              animation: 'pulse 1.8s ease-in-out infinite',
            }} />
          ))}
        </div>
      ) : data?.analysis ? (
        <p style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: 13,
          lineHeight: 1.75,
          color: '#3D2A1A',
          margin: 0,
        }}>
          {data.analysis}
        </p>
      ) : (
        <p style={{
          fontFamily: "'Permanent Marker', cursive",
          fontSize: 12,
          color: '#8A7060',
        }}>
          No signal... check the API key.
        </p>
      )}
    </div>
  )
}
