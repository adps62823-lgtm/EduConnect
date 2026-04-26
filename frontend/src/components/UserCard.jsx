/**
 * UserCard.jsx — Compact user card used in:
 * search results · followers/following lists · mentor cards · suggestions
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { UserPlus, UserCheck, MessageCircle, Star } from 'lucide-react'
import Avatar from './Avatar'
import { authAPI } from '@/api'
import useAuthStore from '@/store/authStore'
import toast from 'react-hot-toast'

const STATUS_LABELS = {
  studying:  { label: '📖 Studying',  color: 'var(--green)' },
  break:     { label: '☕ On break',  color: 'var(--accent)' },
  chilling:  { label: '😎 Chilling',  color: 'var(--text-3)' },
  sleeping:  { label: '😴 Offline',   color: 'var(--text-3)' },
}

export default function UserCard({ user: initialUser, showFollow = true, showMessage = false, showCloseFriend = false, onClick }) {
  const navigate    = useNavigate()
  const currentUser = useAuthStore(s => s.user)
  const [user, setUser]       = useState(initialUser)
  const [loading, setLoading] = useState(false)

  if (!user) return null
  const isMe = currentUser?.id === user.id

  async function handleFollow(e) {
    e.stopPropagation()
    if (loading) return
    setLoading(true)
    try {
      const res = await authAPI.follow(user.id)
      const isFollowing = res?.following ?? !user.is_following
      setUser(u => ({
        ...u,
        is_following: isFollowing,
        followers_count: Math.max(0, (u.followers_count || 0) + (isFollowing ? 1 : -1)),
      }))
      if (isFollowing) toast.success(`Following ${user.name}!`)
    } catch {
      toast.error('Could not update follow.')
    } finally {
      setLoading(false)
    }
  }

  function handleMessage(e) {
    e.stopPropagation()
    navigate('/chat', { state: { openDMWith: user.id } })
  }

  async function handleCloseFriend(e) {
    e.stopPropagation()
    try {
      const res = await authAPI.toggleCloseFriend(user.id)
      const isCF = res?.is_close_friend ?? !user.is_close_friend
      setUser(u => ({ ...u, is_close_friend: isCF }))
      toast.success(isCF ? `${user.name} added to close friends ✨` : `Removed from close friends.`)
    } catch {
      toast.error('Could not update close friends.')
    }
  }

  const status = STATUS_LABELS[user.study_status] || STATUS_LABELS.chilling

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="card"
      style={{ padding: '14px 16px', cursor: onClick ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 12 }}
      onClick={() => onClick ? onClick(user) : navigate(`/profile/${user.username}`)}
    >
      <Avatar user={user} size="md" showRing />

      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontWeight: 700, fontSize: '0.9rem' }} className="truncate">
            {user.name}
          </span>
          {user.is_verified && <span title="Verified">✅</span>}
        </div>
        <div className="truncate text-muted" style={{ fontSize: '0.78rem' }}>@{user.username}</div>
        <div style={{ fontSize: '0.72rem', color: status.color, marginTop: 2 }}>
          {status.label}
        </div>
        {user.exam_target && (
          <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: 1 }}>
            🎯 {user.exam_target}
          </div>
        )}
      </div>

      {!isMe && (
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {showMessage && (
            <button className="btn-icon btn-sm" onClick={handleMessage} title="Message">
              <MessageCircle size={15} />
            </button>
          )}
          {showCloseFriend && (
            <button
              className="btn-icon btn-sm"
              onClick={handleCloseFriend}
              title={user.is_close_friend ? 'Remove from close friends' : 'Add to close friends'}
              style={{ color: user.is_close_friend ? 'var(--green)' : 'var(--text-3)' }}
            >
              <Star size={15} fill={user.is_close_friend ? 'currentColor' : 'none'} />
            </button>
          )}
          {showFollow && (
            <button
              className={`btn btn-sm ${user.is_following ? 'btn-ghost' : 'btn-primary'}`}
              onClick={handleFollow}
              disabled={loading}
              style={{ padding: '5px 12px', fontSize: '0.78rem' }}
            >
              {user.is_following
                ? <><UserCheck size={13} /> Following</>
                : <><UserPlus size={13} /> Follow</>
              }
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
}
