import { useState, useMemo } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Eye, Trash2, Plus, X, Check, Search,
  ChevronLeft, ChevronRight, BookOpen, Loader2, Users, GitBranch,
} from 'lucide-react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { useAdminQuestions } from '@/hooks/useAdminQuestions'
import { addQuestion, removeQuestion, fetchAdminQuestions } from '@/api/admin.api'
import type { Test } from '@/types/test'
import type { Question, QuestionOption } from '@/types/question'
import type { AddQuestionItem } from '@/api/admin.api'
import { GraphModal } from '@/components/GraphModal'

const ITEMS_PER_PAGE = 10

// ─── Helpers ─────────────────────────────────────────────────────────────────

function truncate(text: string, limit: number) {
  return text.length > limit ? text.slice(0, limit) + '…' : text
}

function getCorrectOptions(question: Question): string {
  if (question.qb_type === 'BLANK' || question.qb_type === 'INPUT') {
    return question.qb_answer ?? '—'
  }
  const correct = question.options.filter(o => o.qc_correct).map(o => o.qo_title)
  return correct.length ? correct.join(', ') : '—'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

const typeBadge: Record<string, string> = {
  SINGLE:   'bg-blue-100 text-blue-700',
  MULTIPLE: 'bg-purple-100 text-purple-700',
  BLANK:    'bg-amber-100 text-amber-700',
  INPUT:    'bg-slate-100 text-slate-600',
}

// ─── Tooltip cell ─────────────────────────────────────────────────────────────

function TipCell({ text, limit }: { text: string; limit: number }) {
  const truncated = truncate(text, limit)
  const needsTip = text.length > limit
  return (
    <div className="relative group inline-block max-w-full">
      <span className="cursor-default">{truncated}</span>
      {needsTip && (
        <div className="pointer-events-none absolute left-0 bottom-full mb-1.5 z-30 hidden group-hover:block bg-slate-800 text-white text-xs px-2.5 py-1.5 rounded-lg shadow-xl whitespace-pre-wrap max-w-xs leading-relaxed">
          {text}
        </div>
      )}
    </div>
  )
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 bg-white rounded-lg border border-slate-100">
          <Skeleton className="h-4 w-6 shrink-0" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-7 w-16" />
        </div>
      ))}
    </div>
  )
}

// ─── Question detail modal ────────────────────────────────────────────────────

