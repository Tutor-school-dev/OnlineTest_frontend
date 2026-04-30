import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { X, GitBranch, AlertCircle, BookOpen, BarChart2, Layers } from 'lucide-react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  BackgroundVariant,
  useReactFlow,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Skeleton } from '@/components/ui/skeleton'
import { useDag } from '@/hooks/useDag'
import { useGapAnalysis } from '@/hooks/useGapAnalysis'
import type { ReasoningNode, ReasoningEdge } from '@/types/dag'

// ─── Gap types ────────────────────────────────────────────────────────────────

interface NodeGap { cn_id: string; state: 'ok' | 'partial' | 'wrong' | 'absent'; key: boolean }
interface TopicScore { topic: string; score: number; signal: 'strong' | 'developing' | 'weak' | 'absent' }
interface QuestionPitfall { label: string; severity: 'critical' | 'moderate' | 'minor'; remedy: string }
interface GapAnalysisResult {
  node_gaps: NodeGap[]
  topics: TopicScore[]
  pitfalls: QuestionPitfall[]
  mastery: number
  signal: 'mastered' | 'proficient' | 'developing' | 'fragile' | 'absent'
}

// ─── Node styling constants ───────────────────────────────────────────────────

const NODE_STYLE = {
  root:         { bg: '#ecfdf5', border: '#10b981', badge: 'bg-emerald-100 text-emerald-700' },
  intermediate: { bg: '#eff6ff', border: '#3b82f6', badge: 'bg-blue-100 text-blue-700'     },
  conclusion:   { bg: '#faf5ff', border: '#8b5cf6', badge: 'bg-violet-100 text-violet-700' },
} as const
type NodeType = keyof typeof NODE_STYLE

// Border color driven by gap state (correct DAG side)
const GAP_BORDER: Record<string, string> = {
  ok: '#10b981', partial: '#f59e0b', wrong: '#ef4444', absent: '#94a3b8',
}
// Border color driven by reasoning state (user DAG side)
const REASONING_BORDER: Record<string, string> = {
  correct: '#10b981', partial: '#f59e0b', wrong: '#ef4444', guessed: '#38bdf8',
}
const GAP_BADGE: Record<string, string> = {
  ok:      'bg-emerald-100 text-emerald-700',
  partial: 'bg-amber-100 text-amber-700',
  wrong:   'bg-red-100 text-red-700',
  absent:  'bg-slate-100 text-slate-500',
}
const REASONING_BADGE: Record<string, string> = {
  correct: 'bg-emerald-100 text-emerald-700',
  partial: 'bg-amber-100 text-amber-700',
  wrong:   'bg-red-100 text-red-700',
  guessed: 'bg-sky-100 text-sky-700',
}

interface DagNodeData extends Record<string, unknown> {
  label: string
  description: string
  node_type: NodeType
  is_key_step: boolean
  reasoning_state: string | null
  confidence_score: number | null
  gap_state: 'ok' | 'partial' | 'wrong' | 'absent' | null
  is_focused: boolean
}

// ─── Custom node ──────────────────────────────────────────────────────────────

