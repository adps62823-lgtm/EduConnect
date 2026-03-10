/**
 * Register.jsx — Multi-step registration
 * Step 1: Name · Email · Username · Password
 * Step 2: Exam target · Grade · School · Language
 */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Mail, Lock, Eye, EyeOff, Zap, ChevronRight, ChevronLeft, GraduationCap } from 'lucide-react'
import useAuthStore from '@/store/authStore'
import { Button, Input, Divider } from '@/components/ui'

// ── Exam presets ──────────────────────────────────────────
const EXAM_OPTIONS = [
  { id: 'JEE',      label: 'JEE',       emoji: '⚛️' },
  { id: 'NEET',     label: 'NEET',      emoji: '🩺' },
  { id: 'UPSC',     label: 'UPSC',      emoji: '🏛️' },
  { id: 'CAT',      label: 'CAT/MBA',   emoji: '📊' },
  { id: 'GATE',     label: 'GATE',      emoji: '🔬' },
  { id: 'CA',       label: 'CA',        emoji: '💼' },
  { id: 'SAT',      label: 'SAT/ACT',   emoji: '🎓' },
  { id: 'GCSE',     label: 'GCSE/A-Level', emoji: '🇬🇧' },
  { id: 'IB',       label: 'IB Diploma', emoji: '🌍' },
  { id: 'Other',    label: 'Other',     emoji: '📚' },
]

const GRADE_OPTIONS = [
  '9th Grade', '10th Grade', '11th Grade', '12th Grade',
  '1st Year (College)', '2nd Year', '3rd Year', '4th Year', 'Postgraduate',
]

const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'kn', label: 'Kannada' },
  { code: 'mr', label: 'Marathi' },
  { code: 'bn', label: 'Bengali' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ar', label: 'Arabic' },
]

// ── Validation helpers ────────────────────────────────────
function validateStep1(form) {
  const e = {}
  if (!form.name.trim() || form.name.trim().length < 2)
    e.name = 'Full name must be at least 2 characters.'
  if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
    e.email = 'Please enter a valid email.'
  if (!form.username.match(/^[a-zA-Z0-9_]{3,20}$/))
    e.username = 'Username: 3–20 chars, letters/numbers/underscore only.'
  if (form.password.length < 2)
    e.password = 'Password must be at least 2 characters.'
  if (form.password !== form.confirm)
    e.confirm = 'Passwords do not match.'
  return e
}

function validateStep2(form) {
  const e = {}
  if (!form.exam_target) e.exam_target = 'Please select your exam target.'
  return e
}

// ── Step indicator ────────────────────────────────────────
function StepDots({ step }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 24 }}>
      {[1, 2].map(s => (
        <motion.div
          key={s}
          animate={{
            width: step === s ? 24 : 8,
            background: step === s ? 'var(--primary)' : 'var(--border-2)',
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          style={{ height: 8, borderRadius: 4 }}
        />
      ))}
    </div>
  )
}

