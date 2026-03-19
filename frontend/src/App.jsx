import React, { useEffect, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AnimatePresence, motion } from 'framer-motion'
import useAuthStore from '@/store/authStore'
import useThemeStore from '@/store/themeStore'
import Layout from '@/components/Layout'

const Login          = lazy(() => import('@/pages/Auth/Login'))
const Register       = lazy(() => import('@/pages/Auth/Register'))
const Feed           = lazy(() => import('@/pages/Feed'))
const HelpForum      = lazy(() => import('@/pages/HelpForum'))
const QuestionDetail = lazy(() => import('@/pages/QuestionDetail'))
const AskQuestion    = lazy(() => import('@/pages/AskQuestion'))
const Chat           = lazy(() => import('@/pages/Chat'))
const ChatConversation = lazy(() => import('@/pages/ChatConversation'))
const StudyRooms     = lazy(() => import('@/pages/StudyRooms'))
const RoomSession    = lazy(() => import('@/pages/RoomSession'))
const Profile        = lazy(() => import('@/pages/Profile'))
const Mentor         = lazy(() => import('@/pages/Mentor'))
const Resources      = lazy(() => import('@/pages/Resources'))
const Colleges       = lazy(() => import('@/pages/Colleges'))
const Leaderboard    = lazy(() => import('@/pages/Leaderboard'))
const StreakWars      = lazy(() => import('@/pages/StreakWars'))
const Journey        = lazy(() => import('@/pages/Journey'))
const Explore        = lazy(() => import('@/pages/Explore'))
const Notifications  = lazy(() => import('@/pages/Notifications'))
const Settings       = lazy(() => import('@/pages/Settings'))

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, info: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, info) {
    this.setState({ info })
    console.error('EduConnect crash:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#0f0f1a', color: '#e8e8f0',
          padding: 32, fontFamily: 'monospace', gap: 16,
        }}>
          <div style={{ fontSize: '3rem' }}>💥</div>
          <h2 style={{ margin: 0, color: '#ef4444' }}>Something crashed</h2>
          <div style={{
            background: '#1e1e35', border: '1px solid #ef444440',
            borderRadius: 12, padding: '16px 20px',
            maxWidth: 700, width: '100%', overflowX: 'auto',
          }}>
            <p style={{ color: '#ef4444', margin: '0 0 8px', fontWeight: 700 }}>
              {this.state.error?.toString()}
            </p>
            <pre style={{ color: '#94a3b8', fontSize: '0.75rem', margin: 0, whiteSpace: 'pre-wrap' }}>
              {this.state.info?.componentStack}
            </pre>
          </div>
          <button
            onClick={() => { sessionStorage.clear(); window.location.href = '/login' }}
            style={{
              background: '#6366f1', color: '#fff', border: 'none',
              padding: '10px 24px', borderRadius: 10, cursor: 'pointer',
              fontWeight: 700, fontSize: '0.95rem',
            }}
          >
            Clear session and go to Login
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

const PageWrapper = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.2, ease: 'easeOut' }}
    style={{ height: '100%', width: '100%' }}
  >
    {children}
  </motion.div>
)

const PageLoader = () => (
  <div style={{
    height: '100vh', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    background: '#0f0f1a',
  }}>
    <div className="loading-dots"><span /><span /><span /></div>
  </div>
)

const RequireAuth = ({ children }) => {
  const token    = useAuthStore(s => s.token)
  const location = useLocation()
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

const GuestOnly = ({ children }) => {
  const token = useAuthStore(s => s.token)
  if (token) return <Navigate to="/feed" replace />
  return children
}

const AnimatedRoutes = () => {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<GuestOnly><PageWrapper><Login /></PageWrapper></GuestOnly>} />
        <Route path="/register" element={<GuestOnly><PageWrapper><Register /></PageWrapper></GuestOnly>} />
        <Route element={<RequireAuth><Layout /></RequireAuth>}>
          <Route index element={<Navigate to="/feed" replace />} />
          <Route path="/feed"              element={<PageWrapper><Feed /></PageWrapper>} />
          <Route path="/explore"           element={<PageWrapper><Explore /></PageWrapper>} />
          <Route path="/help"              element={<PageWrapper><HelpForum /></PageWrapper>} />
          <Route path="/help/ask"          element={<PageWrapper><AskQuestion /></PageWrapper>} />
          <Route path="/help/:questionId"  element={<PageWrapper><QuestionDetail /></PageWrapper>} />
          <Route path="/chat"              element={<PageWrapper><Chat /></PageWrapper>} />
          <Route path="/chat/:chatId"      element={<PageWrapper><ChatConversation /></PageWrapper>} />
          <Route path="/rooms"             element={<PageWrapper><StudyRooms /></PageWrapper>} />
          <Route path="/rooms/:roomId"     element={<PageWrapper><RoomSession /></PageWrapper>} />
          <Route path="/profile"           element={<PageWrapper><Profile /></PageWrapper>} />
          <Route path="/profile/:username" element={<PageWrapper><Profile /></PageWrapper>} />
          <Route path="/mentor"            element={<PageWrapper><Mentor /></PageWrapper>} />
          <Route path="/resources"         element={<PageWrapper><Resources /></PageWrapper>} />
          <Route path="/colleges"          element={<PageWrapper><Colleges /></PageWrapper>} />
          <Route path="/leaderboard"       element={<PageWrapper><Leaderboard /></PageWrapper>} />
          <Route path="/streak-wars"       element={<PageWrapper><StreakWars /></PageWrapper>} />
          <Route path="/journey"           element={<PageWrapper><Journey /></PageWrapper>} />
          <Route path="/notifications"     element={<PageWrapper><Notifications /></PageWrapper>} />
          <Route path="/settings"          element={<PageWrapper><Settings /></PageWrapper>} />
        </Route>
        <Route path="*" element={
          <div style={{ height:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, background:'#0f0f1a', color:'#e8e8f0' }}>
            <div style={{ fontSize:'4rem' }}>📚</div>
            <div style={{ fontSize:'1.5rem', fontWeight:700 }}>Page not found</div>
            <a href="/feed" style={{ color:'#6366f1' }}>Go back to Feed</a>
          </div>
        } />
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  const { initAuth }   = useAuthStore()
  const { applyTheme } = useThemeStore()
  useEffect(() => { initAuth()   }, [])
  useEffect(() => { applyTheme() }, [])
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <AnimatedRoutes />
        </Suspense>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: 'var(--surface)', color: 'var(--text)',
              border: '1px solid var(--border)', borderRadius: '12px',
              fontSize: '0.875rem', fontFamily: 'var(--font-main)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            },
            success: { iconTheme: { primary: '#10b981', secondary: 'var(--surface)' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: 'var(--surface)' } },
          }}
        />
      </BrowserRouter>
    </ErrorBoundary>
  )
}
