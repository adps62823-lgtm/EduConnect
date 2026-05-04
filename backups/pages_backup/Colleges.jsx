import { useState, useEffect } from "react";
import { collegeAPI } from "../api";
import { useAuthStore } from "../store/authStore";

// ── Star Rating ───────────────────────────────────────────
function StarRating({ value = 0, max = 5, onChange, size = "md" }) {
  const [hovered, setHovered] = useState(0);
  const sz = size === "sm" ? "0.95rem" : size === "lg" ? "1.5rem" : "1.15rem";
  return (
    <span className="star-row" style={{ fontSize: sz }}>
      {Array.from({ length: max }, (_, i) => i + 1).map(s => (
        <span key={s}
          style={{ color: s <= (hovered || value) ? "#f59e0b" : "var(--border)", cursor: onChange ? "pointer" : "default" }}
          onClick={() => onChange?.(s)}
          onMouseEnter={() => onChange && setHovered(s)}
          onMouseLeave={() => onChange && setHovered(0)}
        >★</span>
      ))}
      {!onChange && value > 0 && <span style={{ fontSize:"0.82rem", color:"var(--text-muted)", marginLeft:4 }}>{Number(value).toFixed(1)}</span>}
    </span>
  );
}

// ── Rating Bar ────────────────────────────────────────────
function RatingBar({ label, count, total }) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div className="rating-bar-row">
      <span className="rb-label">{label}★</span>
      <div className="rb-track"><div className="rb-fill" style={{ width: `${pct}%` }} /></div>
      <span className="rb-count">{count}</span>
    </div>
  );
}

