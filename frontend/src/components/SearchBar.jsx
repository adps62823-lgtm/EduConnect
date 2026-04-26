/**
 * SearchBar.jsx — Global user search with debounced results dropdown
 */
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Avatar from './Avatar'
import { authAPI } from '@/api'

export default function SearchBar({ placeholder = 'Search students…', onSelect, autoFocus = false }) {
  const navigate   = useNavigate()
  const [q, setQ]           = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen]       = useState(false)
  const inputRef = useRef()
  const timer    = useRef()

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  useEffect(() => {
    clearTimeout(timer.current)
    if (!q.trim()) { setResults([]); setOpen(false); return }
    setLoading(true)
    timer.current = setTimeout(async () => {
      try {
        const res = await authAPI.searchUsers({ q, limit: 8 })
        setResults(Array.isArray(res) ? res : [])
        setOpen(true)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
  }, [q])

  function handleSelect(user) {
    setQ('')
    setOpen(false)
    if (onSelect) onSelect(user)
    else navigate(`/profile/${user.username}`)
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '8px 12px',
        transition: 'border-color 200ms ease',
      }}>
        <Search size={16} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
        <input
          ref={inputRef}
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder={placeholder}
          style={{
            flex: 1, border: 'none', background: 'transparent',
            outline: 'none', color: 'var(--text)', fontSize: '0.9rem',
          }}
          onFocus={() => results.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        {q && (
          <button onClick={() => { setQ(''); setResults([]); setOpen(false) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex' }}>
            <X size={14} />
          </button>
        )}
        {loading && (
          <div style={{ width: 14, height: 14, border: '2px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        )}
      </div>

      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute', top: '110%', left: 0, right: 0,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden',
              zIndex: 200,
            }}
          >
            {results.map(user => (
              <div
                key={user.id}
                onClick={() => handleSelect(user)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', cursor: 'pointer',
                  borderBottom: '1px solid var(--border)',
                  transition: 'background 150ms ease',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <Avatar user={user} size="sm" showRing />
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }} className="truncate">{user.name}</div>
                  <div className="text-muted truncate" style={{ fontSize: '0.75rem' }}>@{user.username} · {user.exam_target || user.school || ''}</div>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
