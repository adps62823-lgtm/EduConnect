import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronLeft,
  Clock,
  Crown,
  LogOut,
  MessageCircle,
  Mic,
  MicOff,
  Play,
  Send,
  Settings,
  Square,
  UserMinus,
  Video,
  VideoOff,
} from 'lucide-react'
import { roomAPI } from '@/api'
import useAuthStore from '@/store/authStore'
import { useWSStore } from '@/store/notifStore'
import Avatar from '@/components/Avatar'
import { Button, EmptyState, Spinner } from '@/components/ui'
import toast from 'react-hot-toast'

const POMODORO_WORK = 25 * 60
const POMODORO_BREAK = 5 * 60

function normalizeMember(member) {
  if (!member) return null
  if (member.user) {
    return {
      ...member,
      user: member.user,
      user_id: member.user?.id || member.user_id,
      is_host: Boolean(member.is_host),
      study_time_mins: member.study_time_mins ?? 0,
    }
  }

  return {
    id: member.id || `temp_${member.user?.id || member.user_id || Math.random()}`,
    user_id: member.user?.id || member.user_id,
    user: member.user || member,
    is_host: Boolean(member.is_host),
    study_time_mins: member.study_time_mins ?? 0,
  }
}

function sortMembers(list) {
  return [...list]
    .map(normalizeMember)
    .filter(Boolean)
    .sort((a, b) => {
      if (a.is_host && !b.is_host) return -1
      if (!a.is_host && b.is_host) return 1
      return (a.user?.name || '').localeCompare(b.user?.name || '')
    })
}

function getPomodoroSnapshot(room) {
  if (!room?.pomodoro_active || !room?.pomodoro_start) {
    return {
      active: false,
      isBreak: false,
      seconds: POMODORO_WORK,
      total: POMODORO_WORK,
      completedFocusSessions: 0,
    }
  }

  const elapsed = Math.max(0, Math.floor((Date.now() - new Date(room.pomodoro_start).getTime()) / 1000))
  const cycleLength = POMODORO_WORK + POMODORO_BREAK
  const cycleOffset = elapsed % cycleLength
  const isBreak = cycleOffset >= POMODORO_WORK
  const seconds = isBreak
    ? Math.max(1, POMODORO_BREAK - (cycleOffset - POMODORO_WORK))
    : Math.max(1, POMODORO_WORK - cycleOffset)

  return {
    active: true,
    isBreak,
    seconds,
    total: isBreak ? POMODORO_BREAK : POMODORO_WORK,
    completedFocusSessions: Math.floor(elapsed / cycleLength) + (isBreak ? 1 : 0),
  }
}

function PomodoroRing({ seconds, total, isBreak }) {
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const progress = total > 0 ? seconds / total : 0
  const dashOffset = circumference * (1 - progress)
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0')
  const secs = String(seconds % 60).padStart(2, '0')

  return (
    <div style={{ position: 'relative', width: 130, height: 130 }}>
      <svg width="130" height="130" style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
        <circle cx="65" cy="65" r={radius} fill="none" stroke="var(--surface-3)" strokeWidth="8" />
        <motion.circle
          cx="65"
          cy="65"
          r={radius}
          fill="none"
          stroke={isBreak ? 'var(--green)' : 'var(--primary)'}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 800,
            fontSize: '1.5rem',
            color: isBreak ? 'var(--green)' : 'var(--text)',
            lineHeight: 1,
          }}
        >
          {mins}:{secs}
        </span>
        <span style={{ fontSize: '0.62rem', color: 'var(--text-3)', fontWeight: 600 }}>
          {isBreak ? 'BREAK' : 'FOCUS'}
        </span>
      </div>
    </div>
  )
}

