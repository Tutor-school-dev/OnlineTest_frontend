import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Star,
  CheckCircle2,
  XCircle,
  MinusCircle,
  HelpCircle,
  BarChart2,
  AlertTriangle,
  BookOpen,
  Brain,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useGapAnalysis } from '@/hooks/useGapAnalysis'
import { useNodes } from '@/hooks/useNodes'
import type { TestAttempt } from '@/types/attempt'
import type { Test } from '@/types/test'
import type { ReasoningNode } from '@/types/dag'

// ─── Local gap types (mirrors GraphModal) ────────────────────────────────────

interface NodeGap { cn_id: string; state: 'ok' | 'partial' | 'wrong' | 'absent'; key: boolean }
interface TopicScore { topic: string; score: number; signal: 'strong' | 'developing' | 'weak' | 'absent' }
interface QuestionPitfall { label: string; severity: 'critical' | 'moderate' | 'minor'; remedy: string }

// ─── Config maps ─────────────────────────────────────────────────────────────

const SIGNAL_CFG = {
  mastered:   { label: 'Mastered',   color: '#10b981', ringCls: 'text-emerald-600', badgeCls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  proficient: { label: 'Proficient', color: '#3b82f6', ringCls: 'text-blue-600',    badgeCls: 'bg-blue-50 text-blue-700 border-blue-200'          },
  developing: { label: 'Developing', color: '#f59e0b', ringCls: 'text-amber-600',   badgeCls: 'bg-amber-50 text-amber-700 border-amber-200'        },
  fragile:    { label: 'Fragile',    color: '#f97316', ringCls: 'text-orange-600',  badgeCls: 'bg-orange-50 text-orange-700 border-orange-200'     },
  absent:     { label: 'Absent',     color: '#94a3b8', ringCls: 'text-slate-500',   badgeCls: 'bg-slate-50 text-slate-600 border-slate-200'        },
} as const
type Signal = keyof typeof SIGNAL_CFG

const GAP_CFG = {
  ok:      { label: 'Correct', Icon: CheckCircle2, cardCls: 'border-emerald-200 bg-emerald-50/60', iconCls: 'text-emerald-500', badgeCls: 'bg-emerald-100 text-emerald-700' },
  partial: { label: 'Partial', Icon: MinusCircle,  cardCls: 'border-amber-200 bg-amber-50/60',     iconCls: 'text-amber-500',   badgeCls: 'bg-amber-100 text-amber-700'     },
  wrong:   { label: 'Wrong',   Icon: XCircle,      cardCls: 'border-red-200 bg-red-50/60',         iconCls: 'text-red-500',     badgeCls: 'bg-red-100 text-red-700'         },
  absent:  { label: 'Missing', Icon: HelpCircle,   cardCls: 'border-slate-200 bg-slate-50/60',     iconCls: 'text-slate-400',   badgeCls: 'bg-slate-100 text-slate-500'     },
} as const
type GapState = keyof typeof GAP_CFG

const NODE_TYPE_CLS: Record<string, string> = {
  root:         'bg-emerald-100 text-emerald-700',
  intermediate: 'bg-blue-100 text-blue-700',
  conclusion:   'bg-violet-100 text-violet-700',
}

const TOPIC_BAR_CLS: Record<string, string> = {
  strong:     'bg-emerald-500',
  developing: 'bg-amber-400',
  weak:       'bg-red-400',
  absent:     'bg-slate-300',
}

const TOPIC_SIGNAL_CLS: Record<string, string> = {
  strong:     'text-emerald-600',
  developing: 'text-amber-600',
  weak:       'text-red-500',
  absent:     'text-slate-400',
}

const SEVERITY_CFG = {
  critical: { label: 'Critical', cls: 'bg-red-100 text-red-700 border-red-200'     },
  moderate: { label: 'Moderate', cls: 'bg-amber-100 text-amber-700 border-amber-200'},
  minor:    { label: 'Minor',    cls: 'bg-blue-100 text-blue-700 border-blue-200'   },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MasteryRing({ pct, signal }: { pct: number; signal: string }) {
  const cfg = SIGNAL_CFG[signal as Signal] ?? SIGNAL_CFG.absent
  const r = 46
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - Math.min(pct, 100) / 100)
  return (
    <div className="flex flex-col items-center gap-3">
      <svg width="116" height="116" viewBox="0 0 116 116" className="drop-shadow-sm">
        <circle cx="58" cy="58" r={r} fill="none" stroke="#e2e8f0" strokeWidth="9" />
        <circle
          cx="58" cy="58" r={r}
          fill="none"
          stroke={cfg.color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 58 58)"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
        <text x="58" y="53" textAnchor="middle" dominantBaseline="middle" fontSize="21" fontWeight="bold" fill={cfg.color}>
          {pct}%
        </text>
        <text x="58" y="70" textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="#94a3b8">
          mastery
        </text>
      </svg>
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${cfg.badgeCls}`}>
        {cfg.label}
      </span>
    </div>
  )
}

interface EnrichedNode extends ReasoningNode { gap: NodeGap | null }

function NodeCard({ node }: { node: EnrichedNode }) {
  const state = (node.gap?.state ?? 'absent') as GapState
  const cfg = GAP_CFG[state]
  const { Icon } = cfg
  return (
    <div className={`rounded-xl border-2 ${cfg.cardCls} p-4 flex flex-col gap-2 relative transition-shadow hover:shadow-md`}>
      {node.is_key_step && (
        <span className="absolute top-3 right-3" title="Key step">
          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
        </span>
      )}
      <div className="flex items-start gap-2 pr-5">
        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${cfg.iconCls}`} />
        <p className="text-sm font-semibold text-slate-800 leading-snug">{node.label}</p>
      </div>
      {node.description && (
        <p className="text-xs text-slate-500 leading-relaxed">{node.description}</p>
      )}
      <div className="flex flex-wrap items-center gap-1.5 mt-auto pt-1">
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${NODE_TYPE_CLS[node.node_type] ?? 'bg-slate-100 text-slate-600'}`}>
          {node.node_type}
        </span>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.badgeCls}`}>
          {cfg.label}
        </span>
      </div>
    </div>
  )
}

