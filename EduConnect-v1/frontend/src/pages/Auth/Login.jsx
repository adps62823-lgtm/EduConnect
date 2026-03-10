/**
 * Login.jsx — Auth screen
 * Email or username login · animated · school hint · link to register
 */
import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, Zap } from 'lucide-react'
import useAuthStore from '@/store/authStore'
import { Button, Input, Divider } from '@/components/ui'

export default function Login() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const login     = useAuthStore(s => s.login)
  const loading   = useAuthStore(s => s.loading)

  const [form, setForm]         = useState({ identifier: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [errors, setErrors]     = useState({})

  const from = location.state?.from?.pathname || '/feed'

  function validate() {
    const e = {}
    if (!form.identifier.trim()) e.identifier = 'Email or username is required.'
    if (!form.password)          e.password   = 'Password is required.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev) {
    ev.preventDefault()
    if (!validate()) return
    const result = await login(form.identifier.trim(), form.password)
    if (result.success) navigate(from, { replace: true })
  }

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: 16,
    }}>
      {/* Background glow blobs */}
      <div style={{
        position: 'fixed', inset: 0, overflow: 'hidden',
        pointerEvents: 'none', zIndex: 0,
      }}>
        <div style={{
          position: 'absolute', top: '10%', left: '15%',
          width: 400, height: 400,
          background: 'radial-gradient(circle, var(--primary-glow) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '10%', right: '10%',
          width: 350, height: 350,
          background: 'radial-gradient(circle, var(--accent-light) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        style={{
          width: '100%', maxWidth: 420,
          position: 'relative', zIndex: 1,
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 64, height: 64,
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              borderRadius: 20,
              marginBottom: 16,
              boxShadow: '0 8px 32px var(--primary-glow)',
            }}
          >
            <Zap size={32} color="#fff" />
          </motion.div>

          <h1 style={{
            background: 'linear-gradient(135deg, var(--text), var(--text-2))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.04em',
          }}>
            EduConnect
          </h1>
          <p style={{ color: 'var(--text-3)', marginTop: 6, fontSize: '0.9rem' }}>
            Study together · Learn faster
          </p>
        </div>

        {/* Card */}
        <div className="card-glass" style={{ padding: 28 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 6 }}>
            Welcome back 👋
          </h2>
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', marginBottom: 24 }}>
            Sign in with your email or username.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Input
              label="Email or Username"
              placeholder="you@school.edu or @username"
              value={form.identifier}
              onChange={set('identifier')}
              error={errors.identifier}
              prefix={<Mail size={15} />}
              autoComplete="username"
              autoFocus
            />

            <Input
              label="Password"
              type={showPass ? 'text' : 'password'}
              placeholder="Your password"
              value={form.password}
              onChange={set('password')}
              error={errors.password}
              prefix={<Lock size={15} />}
              suffix={
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer',
                           color: 'var(--text-3)', display: 'flex', padding: 0 }}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              }
              autoComplete="current-password"
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              style={{ width: '100%', marginTop: 4 }}
            >
              Sign In
            </Button>
          </form>

          <Divider label="don't have an account?" />

          <Link to="/register">
            <Button variant="ghost" style={{ width: '100%' }}>
              Create account
            </Button>
          </Link>
        </div>

        {/* Footer note */}
        <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 20 }}>
          By signing in you agree to EduConnect's terms of service.
        </p>
      </motion.div>
    </div>
  )
}