function DagNode({ data }: NodeProps) {
  const d = data as DagNodeData
  const style = NODE_STYLE[d.node_type] ?? NODE_STYLE.intermediate

  // Priority: gap_state > reasoning_state > node_type default
  const borderColor = d.gap_state
    ? GAP_BORDER[d.gap_state]
    : d.reasoning_state
    ? (REASONING_BORDER[d.reasoning_state] ?? style.border)
    : style.border

  const shadows: string[] = []
  if (d.is_key_step) shadows.push('0 0 0 2px #fbbf24')
  if (d.is_focused)  shadows.push(`0 0 0 ${d.is_key_step ? 5 : 3}px #6366f1, 0 0 18px rgba(99,102,241,0.35)`)

  const isAbsent = d.gap_state === 'absent'

  return (
    <div
      style={{
        background: style.bg,
        border: `2px solid ${borderColor}`,
        width: 220,
        opacity: isAbsent ? 0.5 : 1,
        ...(shadows.length ? { boxShadow: shadows.join(', ') } : {}),
      }}
      className="rounded-xl px-3 py-2.5 shadow-sm select-none"
    >
      <Handle type="target" position={Position.Top}
        style={{ background: '#94a3b8', border: 'none', width: 8, height: 8 }} />

      {/* Type + performance badges row */}
      <div className="flex items-center justify-between mb-1.5 gap-1">
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide shrink-0 ${style.badge}`}>
          {d.node_type}
        </span>
        <div className="flex items-center gap-1 flex-wrap justify-end">
          {d.gap_state && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${GAP_BADGE[d.gap_state]}`}>
              {d.gap_state}
            </span>
          )}
          {d.reasoning_state && !d.gap_state && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${REASONING_BADGE[d.reasoning_state] ?? 'bg-slate-100 text-slate-500'}`}>
              {d.reasoning_state}
            </span>
          )}
          {d.is_key_step && <span className="text-[10px] font-medium text-amber-600 shrink-0">★</span>}
        </div>
      </div>

      <p className="text-sm font-semibold text-slate-800 leading-snug">{d.label}</p>

      {d.description && (
        <p className="text-xs text-slate-500 mt-1 leading-snug line-clamp-2">{d.description}</p>
      )}

      {d.confidence_score != null && (
        <div className="mt-2 flex items-center gap-1.5">
          <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${d.confidence_score}%` }} />
          </div>
          <span className="text-[10px] text-slate-400">{d.confidence_score}%</span>
        </div>
      )}

      <Handle type="source" position={Position.Bottom}
        style={{ background: '#94a3b8', border: 'none', width: 8, height: 8 }} />
    </div>
  )
}

// ─── Section header node (combined view labels) ───────────────────────────────

interface SectionHeaderData extends Record<string, unknown> {
  label: string
  subtitle: string
  accent: string
}

function SectionHeaderNode({ data }: NodeProps) {
  const d = data as SectionHeaderData
  return (
    <div
      style={{ borderColor: d.accent, minWidth: 200 }}
      className="px-4 py-3 rounded-xl bg-white border-2 shadow-md pointer-events-none select-none text-center"
    >
      <p style={{ color: d.accent }} className="text-sm font-bold leading-none">{d.label}</p>
      {d.subtitle && <p className="text-[10px] text-slate-400 mt-1">{d.subtitle}</p>}
    </div>
  )
}

const nodeTypes = { dagNode: DagNode, sectionHeader: SectionHeaderNode }

// ─── Auto-pan to focused node ─────────────────────────────────────────────────

function DagFocuser({ nodeId }: { nodeId: string | null }) {
  const { fitView } = useReactFlow()
  useEffect(() => {
    if (!nodeId) return
    const t = setTimeout(() => {
      try { fitView({ nodes: [{ id: nodeId }], duration: 600, padding: 1.5 }) } catch {}
    }, 100)
    return () => clearTimeout(t)
  }, [nodeId, fitView])
  return null
}

// ─── Layout algorithm ─────────────────────────────────────────────────────────

const NODE_W = 220, NODE_H = 100, H_GAP = 60, V_GAP = 120

function computeLayout(nodes: ReasoningNode[], edges: ReasoningEdge[]): Map<string, { x: number; y: number }> {
  if (nodes.length === 0) return new Map()
  const adj = new Map<string, string[]>()
  const inDeg = new Map<string, number>()
  nodes.forEach(n => { adj.set(n.rn_id, []); inDeg.set(n.rn_id, 0) })
  edges.forEach(e => {
    if (adj.has(e.from_node) && adj.has(e.to_node)) {
      adj.get(e.from_node)!.push(e.to_node)
      inDeg.set(e.to_node, (inDeg.get(e.to_node) ?? 0) + 1)
    }
  })
  const level = new Map<string, number>()
  const queue: string[] = []
  nodes.forEach(n => {
    if ((inDeg.get(n.rn_id) ?? 0) === 0 || n.node_type === 'root') {
      level.set(n.rn_id, 0); queue.push(n.rn_id)
    }
  })
  if (queue.length === 0) { level.set(nodes[0].rn_id, 0); queue.push(nodes[0].rn_id) }
  let head = 0
  while (head < queue.length) {
    const id = queue[head++]
    const l = level.get(id) ?? 0
    adj.get(id)?.forEach(next => {
      if ((level.get(next) ?? -1) < l + 1) { level.set(next, l + 1); queue.push(next) }
    })
  }
  nodes.forEach(n => { if (!level.has(n.rn_id)) level.set(n.rn_id, 1) })
  const byLevel = new Map<number, string[]>()
  level.forEach((l, id) => { if (!byLevel.has(l)) byLevel.set(l, []); byLevel.get(l)!.push(id) })
  const maxCount = Math.max(...Array.from(byLevel.values()).map(ids => ids.length))
  const totalW = maxCount * (NODE_W + H_GAP) - H_GAP
  const positions = new Map<string, { x: number; y: number }>()
  byLevel.forEach((ids, l) => {
    const rowW = ids.length * (NODE_W + H_GAP) - H_GAP
    const startX = (totalW - rowW) / 2
    ids.forEach((id, i) => positions.set(id, { x: startX + i * (NODE_W + H_GAP), y: l * (NODE_H + V_GAP) }))
  })
  return positions
}

