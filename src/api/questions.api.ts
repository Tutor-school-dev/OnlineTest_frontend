import { api } from './client'
import type { QuestionsResponse } from '../types/question'

export async function fetchQuestions(testId: string): Promise<QuestionsResponse> {
  const { data } = await api.get<QuestionsResponse>(`/user/online-test/questions?otq_test_id=${testId}`)
  return data
}
