import { useQuery } from '@tanstack/react-query'
import { fetchGapAnalysis } from '@/api/admin.api'
import { fetchUserGapAnalysis } from '@/api/tests.api'

export function useGapAnalysis(gapId: string | null, variant: 'admin' | 'user' = 'admin') {
  return useQuery({
    queryKey: ['gap-analysis', gapId, variant],
    queryFn: () => variant === 'user' ? fetchUserGapAnalysis(gapId!) : fetchGapAnalysis(gapId!),
    enabled: !!gapId,
    staleTime: 10 * 60 * 1000,
  })
}