function dagBounds(positions: Map<string, { x: number; y: number }>) {
  if (positions.size === 0) return { minX: 0, maxX: NODE_W, minY: 0, maxY: NODE_H }
  const xs = Array.from(positions.values()).map(p => p.x)
  const ys = Array.from(positions.values()).map(p => p.y)
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs) + NODE_W,
    minY: Math.min(...ys),
    maxY: Math.max(...ys) + NODE_H,
  }
}

const EDGE_LOOK = {
  leads_to:         { stroke: '#3b82f6', dash: undefined, animated: true  },
  required_by:      { stroke: '#f59e0b', dash: '6 4',    animated: false },
  alternative_path: { stroke: '#8b5cf6', dash: '2 5',    animated: false },
} as const

function buildEdge(id: string, source: string, target: string, relation: string): Edge {
  const look = EDGE_LOOK[relation as keyof typeof EDGE_LOOK] ?? EDGE_LOOK.leads_to
  return {
    id,
    source,
    target,
    label: relation.replace(/_/g, ' '),
    animated: look.animated,
    type: 'smoothstep',
    style: { stroke: look.stroke, strokeDasharray: look.dash, strokeWidth: 2 },
    labelStyle: { fontSize: 10, fill: '#64748b', fontFamily: 'inherit' },
    labelBgStyle: { fill: '#f8fafc', fillOpacity: 0.95 },
    labelBgPadding: [4, 4] as [number, number],
    labelBgBorderRadius: 4,
  }
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function GraphSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-10 p-8">
      <div className="flex gap-6"><Skeleton className="w-[220px] h-[80px] rounded-xl" /></div>
      <div className="flex gap-6">
        <Skeleton className="w-[220px] h-[80px] rounded-xl" />
        <Skeleton className="w-[220px] h-[80px] rounded-xl" />
      </div>
      <div className="flex gap-6">
        <Skeleton className="w-[220px] h-[80px] rounded-xl" />
        <Skeleton className="w-[220px] h-[80px] rounded-xl" />
        <Skeleton className="w-[220px] h-[80px] rounded-xl" />
      </div>
    </div>
  )
}

