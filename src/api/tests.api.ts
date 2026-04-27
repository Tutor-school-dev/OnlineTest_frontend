import { api } from './client'
import type { TestsResponse } from '../types/test'

export async function fetchTests(): Promise<TestsResponse> {
  const { data } = await api.get<TestsResponse>('/user/online-test')
  return data
}

export interface SubmitPayload {
  test_id: string
  user_id: string
  user_name: string
  time_taken: number
  answers: Record<string, string>
}

export interface SubmitResponse {
  message: string
}

export async function submitTest(payload: SubmitPayload): Promise<SubmitResponse> {
  const { data } = await api.post<SubmitResponse>('/user/online-test/submit', payload)
  return data
}
