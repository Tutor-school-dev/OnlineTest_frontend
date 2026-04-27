import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation } from '@tanstack/react-query'
import {
  Clock, GraduationCap, ChevronLeft, ChevronRight,
  BookOpen, AlertTriangle, Check, X,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion'
import { useQuestions } from '@/hooks/useQuestions'
import { submitTest } from '@/api/tests.api'
import type { Test } from '@/types/test'
import type { Question, QuestionOption } from '@/types/question'

const USER_ID = '3f8f3c8e-6d2a-4b7f-9e5c-2d9a7f1c4e21'
const USER_NAME = 'Madan'

// ─── Timer ───────────────────────────────────────────────────────────────────

function useCountdown(totalSeconds: number, onExpire: () => void) {
  const [remaining, setRemaining] = useState(totalSeconds)
  const expireRef = useRef(onExpire)
  expireRef.current = onExpire

  useEffect(() => {
    if (remaining <= 0) { expireRef.current(); return }
    const id = setInterval(() =>
      setRemaining(r => (r <= 1 ? 0 : r - 1)), 1000)
    return () => clearInterval(id)
  }, [remaining])

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')
  return { display: `${mm}:${ss}`, isWarning: remaining < 120, remaining }
}

// ─── Option button ────────────────────────────────────────────────────────────

function OptionButton({
  option, selected, onChange,
}: {
  option: QuestionOption
  selected: boolean
  onChange: () => void
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-sm ${
        selected
          ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
          : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/60 text-slate-700'
      }`}
    >
      <span className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
        selected ? 'border-emerald-500' : 'border-slate-300'
      }`}>
        {selected && <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
      </span>
      {option.qo_title}
    </button>
  )
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function QuestionSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <Skeleton className="h-4 w-24 rounded-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-5 w-4/5" />
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
        </div>
      </div>
    </div>
  )
}

// ─── Sub-question ─────────────────────────────────────────────────────────────

