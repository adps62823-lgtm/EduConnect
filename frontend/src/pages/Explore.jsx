import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { feedAPI } from "../api";
import { useAuthStore } from "../store/authStore";

const ago = (iso) => {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
};

function PostCard({ post, onLike }) {
  const navigate = useNavigate();
  const [liked,  setLiked]  = useState(post.is_liked);
  const [count,  setCount]  = useState(post.likes_count);

  const handleLike = async (e) => {
    e.stopPropagation();
    try {
      const r = await feedAPI.likePost(post.id);
      setLiked(r.liked); setCount(r.likes_count);
    } catch {}
  };

  return (
    <div className="explore-card" onClick={() => navigate(`/profile/${post.author?.username}`)}>
      {post.images?.[0] && (
        <div className="explore-card-img">
          <img src={post.images[0]} alt="" />
          {post.images.length > 1 && (
            <span className="img-count">+{post.images.length - 1}</span>
          )}
        </div>
      )}
      <div className="explore-card-body">
        <div className="explore-author">
          <img
            src={post.author?.avatar_url ||
              `https://api.dicebear.com/7.x/initials/svg?seed=${post.author?.name}`}
            alt="" className="explore-avatar"
          />
          <div>
            <span className="explore-name">{post.author?.name}</span>
            <span className="explore-time">{ago(post.created_at)}</span>
          </div>
          {post.exam_tag && <span className="explore-exam-tag">{post.exam_tag}</span>}
        </div>
        <p className="explore-content">{post.content}</p>
        {post.tags?.length > 0 && (
          <div className="explore-tags">
            {post.tags.slice(0,3).map(t => <span key={t} className="etag">#{t}</span>)}
          </div>
        )}
        <div className="explore-actions">
          <button className={`eaction ${liked?"liked":""}`} onClick={handleLike}>
            {liked?"❤️":"🤍"} {count}
          </button>
          <span className="eaction">💬 {post.comments_count}</span>
        </div>
      </div>
    </div>
  );
}

export default function Explore() {
  const { user }     = useAuthStore();
  const [posts,      setPosts]      = useState([]);
  const [tags,       setTags]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [q,          setQ]          = useState("");
  const [activeTag,  setActiveTag]  = useState("");
  const [page,       setPage]       = useState(1);
  const [hasMore,    setHasMore]    = useState(false);

  const load = useCallback(async (reset = false, query = q, tag = activeTag) => {
    setLoading(true);
    try {
      const params = { page: reset ? 1 : page, limit: 18 };
      if (query) params.q = query;
      const r = await feedAPI.explore(params);
      const list = r?.posts || [];
      let filtered = tag ? list.filter(p => p.tags?.includes(tag)) : list;
      setPosts(prev => reset ? filtered : [...prev, ...filtered]);
      setHasMore(r?.has_more || false);
      if (reset) setPage(1);
    } finally { setLoading(false); }
  }, [q, activeTag, page]);

  useEffect(() => {
    feedAPI.getTags().then(r => setTags(Array.isArray(r) ? r : [])).catch(() => {});
    load(true);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    load(true, q, activeTag);
  };

  const handleTag = (tag) => {
    const next = activeTag === tag ? "" : tag;
    setActiveTag(next);
    load(true, q, next);
  };

  return (
    <div className="explore-page">
      <div className="explore-header">
        <h1>🔭 Explore</h1>
        <p>Discover trending posts from the community</p>
      </div>

      {/* Search */}
      <form className="explore-search-row" onSubmit={handleSearch}>
        <input
          className="explore-search"
          placeholder="Search posts…"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
        <button type="submit" className="btn-search">Search</button>
        {(q || activeTag) && (
          <button type="button" className="btn-clear"
                  onClick={() => { setQ(""); setActiveTag(""); load(true,"",""); }}>
            ✕ Clear
          </button>
        )}
      </form>

      {/* Trending tags */}
      {tags.length > 0 && (
        <div className="tags-scroll">
          {tags.slice(0,20).map(t => (
            <button key={t.tag}
              className={`tag-pill ${activeTag === t.tag ? "active" : ""}`}
              onClick={() => handleTag(t.tag)}
            >
              #{t.tag} <span className="tag-count">{t.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      {loading && posts.length === 0 ? (
        <div className="explore-grid">
          {[1,2,3,4,5,6].map(i => <div key={i} className="explore-skeleton" />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="empty-state">
          <span>🔭</span>
          <p>Nothing found. Try a different search or tag.</p>
        </div>
      ) : (
        <>
          <div className="explore-grid">
            {posts.map(p => <PostCard key={p.id} post={p} />)}
          </div>
          {hasMore && (
            <button className="load-more" onClick={() => { setPage(pg => pg+1); load(false); }}>
              Load more
            </button>
          )}
        </>
      )}

      <style>{`
        .explore-page { max-width:1000px;margin:0 auto;padding-bottom:60px; }
        .explore-header { padding:28px 16px 16px; }
        .explore-header h1 { margin:0;font-size:1.6rem;font-weight:800; }
        .explore-header p  { margin:4px 0 0;color:var(--text-muted);font-size:.9rem; }

        .explore-search-row { display:flex;gap:10px;padding:0 16px 14px;align-items:center; }
        .explore-search { flex:1;background:var(--bg-elevated);border:1px solid var(--border);border-radius:24px;padding:10px 18px;color:var(--text-primary);font-size:.9rem; }
        .btn-search { background:var(--accent);color:#fff;border:none;padding:10px 20px;border-radius:24px;cursor:pointer;font-weight:600;font-size:.88rem; }
        .btn-clear  { background:none;border:1px solid var(--border);padding:9px 16px;border-radius:24px;cursor:pointer;font-size:.85rem;color:var(--text-muted); }

        .tags-scroll { display:flex;gap:8px;overflow-x:auto;padding:0 16px 16px;scrollbar-width:none; }
        .tags-scroll::-webkit-scrollbar { display:none; }
        .tag-pill { background:var(--bg-elevated);border:1px solid var(--border);border-radius:20px;padding:5px 12px;cursor:pointer;font-size:.82rem;color:var(--text-secondary);white-space:nowrap;display:flex;align-items:center;gap:5px;flex-shrink:0;transition:.15s; }
        .tag-pill:hover { border-color:var(--accent);color:var(--accent); }
        .tag-pill.active { background:var(--accent);color:#fff;border-color:var(--accent); }
        .tag-count { font-size:.72rem;opacity:.75; }

        .explore-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:14px;padding:0 16px; }
        .explore-skeleton { height:220px;background:var(--bg-elevated);border-radius:14px;animation:shimmer 1.5s infinite ease-in-out; }
        @keyframes shimmer { 0%,100%{opacity:.4}50%{opacity:.8} }

        .explore-card { background:var(--bg-card);border:1px solid var(--border);border-radius:14px;overflow:hidden;cursor:pointer;transition:box-shadow .2s,transform .2s;display:flex;flex-direction:column; }
        .explore-card:hover { box-shadow:0 4px 20px rgba(0,0,0,.1);transform:translateY(-2px); }
        .explore-card-img { position:relative;aspect-ratio:16/9;overflow:hidden; }
        .explore-card-img img { width:100%;height:100%;object-fit:cover; }
        .img-count { position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,.6);color:#fff;font-size:.75rem;padding:2px 7px;border-radius:10px; }
        .explore-card-body { padding:14px;display:flex;flex-direction:column;gap:8px; }
        .explore-author { display:flex;align-items:center;gap:8px; }
        .explore-avatar { width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0; }
        .explore-name { display:block;font-size:.85rem;font-weight:600; }
        .explore-time { display:block;font-size:.74rem;color:var(--text-muted); }
        .explore-exam-tag { margin-left:auto;background:color-mix(in srgb,#7c3aed 12%,transparent);color:#7c3aed;font-size:.72rem;padding:2px 8px;border-radius:12px;font-weight:500;flex-shrink:0; }
        .explore-content { margin:0;font-size:.88rem;line-height:1.5;color:var(--text-secondary);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden; }
        .explore-tags { display:flex;flex-wrap:wrap;gap:4px; }
        .etag { color:var(--accent);font-size:.78rem; }
        .explore-actions { display:flex;gap:12px;padding-top:6px;border-top:1px solid var(--border);margin-top:auto; }
        .eaction { background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:.85rem;padding:3px 6px;border-radius:6px; }
        .eaction:hover { background:var(--bg-elevated); }
        .eaction.liked { color:#e11d48; }

        .empty-state { display:flex;flex-direction:column;align-items:center;padding:60px 20px;gap:14px;color:var(--text-muted); }
        .empty-state span { font-size:3rem; }
        .load-more { display:block;margin:20px auto;padding:12px 32px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:20px;cursor:pointer;color:var(--text-secondary);font-size:.9rem; }

        @media(max-width:600px) { .explore-grid { grid-template-columns:1fr; } }
      `}</style>
    </div>
  );
}
