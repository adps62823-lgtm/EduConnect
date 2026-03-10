/**
 * Chat.jsx — WhatsApp-clone conversation list
 * DM list · Group chats · Unread badges · New chat modal · Online presence
 */
import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Plus, Users, MessageCircle,
  Check, CheckCheck, X,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { chatAPI } from '@/api'
import useAuthStore from '@/store/authStore'
import { useWSStore, useNotifStore } from '@/store/notifStore'
import Avatar from '@/components/Avatar'
import Modal from '@/components/Modal'
import SearchBar from '@/components/SearchBar'
import { Button, EmptyState, Spinner, PageHeader } from '@/components/ui'
import toast from 'react-hot-toast'

// ── Conversation item ─────────────────────────────────────
function ConvItem({ conv, isActive, onClick }) {
  const currentUser = useAuthStore(s => s.user)
  const isOnline    = useWSStore(s => s.isOnline)

  const other    = conv.other_user
  const lastMsg  = conv.last_message
  const unread   = conv.unread_count
  const online   = !conv.is_group && other && isOnline(other.id)

  return (
    <motion.div
      whileHover={{ backgroundColor: 'var(--surface-2)' }}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', cursor: 'pointer',
        background: isActive ? 'var(--primary-light)' : 'transparent',
        borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
        transition: 'all 150ms ease',
        position: 'relative',
      }}
    >
      {/* Avatar */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        {conv.is_group ? (
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Users size={20} color="#fff" />
          </div>
        ) : (
          <Avatar user={other} size="md" showRing />
        )}
        {online && (
          <div style={{
            position: 'absolute', bottom: 1, right: 1,
            width: 11, height: 11, borderRadius: '50%',
            background: 'var(--green)',
            border: '2px solid var(--bg)',
          }} />
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            fontWeight: unread > 0 ? 700 : 600,
            fontSize: '0.9rem',
            color: 'var(--text)',
          }} className="truncate">
            {conv.name}
          </span>
          {lastMsg && (
            <span style={{ fontSize: '0.68rem', color: 'var(--text-3)', flexShrink: 0, marginLeft: 8 }}>
              {formatDistanceToNow(new Date(lastMsg.created_at), { addSuffix: false })}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden', flex: 1 }}>
            {lastMsg?.is_mine && (
              <span style={{ color: lastMsg.is_read ? 'var(--primary)' : 'var(--text-3)', flexShrink: 0 }}>
                {lastMsg.is_read ? <CheckCheck size={13} /> : <Check size={13} />}
              </span>
            )}
            <span className="truncate" style={{
              fontSize: '0.78rem',
              color: unread > 0 ? 'var(--text-2)' : 'var(--text-3)',
              fontWeight: unread > 0 ? 600 : 400,
            }}>
              {lastMsg
                ? (lastMsg.media_url ? '📎 Attachment' : lastMsg.content)
                : 'No messages yet'}
            </span>
          </div>
          {unread > 0 && (
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              style={{
                background: 'var(--primary)', color: '#fff',
                fontSize: '0.65rem', fontWeight: 700,
                borderRadius: '999px', minWidth: 18, height: 18,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 5px', flexShrink: 0, marginLeft: 6,
              }}
            >
              {unread > 99 ? '99+' : unread}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ── New group modal ───────────────────────────────────────
function NewGroupModal({ open, onClose, onCreated }) {
  const [name, setName]       = useState('')
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(false)

  function addMember(user) {
    if (!members.find(m => m.id === user.id)) {
      setMembers(m => [...m, user])
    }
  }

  async function handleCreate() {
    if (!name.trim()) { toast.error('Group name is required.'); return }
    if (members.length < 1) { toast.error('Add at least one member.'); return }
    setLoading(true)
    try {
      const res = await chatAPI.createGroup({
        name: name.trim(),
        member_ids: members.map(m => m.id),
      })
      onCreated(res.data)
      toast.success(`Group "${name}" created!`)
      onClose()
    } catch {
      toast.error('Could not create group.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Group Chat">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <input
          className="input"
          placeholder="Group name…"
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
        />

        <div>
          <div className="input-label" style={{ marginBottom: 6 }}>Add Members</div>
          <SearchBar
            placeholder="Search students…"
            onSelect={addMember}
          />
        </div>

        {members.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {members.map(m => (
              <div key={m.id} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'var(--primary-light)', border: '1px solid var(--primary)30',
                borderRadius: 'var(--radius-full)', padding: '4px 10px',
                fontSize: '0.8rem', color: 'var(--primary)',
              }}>
                <Avatar user={m} size="xs" showRing={false} />
                {m.name}
                <button
                  onClick={() => setMembers(ms => ms.filter(x => x.id !== m.id))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, display: 'flex' }}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</Button>
          <Button variant="primary" loading={loading} onClick={handleCreate} style={{ flex: 2 }}>
            Create Group
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ══════════════════════════════════════════════════════════
// MAIN CHAT PAGE
// ══════════════════════════════════════════════════════════
export default function Chat() {
  const navigate    = useNavigate()
  const location    = useLocation()
  const currentUser = useAuthStore(s => s.user)
  const setUnread   = useWSStore(s => s.setUnreadChats)

  const [convs, setConvs]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [q, setQ]               = useState('')
  const [showGroup, setShowGroup] = useState(false)
  const [activeId, setActiveId]   = useState(null)

  useEffect(() => {
    loadConvs()
  }, [])

  // Auto-open DM if navigated with state.openDMWith
  useEffect(() => {
    if (location.state?.openDMWith) {
      openDM(location.state.openDMWith)
    }
  }, [location.state])

  async function loadConvs() {
    try {
      const res = await chatAPI.getConversations()
      setConvs(res.data)
      const total = res.data.reduce((s, c) => s + (c.unread_count || 0), 0)
      setUnread(total)
    } catch {}
    finally { setLoading(false) }
  }

  async function openDM(userId) {
    try {
      const res = await chatAPI.createDM(userId)
      const conv = res.data
      setConvs(prev => {
        const exists = prev.find(c => c.id === conv.id)
        return exists ? prev : [conv, ...prev]
      })
      navigate(`/chat/${conv.id}`)
    } catch {
      toast.error('Could not open conversation.')
    }
  }

  function handleConvClick(conv) {
    setActiveId(conv.id)
    navigate(`/chat/${conv.id}`)
    // Clear unread locally
    setConvs(prev => prev.map(c =>
      c.id === conv.id ? { ...c, unread_count: 0 } : c
    ))
  }

  function handleGroupCreated(conv) {
    setConvs(prev => [conv, ...prev])
    navigate(`/chat/${conv.id}`)
  }

  const filtered = convs.filter(c =>
    c.name?.toLowerCase().includes(q.toLowerCase())
  )

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        title="Messages"
        subtitle={`${convs.length} conversations`}
        action={
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn-icon" onClick={() => setShowGroup(true)} title="New group">
              <Users size={18} />
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => navigate('/explore')}
              style={{ display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <Plus size={15} /> New
            </button>
          </div>
        }
      />

      <div className="page-scroll">
        {/* Search */}
        <div style={{ padding: '10px 14px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: '8px 12px',
          }}>
            <Search size={15} style={{ color: 'var(--text-3)' }} />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search conversations…"
              style={{
                flex: 1, background: 'none', border: 'none',
                outline: 'none', color: 'var(--text)', fontSize: '0.88rem',
              }}
            />
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="💬"
            title={q ? 'No conversations match' : 'No messages yet'}
            desc="Search for a student or explore to find people to chat with."
            action={
              <Button variant="primary" onClick={() => navigate('/explore')}>
                Find Students
              </Button>
            }
          />
        ) : (
          filtered.map(conv => (
            <ConvItem
              key={conv.id}
              conv={conv}
              isActive={activeId === conv.id}
              onClick={() => handleConvClick(conv)}
            />
          ))
        )}
      </div>

      <NewGroupModal
        open={showGroup}
        onClose={() => setShowGroup(false)}
        onCreated={handleGroupCreated}
      />
    </div>
  )
}
