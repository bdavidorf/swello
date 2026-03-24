import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Users, CheckCircle } from 'lucide-react'
import clsx from 'clsx'
import type { SurfCondition, CrowdLevel } from '../../types/surf'

interface Props {
  condition: SurfCondition
}

const LEVELS: { level: CrowdLevel; label: string; emoji: string; color: string }[] = [
  { level: 'empty',     label: 'Empty',     emoji: '🏄', color: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30' },
  { level: 'uncrowded', label: 'Uncrowded', emoji: '🤙', color: 'bg-green-500/20 border-green-500/50 text-green-300 hover:bg-green-500/30' },
  { level: 'moderate',  label: 'Moderate',  emoji: '🌊', color: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300 hover:bg-yellow-500/30' },
  { level: 'crowded',   label: 'Crowded',   emoji: '😤', color: 'bg-orange-500/20 border-orange-500/50 text-orange-300 hover:bg-orange-500/30' },
  { level: 'packed',    label: 'Packed',    emoji: '🚫', color: 'bg-red-500/20 border-red-500/50 text-red-300 hover:bg-red-500/30' },
]

async function postCrowdReport(body: object) {
  const resp = await fetch('/api/v1/crowd/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!resp.ok) throw new Error('Failed to submit')
  return resp.json()
}

export function CrowdReportButton({ condition }: Props) {
  const [open, setOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [totalReports, setTotalReports] = useState<number | null>(null)

  const mutation = useMutation({
    mutationFn: (level: CrowdLevel) =>
      postCrowdReport({
        spot_id: condition.spot_id,
        crowd_level: level,
        wvht_ft: condition.buoy.wvht_ft,
        dpd_s: condition.buoy.dpd_s,
        wind_mph: condition.wind?.speed_mph,
        wind_dir: condition.wind?.direction_label,
      }),
    onSuccess: (data) => {
      setTotalReports(data.total_reports_for_spot)
      setSubmitted(true)
      setTimeout(() => { setOpen(false); setSubmitted(false) }, 2500)
    },
  })

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={clsx(
          'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all',
          open
            ? 'bg-ocean-700 border-ocean-500 text-ocean-200'
            : 'bg-ocean-800/60 border-ocean-700/50 text-ocean-400 hover:text-ocean-200 hover:border-ocean-600'
        )}
      >
        <Users size={11} />
        <span>Report crowd</span>
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-20 bg-ocean-800 border border-ocean-700 rounded-2xl p-3 shadow-card w-64">
          {submitted ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <CheckCircle size={22} className="text-emerald-400" />
              <p className="text-ocean-200 text-sm font-semibold">Thanks!</p>
              {totalReports !== null && (
                <p className="text-ocean-400 text-xs text-center">
                  {totalReports} real report{totalReports !== 1 ? 's' : ''} logged for {condition.spot_short_name}.
                  This improves future predictions.
                </p>
              )}
            </div>
          ) : (
            <>
              <p className="text-ocean-300 text-xs font-semibold mb-2.5">
                How crowded is {condition.spot_short_name} right now?
              </p>
              <div className="space-y-1.5">
                {LEVELS.map(({ level, label, emoji, color }) => (
                  <button
                    key={level}
                    onClick={() => mutation.mutate(level)}
                    disabled={mutation.isPending}
                    className={clsx(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all',
                      color,
                      mutation.isPending && 'opacity-50 cursor-wait'
                    )}
                  >
                    <span>{emoji}</span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
              <p className="text-ocean-600 text-[10px] mt-2.5 text-center">
                Your reports train the crowd prediction model
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
