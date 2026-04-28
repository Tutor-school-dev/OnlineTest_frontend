import { useMemo, useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Check, X, Minus, ChevronLeft, ChevronRight, GitBranch } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useAttemptDetails } from '@/hooks/useAttemptDetails'
import type { Test } from '@/types/test'
import type { TestAttempt, AttemptDetail } from '@/types/attempt'
import type { Question, QuestionOption } from '@/types/question'
import { GraphModal } from '@/components/GraphModal'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

const typeBadge: Record<string, string> = {
  SINGLE:   'bg-blue-100 text-blue-700',
  MULTIPLE: 'bg-purple-100 text-purple-700',
  BLANK:    'bg-amber-100 text-amber-700',
  INPUT:    'bg-slate-100 text-slate-600',
}

// ─── Summary cards ─────────────────────────────────────────────────────────────

function SummaryCard({ label, value, sub, accent }: {
  label: string; value: string; sub?: string; accent: string
}) {
  return (
    <div className={`bg-white rounded-xl border shadow-sm px-4 py-3.5 border-l-4 ${accent}`}>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-lg font-bold text-slate-800 mt-0.5">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── Option row ───────────────────────────────────────────────────────────────

function OptionRow({ option, isUserAnswer, isCorrect }: {
  option: QuestionOption
  isUserAnswer: boolean
  isCorrect: boolean
}) {
  const both = isUserAnswer && isCorrect
  const wrongAnswer = isUserAnswer && !isCorrect

  const containerCls = both
    ? 'border-emerald-400 bg-emerald-50'
    : wrongAnswer
    ? 'border-red-400 bg-red-50'
    : isCorrect
    ? 'border-emerald-300 bg-emerald-50/40'
    : 'border-slate-200 bg-white'

  const dotCls = both
    ? 'bg-emerald-500 text-white'
    : wrongAnswer
    ? 'bg-red-400 text-white'
    : isCorrect
    ? 'bg-emerald-400 text-white'
    : 'bg-slate-100'

  return (
    <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-sm transition-colors ${containerCls}`}>
      <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${dotCls}`}>
        {(both || isCorrect) && <Check className="w-3 h-3" strokeWidth={3} />}
        {wrongAnswer && <X className="w-3 h-3" strokeWidth={3} />}
      </span>
      <span className={`flex-1 ${isUserAnswer || isCorrect ? 'font-medium' : 'text-slate-600'}`}>
        {option.qo_title}
      </span>
      <span className="shrink-0 text-xs">
        {both && <span className="text-emerald-600">Your answer · Correct</span>}
        {wrongAnswer && <span className="text-red-500">Your answer</span>}
        {!isUserAnswer && isCorrect && <span className="text-emerald-600">Correct answer</span>}
      </span>
    </div>
  )
}

// ─── Single question block ─────────────────────────────────────────────────────

function QuestionBlock({
  question,
  detail,
  label,
  variant,
  onViewGraph,
}: {
  question: Question
  detail: AttemptDetail | undefined
  label: string
  variant: 'parent' | 'followup'
  onViewGraph?: (dagId: string, title: string) => void
}) {
  const userAnswerIds = useMemo(
    () => (detail?.tad_answer ? detail.tad_answer.split(',').map(s => s.trim()) : []),
    [detail]
  )

  const badgeCls = variant === 'parent' ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700'

  const statusIcon = !detail
    ? <span className="flex items-center gap-1 text-xs text-slate-400"><Minus className="w-3.5 h-3.5" />Not attempted</span>
    : detail.tad_is_correct
    ? <span className="flex items-center gap-1 text-xs font-medium text-emerald-600"><Check className="w-3.5 h-3.5" />Correct</span>
    : <span className="flex items-center gap-1 text-xs font-medium text-red-500"><X className="w-3.5 h-3.5" />Incorrect</span>

  return (
    <div className="space-y-3">
      {/* Question header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${badgeCls}`}>{label}</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeBadge[question.qb_type] ?? typeBadge.INPUT}`}>
            {question.qb_type}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {statusIcon}
          {detail && (
            <span className="text-xs text-slate-500 font-medium">
              {detail.tad_marks_obtained}/{detail.tad_total_marks} marks
            </span>
          )}
          {detail?.tad_dag_id && onViewGraph && (
            <button
              onClick={() => onViewGraph(detail.tad_dag_id!, question.qb_title)}
              title="View user's thought process"
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-violet-600 hover:text-violet-700 hover:bg-violet-50 rounded-lg transition"
            >
              <GitBranch className="w-3.5 h-3.5" />
              Thought Process
            </button>
          )}
        </div>
      </div>

      <p className="text-sm font-medium text-slate-800 leading-snug">{question.qb_title}</p>

      {/* Answer area */}
      {question.qb_type === 'BLANK' || question.qb_type === 'INPUT' ? (
        <div className="space-y-1.5 text-sm">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-slate-500 text-xs shrink-0">User's answer:</span>
            <span className={`font-medium ${detail?.tad_is_correct ? 'text-emerald-700' : detail ? 'text-red-600' : 'text-slate-400 italic'}`}>
              {detail?.tad_answer ?? 'Not answered'}
            </span>
          </div>
          {question.qb_answer && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200">
              <span className="text-slate-500 text-xs shrink-0">Correct answer:</span>
              <span className="font-medium text-emerald-700">{question.qb_answer}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          {question.options.map(opt => (
            <OptionRow
              key={opt.qo_id}
              option={opt}
              isUserAnswer={userAnswerIds.includes(opt.qo_id)}
              isCorrect={opt.qc_correct}
            />
          ))}
          {detail && !detail.tad_answer && (
            <p className="text-xs text-slate-400 italic px-1">No option selected</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Question group card (parent + accordion subs) ────────────────────────────

function QuestionGroupCard({
  parent,
  subs,
  detailMap,
  onViewGraph,
}: {
  parent: Question
  subs: Question[]
  detailMap: Map<string, AttemptDetail>
  onViewGraph: (dagId: string, title: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Parent */}
      <div className="px-5 py-4">
        <QuestionBlock
          question={parent}
          detail={detailMap.get(parent.qb_id)}
          label="Parent Question"
          variant="parent"
          onViewGraph={onViewGraph}
        />
      </div>

      {/* Accordion toggle — only when there are sub-questions */}
      {subs.length > 0 && (
        <>
          <button
            onClick={() => setOpen(v => !v)}
            className="w-full flex items-center justify-between px-5 py-2.5 border-t border-slate-100 bg-slate-50/60 hover:bg-violet-50/50 transition-colors group"
          >
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-3.5 rounded-full bg-gradient-to-b from-violet-500 to-blue-400 shrink-0" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Follow-up Questions
              </span>
              <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600">
                {subs.length}
              </span>
            </div>
            <ChevronRight
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
            />
          </button>

          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="divide-y divide-slate-100 border-t border-slate-100">
                  {subs.map((sub, i) => (
                    <div key={sub.qb_id} className="px-5 py-4 pl-8 bg-violet-50/30 border-l-4 border-violet-200">
                      <QuestionBlock
                        question={sub}
                        detail={detailMap.get(sub.qb_id)}
                        label={`Follow-up ${i + 1}`}
                        variant="followup"
                        onViewGraph={onViewGraph}
                      />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 5

function getPageNums(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '…')[] = [1]
  if (current > 3) pages.push('…')
  const lo = Math.max(2, current - 1)
  const hi = Math.min(total - 1, current + 1)
  for (let p = lo; p <= hi; p++) pages.push(p)
  if (current < total - 2) pages.push('…')
  pages.push(total)
  return pages
}

function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  if (total <= 1) return null
  const nums = getPageNums(page, total)
  return (
    <div className="flex items-center justify-center gap-1">
      <button onClick={() => onChange(page - 1)} disabled={page === 1} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition">
        <ChevronLeft className="w-4 h-4" />
      </button>
      {nums.map((n, i) =>
        n === '…' ? (
          <span key={`e-${i}`} className="px-2 text-slate-400 text-sm">…</span>
        ) : (
          <button key={n} onClick={() => onChange(n as number)} className={`w-8 h-8 rounded-lg text-sm font-medium transition ${page === n ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
            {n}
          </button>
        )
      )}
      <button onClick={() => onChange(page + 1)} disabled={page === total} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition">
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex justify-between">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-4 w-3/4" />
          <div className="space-y-2 pt-1">
            {Array.from({ length: 4 }).map((_, j) => (
              <Skeleton key={j} className="h-9 w-full rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminAttemptDetail() {
  const { attemptId } = useParams<{ attemptId: string }>()
  const location = useLocation()
  const navigate = useNavigate()

  const attempt = location.state?.attempt as TestAttempt | undefined
  const test = location.state?.test as Test | undefined
  const testId = location.state?.testId as string | undefined

  const [page, setPage] = useState(1)
  const [graphTarget, setGraphTarget] = useState<{ dagId: string; title: string } | null>(null)

  const { data, isLoading, isError } = useAttemptDetails(attemptId ?? '')

  const { detailMap, parentQuestions, subsMap } = useMemo(() => {
    const details = data?.data ?? []
    const qbs = data?.qbs ?? []

    const detailMap = new Map<string, AttemptDetail>()
    details.forEach(d => detailMap.set(d.tad_question_id, d))

    const subsMap = new Map<string, Question[]>()
    qbs.forEach(q => {
      if (q.qb_parent) {
        const arr = subsMap.get(q.qb_parent) ?? []
        arr.push(q)
        subsMap.set(q.qb_parent, arr)
      }
    })

    const parentQuestions = qbs.filter(q => q.qb_parent === null)

    return { detailMap, parentQuestions, subsMap }
  }, [data])

  const totalPages = Math.ceil(parentQuestions.length / ITEMS_PER_PAGE)
  const paginatedParents = parentQuestions.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const scorePct = attempt && attempt.ta_total_marks > 0
    ? Math.round((attempt.ta_marks_obtained / attempt.ta_total_marks) * 100)
    : null

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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center gap-3">
          <button
            onClick={() => navigate(`/admin/test/${testId}/attempts`, { state: { test } })}
            className="shrink-0 p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <p className="text-xs text-slate-400 leading-none truncate">{test?.ot_name ?? 'Test'}</p>
            <p className="text-sm font-semibold text-slate-800">
              {attempt?.ta_user_name ?? 'Attempt Detail'}
            </p>
          </div>
          {attempt && (
            <span className="ml-auto shrink-0 text-xs text-slate-400">
              {new Date(attempt.ta_created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Score summary */}
        {attempt && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryCard
              label="Score"
              value={`${attempt.ta_marks_obtained}/${attempt.ta_total_marks}`}
              sub={scorePct !== null ? `${scorePct}%` : undefined}
              accent={
                scorePct === null ? 'border-l-slate-300'
                : scorePct >= 70 ? 'border-l-emerald-500'
                : scorePct >= 40 ? 'border-l-amber-400'
                : 'border-l-red-400'
              }
            />
            <SummaryCard
              label="Correct"
              value={`${attempt.ta_total_correct_questions}/${attempt.ta_total_questions}`}
              sub="questions"
              accent="border-l-blue-400"
            />
            <SummaryCard
              label="Time Taken"
              value={formatTime(attempt.ta_time_taken)}
              accent="border-l-violet-400"
            />
            <SummaryCard
              label="Status"
              value={attempt.ta_is_completed ? 'Completed' : 'Incomplete'}
              sub={attempt.ta_is_evaluated ? 'Evaluated' : undefined}
              accent={attempt.ta_is_completed ? 'border-l-emerald-500' : 'border-l-amber-400'}
            />
          </div>
        )}

        {/* Questions */}
        {isLoading ? (
          <DetailSkeleton />
        ) : isError ? (
          <div className="py-20 text-center text-slate-500 text-sm">Failed to load attempt details</div>
        ) : parentQuestions.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-sm">No question data available</div>
        ) : (
          <>
            <div className="space-y-4">
              {paginatedParents.map(parent => (
                <QuestionGroupCard
                  key={parent.qb_id}
                  parent={parent}
                  subs={subsMap.get(parent.qb_id) ?? []}
                  detailMap={detailMap}
                  onViewGraph={(dagId, title) => setGraphTarget({ dagId, title })}
                />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="pt-2">
                <Pagination page={page} total={totalPages} onChange={setPage} />
              </div>
            )}
          </>
        )}
      </main>

      <AnimatePresence>
        {graphTarget && (
          <GraphModal
            key="user-graph"
            dagId={graphTarget.dagId}
            questionTitle={graphTarget.title}
            onClose={() => setGraphTarget(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
