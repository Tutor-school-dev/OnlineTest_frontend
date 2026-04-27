import type { Question } from './question'

export interface TestAttempt {
  ta_id: string
  ta_test_id: string
  ta_user_id: string
  ta_user_name: string
  ta_created_at: string
  ta_updated_at: string
  ta_is_completed: boolean
  ta_is_evaluated: boolean
  ta_ai_evaluation_done: boolean
  ta_total_marks: number
  ta_total_questions: number
  ta_total_correct_questions: number
  ta_marks_obtained: number
  ta_time_taken: number
}

export interface AttemptsResponse {
  message: string
  data: TestAttempt[]
}

export interface AttemptDetail {
  tad_id: string
  tad_attempt_id: string
  tad_question_id: string
  tad_total_marks: number
  tad_marks_obtained: number
  tad_is_correct: boolean
  tad_answer: string | null
}

export interface AttemptDetailsResponse {
  message: string
  data: AttemptDetail[]
  qbs: Question[]
}