function GapSkeleton() {
  return (
    <div className="p-5 space-y-4">
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-5 w-1/4 rounded" />
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
      <Skeleton className="h-5 w-1/4 rounded mt-2" />
      {[1, 2].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
    </div>
  )
}

// ─── MiniMap color helper (shared) ───────────────────────────────────────────

function miniMapColor(n: Node): string {
  const d = n.data as DagNodeData
  if (d.gap_state) return { ok: '#10b981', partial: '#f59e0b', wrong: '#ef4444', absent: '#94a3b8' }[d.gap_state] ?? '#94a3b8'
  if (d.reasoning_state) return { correct: '#10b981', partial: '#f59e0b', wrong: '#ef4444', guessed: '#38bdf8' }[d.reasoning_state] ?? '#94a3b8'
  return { root: '#10b981', intermediate: '#3b82f6', conclusion: '#8b5cf6' }[d.node_type as string] ?? '#94a3b8'
}

// ─── Individual DAG view ──────────────────────────────────────────────────────

const EMPTY_GAP_MAP = new Map<string, NodeGap>()

function DagView({
  dagId,
  nodeGapMap = EMPTY_GAP_MAP,
  focusedNodeId = null,
}: {
  dagId: string
  nodeGapMap?: Map<string, NodeGap>
  focusedNodeId?: string | null
}) {
  const { data, isLoading, isError } = useDag(dagId)

  const { rfNodes, rfEdges } = useMemo(() => {
    const rawNodes = data?.nodes ?? []
    const rawEdges = data?.edges ?? []
    const positions = computeLayout(rawNodes, rawEdges)

    const rfNodes: Node[] = rawNodes.map(n => ({
      id: n.rn_id,
      type: 'dagNode',
      position: positions.get(n.rn_id) ?? { x: 0, y: 0 },
      data: {
        label:            n.label,
        description:      n.description,
        node_type:        n.node_type,
        is_key_step:      n.is_key_step,
        reasoning_state:  n.reasoning_state,
        confidence_score: n.confidence_score,
        gap_state:        nodeGapMap.get(n.rn_id)?.state ?? null,
        is_focused:       focusedNodeId === n.rn_id,
      } satisfies DagNodeData,
    }))

    const rfEdges: Edge[] = rawEdges.map(e =>
      buildEdge(e.re_id || `${e.from_node}-${e.to_node}`, e.from_node, e.to_node, e.relation)
    )

    return { rfNodes, rfEdges }
  }, [data, nodeGapMap, focusedNodeId])

  if (isLoading) return <GraphSkeleton />
  if (isError) return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
      <AlertCircle className="w-10 h-10" /><p className="text-sm">Failed to load reasoning graph</p>
    </div>
  )
  if (rfNodes.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
      <GitBranch className="w-10 h-10" /><p className="text-sm">No reasoning graph generated yet</p>
    </div>
  )

  return (
    <ReactFlow
      nodes={rfNodes} edges={rfEdges} nodeTypes={nodeTypes}
      nodesDraggable={false} nodesConnectable={false} elementsSelectable={false}
      fitView fitViewOptions={{ padding: 0.25 }} className="!bg-slate-50/80"
    >
      <DagFocuser nodeId={focusedNodeId} />
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#cbd5e1" />
      <Controls showInteractive={false} />
      <MiniMap nodeColor={miniMapColor} maskColor="rgba(248,250,252,0.7)" />
    </ReactFlow>
  )
}

// ─── Combined "Overview" view ─────────────────────────────────────────────────

