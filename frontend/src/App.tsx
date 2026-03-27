import { BrowserRouter } from 'react-router-dom'
import { TopBar } from './components/layout/TopBar'
import { MobileNav } from './components/layout/MobileNav'
import { MobileSpotPicker } from './components/layout/MobileSpotPicker'
import { SpotMap } from './components/map/SpotMap'
import { DashboardContent } from './pages/DashboardContent'
import { SurfChatWidget } from './components/ai/SurfChat'
import { MapFAB } from './components/map/MapFAB'
import { UserProfileModal } from './components/layout/UserProfileModal'
import { useQuery } from '@tanstack/react-query'
import { fetchSpotMeta, fetchSpotRatings } from './api/client'
import { useSpotStore } from './store/spotStore'
import type { SpotMeta } from './types/surf'

export default function App() {
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
    <BrowserRouter>
      <div className="flex flex-col text-ocean-50"
           style={{ height: '100dvh', overflow: 'hidden' }}>

        <TopBar />

        {/* Spot picker — hidden on map tab, AI tab, and when chat is open */}
        {mobileTab !== 'spots' && mobileTab !== 'ai' && !aiPanelOpen && (
          <MobileSpotPicker spots={spotMeta.data} ratingsMap={ratingsMap} />
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
      </div>
    </BrowserRouter>
  )
}
