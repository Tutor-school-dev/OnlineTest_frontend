import './App.css'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Toaster } from 'sonner'
import UserLogin from './pages/user/UserLogin'
import TestHome from './pages/user/TestHome'
import TakeTest from './pages/user/TakeTest'
import AdminLogin from './pages/admin/AdminLogin'
import AdminTests from './pages/admin/AdminTests'
import AdminTestDetail from './pages/admin/AdminTestDetail'
import AdminAttempts from './pages/admin/AdminAttempts'
import AdminAttemptDetail from './pages/admin/AdminAttemptDetail'
import AdminOverallResults from './pages/admin/AdminOverallResults'
import UserAttempts from './pages/user/UserAttempts'
import UserAttemptDetail from './pages/user/UserAttemptDetail'
import UserOverallResults from './pages/user/UserOverallResults'
import AdminRoute from './router/AdminRoute'
import UserRoute from './router/UserRoute'

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path='/' element={<UserLogin />} />
        <Route path='/test' element={<UserRoute><TestHome /></UserRoute>} />
        <Route path='/test/:testId' element={<UserRoute><TakeTest /></UserRoute>} />
        <Route path='/test/:testId/attempts' element={<UserRoute><UserAttempts /></UserRoute>} />
        <Route path='/attempts/:attemptId' element={<UserRoute><UserAttemptDetail /></UserRoute>} />
        <Route path='/attempts/:attemptId/overall-results' element={<UserRoute><UserOverallResults /></UserRoute>} />
        <Route path='/admin/login' element={<AdminLogin />} />
        <Route path='/admin' element={<AdminRoute><AdminTests /></AdminRoute>} />
        <Route path='/admin/test/:testId' element={<AdminRoute><AdminTestDetail /></AdminRoute>} />
        <Route path='/admin/test/:testId/attempts' element={<AdminRoute><AdminAttempts /></AdminRoute>} />
        <Route path='/admin/attempts/:attemptId' element={<AdminRoute><AdminAttemptDetail /></AdminRoute>} />
        <Route path='/admin/attempts/:attemptId/overall-results' element={<AdminRoute><AdminOverallResults /></AdminRoute>} />
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
