import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, BookOpen, Search, ChevronRight, GraduationCap } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useTests } from '@/hooks/useTests'
import type { Test, TestStatus } from '@/types/test'

const STATUS_FILTERS = ['ALL', 'ACTIVE', 'PENDING', 'DONE', 'INACTIVE'] as const
type StatusFilter = (typeof STATUS_FILTERS)[number]

const statusConfig: Record<TestStatus, { label: string; pill: string; dot: string }> = {
  ACTIVE:   { label: 'Active',   pill: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  PENDING:  { label: 'Pending',  pill: 'bg-blue-100 text-blue-700',       dot: 'bg-blue-500'    },
  DONE:     { label: 'Done',     pill: 'bg-teal-100 text-teal-700',       dot: 'bg-teal-500'    },
  INACTIVE: { label: 'Inactive', pill: 'bg-slate-100 text-slate-500',     dot: 'bg-slate-400'   },
}

const cardBorder: Record<TestStatus, string> = {
  ACTIVE:   'border-l-emerald-500',
  PENDING:  'border-l-blue-400',
  DONE:     'border-l-teal-400',
  INACTIVE: 'border-l-slate-300',
}

function TestCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 border-l-4 border-l-slate-200 bg-white p-5 flex flex-col gap-3">
      <div className="flex justify-between gap-2">
        <Skeleton className="h-5 w-3/5" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <div className="flex gap-4 pt-1">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-9 w-full rounded-lg mt-1" />
    </div>
  )
}

function TestCard({ test, index }: { test: Test; index: number }) {
  const navigate = useNavigate()
  const { label, pill, dot } = statusConfig[test.ot_status]
  const accent = cardBorder[test.ot_status]
  const canStart = test.ot_status === 'ACTIVE'

  const ctaLabel =
    test.ot_status === 'ACTIVE'   ? 'Start Test'    :
    test.ot_status === 'DONE'     ? 'Completed'     :
    test.ot_status === 'PENDING'  ? 'Coming Soon'   :
                                    'Unavailable'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay: index * 0.04, duration: 0.28 }}
      className={`group flex flex-col gap-3 bg-white rounded-xl border border-slate-200 border-l-4 ${accent} p-5 shadow-sm hover:shadow-md transition-shadow`}
    >
      {/* Title + badge */}
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-800 leading-snug group-hover:text-blue-700 transition-colors">
          {test.ot_name}
        </h2>
        <span className={`shrink-0 inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full ${pill}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
          {label}
        </span>
      </div>

      {/* Description */}
      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 flex-1">
        {test.ot_description ?? 'No description provided.'}
      </p>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
          {test.ot_total_question} questions
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-blue-500" />
          {test.ot_total_time} min
        </span>
      </div>

      {/* CTA */}
      <button
        disabled={!canStart}
        onClick={() => canStart && navigate(`/test/${test.ot_id}`, { state: { test } })}
        className={`mt-auto flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-all ${
          canStart
            ? 'bg-gradient-to-r from-blue-600 to-emerald-500 text-white hover:from-blue-700 hover:to-emerald-600 shadow-sm hover:shadow'
            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
        }`}
      >
        {ctaLabel}
        {canStart && <ChevronRight className="w-4 h-4" />}
      </button>
    </motion.div>
  )
}

export default function TestHome() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')

  const { data, isLoading, isError } = useTests()

  const tests = data?.data ?? []

  console.log("tests: ", tests);
  

  const filtered = tests.filter(t => {
    const matchSearch = t.ot_name.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'ALL' || t.ot_status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.25 }}
      className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-emerald-50/20"
    >
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center gap-4">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-emerald-500 flex items-center justify-center shadow-sm">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-slate-800">Online Tests</span>
          </div>

          <div className="relative ml-auto w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tests…"
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
            />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-7 space-y-6">
        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                statusFilter === f
                  ? 'bg-gradient-to-r from-blue-600 to-emerald-500 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-700'
              }`}
            >
              {f === 'ALL' ? 'All Tests' : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Result count */}
        {!isLoading && !isError && (
          <p className="text-sm text-slate-500">
            Showing{' '}
            <span className="font-medium text-slate-700">{filtered.length}</span>{' '}
            test{filtered.length !== 1 ? 's' : ''}
          </p>
        )}

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <TestCardSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-24 text-slate-500">
            <p className="text-base font-medium">Failed to load tests</p>
            <p className="text-sm mt-1">Check your connection and try again.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 text-slate-400">
            <p className="text-base font-medium">No tests found</p>
            <p className="text-sm mt-1">Try a different search or filter.</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((test, i) => (
                <TestCard key={test.ot_id} test={test} index={i} />
              ))}
            </div>
          </AnimatePresence>
        )}
      </main>
    </motion.div>
  )
}
