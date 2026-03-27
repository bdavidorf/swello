import { BrowserRouter } from 'react-router-dom'
import { TopBar } from './components/layout/TopBar'
import { MobileNav } from './components/layout/MobileNav'
import { MobileSpotPicker } from './components/layout/MobileSpotPicker'
import { SpotMap } from './components/map/SpotMap'
import { DashboardContent } from './pages/DashboardContent'
import { SurfChatWidget } from './components/ai/SurfChat'
import { MapFAB } from './components/map/MapFAB'
import { UserProfileModal } from './components/layout/UserProfileModal'
import { PicksPanel } from './components/layout/PicksPanel'
import { AuthPage } from './pages/AuthPage'
import { ProfileSetupWizard } from './pages/ProfileSetupWizard'
import { useQuery } from '@tanstack/react-query'
import { fetchSpotMeta, fetchSpotRatings } from './api/client'
import { useSpotStore } from './store/spotStore'
import { useAuthStore } from './store/authStore'
import type { SpotMeta } from './types/surf'

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

  const { mobileTab, aiPanelOpen } = useSpotStore()

  return (
    <div className="flex flex-col text-ocean-50"
         style={{ height: '100dvh', overflow: 'hidden' }}>

      <TopBar />

      {/* Spot picker — always on desktop; hidden on mobile when on AI tab or chat is open */}
      {mobileTab !== 'spots' && (
        <div className={(mobileTab === 'ai' || aiPanelOpen) ? 'hidden md:block' : undefined}>
          <MobileSpotPicker spots={spotMeta.data} ratingsMap={ratingsMap} />
        </div>
      )}

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {mobileTab === 'spots' ? (
          <div className="flex-1 flex flex-col overflow-hidden"
               style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 64px)', height: '100%' }}>
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
