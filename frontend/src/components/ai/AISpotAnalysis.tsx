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
    weekday: 'short', month: 'short', day: 'numeric',
  }).toUpperCase()

  return (
    <div className="forecasters-log" style={{ padding: '14px 18px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
        paddingBottom: 10,
        borderBottom: '1px solid rgba(237,232,220,0.10)',
      }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 8,
          letterSpacing: '0.18em',
          color: '#FF6B2B',
          textTransform: 'uppercase',
        }}>
          ◆ FORECASTER'S LOG
        </span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 8,
          letterSpacing: '0.12em',
          color: '#3A5870',
        }}>
          — {today}
        </span>
      </div>

      {/* Body */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[100, 85, 92, 78, 88].map((w, i) => (
            <div key={i} style={{
              height: 13,
              width: `${w}%`,
              background: 'rgba(26,48,80,0.50)',
              borderRadius: 2,
              animation: 'pulse 1.8s ease-in-out infinite',
            }} />
          ))}
        </div>
      ) : data?.analysis ? (
        <p style={{
          fontFamily: "'Lora', Georgia, serif",
          fontSize: 13.5,
          lineHeight: 1.80,
          color: '#C8D8E4',
          fontStyle: 'italic',
          margin: 0,
          position: 'relative',
          zIndex: 1,
        }}>
          {data.analysis}
        </p>
      ) : (
        <p style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          color: '#3A5870',
        }}>
          Analysis unavailable — check Gemini API key.
        </p>
      )}
    </div>
  )
}