function CombinedView({
  userDagId,
  questionDagId,
  nodeGapMap,
}: {
  userDagId: string
  questionDagId: string
  nodeGapMap: Map<string, NodeGap>
}) {
  const { data: userData,     isLoading: userLoading,     isError: userError     } = useDag(userDagId)
  const { data: questionData, isLoading: questionLoading, isError: questionError } = useDag(questionDagId)

  const { rfNodes, rfEdges } = useMemo(() => {
    const userNodes     = userData?.nodes     ?? []
    const userEdges     = userData?.edges     ?? []
    const questionNodes = questionData?.nodes ?? []
    const questionEdges = questionData?.edges ?? []

    const userPos     = computeLayout(userNodes,     userEdges)
    const questionPos = computeLayout(questionNodes, questionEdges)

    const uBounds = dagBounds(userPos)
    const qBounds = dagBounds(questionPos)

    // Place question DAG to the right of user DAG with a gap
    const SECTION_GAP = 300
    const qOffsetX = uBounds.maxX + SECTION_GAP

    // Section headers sit above the graph
    const HEADER_Y = -110

    const rfNodes: Node[] = []
    const rfEdges: Edge[] = []

    // ── Section headers ──────────────────────────────────────────────────────
    rfNodes.push({
      id: '__hdr_user',
      type: 'sectionHeader',
      position: {
        x: uBounds.minX + (uBounds.maxX - uBounds.minX) / 2 - 100,
        y: HEADER_Y,
      },
      data: {
        label:    "User's Reasoning",
        subtitle: `${userNodes.length} steps`,
        accent:   '#7c3aed',
      } satisfies SectionHeaderData,
      zIndex: 10,
      selectable: false,
    })

    rfNodes.push({
      id: '__hdr_question',
      type: 'sectionHeader',
      position: {
        x: qOffsetX + qBounds.minX + (qBounds.maxX - qBounds.minX) / 2 - 100,
        y: HEADER_Y,
      },
      data: {
        label:    'Ideal Chain',
        subtitle: `${questionNodes.length} steps · gap analysis overlay`,
        accent:   '#059669',
      } satisfies SectionHeaderData,
      zIndex: 10,
      selectable: false,
    })

    // ── User DAG nodes ───────────────────────────────────────────────────────
    for (const n of userNodes) {
      const pos = userPos.get(n.rn_id) ?? { x: 0, y: 0 }
      rfNodes.push({
        id: `u_${n.rn_id}`,
        type: 'dagNode',
        position: pos,
        data: {
          label:            n.label,
          description:      n.description,
          node_type:        n.node_type,
          is_key_step:      n.is_key_step,
          reasoning_state:  n.reasoning_state,
          confidence_score: n.confidence_score,
          gap_state:        null,
          is_focused:       false,
        } satisfies DagNodeData,
      })
    }

    for (const e of userEdges) {
      rfEdges.push(buildEdge(
        `u_${e.re_id || `${e.from_node}-${e.to_node}`}`,
        `u_${e.from_node}`,
        `u_${e.to_node}`,
        e.relation,
      ))
    }

    // ── Question DAG nodes (offset right + gap state overlay) ────────────────
    for (const n of questionNodes) {
      const pos      = questionPos.get(n.rn_id) ?? { x: 0, y: 0 }
      const gapState = nodeGapMap.get(n.rn_id)?.state ?? null
      const isKey    = nodeGapMap.get(n.rn_id)?.key ?? n.is_key_step

      rfNodes.push({
        id: `q_${n.rn_id}`,
        type: 'dagNode',
        position: { x: pos.x + qOffsetX, y: pos.y },
        data: {
          label:            n.label,
          description:      n.description,
          node_type:        n.node_type,
          is_key_step:      isKey,
          reasoning_state:  null,
          confidence_score: null,
          gap_state:        gapState,
          is_focused:       false,
        } satisfies DagNodeData,
      })
    }

    for (const e of questionEdges) {
      rfEdges.push(buildEdge(
        `q_${e.re_id || `${e.from_node}-${e.to_node}`}`,
        `q_${e.from_node}`,
        `q_${e.to_node}`,
        e.relation,
      ))
    }

    return { rfNodes, rfEdges }
  }, [userData, questionData, nodeGapMap])

  if (userLoading || questionLoading) return <GraphSkeleton />

  if (userError || questionError) return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
      <AlertCircle className="w-10 h-10" />
      <p className="text-sm">Failed to load one or more graphs</p>
    </div>
  )

  return (
    <ReactFlow
      nodes={rfNodes} edges={rfEdges} nodeTypes={nodeTypes}
      nodesDraggable={false} nodesConnectable={false} elementsSelectable={false}
      fitView fitViewOptions={{ padding: 0.18 }} className="!bg-slate-50/80"
    >
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#cbd5e1" />
      <Controls showInteractive={false} />
      <MiniMap nodeColor={miniMapColor} maskColor="rgba(248,250,252,0.7)" />
    </ReactFlow>
  )
}

// ─── Gap analysis config & panel ─────────────────────────────────────────────

