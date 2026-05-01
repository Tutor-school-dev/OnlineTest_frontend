import { useState, useMemo } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Users, Clock, TrendingUp,
  ChevronLeft, ChevronRight, Search,
  BarChart2, Hourglass,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useAttempts } from '@/hooks/useAttempts'
import type { Test } from '@/types/test'
import type { TestAttempt } from '@/types/attempt'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

type AnalysisStatus = 'none' | 'pending' | 'ready'

function getAnalysisStatus(a: TestAttempt): AnalysisStatus {
  if (!a.ta_is_completed) return 'none'
  if (!a.ta_ai_evaluation_done) return 'pending'
  if (a.ta_gap_analysis) return 'ready'
  return 'none'
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function ScoreBar({ obtained, total }: { obtained: number; total: number }) {
  const pct = total > 0 ? Math.round((obtained / total) * 100) : 0
  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden min-w-[4rem]">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-slate-600 shrink-0">{obtained}/{total}</span>
    </div>
  )
}

function StatusChips({ attempt }: { attempt: TestAttempt }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {attempt.ta_is_completed
        ? <span className="text-xs text-emerald-600 font-medium">Completed</span>
        : <span className="text-xs text-amber-500 font-medium">In Progress</span>}
      {attempt.ta_is_evaluated && (
        <span className="text-xs text-blue-500 font-medium">· Evaluated</span>
      )}
    </div>
  )
}

function AnalysisAction({ status, onResults }: { status: AnalysisStatus; onResults?: () => void }) {
  if (status === 'ready') {
    return (
      <button
        onClick={onResults}
        title="Overall Results"
        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-violet-600 hover:text-violet-700 hover:bg-violet-50 rounded-lg transition whitespace-nowrap"
      >
        <BarChart2 className="w-3.5 h-3.5 shrink-0" />
        Results
      </button>
    )
  }
  if (status === 'pending') {
    return (
      <span className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-100 rounded-lg whitespace-nowrap">
        <Hourglass className="w-3 h-3 shrink-0" />
        Pending
      </span>
    )
  }
  return null
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-4 py-3.5 flex items-center gap-3 shadow-sm">
      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-semibold text-slate-800">{value}</p>
      </div>
    </div>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 10

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

// ─── Skeletons ────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="px-4 py-4 border-b border-slate-100 last:border-0">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex gap-2">
          <Skeleton className="h-3 w-4 mt-1" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="h-7 w-12 rounded-lg" />
      </div>
      <Skeleton className="h-1.5 w-full rounded-full mb-3" />
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-6 w-20 rounded-lg" />
      </div>
    </div>
  )
}

function TableRowSkeleton() {
  return (
    <div className="grid grid-cols-[2rem_1fr_10rem_7rem_6rem_6rem_auto] gap-3 items-center px-4 py-3 border-b border-slate-100">
      <Skeleton className="h-4 w-5" />
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-4 w-10" />
      <Skeleton className="h-4 w-16" />
      <div className="flex justify-end gap-1.5">
        <Skeleton className="h-7 w-20 rounded-lg" />
        <Skeleton className="h-7 w-12 rounded-lg" />
      </div>
    </div>
  )
}

// ─── Row variants ─────────────────────────────────────────────────────────────

interface RowProps {
  attempt: TestAttempt
  index: number
  onView: () => void
  onResults?: () => void
}

function AttemptCard({ attempt, index, onView, onResults }: RowProps) {
  const status = getAnalysisStatus(attempt)
  return (
    <div className="px-4 py-4 border-b border-slate-100 last:border-0 hover:bg-blue-50/20 transition-colors">
      {/* Top: index + name + view */}
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-start gap-2 min-w-0">
          <span className="text-slate-300 text-xs font-mono mt-0.5 shrink-0">{index}</span>
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 truncate text-sm">{attempt.ta_user_name}</p>
            <StatusChips attempt={attempt} />
          </div>
        </div>
        <button
          onClick={onView}
          className="shrink-0 flex items-center gap-0.5 px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
        >
          View <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Score bar */}
      <ScoreBar obtained={attempt.ta_marks_obtained} total={attempt.ta_total_marks} />

      {/* Bottom: meta + analysis */}
      <div className="flex flex-wrap items-center justify-between gap-2 mt-2.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400">
          <span>{attempt.ta_total_correct_questions}/{attempt.ta_total_questions} correct</span>
          <span>{formatTime(attempt.ta_time_taken)}</span>
          <span>{formatDate(attempt.ta_created_at)}</span>
        </div>
        <AnalysisAction status={status} onResults={onResults} />
      </div>
    </div>
  )
}

