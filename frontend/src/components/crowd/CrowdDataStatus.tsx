import { useQuery, useMutation } from '@tanstack/react-query'
import { fetchCrowdStatus, triggerCrowdCollect } from '../../api/client'
import { Camera, Users, RefreshCw, CheckCircle } from 'lucide-react'

export function CrowdDataStatus() {
  const status = useQuery({
    queryKey: ['crowd-data-status'],
    queryFn: fetchCrowdStatus,
    refetchInterval: 30_000,
  })

  const collect = useMutation({
    mutationFn: () => triggerCrowdCollect(),
    onSuccess: () => setTimeout(() => status.refetch(), 5000),
  })

  const d = status.data
  if (!d) return null

  const pct = d.progress_pct as number

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="stat-label">Crowd Data Pipeline</p>
        <button
          onClick={() => collect.mutate()}
          disabled={collect.isPending}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-ocean-700 text-ocean-400 hover:text-wave-400 hover:border-wave-400/50 transition-all disabled:opacity-50"
        >
          <Camera size={11} />
          {collect.isPending ? 'Running…' : 'Collect now'}
        </button>
      </div>

      {/* Progress bar toward model retrain */}
      <div>
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-ocean-400">Training data collected</span>
          <span className={pct >= 100 ? 'text-wave-400 font-bold' : 'text-ocean-300'}>
            {d.total_readings} / {d.target_for_retrain}
          </span>
        </div>
        <div className="h-2 bg-ocean-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: pct >= 100 ? '#00d4c8' : pct >= 50 ? '#22c55e' : '#f59e0b',
            }}
          />
        </div>
        <p className="text-ocean-600 text-xs mt-1.5">
          {pct >= 100
            ? '✓ Ready to retrain model with real data'
            : `${d.target_for_retrain - d.total_readings} more readings needed to retrain`}
        </p>
      </div>

      {/* Source breakdown */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-ocean-800/60 rounded-xl p-3 border border-ocean-700/50">
          <div className="flex items-center gap-1.5 mb-1">
            <Users size={12} className="text-ocean-400" />
            <p className="stat-label">User Reports</p>
          </div>
          <p className="text-xl font-bold text-ocean-50">{d.user_reports}</p>
          <p className="text-ocean-500 text-xs mt-0.5">from in-app reports</p>
        </div>
        <div className="bg-ocean-800/60 rounded-xl p-3 border border-ocean-700/50">
          <div className="flex items-center gap-1.5 mb-1">
            <Camera size={12} className="text-ocean-400" />
            <p className="stat-label">Cam Readings</p>
          </div>
          <p className="text-xl font-bold text-ocean-50">{d.cam_readings}</p>
          <p className="text-ocean-500 text-xs mt-0.5">YOLO person counts</p>
        </div>
      </div>

      {collect.data && (
        <div className="flex items-center gap-2 text-xs text-wave-400 bg-wave-400/10 rounded-lg px-3 py-2">
          <CheckCircle size={12} />
          <span>{collect.data.message}</span>
        </div>
      )}

      <p className="text-ocean-600 text-[10px] text-center">
        Cron runs every 30 min · run <code className="text-ocean-400">bash setup_cron.sh</code> in /backend to enable
      </p>
    </div>
  )
}
