/**
 * Feed.jsx — Instagram-clone Feed
 * Stories row · Infinite scroll posts · Create post modal
 * Like / Comment / Delete · Journey updates · Explore link
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Heart, MessageCircle, Send, Bookmark, MoreHorizontal,
  Image, Plus, X, ChevronLeft, ChevronRight, Compass,
  Lock, Globe, Pencil, Trash2, Camera,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useInView } from 'react-intersection-observer'
import useAuthStore from '@/store/authStore'
import { feedAPI } from '@/api'
import Avatar from '@/components/Avatar'
import Modal from '@/components/Modal'
import {
  Button, EmptyState, CardSkeleton, PageHeader,
  Textarea, Tag, Spinner,
} from '@/components/ui'
import toast from 'react-hot-toast'

// ── Constants ─────────────────────────────────────────────
const SUBJECTS = ['Mathematics','Physics','Chemistry','Biology','History','Geography','Economics','English','Computer Science','Other']
const EXAM_TAGS = ['JEE','NEET','UPSC','CAT','GATE','CA','SAT','GCSE','IB','General']

// ══════════════════════════════════════════════════════════
// STORIES ROW
// ══════════════════════════════════════════════════════════
function StoriesRow({ onAddStory }) {
  const currentUser = useAuthStore(s => s.user)
  const [stories, setStories] = useState([])
  const [viewer, setViewer]   = useState(null) // { stories, index, userId }

  useEffect(() => {
    feedAPI.getStories()
      .then(r => setStories(Array.isArray(r) ? r : (r?.stories || [])))
      .catch(() => {})
  }, [])

  function openViewer(group) {
    setViewer({ stories: group.stories, index: 0, user: group.user })
  }

  function viewNext() {
    setViewer(v => v.index < v.stories.length - 1
      ? { ...v, index: v.index + 1 }
      : null
    )
  }

  function viewPrev() {
    setViewer(v => v.index > 0 ? { ...v, index: v.index - 1 } : v)
  }

  return (
    <>
      <div className="stories-row" style={{ paddingTop: 12 }}>
        {/* Add story bubble */}
        <div className="story-item" onClick={onAddStory}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%',
            background: 'var(--surface-2)',
            border: '2px dashed var(--border-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}>
            <Avatar user={currentUser} size="md" showRing={false}
              style={{ width: 56, height: 56, opacity: 0.6 }} />
            <div style={{
              position: 'absolute', bottom: -2, right: -2,
              width: 22, height: 22, borderRadius: '50%',
              background: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid var(--bg)',
            }}>
              <Plus size={12} color="#fff" />
            </div>
          </div>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-3)', maxWidth: 60, textAlign: 'center' }}>
            Your story
          </span>
        </div>

        {/* Story groups */}
        {stories.map(group => (
          <div key={group.user.id} className="story-item" onClick={() => openViewer(group)}>
            <div className={`story-ring ${group.has_unviewed ? '' : 'story-ring-viewed'}`}
              style={{ width: 64, height: 64 }}>
              <Avatar user={group.user} size="md" showRing={false}
                style={{ width: 56, height: 56, border: '2px solid var(--bg)', borderRadius: '50%' }} />
            </div>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-2)', maxWidth: 60, textAlign: 'center' }} className="truncate">
              {group.user.name.split(' ')[0]}
            </span>
          </div>
        ))}
      </div>

      {/* Story Viewer Modal */}
      <AnimatePresence>
        {viewer && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)',
              zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onClick={() => setViewer(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              style={{
                width: '100%', maxWidth: 420, maxHeight: '90dvh',
                borderRadius: 20, overflow: 'hidden', position: 'relative',
                background: 'var(--surface)',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Progress bars */}
              <div style={{ display: 'flex', gap: 3, padding: '12px 12px 0' }}>
                {viewer.stories.map((_, i) => (
                  <div key={i} style={{
                    flex: 1, height: 3, borderRadius: 2,
                    background: i <= viewer.index ? 'var(--primary)' : 'var(--border)',
                  }} />
                ))}
              </div>

              {/* Header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px',
              }}>
                <Avatar user={viewer.user} size="sm" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{viewer.user.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>
                    {formatDistanceToNow(new Date(viewer.stories[viewer.index].created_at), { addSuffix: true })}
                  </div>
                </div>
                <button onClick={() => setViewer(null)} className="btn-icon" style={{ marginLeft: 'auto' }}>
                  <X size={16} />
                </button>
              </div>

              {/* Story media */}
              {viewer.stories[viewer.index].media_url ? (
                <img
                  src={viewer.stories[viewer.index].media_url}
                  alt="story"
                  style={{ width: '100%', maxHeight: '65vh', objectFit: 'contain', background: '#000' }}
                />
              ) : (
                <div style={{
                  height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `linear-gradient(135deg, var(--primary), var(--accent))`,
                  padding: 24,
                }}>
                  <p style={{ color: '#fff', fontWeight: 600, fontSize: '1.1rem', textAlign: 'center' }}>
                    {viewer.stories[viewer.index].caption}
                  </p>
                </div>
              )}

              {/* Caption */}
              {viewer.stories[viewer.index].caption && viewer.stories[viewer.index].media_url && (
                <div style={{ padding: '10px 14px', fontSize: '0.88rem' }}>
                  {viewer.stories[viewer.index].caption}
                </div>
              )}

              {/* Nav buttons */}
              {viewer.index > 0 && (
                <button onClick={viewPrev} style={{
                  position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%',
                  width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#fff',
                }}>
                  <ChevronLeft size={18} />
                </button>
              )}
              <button onClick={viewNext} style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%',
                width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#fff',
              }}>
                <ChevronRight size={18} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ══════════════════════════════════════════════════════════
// CREATE POST MODAL
// ══════════════════════════════════════════════════════════
function CreatePostModal({ open, onClose, onCreated }) {
  const currentUser = useAuthStore(s => s.user)
  const [content, setContent]     = useState('')
  const [images, setImages]       = useState([])   // File[]
  const [previews, setPreviews]   = useState([])
  const [subject, setSubject]     = useState('')
  const [examTag, setExamTag]     = useState('')
  const [isAnon, setIsAnon]       = useState(false)
  const [loading, setLoading]     = useState(false)
  const fileRef = useRef()

  function reset() {
    setContent(''); setImages([]); setPreviews([])
    setSubject(''); setExamTag(''); setIsAnon(false)
  }

  function handleClose() { reset(); onClose() }

  function handleFiles(files) {
    const arr = Array.from(files).slice(0, 4)
    setImages(arr)
    setPreviews(arr.map(f => URL.createObjectURL(f)))
  }

  async function handleSubmit() {
    if (!content.trim() && images.length === 0) {
      toast.error('Add some text or an image.'); return
    }
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('content', content)
      fd.append("is_anonymous", isAnon ? "true" : "false")
      if (subject)  fd.append('subject', subject)
      if (examTag)  fd.append('exam_target', examTag)
      images.forEach(f => fd.append('images', f))

      const res = await feedAPI.createPost(fd)
      onCreated(res)
      toast.success('Post shared! 🚀')
      handleClose()
    } catch {
      toast.error('Could not create post.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Create Post" maxWidth={500}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Author row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar user={isAnon ? null : currentUser} size="md" showRing />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
              {isAnon ? 'Anonymous' : currentUser?.name}
            </div>
            <button
              onClick={() => setIsAnon(v => !v)}
              style={{
                fontSize: '0.72rem', color: 'var(--text-3)',
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              {isAnon ? <Lock size={11} /> : <Globe size={11} />}
              {isAnon ? 'Posting anonymously' : 'Public post · tap to anonymise'}
            </button>
          </div>
        </div>

        {/* Text */}
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder={`What's on your mind, ${currentUser?.name?.split(' ')[0] || 'student'}?`}
          style={{
            width: '100%', minHeight: 100, background: 'transparent',
            border: 'none', outline: 'none', resize: 'none',
            color: 'var(--text)', fontSize: '1rem', fontFamily: 'var(--font-main)',
            lineHeight: 1.6,
          }}
          autoFocus
        />

        {/* Image previews */}
        {previews.length > 0 && (
          <div className={`post-images-grid grid-${previews.length}`}
            style={{ borderRadius: 'var(--radius)', overflow: 'hidden' }}>
            {previews.map((src, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <img src={src} alt="" className="post-image" />
                <button
                  onClick={() => {
                    setImages(imgs => imgs.filter((_, j) => j !== i))
                    setPreviews(ps => ps.filter((_, j) => j !== i))
                  }}
                  style={{
                    position: 'absolute', top: 6, right: 6,
                    background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%',
                    width: 26, height: 26, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', cursor: 'pointer', color: '#fff',
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Tags row */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select
            className="input" value={subject} onChange={e => setSubject(e.target.value)}
            style={{ flex: 1, padding: '6px 10px', fontSize: '0.8rem', minWidth: 120 }}
          >
            <option value="">Subject…</option>
            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            className="input" value={examTag} onChange={e => setExamTag(e.target.value)}
            style={{ flex: 1, padding: '6px 10px', fontSize: '0.8rem', minWidth: 100 }}
          >
            <option value="">Exam tag…</option>
            {EXAM_TAGS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>

        {/* Bottom bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="btn-icon"
              onClick={() => fileRef.current?.click()}
              title="Add images (max 4)"
            >
              <Image size={18} />
            </button>
            <input
              ref={fileRef} type="file" multiple accept="image/*" style={{ display: 'none' }}
              onChange={e => handleFiles(e.target.files)}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: content.length > 900 ? 'var(--red)' : 'var(--text-3)' }}>
              {content.length}/1000
            </span>
            <Button
              variant="primary"
              size="sm"
              loading={loading}
              onClick={handleSubmit}
              disabled={!content.trim() && images.length === 0}
            >
              Post
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ══════════════════════════════════════════════════════════
// POST CARD
// ══════════════════════════════════════════════════════════
function PostCard({ post: initialPost, onDelete }) {
  const currentUser = useAuthStore(s => s.user)
  const navigate    = useNavigate()
  const [post, setPost]       = useState(initialPost)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments]         = useState([])
  const [commentText, setCommentText]   = useState('')
  const [loadingComments, setLoadingComments] = useState(false)
  const [submitting, setSubmitting]     = useState(false)
  const [showMenu, setShowMenu]         = useState(false)
  const [imgIndex, setImgIndex]         = useState(0)

  const isLiked = post.is_liked
  const isMe    = post.author?.id === currentUser?.id

  async function handleLike() {
    const wasLiked = post.is_liked
    // Optimistic
    setPost(p => ({
      ...p,
      is_liked: !wasLiked,
      likes_count: wasLiked ? p.likes_count - 1 : p.likes_count + 1,
    }))
    try {
      if (wasLiked) await feedAPI.unlikePost(post.id)
      else          await feedAPI.likePost(post.id)
    } catch {
      // Revert
      setPost(p => ({
        ...p,
        is_liked: wasLiked,
        likes_count: wasLiked ? p.likes_count + 1 : p.likes_count - 1,
      }))
    }
  }

  async function loadComments() {
    if (loadingComments) return
    setShowComments(true)
    setLoadingComments(true)
    try {
      const res = await feedAPI.getComments(post.id)
      setComments(Array.isArray(res) ? res : (res?.comments || res || []))
    } catch {}
    finally { setLoadingComments(false) }
  }

  async function submitComment(e) {
    e.preventDefault()
    if (!commentText.trim() || submitting) return
    setSubmitting(true)
    try {
      const res = await feedAPI.addComment(post.id, { content: commentText.trim() })
      setComments(c => [...c, res])
      setPost(p => ({ ...p, comments_count: p.comments_count + 1 }))
      setCommentText('')
    } catch {}
    finally { setSubmitting(false) }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this post?')) return
    try {
      await feedAPI.deletePost(post.id)
      onDelete(post.id)
      toast.success('Post deleted.')
    } catch {}
  }

  const images = post.images || []

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="post-card"
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 10px' }}>
        <Avatar
          user={post.is_anonymous ? null : post.author}
          size="md" showRing
          onClick={() => !post.is_anonymous && navigate(`/profile/${post.author?.username}`)}
        />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            {post.is_anonymous ? 'Anonymous' : post.author?.name || 'Student'}
            {post.is_anonymous && <Lock size={12} style={{ color: 'var(--text-3)' }} />}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            {post.subject && ` · ${post.subject}`}
          </div>
        </div>

        {(post.exam_target || post.subject) && (
          <Tag variant="">{post.exam_target || post.subject}</Tag>
        )}

        <div style={{ position: 'relative' }}>
          <button className="btn-icon" onClick={() => setShowMenu(v => !v)}>
            <MoreHorizontal size={18} />
          </button>
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: -8 }}
                style={{
                  position: 'absolute', right: 0, top: '110%',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  boxShadow: 'var(--shadow)',
                  minWidth: 150, zIndex: 10, overflow: 'hidden',
                }}
              >
                {isMe && (
                  <button
                    onClick={() => { setShowMenu(false); handleDelete() }}
                    style={{
                      width: '100%', padding: '10px 14px',
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--red)', fontSize: '0.85rem',
                    }}
                  >
                    <Trash2 size={14} /> Delete post
                  </button>
                )}
                <button
                  onClick={() => { setShowMenu(false); navigate(`/profile/${post.author?.username}`) }}
                  style={{
                    width: '100%', padding: '10px 14px',
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text)', fontSize: '0.85rem',
                  }}
                >
                  <Send size={14} /> View profile
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Content */}
      {post.content && (
        <p style={{ padding: '0 16px 10px', fontSize: '0.95rem', color: 'var(--text)', lineHeight: 1.6 }}>
          {post.content}
        </p>
      )}

      {/* Images */}
      {images.length > 0 && (
        <div style={{ position: 'relative' }}>
          <div className={`post-images-grid grid-${Math.min(images.length, 4)}`}>
            {images.slice(0, 4).map((img, i) => (
              <img key={i} src={img} alt="" className="post-image"
                style={{ cursor: 'pointer' }}
                onClick={() => setImgIndex(i)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '10px 12px 6px',
      }}>
        <motion.button
          whileTap={{ scale: 1.3 }}
          onClick={handleLike}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'none', border: 'none', cursor: 'pointer',
            color: isLiked ? 'var(--red)' : 'var(--text-3)',
            padding: '6px 8px', borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem', fontWeight: 600, transition: 'color 150ms',
          }}
        >
          <Heart size={20} fill={isLiked ? 'var(--red)' : 'none'} />
          {post.likes_count > 0 && post.likes_count}
        </motion.button>

        <button
          onClick={showComments ? () => setShowComments(false) : loadComments}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'none', border: 'none', cursor: 'pointer',
            color: showComments ? 'var(--primary)' : 'var(--text-3)',
            padding: '6px 8px', borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem', fontWeight: 600,
          }}
        >
          <MessageCircle size={20} />
          {post.comments_count > 0 && post.comments_count}
        </button>

        <div style={{ flex: 1 }} />
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 6 }}>
          <Bookmark size={18} />
        </button>
      </div>

      {/* Comments section */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden', borderTop: '1px solid var(--border)' }}
          >
            <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {loadingComments ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 8 }}>
                  <Spinner size={18} />
                </div>
              ) : comments.length === 0 ? (
                <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', textAlign: 'center' }}>
                  No comments yet. Be first!
                </p>
              ) : (
                comments.map(c => (
                  <div key={c.id} style={{ display: 'flex', gap: 8 }}>
                    <Avatar user={c.author} size="xs" showRing={false} />
                    <div style={{
                      background: 'var(--surface-2)', borderRadius: 12,
                      padding: '7px 12px', flex: 1,
                    }}>
                      <span style={{ fontWeight: 700, fontSize: '0.8rem', marginRight: 6 }}>
                        {c.author?.name}
                      </span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{c.content}</span>
                    </div>
                  </div>
                ))
              )}

              {/* Comment input */}
              <form onSubmit={submitComment} style={{ display: 'flex', gap: 8 }}>
                <Avatar user={currentUser} size="xs" showRing={false} />
                <div style={{
                  flex: 1, display: 'flex', gap: 6,
                  background: 'var(--surface-2)', borderRadius: 20,
                  padding: '6px 6px 6px 12px', alignItems: 'center',
                  border: '1px solid var(--border)',
                }}>
                  <input
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    placeholder="Write a comment…"
                    style={{
                      flex: 1, background: 'none', border: 'none',
                      outline: 'none', color: 'var(--text)', fontSize: '0.85rem',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!commentText.trim() || submitting}
                    style={{
                      background: 'var(--primary)', border: 'none', borderRadius: '50%',
                      width: 28, height: 28, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', cursor: 'pointer', color: '#fff',
                      opacity: !commentText.trim() ? 0.5 : 1,
                      flexShrink: 0,
                    }}
                  >
                    <Send size={13} />
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ══════════════════════════════════════════════════════════
// MAIN FEED PAGE
// ══════════════════════════════════════════════════════════
export default function Feed() {
  const navigate    = useNavigate()
  const currentUser = useAuthStore(s => s.user)

  const [posts, setPosts]         = useState([])
  const [page, setPage]           = useState(1)
  const [hasMore, setHasMore]     = useState(true)
  const [loading, setLoading]     = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const [createOpen, setCreateOpen]   = useState(false)
  const [storyOpen, setStoryOpen]     = useState(false)
  const [filter, setFilter]       = useState('following') // following | trending | anonymous

  // Infinite scroll sentinel
  const { ref: sentinelRef, inView } = useInView({ threshold: 0 })

  const loadPosts = useCallback(async (pageNum = 1, reset = false) => {
    if (loading) return
    setLoading(true)
    try {
      const res = await feedAPI.getPosts({
        page: pageNum,
        limit: 10,
        feed_type: filter,
      })
      const { posts: newPosts, has_more } = res
      setPosts(prev => reset ? newPosts : [...prev, ...newPosts])
      setHasMore(has_more || false)
      setPage(pageNum)
    } catch {}
    finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }, [filter, loading])

  // Initial load & filter change
  useEffect(() => {
    setPosts([])
    setPage(1)
    setHasMore(true)
    setInitialLoad(true)
    loadPosts(1, true)
  }, [filter])

  // Infinite scroll
  useEffect(() => {
    if (inView && hasMore && !loading && !initialLoad) {
      loadPosts(page + 1)
    }
  }, [inView, hasMore, loading])

  function handlePostCreated(newPost) {
    setPosts(prev => [newPost, ...prev])
  }

  function handlePostDeleted(postId) {
    setPosts(prev => prev.filter(p => p.id !== postId))
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <PageHeader
        title="EduConnect"
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-icon" onClick={() => navigate('/explore')}>
              <Compass size={20} />
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setCreateOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Pencil size={14} /> Post
            </button>
          </div>
        }
      />

      <div className="page-scroll">
        {/* Stories */}
        <StoriesRow onAddStory={() => setStoryOpen(true)} />

        {/* Filter tabs */}
        <div style={{
          display: 'flex', gap: 0, borderBottom: '1px solid var(--border)',
          padding: '0 16px', overflowX: 'auto', scrollbarWidth: 'none',
        }}>
          {['following', 'trending', 'anonymous'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="profile-tab"
              style={{
                color: filter === f ? 'var(--primary)' : 'var(--text-3)',
                borderBottomColor: filter === f ? 'var(--primary)' : 'transparent',
              }}
            >
              {f === 'following' ? '👥 Following'
               : f === 'trending' ? '🔥 Trending'
               : '🎭 Anonymous'}
            </button>
          ))}
        </div>

        {/* Post list */}
        <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {initialLoad ? (
            Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
          ) : posts.length === 0 ? (
            <EmptyState
              icon="📭"
              title="Nothing here yet"
              desc={filter === 'following'
                ? "Follow some students to see their posts here."
                : "No posts yet. Be the first!"}
              action={
                <Button variant="primary" onClick={() => setCreateOpen(true)}>
                  Create First Post
                </Button>
              }
            />
          ) : (
            posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                onDelete={handlePostDeleted}
              />
            ))
          )}

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} style={{ height: 20 }} />

          {/* Loading more indicator */}
          {loading && !initialLoad && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
              <Spinner size={24} />
            </div>
          )}

          {!hasMore && posts.length > 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: '0.8rem', padding: 16 }}>
              You've seen it all! 🎉
            </p>
          )}
        </div>
      </div>

      {/* Create post modal */}
      <CreatePostModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handlePostCreated}
      />

      {/* Add story modal */}
      <Modal open={storyOpen} onClose={() => setStoryOpen(false)} title="Add to Story">
        <AddStoryForm
          onClose={() => setStoryOpen(false)}
          onCreated={() => { setStoryOpen(false); toast.success('Story posted!') }}
        />
      </Modal>
    </div>
  )
}

// ── Add Story form (inside modal) ─────────────────────────
function AddStoryForm({ onClose, onCreated }) {
  const [caption, setCaption] = useState('')
  const [file, setFile]       = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef()

  async function handleSubmit() {
    if (!caption.trim() && !file) { toast.error('Add a caption or image.'); return }
    setLoading(true)
    try {
      const fd = new FormData()
      if (caption) fd.append('caption', caption)
      if (file)    fd.append('file', file)
      await feedAPI.createStory(fd)
      onCreated()
    } catch {
      toast.error('Could not post story.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {preview && (
        <div style={{ position: 'relative', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <img src={preview} alt="" style={{ width: '100%', maxHeight: 280, objectFit: 'cover' }} />
          <button
            onClick={() => { setFile(null); setPreview(null) }}
            style={{
              position: 'absolute', top: 8, right: 8,
              background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%',
              width: 28, height: 28, cursor: 'pointer', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      <textarea
        value={caption}
        onChange={e => setCaption(e.target.value)}
        placeholder="What's your story today? 📖"
        className="input"
        style={{ minHeight: 80, resize: 'none' }}
      />

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className="btn btn-ghost"
          onClick={() => fileRef.current?.click()}
          style={{ flex: 1 }}
        >
          <Camera size={16} /> Add Photo
        </button>
        <input
          ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => {
            const f = e.target.files[0]
            if (f) { setFile(f); setPreview(URL.createObjectURL(f)) }
          }}
        />
        <Button variant="primary" loading={loading} onClick={handleSubmit} style={{ flex: 1 }}>
          Share Story
        </Button>
      </div>
    </div>
  )
}
