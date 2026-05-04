/**
 * StudyRooms.jsx — Study room browser (Zoom-lite)
 * Browse active rooms · Create room · Join with password · Filter by subject/exam
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Plus, Lock, Users, BookOpen,
  Search, Zap, Clock, RefreshCw,
} from 'lucide-react'
import { roomAPI } from '@/api'
import useAuthStore from '@/store/authStore'
import Avatar from '@/components/Avatar'
import Modal from '@/components/Modal'
import { Button, Input, EmptyState, PageHeader, Tag, Spinner } from '@/components/ui'
import toast from 'react-hot-toast'

const SUBJECTS  = ['Mathematics','Physics','Chemistry','Biology','History','Geography','Economics','English','Computer Science','Other']
const EXAM_TAGS = ['JEE','NEET','UPSC','CAT','GATE','CA','SAT','GCSE','IB','General']

// ── Room card ─────────────────────────────────────────────
function RoomCard({ room, onJoin }) {
  const isFull = room.member_count >= room.max_members
  const pct    = (room.member_count / room.max_members) * 100

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, boxShadow: 'var(--shadow-lg)' }}
      className="card"
      style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            {room.is_private && <Lock size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />}
            <h3 style={{ fontWeight: 700, fontSize: '0.92rem', lineHeight: 1.3 }} className="truncate">
              {room.name}
            </h3>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {room.subject    && <Tag>{room.subject}</Tag>}
            {room.exam_target && <Tag variant="accent">{room.exam_target}</Tag>}
          </div>
        </div>

        {/* Live indicator */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          background: 'var(--green-light)', border: '1px solid var(--green)40',
          borderRadius: 'var(--radius-full)', padding: '3px 8px',
          fontSize: '0.68rem', fontWeight: 700, color: 'var(--green)',
          flexShrink: 0,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--green)',
            animation: 'pulse 2s ease-in-out infinite',
          }} />
          LIVE
        </div>
      </div>

      {/* Members avatars */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex' }}>
          {room.members?.slice(0, 4).map((m, i) => (
            <div key={m.id} style={{ marginLeft: i > 0 ? -10 : 0, zIndex: 4 - i }}>
              <Avatar user={m} size="xs" showRing
                style={{ border: '2px solid var(--surface)', borderRadius: '50%' }}
              />
            </div>
          ))}
        </div>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>
          {room.member_count}/{room.max_members} studying
        </span>
      </div>

      {/* Capacity bar */}
      <div style={{ height: 4, background: 'var(--surface-3)', borderRadius: 2, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{
            height: '100%', borderRadius: 2,
            background: isFull ? 'var(--red)'
              : pct > 75 ? 'var(--accent)'
              : 'var(--primary)',
          }}
        />
      </div>

      {/* Host + Pomodoro */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: 'var(--text-3)' }}>
        <Avatar user={room.host} size="xs" showRing={false} />
        <span>Host: <strong style={{ color: 'var(--text-2)' }}>{room.host?.name}</strong></span>
        {room.pomodoro_active && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--accent)' }}>
            <Clock size={12} /> Pomodoro ON
          </div>
        )}
      </div>

      <Button
        variant={isFull ? 'ghost' : 'primary'}
        size="sm"
        disabled={isFull}
        onClick={() => onJoin(room)}
        style={{ width: '100%' }}
      >
        {isFull ? 'Room Full' : room.is_private ? '🔒 Join with Password' : 'Join Room'}
      </Button>
    </motion.div>
  )
}

