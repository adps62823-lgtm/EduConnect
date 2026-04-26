/**
 * ChatConversation.jsx — Full real-time chat window
 * WebSocket messages · Typing indicators · Media upload
 * Read receipts · Group member management · Message delete
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, Send, Paperclip, MoreVertical,
  Users, UserPlus, UserMinus, Trash2, Phone,
  Image as ImageIcon, FileText, X, Check, CheckCheck,
  Info,
} from 'lucide-react'
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns'
import { chatAPI } from '@/api'
import useAuthStore from '@/store/authStore'
import { useWSStore } from '@/store/notifStore'
import Avatar from '@/components/Avatar'
import Modal from '@/components/Modal'
import SearchBar from '@/components/SearchBar'
import { Spinner, EmptyState } from '@/components/ui'
import toast from 'react-hot-toast'

// ── Date separator ────────────────────────────────────────
function DateSep({ date }) {
  const d = new Date(date)
  const label = isToday(d) ? 'Today'
    : isYesterday(d) ? 'Yesterday'
    : format(d, 'dd MMM yyyy')
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      margin: '10px 0', padding: '0 4px',
    }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      <span style={{
        fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 600,
        background: 'var(--surface)', padding: '2px 10px',
        borderRadius: 'var(--radius-full)', border: '1px solid var(--border)',
        whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  )
}

// ── Message bubble ────────────────────────────────────────
function MessageBubble({ msg, prevMsg, isMine, onDelete }) {
  const [showMenu, setShowMenu] = useState(false)

  // Show date separator if day changed
  const showDate = !prevMsg ||
    new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString()

  // Show sender name in group chats (when previous msg is from different sender)
  const showSender = !isMine && (!prevMsg || prevMsg.sender?.id !== msg.sender?.id)

  return (
    <>
      {showDate && <DateSep date={msg.created_at} />}

      <div style={{
        display: 'flex',
        flexDirection: isMine ? 'row-reverse' : 'row',
        alignItems: 'flex-end',
        gap: 6,
        marginBottom: showSender ? 8 : 2,
      }}>
        {/* Avatar (others only, and only on last in a sequence) */}
        {!isMine && (
          <div style={{ width: 28, flexShrink: 0 }}>
            {showSender && <Avatar user={msg.sender} size="xs" showRing={false} />}
          </div>
        )}

        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: isMine ? 'flex-end' : 'flex-start',
          maxWidth: '72%',
        }}>
          {showSender && (
            <span style={{
              fontSize: '0.72rem', fontWeight: 700,
              color: 'var(--primary)', marginBottom: 3, paddingLeft: 10,
            }}>
              {msg.sender?.name}
            </span>
          )}

          <div
            style={{ position: 'relative' }}
            onMouseEnter={() => setShowMenu(true)}
            onMouseLeave={() => setShowMenu(false)}
          >
            {/* Image message */}
            {msg.media_type === 'image' && msg.media_url && (
              <img
                src={msg.media_url}
                alt="attachment"
                style={{
                  maxWidth: 240, maxHeight: 280,
                  borderRadius: 14,
                  borderBottomRightRadius: isMine ? 4 : 14,
                  borderBottomLeftRadius:  isMine ? 14 : 4,
                  display: 'block',
                  marginBottom: msg.content ? 4 : 0,
                }}
              />
            )}

            {/* File message */}
            {msg.media_type === 'file' && msg.media_url && (
              <a
                href={msg.media_url}
                download
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: isMine ? 'rgba(255,255,255,0.15)' : 'var(--surface-3)',
                  borderRadius: 10, padding: '8px 12px',
                  color: 'inherit', textDecoration: 'none',
                  fontSize: '0.82rem',
                }}
              >
                <FileText size={18} />
                <span className="truncate" style={{ maxWidth: 140 }}>
                  {msg.media_url.split('/').pop()}
                </span>
              </a>
            )}

            {/* Text content */}
            {msg.content && (
              <div
                className={isMine ? 'message-bubble message-mine' : 'message-bubble message-theirs'}
                style={{ position: 'relative' }}
              >
                {msg.content}

                {/* Timestamp + read receipt */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                  gap: 3, marginTop: 2,
                  fontSize: '0.62rem',
                  opacity: 0.65,
                }}>
                  {format(new Date(msg.created_at), 'HH:mm')}
                  {isMine && (
                    msg.is_read
                      ? <CheckCheck size={11} style={{ color: isMine ? '#a5b4fc' : 'var(--primary)' }} />
                      : <Check size={11} />
                  )}
                </div>
              </div>
            )}

            {/* Delete button on hover */}
            <AnimatePresence>
              {showMenu && isMine && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => onDelete(msg.id)}
                  style={{
                    position: 'absolute',
                    top: '50%', transform: 'translateY(-50%)',
                    [isMine ? 'left' : 'right']: -32,
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: '50%',
                    width: 26, height: 26,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: 'var(--red)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <Trash2 size={12} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Typing indicator ──────────────────────────────────────
function TypingIndicator({ names }) {
  if (!names.length) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '4px 16px', fontSize: '0.78rem', color: 'var(--text-3)',
      }}
    >
      <div style={{ display: 'flex', gap: 3 }}>
        {[0,1,2].map(i => (
          <motion.span
            key={i}
            animate={{ y: [0, -4, 0] }}
            transition={{ delay: i * 0.15, repeat: Infinity, duration: 0.6 }}
            style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--primary)', display: 'block',
            }}
          />
        ))}
      </div>
      <span>{names.join(', ')} {names.length === 1 ? 'is' : 'are'} typing…</span>
    </motion.div>
  )
}

