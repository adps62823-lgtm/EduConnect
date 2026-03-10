import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { authAPI, feedAPI, profileAPI } from "../api";
import { useAuthStore } from "../store/authStore";

const ago = (iso) => {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
};
const daysUntil = (dateStr) => Math.max(0, Math.ceil((new Date(dateStr) - new Date()) / 86400000));

// ── Post Card ──────────────────────────────────────────────
function PostCard({ post, onDelete, currentUserId }) {
  const [showComments, setShowComments] = useState(false);
  const [comments,     setComments]     = useState([]);
  const [newComment,   setNewComment]   = useState("");
  const [liked,        setLiked]        = useState(post.is_liked);
  const [likeCount,    setLikeCount]    = useState(post.likes_count);

  const toggleLike = async () => {
    try {
      const r = await feedAPI.likePost(post.id);
      setLiked(r.liked); setLikeCount(r.likes_count);
    } catch {}
  };

  const loadComments = async () => {
    if (!showComments) {
      const r = await feedAPI.getComments(post.id);
      setComments(r.comments || []);
    }
    setShowComments(v => !v);
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    const c = await feedAPI.addComment(post.id, { content: newComment });
    setComments(prev => [...prev, c]);
    setNewComment("");
  };

  return (
    <div className="profile-post-card">
      {post.images?.length > 0 && (
        <div className={`post-images count-${Math.min(post.images.length, 4)}`}>
          {post.images.slice(0,4).map((img,i) => <img key={i} src={img} alt="" />)}
        </div>
      )}
      {post.content && <p className="post-content">{post.content}</p>}
      {post.tags?.length > 0 && (
        <div className="post-tags">{post.tags.map(t => <span key={t} className="tag">#{t}</span>)}</div>
      )}
      <div className="post-actions">
        <button className={`action-btn ${liked?"liked":""}`} onClick={toggleLike}>
          {liked ? "❤️" : "🤍"} {likeCount}
        </button>
        <button className="action-btn" onClick={loadComments}>
          💬 {post.comments_count}
        </button>
        {post.is_mine && (
          <button className="action-btn danger" onClick={() => onDelete(post.id)}>🗑️</button>
        )}
        <span className="post-time">{ago(post.created_at)}</span>
      </div>
      {showComments && (
        <div className="comments-section">
          {comments.map(c => (
            <div key={c.id} className="comment">
              <img
                src={c.author?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${c.author?.name}`}
                alt="" className="comment-avatar"
              />
              <div>
                <span className="comment-author">{c.author?.name}</span>
                <span className="comment-text"> {c.content}</span>
              </div>
            </div>
          ))}
          <form onSubmit={submitComment} className="comment-form">
            <input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Write a comment…" />
            <button type="submit">Send</button>
          </form>
        </div>
      )}
    </div>
  );
}

// ── Followers Modal ────────────────────────────────────────
function FollowersModal({ username, type, onClose }) {
  const [users, setUsers] = useState([]);
  useEffect(() => {
    const fn = type === "followers" ? profileAPI.getFollowers : profileAPI.getFollowing;
    fn(username).then(setUsers).catch(() => {});
  }, [username, type]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{type === "followers" ? "Followers" : "Following"}</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <div className="modal-list">
          {users.map(u => (
            <Link key={u.id} to={`/profile/${u.username}`} onClick={onClose} className="modal-user">
              <img src={u.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${u.name}`} alt="" />
              <div>
                <strong>{u.name}</strong>
                <span>@{u.username}</span>
              </div>
              {u.is_following && <span className="following-badge">Following</span>}
            </Link>
          ))}
          {users.length === 0 && <p className="empty-state">No {type} yet.</p>}
        </div>
      </div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────
export default function Profile() {
  const { username }   = useParams();
  const navigate       = useNavigate();
  const { user: currentUser, updateUser } = useAuthStore();
  const fileAvatarRef  = useRef();
  const fileCoverRef   = useRef();

  const [profile,       setProfile]       = useState(null);
  const [posts,         setPosts]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [tab,           setTab]           = useState("posts");
  const [followModal,   setFollowModal]   = useState(null);
  const [isFollowing,   setIsFollowing]   = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [editMode,      setEditMode]      = useState(false);
  const [editForm,      setEditForm]      = useState({});
  const [countdown,     setCountdown]     = useState({ exam_name: "", exam_date: "" });
  const [hasMore,       setHasMore]       = useState(false);
  const [postsPage,     setPostsPage]     = useState(1);

  const isMe = currentUser?.username === username;

  useEffect(() => {
    setLoading(true); setTab("posts");
    profileAPI.getProfile(username)
      .then(p => {
        setProfile(p); setIsFollowing(p.is_following);
        setEditForm({ name: p.name, bio: p.bio||"", grade: p.grade||"",
                      school: p.school||"", exam_target: p.exam_target||"",
                      study_status: p.study_status||"" });
      })
      .catch(() => navigate("/"))
      .finally(() => setLoading(false));
  }, [username]);

  useEffect(() => {
    if (!profile) return;
    profileAPI.getUserPosts(username, { page: 1, limit: 12 }).then(r => {
      setPosts(r.posts || []); setHasMore(r.has_more); setPostsPage(1);
    }).catch(() => {});
  }, [profile?.id]);

  const loadMorePosts = async () => {
    const r = await profileAPI.getUserPosts(username, { page: postsPage + 1, limit: 12 });
    setPosts(prev => [...prev, ...(r.posts||[])]);
    setHasMore(r.has_more); setPostsPage(p => p + 1);
  };

  const handleFollow = async () => {
    if (followLoading) return;
    setFollowLoading(true);
    try {
      const r = await authAPI.follow(profile.id);
      setIsFollowing(r.following);
      setProfile(p => ({ ...p, followers_count: r.following ? p.followers_count + 1 : p.followers_count - 1 }));
    } finally { setFollowLoading(false); }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const r = await authAPI.uploadAvatar(file);
    setProfile(p => ({ ...p, avatar_url: r.avatar_url }));
    updateUser({ avatar_url: r.avatar_url });
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const r = await authAPI.uploadCover(file);
    setProfile(p => ({ ...p, cover_url: r.cover_url }));
  };

  const saveEdit = async () => {
    const r = await authAPI.updateMe(editForm);
    setProfile(p => ({ ...p, ...r })); updateUser(r); setEditMode(false);
  };

  const deletePost = async (postId) => {
    if (!confirm("Delete this post?")) return;
    await feedAPI.deletePost(postId);
    setPosts(prev => prev.filter(p => p.id !== postId));
    setProfile(p => ({ ...p, posts_count: p.posts_count - 1 }));
  };

  const addCountdown = async () => {
    if (!countdown.exam_name || !countdown.exam_date) return;
    const r = await profileAPI.addCountdown(countdown);
    setProfile(p => ({ ...p, exam_countdowns: [...(p.exam_countdowns||[]), r] }));
    setCountdown({ exam_name: "", exam_date: "" });
  };

  const deleteCountdown = async (id) => {
    await profileAPI.deleteCountdown(id);
    setProfile(p => ({ ...p, exam_countdowns: p.exam_countdowns.filter(c => c.id !== id) }));
  };

  // ── Loading state ────────────────────────────────────────
  if (loading) return (
    <div className="profile-loading">
      <div className="skeleton cover-skel" />
      <div className="skeleton avatar-skel" />
      <div className="skeleton name-skel" />
      <div className="skeleton line-skel" />
    </div>
  );
  if (!profile) return null;

  const avatar = profile.avatar_url ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${profile.name}&backgroundColor=0a7ea4,7c3aed,059669,dc2626`;

  return (
    <div className="profile-page">

      {/* COVER */}
      <div className="profile-cover"
           style={profile.cover_url ? { backgroundImage: `url(${profile.cover_url})` } : {}}>
        <div className="cover-overlay" />
        {isMe && (
          <>
            <button className="cover-edit-btn" onClick={() => fileCoverRef.current.click()}>📷 Edit cover</button>
            <input ref={fileCoverRef} type="file" accept="image/*" hidden onChange={handleCoverUpload} />
          </>
        )}
      </div>

      {/* HEADER */}
      <div className="profile-header-card">
        <div className="profile-avatar-wrap">
          <img src={avatar} alt={profile.name} className="profile-avatar-img" />
          {isMe && (
            <>
              <button className="avatar-edit-btn" onClick={() => fileAvatarRef.current.click()}>✏️</button>
              <input ref={fileAvatarRef} type="file" accept="image/*" hidden onChange={handleAvatarUpload} />
            </>
          )}
        </div>

        <div className="profile-identity">
          {editMode ? (
            <input className="edit-name-input" value={editForm.name}
                   onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
          ) : (
            <h1 className="profile-name">
              {profile.name}
              {profile.is_verified && <span className="verified-badge">✓</span>}
              {profile.role === "mentor" && <span className="mentor-badge">Mentor</span>}
            </h1>
          )}
          <p className="profile-username">@{profile.username}</p>
          {editMode ? (
            <textarea className="edit-bio-input" value={editForm.bio} rows={2}
                      onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))}
                      placeholder="Write a bio…" />
          ) : (
            profile.bio && <p className="profile-bio">{profile.bio}</p>
          )}
          <div className="profile-meta-chips">
            {(editMode ? editForm.grade       : profile.grade)        && <span className="meta-chip">🎓 {editMode ? editForm.grade       : profile.grade}</span>}
            {(editMode ? editForm.exam_target : profile.exam_target)  && <span className="meta-chip">🎯 {editMode ? editForm.exam_target : profile.exam_target}</span>}
            {(editMode ? editForm.school      : profile.school)       && <span className="meta-chip">🏫 {editMode ? editForm.school      : profile.school}</span>}
            {(editMode ? editForm.study_status: profile.study_status) && <span className="meta-chip status">📚 {editMode ? editForm.study_status: profile.study_status}</span>}
          </div>
        </div>

        <div className="profile-actions-col">
          {isMe ? (
            editMode ? (
              <div className="edit-actions">
                <button className="btn-primary" onClick={saveEdit}>Save</button>
                <button className="btn-ghost" onClick={() => setEditMode(false)}>Cancel</button>
              </div>
            ) : (
              <button className="btn-outline" onClick={() => setEditMode(true)}>✏️ Edit Profile</button>
            )
          ) : (
            <div className="visitor-actions">
              <button className={`btn-follow ${isFollowing?"following":""}`}
                      onClick={handleFollow} disabled={followLoading}>
                {isFollowing ? "✓ Following" : "+ Follow"}
              </button>
              <button className="btn-outline" onClick={() => navigate("/chat")}>💬 Message</button>
            </div>
          )}
        </div>
      </div>

      {/* EDIT EXTRA FIELDS */}
      {editMode && (
        <div className="edit-fields-row">
          {[["Grade (e.g. Class 12)","grade"],["Exam target","exam_target"],
            ["School / College","school"],["Study status","study_status"]].map(([ph,key]) => (
            <input key={key} placeholder={ph} value={editForm[key]}
                   onChange={e => setEditForm(f=>({...f,[key]:e.target.value}))} />
          ))}
        </div>
      )}

      {/* STATS ROW */}
      <div className="profile-stats-row">
        {[
          { label:"Posts",      value: profile.posts_count,     click: null },
          { label:"Followers",  value: profile.followers_count, click: () => setFollowModal("followers") },
          { label:"Following",  value: profile.following_count, click: () => setFollowModal("following") },
          { label:"Reputation", value: profile.reputation,      click: null },
          { label:"Points",     value: profile.help_points,     click: null },
          { label:"Streak",     value: `🔥 ${profile.streak||0}`,click: null },
        ].map(({ label, value, click }) => (
          <div key={label} className={`stat-item ${click?"clickable":""}`} onClick={click||undefined}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* TABS */}
      <div className="profile-tabs">
        {[["posts","📝 Posts"],["badges","🏅 Badges"],["countdowns","⏳ Exams"]].map(([t,label]) => (
          <button key={t} className={`profile-tab ${tab===t?"active":""}`} onClick={() => setTab(t)}>
            {label}
          </button>
        ))}
      </div>

      {/* TAB: POSTS */}
      {tab === "posts" && (
        <div className="profile-posts-grid">
          {posts.length === 0 && (
            <div className="empty-posts">
              <span>📭</span>
              <p>{isMe ? "You haven't posted yet." : "No posts yet."}</p>
              {isMe && <button className="btn-primary" onClick={() => navigate("/feed")}>Create first post</button>}
            </div>
          )}
          {posts.map(post => (
            <PostCard key={post.id} post={post} onDelete={deletePost} currentUserId={currentUser?.id} />
          ))}
          {hasMore && <button className="load-more-btn" onClick={loadMorePosts}>Load more</button>}
        </div>
      )}

      {/* TAB: BADGES */}
      {tab === "badges" && (
        <div className="badges-grid">
          {(profile.badges||[]).length === 0 && (
            <div className="empty-posts"><span>🏅</span><p>No badges yet — keep contributing!</p></div>
          )}
          {(profile.badges||[]).map(b => (
            <div key={b.id} className="badge-card">
              <span className="badge-icon">{b.icon}</span>
              <strong>{b.name}</strong>
              <p>{b.desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* TAB: COUNTDOWNS */}
      {tab === "countdowns" && (
        <div className="countdowns-section">
          {isMe && (
            <div className="add-countdown">
              <input placeholder="Exam name (e.g. JEE Mains)" value={countdown.exam_name}
                     onChange={e => setCountdown(c=>({...c,exam_name:e.target.value}))} />
              <input type="date" value={countdown.exam_date}
                     onChange={e => setCountdown(c=>({...c,exam_date:e.target.value}))} />
              <button className="btn-primary" onClick={addCountdown}>Add</button>
            </div>
          )}
          {(profile.exam_countdowns||[]).length === 0 && (
            <div className="empty-posts"><span>📅</span><p>No exam countdowns added yet.</p></div>
          )}
          {(profile.exam_countdowns||[]).map(c => {
            const days = daysUntil(c.exam_date);
            return (
              <div key={c.id} className={`countdown-card ${days<=30?"urgent":""}`}>
                <div className="countdown-info">
                  <strong>{c.exam_name}</strong>
                  <span>{new Date(c.exam_date).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</span>
                </div>
                <div className="countdown-days">
                  <span className="days-num">{days}</span>
                  <span>days left</span>
                </div>
                {isMe && (
                  <button className="delete-countdown" onClick={() => deleteCountdown(c.id)}>✕</button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {followModal && (
        <FollowersModal username={username} type={followModal} onClose={() => setFollowModal(null)} />
      )}

      <style>{`
        .profile-page { max-width:900px;margin:0 auto;padding-bottom:60px; }

        .profile-cover {
          height:240px;background:linear-gradient(135deg,var(--accent) 0%,#7c3aed 100%);
          background-size:cover;background-position:center;
          position:relative;border-radius:0 0 16px 16px;overflow:hidden;
        }
        .cover-overlay { position:absolute;inset:0;background:linear-gradient(to bottom,transparent 50%,rgba(0,0,0,.35)); }
        .cover-edit-btn {
          position:absolute;bottom:12px;right:12px;background:rgba(0,0,0,.55);color:#fff;
          border:none;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:.82rem;backdrop-filter:blur(4px);
        }

        .profile-header-card {
          display:flex;align-items:flex-start;gap:20px;padding:0 24px 20px;
          margin-top:-52px;position:relative;flex-wrap:wrap;
        }
        .profile-avatar-wrap { position:relative;flex-shrink:0; }
        .profile-avatar-img {
          width:112px;height:112px;border-radius:50%;border:4px solid var(--bg-card);
          object-fit:cover;background:var(--bg-elevated);display:block;
        }
        .avatar-edit-btn {
          position:absolute;bottom:4px;right:4px;background:var(--accent);border:none;
          border-radius:50%;width:28px;height:28px;cursor:pointer;font-size:.8rem;
        }
        .profile-identity { flex:1;min-width:200px;padding-top:58px; }
        .profile-name { font-size:1.45rem;font-weight:700;margin:0;display:flex;align-items:center;gap:8px; }
        .verified-badge { background:var(--accent);color:#fff;border-radius:50%;width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;font-size:.7rem; }
        .mentor-badge { background:#16a34a;color:#fff;font-size:.72rem;padding:2px 8px;border-radius:12px;font-weight:600; }
        .profile-username { color:var(--text-muted);margin:2px 0 8px;font-size:.92rem; }
        .profile-bio { font-size:.95rem;color:var(--text-secondary);margin:4px 0 10px;line-height:1.55; }
        .profile-meta-chips { display:flex;flex-wrap:wrap;gap:6px;margin-top:8px; }
        .meta-chip { background:var(--bg-elevated);padding:4px 10px;border-radius:20px;font-size:.8rem;color:var(--text-secondary); }
        .meta-chip.status { background:color-mix(in srgb,var(--accent) 15%,transparent);color:var(--accent); }

        .profile-actions-col { padding-top:68px; }
        .btn-follow { background:var(--accent);color:#fff;border:none;padding:9px 22px;border-radius:20px;font-weight:600;cursor:pointer;transition:.2s; }
        .btn-follow.following { background:var(--bg-elevated);color:var(--text-primary);border:1px solid var(--border); }
        .btn-outline { background:transparent;border:1px solid var(--border);color:var(--text-primary);padding:8px 18px;border-radius:20px;cursor:pointer;font-weight:500; }
        .visitor-actions { display:flex;gap:10px;flex-wrap:wrap; }
        .edit-actions { display:flex;gap:8px; }
        .btn-primary { background:var(--accent);color:#fff;border:none;padding:9px 20px;border-radius:10px;cursor:pointer;font-weight:600; }
        .btn-ghost { background:transparent;border:none;color:var(--text-muted);cursor:pointer;padding:8px 12px; }

        .edit-name-input,.edit-bio-input {
          width:100%;background:var(--bg-elevated);border:1px solid var(--accent);
          border-radius:8px;padding:5px 10px;color:var(--text-primary);font-weight:700;font-size:1.3rem;
        }
        .edit-bio-input { font-size:.95rem;font-weight:400;resize:none;margin-top:6px; }
        .edit-fields-row { display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:0 24px 16px; }
        .edit-fields-row input {
          background:var(--bg-elevated);border:1px solid var(--border);
          border-radius:8px;padding:9px 12px;color:var(--text-primary);font-size:.9rem;
        }

        .profile-stats-row { display:flex;border-top:1px solid var(--border);border-bottom:1px solid var(--border);margin:0 0 16px; }
        .stat-item { flex:1;display:flex;flex-direction:column;align-items:center;padding:14px 6px;gap:3px;border-right:1px solid var(--border); }
        .stat-item:last-child { border-right:none; }
        .stat-item strong { font-size:1.05rem;font-weight:700;color:var(--text-primary); }
        .stat-item span { font-size:.73rem;color:var(--text-muted); }
        .stat-item.clickable { cursor:pointer; }
        .stat-item.clickable:hover { background:var(--bg-elevated); }

        .profile-tabs { display:flex;border-bottom:2px solid var(--border);margin-bottom:20px;padding:0 8px; }
        .profile-tab { padding:10px 20px;border:none;background:none;cursor:pointer;color:var(--text-muted);font-weight:500;border-bottom:2px solid transparent;margin-bottom:-2px;transition:.15s; }
        .profile-tab.active { color:var(--accent);border-bottom-color:var(--accent); }

        .profile-posts-grid { padding:0 16px;display:flex;flex-direction:column;gap:16px; }
        .profile-post-card { background:var(--bg-card);border-radius:14px;overflow:hidden;border:1px solid var(--border); }
        .post-images { display:grid;gap:2px; }
        .post-images.count-1 { grid-template-columns:1fr; }
        .post-images.count-2 { grid-template-columns:1fr 1fr; }
        .post-images.count-3 { grid-template-columns:2fr 1fr;grid-template-rows:auto auto; }
        .post-images.count-3 img:first-child { grid-row:span 2; }
        .post-images.count-4 { grid-template-columns:1fr 1fr;grid-template-rows:auto auto; }
        .post-images img { width:100%;height:220px;object-fit:cover; }
        .post-content { padding:14px 16px 8px;margin:0;line-height:1.6;white-space:pre-wrap; }
        .post-tags { display:flex;flex-wrap:wrap;gap:4px;padding:0 16px 8px; }
        .tag { color:var(--accent);font-size:.82rem; }
        .post-actions { display:flex;align-items:center;gap:12px;padding:8px 16px 14px;border-top:1px solid var(--border); }
        .action-btn { background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:.9rem;padding:4px 8px;border-radius:8px; }
        .action-btn:hover { background:var(--bg-elevated); }
        .action-btn.liked { color:#e11d48; }
        .action-btn.danger:hover { color:#e11d48; }
        .post-time { margin-left:auto;font-size:.8rem;color:var(--text-muted); }

        .comments-section { padding:0 16px 12px;border-top:1px solid var(--border); }
        .comment { display:flex;gap:8px;align-items:flex-start;padding:7px 0; }
        .comment-avatar { width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0; }
        .comment-author { font-weight:600;font-size:.85rem; }
        .comment-text { font-size:.88rem; }
        .comment-form { display:flex;gap:8px;margin-top:8px; }
        .comment-form input { flex:1;background:var(--bg-elevated);border:1px solid var(--border);border-radius:20px;padding:7px 14px;color:var(--text-primary);font-size:.88rem; }
        .comment-form button { background:var(--accent);color:#fff;border:none;padding:7px 16px;border-radius:20px;cursor:pointer;font-size:.88rem; }

        .badges-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:16px;padding:0 16px; }
        .badge-card { background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:20px 16px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:8px; }
        .badge-icon { font-size:2.2rem; }
        .badge-card strong { font-size:.9rem; }
        .badge-card p { font-size:.78rem;color:var(--text-muted);margin:0; }

        .countdowns-section { padding:0 16px;display:flex;flex-direction:column;gap:12px; }
        .add-countdown { display:flex;gap:10px;flex-wrap:wrap;margin-bottom:4px; }
        .add-countdown input { flex:1;min-width:140px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:10px;padding:9px 12px;color:var(--text-primary);font-size:.9rem; }
        .countdown-card { background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:16px 20px;display:flex;align-items:center;gap:16px; }
        .countdown-card.urgent { border-color:#f97316;background:rgba(249,115,22,.06); }
        .countdown-info { flex:1; }
        .countdown-info strong { display:block;font-size:1rem;margin-bottom:3px; }
        .countdown-info span { font-size:.85rem;color:var(--text-muted); }
        .countdown-days { text-align:center;background:var(--bg-elevated);border-radius:12px;padding:10px 18px; }
        .days-num { display:block;font-size:1.6rem;font-weight:800;color:var(--accent);line-height:1; }
        .countdown-days span { font-size:.72rem;color:var(--text-muted); }
        .delete-countdown { background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:1rem;padding:4px 8px;border-radius:6px; }
        .delete-countdown:hover { color:#e11d48; }

        .modal-backdrop { position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px; }
        .modal-box { background:var(--bg-card);border-radius:16px;width:100%;max-width:400px;max-height:80vh;display:flex;flex-direction:column;overflow:hidden; }
        .modal-header { display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid var(--border); }
        .modal-header h3 { margin:0;font-size:1.05rem; }
        .modal-header button { background:none;border:none;cursor:pointer;font-size:1.2rem;color:var(--text-muted); }
        .modal-list { overflow-y:auto;padding:8px; }
        .modal-user { display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;text-decoration:none;color:var(--text-primary); }
        .modal-user:hover { background:var(--bg-elevated); }
        .modal-user img { width:40px;height:40px;border-radius:50%;object-fit:cover; }
        .modal-user strong { display:block;font-size:.9rem; }
        .modal-user span { font-size:.8rem;color:var(--text-muted); }
        .following-badge { margin-left:auto;background:color-mix(in srgb,var(--accent) 15%,transparent);color:var(--accent);font-size:.75rem;padding:2px 8px;border-radius:12px; }

        .empty-posts { display:flex;flex-direction:column;align-items:center;padding:40px;gap:12px;color:var(--text-muted); }
        .empty-posts span { font-size:2.5rem; }
        .empty-state { text-align:center;color:var(--text-muted);padding:20px; }
        .load-more-btn { width:100%;padding:12px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:10px;cursor:pointer;color:var(--text-secondary); }

        .profile-loading { max-width:900px;margin:0 auto; }
        .skeleton { background:var(--bg-elevated);border-radius:8px;animation:shimmer 1.5s infinite ease-in-out; }
        @keyframes shimmer { 0%,100%{opacity:.5} 50%{opacity:1} }
        .cover-skel { height:240px;border-radius:0 0 16px 16px;display:block; }
        .avatar-skel { width:112px;height:112px;border-radius:50%;margin:-56px 0 0 24px;display:block; }
        .name-skel { height:26px;width:180px;margin:16px 24px 8px;display:block; }
        .line-skel { height:15px;width:280px;margin:0 24px;display:block; }

        @media(max-width:600px) {
          .profile-header-card { flex-direction:column;align-items:center;text-align:center; }
          .profile-actions-col { padding-top:0;width:100%;display:flex;justify-content:center; }
          .edit-fields-row { grid-template-columns:1fr; }
          .stat-item { min-width:30%;font-size:.85rem; }
          .profile-stats-row { flex-wrap:wrap; }
        }
      `}</style>
    </div>
  );
}