export default function Register() {
  const navigate  = useNavigate()
  const register  = useAuthStore(s => s.register)
  const loading   = useAuthStore(s => s.loading)

  const [step, setStep]         = useState(1)
  const [showPass, setShowPass] = useState(false)
  const [errors, setErrors]     = useState({})

  const [form, setForm] = useState({
    name: '', email: '', username: '', password: '', confirm: '',
    exam_target: '', grade: '', school: '', language: 'en',
  })

  const set = (key) => (e) =>
    setForm(f => ({ ...f, [key]: typeof e === 'string' ? e : e.target.value }))

  async function handleNext(ev) {
    ev.preventDefault()
    const errs = validateStep1(form)
    setErrors(errs)
    if (Object.keys(errs).length === 0) setStep(2)
  }

  async function handleSubmit(ev) {
    ev.preventDefault()
    const errs = validateStep2(form)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    const { confirm, ...payload } = form
    const result = await register(payload)
    if (result.success) navigate('/feed', { replace: true })
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: 16,
      overflowY: 'auto',
    }}>
      {/* Glow blobs */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{
          position: 'absolute', top: '5%', right: '10%',
          width: 400, height: 400,
          background: 'radial-gradient(circle, var(--primary-glow) 0%, transparent 70%)',
          filter: 'blur(70px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '5%', left: '5%',
          width: 350, height: 350,
          background: 'radial-gradient(circle, var(--purple-light) 0%, transparent 70%)',
          filter: 'blur(70px)',
        }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 56, height: 56,
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            borderRadius: 16, marginBottom: 12,
            boxShadow: '0 8px 32px var(--primary-glow)',
          }}>
            <Zap size={28} color="#fff" />
          </div>
          <h1 style={{
            background: 'linear-gradient(135deg, var(--text), var(--text-2))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.04em',
          }}>
            Join EduConnect
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', marginTop: 4 }}>
            {step === 1 ? 'Create your account' : 'Tell us about your studies'}
          </p>
        </div>

        <div className="card-glass" style={{ padding: 28 }}>
          <StepDots step={step} />

          <AnimatePresence mode="wait">

            {/* ── STEP 1: Account Details ── */}
            {step === 1 && (
              <motion.form
                key="step1"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleNext}
                style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
              >
                <h3 style={{ fontWeight: 700, marginBottom: 4 }}>Account Details</h3>

                <Input
                  label="Full Name"
                  placeholder="Riya Sharma"
                  value={form.name}
                  onChange={set('name')}
                  error={errors.name}
                  prefix={<User size={15} />}
                  autoFocus
                />

                <Input
                  label="Email"
                  type="email"
                  placeholder="riya@yourschool.edu"
                  value={form.email}
                  onChange={set('email')}
                  error={errors.email}
                  prefix={<Mail size={15} />}
                  hint="Use your school/college email if available."
                  autoComplete="email"
                />

                <Input
                  label="Username"
                  placeholder="riya_sharma"
                  value={form.username}
                  onChange={e => set('username')({ target: { value: e.target.value.toLowerCase().replace(/\s/g,'') }})}
                  error={errors.username}
                  prefix={<span style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>@</span>}
                  hint="3–20 characters, letters/numbers/underscore."
                  autoComplete="username"
                />

                <Input
                  label="Password"
                  type={showPass ? 'text' : 'password'}
                  placeholder="At least 6 characters"
                  value={form.password}
                  onChange={set('password')}
                  error={errors.password}
                  prefix={<Lock size={15} />}
                  suffix={
                    <button type="button" onClick={() => setShowPass(v => !v)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer',
                               color: 'var(--text-3)', display: 'flex', padding: 0 }}>
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  }
                  autoComplete="new-password"
                />

                <Input
                  label="Confirm Password"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Repeat password"
                  value={form.confirm}
                  onChange={set('confirm')}
                  error={errors.confirm}
                  prefix={<Lock size={15} />}
                  autoComplete="new-password"
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  style={{ width: '100%', marginTop: 4 }}
                  iconRight={<ChevronRight size={16} />}
                >
                  Continue
                </Button>
              </motion.form>
            )}

            {/* ── STEP 2: Study Profile ── */}
            {step === 2 && (
              <motion.form
                key="step2"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleSubmit}
                style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
              >
                <h3 style={{ fontWeight: 700, marginBottom: 4 }}>Your Study Profile</h3>

                {/* Exam target grid */}
                <div>
                  <label className="input-label" style={{ marginBottom: 8, display: 'block' }}>
                    Exam Target <span style={{ color: 'var(--red)' }}>*</span>
                  </label>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                    gap: 8,
                  }}>
                    {EXAM_OPTIONS.map(ex => (
                      <motion.button
                        key={ex.id}
                        type="button"
                        whileTap={{ scale: 0.95 }}
                        onClick={() => set('exam_target')(ex.id)}
                        style={{
                          padding: '10px 8px',
                          borderRadius: 'var(--radius)',
                          border: `2px solid ${form.exam_target === ex.id ? 'var(--primary)' : 'var(--border)'}`,
                          background: form.exam_target === ex.id ? 'var(--primary-light)' : 'var(--surface-2)',
                          color: form.exam_target === ex.id ? 'var(--primary)' : 'var(--text-2)',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 4,
                          transition: 'all 150ms ease',
                        }}
                      >
                        <span style={{ fontSize: '1.3rem' }}>{ex.emoji}</span>
                        {ex.label}
                      </motion.button>
                    ))}
                  </div>
                  {errors.exam_target && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--red)', marginTop: 4, display: 'block' }}>
                      {errors.exam_target}
                    </span>
                  )}
                </div>

                {/* Grade */}
                <div className="input-group">
                  <label className="input-label">
                    <GraduationCap size={13} style={{ display: 'inline', marginRight: 4 }} />
                    Grade / Year
                  </label>
                  <select
                    className="input"
                    value={form.grade}
                    onChange={set('grade')}
                  >
                    <option value="">Select grade…</option>
                    {GRADE_OPTIONS.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                {/* School */}
                <Input
                  label="School / College (optional)"
                  placeholder="e.g. Delhi Public School, IIT Bombay"
                  value={form.school}
                  onChange={set('school')}
                  hint="Enables school leaderboard & streak wars"
                />

                {/* Language */}
                <div className="input-group">
                  <label className="input-label">Preferred Language</label>
                  <select className="input" value={form.language} onChange={set('language')}>
                    {LANGUAGE_OPTIONS.map(l => (
                      <option key={l.code} value={l.code}>{l.label}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setStep(1)}
                    icon={<ChevronLeft size={16} />}
                    style={{ flex: 1 }}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={loading}
                    style={{ flex: 2 }}
                  >
                    Create Account 🚀
                  </Button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {step === 1 && (
            <>
              <Divider label="already have an account?" />
              <Link to="/login">
                <Button variant="ghost" style={{ width: '100%' }}>
                  Sign in instead
                </Button>
              </Link>
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 20 }}>
          By registering you agree to EduConnect's community guidelines.
        </p>
      </motion.div>
    </div>
  )
}
