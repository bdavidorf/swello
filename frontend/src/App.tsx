import { BrowserRouter } from 'react-router-dom'
import { useRef, useState, useEffect } from 'react'
import { TopBar } from './components/layout/TopBar'
import { MobileNav } from './components/layout/MobileNav'
import { MobileSpotPicker } from './components/layout/MobileSpotPicker'
import { SpotMap } from './components/map/SpotMap'
import { DashboardContent } from './pages/DashboardContent'
import { SurfChatWidget } from './components/ai/SurfChat'
import { MapFAB } from './components/map/MapFAB'
import { UserProfileModal } from './components/layout/UserProfileModal'
import { PicksPanel } from './components/layout/PicksPanel'
import { FriendsPanel } from './components/layout/FriendsPanel'
import { AuthPage } from './pages/AuthPage'
import { ProfileSetupWizard } from './pages/ProfileSetupWizard'
import { useQuery } from '@tanstack/react-query'
import { fetchSpotMeta, fetchSpotRatings, sendFriendRequest, fetchUserProfile } from './api/client'
import { useSpotStore } from './store/spotStore'
import { useAuthStore } from './store/authStore'
import type { SpotMeta } from './types/surf'

const PULL_THRESHOLD = 130  // px of pull needed to trigger refresh

function usePullToRefresh() {
  const startY = useRef(0)
  const [pullY, setPullY] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  function onTouchStart(e: React.TouchEvent) {
    // Only activate when scrolled to the very top
    const el = e.currentTarget as HTMLElement
    if (el.scrollTop > 0) return
    startY.current = e.touches[0].clientY
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!startY.current) return
    const dy = e.touches[0].clientY - startY.current
    if (dy > 0) setPullY(Math.min(dy * 0.45, PULL_THRESHOLD + 16))
  }

  function onTouchEnd() {
    if (pullY >= PULL_THRESHOLD) {
      setRefreshing(true)
      setTimeout(() => window.location.reload(), 300)
    } else {
      setPullY(0)
    }
    startY.current = 0
  }

  return { pullY, refreshing, onTouchStart, onTouchMove, onTouchEnd }
}

function MainApp() {
  const spotMeta = useQuery<SpotMeta[]>({
    queryKey: ['spot-meta'],
    queryFn: fetchSpotMeta,
    staleTime: 60 * 60 * 1000,
  })

  const ratingsQuery = useQuery({
    queryKey: ['spot-ratings'],
    queryFn: fetchSpotRatings,
    staleTime: 2 * 60 * 1000,
    enabled: !!spotMeta.data,
  })

  const ratingsMap = new Map(
    (ratingsQuery.data ?? []).map(r => [r.spot_id, r])
  )

  const { mobileTab, aiPanelOpen, setFriendsOpen, setUserProfile } = useSpotStore()
  const { pullY, refreshing, onTouchStart, onTouchMove, onTouchEnd } = usePullToRefresh()

  // Fetch server-side profile on load and merge into local store
  useEffect(() => {
    fetchUserProfile().then(p => {
      if (p.skill_level) {
        setUserProfile({
          skill: p.skill_level as any,
          board: p.board_type as any,
          prefers_bigger: p.prefers_bigger,
          prefers_cleaner: p.prefers_cleaner,
          prefers_uncrowded: p.prefers_uncrowded,
        })
      }
    }).catch(() => {})
  }, [])

  // Deep-link: ?add=username → auto-send friend request and open Friends panel
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const addUser = params.get('add')
    if (!addUser) return
    // Remove the param from the URL without reloading
    const clean = window.location.pathname
    window.history.replaceState({}, '', clean)
    sendFriendRequest(addUser)
      .then(() => { setFriendsOpen(true) })
      .catch(() => { setFriendsOpen(true) }) // open panel even on error so user sees it
  }, [])

  return (
    <div
      className="flex flex-col text-ocean-50"
      style={{ height: '100dvh', maxHeight: '-webkit-fill-available', overflow: 'hidden', overscrollBehavior: 'none' } as React.CSSProperties}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      {pullY > 0 && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: pullY,
          background: 'rgba(13,28,42,0.92)',
          transition: pullY >= PULL_THRESHOLD ? 'none' : 'height 0.05s',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            border: `2px solid ${pullY >= PULL_THRESHOLD ? '#4ADE80' : 'rgba(120,184,216,0.40)'}`,
            borderTopColor: pullY >= PULL_THRESHOLD ? '#4ADE80' : '#78B8D8',
            animation: pullY >= PULL_THRESHOLD ? 'spin 0.6s linear infinite' : 'none',
            transition: 'border-color 0.2s',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      <TopBar />

      {/* Spot picker — always on desktop; hidden on mobile when on AI tab or chat is open */}
      {mobileTab !== 'spots' && (
        <div className={(mobileTab === 'ai' || aiPanelOpen) ? 'hidden md:block' : undefined}>
          <MobileSpotPicker spots={spotMeta.data} ratingsMap={ratingsMap} />
        </div>
      )}

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {mobileTab === 'spots' ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <SpotMap spots={spotMeta.data} ratingsMap={ratingsMap} />
          </div>
        ) : (
          <DashboardContent />
        )}
      </div>

      <MobileNav />
      <MapFAB />
      <SurfChatWidget />
      <UserProfileModal />
      <PicksPanel />
      <FriendsPanel />
    </div>
  )
}

export default function App() {
  const { token, profileComplete, setAuth, setProfileComplete } = useAuthStore()

  // Not logged in → show auth page
  if (!token) {
    return (
      <BrowserRouter>
        <AuthPage onSuccess={(isNew) => {
          // isNew = came from signup → show wizard
          // On login, profileComplete is already true from previous session
          if (!isNew) setProfileComplete(true)
        }} />
      </BrowserRouter>
    )
  }

  // Logged in but hasn't finished wizard yet
  if (!profileComplete) {
    return (
      <BrowserRouter>
        <ProfileSetupWizard onComplete={() => setProfileComplete(true)} />
      </BrowserRouter>
    )
  }

  // Fully authenticated + profile set up
  return (
    <BrowserRouter>
      <MainApp />
    </BrowserRouter>
  )
}
