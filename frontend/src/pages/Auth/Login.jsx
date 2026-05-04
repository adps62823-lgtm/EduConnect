/**
 * Login.jsx — Sign in page
 * Matches Register.jsx aesthetic exactly (same vars, same components, same layout)
 */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, Zap } from 'lucide-react'
import useAuthStore from '@/store/authStore'
import { Button, Input } from '@/components/ui'

export default function Login() {
  const navigate = useNavigate()
  const login    = useAuthStore(s => s.login)
  const loading  = useAuthStore(s => s.loading)

  const [identifier, setIdentifier] = useState('')
  const [password,   setPassword]   = useState('')
  const [showPass,   setShowPass]   = useState(false)
  const [error,      setError]      = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!identifier.trim()) return setError('Please enter your email or username.')
    if (!password)          return setError('Please enter your password.')

    const result = await login(identifier.trim(), password)
    if (result.success) {
      navigate('/feed', { replace: true })
    } else {
      setError(result.error || 'Invalid credentials. Please try again.')
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'var(--bg)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Background glows */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0
      }}>
        <div style={{
          position: 'absolute',
          top: '-20%',
          left: '-10%',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, var(--primary-glow) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-20%',
          right: '-10%',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, var(--purple-light) 0%, transparent 70%)',
        }} />
      </div>

      {/* Scrollable content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        scrollBehavior: 'smooth',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Content container with padding for centering when content is short */}
        <div style={{
          minHeight: '100dvh',
          padding: '2rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {/* Card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            style={{
              width: '100%',
              maxWidth: 440,
              margin: '0 auto',
            }}
          >
            {/* Logo */}
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                margin: '0 auto 14px',
                background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 32px var(--primary-glow)',
              }}>
                <Zap size={28} color="#fff" fill="#fff" />
              </div>
              <h1 style={{
                margin: 0,
                fontSize: '1.65rem',
                fontWeight: 800,
                background: 'linear-gradient(135deg, var(--text), var(--text-2))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                Welcome back
              </h1>
              <p style={{ color: 'var(--text-3)', fontSize: '0.88rem', marginTop: 6 }}>
                Sign in to your EduConnect account
              </p>
            </div>

            {/* Form */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '36px 28px 28px',
              boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
            }}>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{
                    fontSize: '0.83rem',
                    fontWeight: 600,
                    color: 'var(--text-2)',
                    display: 'block',
                    marginBottom: 6
                  }}>
                    Email or Username
                  </label>
                  <Input
                    type="text"
                    placeholder="you@example.com or @username"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    prefix={<Mail size={15} style={{ color: 'var(--text-3)' }} />}
                    autoComplete="username"
                    autoFocus
                  />
                </div>

                <div>
                  <label style={{
                    fontSize: '0.83rem',
                    fontWeight: 600,
                    color: 'var(--text-2)',
                    display: 'block',
                    marginBottom: 6
                  }}>
                    Password
                  </label>
                  <Input
                    type={showPass ? 'text' : 'password'}
                    placeholder="Your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    prefix={<Lock size={15} style={{ color: 'var(--text-3)' }} />}
                    suffix={
                      <button type="button" onClick={() => setShowPass(v => !v)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text-3)',
                          display: 'flex',
                          padding: 0
                        }}>
                        {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    }
                    autoComplete="current-password"
                  />
                </div>

                {/* Error */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      background: 'var(--red-light, rgba(225,29,72,0.1))',
                      border: '1px solid var(--red, #e11d48)',
                      borderRadius: 'var(--radius)',
                      padding: '10px 14px',
                      fontSize: '0.85rem',
                      color: 'var(--red, #fda4af)',
                    }}
                  >
                    ⚠️ {error}
                  </motion.div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  style={{
                    marginTop: 4,
                    height: 48,
                    fontSize: '1rem',
                    fontWeight: 700
                  }}
                >
                  {loading ? 'Signing in…' : 'Sign In'}
                </Button>
              </form>

              {/* Switch to Register */}
              <p style={{
                textAlign: 'center',
                marginTop: 20,
                fontSize: '0.85rem',
                color: 'var(--text-3)',
              }}>
                Don't have an account?{' '}
                <Link to="/register" style={{
                  color: 'var(--primary)',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}>
                  Create one →
                </Link>
              </p>
              <p style={{
                textAlign: 'center',
                marginTop: 10,
                fontSize: '0.72rem',
                color: 'var(--text-3)',
                marginBottom: '2rem'
              }}>
                By signing in you agree to EduConnect's community guidelines.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