const MASTERY_CONFIG = {
  mastered:   { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', bar: 'bg-emerald-500' },
  proficient: { color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200',    bar: 'bg-blue-500'   },
  developing: { color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',   bar: 'bg-amber-500'  },
  fragile:    { color: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-200',  bar: 'bg-orange-500' },
  absent:     { color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',     bar: 'bg-red-400'    },
} as const

const TOPIC_BADGE: Record<string, string> = {
  strong: 'bg-emerald-100 text-emerald-700', developing: 'bg-amber-100 text-amber-700',
  weak:   'bg-orange-100 text-orange-700',   absent:     'bg-red-100 text-red-700',
}
const TOPIC_BAR: Record<string, string> = {
  strong: 'bg-emerald-500', developing: 'bg-amber-400', weak: 'bg-orange-400', absent: 'bg-slate-300',
}
const SEVERITY_CLS: Record<string, string> = {
  critical: 'bg-red-50 text-red-700 border-red-200',
  moderate: 'bg-amber-50 text-amber-700 border-amber-200',
  minor:    'bg-slate-50 text-slate-600 border-slate-200',
}
const NODE_ROW_CLS: Record<string, { dot: string; row: string }> = {
  ok:      { dot: 'bg-emerald-500', row: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
  partial: { dot: 'bg-amber-400',   row: 'bg-amber-50 border-amber-200 text-amber-800'      },
  wrong:   { dot: 'bg-red-400',     row: 'bg-red-50 border-red-200 text-red-800'            },
  absent:  { dot: 'bg-slate-300',   row: 'bg-slate-50 border-slate-200 text-slate-500'      },
}

function GapAnalysisPanel({
  gap,
  nodeLabelMap,
  onViewInChain,
}: {
  gap: GapAnalysisResult
  nodeLabelMap: Map<string, string>
  onViewInChain?: (cnId: string) => void
}) {
  const mc = MASTERY_CONFIG[gap.signal] ?? MASTERY_CONFIG.absent

  // Stats
  const stateCounts: Record<string, number> = {}
  gap.node_gaps.forEach(ng => { stateCounts[ng.state] = (stateCounts[ng.state] ?? 0) + 1 })
  const keyStepsMissed = gap.node_gaps.filter(ng => ng.key && (ng.state === 'absent' || ng.state === 'wrong')).length

  return (
    <div className="space-y-5">
      {/* Mastery + quick stats */}
      <div className={`rounded-xl border ${mc.border} ${mc.bg} p-4 space-y-3`}>
        <div className="flex items-center gap-3">
          <div className="text-center shrink-0 w-14">
            <span className={`text-3xl font-bold leading-none ${mc.color}`}>{gap.mastery}</span>
            <span className="text-[10px] text-slate-400 block">/ 100</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-600">Mastery Score</span>
              <span className={`text-xs font-bold capitalize ${mc.color}`}>{gap.signal}</span>
            </div>
            <div className="h-2.5 bg-white/70 rounded-full overflow-hidden border border-white">
              <div className={`h-full ${mc.bar} rounded-full`} style={{ width: `${gap.mastery}%` }} />
            </div>
          </div>
        </div>
        {/* Stat pills */}
        <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-white/60">
          {(['ok', 'partial', 'wrong', 'absent'] as const).map(state => {
            const count = stateCounts[state]
            if (!count) return null
            const s = NODE_ROW_CLS[state]
            return (
              <span key={state} className={`flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${s.row}`}>
                <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
                {count} {state}
              </span>
            )
          })}
          {keyStepsMissed > 0 && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-amber-50 border-amber-200 text-amber-800 ml-auto">
              ★ {keyStepsMissed} key step{keyStepsMissed > 1 ? 's' : ''} missed
            </span>
          )}
        </div>
      </div>

      {/* Reasoning step breakdown — clickable */}
      {gap.node_gaps.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
              Reasoning Steps ({gap.node_gaps.length})
            </p>
            {onViewInChain && (
              <p className="text-[10px] text-slate-400">Click to highlight in Question Chain →</p>
            )}
          </div>
          <div className="space-y-1.5">
            {gap.node_gaps.map((ng, i) => {
              const s = NODE_ROW_CLS[ng.state] ?? NODE_ROW_CLS.absent
              const label = nodeLabelMap.get(ng.cn_id)
              return (
                <div
                  key={i}
                  onClick={() => onViewInChain?.(ng.cn_id)}
                  className={`
                    flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs
                    ${s.row}
                    ${onViewInChain ? 'cursor-pointer hover:brightness-95 active:scale-[0.99] transition-all' : ''}
                  `}
                >
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.dot}`} />
                  <span className="flex-1 font-medium truncate">
                    {label ?? <span className="font-mono text-[10px] opacity-60">{ng.cn_id}</span>}
                  </span>
                  {ng.key && <span className="text-[10px] font-bold text-amber-600 shrink-0">★ key</span>}
                  <span className="font-bold capitalize shrink-0">{ng.state}</span>
                  {onViewInChain && <span className="text-violet-400 font-bold shrink-0">→</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Topic scores */}
      {gap.topics.length > 0 && (
        <div className="space-y-2.5">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Topic Scores</p>
          {gap.topics.map((t, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">{t.topic}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-semibold text-slate-500">{t.score}%</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${TOPIC_BADGE[t.signal] ?? TOPIC_BADGE.absent}`}>
                    {t.signal}
                  </span>
                </div>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${TOPIC_BAR[t.signal] ?? TOPIC_BAR.absent}`} style={{ width: `${t.score}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pitfalls */}
      {gap.pitfalls.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Pitfalls</p>
          {gap.pitfalls.map((p, i) => (
            <div key={i} className={`px-3 py-2.5 rounded-lg border text-sm ${SEVERITY_CLS[p.severity] ?? SEVERITY_CLS.minor}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="font-bold capitalize">{p.severity}</span>
                <span className="font-medium">· {p.label}</span>
              </div>
              <p className="opacity-75 text-xs leading-relaxed">{p.remedy}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function GapView({
  gap, isLoading, isError, nodeLabelMap, onViewInChain,
}: {
  gap: GapAnalysisResult | null
  isLoading: boolean
  isError: boolean
  nodeLabelMap: Map<string, string>
  onViewInChain?: (cnId: string) => void
}) {
  if (isLoading) return <GapSkeleton />
  if (isError) return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
      <AlertCircle className="w-10 h-10" /><p className="text-sm">Failed to load gap analysis</p>
    </div>
  )
  if (!gap) return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
      <BarChart2 className="w-10 h-10" />
      <p className="text-sm">Gap analysis is still being computed</p>
      <p className="text-xs text-slate-300">Check back shortly</p>
    </div>
  )
  return (
    <div className="overflow-y-auto h-full p-5">
      <GapAnalysisPanel gap={gap} nodeLabelMap={nodeLabelMap} onViewInChain={onViewInChain} />
    </div>
  )
}

// ─── Tab definitions ──────────────────────────────────────────────────────────

export type AnalysisTab = 'overview' | 'user' | 'question' | 'gap'

export interface AnalysisTarget {
  userDagId?:     string | null
  questionDagId?: string | null
  gapId?:         string | null
  title:          string
  defaultTab:     AnalysisTab
}

const TAB_META: { id: AnalysisTab; label: string; Icon: typeof GitBranch }[] = [
  { id: 'overview',  label: 'Overview',        Icon: Layers    },
  { id: 'user',      label: 'User Chain',       Icon: GitBranch },
  { id: 'question',  label: 'Question Chain',   Icon: BookOpen  },
  { id: 'gap',       label: 'Gap Analysis',     Icon: BarChart2 },
]

const TAB_COLOR: Record<AnalysisTab, string> = {
  overview:  'text-indigo-600 border-indigo-500',
  user:      'text-violet-600 border-violet-500',
  question:  'text-emerald-600 border-emerald-500',
  gap:       'text-amber-600 border-amber-500',
}

const EMPTY_LABEL_MAP = new Map<string, string>()

// ─── Legend components ────────────────────────────────────────────────────────

function DagLegend({ showGap }: { showGap: boolean }) {
  return (
    <div className="hidden md:flex items-center gap-3 text-[11px] text-slate-400 ml-auto pb-2.5 shrink-0 flex-wrap">
      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" />root</span>
      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" />intermediate</span>
      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-400" />conclusion</span>
      <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded bg-amber-400" />key</span>
      {showGap && (
        <>
          <span className="w-px h-3 bg-slate-200 mx-0.5" />
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />ok</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />partial</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" />wrong</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300" />absent</span>
        </>
      )}
    </div>
  )
}

function OverviewLegend() {
  return (
    <div className="hidden md:flex items-center gap-3 text-[11px] text-slate-400 ml-auto pb-2.5 shrink-0 flex-wrap">
      <span className="text-violet-500 font-semibold">User</span>
      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />correct</span>
      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />partial</span>
      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" />wrong</span>
      <span className="w-px h-3 bg-slate-200 mx-0.5" />
      <span className="text-emerald-600 font-semibold">Ideal</span>
      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />ok</span>
      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />partial</span>
      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" />wrong</span>
      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300" />absent</span>
    </div>
  )
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function GraphModal({
  userDagId,
  questionDagId,
  gapId,
  title,
  defaultTab,
  onClose,
}: AnalysisTarget & { onClose: () => void }) {
  const available: Record<AnalysisTab, boolean> = {
    overview:  !!userDagId && !!questionDagId,
    user:      !!userDagId,
    question:  !!questionDagId,
    gap:       !!gapId,
  }

  const resolvedDefault = available[defaultTab]
    ? defaultTab
    : (TAB_META.find(t => available[t.id])?.id ?? 'user')

  const [tab, setTab] = useState<AnalysisTab>(resolvedDefault)
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null)

  // Fetch gap + both DAGs at modal level (for cross-tab sharing + prefetch)
  const { data: gapApiData, isLoading: gapLoading, isError: gapError } = useGapAnalysis(gapId ?? null)
  const { data: questionDagData } = useDag(questionDagId ?? null)
  // Prefetch user DAG so Overview loads instantly
  useDag(userDagId ?? null)

  const parsedGap = useMemo<GapAnalysisResult | null>(() => {
    const raw = Array.isArray(gapApiData?.data) ? gapApiData.data[0] : null
    if (!raw) return null
    try {
      return {
        node_gaps: JSON.parse(raw.node_gaps),
        topics:    JSON.parse(raw.topics),
        pitfalls:  JSON.parse(raw.pitfalls),
        mastery:   raw.mastery,
        signal:    raw.signal as GapAnalysisResult['signal'],
      }
    } catch { return null }
  }, [gapApiData])

  const nodeGapMap = useMemo(() => {
    const map = new Map<string, NodeGap>()
    parsedGap?.node_gaps.forEach(ng => map.set(ng.cn_id, ng))
    return map
  }, [parsedGap])

  const nodeLabelMap = useMemo(() => {
    const map = new Map<string, string>()
    questionDagData?.nodes.forEach(n => map.set(n.rn_id, n.label))
    return map
  }, [questionDagData])

  const handleViewInChain = (cnId: string) => {
    setFocusedNodeId(cnId)
    setTab('question')
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 12 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col overflow-hidden"
        style={{ height: 'min(92vh, 800px)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-0 shrink-0">
          <div className="min-w-0">
            <p className="text-xs text-slate-400 leading-none mb-0.5">Analysis</p>
            <p className="text-sm font-semibold text-slate-800 truncate max-w-xl">{title}</p>
          </div>
          <button onClick={onClose}
            className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex items-end px-5 mt-3 border-b border-slate-200 shrink-0 overflow-x-auto">
          {TAB_META.map(({ id, label, Icon }) => {
            const isActive = tab === id
            const isAvail  = available[id]
            return (
              <button
                key={id}
                onClick={() => isAvail && setTab(id)}
                disabled={!isAvail}
                className={`
                  flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors shrink-0
                  ${isActive
                    ? `${TAB_COLOR[id]} border-current`
                    : isAvail
                    ? 'text-slate-500 border-transparent hover:text-slate-700 hover:border-slate-300'
                    : 'text-slate-300 border-transparent cursor-not-allowed'
                  }
                `}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                {!isAvail && <span className="text-[9px] font-normal opacity-60 ml-0.5">N/A</span>}
              </button>
            )
          })}

          {/* Dynamic legend in tab bar */}
          {tab === 'overview' && <OverviewLegend />}
          {(tab === 'user' || tab === 'question') && (
            <DagLegend showGap={tab === 'question' && nodeGapMap.size > 0} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 relative">
          {tab === 'overview' && userDagId && questionDagId && (
            <CombinedView
              userDagId={userDagId}
              questionDagId={questionDagId}
              nodeGapMap={nodeGapMap}
            />
          )}
          {tab === 'user' && userDagId && (
            <DagView dagId={userDagId} />
          )}
          {tab === 'question' && questionDagId && (
            <DagView dagId={questionDagId} nodeGapMap={nodeGapMap} focusedNodeId={focusedNodeId} />
          )}
          {tab === 'gap' && (
            <GapView
              gap={parsedGap}
              isLoading={gapLoading}
              isError={gapError}
              nodeLabelMap={nodeLabelMap.size > 0 ? nodeLabelMap : EMPTY_LABEL_MAP}
              onViewInChain={questionDagId ? handleViewInChain : undefined}
            />
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
