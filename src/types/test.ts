export type TestStatus = 'ACTIVE' | 'DONE' | 'PENDING' | 'INACTIVE'

export interface Test {
  ot_id: string
  ot_name: string
  ot_description: string | null
  ot_status: TestStatus
  ot_created_at: string
  ot_updated_at: string
  ot_total_question: number
  ot_total_time: number
}

export interface TestsResponse {
  data: Test[]
  message: string
}
