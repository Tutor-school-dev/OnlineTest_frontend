import { api } from './client'
import { adminApi } from './admin-client'
import type { TestsResponse } from '../types/test'
import type { QuestionsResponse } from '../types/question'

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

// ── Remove Question ───────────────────────────────────────────────────────────

export async function removeQuestion(testId: string, questionId: string): Promise<{ message: string }> {
  const { data } = await adminApi.delete<{ message: string }>(
    `/admin/online-test/questions?test_id=${testId}&question_id=${questionId}`
  )
  return data
}
