import { Settings, RefreshCw, Map } from 'lucide-react'
import { useSpotStore } from '../../store/spotStore'
import { useQueryClient } from '@tanstack/react-query'

export function TopBar() {
  const { setPreferencesOpen, preferencesOpen, setMobileTab, mobileTab } = useSpotStore()
  const qc = useQueryClient()

  return (
    <header
      className="flex items-center justify-between px-4 md:px-5 py-3 border-b border-ocean-700/60 bg-ocean-950/90 backdrop-blur sticky top-0 z-50 flex-shrink-0"
      style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-wave-400/15 border border-wave-400/30 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M2 16c2-4 4-6 7-6 2 0 3 1.5 5 1.5S17 10 20 8"
              stroke="#00d4c8"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M2 20c2-3 4-5 7-5 2 0 3 1.5 5 1.5S17 14 20 12"
              stroke="#00d4c8"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.5"
              fill="none"
            />
          </svg>
        </div>
        <div>
          <span className="font-black text-ocean-50 text-lg tracking-tight">Swello</span>
          <span className="text-wave-400 text-xs font-medium ml-1.5">LA</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => qc.invalidateQueries()}
          className="p-2 text-ocean-400 hover:text-wave-400 transition-colors rounded-lg hover:bg-wave-400/10"
          title="Refresh"
        >
          <RefreshCw size={16} />
        </button>
        {/* Desktop Explore/Map button */}
        <button
          onClick={() => setMobileTab(mobileTab === 'spots' ? 'waves' : 'spots')}
          className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
            mobileTab === 'spots'
              ? 'bg-wave-400/15 border-wave-400/40 text-wave-400'
              : 'border-ocean-700 text-ocean-300 hover:border-wave-400/50 hover:text-ocean-50'
          }`}
        >
          <Map size={13} />
          Explore
        </button>
        {/* Desktop preferences button */}
        <button
          onClick={() => setPreferencesOpen(!preferencesOpen)}
          className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
            preferencesOpen
              ? 'bg-wave-400/15 border-wave-400/40 text-wave-400'
              : 'border-ocean-700 text-ocean-300 hover:border-wave-400/50 hover:text-ocean-50'
          }`}
        >
          <Settings size={13} />
          Preferences
        </button>
        {/* Mobile preferences icon — navigates to AI tab */}
        <button
          onClick={() => setMobileTab('ai')}
          className="md:hidden p-2 text-ocean-400 hover:text-wave-400 transition-colors rounded-lg hover:bg-wave-400/10"
          title="AI & Preferences"
        >
          <Settings size={16} />
        </button>
      </div>
    </header>
  )
}