function NodeCardSkeleton() {
  return (
    <div className="rounded-xl border-2 border-slate-100 bg-slate-50/60 p-4 flex flex-col gap-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
      <div className="flex gap-1.5 mt-1">
        <Skeleton className="h-4 w-16 rounded-full" />
        <Skeleton className="h-4 w-14 rounded-full" />
      </div>
    </div>
  )
}

function TopicRow({ topic }: { topic: TopicScore }) {
  const barCls = TOPIC_BAR_CLS[topic.signal] ?? 'bg-slate-300'
  const sigCls = TOPIC_SIGNAL_CLS[topic.signal] ?? 'text-slate-500'
  const pct = Math.min(topic.score, 100)
  return (
    <div className="flex items-center gap-3">
      <p className="text-sm text-slate-700 w-32 shrink-0 truncate capitalize">{topic.topic}</p>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barCls}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-semibold w-8 text-right shrink-0 ${sigCls}`}>{pct}%</span>
      <span className={`text-xs capitalize shrink-0 w-20 ${sigCls}`}>{topic.signal}</span>
    </div>
  )
}

function PitfallItem({ pitfall }: { pitfall: QuestionPitfall }) {
  const cfg = SEVERITY_CFG[pitfall.severity] ?? SEVERITY_CFG.minor
  return (
    <div className="flex gap-3 p-3 rounded-lg bg-white border border-slate-100">
      <span className={`mt-0.5 shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold border h-fit ${cfg.cls}`}>
        {cfg.label}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-800">{pitfall.label}</p>
        {pitfall.remedy && (
          <p className="text-xs text-slate-500 mt-0.5">{pitfall.remedy}</p>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminOverallResults() {
  const location = useLocation()
  const navigate = useNavigate()

  const attempt = location.state?.attempt as TestAttempt | undefined
  const test = location.state?.test as Test | undefined
  const testId = location.state?.testId as string | undefined

  const gapId = attempt?.ta_gap_analysis ?? null

  const { data: gapData, isLoading: gapLoading, isError: gapError } = useGapAnalysis(gapId)
  const gapItem = gapData?.data?.[0]

  const nodeGaps = useMemo<NodeGap[]>(() => {
    if (!gapItem?.node_gaps) return []
    try { return JSON.parse(gapItem.node_gaps) } catch { return [] }
  }, [gapItem?.node_gaps])

  const topics = useMemo<TopicScore[]>(() => {
    if (!gapItem?.topics) return []
    try { return JSON.parse(gapItem.topics) } catch { return [] }
  }, [gapItem?.topics])

  const pitfalls = useMemo<QuestionPitfall[]>(() => {
    if (!gapItem?.pitfalls) return []
    try { return JSON.parse(gapItem.pitfalls) } catch { return [] }
  }, [gapItem?.pitfalls])

  const nodeIdsStr = useMemo(
    () => (nodeGaps.length > 0 ? nodeGaps.map(g => g.cn_id).join(',') : null),
    [nodeGaps]
  )

  const { data: nodesData, isLoading: nodesLoading } = useNodes(nodeIdsStr)

  const enrichedNodes = useMemo<EnrichedNode[]>(() => {
    if (!nodesData?.nodes) return []
    const gapMap = new Map(nodeGaps.map(g => [g.cn_id, g]))
    return nodesData.nodes.map(n => ({ ...n, gap: gapMap.get(n.id) ?? null }))
  }, [nodesData?.nodes, nodeGaps])

  const signal = (gapItem?.signal ?? 'absent') as Signal
  const mastery = gapItem?.mastery ?? 0

  const nodeCounts = useMemo(() => {
    const ok = nodeGaps.filter(g => g.state === 'ok').length
    const key = nodeGaps.filter(g => g.key).length
    const keyOk = nodeGaps.filter(g => g.key && g.state === 'ok').length
    return { ok, total: nodeGaps.length, key, keyOk }
  }, [nodeGaps])

  const isLoading = gapLoading || (!!nodeIdsStr && nodesLoading)

  const handleBack = () => {
    if (testId) navigate(`/admin/test/${testId}/attempts`, { state: { test } })
    else navigate(-1)
  }

  if (!gapId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/20 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Brain className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="text-slate-500 text-sm">No gap analysis available for this attempt.</p>
          <button onClick={handleBack} className="text-blue-600 text-sm hover:underline">Go back</button>
        </div>
      </div>
    )
  }

  if (gapError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/20 flex items-center justify-center">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-12 h-12 text-red-300 mx-auto" />
          <p className="text-slate-500 text-sm">Failed to load gap analysis.</p>
          <button onClick={handleBack} className="text-blue-600 text-sm hover:underline">Go back</button>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.25 }}
      className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/20"
    >
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center gap-3">
          <button
            onClick={handleBack}
            className="shrink-0 p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <p className="text-xs text-slate-400 leading-none truncate">
              {test?.ot_name ?? 'Test'} · {attempt?.ta_user_name ?? 'Attempt'}
            </p>
            <p className="text-sm font-semibold text-slate-800">Overall Results</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Mastery overview card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          {isLoading ? (
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <Skeleton className="w-28 h-28 rounded-full" />
              <div className="flex-1 space-y-3 w-full">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-full max-w-sm" />
                <div className="flex gap-4">
                  <Skeleton className="h-10 w-28 rounded-xl" />
                  <Skeleton className="h-10 w-28 rounded-xl" />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <MasteryRing pct={mastery} signal={signal} />
              <div className="flex-1 space-y-4 text-center sm:text-left">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">{attempt?.ta_user_name}</h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Completed {attempt?.ta_total_correct_questions ?? 0} of {attempt?.ta_total_questions ?? 0} questions correctly
                  </p>
                </div>
                <div className="flex flex-wrap justify-center sm:justify-start gap-3">
                  <div className="flex flex-col items-center sm:items-start bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-100">
                    <span className="text-xs text-slate-400 font-medium">Nodes Correct</span>
                    <span className="text-lg font-bold text-slate-700">{nodeCounts.ok}<span className="text-sm font-normal text-slate-400">/{nodeCounts.total}</span></span>
                  </div>
                  {nodeCounts.key > 0 && (
                    <div className="flex flex-col items-center sm:items-start bg-amber-50 rounded-xl px-4 py-2.5 border border-amber-100">
                      <span className="text-xs text-amber-600 font-medium">Key Steps</span>
                      <span className="text-lg font-bold text-amber-700">{nodeCounts.keyOk}<span className="text-sm font-normal text-amber-400">/{nodeCounts.key}</span></span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Knowledge Nodes */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-700">Knowledge Nodes</h3>
            {!isLoading && enrichedNodes.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-500 font-medium">
                {enrichedNodes.length}
              </span>
            )}
          </div>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <NodeCardSkeleton key={i} />)}
            </div>
          ) : enrichedNodes.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-100">
              No node data available.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {enrichedNodes.map(node => (
                <NodeCard key={node.rn_id} node={node} />
              ))}
            </div>
          )}
        </section>

        {/* Topics + Pitfalls */}
        {!isLoading && (topics.length > 0 || pitfalls.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Topic Scores */}
            {topics.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-slate-400" />
                  <h3 className="text-sm font-semibold text-slate-700">Topic Scores</h3>
                </div>
                <div className="space-y-3">
                  {topics.map((t, i) => <TopicRow key={i} topic={t} />)}
                </div>
              </div>
            )}

            {/* Pitfalls */}
            {pitfalls.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-slate-400" />
                  <h3 className="text-sm font-semibold text-slate-700">Pitfalls</h3>
                </div>
                <div className="space-y-2">
                  {pitfalls.map((p, i) => <PitfallItem key={i} pitfall={p} />)}
                </div>
              </div>
            )}

          </div>
        )}

        {/* Legend */}
        {!isLoading && enrichedNodes.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400 pb-2">
            <div className="flex items-center gap-1.5">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span>Key step</span>
            </div>
            {(Object.entries(GAP_CFG) as [GapState, typeof GAP_CFG[GapState]][]).map(([state, cfg]) => (
              <div key={state} className="flex items-center gap-1.5">
                <cfg.Icon className={`w-3 h-3 ${cfg.iconCls}`} />
                <span>{cfg.label}</span>
              </div>
            ))}
          </div>
        )}

      </main>
    </motion.div>
  )
}
