import { api } from './client'
import type { TestsResponse } from '../types/test'
import type { AttemptsResponse, AttemptDetailsResponse } from '../types/attempt'
import type { DagResponse } from '../types/dag'

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

export async function fetchUserAttempts(testId: string, userId: string): Promise<AttemptsResponse> {
  const { data } = await api.get<AttemptsResponse>(
    `/user/online-test/attempts?ta_test_id=${testId}&ta_user_id=${userId}`
  )
  return data
}

export async function fetchUserAttemptDetails(attemptId: string): Promise<AttemptDetailsResponse> {
  const { data } = await api.get<AttemptDetailsResponse>(
    `/user/online-test/attempts/details?tad_attempt_id=${attemptId}`
  )
  return data
}

export interface UserGapAnalysisItem {
  ga_id: string
  node_gaps: string
  topics: string
  pitfalls: string
  mastery: number
  signal: string
}

export interface UserGapAnalysisResponse {
  message: string
  data: UserGapAnalysisItem[]
}

export async function fetchUserGapAnalysis(gapId: string): Promise<UserGapAnalysisResponse> {
  const { data } = await api.get<UserGapAnalysisResponse>(`/user/gap/?gap_id=${gapId}`)
  return data
}

export async function fetchUserDag(dagId: string): Promise<DagResponse> {
  const { data } = await api.get<DagResponse>(`/user/dag/?dag_id=${dagId}`)
  return data
}

export interface UserNodesResponse {
  nodes: import('../types/dag').ReasoningNode[]
}

export async function fetchUserNodes(nodeIds: string): Promise<UserNodesResponse> {
  const { data } = await api.get<UserNodesResponse>(`/user/dag/nodes?nodes=${encodeURIComponent(nodeIds)}`)
  return data
}
