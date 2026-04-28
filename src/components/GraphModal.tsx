import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { X, GitBranch, AlertCircle } from 'lucide-react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  BackgroundVariant,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Skeleton } from '@/components/ui/skeleton'
import { useDag } from '@/hooks/useDag'
import type { ReasoningNode, ReasoningEdge } from '@/types/dag'

// ─── Node styling ─────────────────────────────────────────────────────────────

const NODE_STYLE = {
  root: {
    bg: '#ecfdf5',
    border: '2px solid #10b981',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  intermediate: {
    bg: '#eff6ff',
    border: '2px solid #3b82f6',
    badge: 'bg-blue-100 text-blue-700',
  },
  conclusion: {
    bg: '#faf5ff',
    border: '2px solid #8b5cf6',
    badge: 'bg-violet-100 text-violet-700',
  },
} as const

type NodeType = keyof typeof NODE_STYLE

interface DagNodeData extends Record<string, unknown> {
  label: string
  description: string
  node_type: NodeType
  is_key_step: boolean
  reasoning_state: string | null
  confidence_score: number | null
}

// ─── Custom node ──────────────────────────────────────────────────────────────

function DagNode({ data }: NodeProps) {
  const d = data as DagNodeData
  const style = NODE_STYLE[d.node_type] ?? NODE_STYLE.intermediate

  return (
    <div
      style={{ background: style.bg, border: style.border, width: 220 }}
      className={`rounded-xl px-3 py-2.5 shadow-sm select-none ${
        d.is_key_step ? 'ring-2 ring-amber-400 ring-offset-1' : ''
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#94a3b8', border: 'none', width: 8, height: 8 }}
      />

      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${style.badge}`}>
          {d.node_type}
        </span>
        {d.is_key_step && (
          <span className="text-[10px] font-medium text-amber-600">★ key</span>
        )}
      </div>

      <p className="text-sm font-semibold text-slate-800 leading-snug">{d.label}</p>

      {d.description && (
        <p className="text-xs text-slate-500 mt-1 leading-snug line-clamp-3">
          {d.description}
        </p>
      )}

      {d.confidence_score != null && (
        <div className="mt-2 flex items-center gap-1.5">
          <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${d.confidence_score}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400">{d.confidence_score}%</span>
        </div>
      )}

      {d.reasoning_state && (
        <div className="mt-1.5">
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
            d.reasoning_state === 'correct'  ? 'bg-emerald-100 text-emerald-700' :
            d.reasoning_state === 'partial'  ? 'bg-amber-100 text-amber-700' :
            d.reasoning_state === 'guessed' ? 'bg-sky-100 text-sky-700' :
            'bg-red-100 text-red-700'
          }`}>
            {d.reasoning_state}
          </span>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#94a3b8', border: 'none', width: 8, height: 8 }}
      />
    </div>
  )
}

const nodeTypes = { dagNode: DagNode }

// ─── Layout algorithm ─────────────────────────────────────────────────────────

const NODE_W = 220
const NODE_H = 90
const H_GAP = 60
const V_GAP = 120

function computeLayout(
  nodes: ReasoningNode[],
  edges: ReasoningEdge[],
): Map<string, { x: number; y: number }> {
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

  // Longest-path level assignment (Kahn-style BFS)
  const level = new Map<string, number>()
  const queue: string[] = []

  nodes.forEach(n => {
    if ((inDeg.get(n.rn_id) ?? 0) === 0 || n.node_type === 'root') {
      level.set(n.rn_id, 0)
      queue.push(n.rn_id)
    }
  })
  if (queue.length === 0) { level.set(nodes[0].rn_id, 0); queue.push(nodes[0].rn_id) }

  let head = 0
  while (head < queue.length) {
    const id = queue[head++]
    const l = level.get(id) ?? 0
    adj.get(id)?.forEach(next => {
      const prev = level.get(next) ?? -1
      if (l + 1 > prev) {
        level.set(next, l + 1)
        queue.push(next)
      }
    })
  }
  nodes.forEach(n => { if (!level.has(n.rn_id)) level.set(n.rn_id, 1) })

  // Group by level
  const byLevel = new Map<number, string[]>()
  level.forEach((l, id) => {
    if (!byLevel.has(l)) byLevel.set(l, [])
    byLevel.get(l)!.push(id)
  })

  const maxCount = Math.max(...Array.from(byLevel.values()).map(ids => ids.length))
  const totalW = maxCount * (NODE_W + H_GAP) - H_GAP

  const positions = new Map<string, { x: number; y: number }>()
  byLevel.forEach((ids, l) => {
    const rowW = ids.length * (NODE_W + H_GAP) - H_GAP
    const startX = (totalW - rowW) / 2
    ids.forEach((id, i) => {
      positions.set(id, {
        x: startX + i * (NODE_W + H_GAP),
        y: l * (NODE_H + V_GAP),
      })
    })
  })

  return positions
}

// ─── Edge appearance by relation ──────────────────────────────────────────────

const EDGE_LOOK = {
  leads_to:        { stroke: '#3b82f6', dash: undefined,  animated: true  },
  required_by:     { stroke: '#f59e0b', dash: '6 4',      animated: false },
  alternative_path:{ stroke: '#8b5cf6', dash: '2 5',      animated: false },
} as const

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function GraphSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-10">
      <div className="flex gap-6 justify-center">
        <Skeleton className="w-[220px] h-[80px] rounded-xl" />
      </div>
      <div className="flex gap-6 justify-center">
        <Skeleton className="w-[220px] h-[80px] rounded-xl" />
        <Skeleton className="w-[220px] h-[80px] rounded-xl" />
      </div>
      <div className="flex gap-6 justify-center">
        <Skeleton className="w-[220px] h-[80px] rounded-xl" />
        <Skeleton className="w-[220px] h-[80px] rounded-xl" />
        <Skeleton className="w-[220px] h-[80px] rounded-xl" />
      </div>
      <div className="flex gap-6 justify-center">
        <Skeleton className="w-[220px] h-[80px] rounded-xl" />
      </div>
    </div>
  )
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function GraphModal({
  dagId,
  questionTitle,
  onClose,
}: {
  dagId: string
  questionTitle: string
  onClose: () => void
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
        label: n.label,
        description: n.description,
        node_type: n.node_type,
        is_key_step: n.is_key_step,
        reasoning_state: n.reasoning_state,
        confidence_score: n.confidence_score,
      } satisfies DagNodeData,
    }))

    const rfEdges: Edge[] = rawEdges.map(e => {
      const look = EDGE_LOOK[e.relation as keyof typeof EDGE_LOOK] ?? EDGE_LOOK.leads_to
      return {
        id: e.re_id || `${e.from_node}-${e.to_node}`,
        source: e.from_node,
        target: e.to_node,
        label: e.relation.replace(/_/g, ' '),
        animated: look.animated,
        type: 'smoothstep',
        style: {
          stroke: look.stroke,
          strokeDasharray: look.dash,
          strokeWidth: 2,
        },
        labelStyle: { fontSize: 10, fill: '#64748b', fontFamily: 'inherit' },
        labelBgStyle: { fill: '#f8fafc', fillOpacity: 0.95 },
        labelBgPadding: [4, 4] as [number, number],
        labelBgBorderRadius: 4,
      }
    })

    return { rfNodes, rfEdges }
  }, [data])

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
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden"
        style={{ height: 'min(90vh, 720px)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="shrink-0 w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
              <GitBranch className="w-4 h-4 text-violet-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-400 leading-none mb-0.5">Reasoning Graph</p>
              <p className="text-sm font-semibold text-slate-800 truncate max-w-lg">{questionTitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0 ml-4">
            {/* Legend */}
            <div className="hidden md:flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />root
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400 shrink-0" />intermediate
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-400 shrink-0" />conclusion
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 rounded bg-amber-400 ring-1 ring-amber-400 shrink-0" />key step
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 min-h-0 relative">
          {isLoading ? (
            <GraphSkeleton />
          ) : isError ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
              <AlertCircle className="w-10 h-10" />
              <p className="text-sm">Failed to load reasoning graph</p>
            </div>
          ) : rfNodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
              <GitBranch className="w-10 h-10" />
              <p className="text-sm">No reasoning graph generated for this question yet</p>
            </div>
          ) : (
            <ReactFlow
              nodes={rfNodes}
              edges={rfEdges}
              nodeTypes={nodeTypes}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={false}
              fitView
              fitViewOptions={{ padding: 0.25 }}
              className="!bg-slate-50/80"
            >
              <Background
                variant={BackgroundVariant.Dots}
                gap={20}
                size={1}
                color="#cbd5e1"
              />
              <Controls showInteractive={false} />
              <MiniMap
                nodeColor={n => {
                  const colors: Record<string, string> = {
                    root: '#10b981',
                    intermediate: '#3b82f6',
                    conclusion: '#8b5cf6',
                  }
                  return colors[(n.data as DagNodeData).node_type] ?? '#94a3b8'
                }}
                maskColor="rgba(248,250,252,0.7)"
              />
            </ReactFlow>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
