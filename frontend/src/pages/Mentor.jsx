import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { mentorAPI, authAPI } from "../api";
import { useAuthStore } from "../store/authStore";

// ── helpers ───────────────────────────────────────────────
const SUBJECTS = ["Mathematics","Physics","Chemistry","Biology","English","History",
                  "Geography","Economics","Computer Science","Accountancy"];
const EXAMS    = ["JEE Mains","JEE Advanced","NEET","UPSC","CAT","GATE",
                  "CUET","Class 10 Boards","Class 12 Boards","SAT","GRE","GMAT"];

function StarRating({ value = 0, max = 5, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="star-rating">
      {Array.from({ length: max }, (_, i) => i + 1).map(star => (
        <span key={star}
          className={`star ${star <= (hovered || value) ? "filled" : ""}`}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => onChange && setHovered(star)}
          onMouseLeave={() => onChange && setHovered(0)}
        >★</span>
      ))}
      {value > 0 && <span className="rating-num">{value.toFixed(1)}</span>}
    </div>
  );
}

// ── Mentor Card ───────────────────────────────────────────
function MentorCard({ mentor, onConnect, currentUserId }) {
  const navigate = useNavigate();
  const statusColor = { accepted: "#16a34a", pending: "#f59e0b", rejected: "#e11d48" };
  const statusLabel = { accepted: "✓ Connected", pending: "⏳ Pending", rejected: "✗ Rejected" };

  return (
    <div className="mentor-card">
      <div className="mentor-card-top">
        <img
          src={mentor.user?.avatar_url ||
            `https://api.dicebear.com/7.x/initials/svg?seed=${mentor.user?.name}&backgroundColor=0a7ea4,7c3aed,059669`}
          alt={mentor.user?.name}
          className="mentor-avatar"
          onClick={() => navigate(`/profile/${mentor.user?.username}`)}
        />
        <div className="mentor-info">
          <h3 onClick={() => navigate(`/profile/${mentor.user?.username}`)}>
            {mentor.user?.name}
          </h3>
          <p className="mentor-handle">@{mentor.user?.username}</p>
          {mentor.user?.grade  && <span className="mentor-chip">🎓 {mentor.user.grade}</span>}
          {mentor.user?.school && <span className="mentor-chip">🏫 {mentor.user.school}</span>}
        </div>
        <div className="mentor-rating-col">
          <StarRating value={mentor.avg_rating} />
          <span className="review-count">{mentor.reviews_count} review{mentor.reviews_count !== 1 ? "s" : ""}</span>
          {mentor.hourly_rate > 0
            ? <span className="rate-badge">₹{mentor.hourly_rate}/hr</span>
            : <span className="rate-badge free">Free</span>}
        </div>
      </div>

      <p className="mentor-bio">{mentor.bio}</p>

      <div className="mentor-tags">
        {mentor.subjects?.map(s => <span key={s} className="subject-tag">{s}</span>)}
        {mentor.exams?.map(e => <span key={e} className="exam-tag">{e}</span>)}
      </div>

      {mentor.achievements && (
        <p className="mentor-achievements">🏆 {mentor.achievements}</p>
      )}
      {mentor.availability && (
        <p className="mentor-availability">🕐 {mentor.availability}</p>
      )}

      <div className="mentor-card-footer">
        {mentor.is_mine ? (
          <span className="my-profile-badge">Your mentor profile</span>
        ) : mentor.connection_status ? (
          <span className="conn-status" style={{ color: statusColor[mentor.connection_status] }}>
            {statusLabel[mentor.connection_status]}
          </span>
        ) : (
          <button className="btn-connect" onClick={() => onConnect(mentor.id)}>
            + Connect
          </button>
        )}
        <button className="btn-view" onClick={() => navigate(`/mentor/${mentor.id}`)}>
          View Profile →
        </button>
      </div>
    </div>
  );
}

