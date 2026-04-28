import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UserAuthState {
  userId: string | null
  userName: string | null
  userPicture: string | null
  setAuth: (userId: string, userName: string, userPicture?: string) => void
  clearAuth: () => void
}

export const useUserAuthStore = create<UserAuthState>()(
  persist(
    (set) => ({
      userId: null,
      userName: null,
      userPicture: null,
      setAuth: (userId, userName, userPicture = null) =>
        set({ userId, userName, userPicture }),
      clearAuth: () => set({ userId: null, userName: null, userPicture: null }),
    }),
    { name: 'user-auth' }
  )
)
