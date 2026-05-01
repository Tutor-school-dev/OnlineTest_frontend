import { api } from './client'
import { adminApi } from './admin-client'
import type { TestsResponse } from '../types/test'
import type { QuestionsResponse } from '../types/question'
import type { AttemptsResponse, AttemptDetailsResponse } from '../types/attempt'
import type { DagResponse, ReasoningNode } from '../types/dag'

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface LoginResponse {
  token: string
  modules: string[]
  message: string
}

export async function adminLogin(body: { username: string; password: string }): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/admin/auth/login', body)
  return data
}

// ── Tests ─────────────────────────────────────────────────────────────────────

export async function fetchAdminTests(): Promise<TestsResponse> {
  const { data } = await adminApi.get<TestsResponse>('/admin/online-test/')
  return data
}

// ── Questions (with correct answers) ─────────────────────────────────────────

export async function fetchAdminQuestions(testId: string): Promise<QuestionsResponse> {
  const { data } = await adminApi.get<QuestionsResponse>(
    `/admin/online-test/questions?otq_test_id=${testId}&ans=true`
  )
  return data
}

// ── Add Question ──────────────────────────────────────────────────────────────

export interface AddQuestionOption {
  qo_title: string
  qc_correct: boolean
}

export interface AddQuestionItem {
  qb_title: string
  qb_type: 'SINGLE' | 'MULTIPLE' | 'BLANK' | 'INPUT'
  options: AddQuestionOption[]
  marks?: number
  negative_marks?: number
  qb_answer?: string | null
  qb_parent?: string | null
}

export interface AddQuestionPayload {
  test_id: string
  ques: AddQuestionItem[]
}

export async function addQuestion(payload: AddQuestionPayload): Promise<{ message: string }> {
  const { data } = await adminApi.post<{ message: string }>('/admin/online-test/questions', payload)
  return data
}

// ── Attempts ──────────────────────────────────────────────────────────────────

export async function fetchAttempts(testId: string): Promise<AttemptsResponse> {
  const { data } = await adminApi.get<AttemptsResponse>(
    `/admin/online-test/attempts?ta_test_id=${testId}`
  )
  return data
}

export async function fetchAttemptDetails(attemptId: string): Promise<AttemptDetailsResponse> {
  const { data } = await adminApi.get<AttemptDetailsResponse>(
    `/admin/online-test/attempts/details?tad_attempt_id=${attemptId}`
  )
  return data
}

// ── Remove Question ───────────────────────────────────────────────────────────

export async function removeQuestion(testId: string, questionId: string): Promise<{ message: string }> {
  const { data } = await adminApi.delete<{ message: string }>(
    `/admin/online-test/questions?test_id=${testId}&question_id=${questionId}`
  )
  return data
}

// ── DAG ───────────────────────────────────────────────────────────────────────

export async function fetchDag(dagId: string): Promise<DagResponse> {
  const { data } = await adminApi.get<DagResponse>(`/admin/dag/?dag_id=${dagId}`)
  return data
}

// ── Gap Analysis ──────────────────────────────────────────────────────────────

export interface GapAnalysisApiItem {
  ga_id: string
  node_gaps: string  // JSON-encoded array
  topics: string     // JSON-encoded array
  pitfalls: string   // JSON-encoded array
  mastery: number
  signal: string
}

export interface GapAnalysisApiResponse {
  message: string
  data: GapAnalysisApiItem[]
}

export async function fetchGapAnalysis(gapId: string): Promise<GapAnalysisApiResponse> {
  const { data } = await adminApi.get<GapAnalysisApiResponse>(`/admin/gap/?gap_id=${gapId}`)
  return data
}

// ── DAG Nodes ─────────────────────────────────────────────────────────────────

export interface NodesResponse {
  nodes: ReasoningNode[]
}

export async function fetchNodes(nodeIds: string): Promise<NodesResponse> {
  const { data } = await adminApi.get<NodesResponse>(`/admin/dag/nodes?nodes=${encodeURIComponent(nodeIds)}`)
  return data
}
