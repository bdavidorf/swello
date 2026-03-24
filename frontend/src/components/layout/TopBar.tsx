import { Settings, RefreshCw, Map } from 'lucide-react'
import { useSpotStore } from '../../store/spotStore'
import { useQueryClient } from '@tanstack/react-query'

export function TopBar() {
  const { setPreferencesOpen, preferencesOpen, setMobileTab, mobileTab } = useSpotStore()
  const qc = useQueryClient()

  return (
    <header
      className="flex items-center justify-between px-4 md:px-6 py-3 border-b flex-shrink-0"
      style={{
        paddingTop: 'max(env(safe-area-inset-top), 12px)',
        background: 'rgba(9,16,26,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderColor: 'rgba(26,48,80,0.60)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <svg width="20" height="14" viewBox="0 0 24 18" fill="none">
          <path d="M2 12c2-4 4-6 7-6 2 0 3 1.5 5 1.5S17 6 20 4"
            stroke="#1AFFD0" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M2 17c2-3 4-5 7-5 2 0 3 1.5 5 1.5S17 12 20 10"
            stroke="#1AFFD0" strokeWidth="1.8" strokeLinecap="round" opacity="0.4" />
        </svg>
        <span style={{
          fontFamily: "'Archivo Black', Impact, system-ui",
          fontSize: 20,
          color: '#EDE8DC',
          letterSpacing: '0.04em',
          lineHeight: 1,
        }}>
          SWELLO
        </span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          color: '#1AFFD0',
          letterSpacing: '0.10em',
          marginLeft: 2,
        }}>
          LA
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => qc.invalidateQueries()}
          className="p-2 rounded-lg transition-colors"
          style={{ color: '#3A5870' }}
          title="Refresh"
        >
          <RefreshCw size={15} />
        </button>
        <button
          onClick={() => setMobileTab(mobileTab === 'spots' ? 'waves' : 'spots')}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '0.06em',
            background: mobileTab === 'spots' ? 'rgba(26,255,208,0.10)' : 'rgba(21,40,64,0.50)',
            borderColor: mobileTab === 'spots' ? 'rgba(26,255,208,0.40)' : 'rgba(26,48,80,0.80)',
            color: mobileTab === 'spots' ? '#1AFFD0' : '#6A8AA0',
          }}
        >
          <Map size={12} /> MAP
        </button>
        <button
          onClick={() => setPreferencesOpen(!preferencesOpen)}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '0.06em',
            background: preferencesOpen ? 'rgba(26,255,208,0.10)' : 'rgba(21,40,64,0.50)',
            borderColor: preferencesOpen ? 'rgba(26,255,208,0.40)' : 'rgba(26,48,80,0.80)',
            color: preferencesOpen ? '#1AFFD0' : '#6A8AA0',
          }}
        >
          <Settings size={12} /> PREFS
        </button>
        <button
          onClick={() => setMobileTab('ai')}
          className="md:hidden p-2 rounded-lg transition-colors"
          style={{ color: '#3A5870' }}
        >
          <Settings size={16} />
        </button>
      </div>
    </header>
  )
}