function MemberTile({ member, isHost, isMe, onKick, onTransfer }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const targetUserId = member.user?.id

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        position: 'relative',
        minHeight: 120,
      }}
    >
      {member.is_host && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            background: 'var(--accent)',
            borderRadius: 4,
            padding: '2px 6px',
            fontSize: '0.62rem',
            fontWeight: 700,
            color: '#000',
            display: 'flex',
            alignItems: 'center',
            gap: 3,
          }}
        >
          <Crown size={9} /> HOST
        </div>
      )}

      {isHost && !member.is_host && targetUserId && (
        <div style={{ position: 'absolute', top: 8, right: 8 }}>
          <button className="btn-icon" style={{ width: 22, height: 22 }} onClick={() => setMenuOpen((value) => !value)}>
            <Settings size={12} />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                style={{
                  position: 'absolute',
                  top: '110%',
                  right: 0,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  boxShadow: 'var(--shadow)',
                  zIndex: 10,
                  minWidth: 150,
                  overflow: 'hidden',
                }}
              >
                <button
                  onClick={() => {
                    onTransfer(targetUserId, member.user?.name)
                    setMenuOpen(false)
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: '0.8rem',
                    color: 'var(--accent)',
                  }}
                >
                  <Crown size={13} /> Make Host
                </button>
                <button
                  onClick={() => {
                    onKick(targetUserId, member.user?.name)
                    setMenuOpen(false)
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: '0.8rem',
                    color: 'var(--red)',
                  }}
                >
                  <UserMinus size={13} /> Kick
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <Avatar user={member.user} size="lg" showRing style={{ border: '3px solid var(--surface)' }} />

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: '0.82rem', lineHeight: 1.2 }} className="truncate">
          {member.user?.name}
          {isMe && ' (you)'}
        </div>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginTop: 2 }}>
          {member.study_time_mins ?? 0}m studied today
        </div>
      </div>
    </motion.div>
  )
}

