export type QuestionType = 'SINGLE' | 'MULTIPLE' | 'BLANK' | 'INPUT'

export interface QuestionOption {
  qo_id: string
  qo_title: string
  qo_meta: string | null
  qo_created_at: string
  qo_updated_at: string
  qo_question: string
  qc_correct: boolean
}

export interface Question {
  qb_id: string
  qb_title: string
  qb_meta: string | null
  qb_type: QuestionType
  qb_answer: string | null
  qb_created_at: string
  qb_updated_at: string
  qb_parent: string | null
  qb_analysis_status: string
  options: QuestionOption[]
}

export interface QuestionsResponse {
  data: Question[]
  message: string
}