function AttemptTableRow({ attempt, index, onView, onResults }: RowProps) {
  const status = getAnalysisStatus(attempt)
  return (
    <div className="grid grid-cols-[2rem_1fr_10rem_7rem_6rem_6rem_auto] gap-3 items-center px-4 py-3 border-b border-slate-100 last:border-0 text-sm hover:bg-blue-50/30 transition-colors">
      <span className="text-slate-400 text-xs font-mono">{index}</span>

      <div className="min-w-0">
        <p className="font-medium text-slate-800 truncate">{attempt.ta_user_name}</p>
        <StatusChips attempt={attempt} />
      </div>

      <ScoreBar obtained={attempt.ta_marks_obtained} total={attempt.ta_total_marks} />

      <span className="text-slate-600 text-xs">
        {attempt.ta_total_correct_questions}/{attempt.ta_total_questions} correct
      </span>

      <span className="text-slate-500 text-xs">{formatTime(attempt.ta_time_taken)}</span>

      <span className="text-slate-400 text-xs">{formatDate(attempt.ta_created_at)}</span>

      <div className="flex items-center justify-end gap-1">
        <AnalysisAction status={status} onResults={onResults} />
        <button
          onClick={onView}
          className="flex items-center gap-0.5 px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
        >
          View <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminAttempts() {
  const { testId } = useParams<{ testId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const test = location.state?.test as Test | undefined

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading, isError } = useAttempts(testId ?? '')
  const attempts = data?.data ?? []

  const filtered = useMemo(
    () => attempts.filter(a => a.ta_user_name.toLowerCase().includes(search.toLowerCase())),
    [attempts, search]
  )

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const handleSearch = (val: string) => { setSearch(val); setPage(1) }

  const stats = useMemo(() => {
    if (attempts.length === 0) return { avg: '—', avgTime: '—' }
    const avgPct = Math.round(
      attempts.reduce((sum, a) => sum + (a.ta_total_marks > 0 ? a.ta_marks_obtained / a.ta_total_marks : 0), 0)
      / attempts.length * 100
    )
    const avgSec = Math.round(attempts.reduce((s, a) => s + a.ta_time_taken, 0) / attempts.length)
    return { avg: `${avgPct}%`, avgTime: formatTime(avgSec) }
  }, [attempts])

  const rowProps = (attempt: TestAttempt, idx: number) => ({
    attempt,
    index: (page - 1) * ITEMS_PER_PAGE + idx + 1,
    onView: () => navigate(`/admin/attempts/${attempt.ta_id}`, { state: { attempt, test, testId } }),
    onResults: attempt.ta_gap_analysis
      ? () => navigate(`/admin/attempts/${attempt.ta_id}/overall-results`, { state: { attempt, test, testId } })
      : undefined,
  })

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
            onClick={() => navigate(`/admin/test/${testId}`, { state: { test } })}
            className="shrink-0 p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <p className="text-xs text-slate-400 leading-none truncate">{test?.ot_name ?? 'Test'}</p>
            <p className="text-sm font-semibold text-slate-800">Attempts</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard icon={<Users className="w-4 h-4 text-blue-500" />} label="Total Attempts" value={isLoading ? '…' : String(attempts.length)} />
          <StatCard icon={<TrendingUp className="w-4 h-4 text-emerald-500" />} label="Avg Score" value={isLoading ? '…' : stats.avg} />
          <StatCard icon={<Clock className="w-4 h-4 text-amber-500" />} label="Avg Time" value={isLoading ? '…' : stats.avgTime} />
        </div>

        {/* Search */}
        <div className="flex items-center gap-3">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search by user name…"
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
            />
          </div>
          {!isLoading && (
            <p className="text-sm text-slate-500 shrink-0">
              <span className="font-medium text-slate-700">{filtered.length}</span> attempt{filtered.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* ── Mobile cards (< md) ── */}
        <div className="md:hidden bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)
          ) : isError ? (
            <div className="py-16 text-center text-slate-500 text-sm">Failed to load attempts</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              {search ? 'No attempts match your search.' : 'No attempts yet for this test.'}
            </div>
          ) : (
            paginated.map((attempt, idx) => (
              <AttemptCard key={attempt.ta_id} {...rowProps(attempt, idx)} />
            ))
          )}
        </div>

        {/* ── Desktop table (≥ md) ── */}
        <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="grid grid-cols-[2rem_1fr_10rem_7rem_6rem_6rem_auto] gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <span>#</span>
            <span>User</span>
            <span>Score</span>
            <span>Questions</span>
            <span>Time</span>
            <span>Date</span>
            <span className="text-right">Actions</span>
          </div>

          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} />)
          ) : isError ? (
            <div className="py-20 text-center text-slate-500 text-sm">Failed to load attempts</div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-slate-400 text-sm">
              {search ? 'No attempts match your search.' : 'No attempts yet for this test.'}
            </div>
          ) : (
            paginated.map((attempt, idx) => (
              <AttemptTableRow key={attempt.ta_id} {...rowProps(attempt, idx)} />
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="pt-1">
            <Pagination page={page} total={totalPages} onChange={setPage} />
          </div>
        )}
      </main>
    </motion.div>
  )
}