function OptionRow({ option }: { option: QuestionOption }) {
  return (
    <div className={`flex items-start gap-2.5 px-3 py-2 rounded-lg text-sm ${
      option.qc_correct ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 border border-slate-200'
    }`}>
      <span className={`shrink-0 mt-0.5 w-4 h-4 rounded-full flex items-center justify-center ${
        option.qc_correct ? 'bg-emerald-500' : 'bg-slate-200'
      }`}>
        {option.qc_correct && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
      </span>
      <span className={option.qc_correct ? 'text-emerald-800 font-medium' : 'text-slate-600'}>
        {option.qo_title}
      </span>
    </div>
  )
}

function QuestionBlock({
  question,
  label,
  variant = 'default',
}: {
  question: Question
  label: string
  variant?: 'parent' | 'followup' | 'default'
}) {
  const badgeCls =
    variant === 'parent'  ? 'bg-blue-100 text-blue-700' :
    variant === 'followup' ? 'bg-violet-100 text-violet-700' : null
  return (
    <div className="space-y-2">
      {badgeCls
        ? <span className={`inline-flex text-xs font-semibold px-2.5 py-0.5 rounded-full ${badgeCls}`}>{label}</span>
        : <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
      }
      <p className="text-sm font-medium text-slate-800 leading-snug">{question.qb_title}</p>
      {(question.qb_type === 'BLANK' || question.qb_type === 'INPUT') ? (
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg">
          <Check className="w-4 h-4 shrink-0" />
          Answer: <span className="font-medium">{question.qb_answer}</span>
        </div>
      ) : (
        <div className="space-y-1.5">
          {question.options.map(opt => <OptionRow key={opt.qo_id} option={opt} />)}
        </div>
      )}
    </div>
  )
}

function QuestionDetailModal({
  question,
  allQuestions,
  onClose,
}: {
  question: Question
  allQuestions: Question[]
  onClose: () => void
}) {
  const parent = question.qb_parent === null
    ? question
    : allQuestions.find(q => q.qb_id === question.qb_parent) ?? question

  const subs = allQuestions.filter(q => q.qb_parent === parent.qb_id)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 backdrop-blur-sm px-4 py-8 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl divide-y divide-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-blue-500" />
            <span className="font-semibold text-slate-800 text-sm">Question Detail</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-5 space-y-5">
          <QuestionBlock question={parent} label="Parent Question" variant="parent" />

          {subs.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-4 rounded-full bg-gradient-to-b from-violet-500 to-blue-500 shrink-0" />
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Follow-up Questions ({subs.length})
                </p>
              </div>
              {subs.map((sub, i) => (
                <div key={sub.qb_id} className="pl-4 border-l-2 border-violet-200">
                  <QuestionBlock question={sub} label={`Follow-up ${i + 1}`} variant="followup" />
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Add Question Modal ───────────────────────────────────────────────────────

interface OptionDraft { qo_title: string; qc_correct: boolean }

interface QuestionDraft {
  qb_title: string
  qb_type: 'SINGLE' | 'MULTIPLE' | 'BLANK' | 'INPUT'
  options: OptionDraft[]
  marks: number
  negative_marks: number
  qb_answer: string
}

const emptyDraft = (): QuestionDraft => ({
  qb_title: '',
  qb_type: 'SINGLE',
  options: [
    { qo_title: '', qc_correct: false },
    { qo_title: '', qc_correct: false },
    { qo_title: '', qc_correct: false },
    { qo_title: '', qc_correct: false },
  ],
  marks: 1,
  negative_marks: 0,
  qb_answer: '',
})

function buildItem(draft: QuestionDraft, parentId?: string): AddQuestionItem {
  return {
    qb_title: draft.qb_title.trim(),
    qb_type: draft.qb_type,
    marks: draft.marks,
    negative_marks: draft.negative_marks,
    options: (draft.qb_type === 'BLANK' || draft.qb_type === 'INPUT') ? [] : draft.options,
    qb_answer: (draft.qb_type === 'BLANK' || draft.qb_type === 'INPUT') ? draft.qb_answer : null,
    ...(parentId ? { qb_parent: parentId } : {}),
  }
}

function isDraftValid(d: QuestionDraft) {
  if (!d.qb_title.trim()) return false
  if (d.qb_type === 'BLANK' || d.qb_type === 'INPUT') return d.qb_answer.trim() !== ''
  return d.options.some(o => o.qc_correct && o.qo_title.trim())
}

function QuestionForm({
  draft,
  onChange,
  label,
  onRemove,
}: {
  draft: QuestionDraft
  onChange: (next: QuestionDraft) => void
  label: string
  onRemove?: () => void
}) {
  const setOpt = (i: number, field: keyof OptionDraft, value: string | boolean) => {
    const opts = [...draft.options]
    if (field === 'qc_correct' && value === true && draft.qb_type === 'SINGLE') {
      opts.forEach((_, idx) => { opts[idx] = { ...opts[idx], qc_correct: idx === i } })
    } else {
      opts[i] = { ...opts[i], [field]: value }
    }
    onChange({ ...draft, options: opts })
  }
  const addOpt = () => onChange({ ...draft, options: [...draft.options, { qo_title: '', qc_correct: false }] })
  const removeOpt = (i: number) => onChange({ ...draft, options: draft.options.filter((_, idx) => idx !== i) })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
        {onRemove && (
          <button type="button" onClick={onRemove} className="text-slate-300 hover:text-red-400 transition">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-600">Question Title *</label>
        <textarea
          rows={2}
          value={draft.qb_title}
          onChange={e => onChange({ ...draft, qb_title: e.target.value })}
          placeholder="Enter question text…"
          className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 resize-none transition"
        />
      </div>

      <div className="flex gap-3">
        <div className="flex-1 space-y-1.5">
          <label className="text-xs font-semibold text-slate-600">Type</label>
          <select
            value={draft.qb_type}
            onChange={e => onChange({ ...draft, qb_type: e.target.value as QuestionDraft['qb_type'] })}
            className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white transition"
          >
            <option value="SINGLE">Single Choice</option>
            <option value="MULTIPLE">Multiple Choice</option>
            <option value="BLANK">Fill in the Blank</option>
          </select>
        </div>
        <div className="w-24 space-y-1.5">
          <label className="text-xs font-semibold text-slate-600">Marks</label>
          <input
            type="number"
            min={1}
            value={draft.marks}
            onChange={e => onChange({ ...draft, marks: Number(e.target.value) })}
            className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
          />
        </div>
      </div>

      {(draft.qb_type === 'SINGLE' || draft.qb_type === 'MULTIPLE') && (
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-600">Options — mark at least one correct</label>
          {draft.options.map((opt, i) => (
            <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-colors ${
              opt.qc_correct ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white'
            }`}>
              <button
                type="button"
                onClick={() => setOpt(i, 'qc_correct', !opt.qc_correct)}
                className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  opt.qc_correct ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
                }`}
              >
                {opt.qc_correct && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
              </button>
              <input
                value={opt.qo_title}
                onChange={e => setOpt(i, 'qo_title', e.target.value)}
                placeholder={`Option ${i + 1}`}
                className="flex-1 text-sm bg-transparent focus:outline-none placeholder:text-slate-400"
              />
              {draft.options.length > 2 && (
                <button type="button" onClick={() => removeOpt(i)} className="text-slate-300 hover:text-red-400 transition">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={addOpt} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 transition">
            <Plus className="w-3.5 h-3.5" /> Add option
          </button>
        </div>
      )}

      {(draft.qb_type === 'BLANK' || draft.qb_type === 'INPUT') && (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600">Correct Answer *</label>
          <input
            value={draft.qb_answer}
            onChange={e => onChange({ ...draft, qb_answer: e.target.value })}
            placeholder="Enter the correct answer…"
            className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
          />
        </div>
      )}
    </div>
  )
}

function AddQuestionModal({
  testId,
  onClose,
  onSuccess,
}: {
  testId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const queryClient = useQueryClient()
  const [parent, setParent] = useState<QuestionDraft>(emptyDraft)
  const [subs, setSubs] = useState<QuestionDraft[]>([])

  const addSub = () => setSubs(s => [...s, emptyDraft()])
  const removeSub = (i: number) => setSubs(s => s.filter((_, idx) => idx !== i))
  const updateSub = (i: number, next: QuestionDraft) =>
    setSubs(s => s.map((d, idx) => (idx === i ? next : d)))

  const mutation = useMutation({
    mutationFn: async () => {
      // Step 1: add parent question
      await addQuestion({ test_id: testId, ques: [buildItem(parent)] })

      if (subs.length === 0) return

      // Step 2: refetch to locate the newly created parent by title + latest created_at
      const fresh = await queryClient.fetchQuery({
        queryKey: ['admin-questions', testId],
        queryFn: () => fetchAdminQuestions(testId),
        staleTime: 0,
      })
      const newParent = (fresh.data ?? [])
        .filter(q => q.qb_parent === null && q.qb_title === parent.qb_title.trim())
        .sort((a, b) => b.qb_created_at.localeCompare(a.qb_created_at))[0]

      if (!newParent) throw new Error('Could not locate newly created question')

      // Step 3: add all sub-questions with the parent ID
      await addQuestion({ test_id: testId, ques: subs.map(s => buildItem(s, newParent.qb_id)) })
    },
    onSuccess: () => {
      toast.success(subs.length > 0 ? 'Question and follow-ups added' : 'Question added')
      onSuccess()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Failed to add question')
    },
  })

  const canSubmit = isDraftValid(parent) && subs.every(isDraftValid) && !mutation.isPending

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 backdrop-blur-sm px-4 py-8 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg divide-y divide-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-500" />
            <span className="font-semibold text-slate-800 text-sm">Add Question</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Parent question */}
        <div className="px-5 py-5">
          <QuestionForm draft={parent} onChange={setParent} label="Main Question" />
        </div>

        {/* Follow-up questions */}
        {subs.length > 0 && (
          <div className="px-5 py-5 space-y-6">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-gradient-to-b from-blue-500 to-emerald-500 shrink-0" />
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Follow-up Questions
              </p>
            </div>
            {subs.map((sub, i) => (
              <div key={i} className="pl-4 border-l-2 border-slate-200">
                <QuestionForm
                  draft={sub}
                  onChange={next => updateSub(i, next)}
                  label={`Follow-up ${i + 1}`}
                  onRemove={() => removeSub(i)}
                />
              </div>
            ))}
          </div>
        )}

        {/* Add follow-up button */}
        <div className="px-5 py-3">
          <button
            type="button"
            onClick={addSub}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-sm font-medium text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition"
          >
            <Plus className="w-4 h-4" />
            Add Follow-up Question
          </button>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 rounded-xl border border-slate-200 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            disabled={!canSubmit}
            onClick={() => mutation.mutate()}
            className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-700 hover:to-emerald-600 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {subs.length > 0
              ? `Add + ${subs.length} Follow-up${subs.length > 1 ? 's' : ''}`
              : 'Add Question'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────

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
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      {nums.map((n, i) =>
        n === '…' ? (
          <span key={`ellipsis-${i}`} className="px-2 text-slate-400 text-sm">…</span>
        ) : (
          <button
            key={n}
            onClick={() => onChange(n as number)}
            className={`w-8 h-8 rounded-lg text-sm font-medium transition ${
              page === n
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {n}
          </button>
        )
      )}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page === total}
        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminTestDetail() {
  const { testId } = useParams<{ testId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const test = location.state?.test as Test | undefined

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [viewing, setViewing] = useState<Question | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null)
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set())
  const [graphTarget, setGraphTarget] = useState<{ dagId: string; title: string } | null>(null)

  const { data, isLoading, isError } = useAdminQuestions(testId ?? '')
  const allQuestions = data?.data ?? []

  const subsMap = useMemo(() => {
    const map = new Map<string, Question[]>()
    allQuestions.forEach(q => {
      if (q.qb_parent) {
        const arr = map.get(q.qb_parent) ?? []
        arr.push(q)
        map.set(q.qb_parent, arr)
      }
    })
    return map
  }, [allQuestions])

  const filtered = useMemo(
    () => allQuestions
      .filter(q => q.qb_parent === null)
      .filter(q => q.qb_title.toLowerCase().includes(search.toLowerCase())),
    [allQuestions, search]
  )

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const toggleExpand = (id: string) =>
    setExpandedParents(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const removeMutation = useMutation({
    mutationFn: (questionId: string) => removeQuestion(testId!, questionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-questions', testId] })
      setPendingRemoveId(null)
      toast.success('Question removed')
    },
    onError: () => toast.error('Failed to remove question'),
  })

  const handleSearch = (val: string) => {
    setSearch(val)
    setPage(1)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.25 }}
      className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/20"
    >
      {/* ── Header ── */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center gap-3">
          <button
            onClick={() => navigate('/admin')}
            className="shrink-0 p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <p className="text-xs text-slate-400 leading-none">Manage Test</p>
            <p className="text-sm font-semibold text-slate-800 truncate">{test?.ot_name ?? 'Test Detail'}</p>
          </div>

          {test && (
            <div className="hidden sm:flex items-center gap-3 ml-2 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                {test.ot_total_question} questions
              </span>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2 shrink-0">
            <button
              onClick={() => navigate(`/admin/test/${testId}/attempts`, { state: { test } })}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Attempts</span>
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-700 hover:to-emerald-600 shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              Add Question
            </button>
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* Search + count row */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search questions…"
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
            />
          </div>
          {!isLoading && (
            <p className="text-sm text-slate-500">
              <span className="font-medium text-slate-700">{filtered.length}</span> question{filtered.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[2rem_1fr_6rem_10rem_8rem_7rem] gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <span>#</span>
            <span>Title</span>
            <span>Type</span>
            <span>Correct Answer</span>
            <span>Created</span>
            <span className="text-right">Actions</span>
          </div>

          {isLoading ? (
            <div className="p-4">
              <TableSkeleton />
            </div>
          ) : isError ? (
            <div className="py-20 text-center text-slate-500 text-sm">Failed to load questions</div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-slate-400 text-sm">
              {search ? 'No questions match your search.' : 'No questions in this test yet.'}
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {paginated.map((q, idx) => {
                const globalIdx = (page - 1) * ITEMS_PER_PAGE + idx + 1
                const qSubs = subsMap.get(q.qb_id) ?? []
                const isExpanded = expandedParents.has(q.qb_id)
                const isRemoving = pendingRemoveId === q.qb_id

                return (
                  <motion.div
                    key={q.qb_id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    {/* ── Parent row ── */}
                    <div className={`grid grid-cols-[2rem_1fr_6rem_10rem_8rem_7rem] gap-3 items-center px-4 py-3 border-b border-slate-100 text-sm transition-colors ${
                      isRemoving ? 'bg-red-50' : 'hover:bg-blue-50/30'
                    }`}>
                      {/* # */}
                      <span className="text-slate-400 text-xs font-mono">{globalIdx}</span>

                      {/* Title + expand toggle */}
                      <div className="min-w-0 flex items-center gap-1.5">
                        {qSubs.length > 0 && (
                          <button
                            onClick={() => toggleExpand(q.qb_id)}
                            className="shrink-0 p-0.5 rounded hover:bg-slate-200 transition"
                            title={isExpanded ? 'Collapse follow-ups' : `Expand ${qSubs.length} follow-up${qSubs.length > 1 ? 's' : ''}`}
                          >
                            <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                          </button>
                        )}
                        <span className="truncate"><TipCell text={q.qb_title} limit={qSubs.length > 0 ? 48 : 55} /></span>
                        {qSubs.length > 0 && (
                          <span className="shrink-0 text-xs font-medium px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600">
                            {qSubs.length}
                          </span>
                        )}
                      </div>

                      {/* Type */}
                      <span className={`inline-flex w-fit text-xs font-medium px-2 py-0.5 rounded-full ${typeBadge[q.qb_type] ?? typeBadge.INPUT}`}>
                        {q.qb_type}
                      </span>

                      {/* Correct answer */}
                      <span className="text-slate-600 text-xs">
                        <TipCell text={getCorrectOptions(q)} limit={20} />
                      </span>

                      {/* Created */}
                      <span className="text-slate-400 text-xs">{formatDate(q.qb_created_at)}</span>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-1">
                        {isRemoving ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => removeMutation.mutate(q.qb_id)}
                              disabled={removeMutation.isPending}
                              className="text-xs font-medium text-red-600 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-100 transition disabled:opacity-50"
                            >
                              {removeMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Yes'}
                            </button>
                            <button
                              onClick={() => setPendingRemoveId(null)}
                              className="text-xs font-medium text-slate-500 hover:text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-100 transition"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => setViewing(q)}
                              title="View question"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {q.qb_dag_id && (
                              <button
                                onClick={() => setGraphTarget({ dagId: q.qb_dag_id!, title: q.qb_title })}
                                title="View reasoning graph"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition"
                              >
                                <GitBranch className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => setPendingRemoveId(q.qb_id)}
                              title="Remove question"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* ── Sub-question rows (expandable) ── */}
                    <AnimatePresence initial={false}>
                      {isExpanded && qSubs.map((sub, si) => {
                        const subRemoving = pendingRemoveId === sub.qb_id
                        return (
                          <motion.div
                            key={sub.qb_id}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className={`grid grid-cols-[2rem_1fr_6rem_10rem_8rem_7rem] gap-3 items-center px-4 py-2.5 border-b border-slate-100 text-sm transition-colors ${
                              subRemoving ? 'bg-red-50' : 'bg-violet-50/40 hover:bg-violet-50/70'
                            }`}>
                              {/* ↳ index */}
                              <span className="text-violet-300 text-xs font-mono">↳{si + 1}</span>

                              {/* Title indented */}
                              <div className="min-w-0 pl-3 border-l-2 border-violet-200">
                                <TipCell text={sub.qb_title} limit={52} />
                              </div>

                              {/* Type */}
                              <span className={`inline-flex w-fit text-xs font-medium px-2 py-0.5 rounded-full ${typeBadge[sub.qb_type] ?? typeBadge.INPUT}`}>
                                {sub.qb_type}
                              </span>

                              {/* Correct answer */}
                              <span className="text-slate-600 text-xs">
                                <TipCell text={getCorrectOptions(sub)} limit={20} />
                              </span>

                              {/* Created */}
                              <span className="text-slate-400 text-xs">{formatDate(sub.qb_created_at)}</span>

                              {/* Actions */}
                              <div className="flex items-center justify-end gap-1">
                                {subRemoving ? (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => removeMutation.mutate(sub.qb_id)}
                                      disabled={removeMutation.isPending}
                                      className="text-xs font-medium text-red-600 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-100 transition disabled:opacity-50"
                                    >
                                      {removeMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Yes'}
                                    </button>
                                    <button
                                      onClick={() => setPendingRemoveId(null)}
                                      className="text-xs font-medium text-slate-500 hover:text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-100 transition"
                                    >
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => setViewing(sub)}
                                      title="View question"
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                    {sub.qb_dag_id && (
                                      <button
                                        onClick={() => setGraphTarget({ dagId: sub.qb_dag_id!, title: sub.qb_title })}
                                        title="View reasoning graph"
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition"
                                      >
                                        <GitBranch className="w-4 h-4" />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => setPendingRemoveId(sub.qb_id)}
                                      title="Remove follow-up"
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pt-1">
            <Pagination page={page} total={totalPages} onChange={setPage} />
          </div>
        )}
      </main>

      {/* ── Modals ── */}
      <AnimatePresence>
        {viewing && (
          <QuestionDetailModal
            key="detail"
            question={viewing}
            allQuestions={allQuestions}
            onClose={() => setViewing(null)}
          />
        )}
        {showAdd && (
          <AddQuestionModal
            key="add"
            testId={testId!}
            onClose={() => setShowAdd(false)}
            onSuccess={() => {
              setShowAdd(false)
              queryClient.invalidateQueries({ queryKey: ['admin-questions', testId] })
            }}
          />
        )}
        {graphTarget && (
          <GraphModal
            key="graph"
            dagId={graphTarget.dagId}
            questionTitle={graphTarget.title}
            onClose={() => setGraphTarget(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
