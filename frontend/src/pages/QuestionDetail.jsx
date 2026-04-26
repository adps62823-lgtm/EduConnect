/**
 * QuestionDetail.jsx — Stack Overflow-style question + answers
 * Vote answers · Accept answer · Code blocks · Senior matcher
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ChevronUp, ChevronDown, CheckCircle,
  Clock, Eye, Send, Trash2, Users, Award,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { helpAPI } from '@/api'
import useAuthStore from '@/store/authStore'
import Avatar from '@/components/Avatar'
import {
  Button, Tag, Spinner, EmptyState, StatBox, PageHeader,
} from '@/components/ui'
import toast from 'react-hot-toast'

// ── Simple code-block renderer ────────────────────────────
function RichContent({ text }) {
  if (!text) return null
  const parts = text.split(/(```[\s\S]*?```)/g)
  return (
    <div>
      {parts.map((part, i) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const code = part.slice(3, -3).replace(/^\w+\n/, '')
          return (
            <pre key={i} style={{
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '12px 16px',
              overflowX: 'auto', fontSize: '0.82rem',
              fontFamily: 'var(--font-mono)', lineHeight: 1.7,
              margin: '8px 0',
            }}>
              <code>{code}</code>
            </pre>
          )
        }
        return (
          <p key={i} style={{ lineHeight: 1.7, color: 'var(--text)', whiteSpace: 'pre-wrap', margin: '4px 0' }}>
            {part}
          </p>
        )
      })}
    </div>
  )
}

// ── Answer card ───────────────────────────────────────────
function AnswerCard({ answer: init, questionId, questionAuthorId, onAccepted, onDeleted }) {
  const currentUser = useAuthStore(s => s.user)
  const [answer, setAnswer] = useState(init)
  const [voting, setVoting] = useState(false)
  const isMe        = answer.author?.id === currentUser?.id
  const isQAuthor   = currentUser?.id === questionAuthorId
  const isAccepted  = answer.is_accepted

  async function vote(dir) {
    if (voting) return
    setVoting(true)
    try {
      const res = await helpAPI.voteAnswer(questionId, answer.id, dir)
      setAnswer(a => ({ ...a, vote_count: res.vote_count, my_vote: res.my_vote }))
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not vote.')
    } finally {
      setVoting(false)
    }
  }

  async function handleAccept() {
    try {
      await helpAPI.acceptAnswer(questionId, answer.id)
      setAnswer(a => ({ ...a, is_accepted: !a.is_accepted }))
      onAccepted(answer.id)
      toast.success(isAccepted ? 'Unaccepted.' : '✅ Answer accepted!')
    } catch {
      toast.error('Could not accept answer.')
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this answer?')) return
    try {
      await helpAPI.deleteAnswer(questionId, answer.id)
      setAnswer(null)
      onDeleted?.(answer.id)
      toast.success('Answer deleted.')
    } catch {
      toast.error('Could not delete.')
    }
  }

  if (!answer) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={isAccepted ? 'answer-accepted' : 'card'}
      style={{ display: 'flex', gap: 14, padding: '16px' }}
    >
      {/* Vote column */}
      <div className="vote-column" style={{ minWidth: 44 }}>
        <button
          className={`vote-btn ${answer.my_vote === 1 ? 'voted-up' : ''}`}
          onClick={() => vote(1)}
          disabled={voting || isMe}
          title={isMe ? "Can't vote on your own answer" : 'Upvote'}
        >
          <ChevronUp size={16} />
        </button>

        <span style={{
          fontWeight: 800, fontSize: '1.1rem', lineHeight: 1,
          color: answer.vote_count > 0 ? 'var(--green)'
               : answer.vote_count < 0 ? 'var(--red)'
               : 'var(--text)',
        }}>
          {answer.vote_count ?? 0}
        </span>

        <button
          className={`vote-btn ${answer.my_vote === -1 ? 'voted-down' : ''}`}
          onClick={() => vote(-1)}
          disabled={voting || isMe}
        >
          <ChevronDown size={16} />
        </button>

        {/* Accept button (only question author) */}
        {isQAuthor && !isMe && (
          <button
            onClick={handleAccept}
            title={isAccepted ? 'Unaccept' : 'Accept this answer'}
            style={{
              marginTop: 6,
              color: isAccepted ? 'var(--green)' : 'var(--text-3)',
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'color 150ms',
            }}
          >
            <CheckCircle size={22} fill={isAccepted ? 'var(--green)' : 'none'} />
          </button>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {isAccepted && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'var(--green)', color: '#fff',
            fontSize: '0.72rem', fontWeight: 700, padding: '2px 10px',
            borderRadius: 'var(--radius-full)', marginBottom: 10,
          }}>
            <CheckCircle size={11} /> Accepted Answer
          </div>
        )}

        <RichContent text={answer.content} />

        {/* Author + actions */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          marginTop: 14, paddingTop: 10,
          borderTop: '1px solid var(--border)',
        }}>
          <Avatar user={answer.author} size="sm" showRing />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>{answer.author?.name}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>
              {answer.author?.reputation ?? 0} rep ·{' '}
              {formatDistanceToNow(new Date(answer.created_at), { addSuffix: true })}
            </div>
          </div>

          {isMe && (
            <button
              onClick={handleDelete}
              style={{
                marginLeft: 'auto', background: 'none', border: 'none',
                cursor: 'pointer', color: 'var(--red)', display: 'flex',
                alignItems: 'center', gap: 4, fontSize: '0.78rem',
              }}
            >
              <Trash2 size={13} /> Delete
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ── Senior Matcher panel ──────────────────────────────────
function SeniorMatcher({ questionId }) {
  const [seniors, setSeniors]   = useState([])
  const [loading, setLoading]   = useState(false)
  const [visible, setVisible]   = useState(false)
  const navigate = useNavigate()

  async function load() {
    if (seniors.length > 0) { setVisible(v => !v); return }
    setLoading(true)
    try {
      const res = await helpAPI.seniorMatch(questionId)
      setSeniors(Array.isArray(res) ? res : (res?.seniors || []))
      setVisible(true)
    } catch {}
    finally { setLoading(false) }
  }

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
          <Users size={16} style={{ color: 'var(--primary)' }} /> Find a Senior
        </div>
        <Button variant="ghost" size="sm" loading={loading} onClick={load}>
          {visible ? 'Hide' : 'Match me'}
        </Button>
      </div>
      <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: 4 }}>
        Students who solved similar problems
      </p>

      <AnimatePresence>
        {visible && seniors.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden', marginTop: 12 }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {seniors.map(s => (
                <div key={s.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', background: 'var(--surface-2)',
                  borderRadius: 'var(--radius)',
                }}>
                  <Avatar user={s} size="sm" showRing />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem' }} className="truncate">{s.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>
                      {s.accepted_count} accepted · {s.reputation} rep
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/chat', { state: { openDMWith: s.id } })}
                    style={{
                      background: 'var(--primary-light)', border: '1px solid var(--primary)40',
                      color: 'var(--primary)', borderRadius: 'var(--radius-sm)',
                      padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Message
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════
export default function QuestionDetail() {
  const { questionId } = useParams()
  const navigate       = useNavigate()
  const currentUser    = useAuthStore(s => s.user)

  const [question, setQuestion]   = useState(null)
  const [answers,  setAnswers]    = useState([])
  const [loading,  setLoading]    = useState(true)
  const [answerText, setAnswerText] = useState('')
  const [submitting,  setSubmitting] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await helpAPI.getQuestion(questionId)
        setQuestion(res?.question || res)
        setAnswers(res?.answers || [])
      } catch {
        toast.error('Question not found.')
        navigate('/help')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [questionId])

  async function submitAnswer(e) {
    e.preventDefault()
    if (!answerText.trim() || answerText.trim().length < 10) {
      toast.error('Answer must be at least 10 characters.')
      return
    }
    setSubmitting(true)
    try {
      const res = await helpAPI.postAnswer(questionId, { content: answerText.trim() })
      setAnswers(prev => [...prev, res])
      setQuestion(q => ({ ...q, answers_count: (q.answers_count || 0) + 1 }))
      setAnswerText('')
      toast.success('Answer posted! 🎉')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not post answer.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleAnswerAccepted(answerId) {
    setAnswers(prev => prev.map(a => ({
      ...a,
      is_accepted: a.id === answerId ? !a.is_accepted : false,
    })))
    setQuestion(q => ({ ...q, is_answered: true }))
  }

  async function handleDeleteQuestion() {
    if (!window.confirm('Delete this question? This cannot be undone.')) return
    try {
      await helpAPI.deleteQuestion(questionId)
      toast.success('Question deleted.')
      navigate('/help')
    } catch {
      toast.error('Could not delete question.')
    }
  }

  if (loading) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner size={32} />
    </div>
  )

  if (!question) return null

  const isMyQuestion = question.author?.id === currentUser?.id

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title="Question"
        back={
          <button className="btn-icon" onClick={() => navigate('/help')}>
            <ChevronLeft size={20} />
          </button>
        }
        action={isMyQuestion && (
          <button
            onClick={handleDeleteQuestion}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 4,
              fontSize: '0.8rem',
            }}
          >
            <Trash2 size={14} /> Delete
          </button>
        )}
      />

      <div className="page-scroll">
        <div className="page-container" style={{ maxWidth: 780 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

            {/* Main column */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Question */}
              <div className="card">
                <h1 style={{ fontSize: '1.15rem', fontWeight: 800, lineHeight: 1.4, marginBottom: 12 }}>
                  {question.title}
                </h1>

                {/* Meta */}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: 14 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Clock size={11} />
                    {formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Eye size={11} /> {question.views} views
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Award size={11} /> {question.votes ?? 0} votes
                  </span>
                </div>

                <RichContent text={question.content} />

                {/* Tags */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 14 }}>
                  {question.subject     && <Tag>{question.subject}</Tag>}
                  {question.exam_target && <Tag variant="accent">{question.exam_target}</Tag>}
                  {question.tags?.map(t => <Tag key={t}>{t}</Tag>)}
                </div>

                {/* Author */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  marginTop: 16, paddingTop: 12,
                  borderTop: '1px solid var(--border)',
                }}>
                  <Avatar user={question.author} size="md" showRing />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{question.author?.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>
                      {question.author?.reputation ?? 0} reputation
                    </div>
                  </div>
                  {question.status === 'answered' && (
                    <div style={{ marginLeft: 'auto' }}>
                      <Tag variant="green">✓ Solved</Tag>
                    </div>
                  )}
                </div>
              </div>

              {/* Answers */}
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>
                  {answers.length} {answers.length === 1 ? 'Answer' : 'Answers'}
                </h2>

                {answers.length === 0 ? (
                  <EmptyState
                    icon="💡"
                    title="No answers yet"
                    desc="Be the first to help!"
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Accepted answers first */}
                    {[...answers]
                      .sort((a, b) => (b.is_accepted ? 1 : 0) - (a.is_accepted ? 1 : 0) || b.vote_count - a.vote_count)
                      .map(a => (
                        <AnswerCard
                          key={a.id}
                          answer={a}
                          questionId={questionId}
                          questionAuthorId={question.author?.id}
                          onAccepted={handleAnswerAccepted}
                          onDeleted={(id) => setAnswers(prev => prev.filter(x => x.id !== id))}
                        />
                      ))
                    }
                  </div>
                )}
              </div>

              {/* Post answer form */}
              <div className="card">
                <h3 style={{ fontWeight: 700, marginBottom: 12, fontSize: '0.95rem' }}>
                  ✍️ Your Answer
                </h3>
                <form onSubmit={submitAnswer} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <textarea
                    value={answerText}
                    onChange={e => setAnswerText(e.target.value)}
                    placeholder={`Share your knowledge...\n\nFor code:\n\`\`\`python\n# your solution here\n\`\`\``}
                    className="input"
                    style={{
                      minHeight: 160, resize: 'vertical',
                      fontFamily: answerText.includes('```') ? 'var(--font-mono)' : 'var(--font-main)',
                    }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>
                      Wrap code in triple backticks for syntax highlighting.
                    </span>
                    <Button
                      type="submit"
                      variant="primary"
                      loading={submitting}
                      icon={<Send size={14} />}
                      disabled={!answerText.trim()}
                    >
                      Post Answer
                    </Button>
                  </div>
                </form>
              </div>
            </div>

            {/* Sidebar */}
            <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}
              className="sidebar-desktop">
              {/* Stats */}
              <div className="card" style={{ padding: 14 }}>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: 10 }}>📊 Stats</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <StatBox label="Answers" value={question.answers_count ?? 0} icon="💬" />
                  <StatBox label="Views"   value={question.views ?? 0}         icon="👁" />
                  <StatBox label="Votes"   value={question.votes ?? 0}         icon="⬆" color="var(--green)" />
                </div>
              </div>

              <SeniorMatcher questionId={questionId} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