// ── Group info modal ──────────────────────────────────────
function GroupInfoModal({ open, onClose, conv, onMemberRemoved }) {
  const currentUser = useAuthStore(s => s.user)
  const isAdmin = conv?.created_by === currentUser?.id
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(false)

  async function addMember(user) {
    try {
      await chatAPI.addMember(conv.id, user.id)
      toast.success(`${user.name} added!`)
      onClose()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Could not add member.')
    }
  }

  async function removeMember(userId, name) {
    if (!window.confirm(`Remove ${name}?`)) return
    setLoading(true)
    try {
      await chatAPI.removeMember(conv.id, userId)
      onMemberRemoved(userId)
      toast.success(`${name} removed.`)
    } catch {
      toast.error('Could not remove member.')
    } finally {
      setLoading(false)
    }
  }

  if (!conv) return null

  return (
    <Modal open={open} onClose={onClose} title={conv.name}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>
          {conv.members_count} members
        </div>

        {/* Members */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {conv.participants?.map(p => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px', borderRadius: 'var(--radius)',
              background: 'var(--surface-2)',
            }}>
              <Avatar user={p} size="sm" showRing />
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }} className="truncate">
                  {p.name} {p.id === currentUser?.id && '(you)'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>
                  @{p.username}
                </div>
              </div>
              {isAdmin && p.id !== currentUser?.id && (
                <button
                  onClick={() => removeMember(p.id, p.name)}
                  disabled={loading}
                  style={{
                    background: 'var(--red-light)', border: 'none',
                    borderRadius: 'var(--radius-sm)', padding: '4px 8px',
                    color: 'var(--red)', cursor: 'pointer', fontSize: '0.75rem',
                  }}
                >
                  <UserMinus size={13} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add members */}
        {isAdmin && (
          <div>
            <button
              onClick={() => setAdding(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'var(--primary-light)', color: 'var(--primary)',
                border: '1px solid var(--primary)30', borderRadius: 'var(--radius)',
                padding: '8px 14px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                width: '100%', justifyContent: 'center',
              }}
            >
              <UserPlus size={15} /> Add Member
            </button>
            {adding && (
              <div style={{ marginTop: 10 }}>
                <SearchBar placeholder="Search students…" onSelect={addMember} />
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

// ══════════════════════════════════════════════════════════
// MAIN CONVERSATION PAGE
// ══════════════════════════════════════════════════════════
export default function ChatConversation() {
  const { chatId }  = useParams()
  const navigate    = useNavigate()
  const currentUser = useAuthStore(s => s.user)
  const ws          = useWSStore(s => s.ws)
  const wsOn        = useWSStore(s => s.on)
  const wsSend      = useWSStore(s => s.send)
  const sendTyping  = useWSStore(s => s.sendTyping)
  const stopTyping  = useWSStore(s => s.sendStopTyping)
  const whoIsTyping = useWSStore(s => s.whoIsTyping)
  const isOnline    = useWSStore(s => s.isOnline)
  const markReadWS  = useWSStore(s => s.decrementUnread)

  const [conv, setConv]         = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading]   = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore]   = useState(false)
  const [page, setPage]         = useState(1)
  const [text, setText]         = useState('')
  const [file, setFile]         = useState(null)
  const [filePreview, setFilePreview] = useState(null)
  const [sending, setSending]   = useState(false)
  const [showInfo, setShowInfo] = useState(false)

  const bottomRef  = useRef()
  const fileRef    = useRef()
  const typingTimer = useRef()

  // Load conv + messages
  useEffect(() => {
    load()
    return () => { clearTimeout(typingTimer.current) }
  }, [chatId])

  async function load() {
    setLoading(true)
    try {
      const [convRes, msgRes] = await Promise.all([
        chatAPI.getConversation(chatId),
        chatAPI.getMessages(chatId, { page: 1, limit: 40 }),
      ])
      setConv(convRes)
      setMessages(msgRes?.messages || [])
      setHasMore(msgRes?.has_more || false)
      setPage(1)
      // Mark as read
      chatAPI.markRead(chatId).catch(() => {})
      markReadWS()
    } catch {
      toast.error('Conversation not found.')
      navigate('/chat')
    } finally {
      setLoading(false)
    }
  }

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // WebSocket: listen for new messages in this chat
  useEffect(() => {
    const unsub = wsOn('chat_message', (msg) => {
      if (msg.chat_id === chatId) {
        setMessages(prev => [...prev, msg])
        chatAPI.markRead(chatId).catch(() => {})
      }
    })
    return unsub
  }, [chatId, wsOn])

  const typingUsers = whoIsTyping(chatId)
  const typingNames = typingUsers
    .filter(uid => uid !== currentUser?.id)
    .map(uid => conv?.participants?.find(p => p.id === uid)?.name)
    .filter(Boolean)

  async function loadMore() {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const nextPage = page + 1
      const res = await chatAPI.getMessages(chatId, { page: nextPage, limit: 40 })
      setMessages(prev => [...(res?.messages || []), ...prev])
      setHasMore(res?.has_more || false)
      setPage(nextPage)
    } catch {}
    finally { setLoadingMore(false) }
  }

  function handleTextChange(e) {
    setText(e.target.value)
    // Typing indicator
    sendTyping(chatId)
    clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => stopTyping(chatId), 2500)
  }

  function handleFileChange(e) {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    if (f.type.startsWith('image/')) {
      setFilePreview(URL.createObjectURL(f))
    } else {
      setFilePreview(null)
    }
  }

  async function handleSend(e) {
    e?.preventDefault()
    if ((!text.trim() && !file) || sending) return
    setSending(true)
    stopTyping(chatId)
    clearTimeout(typingTimer.current)

    try {
      const fd = new FormData()
      if (text.trim()) fd.append('content', text.trim())
      if (file)        fd.append('file', file)

      const res = await chatAPI.sendMessage(chatId, fd)
      setMessages(prev => [...prev, res])
      setText('')
      setFile(null)
      setFilePreview(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch {
      toast.error('Could not send message.')
    } finally {
      setSending(false)
    }
  }

  async function handleDeleteMessage(msgId) {
    try {
      await chatAPI.deleteMessage(chatId, msgId)
      setMessages(prev => prev.filter(m => m.id !== msgId))
    } catch {
      toast.error('Could not delete message.')
    }
  }

  function handleMemberRemoved(userId) {
    setConv(c => ({
      ...c,
      participants: c.participants.filter(p => p.id !== userId),
      members_count: c.members_count - 1,
    }))
  }

  if (loading) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner size={32} />
    </div>
  )

  if (!conv) return null

  const other  = conv.other_user
  const online = !conv.is_group && other && isOnline(other.id)

  return (
    <div className="chat-window" style={{ height: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px',
        background: 'var(--glass-bg)',
        backdropFilter: 'var(--glass-blur)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <button className="btn-icon" onClick={() => navigate('/chat')}>
          <ChevronLeft size={20} />
        </button>

        {conv.is_group ? (
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Users size={18} color="#fff" />
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            <Avatar user={other} size="sm" showRing={false} />
            {online && (
              <div style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 10, height: 10, borderRadius: '50%',
                background: 'var(--green)', border: '2px solid var(--bg)',
              }} />
            )}
          </div>
        )}

        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontWeight: 700, fontSize: '0.92rem' }} className="truncate">
            {conv.name}
          </div>
          <div style={{ fontSize: '0.7rem', color: online ? 'var(--green)' : 'var(--text-3)' }}>
            {conv.is_group
              ? `${conv.members_count} members`
              : online ? 'Online' : 'Offline'}
          </div>
        </div>

        {conv.is_group && (
          <button className="btn-icon" onClick={() => setShowInfo(true)} title="Group info">
            <Info size={18} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div
        className="chat-messages"
        onScroll={e => {
          if (e.currentTarget.scrollTop < 60 && hasMore && !loadingMore) {
            loadMore()
          }
        }}
      >
        {loadingMore && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 8 }}>
            <Spinner size={18} />
          </div>
        )}

        {messages.length === 0 ? (
          <EmptyState
            icon="👋"
            title="Say hello!"
            desc={`Start a conversation with ${conv.is_group ? conv.name : other?.name}.`}
          />
        ) : (
          messages.map((msg, i) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              prevMsg={messages[i - 1]}
              isMine={msg.sender_id === currentUser?.id || msg.is_mine}
              onDelete={handleDeleteMessage}
            />
          ))
        )}

        {/* Typing indicator */}
        <AnimatePresence>
          {typingNames.length > 0 && <TypingIndicator names={typingNames} />}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* File preview */}
      <AnimatePresence>
        {file && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{
              padding: '8px 16px', borderTop: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface-2)',
            }}
          >
            {filePreview
              ? <img src={filePreview} alt="" style={{ height: 48, borderRadius: 8, objectFit: 'cover' }} />
              : <FileText size={24} style={{ color: 'var(--primary)' }} />
            }
            <span style={{ flex: 1, fontSize: '0.82rem' }} className="truncate">{file.name}</span>
            <button
              onClick={() => { setFile(null); setFilePreview(null) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex' }}
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input bar */}
      <form onSubmit={handleSend} className="chat-input-bar">
        <input ref={fileRef} type="file" style={{ display: 'none' }}
          accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.txt"
          onChange={handleFileChange}
        />
        <button
          type="button"
          className="btn-icon"
          onClick={() => fileRef.current?.click()}
          title="Attach file"
        >
          <Paperclip size={18} />
        </button>

        <input
          value={text}
          onChange={handleTextChange}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
          }}
          placeholder="Type a message…"
          style={{
            flex: 1, background: 'var(--surface-2)',
            border: '1px solid var(--border)', borderRadius: 20,
            padding: '8px 14px', outline: 'none', color: 'var(--text)',
            fontSize: '0.9rem', transition: 'border-color 150ms',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--primary)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />

        <motion.button
          whileTap={{ scale: 0.9 }}
          type="submit"
          disabled={(!text.trim() && !file) || sending}
          style={{
            width: 40, height: 40, borderRadius: '50%',
            background: (!text.trim() && !file) ? 'var(--surface-3)' : 'var(--primary)',
            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: (!text.trim() && !file) ? 'default' : 'pointer',
            flexShrink: 0, transition: 'background 200ms ease',
            boxShadow: (!text.trim() && !file) ? 'none' : '0 4px 12px var(--primary-glow)',
          }}
        >
          {sending
            ? <Spinner size={16} color="#fff" />
            : <Send size={18} color={(!text.trim() && !file) ? 'var(--text-3)' : '#fff'} />
          }
        </motion.button>
      </form>

      {/* Group info modal */}
      {conv.is_group && (
        <GroupInfoModal
          open={showInfo}
          onClose={() => setShowInfo(false)}
          conv={conv}
          onMemberRemoved={handleMemberRemoved}
        />
      )}
    </div>
  )
}
