import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { motion } from 'framer-motion'
import {
  GraduationCap, BookOpen, Star, Pencil, Brain,
  Trophy, Lightbulb, Zap, Users, CheckCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import axios from 'axios'
import { useCookies } from 'react-cookie'
import { useUserAuthStore } from '@/stores/user-auth.store'

function decodeGoogleJWT(token: string) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload as { sub: string; name: string; picture?: string; email?: string }
  } catch {
    return null
  }
}

const floatingIcons = [
  { Icon: BookOpen,    x: '8%',  y: '15%', size: 28, delay: 0,    color: 'text-violet-300/50' },
  { Icon: Star,        x: '88%', y: '10%', size: 20, delay: 0.4,  color: 'text-amber-300/60'  },
  { Icon: Pencil,      x: '5%',  y: '55%', size: 22, delay: 0.8,  color: 'text-indigo-300/50' },
  { Icon: Brain,       x: '92%', y: '45%', size: 26, delay: 0.2,  color: 'text-purple-300/50' },
  { Icon: Trophy,      x: '15%', y: '80%', size: 24, delay: 1.0,  color: 'text-amber-400/50'  },
  { Icon: Lightbulb,   x: '82%', y: '75%', size: 22, delay: 0.6,  color: 'text-yellow-300/50' },
  { Icon: Zap,         x: '50%', y: '6%',  size: 18, delay: 1.2,  color: 'text-violet-400/40' },
  { Icon: GraduationCap, x: '78%', y: '22%', size: 30, delay: 0.3, color: 'text-indigo-300/40' },
  { Icon: Star,        x: '25%', y: '8%',  size: 16, delay: 0.9,  color: 'text-amber-200/50'  },
  { Icon: BookOpen,    x: '60%', y: '88%', size: 20, delay: 0.5,  color: 'text-violet-300/40' },
]

const features = [
  { Icon: CheckCircle, text: 'Timed practice tests' },
  { Icon: Users,       text: 'Track your progress'  },
  { Icon: Brain,       text: 'Smart question flow'  },
]

export default function UserLogin() {
  const navigate = useNavigate()
  const [cookies, setCookie] = useCookies(['auth_token'])
  const { setAuth } = useUserAuthStore()

  useEffect(() => {
    if (cookies.auth_token) navigate('/test', { replace: true })
  }, [cookies.auth_token, navigate])

  const handleGoogleSuccess = async (response: { credential?: string }) => {
    if (!response.credential) return
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_APP_URL}/user/auth/google`,
        { id_token: response.credential }
      )
      const googlePayload = decodeGoogleJWT(response.credential)
      const userId = data.user_id || googlePayload?.sub || ''
      const userName = data.user_name || googlePayload?.name || 'Student'
      const userPicture = data.picture || googlePayload?.picture || undefined
      setCookie('auth_token', data.token, {
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
        sameSite: 'lax',
      })
      setAuth(userId, userName, userPicture)
      navigate('/test', { replace: true })
    } catch {
      toast.error('Sign-in failed. Please try again.')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative min-h-screen overflow-hidden bg-gradient-to-br from-violet-950 via-indigo-950 to-purple-950 flex items-center justify-center px-4"
    >
      {/* Radial glow blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-violet-600/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute top-[40%] left-[40%] w-[300px] h-[300px] rounded-full bg-purple-500/10 blur-[80px]" />
      </div>

      {/* Floating decorative icons */}
      {floatingIcons.map(({ Icon, x, y, size, delay, color }, i) => (
        <motion.div
          key={i}
          className={`absolute pointer-events-none ${color}`}
          style={{ left: x, top: y }}
          animate={{ y: [0, -14, 0], rotate: [0, 6, -6, 0] }}
          transition={{ duration: 4 + i * 0.4, delay, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Icon width={size} height={size} />
        </motion.div>
      ))}

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 240, damping: 22 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo + brand */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 280, damping: 18 }}
            className="relative"
          >
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-violet-900/60">
              <GraduationCap className="w-10 h-10 text-white" />
            </div>
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-violet-500/30 to-indigo-500/30 blur-md -z-10"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <h1 className="text-3xl font-bold text-white tracking-tight">VGYOT</h1>
            <p className="text-violet-300/80 text-sm mt-1 font-medium">Your smart learning companion</p>
          </motion.div>
        </div>

        {/* Main card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white/8 backdrop-blur-xl border border-white/12 rounded-3xl p-8 shadow-2xl shadow-black/30 space-y-7"
        >
          {/* Headline */}
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold text-white">
              Unlock Your Potential
            </h2>
            <p className="text-sm text-violet-200/70 leading-relaxed">
              Sign in to access your personalised tests and start your learning journey.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-col gap-2.5">
            {features.map(({ Icon, text }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 + i * 0.08 }}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/5 border border-white/8"
              >
                <Icon className="w-4 h-4 text-violet-400 shrink-0" />
                <span className="text-sm text-violet-100/80">{text}</span>
              </motion.div>
            ))}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-violet-300/50 font-medium">Continue with</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Google login button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            className="flex justify-center"
          >
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => toast.error('Google sign-in failed. Please try again.')}
              theme="filled_blue"
              size="large"
              text="signin_with"
              shape="rectangular"
              logo_alignment="left"
            />
          </motion.div>

          {/* Footer note */}
          <p className="text-center text-xs text-violet-300/40">
            By signing in, you agree to our Terms of Service
          </p>
        </motion.div>

        {/* Bottom tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center mt-6 text-xs text-violet-400/50"
        >
          Powered by Online Test Platform
        </motion.p>
      </motion.div>
    </motion.div>
  )
}
