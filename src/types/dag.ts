export interface ReasoningNode {
  rn_id: string
  rn_dag_id: string
  id: string
  label: string
  description: string
  node_type: 'root' | 'intermediate' | 'conclusion'
  is_key_step: boolean
  reasoning_state: string | null
  confidence_score: number | null
  source_signal: string | null
  meta: string | null
}

export interface ReasoningEdge {
  re_id: string
  re_dag_id: string
  from_node: string
  to_node: string
  relation: 'leads_to' | 'required_by' | 'alternative_path'
  edge_type: string | null
}

export interface DagResponse {
  message: string
  nodes: ReasoningNode[]
  edges: ReasoningEdge[]
}
