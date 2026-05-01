import { useQuery } from '@tanstack/react-query'
import { fetchNodes } from '@/api/admin.api'

export function useNodes(nodeIds: string | null) {
  return useQuery({
    queryKey: ['nodes', nodeIds],
    queryFn: () => fetchNodes(nodeIds!),
    enabled: !!nodeIds,
    staleTime: 10 * 60 * 1000,
  })
}
