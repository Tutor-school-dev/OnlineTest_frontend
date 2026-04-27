import axios from 'axios'

export const adminApi = axios.create({
  baseURL: import.meta.env.VITE_APP_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Reads token from Zustand persist storage to avoid circular imports
adminApi.interceptors.request.use(config => {
  try {
    const stored = localStorage.getItem('admin-auth')
    if (stored) {
      const { state } = JSON.parse(stored) as { state: { token: string | null } }
      if (state?.token) {
        config.headers.Authorization = `Bearer ${state.token}`
      }
    }
  } catch {}
  return config
})
