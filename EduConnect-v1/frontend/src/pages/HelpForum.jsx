/**
 * HelpForum.jsx — Stack Overflow-clone question list
 * Search · Filter by subject/exam/status · Sort · Pagination
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Search, Plus, ChevronUp, MessageSquare,
  Eye, CheckCircle, Clock, Filter, X,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { helpAPI } from '@/api'
import useAuthStore from '@/store/authStore'
import Avatar from '@/components/Avatar'
import {
  Button, EmptyState, PageHeader, CardSkeleton,
  Tag, Spinner,
} from '@/components/ui'

const SUBJECTS  = ['Mathematics','Physics','Chemistry','Biology','History','Geography','Economics','English','Computer Science','Other']
const EXAM_TAGS = ['JEE','NEET','UPSC','CAT','GATE','CA','SAT','GCSE','IB']
const SORTS     = [
  { id: 'newest',     label: '🕐 Newest'    },
  { id: 'votes',      label: '🔥 Most voted' },
  { id: 'unanswered', label: '❓ Unanswered' },
  { id: 'views',      label: '👁 Most viewed' },
]

function QuestionCard({ q }) {
  const navigate = useNavigate()
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`question-card ${q.is_answered ? 'answered' : ''}`}
      onClick={() => navigate(`/help/${q.id}`)}
    >
      {/* Vote / answer counts column */}
      <div className="vote-column" style={{ minWidth: 52 }}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          background: 'var(--surface-2)', borderRadius: 'var(--radius)',
          padding: '6px 10px',
        }}>
          <ChevronUp size={14} style={{ color: 'var(--text-3)' }} />
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>
            {q.votes ?? 0}
          </span>
          <span style={{ fontSize: '0.62rem', color: 'var(--text-3)' }}>votes</span>
        </div>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          background: q.is_answered ? 'var(--green-light)' : 'var(--surface-2)',
          border: q.is_answered ? '1px solid var(--green)' : '1px solid transparent',
          borderRadius: 'var(--radius)', padding: '6px 10px', marginTop: 4,
        }}>
          <MessageSquare size={14}
            style={{ color: q.is_answered ? 'var(--green)' : 'var(--text-3)' }} />
          <span style={{
            fontWeight: 700, fontSize: '0.9rem',
            color: q.is_answered ? 'var(--green)' : 'var(--text)',
          }}>
            {q.answers_count ?? 0}
          </span>
          <span style={{
            fontSize: '0.62rem',
            color: q.is_answered ? 'var(--green)' : 'var(--text-3)',
          }}>
            {q.is_answered ? '✓ solved' : 'answers'}
          </span>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, lineHeight: 1.4, color: 'var(--text)' }}>
          {q.title}
        </h3>

        {q.content && (
          <p style={{
            fontSize: '0.82rem', color: 'var(--text-3)',
            lineHeight: 1.5, overflow: 'hidden',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>
            {q.content}
          </p>
        )}

        {/* Tags */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
          {q.subject    && <Tag>{q.subject}</Tag>}
          {q.exam_target && <Tag variant="accent">{q.exam_target}</Tag>}
          {q.tags?.slice(0, 3).map(t => (
            <Tag key={t} variant="">{t}</Tag>
          ))}
        </div>

        {/* Meta */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 2, flexWrap: 'wrap',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Eye size={11} /> {q.views ?? 0} views
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Clock size={11} />
            {formatDistanceToNow(new Date(q.created_at), { addSuffix: true })}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
            <Avatar user={q.author} size="xs" showRing={false} />
            <span style={{ fontWeight: 600 }}>{q.author?.name || 'Anonymous'}</span>
            <span style={{ color: 'var(--primary)' }}>
              {q.author?.reputation ?? 0} rep
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function HelpForum() {
  const navigate    = useNavigate()
  const currentUser = useAuthStore(s => s.user)

  const [questions, setQuestions] = useState([])
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(1)
  const [loading, setLoading]     = useState(true)
  const [showFilters, setShowFilters] = useState(false)

  const [filters, setFilters] = useState({
    q: '', subject: '', exam_target: '',
    status: '', sort: 'newest',
  })
  const [draft, setDraft] = useState({ ...filters })

  const LIMIT = 15

  async function load(f = filters, p = 1) {
    setLoading(true)
    try {
      const res = await helpAPI.getQuestions({
        ...f, page: p, limit: LIMIT,
      })
      setQuestions(res.data.questions)
      setTotal(res.data.total)
      setPage(p)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function applyFilters() {
    setFilters(draft)
    setShowFilters(false)
    load(draft, 1)
  }

  function clearFilters() {
    const clean = { q: '', subject: '', exam_target: '', status: '', sort: 'newest' }
    setFilters(clean); setDraft(clean)
    setShowFilters(false)
    load(clean, 1)
  }

  const activeFilterCount = [filters.subject, filters.exam_target, filters.status]
    .filter(Boolean).length

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title="Help Forum"
        subtitle={`${total.toLocaleString()} questions`}
        action={
          <Button
            variant="primary" size="sm"
            icon={<Plus size={15} />}
            onClick={() => navigate('/help/ask')}
          >
            Ask
          </Button>
        }
      />

      <div className="page-scroll">
        <div className="page-container" style={{ paddingTop: 12 }}>

          {/* Search + filter bar */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '8px 12px',
            }}>
              <Search size={15} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
              <input
                value={draft.q}
                onChange={e => setDraft(d => ({ ...d, q: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && applyFilters()}
                placeholder="Search questions…"
                style={{
                  flex: 1, background: 'none', border: 'none',
                  outline: 'none', color: 'var(--text)', fontSize: '0.9rem',
                }}
              />
              {draft.q && (
                <button onClick={() => { setDraft(d => ({ ...d, q: '' })); load({ ...draft, q: '' }, 1) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex' }}>
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              className={`btn-icon ${activeFilterCount > 0 ? 'btn-primary' : ''}`}
              onClick={() => setShowFilters(v => !v)}
              style={{ position: 'relative' }}
            >
              <Filter size={18} />
              {activeFilterCount > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  background: 'var(--accent)', color: '#000', fontWeight: 700,
                  fontSize: '0.6rem', borderRadius: '50%',
                  width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Filter panel */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="card"
              style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <select className="input" value={draft.subject}
                  onChange={e => setDraft(d => ({ ...d, subject: e.target.value }))}
                  style={{ flex: 1, minWidth: 130, padding: '7px 10px', fontSize: '0.82rem' }}>
                  <option value="">All subjects</option>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                <select className="input" value={draft.exam_target}
                  onChange={e => setDraft(d => ({ ...d, exam_target: e.target.value }))}
                  style={{ flex: 1, minWidth: 110, padding: '7px 10px', fontSize: '0.82rem' }}>
                  <option value="">All exams</option>
                  {EXAM_TAGS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>

                <select className="input" value={draft.status}
                  onChange={e => setDraft(d => ({ ...d, status: e.target.value }))}
                  style={{ flex: 1, minWidth: 120, padding: '7px 10px', fontSize: '0.82rem' }}>
                  <option value="">Any status</option>
                  <option value="open">Open</option>
                  <option value="answered">Answered</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {SORTS.map(s => (
                  <button key={s.id}
                    onClick={() => setDraft(d => ({ ...d, sort: s.id }))}
                    style={{
                      padding: '5px 12px', borderRadius: 'var(--radius-full)',
                      border: `1px solid ${draft.sort === s.id ? 'var(--primary)' : 'var(--border)'}`,
                      background: draft.sort === s.id ? 'var(--primary-light)' : 'var(--surface-2)',
                      color: draft.sort === s.id ? 'var(--primary)' : 'var(--text-3)',
                      fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="ghost" size="sm" onClick={clearFilters}>Clear</Button>
                <Button variant="primary" size="sm" onClick={applyFilters}>Apply</Button>
              </div>
            </motion.div>
          )}

          {/* Sort chips (quick access) */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {SORTS.map(s => (
              <button key={s.id}
                onClick={() => { const f = { ...filters, sort: s.id }; setFilters(f); setDraft(f); load(f, 1) }}
                style={{
                  padding: '4px 12px', borderRadius: 'var(--radius-full)', whiteSpace: 'nowrap',
                  border: `1px solid ${filters.sort === s.id ? 'var(--primary)' : 'var(--border)'}`,
                  background: filters.sort === s.id ? 'var(--primary-light)' : 'transparent',
                  color: filters.sort === s.id ? 'var(--primary)' : 'var(--text-3)',
                  fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Questions */}
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : questions.length === 0 ? (
            <EmptyState
              icon="🧐"
              title="No questions found"
              desc="Be the first to ask — someone might have the same doubt."
              action={
                <Button variant="primary" icon={<Plus size={15} />}
                  onClick={() => navigate('/help/ask')}>
                  Ask a Question
                </Button>
              }
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {questions.map(q => <QuestionCard key={q.id} q={q} />)}
            </div>
          )}

          {/* Pagination */}
          {!loading && total > LIMIT && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
              <Button variant="ghost" size="sm"
                disabled={page === 1}
                onClick={() => load(filters, page - 1)}>
                ← Prev
              </Button>
              <span style={{ padding: '6px 12px', fontSize: '0.85rem', color: 'var(--text-3)' }}>
                Page {page} of {Math.ceil(total / LIMIT)}
              </span>
              <Button variant="ghost" size="sm"
                disabled={page >= Math.ceil(total / LIMIT)}
                onClick={() => load(filters, page + 1)}>
                Next →
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
