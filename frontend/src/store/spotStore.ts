import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserPreferences } from '../types/surf'

export type MobileTab = 'waves' | 'forecast' | 'spots' | 'ai'

interface SpotStore {
  selectedSpotId: string
  setSelectedSpot: (id: string) => void

  preferences: UserPreferences
  setPreferences: (prefs: Partial<UserPreferences>) => void

  preferencesOpen: boolean
  setPreferencesOpen: (open: boolean) => void

  aiPanelOpen: boolean
  setAiPanelOpen: (open: boolean) => void

  mobileTab: MobileTab
  setMobileTab: (tab: MobileTab) => void
}

const DEFAULT_PREFS: UserPreferences = {
  min_wave_height_ft: 2,
  max_wave_height_ft: 8,
  preferred_period_s: 12,
  max_wind_speed_mph: 12,
  max_crowd_score: 55,
  experience_level: 'intermediate',
}

export const useSpotStore = create<SpotStore>()(
  persist(
    (set) => ({
      selectedSpotId: 'malibu',
      setSelectedSpot: (id) => set({ selectedSpotId: id }),

      preferences: DEFAULT_PREFS,
      setPreferences: (prefs) =>
        set((state) => ({ preferences: { ...state.preferences, ...prefs } })),

      preferencesOpen: false,
      setPreferencesOpen: (open) => set({ preferencesOpen: open }),

      aiPanelOpen: false,
      setAiPanelOpen: (open) => set({ aiPanelOpen: open }),

      mobileTab: 'waves',
      setMobileTab: (tab) => set({ mobileTab: tab }),
    }),
    {
      name: 'surf-forecast-prefs',
      partialize: (state) => ({
        selectedSpotId: state.selectedSpotId,
        preferences: state.preferences,
      }),
    }
  )
)