// ── Add College Modal ─────────────────────────────────────
function AddCollegeModal({ onClose, onAdded }) {
  const [form, setForm] = useState({ name:"", city:"", state:"", type:"", website:"" });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const submit = async () => {
    if (!form.name.trim() || !form.city.trim()) return setError("Name and city are required.");
    setLoading(true);
    try {
      const r = await collegeAPI.create(form);
      onAdded(r);
      onClose();
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to add college.");
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>🏫 Add a College</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <label>College Name <span className="req">*</span></label>
          <input placeholder="e.g. IIT Bombay" value={form.name}
                 onChange={e => setForm(f=>({...f,name:e.target.value}))} />
          <div className="form-row">
            <div>
              <label>City <span className="req">*</span></label>
              <input placeholder="Mumbai" value={form.city}
                     onChange={e => setForm(f=>({...f,city:e.target.value}))} />
            </div>
            <div>
              <label>State</label>
              <input placeholder="Maharashtra" value={form.state}
                     onChange={e => setForm(f=>({...f,state:e.target.value}))} />
            </div>
          </div>
          <div className="form-row">
            <div>
              <label>Type</label>
              <select value={form.type} onChange={e => setForm(f=>({...f,type:e.target.value}))}>
                <option value="">— Select —</option>
                {["IIT","NIT","IIIT","Deemed","Private","State","Central","Medical","Law","Management"].map(t =>
                  <option key={t}>{t}</option>
                )}
              </select>
            </div>
            <div>
              <label>Website</label>
              <input placeholder="https://…" value={form.website}
                     onChange={e => setForm(f=>({...f,website:e.target.value}))} />
            </div>
          </div>
          {error && <p className="form-error">{error}</p>}
          <button className="btn-primary full" onClick={submit} disabled={loading}>
            {loading ? "Adding…" : "Add College"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Write Review Modal ────────────────────────────────────
function ReviewModal({ college, existingReview, onClose, onSaved }) {
  const [form, setForm] = useState({
    rating:      existingReview?.rating      || 0,
    title:       existingReview?.title       || "",
    pros:        existingReview?.pros        || "",
    cons:        existingReview?.cons        || "",
    academics:   existingReview?.academics   || 0,
    placements:  existingReview?.placements  || 0,
    campus_life: existingReview?.campus_life || 0,
    faculty:     existingReview?.faculty     || 0,
    course:      existingReview?.course      || "",
    year:        existingReview?.year        || "",
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const submit = async () => {
    if (!form.rating) return setError("Overall rating is required.");
    setLoading(true);
    try {
      if (existingReview) {
        await collegeAPI.updateReview(college.id, existingReview.id, form);
      } else {
        await collegeAPI.addReview(college.id, form);
      }
      onSaved(); onClose();
    } catch (e) {
      setError(e.response?.data?.detail || "Could not save review.");
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box wide" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>✍️ {existingReview ? "Edit" : "Write a"} Review — {college.name}</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <label>Overall Rating <span className="req">*</span></label>
          <StarRating value={form.rating} onChange={r => setForm(f=>({...f,rating:r}))} size="lg" />

          <label>Review Title</label>
          <input placeholder="Summarise your experience" value={form.title}
                 onChange={e => setForm(f=>({...f,title:e.target.value}))} />

          <div className="form-row">
            <div>
              <label>Pros</label>
              <textarea rows={3} placeholder="What's great here?" value={form.pros}
                        onChange={e => setForm(f=>({...f,pros:e.target.value}))} />
            </div>
            <div>
              <label>Cons</label>
              <textarea rows={3} placeholder="What could be better?" value={form.cons}
                        onChange={e => setForm(f=>({...f,cons:e.target.value}))} />
            </div>
          </div>

          <div className="sub-ratings">
            {[["academics","📖 Academics"],["placements","💼 Placements"],
              ["campus_life","🌿 Campus Life"],["faculty","🧑‍🏫 Faculty"]].map(([key,label]) => (
              <div key={key} className="sub-rating-row">
                <span className="sub-label">{label}</span>
                <StarRating value={form[key]} onChange={v => setForm(f=>({...f,[key]:v}))} />
              </div>
            ))}
          </div>

          <div className="form-row">
            <div>
              <label>Your Course</label>
              <input placeholder="e.g. B.Tech CSE" value={form.course}
                     onChange={e => setForm(f=>({...f,course:e.target.value}))} />
            </div>
            <div>
              <label>Year / Batch</label>
              <input placeholder="e.g. 2022-26" value={form.year}
                     onChange={e => setForm(f=>({...f,year:e.target.value}))} />
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}
          <button className="btn-primary full" onClick={submit} disabled={loading}>
            {loading ? "Saving…" : existingReview ? "Update Review" : "Submit Review"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── College Detail Panel ──────────────────────────────────
function CollegeDetail({ college, currentUserId, onBack, onReviewSaved }) {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    collegeAPI.get(college.id)
      .then(r => setData(r))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [college.id]);

  const myReview = data?.reviews?.find(r => r.reviewer_id === currentUserId);

  if (loading) return <div className="detail-loading"><div className="spinner" /></div>;
  if (!data)   return null;

  const dist = data.rating_distribution || {};
  const total = data.reviews_count || 0;

  return (
    <div className="college-detail">
      <button className="back-btn" onClick={onBack}>← Back</button>

      {/* Hero */}
      <div className="detail-hero">
        <div className="college-initial-big">{data.name[0]}</div>
        <div className="detail-hero-info">
          <h1>{data.name}</h1>
          <p className="detail-location">📍 {data.city}{data.state ? `, ${data.state}` : ""}</p>
          {data.type && <span className="college-type-badge">{data.type}</span>}
          {data.website && (
            <a href={data.website} target="_blank" rel="noopener noreferrer" className="website-link">
              🔗 Visit Website
            </a>
          )}
        </div>
        <div className="detail-rating-summary">
          <span className="big-rating">{data.avg_rating ? Number(data.avg_rating).toFixed(1) : "—"}</span>
          <StarRating value={data.avg_rating} size="md" />
          <span className="total-reviews">{total} review{total !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Rating breakdown */}
      {total > 0 && (
        <div className="rating-breakdown">
          <div className="breakdown-bars">
            {[5,4,3,2,1].map(n => (
              <RatingBar key={n} label={n} count={dist[n] || 0} total={total} />
            ))}
          </div>
          <div className="sub-avg-grid">
            {[["academics","📖 Academics"],["placements","💼 Placements"],
              ["campus_life","🌿 Campus Life"],["faculty","🧑‍🏫 Faculty"]].map(([key,label]) => {
              const vals = data.reviews.map(r => r[key]).filter(Boolean);
              const avg  = vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1) : null;
              return avg ? (
                <div key={key} className="sub-avg-item">
                  <span className="sub-avg-label">{label}</span>
                  <StarRating value={+avg} size="sm" />
                  <span className="sub-avg-num">{avg}</span>
                </div>
              ) : null;
            })}
          </div>
        </div>
      )}

      {/* Write review button */}
      <div className="write-review-row">
        <button className="btn-write-review" onClick={() => setShowReview(true)}>
          {myReview ? "✏️ Edit Your Review" : "✍️ Write a Review"}
        </button>
        {myReview && (
          <span className="your-review-note">You reviewed this college</span>
        )}
      </div>

      {/* Reviews list */}
      <div className="reviews-list">
        {data.reviews?.length === 0 && (
          <div className="empty-reviews">
            <span>📝</span>
            <p>No reviews yet. Be the first to review!</p>
          </div>
        )}
        {data.reviews?.map(rev => (
          <div key={rev.id} className={`review-card ${rev.reviewer_id === currentUserId ? "mine" : ""}`}>
            <div className="review-top">
              <img
                src={rev.reviewer?.avatar_url ||
                  `https://api.dicebear.com/7.x/initials/svg?seed=${rev.reviewer?.name}`}
                alt="" className="rev-avatar"
              />
              <div className="rev-meta">
                <strong>{rev.reviewer?.name || "Anonymous"}</strong>
                {rev.course && <span className="rev-course">{rev.course}</span>}
                {rev.year   && <span className="rev-year">{rev.year}</span>}
              </div>
              <div className="rev-rating-col">
                <StarRating value={rev.rating} size="sm" />
                <span className="rev-date">
                  {new Date(rev.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}
                </span>
              </div>
            </div>
            {rev.title && <p className="rev-title">"{rev.title}"</p>}
            <div className="rev-body">
              {rev.pros && <div className="rev-pros"><span>👍</span> {rev.pros}</div>}
              {rev.cons && <div className="rev-cons"><span>👎</span> {rev.cons}</div>}
            </div>
            {(rev.academics||rev.placements||rev.campus_life||rev.faculty) && (
              <div className="rev-sub-ratings">
                {rev.academics   && <span>📖 {rev.academics}/5</span>}
                {rev.placements  && <span>💼 {rev.placements}/5</span>}
                {rev.campus_life && <span>🌿 {rev.campus_life}/5</span>}
                {rev.faculty     && <span>🧑‍🏫 {rev.faculty}/5</span>}
              </div>
            )}
            {rev.reviewer_id === currentUserId && (
              <button className="btn-delete-review"
                onClick={async () => {
                  if (!confirm("Delete review?")) return;
                  await collegeAPI.deleteReview(college.id, rev.id);
                  setData(d => ({ ...d, reviews: d.reviews.filter(r => r.id !== rev.id),
                                          reviews_count: d.reviews_count - 1 }));
                }}>🗑️ Delete</button>
            )}
          </div>
        ))}
      </div>

      {showReview && (
        <ReviewModal
          college={college}
          existingReview={myReview}
          onClose={() => setShowReview(false)}
          onSaved={() => {
            setLoading(true);
            collegeAPI.get(college.id).then(r => setData(r)).finally(() => setLoading(false));
            onReviewSaved?.();
          }}
        />
      )}
    </div>
  );
}

// ── College Card ──────────────────────────────────────────
function CollegeCard({ college, onClick }) {
  const dist  = college.rating_distribution || {};
  const total = college.reviews_count || 0;
  return (
    <div className="college-card" onClick={onClick}>
      <div className="college-card-top">
        <div className="college-initial">{college.name[0]}</div>
        <div className="college-info">
          <h3>{college.name}</h3>
          <p>📍 {college.city}{college.state ? `, ${college.state}` : ""}</p>
          {college.type && <span className="college-type-badge sm">{college.type}</span>}
        </div>
        <div className="college-rating-col">
          <span className="college-avg">{college.avg_rating ? Number(college.avg_rating).toFixed(1) : "—"}</span>
          <StarRating value={college.avg_rating || 0} size="sm" />
          <span className="college-review-count">{total} review{total !== 1 ? "s" : ""}</span>
        </div>
      </div>
      {college.my_review && (
        <div className="my-review-chip">✓ You reviewed this</div>
      )}
      <div className="college-card-footer">
        <span className="view-link">View reviews →</span>
      </div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────
export default function Colleges() {
  const { user } = useAuthStore();
  const [colleges,    setColleges]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [selected,    setSelected]    = useState(null);
  const [showAdd,     setShowAdd]     = useState(false);
  const [filters,     setFilters]     = useState({ q:"", sort:"rating" });
  const [page,        setPage]        = useState(1);
  const [hasMore,     setHasMore]     = useState(false);

  const load = async (p = 1, reset = false) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 20, sort: filters.sort };
      if (filters.q) params.q = filters.q;
      const r = await collegeAPI.list(params);
      const list = r?.colleges || (Array.isArray(r) ? r : []);
      setColleges(prev => reset ? list : [...prev, ...list]);
      setHasMore(r?.has_more || false);
      setPage(p);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(1, true); }, [filters]);

  return (
    <div className="colleges-page">

      {selected ? (
        <CollegeDetail
          college={selected}
          currentUserId={user?.id}
          onBack={() => setSelected(null)}
          onReviewSaved={() => load(1, true)}
        />
      ) : (
        <>
          {/* Header */}
          <div className="colleges-header">
            <div>
              <h1>🏫 College Reviews</h1>
              <p>Real reviews from real students</p>
            </div>
            <button className="btn-add-college" onClick={() => setShowAdd(true)}>
              + Add College
            </button>
          </div>

          {/* Filters */}
          <div className="colleges-filters">
            <input className="search-input" placeholder="🔍 Search colleges…"
                   value={filters.q} onChange={e => setFilters(f=>({...f,q:e.target.value}))} />
            <select value={filters.sort} onChange={e => setFilters(f=>({...f,sort:e.target.value}))}>
              <option value="rating">Top Rated</option>
              <option value="reviews">Most Reviewed</option>
              <option value="name">A–Z</option>
            </select>
            {filters.q && (
              <button className="clear-btn" onClick={() => setFilters(f=>({...f,q:""}))}>✕ Clear</button>
            )}
          </div>

          {/* Grid */}
          {loading && colleges.length === 0 ? (
            <div className="colleges-grid">
              {[1,2,3,4,5,6].map(i => <div key={i} className="college-skeleton" />)}
            </div>
          ) : colleges.length === 0 ? (
            <div className="empty-state">
              <span>🏫</span>
              <p>No colleges found. Add the first one!</p>
              <button className="btn-primary" onClick={() => setShowAdd(true)}>Add College</button>
            </div>
          ) : (
            <>
              <div className="colleges-grid">
                {colleges.map(c => (
                  <CollegeCard key={c.id} college={c} onClick={() => setSelected(c)} />
                ))}
              </div>
              {hasMore && (
                <button className="load-more" onClick={() => load(page + 1)}>Load more</button>
              )}
            </>
          )}
        </>
      )}

      {showAdd && (
        <AddCollegeModal
          onClose={() => setShowAdd(false)}
          onAdded={c => { setColleges(prev => [c, ...prev]); setShowAdd(false); }}
        />
      )}

      <style>{`
        .colleges-page { max-width:1000px;margin:0 auto;padding-bottom:60px; }

        /* Header */
        .colleges-header { display:flex;justify-content:space-between;align-items:flex-start;padding:28px 16px 16px;flex-wrap:wrap;gap:12px; }
        .colleges-header h1 { margin:0;font-size:1.6rem;font-weight:800; }
        .colleges-header p  { margin:4px 0 0;color:var(--text-muted);font-size:.95rem; }
        .btn-add-college { background:var(--accent);color:#fff;border:none;padding:10px 22px;border-radius:20px;font-weight:700;cursor:pointer;font-size:.9rem; }

        /* Filters */
        .colleges-filters { display:flex;gap:10px;flex-wrap:wrap;padding:0 16px 20px;align-items:center; }
        .search-input { flex:1;min-width:180px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:10px;padding:9px 14px;color:var(--text-primary);font-size:.9rem; }
        .colleges-filters select { background:var(--bg-elevated);border:1px solid var(--border);border-radius:10px;padding:9px 12px;color:var(--text-primary);font-size:.88rem;cursor:pointer; }
        .clear-btn { background:none;border:1px solid var(--border);border-radius:10px;padding:8px 14px;cursor:pointer;color:var(--text-muted);font-size:.88rem; }

        /* College grid */
        .colleges-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;padding:0 16px; }
        .college-skeleton { height:140px;background:var(--bg-elevated);border-radius:16px;animation:shimmer 1.5s infinite ease-in-out; }
        @keyframes shimmer { 0%,100%{opacity:.4}50%{opacity:.8} }

        /* College card */
        .college-card { background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:18px;cursor:pointer;transition:box-shadow .2s,transform .2s;display:flex;flex-direction:column;gap:8px; }
        .college-card:hover { box-shadow:0 4px 20px rgba(0,0,0,.1);transform:translateY(-2px); }
        .college-card-top { display:flex;gap:12px;align-items:flex-start; }
        .college-initial { width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,var(--accent),#7c3aed);color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.4rem;font-weight:800;flex-shrink:0; }
        .college-info { flex:1;min-width:0; }
        .college-info h3 { margin:0 0 3px;font-size:.98rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
        .college-info p  { margin:0 0 5px;font-size:.82rem;color:var(--text-muted); }
        .college-type-badge { background:var(--bg-elevated);border-radius:20px;padding:2px 9px;font-size:.74rem;font-weight:600;color:var(--text-secondary); }
        .college-type-badge.sm { font-size:.72rem; }
        .college-rating-col { display:flex;flex-direction:column;align-items:flex-end;gap:3px;flex-shrink:0; }
        .college-avg { font-size:1.4rem;font-weight:800;color:var(--accent);line-height:1; }
        .college-review-count { font-size:.74rem;color:var(--text-muted); }
        .my-review-chip { background:color-mix(in srgb,#16a34a 12%,transparent);color:#16a34a;font-size:.78rem;padding:3px 10px;border-radius:20px;font-weight:600;align-self:flex-start; }
        .college-card-footer { border-top:1px solid var(--border);padding-top:8px;margin-top:auto; }
        .view-link { font-size:.85rem;color:var(--accent);font-weight:500; }

        .star-row { display:inline-flex;align-items:center;gap:1px; }

        /* Detail view */
        .college-detail { padding:0 16px;display:flex;flex-direction:column;gap:20px; }
        .back-btn { background:none;border:none;color:var(--accent);cursor:pointer;font-size:.95rem;font-weight:600;padding:8px 0;align-self:flex-start; }
        .detail-hero { background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:24px;display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap; }
        .college-initial-big { width:72px;height:72px;border-radius:16px;background:linear-gradient(135deg,var(--accent),#7c3aed);color:#fff;display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:800;flex-shrink:0; }
        .detail-hero-info { flex:1;min-width:180px; }
        .detail-hero-info h1 { margin:0 0 4px;font-size:1.4rem;font-weight:800; }
        .detail-location { margin:0 0 8px;color:var(--text-muted);font-size:.9rem; }
        .website-link { color:var(--accent);font-size:.88rem;text-decoration:none;display:block;margin-top:6px; }
        .website-link:hover { text-decoration:underline; }
        .detail-rating-summary { display:flex;flex-direction:column;align-items:flex-end;gap:4px;min-width:100px; }
        .big-rating { font-size:2.8rem;font-weight:900;color:var(--accent);line-height:1; }
        .total-reviews { font-size:.82rem;color:var(--text-muted); }

        /* Rating breakdown */
        .rating-breakdown { background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:20px;display:grid;grid-template-columns:1fr 1fr;gap:24px; }
        .breakdown-bars { display:flex;flex-direction:column;gap:7px; }
        .rating-bar-row { display:flex;align-items:center;gap:8px; }
        .rb-label { font-size:.82rem;color:var(--text-muted);width:20px;text-align:right; }
        .rb-track { flex:1;height:8px;background:var(--bg-elevated);border-radius:4px;overflow:hidden; }
        .rb-fill { height:100%;background:#f59e0b;border-radius:4px;transition:width .4s ease; }
        .rb-count { font-size:.78rem;color:var(--text-muted);width:20px; }
        .sub-avg-grid { display:flex;flex-direction:column;gap:10px;justify-content:center; }
        .sub-avg-item { display:flex;align-items:center;gap:8px; }
        .sub-avg-label { font-size:.82rem;color:var(--text-secondary);min-width:110px; }
        .sub-avg-num { font-size:.82rem;font-weight:700;color:var(--text-primary); }

        /* Write review row */
        .write-review-row { display:flex;align-items:center;gap:14px; }
        .btn-write-review { background:var(--accent);color:#fff;border:none;padding:10px 22px;border-radius:20px;font-weight:700;cursor:pointer;font-size:.9rem; }
        .your-review-note { font-size:.85rem;color:var(--text-muted); }

        /* Reviews list */
        .reviews-list { display:flex;flex-direction:column;gap:14px; }
        .review-card { background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:18px;display:flex;flex-direction:column;gap:10px; }
        .review-card.mine { border-color:var(--accent); }
        .review-top { display:flex;gap:12px;align-items:flex-start; }
        .rev-avatar { width:40px;height:40px;border-radius:50%;object-fit:cover;flex-shrink:0; }
        .rev-meta { flex:1; }
        .rev-meta strong { display:block;font-size:.9rem;margin-bottom:2px; }
        .rev-course { font-size:.78rem;color:var(--text-muted);margin-right:6px; }
        .rev-year   { font-size:.78rem;color:var(--text-muted); }
        .rev-rating-col { display:flex;flex-direction:column;align-items:flex-end;gap:3px; }
        .rev-date { font-size:.76rem;color:var(--text-muted); }
        .rev-title { margin:0;font-size:.95rem;font-style:italic;color:var(--text-secondary); }
        .rev-body { display:flex;flex-direction:column;gap:6px; }
        .rev-pros,.rev-cons { font-size:.88rem;line-height:1.5;color:var(--text-secondary); }
        .rev-pros span,.rev-cons span { margin-right:6px; }
        .rev-sub-ratings { display:flex;flex-wrap:wrap;gap:10px; }
        .rev-sub-ratings span { font-size:.8rem;color:var(--text-muted);background:var(--bg-elevated);padding:3px 9px;border-radius:20px; }
        .btn-delete-review { background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:.82rem;align-self:flex-start;padding:3px 8px;border-radius:6px; }
        .btn-delete-review:hover { color:#e11d48; }
        .empty-reviews { display:flex;flex-direction:column;align-items:center;padding:40px;gap:12px;color:var(--text-muted); }
        .empty-reviews span { font-size:2.5rem; }

        .detail-loading { display:flex;justify-content:center;padding:60px; }
        .spinner { width:36px;height:36px;border:3px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin .7s linear infinite; }
        @keyframes spin { to{transform:rotate(360deg)} }

        /* Modals */
        .modal-backdrop { position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px; }
        .modal-box { background:var(--bg-card);border-radius:16px;width:100%;max-width:460px;max-height:92vh;display:flex;flex-direction:column;overflow:hidden; }
        .modal-box.wide { max-width:640px; }
        .modal-header { display:flex;justify-content:space-between;align-items:center;padding:18px 20px;border-bottom:1px solid var(--border);flex-shrink:0; }
        .modal-header h3 { margin:0;font-size:1.05rem; }
        .modal-header button { background:none;border:none;cursor:pointer;font-size:1.2rem;color:var(--text-muted); }
        .modal-body { padding:20px;overflow-y:auto;display:flex;flex-direction:column;gap:12px; }
        .modal-body label { font-size:.83rem;font-weight:600;color:var(--text-secondary);margin-bottom:-6px; }
        .modal-body input,.modal-body textarea,.modal-body select {
          background:var(--bg-elevated);border:1px solid var(--border);border-radius:10px;
          padding:9px 12px;color:var(--text-primary);font-size:.9rem;width:100%;box-sizing:border-box;
        }
        .modal-body textarea { resize:vertical; }
        .form-row { display:grid;grid-template-columns:1fr 1fr;gap:12px; }
        .form-row > div { display:flex;flex-direction:column;gap:6px; }
        .sub-ratings { background:var(--bg-elevated);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:10px; }
        .sub-rating-row { display:flex;align-items:center;justify-content:space-between; }
        .sub-label { font-size:.85rem;color:var(--text-secondary);font-weight:500; }
        .req { color:#e11d48; }
        .form-error { color:#e11d48;font-size:.85rem;margin:0; }
        .btn-primary { background:var(--accent);color:#fff;border:none;padding:10px 20px;border-radius:10px;cursor:pointer;font-weight:600; }
        .btn-primary.full { width:100%;text-align:center;padding:12px; }
        .btn-primary:disabled { opacity:.6;cursor:not-allowed; }

        .empty-state { display:flex;flex-direction:column;align-items:center;padding:60px 20px;gap:14px;color:var(--text-muted); }
        .empty-state span { font-size:3rem; }
        .load-more { display:block;margin:20px auto;padding:12px 32px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:20px;cursor:pointer;color:var(--text-secondary);font-size:.9rem; }

        @media(max-width:600px) {
          .colleges-grid { grid-template-columns:1fr; }
          .colleges-header,.write-review-row { flex-direction:column; }
          .detail-hero { flex-direction:column; }
          .detail-rating-summary { align-items:flex-start; }
          .rating-breakdown { grid-template-columns:1fr; }
          .form-row { grid-template-columns:1fr; }
        }
      `}</style>
    </div>
  );
}
