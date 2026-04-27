import { useQuery } from '@tanstack/react-query'
import { fetchAdminTests } from '../api/admin.api'

export function useAdminTests() {
  return useQuery({
    queryKey: ['admin-tests'],
    queryFn: fetchAdminTests,
    staleTime: 1000 * 60 * 5,
  })
}