function SubQuestion({
  question, index, answers, onAnswer,
}: {
  question: Question
  index: number
  answers: Record<string, string>
  onAnswer: (qId: string, oId: string) => void
}) {
  return (
    <div className="space-y-2.5">
      <p className="text-[13px] text-slate-500 font-medium mb-3">
        Follow-up {index + 1}: {question.qb_title}
      </p>
      <div className="space-y-2">
        {question.options.map(opt => (
          <OptionButton
            key={opt.qo_id}
            option={opt}
            selected={answers[question.qb_id] === opt.qo_id}
            onChange={() => onAnswer(question.qb_id, opt.qo_id)}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Confirm overlay ─────────────────────────────────────────────────────────

function ConfirmOverlay({
  answeredCount, totalParents, onCancel, onConfirm,
}: {
  answeredCount: number
  totalParents: number
  onCancel: () => void
  onConfirm: () => void
}) {
  const unanswered = totalParents - answeredCount
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-5"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-amber-500" />
          </div>
          <h2 className="text-lg font-semibold text-slate-800">Submit Test?</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            {unanswered > 0
              ? `You have ${unanswered} unanswered question${unanswered > 1 ? 's' : ''}. Unanswered questions will be skipped.`
              : 'You have answered all questions. Ready to submit?'}
          </p>
          <div className="flex items-center gap-5 text-sm font-medium">
            <span className="flex items-center gap-1.5 text-emerald-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {answeredCount} answered
            </span>
            {unanswered > 0 && (
              <span className="flex items-center gap-1.5 text-amber-500">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                {unanswered} skipped
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-sm font-medium text-white shadow-sm transition"
          >
            Submit Test
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Submitting overlay ───────────────────────────────────────────────────────

function SubmittingOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm gap-5"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-12 h-12 rounded-full border-4 border-emerald-100 border-t-emerald-600"
      />
      <p className="text-slate-600 font-medium">Submitting your test…</p>
    </motion.div>
  )
}

// ─── Success overlay ──────────────────────────────────────────────────────────

function SuccessOverlay({ onBack }: { onBack: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-white via-emerald-50/60 to-blue-50/40 gap-7 px-4"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 16, delay: 0.05 }}
        className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-200"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.28, type: 'spring', stiffness: 300 }}
        >
          <Check className="w-12 h-12 text-white" strokeWidth={3} />
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.32 }}
        className="text-center space-y-2"
      >
        <h2 className="text-2xl font-bold text-slate-800">Test Submitted!</h2>
        <p className="text-slate-500 text-sm">Your responses have been recorded successfully.</p>
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.48 }}
        onClick={onBack}
        className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 text-white text-sm font-semibold shadow-md hover:shadow-lg transition-shadow"
      >
        Back to Tests
      </motion.button>
    </motion.div>
  )
}

// ─── Error overlay ────────────────────────────────────────────────────────────

function ErrorOverlay({
  message, onRetry, onBack,
}: {
  message: string
  onRetry: () => void
  onBack: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm gap-6 px-4"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 16 }}
        className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center"
      >
        <X className="w-10 h-10 text-red-500" strokeWidth={2.5} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="text-center space-y-2"
      >
        <h2 className="text-xl font-semibold text-slate-800">Submission Failed</h2>
        <p className="text-sm text-slate-500 max-w-xs">{message}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.22 }}
        className="flex gap-3"
      >
        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
        >
          Back to Tests
        </button>
        <button
          onClick={onRetry}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-sm font-medium text-white shadow-sm transition"
        >
          Try Again
        </button>
      </motion.div>
    </motion.div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TakeTest() {
  const { testId } = useParams<{ testId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const test = location.state?.test as Test | undefined

  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [confirming, setConfirming] = useState(false)

  const totalSeconds = (test?.ot_total_time ?? 0) * 60
  const remainingRef = useRef(totalSeconds)

  const { data, isLoading, isError } = useQuestions(testId ?? '')
  const questions = data?.data ?? []

  const { parents, subMap } = useMemo(() => {
    const parents = questions.filter(q => !q.qb_parent)
    const subMap: Record<string, Question[]> = {}
    questions
      .filter(q => q.qb_parent)
      .forEach(q => {
        if (!subMap[q.qb_parent!]) subMap[q.qb_parent!] = []
        subMap[q.qb_parent!].push(q)
      })
    return { parents, subMap }
  }, [questions])

  const currentParent = parents[currentIdx]
  const currentSubs = currentParent ? (subMap[currentParent.qb_id] ?? []) : []
  const isFirst = currentIdx === 0
  const isLast = currentIdx === parents.length - 1
  const answeredParents = parents.filter(p => answers[p.qb_id]).length

  const mutation = useMutation({ mutationFn: submitTest })

  const triggerSubmit = useCallback(() => {
    setConfirming(false)
    mutation.mutate({
      test_id: testId!,
      user_id: USER_ID,
      user_name: USER_NAME,
      time_taken: totalSeconds - remainingRef.current,
      answers,
    })
  }, [mutation.mutate, testId, totalSeconds, answers])

  const { display: timerDisplay, isWarning, remaining } = useCountdown(
    totalSeconds,
    triggerSubmit,
  )
  remainingRef.current = remaining

  // Block browser/tab close while test is in progress
  useEffect(() => {
    if (mutation.isPending || mutation.isSuccess) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = 'This will submit the test. Want to continue?'
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [mutation.isPending, mutation.isSuccess])

  // Redirect if test data missing (direct URL access)
  useEffect(() => {
    if (!test) navigate('/', { replace: true })
  }, [test, navigate])

  const setAnswer = (qId: string, oId: string) =>
    setAnswers(prev => ({ ...prev, [qId]: oId }))

  if (!test) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-emerald-50/20 flex flex-col"
    >
      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 shrink-0 rounded-lg bg-gradient-to-br from-blue-600 to-emerald-500 flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-400 leading-none">Online Test</p>
              <p className="text-sm font-semibold text-slate-800 truncate">{test.ot_name}</p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1 text-xs text-slate-500">
              <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
              {test.ot_total_question} Qs
            </div>

            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-sm font-bold transition-colors ${
              isWarning ? 'bg-red-100 text-red-600 ring-1 ring-red-200' : 'bg-blue-100 text-blue-700'
            }`}>
              <Clock className={`w-4 h-4 ${isWarning ? 'animate-pulse' : ''}`} />
              {timerDisplay}
            </div>

            <button
              onClick={() => setConfirming(true)}
              className="hidden sm:flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors px-2 py-1 rounded-md hover:bg-red-50"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Exit
            </button>
          </div>
        </div>

        <div className="h-1 bg-slate-100">
          <div
            className="h-1 bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${parents.length ? ((currentIdx + 1) / parents.length) * 100 : 0}%` }}
          />
        </div>
      </header>

      {/* ── Content ── */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 pb-28 space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Question{' '}
            <span className="font-semibold text-slate-800">{currentIdx + 1}</span>
            {' '}of{' '}
            <span className="font-semibold text-slate-800">{parents.length || '—'}</span>
          </p>
          <p className="text-xs text-slate-400">
            {answeredParents} of {parents.length} answered
          </p>
        </div>

        {isLoading ? (
          <QuestionSkeleton />
        ) : isError ? (
          <div className="text-center py-20 text-slate-500">
            <p className="font-medium">Failed to load questions</p>
            <p className="text-sm mt-1">Check your connection and try again.</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentParent?.qb_id}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.22 }}
              className="space-y-5"
            >
              {/* Parent question */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
                <div className="flex items-start gap-3">
                  <span className="shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-emerald-500 text-white text-xs font-bold flex items-center justify-center">
                    {currentIdx + 1}
                  </span>
                  <p className="text-base font-semibold text-slate-800 leading-snug">
                    {currentParent?.qb_title}
                  </p>
                </div>
                <div className="space-y-2.5">
                  {currentParent?.options.map(opt => (
                    <OptionButton
                      key={opt.qo_id}
                      option={opt}
                      selected={answers[currentParent.qb_id] === opt.qo_id}
                      onChange={() => setAnswer(currentParent.qb_id, opt.qo_id)}
                    />
                  ))}
                </div>
              </div>

              {/* Sub-questions — revealed only after parent is answered */}
              {currentSubs.length > 0 && answers[currentParent?.qb_id] && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  <div className="flex items-center gap-2 px-6 pt-5 pb-2">
                    <span className="w-1.5 h-4 rounded-full bg-gradient-to-b from-blue-500 to-emerald-500" />
                    <p className="text-sm font-semibold text-slate-700">Follow-up Questions</p>
                    <span className="ml-auto text-xs text-slate-400">
                      {currentSubs.filter(s => answers[s.qb_id]).length}/{currentSubs.length} answered
                    </span>
                  </div>
                  <Accordion
                    type="multiple"
                    defaultValue={currentSubs.map(s => s.qb_id)}
                    className="px-6"
                  >
                    {currentSubs.map((sub, i) => (
                      <AccordionItem key={sub.qb_id} value={sub.qb_id}>
                        <AccordionTrigger className={`text-sm font-medium py-3 gap-2 ${
                          answers[sub.qb_id] ? 'text-emerald-700' : 'text-slate-700'
                        }`}>
                          <span className="flex items-center gap-2 min-w-0">
                            <span className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-colors ${
                              answers[sub.qb_id]
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                                : 'border-slate-300 text-slate-400'
                            }`}>
                              {i + 1}
                            </span>
                            <span className="truncate text-left">Follow-up {i + 1}</span>
                          </span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <SubQuestion
                            question={sub}
                            index={i}
                            answers={answers}
                            onAnswer={setAnswer}
                          />
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* ── Sticky footer nav ── */}
      <div className="fixed bottom-0 inset-x-0 z-20 bg-white/90 backdrop-blur-md border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
          <button
            onClick={() => setCurrentIdx(i => i - 1)}
            disabled={isFirst || isLoading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="w-4 h-4" />
            Prev
          </button>

          <div className="flex-1 flex items-center justify-center gap-1.5 overflow-x-auto">
            {parents.map((p, i) => (
              <button
                key={p.qb_id}
                onClick={() => setCurrentIdx(i)}
                title={`Question ${i + 1}`}
                className={`rounded-full transition-all shrink-0 ${
                  i === currentIdx ? 'w-5 h-2 bg-blue-600'
                  : answers[p.qb_id] ? 'w-2 h-2 bg-emerald-400'
                  : 'w-2 h-2 bg-slate-300 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => isLast ? setConfirming(true) : setCurrentIdx(i => i + 1)}
            disabled={isLoading || !currentParent}
            className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-medium text-white shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all ${
              isLast
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-700 hover:to-emerald-600'
            }`}
          >
            {isLast ? 'Submit Test' : 'Next'}
            {!isLast && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ── Overlays ── */}
      <AnimatePresence>
        {confirming && !mutation.isPending && (
          <ConfirmOverlay
            key="confirm"
            answeredCount={answeredParents}
            totalParents={parents.length}
            onCancel={() => setConfirming(false)}
            onConfirm={triggerSubmit}
          />
        )}
        {mutation.isPending && <SubmittingOverlay key="submitting" />}
        {mutation.isSuccess && (
          <SuccessOverlay key="success" onBack={() => navigate('/', { replace: true })} />
        )}
        {mutation.isError && (
          <ErrorOverlay
            key="error"
            message={(mutation.error as Error)?.message ?? 'Something went wrong. Please try again.'}
            onRetry={triggerSubmit}
            onBack={() => navigate('/', { replace: true })}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
