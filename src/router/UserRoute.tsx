import { Navigate } from 'react-router-dom'
import { useCookies } from 'react-cookie'

export default function UserRoute({ children }: { children: React.ReactNode }) {
  const [cookies] = useCookies(['auth_token'])
  if (!cookies.auth_token) return <Navigate to="/" replace />
  return <>{children}</>
}