export default function RoomSession() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const currentUser = useAuthStore((state) => state.user)
  const wsOn = useWSStore((state) => state.on)
  const wsSend = useWSStore((state) => state.send)
  const sendRoomJoin = useWSStore((state) => state.sendRoomJoin)
  const sendRoomLeave = useWSStore((state) => state.sendRoomLeave)

  const [room, setRoom] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshingMembers, setRefreshingMembers] = useState(false)

  const [pomoActive, setPomoActive] = useState(false)
  const [pomoSeconds, setPomoSeconds] = useState(POMODORO_WORK)
  const [pomoTotal, setPomoTotal] = useState(POMODORO_WORK)
  const [pomoBreak, setPomoBreak] = useState(false)
  const [pomoCount, setPomoCount] = useState(0)
  const pomoRef = useRef(null)

  const [showChat, setShowChat] = useState(false)
  const [chatMsgs, setChatMsgs] = useState([])
  const [chatText, setChatText] = useState('')
  const [unreadChat, setUnreadChat] = useState(0)
  const chatBottomRef = useRef(null)

  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(false)

  const isHost = room?.host_id === currentUser?.id
  const memberCount = members.length

  const applyPomodoroSnapshot = useCallback((snapshot) => {
    clearInterval(pomoRef.current)

    setPomoActive(snapshot.active)
    setPomoBreak(snapshot.isBreak)
    setPomoSeconds(snapshot.seconds)
    setPomoTotal(snapshot.total)
    setPomoCount(snapshot.completedFocusSessions || 0)

    if (snapshot.active) {
      let seconds = snapshot.seconds
      let currentBreakPhase = snapshot.isBreak

      pomoRef.current = setInterval(() => {
        seconds -= 1

        if (seconds > 0) {
          setPomoSeconds(seconds)
          return
        }

        currentBreakPhase = !currentBreakPhase
        const nextTotal = currentBreakPhase ? POMODORO_BREAK : POMODORO_WORK
        seconds = nextTotal

        setPomoBreak(currentBreakPhase)
        setPomoTotal(nextTotal)
        setPomoSeconds(nextTotal)

        if (currentBreakPhase) {
          setPomoCount((count) => count + 1)
          toast('Break time. Take 5 minutes.', { duration: 2500 })
        } else {
          toast('Focus time. Back to 25 minutes.', { duration: 2500 })
        }
      }, 1000)
    }
  }, [])

  const applyRoomSnapshot = useCallback((payload, syncPomodoro = false) => {
    const data = payload?.room ? payload : { room: payload, members: payload?.members || [] }
    setRoom(data.room)
    setMembers(sortMembers(data.members || []))
    if (syncPomodoro) {
      applyPomodoroSnapshot(getPomodoroSnapshot(data.room))
    }
  }, [applyPomodoroSnapshot])

  const refreshRoomMembers = useCallback(async () => {
    if (!roomId) return
    setRefreshingMembers(true)
    try {
      const payload = await roomAPI.getRoom(roomId)
      applyRoomSnapshot(payload, false)
    } catch {
      // Ignore transient refresh errors while the user is already in the room.
    } finally {
      setRefreshingMembers(false)
    }
  }, [applyRoomSnapshot, roomId])

  const loadRoom = useCallback(async () => {
    if (!roomId) return
    setLoading(true)
    try {
      const payload = await roomAPI.getRoom(roomId)
      applyRoomSnapshot(payload, true)
      sendRoomJoin(roomId)
    } catch {
      toast.error('Room not found or session expired.')
      navigate('/rooms')
    } finally {
      setLoading(false)
    }
  }, [applyRoomSnapshot, navigate, roomId, sendRoomJoin])

  useEffect(() => {
    loadRoom()
    return () => {
      clearInterval(pomoRef.current)
      sendRoomLeave(roomId)
    }
  }, [loadRoom, roomId, sendRoomLeave])

  useEffect(() => {
    const unsubJoin = wsOn('room_join', (msg) => {
      if (msg.room_id !== roomId || msg.user_id === currentUser?.id) return

      const incomingMember = normalizeMember({
        id: `live_${msg.user_id}`,
        user_id: msg.user_id,
        user: msg.user,
        is_host: false,
        study_time_mins: 0,
      })

      setMembers((prev) => {
        if (prev.some((member) => member.user?.id === incomingMember.user?.id)) {
          return prev
        }
        return sortMembers([...prev, incomingMember])
      })

      refreshRoomMembers()

      if (msg.user?.name) {
        toast(`${msg.user.name} joined the room.`, { duration: 2200 })
      }
    })

    const unsubLeave = wsOn('room_leave', (msg) => {
      if (msg.room_id !== roomId) return
      setMembers((prev) => prev.filter((member) => member.user?.id !== msg.user_id))
      refreshRoomMembers()
    })

    const unsubKick = wsOn('room_kick', (msg) => {
      if (msg.room_id !== roomId) return

      if (msg.user_id === currentUser?.id) {
        toast.error('You were removed from the room.')
        navigate('/rooms')
        return
      }

      setMembers((prev) => prev.filter((member) => member.user?.id !== msg.user_id))
      refreshRoomMembers()
    })

    const unsubPomo = wsOn('pomodoro_start', (msg) => {
      if (msg.room_id !== roomId) return
      applyPomodoroSnapshot({
        active: true,
        isBreak: false,
        seconds: msg.duration || POMODORO_WORK,
        total: msg.duration || POMODORO_WORK,
        completedFocusSessions: pomoCount,
      })
    })

    const unsubStop = wsOn('pomodoro_stop', (msg) => {
      if (msg.room_id !== roomId) return
      applyPomodoroSnapshot({
        active: false,
        isBreak: false,
        seconds: POMODORO_WORK,
        total: POMODORO_WORK,
        completedFocusSessions: pomoCount,
      })
    })

    const unsubChat = wsOn('chat_message', (msg) => {
      if (msg.chat_id !== `room_${roomId}`) return
      setChatMsgs((prev) => [...prev, { ...msg, is_mine: msg.sender_id === currentUser?.id }])
      if (!showChat) setUnreadChat((count) => count + 1)
    })

    return () => {
      unsubJoin()
      unsubLeave()
      unsubKick()
      unsubPomo()
      unsubStop()
      unsubChat()
    }
  }, [applyPomodoroSnapshot, currentUser?.id, navigate, pomoCount, refreshRoomMembers, roomId, showChat, wsOn])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMsgs, showChat])

  async function handleStartPomo() {
    try {
      await roomAPI.startPomodoro(roomId)
      applyPomodoroSnapshot({
        active: true,
        isBreak: false,
        seconds: POMODORO_WORK,
        total: POMODORO_WORK,
        completedFocusSessions: pomoCount,
      })
      wsSend({ type: 'pomodoro_start', room_id: roomId, duration: POMODORO_WORK })
      toast('Pomodoro started. Focus for 25 minutes.', { duration: 2500 })
    } catch {
      toast.error('Could not start Pomodoro.')
    }
  }

  async function handleStopPomo() {
    try {
      await roomAPI.stopPomodoro(roomId)
      applyPomodoroSnapshot({
        active: false,
        isBreak: false,
        seconds: POMODORO_WORK,
        total: POMODORO_WORK,
        completedFocusSessions: pomoCount,
      })
      wsSend({ type: 'pomodoro_stop', room_id: roomId })
    } catch {
      toast.error('Could not stop Pomodoro.')
    }
  }

  async function handleKick(targetUserId, targetName) {
    if (!targetUserId) return
    if (!window.confirm(`Kick ${targetName || 'this member'} from the room?`)) return

    try {
      await roomAPI.kickMember(roomId, targetUserId)
      setMembers((prev) => prev.filter((member) => member.user?.id !== targetUserId))
      toast.success(`${targetName || 'Member'} removed.`)
      refreshRoomMembers()
    } catch {
      toast.error('Could not kick member.')
    }
  }

  async function handleTransferHost(targetUserId, targetName) {
    if (!targetUserId) return

    try {
      await roomAPI.transferHost(roomId, targetUserId)
      setRoom((prev) => prev ? { ...prev, host_id: targetUserId } : prev)
      setMembers((prev) => sortMembers(prev.map((member) => ({
        ...member,
        is_host: member.user?.id === targetUserId,
      }))))
      toast.success(`Host transferred to ${targetName || 'member'}.`)
    } catch {
      toast.error('Could not transfer host.')
    }
  }

  async function handleLeave() {
    if (isHost && memberCount > 1) {
      if (!window.confirm('You are the host. Leaving will transfer host to another member. Continue?')) {
        return
      }
    }

    try {
      await roomAPI.leaveRoom(roomId)
      sendRoomLeave(roomId)
      navigate('/rooms')
    } catch {
      toast.error('Could not leave room.')
    }
  }

  function sendChatMsg(event) {
    event?.preventDefault()
    const content = chatText.trim()
    if (!content) return

    const localMsg = {
      id: `local_${Date.now()}`,
      chat_id: `room_${roomId}`,
      sender: currentUser,
      sender_id: currentUser?.id,
      content,
      created_at: new Date().toISOString(),
      is_mine: true,
    }

    setChatMsgs((prev) => [...prev, localMsg])
    wsSend({ type: 'chat', chat_id: `room_${roomId}`, content })
    setChatText('')
  }

  const roomSubtitle = useMemo(() => {
    const bits = [room?.subject || 'General session']
    if (room?.exam_target) bits.push(room.exam_target)
    bits.push(`${memberCount} studying`)
    return bits.join(' • ')
  }, [memberCount, room?.exam_target, room?.subject])

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <Spinner size={36} />
          <p style={{ color: 'var(--text-3)' }}>Joining room...</p>
        </div>
      </div>
    )
  }

  if (!room) return null

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          background: 'var(--glass-bg)',
          backdropFilter: 'var(--glass-blur)',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        <button className="btn-icon" onClick={() => navigate('/rooms')}>
          <ChevronLeft size={20} />
        </button>

        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }} className="truncate">{room.name}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{roomSubtitle}</div>
        </div>

        <button
          className="btn-icon"
          onClick={() => setMicOn((value) => !value)}
          style={{ color: micOn ? 'var(--text)' : 'var(--red)', background: micOn ? undefined : 'var(--red-light)' }}
        >
          {micOn ? <Mic size={16} /> : <MicOff size={16} />}
        </button>

        <button
          className="btn-icon"
          onClick={() => setCamOn((value) => !value)}
          style={{ color: camOn ? 'var(--text)' : 'var(--red)', background: camOn ? undefined : 'var(--red-light)' }}
        >
          {camOn ? <Video size={16} /> : <VideoOff size={16} />}
        </button>

        <button
          className="btn-icon"
          onClick={() => {
            setShowChat((value) => !value)
            setUnreadChat(0)
          }}
          style={{ position: 'relative', color: showChat ? 'var(--primary)' : 'var(--text-2)' }}
        >
          <MessageCircle size={18} />
          {unreadChat > 0 && (
            <span
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                background: 'var(--red)',
                color: '#fff',
                fontSize: '0.6rem',
                fontWeight: 700,
                borderRadius: '50%',
                width: 16,
                height: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {unreadChat}
            </span>
          )}
        </button>

        <button className="btn btn-danger btn-sm" onClick={handleLeave} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <LogOut size={13} /> Leave
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div
            style={{
              padding: '16px 16px 8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
              borderBottom: '1px solid var(--border)',
              background: pomoActive
                ? pomoBreak
                  ? 'linear-gradient(180deg, var(--green-light) 0%, transparent 100%)'
                  : 'linear-gradient(180deg, var(--primary-light) 0%, transparent 100%)'
                : 'transparent',
              transition: 'background 0.5s ease',
            }}
          >
            <PomodoroRing seconds={pomoSeconds} total={pomoTotal} isBreak={pomoBreak} />

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
              {isHost ? (
                pomoActive ? (
                  <Button variant="ghost" size="sm" onClick={handleStopPomo} icon={<Square size={13} />}>
                    Stop
                  </Button>
                ) : (
                  <Button variant="primary" size="sm" onClick={handleStartPomo} icon={<Play size={13} />}>
                    Start Pomodoro
                  </Button>
                )
              ) : (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={12} />
                  {pomoActive ? 'Timer running (host controlled)' : 'Waiting for the host to start the timer'}
                </div>
              )}

              {pomoCount > 0 && (
                <div
                  style={{
                    fontSize: '0.72rem',
                    color: 'var(--accent)',
                    fontWeight: 700,
                    background: 'var(--accent-light)',
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-full)',
                  }}
                >
                  Focus sessions: {pomoCount}
                </div>
              )}
            </div>
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 10 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.96rem' }}>Study crew</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-3)' }}>
                  {refreshingMembers ? 'Refreshing members...' : `${memberCount} participants in this room`}
                </div>
              </div>
              <button className="btn-outline" onClick={refreshRoomMembers}>Refresh</button>
            </div>

            {memberCount === 0 ? (
              <EmptyState icon="Members" title="No members" desc="Invite friends to join your study room." />
            ) : (
              <div className="room-grid">
                {members.map((member) => (
                  <MemberTile
                    key={member.user?.id || member.id}
                    member={member}
                    isHost={isHost}
                    isMe={member.user?.id === currentUser?.id}
                    onKick={handleKick}
                    onTransfer={handleTransferHost}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{
                borderLeft: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  padding: '12px 14px',
                  borderBottom: '1px solid var(--border)',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <MessageCircle size={15} style={{ color: 'var(--primary)' }} />
                Room Chat
              </div>

              <div style={{ flex: 1, overflow: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {chatMsgs.length === 0 ? (
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', textAlign: 'center', marginTop: 20 }}>
                    No messages yet. Start the session with a quick hello.
                  </p>
                ) : (
                  chatMsgs.map((msg) => (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex',
                        flexDirection: msg.is_mine ? 'row-reverse' : 'row',
                        gap: 6,
                        alignItems: 'flex-end',
                      }}
                    >
                      {!msg.is_mine && <Avatar user={msg.sender} size="xs" showRing={false} />}
                      <div
                        style={{
                          maxWidth: '80%',
                          padding: '6px 10px',
                          borderRadius: 12,
                          background: msg.is_mine ? 'var(--primary)' : 'var(--surface-2)',
                          color: msg.is_mine ? '#fff' : 'var(--text)',
                          fontSize: '0.82rem',
                          lineHeight: 1.4,
                          borderBottomRightRadius: msg.is_mine ? 2 : 12,
                          borderBottomLeftRadius: msg.is_mine ? 12 : 2,
                        }}
                      >
                        {!msg.is_mine && (
                          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--primary)', marginBottom: 2 }}>
                            {msg.sender?.name}
                          </div>
                        )}
                        {msg.content}
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatBottomRef} />
              </div>

              <form
                onSubmit={sendChatMsg}
                style={{
                  padding: '8px 10px',
                  borderTop: '1px solid var(--border)',
                  display: 'flex',
                  gap: 6,
                  alignItems: 'center',
                }}
              >
                <input
                  value={chatText}
                  onChange={(event) => setChatText(event.target.value)}
                  placeholder="Message the room..."
                  style={{
                    flex: 1,
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 16,
                    padding: '6px 10px',
                    outline: 'none',
                    color: 'var(--text)',
                    fontSize: '0.82rem',
                  }}
                />
                <button
                  type="submit"
                  disabled={!chatText.trim()}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: chatText.trim() ? 'var(--primary)' : 'var(--surface-3)',
                    border: 'none',
                    cursor: chatText.trim() ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
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
