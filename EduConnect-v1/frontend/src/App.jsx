import React, { useEffect, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AnimatePresence, motion } from 'framer-motion'

import useAuthStore from '@/store/authStore'
import useThemeStore from '@/store/themeStore'
import Layout from '@/components/Layout'

// ── Lazy-loaded pages ─────────────────────────────────────
const Login       = lazy(() => import('@/pages/Auth/Login'))
const Register    = lazy(() => import('@/pages/Auth/Register'))
const Feed        = lazy(() => import('@/pages/Feed'))
const HelpForum   = lazy(() => import('@/pages/HelpForum'))
const QuestionDetail = lazy(() => import('@/pages/QuestionDetail'))
const AskQuestion = lazy(() => import('@/pages/AskQuestion'))
const Chat        = lazy(() => import('@/pages/Chat'))
const ChatConversation = lazy(() => import('@/pages/ChatConversation'))
const StudyRooms  = lazy(() => import('@/pages/StudyRooms'))
const RoomSession = lazy(() => import('@/pages/RoomSession'))
const Profile     = lazy(() => import('@/pages/Profile'))
const Mentor      = lazy(() => import('@/pages/Mentor'))
const Resources   = lazy(() => import('@/pages/Resources'))
const Colleges    = lazy(() => import('@/pages/Colleges'))
const Leaderboard = lazy(() => import('@/pages/Leaderboard'))
const StreakWars   = lazy(() => import('@/pages/StreakWars'))
const Journey     = lazy(() => import('@/pages/Journey'))
const Explore     = lazy(() => import('@/pages/Explore'))
const Notifications = lazy(() => import('@/pages/Notifications'))
const Settings    = lazy(() => import('@/pages/Settings'))k

// ── Page transition wrapper ───────────────────────────────
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

// ── Loading fallback ──────────────────────────────────────
const PageLoader = () => (
  <div style={{
    height: '100%', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    background: 'var(--bg)'
  }}>
    <div className="loading-dots">
      <span /><span /><span />
    </div>
  </div>
)

// ── Auth guard ────────────────────────────────────────────
const RequireAuth = ({ children }) => {
  const token = useAuthStore(s => s.token)
  const location = useLocation()
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return children
}

const GuestOnly = ({ children }) => {
  const token = useAuthStore(s => s.token)
  if (token) return <Navigate to="/" replace />
  return children
}

// ── Animated routes ───────────────────────────────────────
const AnimatedRoutes = () => {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>

        {/* ── Auth ── */}
        <Route path="/login" element={
          <GuestOnly>
            <PageWrapper><Login /></PageWrapper>
          </GuestOnly>
        } />
        <Route path="/register" element={
          <GuestOnly>
            <PageWrapper><Register /></PageWrapper>
          </GuestOnly>
        } />

        {/* ── App (protected) ── */}
        <Route element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }>
          <Route index element={<Navigate to="/feed" replace />} />

          {/* Feed / Instagram */}
          <Route path="/feed" element={<PageWrapper><Feed /></PageWrapper>} />
          <Route path="/explore" element={<PageWrapper><Explore /></PageWrapper>} />

          {/* Help Forum / Stack Overflow */}
          <Route path="/help" element={<PageWrapper><HelpForum /></PageWrapper>} />
          <Route path="/help/ask" element={<PageWrapper><AskQuestion /></PageWrapper>} />
          <Route path="/help/:questionId" element={<PageWrapper><QuestionDetail /></PageWrapper>} />

          {/* Chat / WhatsApp */}
          <Route path="/chat" element={<PageWrapper><Chat /></PageWrapper>} />
          <Route path="/chat/:chatId" element={<PageWrapper><ChatConversation /></PageWrapper>} />

          {/* Study Rooms / Zoom-lite */}
          <Route path="/rooms" element={<PageWrapper><StudyRooms /></PageWrapper>} />
          <Route path="/rooms/:roomId" element={<PageWrapper><RoomSession /></PageWrapper>} />

          {/* Profile / Facebook */}
          <Route path="/profile" element={<PageWrapper><Profile /></PageWrapper>} />
          <Route path="/profile/:username" element={<PageWrapper><Profile /></PageWrapper>} />

          {/* Mentor / LinkedIn */}
          <Route path="/mentor" element={<PageWrapper><Mentor /></PageWrapper>} />

          {/* Resources */}
          <Route path="/resources" element={<PageWrapper><Resources /></PageWrapper>} />

          {/* Colleges */}
          <Route path="/colleges" element={<PageWrapper><Colleges /></PageWrapper>} />

          {/* Gamification */}
          <Route path="/leaderboard" element={<PageWrapper><Leaderboard /></PageWrapper>} />
          <Route path="/streak-wars" element={<PageWrapper><StreakWars /></PageWrapper>} />

          {/* Journey */}
          <Route path="/journey" element={<PageWrapper><Journey /></PageWrapper>} />

          {/* Notifications */}
          <Route path="/notifications" element={<PageWrapper><Notifications /></PageWrapper>} />

          {/* Settings */}
          <Route path="/settings" element={<PageWrapper><Settings /></PageWrapper>} />
        </Route>

        {/* 404 */}
        <Route path="*" element={
          <div style={{
            height: '100vh', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 16,
            background: 'var(--bg)', color: 'var(--text)'
          }}>
            <div style={{ fontSize: '4rem' }}>📚</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>Page not found</div>
            <a href="/feed" style={{ color: 'var(--primary)' }}>Go back to Feed</a>
          </div>
        } />
      </Routes>
    </AnimatePresence>
  )
}

// ── Root App ──────────────────────────────────────────────
export default function App() {
  const { initAuth } = useAuthStore()
  const { applyTheme } = useThemeStore()

  // Restore auth from localStorage on mount
  useEffect(() => {
    initAuth()
  }, [])

  // Apply saved theme on mount
  useEffect(() => {
    applyTheme()
  }, [])

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <AnimatedRoutes />
      </Suspense>

      {/* Global toast notifications */}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--surface)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            fontSize: '0.875rem',
            fontFamily: 'var(--font-main)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: 'var(--surface)' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: 'var(--surface)' },
          },
        }}
      />
    </BrowserRouter>
  )
}