// ── Create Mentor Profile Modal ───────────────────────────
function CreateProfileModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    bio: "", achievements: "", availability: "", hourly_rate: 0,
    subjects: [], exams: [],
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const toggleItem = (key, val) =>
    setForm(f => ({
      ...f,
      [key]: f[key].includes(val) ? f[key].filter(x => x !== val) : [...f[key], val]
    }));

  const submit = async () => {
    if (!form.bio.trim())          return setError("Bio is required.");
    if (form.subjects.length === 0) return setError("Select at least one subject.");
    if (form.exams.length === 0)    return setError("Select at least one exam.");
    setLoading(true);
    try {
      const r = await mentorAPI.createProfile(form);
      onCreated(r.data);
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to create profile.");
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box wide" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>🎓 Become a Mentor</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <label>Bio <span className="req">*</span></label>
          <textarea rows={3} placeholder="Tell students about your experience…"
                    value={form.bio} onChange={e => setForm(f=>({...f,bio:e.target.value}))} />

          <label>Achievements</label>
          <input placeholder="e.g. AIR 142 JEE 2023, 99 percentile CAT"
                 value={form.achievements}
                 onChange={e => setForm(f=>({...f,achievements:e.target.value}))} />

          <label>Availability</label>
          <input placeholder="e.g. Weekdays 6–9 PM, Weekends all day"
                 value={form.availability}
                 onChange={e => setForm(f=>({...f,availability:e.target.value}))} />

          <label>Hourly Rate (₹) — 0 = Free</label>
          <input type="number" min={0} value={form.hourly_rate}
                 onChange={e => setForm(f=>({...f,hourly_rate:+e.target.value}))} />

          <label>Subjects <span className="req">*</span></label>
          <div className="chip-picker">
            {SUBJECTS.map(s => (
              <span key={s} className={`chip ${form.subjects.includes(s)?"selected":""}`}
                    onClick={() => toggleItem("subjects", s)}>{s}</span>
            ))}
          </div>

          <label>Exams <span className="req">*</span></label>
          <div className="chip-picker">
            {EXAMS.map(e => (
              <span key={e} className={`chip ${form.exams.includes(e)?"selected":""}`}
                    onClick={() => toggleItem("exams", e)}>{e}</span>
            ))}
          </div>

          {error && <p className="form-error">{error}</p>}
          <button className="btn-primary full" onClick={submit} disabled={loading}>
            {loading ? "Creating…" : "Create Mentor Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Review Modal ──────────────────────────────────────────
function ReviewModal({ mentorId, onClose, onReviewed }) {
  const [rating,  setRating]  = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!rating)          return;
    if (!comment.trim())  return;
    setLoading(true);
    try {
      await mentorAPI.addReview(mentorId, { rating, comment });
      onReviewed();
      onClose();
    } catch (e) {
      alert(e.response?.data?.detail || "Could not submit review.");
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>⭐ Write a Review</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <label>Rating</label>
          <StarRating value={rating} onChange={setRating} />
          <label>Comment</label>
          <textarea rows={4} placeholder="Share your experience with this mentor…"
                    value={comment} onChange={e => setComment(e.target.value)} />
          <button className="btn-primary full" onClick={submit} disabled={loading || !rating}>
            {loading ? "Submitting…" : "Submit Review"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────
export default function Mentor() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [mentors,      setMentors]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [myProfile,    setMyProfile]    = useState(null);
  const [showCreate,   setShowCreate]   = useState(false);
  const [showReview,   setShowReview]   = useState(null); // mentor id
  const [filters,      setFilters]      = useState({ subject:"", exam:"", q:"" });
  const [page,         setPage]         = useState(1);
  const [hasMore,      setHasMore]      = useState(false);
  const [myConns,      setMyConns]      = useState([]);
  const [tab,          setTab]          = useState("discover"); // discover | my-connections | my-profile

  // Load mentors
  const loadMentors = async (p = 1, reset = false) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 12 };
      if (filters.subject) params.subject = filters.subject;
      if (filters.exam)    params.exam    = filters.exam;
      const r = await mentorAPI.listMentors(params);
      const list = r.data?.mentors || r.data || [];
      setMentors(prev => reset ? list : [...prev, ...list]);
      setHasMore(r.data?.has_more || false);
      setPage(p);
    } finally { setLoading(false); }
  };

  // Load my mentor profile if exists
  const loadMyProfile = async () => {
    try {
      const r = await mentorAPI.getMyProfile();
      setMyProfile(r.data);
    } catch { setMyProfile(null); }
  };

  // Load my connections
  const loadMyConns = async () => {
    try {
      const r = await mentorAPI.getMyConnections();
      setMyConns(r.data || []);
    } catch {}
  };

  useEffect(() => {
    loadMentors(1, true);
    loadMyProfile();
    loadMyConns();
  }, [filters.subject, filters.exam]);

  const handleConnect = async (mentorId) => {
    try {
      await mentorAPI.connect(mentorId);
      setMentors(prev => prev.map(m =>
        m.id === mentorId ? { ...m, connection_status: "pending" } : m
      ));
    } catch (e) {
      alert(e.response?.data?.detail || "Could not send request.");
    }
  };

  const handleRespond = async (connId, accept) => {
    try {
      await mentorAPI.respondConnection(connId, accept);
      loadMyConns();
      loadMentors(1, true);
    } catch {}
  };

  // Filter mentors client-side by search query
  const displayed = filters.q
    ? mentors.filter(m =>
        m.user?.name?.toLowerCase().includes(filters.q.toLowerCase()) ||
        m.bio?.toLowerCase().includes(filters.q.toLowerCase()) ||
        m.subjects?.some(s => s.toLowerCase().includes(filters.q.toLowerCase()))
      )
    : mentors;

  return (
    <div className="mentor-page">
      {/* ── HEADER ─────────────────────────────── */}
      <div className="mentor-header">
        <div>
          <h1>Find a Mentor</h1>
          <p>Connect with experienced students who've aced your target exam</p>
        </div>
        {!myProfile && (
          <button className="btn-become-mentor" onClick={() => setShowCreate(true)}>
            🎓 Become a Mentor
          </button>
        )}
      </div>

      {/* ── TABS ───────────────────────────────── */}
      <div className="mentor-tabs">
        {[["discover","🔍 Discover"],["my-connections","🤝 My Connections"],
          ...(myProfile ? [["my-profile","👤 My Profile"]] : [])
        ].map(([t,label]) => (
          <button key={t} className={`mentor-tab ${tab===t?"active":""}`} onClick={() => setTab(t)}>
            {label}
          </button>
        ))}
      </div>

      {/* ══ TAB: DISCOVER ══════════════════════ */}
      {tab === "discover" && (
        <>
          {/* Filters */}
          <div className="mentor-filters">
            <input
              className="search-input"
              placeholder="🔍 Search mentors, subjects…"
              value={filters.q}
              onChange={e => setFilters(f=>({...f,q:e.target.value}))}
            />
            <select value={filters.subject} onChange={e => setFilters(f=>({...f,subject:e.target.value}))}>
              <option value="">All Subjects</option>
              {SUBJECTS.map(s => <option key={s}>{s}</option>)}
            </select>
            <select value={filters.exam} onChange={e => setFilters(f=>({...f,exam:e.target.value}))}>
              <option value="">All Exams</option>
              {EXAMS.map(e => <option key={e}>{e}</option>)}
            </select>
            {(filters.subject || filters.exam || filters.q) && (
              <button className="clear-filters" onClick={() => setFilters({subject:"",exam:"",q:""})}>
                ✕ Clear
              </button>
            )}
          </div>

          {loading && mentors.length === 0 ? (
            <div className="mentor-grid">
              {[1,2,3,4,5,6].map(i => <div key={i} className="mentor-card skeleton-card" />)}
            </div>
          ) : displayed.length === 0 ? (
            <div className="empty-state">
              <span>🎓</span>
              <p>No mentors found. Try different filters.</p>
            </div>
          ) : (
            <>
              <div className="mentor-grid">
                {displayed.map(m => (
                  <MentorCard key={m.id} mentor={m} onConnect={handleConnect} currentUserId={user?.id} />
                ))}
              </div>
              {hasMore && (
                <button className="load-more" onClick={() => loadMentors(page + 1)}>
                  Load more mentors
                </button>
              )}
            </>
          )}
        </>
      )}

      {/* ══ TAB: MY CONNECTIONS ════════════════ */}
      {tab === "my-connections" && (
        <div className="connections-list">
          {myConns.length === 0 ? (
            <div className="empty-state">
              <span>🤝</span>
              <p>No connections yet. Find a mentor and send a request!</p>
              <button className="btn-primary" onClick={() => setTab("discover")}>Browse Mentors</button>
            </div>
          ) : myConns.map(conn => {
            const otherIsMe = conn.mentee_id === user?.id;
            const otherUser = otherIsMe ? null : null; // will show from mentor profile
            return (
              <div key={conn.id} className="conn-card">
                <div className="conn-info">
                  <strong>Connection #{conn.id.slice(0,8)}</strong>
                  <span className={`conn-badge ${conn.status}`}>{conn.status}</span>
                </div>
                <div className="conn-time">{new Date(conn.created_at).toLocaleDateString()}</div>
                {/* If I'm the mentor and status is pending → show Accept/Reject */}
                {conn.status === "pending" && !otherIsMe && (
                  <div className="conn-actions">
                    <button className="btn-accept" onClick={() => handleRespond(conn.id, true)}>✓ Accept</button>
                    <button className="btn-reject" onClick={() => handleRespond(conn.id, false)}>✗ Reject</button>
                  </div>
                )}
                {conn.status === "accepted" && (
                  <button className="btn-review" onClick={() => setShowReview(conn.mentor_id)}>
                    ⭐ Write Review
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ══ TAB: MY PROFILE ════════════════════ */}
      {tab === "my-profile" && myProfile && (
        <div className="my-mentor-profile">
          <div className="mp-hero">
            <img
              src={user?.avatar_url ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name}`}
              alt="" className="mp-avatar"
            />
            <div>
              <h2>{user?.name}</h2>
              <p>@{user?.username}</p>
              <StarRating value={myProfile.avg_rating} />
              <span className="review-count">{myProfile.reviews_count} reviews</span>
            </div>
            <div className="mp-stats">
              <div className="mp-stat">
                <strong>{myProfile.reviews_count}</strong>
                <span>Reviews</span>
              </div>
              <div className="mp-stat">
                <strong>{myProfile.avg_rating || "—"}</strong>
                <span>Avg Rating</span>
              </div>
              <div className="mp-stat">
                <strong>{myProfile.hourly_rate > 0 ? `₹${myProfile.hourly_rate}` : "Free"}</strong>
                <span>Rate</span>
              </div>
            </div>
          </div>

          <div className="mp-section">
            <h4>About</h4>
            <p>{myProfile.bio}</p>
          </div>
          {myProfile.achievements && (
            <div className="mp-section">
              <h4>🏆 Achievements</h4>
              <p>{myProfile.achievements}</p>
            </div>
          )}
          {myProfile.availability && (
            <div className="mp-section">
              <h4>🕐 Availability</h4>
              <p>{myProfile.availability}</p>
            </div>
          )}
          <div className="mp-section">
            <h4>Subjects</h4>
            <div className="mentor-tags">
              {myProfile.subjects?.map(s => <span key={s} className="subject-tag">{s}</span>)}
            </div>
          </div>
          <div className="mp-section">
            <h4>Target Exams</h4>
            <div className="mentor-tags">
              {myProfile.exams?.map(e => <span key={e} className="exam-tag">{e}</span>)}
            </div>
          </div>
        </div>
      )}

      {/* ── MODALS ─────────────────────────────── */}
      {showCreate && (
        <CreateProfileModal
          onClose={() => setShowCreate(false)}
          onCreated={(p) => { setMyProfile(p); setShowCreate(false); loadMentors(1, true); }}
        />
      )}
      {showReview && (
        <ReviewModal
          mentorId={showReview}
          onClose={() => setShowReview(null)}
          onReviewed={() => loadMentors(1, true)}
        />
      )}

      <style>{`
        .mentor-page { max-width:1000px;margin:0 auto;padding-bottom:60px; }

        .mentor-header {
          display:flex;justify-content:space-between;align-items:flex-start;
          padding:28px 16px 20px;flex-wrap:wrap;gap:12px;
        }
        .mentor-header h1 { margin:0;font-size:1.6rem;font-weight:800; }
        .mentor-header p  { margin:4px 0 0;color:var(--text-muted);font-size:.95rem; }
        .btn-become-mentor {
          background:linear-gradient(135deg,var(--accent),#7c3aed);color:#fff;
          border:none;padding:10px 22px;border-radius:20px;font-weight:700;cursor:pointer;
          font-size:.95rem;white-space:nowrap;
        }

        .mentor-tabs { display:flex;border-bottom:2px solid var(--border);margin-bottom:20px;padding:0 8px; }
        .mentor-tab { padding:10px 20px;border:none;background:none;cursor:pointer;color:var(--text-muted);font-weight:500;border-bottom:2px solid transparent;margin-bottom:-2px;transition:.15s; }
        .mentor-tab.active { color:var(--accent);border-bottom-color:var(--accent); }

        /* Filters */
        .mentor-filters { display:flex;gap:10px;flex-wrap:wrap;padding:0 16px 20px;align-items:center; }
        .search-input {
          flex:1;min-width:200px;background:var(--bg-elevated);border:1px solid var(--border);
          border-radius:10px;padding:9px 14px;color:var(--text-primary);font-size:.9rem;
        }
        .mentor-filters select {
          background:var(--bg-elevated);border:1px solid var(--border);border-radius:10px;
          padding:9px 12px;color:var(--text-primary);font-size:.88rem;cursor:pointer;
        }
        .clear-filters {
          background:none;border:1px solid var(--border);border-radius:10px;
          padding:8px 14px;cursor:pointer;color:var(--text-muted);font-size:.88rem;
        }

        /* Grid */
        .mentor-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;padding:0 16px; }

        /* Mentor Card */
        .mentor-card {
          background:var(--bg-card);border:1px solid var(--border);border-radius:16px;
          padding:20px;display:flex;flex-direction:column;gap:12px;
          transition:box-shadow .2s,transform .2s;
        }
        .mentor-card:hover { box-shadow:0 4px 20px rgba(0,0,0,.12);transform:translateY(-2px); }
        .skeleton-card { height:280px;animation:shimmer 1.5s infinite ease-in-out;opacity:.5; }
        @keyframes shimmer { 0%,100%{opacity:.4}50%{opacity:.8} }

        .mentor-card-top { display:flex;gap:12px;align-items:flex-start; }
        .mentor-avatar {
          width:60px;height:60px;border-radius:50%;object-fit:cover;cursor:pointer;
          border:2px solid var(--border);flex-shrink:0;
        }
        .mentor-info { flex:1;min-width:0; }
        .mentor-info h3 { margin:0 0 2px;font-size:1rem;font-weight:700;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
        .mentor-info h3:hover { color:var(--accent); }
        .mentor-handle { margin:0 0 6px;font-size:.82rem;color:var(--text-muted); }
        .mentor-chip { display:inline-block;background:var(--bg-elevated);border-radius:20px;padding:2px 8px;font-size:.76rem;color:var(--text-secondary);margin-right:4px; }
        .mentor-rating-col { display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0; }
        .rate-badge { background:var(--bg-elevated);border-radius:20px;padding:3px 10px;font-size:.78rem;font-weight:600;color:var(--text-primary); }
        .rate-badge.free { background:rgba(22,163,74,.12);color:#16a34a; }
        .review-count { font-size:.76rem;color:var(--text-muted); }

        .star-rating { display:flex;align-items:center;gap:2px; }
        .star { font-size:1.1rem;cursor:default;color:var(--border);transition:.1s; }
        .star.filled { color:#f59e0b; }
        .rating-num { font-size:.85rem;font-weight:600;margin-left:4px;color:var(--text-primary); }

        .mentor-bio { margin:0;font-size:.88rem;color:var(--text-secondary);line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden; }
        .mentor-tags { display:flex;flex-wrap:wrap;gap:6px; }
        .subject-tag { background:color-mix(in srgb,var(--accent) 12%,transparent);color:var(--accent);border-radius:20px;padding:3px 10px;font-size:.78rem;font-weight:500; }
        .exam-tag { background:color-mix(in srgb,#7c3aed 12%,transparent);color:#7c3aed;border-radius:20px;padding:3px 10px;font-size:.78rem;font-weight:500; }
        .mentor-achievements,.mentor-availability { margin:0;font-size:.83rem;color:var(--text-muted); }

        .mentor-card-footer { display:flex;align-items:center;justify-content:space-between;padding-top:8px;border-top:1px solid var(--border);margin-top:auto; }
        .btn-connect {
          background:var(--accent);color:#fff;border:none;padding:7px 18px;
          border-radius:20px;font-weight:600;cursor:pointer;font-size:.88rem;
        }
        .btn-view { background:none;border:1px solid var(--border);padding:7px 16px;border-radius:20px;cursor:pointer;color:var(--text-secondary);font-size:.88rem; }
        .btn-view:hover { background:var(--bg-elevated); }
        .my-profile-badge { font-size:.82rem;color:var(--accent);font-weight:600; }
        .conn-status { font-size:.88rem;font-weight:600; }

        /* Connections list */
        .connections-list { padding:0 16px;display:flex;flex-direction:column;gap:12px; }
        .conn-card {
          background:var(--bg-card);border:1px solid var(--border);border-radius:14px;
          padding:16px 20px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;
        }
        .conn-info { flex:1;display:flex;align-items:center;gap:10px; }
        .conn-info strong { font-size:.9rem; }
        .conn-badge { padding:3px 10px;border-radius:20px;font-size:.78rem;font-weight:600; }
        .conn-badge.pending  { background:#fef3c7;color:#92400e; }
        .conn-badge.accepted { background:#dcfce7;color:#166534; }
        .conn-badge.rejected { background:#fee2e2;color:#991b1b; }
        .conn-time { font-size:.82rem;color:var(--text-muted); }
        .conn-actions { display:flex;gap:8px; }
        .btn-accept { background:#16a34a;color:#fff;border:none;padding:6px 16px;border-radius:20px;cursor:pointer;font-weight:600;font-size:.85rem; }
        .btn-reject { background:#e11d48;color:#fff;border:none;padding:6px 16px;border-radius:20px;cursor:pointer;font-weight:600;font-size:.85rem; }
        .btn-review { background:none;border:1px solid var(--border);padding:6px 14px;border-radius:20px;cursor:pointer;font-size:.85rem; }

        /* My mentor profile */
        .my-mentor-profile { padding:0 16px;display:flex;flex-direction:column;gap:20px; }
        .mp-hero { background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:24px;display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap; }
        .mp-avatar { width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid var(--border); }
        .mp-hero > div:nth-child(2) { flex:1; }
        .mp-hero h2 { margin:0 0 4px;font-size:1.3rem; }
        .mp-hero p  { margin:0 0 8px;color:var(--text-muted); }
        .mp-stats { display:flex;gap:20px;margin-left:auto; }
        .mp-stat { text-align:center; }
        .mp-stat strong { display:block;font-size:1.2rem;font-weight:800;color:var(--accent); }
        .mp-stat span { font-size:.78rem;color:var(--text-muted); }
        .mp-section { background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:18px 20px; }
        .mp-section h4 { margin:0 0 10px;font-size:.95rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;font-size:.8rem; }
        .mp-section p { margin:0;line-height:1.6;color:var(--text-secondary); }

        /* Modals */
        .modal-backdrop { position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px; }
        .modal-box { background:var(--bg-card);border-radius:16px;width:100%;max-width:440px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden; }
        .modal-box.wide { max-width:600px; }
        .modal-header { display:flex;justify-content:space-between;align-items:center;padding:18px 20px;border-bottom:1px solid var(--border);flex-shrink:0; }
        .modal-header h3 { margin:0;font-size:1.1rem; }
        .modal-header button { background:none;border:none;cursor:pointer;font-size:1.2rem;color:var(--text-muted); }
        .modal-body { padding:20px;overflow-y:auto;display:flex;flex-direction:column;gap:12px; }
        .modal-body label { font-size:.85rem;font-weight:600;color:var(--text-secondary);margin-bottom:-6px; }
        .modal-body input,.modal-body textarea,.modal-body select {
          background:var(--bg-elevated);border:1px solid var(--border);border-radius:10px;
          padding:9px 12px;color:var(--text-primary);font-size:.9rem;width:100%;box-sizing:border-box;
        }
        .modal-body textarea { resize:vertical; }
        .req { color:#e11d48; }
        .chip-picker { display:flex;flex-wrap:wrap;gap:8px; }
        .chip {
          padding:5px 12px;border-radius:20px;font-size:.82rem;cursor:pointer;
          border:1px solid var(--border);color:var(--text-secondary);transition:.15s;
        }
        .chip:hover { border-color:var(--accent);color:var(--accent); }
        .chip.selected { background:var(--accent);color:#fff;border-color:var(--accent); }
        .form-error { color:#e11d48;font-size:.85rem;margin:0; }
        .btn-primary { background:var(--accent);color:#fff;border:none;padding:10px 20px;border-radius:10px;cursor:pointer;font-weight:600;font-size:.95rem; }
        .btn-primary.full { width:100%;text-align:center; }
        .btn-primary:disabled { opacity:.6;cursor:not-allowed; }

        /* Empty state */
        .empty-state { display:flex;flex-direction:column;align-items:center;padding:60px 20px;gap:14px;color:var(--text-muted); }
        .empty-state span { font-size:3rem; }
        .empty-state p { font-size:1rem; }
        .load-more {
          display:block;margin:20px auto;padding:12px 32px;
          background:var(--bg-elevated);border:1px solid var(--border);
          border-radius:20px;cursor:pointer;color:var(--text-secondary);font-size:.9rem;
        }

        @media(max-width:600px) {
          .mentor-grid { grid-template-columns:1fr; }
          .mentor-header { flex-direction:column; }
          .mp-hero { flex-direction:column; }
          .mp-stats { margin-left:0; }
        }
      `}</style>
    </div>
  );
}
