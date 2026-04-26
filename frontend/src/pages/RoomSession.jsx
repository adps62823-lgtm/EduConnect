/**
 * RoomSession.jsx — Live study room session (Zoom-lite)
 * Member grid · Pomodoro timer (host-controlled, WS-synced)
 * Chat panel · Host transfer · Kick · Leave / End room
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, Play, Square, SkipForward,
  Users, MessageCircle, Crown, UserMinus,
  LogOut, Settings, Clock, BookOpen, Send,
  Mic, MicOff, Video, VideoOff,
} from 'lucide-react'
import { roomAPI } from '@/api'
import useAuthStore from '@/store/authStore'
import { useWSStore } from '@/store/notifStore'
import Avatar from '@/components/Avatar'
import Modal from '@/components/Modal'
import { Button, Spinner, EmptyState } from '@/components/ui'
import toast from 'react-hot-toast'

// ── Pomodoro durations ────────────────────────────────────
const POMODORO_WORK  = 25 * 60  // 25 min
const POMODORO_BREAK = 5  * 60  //  5 min

// ── Pomodoro ring SVG ─────────────────────────────────────
function PomodoroRing({ seconds, total, isBreak }) {
  const r         = 52
  const circ      = 2 * Math.PI * r
  const pct       = total > 0 ? seconds / total : 0
  const dashOffset = circ * (1 - pct)

  const mins = String(Math.floor(seconds / 60)).padStart(2, '0')
  const secs = String(seconds % 60).padStart(2, '0')

  return (
    <div style={{ position: 'relative', width: 130, height: 130 }}>
      <svg width="130" height="130" style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
        <circle cx="65" cy="65" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="8" />
        <motion.circle
          cx="65" cy="65" r={r}
          fill="none"
          stroke={isBreak ? 'var(--green)' : 'var(--primary)'}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 2,
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontWeight: 800,
          fontSize: '1.5rem', color: isBreak ? 'var(--green)' : 'var(--text)',
          lineHeight: 1,
        }}>
          {mins}:{secs}
        </span>
        <span style={{ fontSize: '0.62rem', color: 'var(--text-3)', fontWeight: 600 }}>
          {isBreak ? 'BREAK' : 'FOCUS'}
        </span>
      </div>
    </div>
  )
}

// ── Member tile ───────────────────────────────────────────
function MemberTile({ member, isHost, isMe, onKick, onTransfer }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 14,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 8,
        position: 'relative',
        minHeight: 120,
      }}
    >
      {/* Crown badge for host */}
      {member.is_host && (
        <div style={{
          position: 'absolute', top: 8, left: 8,
          background: 'var(--accent)', borderRadius: 4,
          padding: '2px 6px', fontSize: '0.62rem', fontWeight: 700, color: '#000',
          display: 'flex', alignItems: 'center', gap: 3,
        }}>
          <Crown size={9} /> HOST
        </div>
      )}

      {/* Host actions on other members */}
      {isHost && !member.is_host && (
        <div style={{ position: 'absolute', top: 8, right: 8 }}>
          <button
            className="btn-icon"
            style={{ width: 22, height: 22 }}
            onClick={() => setMenuOpen(v => !v)}
          >
            <Settings size={12} />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                style={{
                  position: 'absolute', top: '110%', right: 0,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  boxShadow: 'var(--shadow)', zIndex: 10,
                  minWidth: 150, overflow: 'hidden',
                }}
              >
                <button
                  onClick={() => { onTransfer(member.id); setMenuOpen(false) }}
                  style={{
                    width: '100%', padding: '8px 12px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                    fontSize: '0.8rem', color: 'var(--accent)',
                  }}
                >
                  <Crown size={13} /> Make Host
                </button>
                <button
                  onClick={() => { onKick(member.id, member.user.name); setMenuOpen(false) }}
                  style={{
                    width: '100%', padding: '8px 12px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                    fontSize: '0.8rem', color: 'var(--red)',
                  }}
                >
                  <UserMinus size={13} /> Kick
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <Avatar
        user={member.user}
        size="lg"
        showRing
        style={{ border: '3px solid var(--surface)' }}
      />

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: '0.82rem', lineHeight: 1.2 }} className="truncate">
          {member.user?.name}{isMe && ' (you)'}
        </div>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginTop: 2 }}>
          {member.study_time_mins ?? 0}m studied today
        </div>
      </div>
    </motion.div>
  )
}

