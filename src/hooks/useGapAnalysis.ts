import { useQuery } from '@tanstack/react-query'
import { fetchGapAnalysis } from '@/api/admin.api'

export function useGapAnalysis(gapId: string | null) {
  return useQuery({
    queryKey: ['gap-analysis', gapId],
    queryFn: () => fetchGapAnalysis(gapId!),
    enabled: !!gapId,
    staleTime: 10 * 60 * 1000,
  })
}
