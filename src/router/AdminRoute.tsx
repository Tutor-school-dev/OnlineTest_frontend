import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore(s => s.token)
  if (!token) return <Navigate to="/admin/login" replace />
  return <>{children}</>
}
