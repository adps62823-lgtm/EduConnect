import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Award,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Clock,
  Eye,
  MessageSquare,
  Send,
  Trash2,
  Users,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { helpAPI } from '@/api'
import useAuthStore from '@/store/authStore'
import Avatar from '@/components/Avatar'
import { Button, EmptyState, PageHeader, Spinner, StatBox, Tag } from '@/components/ui'
import toast from 'react-hot-toast'

function RichContent({ text }) {
  if (!text) return null

  const parts = text.split(/(```[\s\S]*?```)/g)

  return (
    <div>
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const code = part.slice(3, -3).replace(/^\w+\n/, '')
          return (
            <pre
              key={index}
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '12px 16px',
                overflowX: 'auto',
                fontSize: '0.82rem',
                fontFamily: 'var(--font-mono)',
                lineHeight: 1.7,
                margin: '8px 0',
              }}
            >
              <code>{code}</code>
            </pre>
          )
        }

        return (
          <p
            key={index}
            style={{
              lineHeight: 1.7,
              color: 'var(--text)',
              whiteSpace: 'pre-wrap',
              margin: '4px 0',
            }}
          >
            {part}
          </p>
        )
      })}
    </div>
  )
}

function AnswerCard({ answer: initialAnswer, questionId, questionAuthorId, onAccepted, onDeleted }) {
  const currentUser = useAuthStore((state) => state.user)
  const [answer, setAnswer] = useState(initialAnswer)
  const [voting, setVoting] = useState(false)

  useEffect(() => {
    setAnswer(initialAnswer)
  }, [initialAnswer])

  const isMe = answer.author?.id === currentUser?.id
  const isQuestionAuthor = currentUser?.id === questionAuthorId
  const isAccepted = Boolean(answer.is_accepted)

  async function vote(value) {
    if (voting) return

    setVoting(true)
    try {
      const result = await helpAPI.voteAnswer(questionId, answer.id, value)
      setAnswer((previous) => ({
        ...previous,
        vote_count: result?.vote_count ?? previous.vote_count,
        my_vote: result?.my_vote ?? previous.my_vote,
      }))
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Could not vote.')
    } finally {
      setVoting(false)
    }
  }

  async function handleAccept() {
    try {
      const result = await helpAPI.acceptAnswer(questionId, answer.id)
      const accepted = Boolean(result?.is_accepted)
      setAnswer((previous) => ({ ...previous, is_accepted: accepted }))
      onAccepted(answer.id, accepted)
      toast.success(accepted ? 'Answer accepted.' : 'Answer unaccepted.')
    } catch {
      toast.error('Could not accept answer.')
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this answer?')) return

    try {
      await helpAPI.deleteAnswer(questionId, answer.id)
      onDeleted(answer.id)
      toast.success('Answer deleted.')
    } catch {
      toast.error('Could not delete answer.')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={isAccepted ? 'answer-accepted' : 'card'}
      style={{ display: 'flex', gap: 14, padding: 16 }}
    >
      <div className="vote-column" style={{ minWidth: 44 }}>
        <button
          className={`vote-btn ${answer.my_vote === 1 ? 'voted-up' : ''}`}
          onClick={() => vote(1)}
          disabled={voting || isMe}
          title={isMe ? "Can't vote on your own answer" : 'Upvote'}
        >
          <ChevronUp size={16} />
        </button>

        <span
          style={{
            fontWeight: 800,
            fontSize: '1.1rem',
            lineHeight: 1,
            color:
              (answer.vote_count ?? 0) > 0
                ? 'var(--green)'
                : (answer.vote_count ?? 0) < 0
                  ? 'var(--red)'
                  : 'var(--text)',
          }}
        >
          {answer.vote_count ?? 0}
        </span>

        <button
          className={`vote-btn ${answer.my_vote === -1 ? 'voted-down' : ''}`}
          onClick={() => vote(-1)}
          disabled={voting || isMe}
          title={isMe ? "Can't vote on your own answer" : 'Downvote'}
        >
          <ChevronDown size={16} />
        </button>

        {isQuestionAuthor && !isMe && (
          <button
            onClick={handleAccept}
            title={isAccepted ? 'Unaccept' : 'Accept this answer'}
            style={{
              marginTop: 6,
              color: isAccepted ? 'var(--green)' : 'var(--text-3)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckCircle size={22} fill={isAccepted ? 'var(--green)' : 'none'} />
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        {isAccepted && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              background: 'var(--green)',
              color: '#fff',
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '2px 10px',
              borderRadius: 'var(--radius-full)',
              marginBottom: 10,
            }}
          >
            <CheckCircle size={11} /> Accepted Answer
          </div>
        )}

        <RichContent text={answer.content} />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginTop: 14,
            paddingTop: 10,
            borderTop: '1px solid var(--border)',
          }}
        >
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
                marginLeft: 'auto',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--red)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: '0.78rem',
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

function SeniorMatcher({ questionId }) {
  const navigate = useNavigate()
  const [seniors, setSeniors] = useState([])
  const [loading, setLoading] = useState(false)
  const [visible, setVisible] = useState(false)

  async function load() {
    if (seniors.length > 0) {
      setVisible((previous) => !previous)
      return
    }

    setLoading(true)
    try {
      const result = await helpAPI.seniorMatch(questionId)
      setSeniors(Array.isArray(result) ? result : result?.seniors || [])
      setVisible(true)
    } catch {
      toast.error('Could not load senior matches.')
    } finally {
      setLoading(false)
    }
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
        Students who might be able to help quickly
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
              {seniors.map((senior) => (
                <div
                  key={senior.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    background: 'var(--surface-2)',
                    borderRadius: 'var(--radius)',
                  }}
                >
                  <Avatar user={senior} size="sm" showRing />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem' }} className="truncate">
                      {senior.name}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>
                      {senior.exam_target || senior.grade || 'Student'} · {senior.reputation ?? 0} rep
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/chat', { state: { openDMWith: senior.id } })}
                    style={{
                      background: 'var(--primary-light)',
                      border: '1px solid var(--primary)40',
                      color: 'var(--primary)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
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

export default function QuestionDetail() {
  const { questionId } = useParams()
  const navigate = useNavigate()
  const currentUser = useAuthStore((state) => state.user)

  const [question, setQuestion] = useState(null)
  const [answers, setAnswers] = useState([])
  const [loading, setLoading] = useState(true)
  const [answerText, setAnswerText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadQuestion = useCallback(async () => {
    setLoading(true)
    try {
      const result = await helpAPI.getQuestion(questionId)
      setQuestion(result?.question || result)
      setAnswers(result?.answers || [])
    } catch {
      toast.error('Question not found.')
      navigate('/help')
    } finally {
      setLoading(false)
    }
  }, [navigate, questionId])

  useEffect(() => {
    loadQuestion()
  }, [loadQuestion])

  async function submitAnswer(event) {
    event.preventDefault()
    if (!answerText.trim() || answerText.trim().length < 10) {
      toast.error('Answer must be at least 10 characters.')
      return
    }

    setSubmitting(true)
    try {
      const result = await helpAPI.postAnswer(questionId, { content: answerText.trim() })
      setAnswers((previous) => [...previous, result])
      setQuestion((previous) =>
        previous
          ? { ...previous, answers_count: (previous.answers_count || 0) + 1 }
          : previous
      )
      setAnswerText('')
      toast.success('Answer posted.')
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Could not post answer.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleAnswerAccepted(answerId, accepted) {
    setAnswers((previous) =>
      previous.map((answer) => ({
        ...answer,
        is_accepted: answer.id === answerId ? accepted : false,
      }))
    )
    setQuestion((previous) => (previous ? { ...previous, is_answered: accepted } : previous))
  }

  function handleAnswerDeleted(answerId) {
    setAnswers((previous) => {
      const deleted = previous.find((answer) => answer.id === answerId)
      const nextAnswers = previous.filter((answer) => answer.id !== answerId)

      setQuestion((current) => {
        if (!current) return current
        return {
          ...current,
          answers_count: Math.max(0, (current.answers_count || previous.length) - 1),
          is_answered: deleted?.is_accepted ? nextAnswers.some((answer) => answer.is_accepted) : current.is_answered,
        }
      })

      return nextAnswers
    })
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

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={32} />
      </div>
    )
  }

  if (!question) return null

  const isMyQuestion = question.author?.id === currentUser?.id
  const questionVotes = question.vote_count ?? question.votes ?? 0
  const questionViews = question.views ?? 0

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title="Question"
        back={
          <button className="btn-icon" onClick={() => navigate('/help')}>
            <ChevronLeft size={20} />
          </button>
        }
        action={
          isMyQuestion && (
            <button
              onClick={handleDeleteQuestion}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--red)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: '0.8rem',
              }}
            >
              <Trash2 size={14} /> Delete
            </button>
          )
        }
      />

      <div>
        <div className="page-container" style={{ maxWidth: 780 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card">
                <h1 style={{ fontSize: '1.15rem', fontWeight: 800, lineHeight: 1.4, marginBottom: 12 }}>
                  {question.title}
                </h1>

                <div
                  style={{
                    display: 'flex',
                    gap: 12,
                    flexWrap: 'wrap',
                    fontSize: '0.75rem',
                    color: 'var(--text-3)',
                    marginBottom: 14,
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Clock size={11} />
                    {formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Eye size={11} /> {questionViews} views
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Award size={11} /> {questionVotes} votes
                  </span>
                </div>

                <RichContent text={question.content} />

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 14 }}>
                  {question.subject && <Tag>{question.subject}</Tag>}
                  {question.exam_target && <Tag variant="accent">{question.exam_target}</Tag>}
                  {question.tags?.map((tag) => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginTop: 16,
                    paddingTop: 12,
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  <Avatar user={question.author} size="md" showRing />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{question.author?.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>
                      {question.author?.reputation ?? 0} reputation
                    </div>
                  </div>
                  {question.is_answered && (
                    <div style={{ marginLeft: 'auto' }}>
                      <Tag variant="green">✓ Solved</Tag>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>
                  {answers.length} {answers.length === 1 ? 'Answer' : 'Answers'}
                </h2>

                {answers.length === 0 ? (
                  <EmptyState icon="💡" title="No answers yet" desc="Be the first to help!" />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[...answers]
                      .sort(
                        (a, b) =>
                          (b.is_accepted ? 1 : 0) - (a.is_accepted ? 1 : 0) ||
                          (b.vote_count ?? 0) - (a.vote_count ?? 0)
                      )
                      .map((answer) => (
                        <AnswerCard
                          key={answer.id}
                          answer={answer}
                          questionId={questionId}
                          questionAuthorId={question.author?.id}
                          onAccepted={handleAnswerAccepted}
                          onDeleted={handleAnswerDeleted}
                        />
                      ))}
                  </div>
                )}
              </div>

              <div className="card">
                <h3 style={{ fontWeight: 700, marginBottom: 12, fontSize: '0.95rem' }}>✍️ Your Answer</h3>
                <form onSubmit={submitAnswer} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <textarea
                    value={answerText}
                    onChange={(event) => setAnswerText(event.target.value)}
                    placeholder={`Share your knowledge...\n\nFor code:\n\`\`\`python\n# your solution here\n\`\`\``}
                    className="input"
                    style={{
                      minHeight: 160,
                      resize: 'vertical',
                      fontFamily: answerText.includes('```') ? 'var(--font-mono)' : 'var(--font-main)',
                    }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
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

            <div
              style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}
              className="sidebar-desktop"
            >
              <div className="card" style={{ padding: 14 }}>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: 10 }}>📊 Stats</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <StatBox label="Answers" value={question.answers_count ?? 0} icon="💬" />
                  <StatBox label="Views" value={questionViews} icon="👁" />
                  <StatBox label="Votes" value={questionVotes} icon="⬆" color="var(--green)" />
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
