import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  token: string | null
  username: string | null
  profileComplete: boolean   // true once the setup wizard has been finished

  setAuth: (token: string, username: string) => void
  setProfileComplete: (v: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      username: null,
      profileComplete: false,

      setAuth: (token, username) => set({ token, username }),
      setProfileComplete: (v) => set({ profileComplete: v }),
      logout: () => set({ token: null, username: null, profileComplete: false }),
    }),
    {
      name: 'swello-auth',
      partialize: (s) => ({ token: s.token, username: s.username, profileComplete: s.profileComplete }),
    }
  )
)
