import { useQuery } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
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
        break_type:  spotMeta?.break_type  ?? '',
        difficulty:  spotMeta?.difficulty  ?? '',
        facing_dir:  spotMeta?.facing_dir  ?? '',
      }),
    staleTime: 5 * 60 * 1000,
    enabled: !!condition,
  })

  return (
    <div className="card-glow px-5 py-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg bg-wave-400/15 flex items-center justify-center">
          <Sparkles size={12} className="text-wave-400" />
        </div>
        <p className="stat-label">Swello AI Analysis</p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <div className="h-3.5 bg-ocean-800/60 rounded-full w-full animate-pulse" />
          <div className="h-3.5 bg-ocean-800/60 rounded-full w-5/6 animate-pulse" />
          <div className="h-3.5 bg-ocean-800/60 rounded-full w-4/5 animate-pulse" />
          <div className="h-3.5 bg-ocean-800/60 rounded-full w-full animate-pulse" />
          <div className="h-3.5 bg-ocean-800/60 rounded-full w-3/4 animate-pulse" />
        </div>
      ) : data?.analysis ? (
        <p className="text-ocean-200 text-sm leading-relaxed">{data.analysis}</p>
      ) : (
        <p className="text-ocean-500 text-sm">Analysis unavailable — check your Gemini API key in Vercel.</p>
      )}
    </div>
  )
}