// ── Create room modal ─────────────────────────────────────
function CreateRoomModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '', subject: '', exam_target: '',
    max_members: 5, is_private: false, password: '',
  })
  const [loading, setLoading] = useState(false)
  const set = k => e => setForm(f => ({ ...f, [k]: typeof e === 'string' ? e : e.target.value }))

  async function handleCreate() {
    if (!form.name.trim()) { toast.error('Room name is required.'); return }
    if (form.is_private && !form.password.trim()) {
      toast.error('Set a password for private rooms.'); return
    }
    setLoading(true)
    try {
      const res = await roomAPI.createRoom({
        ...form,
        max_members: Number(form.max_members),
        password: form.is_private ? form.password : undefined,
      })
      onCreated(res)
      toast.success(`Room "${form.name}" created!`)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not create room.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create Study Room">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Input
          label="Room Name"
          placeholder="e.g. JEE Physics Night Session"
          value={form.name}
          onChange={set('name')}
          autoFocus
        />

        <div style={{ display: 'flex', gap: 8 }}>
          <select className="input" value={form.subject} onChange={set('subject')}
            style={{ flex: 1, padding: '8px 10px', fontSize: '0.85rem' }}>
            <option value="">Subject…</option>
            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="input" value={form.exam_target} onChange={set('exam_target')}
            style={{ flex: 1, padding: '8px 10px', fontSize: '0.85rem' }}>
            <option value="">Exam tag…</option>
            {EXAM_TAGS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>

        {/* Max members */}
        <div>
          <label className="input-label" style={{ marginBottom: 8, display: 'block' }}>
            Max Members: {form.max_members}
          </label>
          <input
            type="range" min={2} max={5} step={1}
            value={form.max_members}
            onChange={set('max_members')}
            style={{ width: '100%', accentColor: 'var(--primary)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 2 }}>
            <span>2</span><span>3</span><span>4</span><span>5</span>
          </div>
        </div>

        {/* Private toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Private Room</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>Require password to join</div>
          </div>
          <div
            className={`toggle ${form.is_private ? 'on' : ''}`}
            onClick={() => setForm(f => ({ ...f, is_private: !f.is_private }))}
          >
            <div className="toggle-thumb" />
          </div>
        </div>

        {form.is_private && (
          <Input
            label="Room Password"
            placeholder="Set a password…"
            value={form.password}
            onChange={set('password')}
          />
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</Button>
          <Button variant="primary" loading={loading} onClick={handleCreate} style={{ flex: 2 }}>
            Create Room 🚀
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Join password modal ───────────────────────────────────
function JoinPasswordModal({ room, open, onClose, onJoined }) {
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const navigate = useNavigate()

  async function handleJoin() {
    setLoading(true)
    try {
      await roomAPI.joinRoom(room.id, { password })
      onJoined()
      navigate(`/rooms/${room.id}`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Wrong password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Join "${room?.name}"`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ fontSize: '0.88rem' }}>This room is private. Enter the password to join.</p>
        <Input
          label="Password"
          type="password"
          placeholder="Room password…"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoFocus
          onKeyDown={e => e.key === 'Enter' && handleJoin()}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</Button>
          <Button variant="primary" loading={loading} onClick={handleJoin} style={{ flex: 2 }}>
            Join Room
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ══════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════
export default function StudyRooms() {
  const navigate    = useNavigate()
  const currentUser = useAuthStore(s => s.user)

  const [rooms, setRooms]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [joinTarget, setJoinTarget] = useState(null)
  const [q, setQ]                 = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [examFilter, setExamFilter]       = useState('')
  const [myRooms, setMyRooms]     = useState([])
  const [tab, setTab]             = useState('all') // all | mine

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [allRes, mineRes] = await Promise.all([
        roomAPI.getRooms({ limit: 30 }),
        roomAPI.getMyRooms(),
      ])
      setRooms(Array.isArray(allRes) ? allRes : (allRes?.rooms || []))
      setMyRooms(Array.isArray(mineRes) ? mineRes : (mineRes?.rooms || []))
    } catch {}
    finally { setLoading(false) }
  }

  async function handleJoin(room) {
    if (room.is_private) {
      setJoinTarget(room)
    } else {
      try {
        await roomAPI.joinRoom(room.id, {})
        navigate(`/rooms/${room.id}`)
      } catch (err) {
        toast.error(err.response?.data?.detail || 'Could not join room.')
      }
    }
  }

  function handleRoomCreated(room) {
    setRooms(prev => [room, ...prev])
    setMyRooms(prev => [room, ...prev])
    navigate(`/rooms/${room.id}`)
  }

  const displayed = (tab === 'mine' ? myRooms : rooms).filter(r => {
    const matchQ = !q || r.name.toLowerCase().includes(q.toLowerCase())
    const matchS = !subjectFilter || r.subject === subjectFilter
    const matchE = !examFilter || r.exam_target === examFilter
    return matchQ && matchS && matchE
  })

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title="Study Rooms"
        subtitle={`${rooms.length} active rooms`}
        action={
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn-icon" onClick={load} title="Refresh">
              <RefreshCw size={16} />
            </button>
            <Button variant="primary" size="sm" icon={<Plus size={15} />}
              onClick={() => setCreateOpen(true)}>
              Create
            </Button>
          </div>
        }
      />

      <div className="page-scroll">
        <div className="page-container">

          {/* Tabs */}
          <div style={{
            display: 'flex', gap: 0, borderBottom: '1px solid var(--border)',
            marginBottom: 14,
          }}>
            {['all', 'mine'].map(t => (
              <button key={t} onClick={() => setTab(t)} className="profile-tab"
                style={{
                  color: tab === t ? 'var(--primary)' : 'var(--text-3)',
                  borderBottomColor: tab === t ? 'var(--primary)' : 'transparent',
                }}>
                {t === 'all' ? '🌐 All Rooms' : '📚 My Rooms'}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{
              flex: 1, minWidth: 160,
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '7px 12px',
            }}>
              <Search size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
              <input
                value={q} onChange={e => setQ(e.target.value)}
                placeholder="Search rooms…"
                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: '0.85rem' }}
              />
            </div>
            <select className="input" value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}
              style={{ padding: '7px 10px', fontSize: '0.82rem', minWidth: 120 }}>
              <option value="">All subjects</option>
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="input" value={examFilter} onChange={e => setExamFilter(e.target.value)}
              style={{ padding: '7px 10px', fontSize: '0.82rem', minWidth: 100 }}>
              <option value="">All exams</option>
              {EXAM_TAGS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>

          {/* Rooms grid */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <Spinner size={32} />
            </div>
          ) : displayed.length === 0 ? (
            <EmptyState
              icon="📚"
              title={tab === 'mine' ? "You're not in any rooms" : "No active rooms"}
              desc="Create a room and invite your friends to study together!"
              action={
                <Button variant="primary" icon={<Plus size={15} />}
                  onClick={() => setCreateOpen(true)}>
                  Create Room
                </Button>
              }
            />
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 14,
            }}>
              {displayed.map(room => (
                <RoomCard key={room.id} room={room} onJoin={handleJoin} />
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateRoomModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleRoomCreated}
      />

      {joinTarget && (
        <JoinPasswordModal
          room={joinTarget}
          open={!!joinTarget}
          onClose={() => setJoinTarget(null)}
          onJoined={() => setJoinTarget(null)}
        />
      )}
    </div>
  )
}
