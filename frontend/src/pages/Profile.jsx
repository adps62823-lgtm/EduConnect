import { useEffect, useMemo, useRef, useState } from "react";
import { Heart, MessageCircle, Star, Trash2, Pencil} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { authAPI, feedAPI, profileAPI } from "../api";
import { useAuthStore } from "../store/authStore";

const ago = (iso) => {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const daysUntil = (dateStr) => Math.max(0, Math.ceil((new Date(dateStr) - new Date()) / 86400000));

function PostCard({ post, onDelete }) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [liked, setLiked] = useState(post.is_liked);
  const [likeCount, setLikeCount] = useState(post.likes_count || 0);
  const [commentCount, setCommentCount] = useState(post.comments_count || 0);

  const toggleLike = async () => {
    try {
      const result = await feedAPI.likePost(post.id);
      setLiked(result.liked);
      setLikeCount(result.likes_count);
    } catch {}
  };

  const loadComments = async () => {
    if (!showComments) {
      try {
        const result = await feedAPI.getComments(post.id);
        setComments(result.comments || []);
      } catch {}
    }
    setShowComments((value) => !value);
  };

  const submitComment = async (event) => {
    event.preventDefault();
    if (!newComment.trim()) return;

    try {
      const created = await feedAPI.addComment(post.id, { content: newComment.trim() });
      setComments((items) => [...items, created]);
      setCommentCount((count) => count + 1);
      setNewComment("");
    } catch {}
  };

  return (
    <div className="profile-post-card">
      {post.images?.length > 0 && (
        <div className={`post-images count-${Math.min(post.images.length, 4)}`}>
          {post.images.slice(0, 4).map((img, index) => (
            <img key={index} src={img} alt="" />
          ))}
        </div>
      )}

      {post.content && <p className="post-content">{post.content}</p>}

      {post.tags?.length > 0 && (
        <div className="post-tags">
          {post.tags.map((tag) => (
            <span key={tag} className="tag">#{tag}</span>
          ))}
        </div>
      )}

      <div className="post-actions">
        <button className={`action-btn ${liked ? "liked" : ""}`} onClick={toggleLike}>
          <Heart size={20} fill={liked ? "var(--red)" : "none"} />
          {likeCount > 0 && likeCount}
        </button>

        <button className="action-btn" onClick={loadComments}>
          <MessageCircle size={20} /> {commentCount}
        </button>

        {post.is_mine && (
          <button className="action-btn danger" onClick={() => onDelete(post.id)}>
            <Trash2 size={20} />
          </button>
        )}

        <span className="post-time">{ago(post.created_at)}</span>
      </div>

      {showComments && (
        <div className="comments-section">
          {comments.map((comment) => (
            <div key={comment.id} className="comment">
              <img
                src={comment.author?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${comment.author?.name}`}
                alt=""
                className="comment-avatar"
              />
              <div>
                <span className="comment-author">{comment.author?.name}</span>
                <span className="comment-text"> {comment.content}</span>
              </div>
            </div>
          ))}

          <form onSubmit={submitComment} className="comment-form">
            <input
              value={newComment}
              onChange={(event) => setNewComment(event.target.value)}
              placeholder="Write a comment..."
            />
            <button type="submit">Send</button>
          </form>
        </div>
      )}
    </div>
  );
}

function FollowersModal({ username, type, onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadUsers() {
      setLoading(true);
      try {
        const fn = type === "followers" ? profileAPI.getFollowers : profileAPI.getFollowing;
        const result = await fn(username);
        if (!cancelled) {
          setUsers(Array.isArray(result) ? result : []);
        }
      } catch {
        if (!cancelled) {
          setUsers([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadUsers();

    return () => {
      cancelled = true;
    };
  }, [type, username]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3>{type === "followers" ? "Followers" : "Following"}</h3>
          <button onClick={onClose}>x</button>
        </div>

        <div className="modal-list">
          {loading && <p className="empty-state">Loading...</p>}

          {!loading && users.map((user) => (
            <Link key={user.id} to={`/profile/${user.username}`} onClick={onClose} className="modal-user">
              <img src={user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`} alt="" />
              <div>
                <strong>{user.name}</strong>
                <span>@{user.username}</span>
              </div>
              {user.is_following && <span className="following-badge">Following</span>}
            </Link>
          ))}

          {!loading && users.length === 0 && <p className="empty-state">No {type} yet.</p>}
        </div>
      </div>
    </div>
  );
}

export default function Profile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, updateUser } = useAuthStore();
  const fileAvatarRef = useRef();
  const fileCoverRef = useRef();

  const profileUsername = username || currentUser?.username || "";
  const isMe = Boolean(profileUsername) && currentUser?.username === profileUsername;

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState("posts");
  const [followModal, setFollowModal] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isCloseFriend, setIsCloseFriend] = useState(false);
  const [closeFriendLoading, setCloseFriendLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [countdown, setCountdown] = useState({ exam_name: "", exam_date: "" });
  const [hasMore, setHasMore] = useState(false);
  const [postsPage, setPostsPage] = useState(1);

  const avatar = useMemo(() => {
    if (!profile) return "";
    return profile.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${profile.name}&backgroundColor=0a7ea4,7c3aed,059669,dc2626`;
  }, [profile]);

  useEffect(() => {
    if (!profileUsername) return;

    let cancelled = false;

    async function loadProfile() {
      setLoading(true);
      setNotFound(false);
      setTab("posts");
      setEditMode(false);

      try {
        const nextProfile = await profileAPI.getProfile(profileUsername);
        if (cancelled) return;

        setProfile(nextProfile);
        setIsFollowing(Boolean(nextProfile.is_following));
        setEditForm({
          name: nextProfile.name || "",
          bio: nextProfile.bio || "",
          grade: nextProfile.grade || "",
          school: nextProfile.school || "",
          exam_target: nextProfile.exam_target || "",
          study_status: nextProfile.study_status || "",
        });

        if (currentUser?.id && nextProfile.id !== currentUser.id) {
          try {
            const closeFriends = await authAPI.getCloseFriends();
            if (!cancelled) {
              setIsCloseFriend((Array.isArray(closeFriends) ? closeFriends : []).some((user) => user.id === nextProfile.id));
            }
          } catch {
            if (!cancelled) {
              setIsCloseFriend(false);
            }
          }
        } else if (!cancelled) {
          setIsCloseFriend(false);
        }
      } catch {
        if (!cancelled) {
          setProfile(null);
          setNotFound(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [profileUsername, currentUser?.id]);

  useEffect(() => {
    if (!profileUsername || !profile) return;

    let cancelled = false;

    async function loadPosts() {
      try {
        const result = await profileAPI.getUserPosts(profileUsername, { page: 1, limit: 12 });
        if (cancelled) return;
        setPosts(result.posts || []);
        setHasMore(Boolean(result.has_more));
        setPostsPage(1);
      } catch {
        if (!cancelled) {
          setPosts([]);
          setHasMore(false);
        }
      }
    }

    loadPosts();

    return () => {
      cancelled = true;
    };
  }, [profileUsername, profile?.id]);

  const loadMorePosts = async () => {
    const nextPage = postsPage + 1;
    const result = await profileAPI.getUserPosts(profileUsername, { page: nextPage, limit: 12 });
    setPosts((items) => [...items, ...(result.posts || [])]);
    setHasMore(Boolean(result.has_more));
    setPostsPage(nextPage);
  };

  const handleFollow = async () => {
    if (!profile || followLoading) return;

    setFollowLoading(true);
    try {
      const result = await authAPI.follow(profile.id);
      setIsFollowing(result.following);
      setProfile((value) => value ? {
        ...value,
        followers_count: Math.max(0, (value.followers_count || 0) + (result.following ? 1 : -1)),
      } : value);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleCloseFriend = async () => {
    if (!profile || isMe || closeFriendLoading) return;

    setCloseFriendLoading(true);
    try {
      const result = await authAPI.toggleCloseFriend(profile.id);
      setIsCloseFriend(Boolean(result.is_close_friend));
    } finally {
      setCloseFriendLoading(false);
    }
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const result = await authAPI.uploadAvatar(file);
    setProfile((value) => value ? { ...value, avatar_url: result.avatar_url } : value);
    updateUser({ avatar_url: result.avatar_url });
  };

  const handleCoverUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const result = await authAPI.uploadCover(file);
    setProfile((value) => value ? { ...value, cover_url: result.cover_url } : value);
  };

  const saveEdit = async () => {
    const result = await authAPI.updateMe(editForm);
    setProfile((value) => value ? { ...value, ...result } : value);
    updateUser(result);
    setEditMode(false);
  };

  const deletePost = async (postId) => {
    if (!window.confirm("Delete this post?")) return;

    await feedAPI.deletePost(postId);
    setPosts((items) => items.filter((post) => post.id !== postId));
    setProfile((value) => value ? { ...value, posts_count: Math.max(0, (value.posts_count || 0) - 1) } : value);
  };

  const addCountdown = async () => {
    if (!countdown.exam_name || !countdown.exam_date) return;
    const result = await profileAPI.addCountdown(countdown);
    setProfile((value) => value ? {
      ...value,
      exam_countdowns: [...(value.exam_countdowns || []), result],
    } : value);
    setCountdown({ exam_name: "", exam_date: "" });
  };

  const deleteCountdown = async (id) => {
    await profileAPI.deleteCountdown(id);
    setProfile((value) => value ? {
      ...value,
      exam_countdowns: (value.exam_countdowns || []).filter((item) => item.id !== id),
    } : value);
  };

  if (!profileUsername || loading) {
    return (
      <div className="profile-loading">
        <div className="skeleton cover-skel" />
        <div className="skeleton avatar-skel" />
        <div className="skeleton name-skel" />
        <div className="skeleton line-skel" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="profile-page">
        <div className="empty-posts">
          <span>Profile</span>
          <p>We could not find that profile.</p>
          <button className="btn-primary" onClick={() => navigate("/feed")}>Go to feed</button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div
        className="profile-cover"
        style={profile.cover_url ? { backgroundImage: `url(${profile.cover_url})` } : {}}
      >
        <div className="cover-overlay" />
        {isMe && (
          <>
            <button className="cover-edit-btn" onClick={() => fileCoverRef.current?.click()}>Edit cover</button>
            <input ref={fileCoverRef} type="file" accept="image/*" hidden onChange={handleCoverUpload} />
          </>
        )}
      </div>

      <div className="profile-header-card">
        <div className="profile-avatar-wrap">
          <img src={avatar} alt={profile.name} className="profile-avatar-img" />
          {isMe && (
            <>
              <Pencil size={5} className="avatar-edit-btn" onClick={() => fileAvatarRef.current?.click()}>Edit</Pencil>
              <input ref={fileAvatarRef} type="file" accept="image/*" hidden onChange={handleAvatarUpload} />
            </>
          )}
        </div>

        <div className="profile-identity">
          {editMode ? (
            <input
              className="edit-name-input"
              value={editForm.name}
              onChange={(event) => setEditForm((value) => ({ ...value, name: event.target.value }))}
            />
          ) : (
            <h1 className="profile-name">
              {profile.name}
              {profile.is_verified && <span className="verified-badge">✓</span>}
              {profile.role === "mentor" && <span className="mentor-badge">Mentor</span>}
            </h1>
          )}

          <p className="profile-username">@{profile.username}</p>

          {editMode ? (
            <textarea
              className="edit-bio-input"
              value={editForm.bio}
              rows={2}
              onChange={(event) => setEditForm((value) => ({ ...value, bio: event.target.value }))}
              placeholder="Write a bio..."
            />
          ) : (
            profile.bio && <p className="profile-bio">{profile.bio}</p>
          )}

          <div className="profile-meta-chips">
            {(editMode ? editForm.grade : profile.grade) && <span className="meta-chip">Grade: {editMode ? editForm.grade : profile.grade}</span>}
            {(editMode ? editForm.exam_target : profile.exam_target) && <span className="meta-chip">Target: {editMode ? editForm.exam_target : profile.exam_target}</span>}
            {(editMode ? editForm.school : profile.school) && <span className="meta-chip">School: {editMode ? editForm.school : profile.school}</span>}
            {(editMode ? editForm.study_status : profile.study_status) && <span className="meta-chip status">Status: {editMode ? editForm.study_status : profile.study_status}</span>}
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
              <button className="btn-outline" onClick={() => setEditMode(true)}>Edit Profile</button>
            )
          ) : (
            <div className="visitor-actions">
              <button className={`btn-follow ${isFollowing ? "following" : ""}`} onClick={handleFollow} disabled={followLoading}>
                {isFollowing ? "Following" : "Follow"}
              </button>
              <button className={`btn-outline ${isCloseFriend ? "btn-outline-active" : ""}`} onClick={handleCloseFriend} disabled={closeFriendLoading}>
                <Star size={15} />
                {isCloseFriend ? "Close Friend" : "Add Close Friend"}
              </button>
              <button
                className="btn-outline"
                onClick={() => navigate("/chat", { state: { openDMWith: profile.id } })}
              >
                Message
              </button>
            </div>
          )}
        </div>
      </div>

      {editMode && (
        <div className="edit-fields-row">
          {[["Grade (e.g. Class 12)", "grade"], ["Exam target", "exam_target"], ["School / College", "school"], ["Study status", "study_status"]].map(([placeholder, key]) => (
            <input
              key={key}
              placeholder={placeholder}
              value={editForm[key] || ""}
              onChange={(event) => setEditForm((value) => ({ ...value, [key]: event.target.value }))}
            />
          ))}
        </div>
      )}

      <div className="profile-stats-row">
        {[
          { label: "Posts", value: profile.posts_count, click: null },
          { label: "Followers", value: profile.followers_count, click: () => setFollowModal("followers") },
          { label: "Following", value: profile.following_count, click: () => setFollowModal("following") },
          { label: "Reputation", value: profile.reputation, click: null },
          { label: "Points", value: profile.help_points, click: null },
          { label: "Streak", value: profile.streak || 0, click: null },
        ].map(({ label, value, click }) => (
          <div key={label} className={`stat-item ${click ? "clickable" : ""}`} onClick={click || undefined}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <div className="profile-tabs">
        {[["posts", "Posts"], ["badges", "Badges"], ["countdowns", "Exams"]].map(([value, label]) => (
          <button key={value} className={`profile-tab ${tab === value ? "active" : ""}`} onClick={() => setTab(value)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "posts" && (
        <div className="profile-posts-grid">
          {posts.length === 0 && (
            <div className="empty-posts">
              <span>Posts</span>
              <p>{isMe ? "You have not posted yet." : "No posts yet."}</p>
              {isMe && <button className="btn-primary" onClick={() => navigate("/feed")}>Create first post</button>}
            </div>
          )}

          {posts.map((post) => (
            <PostCard key={post.id} post={post} onDelete={deletePost} />
          ))}

          {hasMore && <button className="load-more-btn" onClick={loadMorePosts}>Load more</button>}
        </div>
      )}

      {tab === "badges" && (
        <div className="badges-grid">
          {(profile.badges || []).length === 0 && (
            <div className="empty-posts">
              <span>Badges</span>
              <p>No badges yet. Keep contributing.</p>
            </div>
          )}

          {(profile.badges || []).map((badge) => (
            <div key={badge.id} className="badge-card">
              <span className="badge-icon">{badge.icon}</span>
              <strong>{badge.name}</strong>
              <p>{badge.desc}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "countdowns" && (
        <div className="countdowns-section">
          {isMe && (
            <div className="add-countdown">
              <input
                placeholder="Exam name (e.g. JEE Mains)"
                value={countdown.exam_name}
                onChange={(event) => setCountdown((value) => ({ ...value, exam_name: event.target.value }))}
              />
              <input
                type="date"
                value={countdown.exam_date}
                onChange={(event) => setCountdown((value) => ({ ...value, exam_date: event.target.value }))}
              />
              <button className="btn-primary" onClick={addCountdown}>Add</button>
            </div>
          )}

          {(profile.exam_countdowns || []).length === 0 && (
            <div className="empty-posts">
              <span>Exams</span>
              <p>No exam countdowns added yet.</p>
            </div>
          )}

          {(profile.exam_countdowns || []).map((item) => {
            const days = daysUntil(item.exam_date);
            return (
              <div key={item.id} className={`countdown-card ${days <= 30 ? "urgent" : ""}`}>
                <div className="countdown-info">
                  <strong>{item.exam_name}</strong>
                  <span>{new Date(item.exam_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                </div>
                <div className="countdown-days">
                  <span className="days-num">{days}</span>
                  <span>days left</span>
                </div>
                {isMe && (
                  <button className="delete-countdown" onClick={() => deleteCountdown(item.id)}>x</button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {followModal && (
        <FollowersModal username={profileUsername} type={followModal} onClose={() => setFollowModal(null)} />
      )}

      <style>{`
        .profile-page { max-width: 900px; margin: 0 auto; padding-bottom: 60px; }

        .profile-cover {
          height: 240px;
          background: linear-gradient(135deg, var(--accent) 0%, #7c3aed 100%);
          background-size: cover;
          background-position: center;
          position: relative;
          border-radius: 0 0 16px 16px;
          overflow: hidden;
        }
        .cover-overlay { position: absolute; inset: 0; background: linear-gradient(to bottom, transparent 50%, rgba(0, 0, 0, 0.35)); }
        .cover-edit-btn {
          position: absolute;
          bottom: 12px;
          right: 12px;
          background: rgba(0, 0, 0, 0.55);
          color: #fff;
          border: none;
          padding: 6px 14px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.82rem;
          backdrop-filter: blur(4px);
        }

        .profile-header-card {
          display: flex;
          align-items: flex-start;
          gap: 20px;
          padding: 0 24px 20px;
          margin-top: -52px;
          position: relative;
          flex-wrap: wrap;
        }
        .profile-avatar-wrap { position: relative; flex-shrink: 0; }
        .profile-avatar-img {
          width: 112px;
          height: 112px;
          border-radius: 50%;
          border: 4px solid var(--bg-card);
          object-fit: cover;
          background: var(--bg-elevated);
          display: block;
        }
        .avatar-edit-btn {
          position: absolute;
          bottom: 4px;
          right: 4px;
          background: var(--accent);
          border: none;
          border-radius: 50%;
          width: 34px;
          height: 34px;
          cursor: pointer;
          font-size: 0.7rem;
          color: #fff;
          font-weight: 700;
        }
        .profile-identity { flex: 1; min-width: 220px; padding-top: 58px; }
        .profile-name { font-size: 1.45rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .verified-badge {
          background: var(--accent);
          color: #fff;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
        }
        .mentor-badge { background: #16a34a; color: #fff; font-size: 0.72rem; padding: 2px 8px; border-radius: 12px; font-weight: 600; }
        .profile-username { color: var(--text-muted); margin: 2px 0 8px; font-size: 0.92rem; }
        .profile-bio { font-size: 0.95rem; color: var(--text-secondary); margin: 4px 0 10px; line-height: 1.55; }
        .profile-meta-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .meta-chip { background: var(--bg-elevated); padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; color: var(--text-secondary); }
        .meta-chip.status { background: color-mix(in srgb, var(--accent) 15%, transparent); color: var(--accent); }

        .profile-actions-col { padding-top: 68px; }
        .btn-follow {
          background: var(--accent);
          color: #fff;
          border: none;
          padding: 9px 22px;
          border-radius: 20px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.2s;
        }
        .btn-follow.following { background: var(--bg-elevated); color: var(--text-primary); border: 1px solid var(--border); }
        .btn-outline {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text-primary);
          padding: 8px 18px;
          border-radius: 20px;
          cursor: pointer;
          font-weight: 500;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .btn-outline-active { border-color: var(--accent); color: var(--accent); background: color-mix(in srgb, var(--accent) 10%, transparent); }
        .visitor-actions { display: flex; gap: 10px; flex-wrap: wrap; }
        .edit-actions { display: flex; gap: 8px; }
        .btn-primary { background: var(--accent); color: #fff; border: none; padding: 9px 20px; border-radius: 10px; cursor: pointer; font-weight: 600; }
        .btn-ghost { background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 8px 12px; }

        .edit-name-input, .edit-bio-input {
          width: 100%;
          background: var(--bg-elevated);
          border: 1px solid var(--accent);
          border-radius: 8px;
          padding: 5px 10px;
          color: var(--text-primary);
          font-weight: 700;
          font-size: 1.3rem;
        }
        .edit-bio-input { font-size: 0.95rem; font-weight: 400; resize: none; margin-top: 6px; }
        .edit-fields-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 0 24px 16px; }
        .edit-fields-row input {
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 9px 12px;
          color: var(--text-primary);
          font-size: 0.9rem;
        }

        .profile-stats-row { display: flex; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); margin: 0 0 16px; }
        .stat-item { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 14px 6px; gap: 3px; border-right: 1px solid var(--border); }
        .stat-item:last-child { border-right: none; }
        .stat-item strong { font-size: 1.05rem; font-weight: 700; color: var(--text-primary); }
        .stat-item span { font-size: 0.73rem; color: var(--text-muted); }
        .stat-item.clickable { cursor: pointer; }
        .stat-item.clickable:hover { background: var(--bg-elevated); }

        .profile-tabs { display: flex; border-bottom: 2px solid var(--border); margin-bottom: 20px; padding: 0 8px; }
        .profile-tab { padding: 10px 20px; border: none; background: none; cursor: pointer; color: var(--text-muted); font-weight: 500; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: 0.15s; }
        .profile-tab.active { color: var(--accent); border-bottom-color: var(--accent); }

        .profile-posts-grid { padding: 0 16px; display: flex; flex-direction: column; gap: 16px; }
        .profile-post-card { background: var(--bg-card); border-radius: 14px; overflow: hidden; border: 1px solid var(--border); }
        .post-images { display: grid; gap: 2px; }
        .post-images.count-1 { grid-template-columns: 1fr; }
        .post-images.count-2 { grid-template-columns: 1fr 1fr; }
        .post-images.count-3 { grid-template-columns: 2fr 1fr; grid-template-rows: auto auto; }
        .post-images.count-3 img:first-child { grid-row: span 2; }
        .post-images.count-4 { grid-template-columns: 1fr 1fr; grid-template-rows: auto auto; }
        .post-images img { width: 100%; height: 220px; object-fit: cover; }
        .post-content { padding: 14px 16px 8px; margin: 0; line-height: 1.6; white-space: pre-wrap; }
        .post-tags { display: flex; flex-wrap: wrap; gap: 4px; padding: 0 16px 8px; }
        .tag { color: var(--accent); font-size: 0.82rem; }
        .post-actions { display: flex; align-items: center; gap: 12px; padding: 8px 16px 14px; border-top: 1px solid var(--border); }
        .action-btn { background: none; border: none; cursor: pointer; color: var(--text-muted); font-size: 0.9rem; padding: 4px 8px; border-radius: 8px; display: inline-flex; align-items: center; gap: 6px; }
        .action-btn:hover { background: var(--bg-elevated); }
        .action-btn.liked { color: #e11d48; }
        .action-btn.danger:hover { color: #e11d48; }
        .post-time { margin-left: auto; font-size: 0.8rem; color: var(--text-muted); }

        .comments-section { padding: 0 16px 12px; border-top: 1px solid var(--border); }
        .comment { display: flex; gap: 8px; align-items: flex-start; padding: 7px 0; }
        .comment-avatar { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
        .comment-author { font-weight: 600; font-size: 0.85rem; }
        .comment-text { font-size: 0.88rem; }
        .comment-form { display: flex; gap: 8px; margin-top: 8px; }
        .comment-form input { flex: 1; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 20px; padding: 7px 14px; color: var(--text-primary); font-size: 0.88rem; }
        .comment-form button { background: var(--accent); color: #fff; border: none; padding: 7px 16px; border-radius: 20px; cursor: pointer; font-size: 0.88rem; }

        .badges-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 16px; padding: 0 16px; }
        .badge-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px; padding: 20px 16px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .badge-icon { font-size: 2.2rem; }
        .badge-card strong { font-size: 0.9rem; }
        .badge-card p { font-size: 0.78rem; color: var(--text-muted); margin: 0; }

        .countdowns-section { padding: 0 16px; display: flex; flex-direction: column; gap: 12px; }
        .add-countdown { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 4px; }
        .add-countdown input { flex: 1; min-width: 140px; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 10px; padding: 9px 12px; color: var(--text-primary); font-size: 0.9rem; }
        .countdown-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px; padding: 16px 20px; display: flex; align-items: center; gap: 16px; }
        .countdown-card.urgent { border-color: #f97316; background: rgba(249, 115, 22, 0.06); }
        .countdown-info { flex: 1; }
        .countdown-info strong { display: block; font-size: 1rem; margin-bottom: 3px; }
        .countdown-info span { font-size: 0.85rem; color: var(--text-muted); }
        .countdown-days { text-align: center; background: var(--bg-elevated); border-radius: 12px; padding: 10px 18px; }
        .days-num { display: block; font-size: 1.6rem; font-weight: 800; color: var(--accent); line-height: 1; }
        .countdown-days span { font-size: 0.72rem; color: var(--text-muted); }
        .delete-countdown { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 1rem; padding: 4px 8px; border-radius: 6px; }
        .delete-countdown:hover { color: #e11d48; }

        .modal-backdrop { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.55); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal-box { background: var(--bg-card); border-radius: 16px; width: 100%; max-width: 400px; max-height: 80vh; display: flex; flex-direction: column; overflow: hidden; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border); }
        .modal-header h3 { margin: 0; font-size: 1.05rem; }
        .modal-header button { background: none; border: none; cursor: pointer; font-size: 1.2rem; color: var(--text-muted); }
        .modal-list { overflow-y: auto; padding: 8px; }
        .modal-user { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 10px; text-decoration: none; color: var(--text-primary); }
        .modal-user:hover { background: var(--bg-elevated); }
        .modal-user img { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; }
        .modal-user strong { display: block; font-size: 0.9rem; }
        .modal-user span { font-size: 0.8rem; color: var(--text-muted); }
        .following-badge { margin-left: auto; background: color-mix(in srgb, var(--accent) 15%, transparent); color: var(--accent); font-size: 0.75rem; padding: 2px 8px; border-radius: 12px; }

        .empty-posts { display: flex; flex-direction: column; align-items: center; padding: 40px; gap: 12px; color: var(--text-muted); text-align: center; }
        .empty-posts span { font-size: 2rem; font-weight: 700; color: var(--text-primary); }
        .empty-state { text-align: center; color: var(--text-muted); padding: 20px; }
        .load-more-btn { width: 100%; padding: 12px; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 10px; cursor: pointer; color: var(--text-secondary); }

        .profile-loading { max-width: 900px; margin: 0 auto; }
        .skeleton { background: var(--bg-elevated); border-radius: 8px; animation: shimmer 1.5s infinite ease-in-out; }
        @keyframes shimmer { 0%, 100% { opacity: 0.5 } 50% { opacity: 1 } }
        .cover-skel { height: 240px; border-radius: 0 0 16px 16px; display: block; }
        .avatar-skel { width: 112px; height: 112px; border-radius: 50%; margin: -56px 0 0 24px; display: block; }
        .name-skel { height: 26px; width: 180px; margin: 16px 24px 8px; display: block; }
        .line-skel { height: 15px; width: 280px; margin: 0 24px; display: block; }

        @media (max-width: 600px) {
          .profile-header-card { flex-direction: column; align-items: center; text-align: center; }
          .profile-actions-col { padding-top: 0; width: 100%; display: flex; justify-content: center; }
          .edit-fields-row { grid-template-columns: 1fr; }
          .stat-item { min-width: 30%; font-size: 0.85rem; }
          .profile-stats-row { flex-wrap: wrap; }
          .visitor-actions { justify-content: center; }
        }
      `}</style>
    </div>
  );
}
