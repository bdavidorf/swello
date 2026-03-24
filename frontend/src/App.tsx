import { BrowserRouter } from 'react-router-dom'
import { TopBar } from './components/layout/TopBar'
import { MobileNav } from './components/layout/MobileNav'
import { MobileSpotPicker } from './components/layout/MobileSpotPicker'
import { SpotMap } from './components/map/SpotMap'
import { DashboardContent } from './pages/DashboardContent'
import { SurfChatWidget } from './components/ai/SurfChat'
import { useQuery } from '@tanstack/react-query'
import { fetchAllConditions } from './api/client'
import { useSpotStore } from './store/spotStore'

export default function App() {
  const allConditions = useQuery({
    queryKey: ['all-conditions'],
    queryFn: fetchAllConditions,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  })

  const { mobileTab } = useSpotStore()

  return (
    <BrowserRouter>
      <div className="flex flex-col text-ocean-50"
           style={{ height: '100dvh', overflow: 'hidden' }}>

        <TopBar />

        {/* Spot picker — visible on all screen sizes when not on map tab */}
        {mobileTab !== 'spots' && (
          <MobileSpotPicker conditions={allConditions.data} />
        )}

        <div className="flex flex-1 min-h-0 overflow-hidden justify-center">
          {mobileTab === 'spots' ? (
            <div className="flex-1 flex flex-col overflow-hidden"
                 style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 64px)' }}>
              <SpotMap conditions={allConditions.data} />
            </div>
          ) : (
            <DashboardContent />
          )}
        </div>

        <MobileNav />
        <SurfChatWidget />
      </div>
    </BrowserRouter>
  )
}