// ══════════════════════════════════════════════════════════
// MAIN SESSION PAGE
// ══════════════════════════════════════════════════════════
export default function RoomSession() {
  const { roomId }  = useParams()
  const navigate    = useNavigate()
  const currentUser = useAuthStore(s => s.user)
  const wsOn        = useWSStore(s => s.on)
  const wsSend      = useWSStore(s => s.send)
  const sendRoomJoin  = useWSStore(s => s.sendRoomJoin)
  const sendRoomLeave = useWSStore(s => s.sendRoomLeave)

  const [room, setRoom]       = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  // Pomodoro state
  const [pomoActive, setPomoActive] = useState(false)
  const [pomoSeconds, setPomoSeconds] = useState(POMODORO_WORK)
  const [pomoTotal, setPomoTotal]   = useState(POMODORO_WORK)
  const [pomoBreak, setPomoBreak]   = useState(false)
  const [pomoCount, setPomoCount]   = useState(0)
  const pomoRef = useRef(null)

  // Chat
  const [showChat, setShowChat]   = useState(false)
  const [chatMsgs, setChatMsgs]   = useState([])
  const [chatText, setChatText]   = useState('')
  const [unreadChat, setUnreadChat] = useState(0)
  const chatBottomRef = useRef()

  // Media toggles (UI only — no actual WebRTC in this impl)
  const [micOn, setMicOn]     = useState(true)
  const [camOn, setCamOn]     = useState(false)

  const isHost = room?.host_id === currentUser?.id

  // ── Load room ────────────────────────────────────────
  useEffect(() => {
    load()
    return () => {
      clearInterval(pomoRef.current)
      sendRoomLeave(roomId)
    }
  }, [roomId])

  async function load() {
    try {
      const res = await roomAPI.getRoom(roomId)
      const data = res?.room ? res : { room: res, members: res?.members || [] }
      setRoom(data.room)
      setMembers(data.members || [])

      // Restore pomodoro state from backend
      const r = data.room
      if (r.pomodoro_active && r.pomodoro_start) {
        const elapsed = Math.floor((Date.now() - new Date(r.pomodoro_start)) / 1000)
        const remaining = Math.max(0, POMODORO_WORK - elapsed)
        setPomoSeconds(remaining)
        setPomoTotal(POMODORO_WORK)
        setPomoActive(true)
        startPomoTick(remaining)
      }
      sendRoomJoin(roomId)
    } catch {
      toast.error('Room not found or session expired.')
      navigate('/rooms')
    } finally {
      setLoading(false)
    }
  }

  // ── Pomodoro tick ─────────────────────────────────────
  function startPomoTick(initialSeconds) {
    clearInterval(pomoRef.current)
    let secs = initialSeconds
    pomoRef.current = setInterval(() => {
      secs -= 1
      setPomoSeconds(secs)
      if (secs <= 0) {
        clearInterval(pomoRef.current)
        setPomoActive(false)
        setPomoBreak(prev => {
          const nextBreak = !prev
          const nextTotal = nextBreak ? POMODORO_BREAK : POMODORO_WORK
          setPomoSeconds(nextTotal)
          setPomoTotal(nextTotal)
          setPomoCount(c => nextBreak ? c + 1 : c)
          toast(nextBreak ? '☕ Break time! 5 minutes.' : '📖 Focus time! 25 minutes.', { duration: 4000 })
          return nextBreak
        })
      }
    }, 1000)
  }

  // ── Host: Start Pomodoro ──────────────────────────────
  async function handleStartPomo() {
    try {
      await roomAPI.startPomodoro(roomId)
      setPomoActive(true)
      setPomoBreak(false)
      setPomoSeconds(POMODORO_WORK)
      setPomoTotal(POMODORO_WORK)
      startPomoTick(POMODORO_WORK)
      wsSend({ type: 'pomodoro_start', room_id: roomId, duration: POMODORO_WORK })
      toast('🍅 Pomodoro started! Focus for 25 minutes.', { duration: 3000 })
    } catch {
      toast.error('Could not start Pomodoro.')
    }
  }

  async function handleStopPomo() {
    try {
      await roomAPI.stopPomodoro(roomId)
      clearInterval(pomoRef.current)
      setPomoActive(false)
      setPomoSeconds(POMODORO_WORK)
      setPomoTotal(POMODORO_WORK)
      setPomoBreak(false)
      wsSend({ type: 'pomodoro_stop', room_id: roomId })
    } catch {
      toast.error('Could not stop Pomodoro.')
    }
  }

  // ── WebSocket events ──────────────────────────────────
  useEffect(() => {
    const unsubJoin  = wsOn('room_join',  (msg) => {
      if (msg.room_id !== roomId) return
      setMembers(prev => {
        if (prev.find(m => m.user?.id === msg.user?.id)) return prev
        return [...prev, msg]
      })
      toast(`${msg.user?.name} joined the room 👋`, { duration: 2500 })
    })
    const unsubLeave = wsOn('room_leave', (msg) => {
      if (msg.room_id !== roomId) return
      setMembers(prev => prev.filter(m => m.user?.id !== msg.user_id))
    })
    const unsubKick  = wsOn('room_kick',  (msg) => {
      if (msg.room_id !== roomId) return
      if (msg.user_id === currentUser?.id) {
        toast.error('You were removed from the room.')
        navigate('/rooms')
      } else {
        setMembers(prev => prev.filter(m => m.user?.id !== msg.user_id))
      }
    })
    const unsubPomo  = wsOn('pomodoro_start', (msg) => {
      if (msg.room_id !== roomId) return
      setPomoActive(true)
      setPomoSeconds(msg.duration || POMODORO_WORK)
      setPomoTotal(msg.duration || POMODORO_WORK)
      setPomoBreak(false)
      startPomoTick(msg.duration || POMODORO_WORK)
    })
    const unsubStop  = wsOn('pomodoro_stop',  (msg) => {
      if (msg.room_id !== roomId) return
      clearInterval(pomoRef.current)
      setPomoActive(false)
      setPomoSeconds(POMODORO_WORK)
      setPomoTotal(POMODORO_WORK)
    })
    // Room chat via WS
    const unsubChat  = wsOn('chat_message', (msg) => {
      if (msg.chat_id !== `room_${roomId}`) return
      setChatMsgs(prev => [...prev, msg])
      if (!showChat) setUnreadChat(n => n + 1)
    })

    return () => { unsubJoin(); unsubLeave(); unsubKick(); unsubPomo(); unsubStop(); unsubChat() }
  }, [roomId, wsOn, showChat])

  // Scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMsgs, showChat])

  // ── Kick member ───────────────────────────────────────
  async function handleKick(userId, name) {
    if (!window.confirm(`Kick ${name} from the room?`)) return
    try {
      await roomAPI.kickMember(roomId, userId)
      setMembers(prev => prev.filter(m => m.user?.id !== userId))
      toast.success(`${name} removed.`)
    } catch {
      toast.error('Could not kick member.')
    }
  }

  // ── Transfer host ─────────────────────────────────────
  async function handleTransferHost(userId) {
    try {
      await roomAPI.transferHost(roomId, userId)
      setRoom(r => ({ ...r, host_id: userId }))
      setMembers(prev => prev.map(m => ({
        ...m,
        is_host: m.user?.id === userId,
      })))
      toast.success('Host transferred!')
    } catch {
      toast.error('Could not transfer host.')
    }
  }

  // ── Leave room ────────────────────────────────────────
  async function handleLeave() {
    if (isHost && members.length > 1) {
      if (!window.confirm('You are the host. Leaving will transfer host to another member. Continue?')) return
    }
    try {
      await roomAPI.leaveRoom(roomId)
      sendRoomLeave(roomId)
      navigate('/rooms')
    } catch {
      toast.error('Could not leave room.')
    }
  }

  // ── Room chat send ────────────────────────────────────
  function sendChatMsg(e) {
    e?.preventDefault()
    if (!chatText.trim()) return
    const msg = {
      id: Date.now(),
      chat_id: `room_${roomId}`,
      sender: currentUser,
      sender_id: currentUser?.id,
      content: chatText.trim(),
      created_at: new Date().toISOString(),
      is_mine: true,
    }
    setChatMsgs(prev => [...prev, msg])
    wsSend({ type: 'chat', chat_id: `room_${roomId}`, content: chatText.trim() })
    setChatText('')
  }

  if (loading) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <Spinner size={36} />
        <p style={{ color: 'var(--text-3)' }}>Joining room…</p>
      </div>
    </div>
  )

  if (!room) return null

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
        background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)',
        borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        <button className="btn-icon" onClick={() => navigate('/rooms')}>
          <ChevronLeft size={20} />
        </button>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }} className="truncate">{room.name}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>
            {members.length} studying · {room.subject || 'General'}
          </div>
        </div>

        {/* Media toggles */}
        <button
          className="btn-icon"
          onClick={() => setMicOn(v => !v)}
          style={{ color: micOn ? 'var(--text)' : 'var(--red)', background: micOn ? undefined : 'var(--red-light)' }}
        >
          {micOn ? <Mic size={16} /> : <MicOff size={16} />}
        </button>
        <button
          className="btn-icon"
          onClick={() => setCamOn(v => !v)}
          style={{ color: camOn ? 'var(--text)' : 'var(--red)', background: camOn ? undefined : 'var(--red-light)' }}
        >
          {camOn ? <Video size={16} /> : <VideoOff size={16} />}
        </button>

        {/* Chat toggle */}
        <button
          className="btn-icon"
          onClick={() => { setShowChat(v => !v); setUnreadChat(0) }}
          style={{ position: 'relative', color: showChat ? 'var(--primary)' : 'var(--text-2)' }}
        >
          <MessageCircle size={18} />
          {unreadChat > 0 && (
            <span style={{
              position: 'absolute', top: -4, right: -4,
              background: 'var(--red)', color: '#fff',
              fontSize: '0.6rem', fontWeight: 700,
              borderRadius: '50%', width: 16, height: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {unreadChat}
            </span>
          )}
        </button>

        <button
          className="btn btn-danger btn-sm"
          onClick={handleLeave}
          style={{ display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <LogOut size={13} /> Leave
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Main area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Pomodoro section */}
          <div style={{
            padding: '16px 16px 8px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            borderBottom: '1px solid var(--border)',
            background: pomoActive
              ? pomoBreak
                ? 'linear-gradient(180deg, var(--green-light) 0%, transparent 100%)'
                : 'linear-gradient(180deg, var(--primary-light) 0%, transparent 100%)'
              : 'transparent',
            transition: 'background 0.5s ease',
          }}>
            <PomodoroRing
              seconds={pomoSeconds}
              total={pomoTotal}
              isBreak={pomoBreak}
            />

            {/* Pomodoro controls */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {isHost ? (
                pomoActive ? (
                  <Button variant="ghost" size="sm" onClick={handleStopPomo}
                    icon={<Square size={13} />}>
                    Stop
                  </Button>
                ) : (
                  <Button variant="primary" size="sm" onClick={handleStartPomo}
                    icon={<Play size={13} />}>
                    Start Pomodoro
                  </Button>
                )
              ) : (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={12} />
                  {pomoActive ? 'Timer running (host controlled)' : 'Waiting for host to start timer…'}
                </div>
              )}

              {pomoCount > 0 && (
                <div style={{
                  fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 700,
                  background: 'var(--accent-light)', padding: '3px 8px',
                  borderRadius: 'var(--radius-full)',
                }}>
                  🍅 ×{pomoCount}
                </div>
              )}
            </div>
          </div>

          {/* Member grid */}
          <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
            {members.length === 0 ? (
              <EmptyState icon="👤" title="No members" desc="Invite friends to join!" />
            ) : (
              <div className="room-grid">
                {members.map(m => (
                  <MemberTile
                    key={m.user?.id}
                    member={m}
                    isHost={isHost}
                    isMe={m.user?.id === currentUser?.id}
                    onKick={handleKick}
                    onTransfer={handleTransferHost}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat panel */}
        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{
                borderLeft: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden', flexShrink: 0,
              }}
            >
              <div style={{
                padding: '12px 14px', borderBottom: '1px solid var(--border)',
                fontWeight: 700, fontSize: '0.88rem',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <MessageCircle size={15} style={{ color: 'var(--primary)' }} />
                Room Chat
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflow: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {chatMsgs.length === 0 ? (
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', textAlign: 'center', marginTop: 20 }}>
                    No messages yet. Say hi! 👋
                  </p>
                ) : chatMsgs.map(msg => (
                  <div key={msg.id} style={{
                    display: 'flex',
                    flexDirection: msg.is_mine ? 'row-reverse' : 'row',
                    gap: 6, alignItems: 'flex-end',
                  }}>
                    {!msg.is_mine && <Avatar user={msg.sender} size="xs" showRing={false} />}
                    <div style={{
                      maxWidth: '80%', padding: '6px 10px', borderRadius: 12,
                      background: msg.is_mine ? 'var(--primary)' : 'var(--surface-2)',
                      color: msg.is_mine ? '#fff' : 'var(--text)',
                      fontSize: '0.82rem', lineHeight: 1.4,
                      borderBottomRightRadius: msg.is_mine ? 2 : 12,
                      borderBottomLeftRadius:  msg.is_mine ? 12 : 2,
                    }}>
                      {!msg.is_mine && (
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--primary)', marginBottom: 2 }}>
                          {msg.sender?.name}
                        </div>
                      )}
                      {msg.content}
                    </div>
                  </div>
                ))}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat input */}
              <form
                onSubmit={sendChatMsg}
                style={{
                  padding: '8px 10px', borderTop: '1px solid var(--border)',
                  display: 'flex', gap: 6, alignItems: 'center',
                }}
              >
                <input
                  value={chatText}
                  onChange={e => setChatText(e.target.value)}
                  placeholder="Message…"
                  style={{
                    flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border)',
                    borderRadius: 16, padding: '6px 10px', outline: 'none',
                    color: 'var(--text)', fontSize: '0.82rem',
                  }}
                />
                <button
                  type="submit"
                  disabled={!chatText.trim()}
                  style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: chatText.trim() ? 'var(--primary)' : 'var(--surface-3)',
                    border: 'none', cursor: chatText.trim() ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: chatText.trim() ? '#fff' : 'var(--text-3)',
                    flexShrink: 0,
                  }}
                >
                  <Send size={13} />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
