import { BrowserRouter } from 'react-router-dom'
import { TopBar } from './components/layout/TopBar'
import { SpotSidebar } from './components/layout/SpotSidebar'
import { MobileNav } from './components/layout/MobileNav'
import { MobileSpotPicker } from './components/layout/MobileSpotPicker'
import { MobileSpotList } from './components/layout/MobileSpotList'
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
      <div className="flex flex-col bg-ocean-950 text-ocean-50"
           style={{ height: '100dvh', overflow: 'hidden' }}>

        <TopBar />

        {/* Mobile spot chip picker — hidden on Spots tab (full list shown instead) */}
        {mobileTab !== 'spots' && (
          <MobileSpotPicker conditions={allConditions.data} />
        )}

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Desktop sidebar — hidden on mobile */}
          <div className="hidden md:flex">
            <SpotSidebar
              conditions={allConditions.data}
              loading={allConditions.isLoading}
            />
          </div>

          {/* Mobile spots list — only shown on Spots tab */}
          {mobileTab === 'spots' ? (
            <div className="md:hidden flex-1 overflow-y-auto pb-24"
                 style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 72px)' }}>
              <MobileSpotList
                conditions={allConditions.data}
                loading={allConditions.isLoading}
              />
            </div>
          ) : (
            <DashboardContent />
          )}
        </div>

        {/* Bottom nav — mobile only */}
        <MobileNav />

        {/* Floating chat widget — always visible */}
        <SurfChatWidget />
      </div>
    </BrowserRouter>
  )
}
