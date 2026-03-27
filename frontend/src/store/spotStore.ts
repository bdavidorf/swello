import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserPreferences } from '../types/surf'
import type { SkillLevel, BoardType } from '../types/swelloAI'

export type MobileTab = 'waves' | 'forecast' | 'spots' | 'ai'

export interface PinLatLon { lat: number; lon: number; name: string }

export interface UserProfile {
  skill: SkillLevel
  board: BoardType
  prefers_bigger: boolean
  prefers_cleaner: boolean
  prefers_uncrowded: boolean
  username: string
}

export interface UserLocation {
  lat: number
  lon: number
}

const DEFAULT_PROFILE: UserProfile = {
  skill: 'intermediate',
  board: 'shortboard',
  prefers_bigger: false,
  prefers_cleaner: true,
  prefers_uncrowded: false,
  username: '',
}

interface SpotStore {
  selectedSpotId: string
  setSelectedSpot: (id: string) => void

  pinLatLon: PinLatLon | null
  setPinLatLon: (p: PinLatLon | null) => void

  preferences: UserPreferences
  setPreferences: (prefs: Partial<UserPreferences>) => void

  preferencesOpen: boolean
  setPreferencesOpen: (open: boolean) => void

  aiPanelOpen: boolean
  setAiPanelOpen: (open: boolean) => void

  mobileTab: MobileTab
  setMobileTab: (tab: MobileTab) => void

  // Persistent surf profile
  userProfile: UserProfile
  setUserProfile: (p: Partial<UserProfile>) => void

  // User's GPS location (not persisted — re-requested each session)
  userLocation: UserLocation | null
  setUserLocation: (loc: UserLocation | null) => void

  profileOpen: boolean
  setProfileOpen: (open: boolean) => void

  picksOpen: boolean
  setPicksOpen: (open: boolean) => void
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
      setSelectedSpot: (id) => set({ selectedSpotId: id, ...(id !== 'pin' && { pinLatLon: null }) }),

      pinLatLon: null,
      setPinLatLon: (p) => set({ pinLatLon: p, selectedSpotId: p ? 'pin' : 'malibu' }),

      preferences: DEFAULT_PREFS,
      setPreferences: (prefs) =>
        set((state) => ({ preferences: { ...state.preferences, ...prefs } })),

      preferencesOpen: false,
      setPreferencesOpen: (open) => set({ preferencesOpen: open }),

      aiPanelOpen: false,
      setAiPanelOpen: (open) => set({ aiPanelOpen: open }),

      mobileTab: 'waves',
      setMobileTab: (tab) => set({ mobileTab: tab }),

      userProfile: DEFAULT_PROFILE,
      setUserProfile: (p) =>
        set((state) => ({ userProfile: { ...state.userProfile, ...p } })),

      userLocation: null,
      setUserLocation: (loc) => set({ userLocation: loc }),

      profileOpen: false,
      setProfileOpen: (open) => set({ profileOpen: open }),

      picksOpen: false,
      setPicksOpen: (open) => set({ picksOpen: open }),
    }),
    {
      name: 'surf-forecast-prefs',
      partialize: (state) => ({
        selectedSpotId: state.selectedSpotId === 'pin' ? 'malibu' : state.selectedSpotId,
        preferences: state.preferences,
        userProfile: state.userProfile,
      }),
    }
  )
)
