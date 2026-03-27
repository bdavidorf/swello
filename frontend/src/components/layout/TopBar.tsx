import { Settings, RefreshCw, Map } from 'lucide-react'
import { useSpotStore } from '../../store/spotStore'
import { useQueryClient } from '@tanstack/react-query'

export function TopBar() {
  const { setPreferencesOpen, preferencesOpen, setMobileTab, mobileTab } = useSpotStore()
  const qc = useQueryClient()

  return (
    <header
      className="flex items-center justify-between px-4 md:px-6 flex-shrink-0"
      style={{
        paddingTop: 'max(env(safe-area-inset-top), 14px)',
        paddingBottom: 14,
        background: 'rgba(13,28,42,0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(168,200,220,0.08)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3">
        {/* Retro wave mark */}
        <svg width="28" height="18" viewBox="0 0 28 18" fill="none">
          <path d="M1 11 C4 5, 7 3, 10 3 C13 3, 14 7, 17 7 C20 7, 22 4, 26 2"
            stroke="#78B8D8" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M1 16 C4 11, 7 9, 10 9 C13 9, 14 13, 17 13 C20 13, 22 10, 26 8"
            stroke="#78B8D8" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.4" />
        </svg>
        <span className="font-display" style={{ fontSize: 26, color: '#D8EEF8', letterSpacing: '0.08em', lineHeight: 1 }}>
          SWELLO
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => qc.invalidateQueries()}
          style={{
            padding: '6px 8px', borderRadius: 10, color: '#6AAED0',
            background: 'transparent', border: 'none', cursor: 'pointer',
            transition: 'color 0.2s',
          }}
          title="Refresh"
        >
          <RefreshCw size={15} />
        </button>

        <button
          onClick={() => setMobileTab(mobileTab === 'spots' ? 'waves' : 'spots')}
          className="hidden md:flex items-center gap-1.5"
          style={{
            padding: '6px 14px', borderRadius: 20,
            fontFamily: "'Bangers', Impact, system-ui", fontWeight: 400,
            fontSize: 11, letterSpacing: '0.14em',
            background: mobileTab === 'spots' ? 'rgba(120,184,216,0.18)' : 'rgba(26,48,72,0.60)',
            border: `1px solid ${mobileTab === 'spots' ? 'rgba(120,184,216,0.40)' : 'rgba(168,200,220,0.10)'}`,
            color: mobileTab === 'spots' ? '#78B8D8' : '#6AAED0',
            cursor: 'pointer', transition: 'all 0.2s',
          }}
        >
          <Map size={11} /> MAP
        </button>

        <button
          onClick={() => setPreferencesOpen(!preferencesOpen)}
          className="hidden md:flex items-center gap-1.5"
          style={{
            padding: '6px 14px', borderRadius: 20,
            fontFamily: "'Bangers', Impact, system-ui", fontWeight: 400,
            fontSize: 11, letterSpacing: '0.14em',
            background: preferencesOpen ? 'rgba(120,184,216,0.18)' : 'rgba(26,48,72,0.60)',
            border: `1px solid ${preferencesOpen ? 'rgba(120,184,216,0.40)' : 'rgba(168,200,220,0.10)'}`,
            color: preferencesOpen ? '#78B8D8' : '#6AAED0',
            cursor: 'pointer', transition: 'all 0.2s',
          }}
        >
          <Settings size={11} /> PREFS
        </button>

        <button
          onClick={() => setMobileTab('ai')}
          className="md:hidden"
          style={{ padding: '6px 8px', borderRadius: 10, color: '#6AAED0', background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          <Settings size={16} />
        </button>
      </div>
    </header>
  )
}
