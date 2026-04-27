import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  token: string | null
  modules: string[]
  setAuth: (token: string, modules: string[]) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      modules: [],
      setAuth: (token, modules) => set({ token, modules }),
      clearAuth: () => set({ token: null, modules: [] }),
    }),
    { name: 'admin-auth' }
  )
)
