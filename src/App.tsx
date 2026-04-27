import './App.css'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Toaster } from 'sonner'
import TestHome from './pages/user/TestHome'
import TakeTest from './pages/user/TakeTest'
import AdminLogin from './pages/admin/AdminLogin'
import AdminTests from './pages/admin/AdminTests'
import AdminTestDetail from './pages/admin/AdminTestDetail'
import AdminAttempts from './pages/admin/AdminAttempts'
import AdminAttemptDetail from './pages/admin/AdminAttemptDetail'
import AdminRoute from './router/AdminRoute'

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path='/' element={<TestHome />} />
        <Route path='/test/:testId' element={<TakeTest />} />
        <Route path='/admin/login' element={<AdminLogin />} />
        <Route path='/admin' element={<AdminRoute><AdminTests /></AdminRoute>} />
        <Route path='/admin/test/:testId' element={<AdminRoute><AdminTestDetail /></AdminRoute>} />
        <Route path='/admin/test/:testId/attempts' element={<AdminRoute><AdminAttempts /></AdminRoute>} />
        <Route path='/admin/attempts/:attemptId' element={<AdminRoute><AdminAttemptDetail /></AdminRoute>} />
      </Routes>
    </AnimatePresence>
  )
}

function App() {
  return (
    <>
      <Toaster richColors />
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
    </>
  )
}

export default App
