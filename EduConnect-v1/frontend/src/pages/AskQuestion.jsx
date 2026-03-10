/**
 * AskQuestion.jsx — Ask a new question
 * Title · Body (with code hint) · Subject · Exam tag · Custom tags
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, Tag as TagIcon, HelpCircle, Code, X } from 'lucide-react'
import { helpAPI } from '@/api'
import { Button, Input, Textarea, Tag, PageHeader } from '@/components/ui'
import toast from 'react-hot-toast'

const SUBJECTS  = ['Mathematics','Physics','Chemistry','Biology','History','Geography','Economics','English','Computer Science','Other']
const EXAM_TAGS = ['JEE','NEET','UPSC','CAT','GATE','CA','SAT','GCSE','IB','General']

const TIPS = [
  'Be specific — include what you tried and where you got stuck.',
  'Add code using triple backticks: ```code here```',
  'Tag the subject and exam so seniors can find your question.',
  'A clear title = faster answers. Avoid "HELP URGENT!!!"',
]

export default function AskQuestion() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    title: '', content: '', subject: '', exam_target: '',
  })
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags]         = useState([])
  const [loading, setLoading]   = useState(false)
  const [errors, setErrors]     = useState({})

  const set = (key) => (e) =>
    setForm(f => ({ ...f, [key]: typeof e === 'string' ? e : e.target.value }))

  function addTag() {
    const t = tagInput.trim().toLowerCase()
    if (!t || tags.includes(t) || tags.length >= 5) return
    setTags(ts => [...ts, t])
    setTagInput('')
  }

  function removeTag(t) { setTags(ts => ts.filter(x => x !== t)) }

  function validate() {
    const e = {}
    if (!form.title.trim() || form.title.trim().length < 10)
      e.title = 'Title must be at least 10 characters.'
    if (!form.content.trim() || form.content.trim().length < 20)
      e.content = 'Question body must be at least 20 characters.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const res = await helpAPI.createQuestion({ ...form, tags })
      toast.success('Question posted! 🎉')
      navigate(`/help/${res.data.id}`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not post question.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title="Ask a Question"
        back={
          <button className="btn-icon" onClick={() => navigate(-1)}>
            <ChevronLeft size={20} />
          </button>
        }
      />

      <div className="page-scroll">
        <div className="page-container" style={{ maxWidth: 720 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

            {/* Main form */}
            <motion.form
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleSubmit}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              {/* Title */}
              <div className="card" style={{ padding: 20 }}>
                <label className="input-label" style={{ marginBottom: 6, display: 'block', fontSize: '0.95rem' }}>
                  📌 Question Title <span style={{ color: 'var(--red)' }}>*</span>
                </label>
                <input
                  className="input"
                  placeholder="e.g. How do I solve this integration problem?"
                  value={form.title}
                  onChange={set('title')}
                  maxLength={200}
                  autoFocus
                  style={{ borderColor: errors.title ? 'var(--red)' : undefined }}
                />
                {errors.title && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--red)', marginTop: 4, display: 'block' }}>
                    {errors.title}
                  </span>
                )}
                <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 4 }}>
                  {form.title.length}/200 — Make it specific and clear.
                </div>
              </div>

              {/* Body */}
              <div className="card" style={{ padding: 20 }}>
                <label className="input-label" style={{ marginBottom: 6, display: 'block', fontSize: '0.95rem' }}>
                  📝 Details <span style={{ color: 'var(--red)' }}>*</span>
                </label>
                <textarea
                  className="input"
                  placeholder={`Describe your problem in detail.\n\nWhat have you tried?\nWhere are you stuck?\n\nFor code, use:\n\`\`\`python\n# your code here\n\`\`\``}
                  value={form.content}
                  onChange={set('content')}
                  style={{
                    minHeight: 220, resize: 'vertical',
                    fontFamily: form.content.includes('```') ? 'var(--font-mono)' : 'var(--font-main)',
                    borderColor: errors.content ? 'var(--red)' : undefined,
                  }}
                />
                {errors.content && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--red)', marginTop: 4, display: 'block' }}>
                    {errors.content}
                  </span>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                  <Code size={12} style={{ color: 'var(--text-3)' }} />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>
                    Wrap code in triple backticks for code formatting.
                  </span>
                </div>
              </div>

              {/* Tags */}
              <div className="card" style={{ padding: 20 }}>
                <label className="input-label" style={{ marginBottom: 10, display: 'block', fontSize: '0.95rem' }}>
                  🏷 Tags & Classification
                </label>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                  <select className="input" value={form.subject}
                    onChange={set('subject')}
                    style={{ flex: 1, minWidth: 130, padding: '7px 10px', fontSize: '0.85rem' }}>
                    <option value="">Select subject…</option>
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>

                  <select className="input" value={form.exam_target}
                    onChange={set('exam_target')}
                    style={{ flex: 1, minWidth: 120, padding: '7px 10px', fontSize: '0.85rem' }}>
                    <option value="">Select exam…</option>
                    {EXAM_TAGS.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>

                {/* Custom tags */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="input"
                    placeholder="Add custom tag (max 5)…"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); addTag() }
                      if (e.key === ',')     { e.preventDefault(); addTag() }
                    }}
                    style={{ flex: 1, padding: '7px 10px', fontSize: '0.85rem' }}
                  />
                  <Button variant="ghost" size="sm" type="button"
                    icon={<TagIcon size={13} />}
                    onClick={addTag}
                    disabled={tags.length >= 5}
                  >
                    Add
                  </Button>
                </div>

                {tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                    {tags.map(t => (
                      <Tag key={t} onRemove={() => removeTag(t)}>{t}</Tag>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <Button variant="ghost" onClick={() => navigate(-1)} type="button">
                  Cancel
                </Button>
                <Button variant="primary" type="submit" loading={loading} style={{ flex: 1 }}>
                  Post Question 🚀
                </Button>
              </div>
            </motion.form>

            {/* Tips sidebar */}
            <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}
              className="sidebar-desktop">
              <div className="card" style={{ padding: 16 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontWeight: 700, marginBottom: 10, color: 'var(--primary)',
                }}>
                  <HelpCircle size={16} /> Tips for a great question
                </div>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, listStyle: 'none' }}>
                  {TIPS.map((tip, i) => (
                    <li key={i} style={{
                      fontSize: '0.78rem', color: 'var(--text-2)', lineHeight: 1.5,
                      paddingLeft: 14, position: 'relative',
                    }}>
                      <span style={{
                        position: 'absolute', left: 0, color: 'var(--primary)', fontWeight: 700,
                      }}>·</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="card" style={{ padding: 14 }}>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: 6, color: 'var(--accent)' }}>
                  🎯 Earn reputation
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', lineHeight: 1.6 }}>
                  Answering gets you <strong style={{ color: 'var(--green)' }}>+5 pts</strong>.
                  Getting upvoted <strong style={{ color: 'var(--green)' }}>+10 pts</strong>.
                  Accepted answer <strong style={{ color: 'var(--green)' }}>+15 pts</strong>.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
