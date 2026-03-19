import { useState, useEffect, useRef } from "react";
import { resourceAPI } from "../api";
import { useAuthStore } from "../store/authStore";

const SUBJECTS = ["Mathematics","Physics","Chemistry","Biology","English","History",
                  "Geography","Economics","Computer Science","Accountancy"];
const TYPES    = ["notes","pyqs","book","video","mindmap","formula_sheet","mock_test","other"];
const TYPE_LABELS = { notes:"📝 Notes", pyqs:"📋 PYQs", book:"📚 Book", video:"🎬 Video",
                      mindmap:"🗺️ Mind Map", formula_sheet:"🧮 Formula Sheet",
                      mock_test:"📝 Mock Test", other:"📦 Other" };

const fmt_size = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1048576)    return `${(bytes/1024).toFixed(1)} KB`;
  return `${(bytes/1048576).toFixed(1)} MB`;
};

// ── Resource Card ─────────────────────────────────────────
function ResourceCard({ resource, onLike, onDownload, currentUserId }) {
  const [liked,      setLiked]      = useState(resource.is_liked);
  const [likeCount,  setLikeCount]  = useState(resource.likes_count);
  const [downloading,setDownloading]= useState(false);

  const ext = resource.file_name?.split(".").pop()?.toUpperCase() || "FILE";
  const extColor = {
    PDF:"#e11d48", DOC:"#2563eb", DOCX:"#2563eb", PPT:"#f97316",
    PPTX:"#f97316", XLS:"#16a34a", XLSX:"#16a34a", ZIP:"#7c3aed",
  }[ext] || "#6b7280";

  const handleLike = async () => {
    try {
      const r = await resourceAPI.like(resource.id);
      setLiked(r.data.liked); setLikeCount(r.data.likes_count);
    } catch {}
  };

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const r = await resourceAPI.download(resource.id);
      const url = r.data.file_url;
      const a   = document.createElement("a");
      a.href    = url; a.download = resource.file_name || "resource";
      a.target  = "_blank"; a.click();
      onDownload?.();
    } catch (e) {
      alert(e.response?.data?.detail || "Download failed.");
    } finally { setDownloading(false); }
  };

  return (
    <div className="resource-card">
      {/* File type badge */}
      <div className="resource-type-row">
        <span className="type-label">{TYPE_LABELS[resource.resource_type] || resource.resource_type}</span>
        <span className="ext-badge" style={{ background: extColor + "22", color: extColor }}>{ext}</span>
      </div>

      <h3 className="resource-title">{resource.title}</h3>
      {resource.description && <p className="resource-desc">{resource.description}</p>}

      <div className="resource-meta">
        {resource.subject    && <span className="meta-chip subject">{resource.subject}</span>}
        {resource.exam_target && <span className="meta-chip exam">{resource.exam_target}</span>}
        {resource.file_size  && <span className="meta-chip size">{fmt_size(resource.file_size)}</span>}
      </div>

      <div className="resource-uploader">
        <img
          src={resource.uploader?.avatar_url ||
            `https://api.dicebear.com/7.x/initials/svg?seed=${resource.uploader?.name}`}
          alt="" className="uploader-avatar"
        />
        <span>{resource.uploader?.name}</span>
        {resource.points_cost > 0 && (
          <span className="points-badge">🪙 {resource.points_cost} pts</span>
        )}
      </div>

      <div className="resource-actions">
        <button className={`action-btn ${liked?"liked":""}`} onClick={handleLike}>
          {liked ? "❤️" : "🤍"} {likeCount}
        </button>
        <span className="download-count">⬇️ {resource.downloads || 0}</span>
        <button className="btn-download" onClick={handleDownload} disabled={downloading}>
          {downloading ? "…" : "⬇ Download"}
        </button>
        {resource.is_mine && (
          <button className="btn-delete-res" onClick={() => onDelete?.(resource.id)}>🗑️</button>
        )}
      </div>
    </div>
  );
}

// ── Upload Modal ──────────────────────────────────────────
function UploadModal({ onClose, onUploaded }) {
  const [form, setForm]       = useState({
    title:"", description:"", subject:"", resource_type:"notes",
    exam_target:"", points_cost:0,
  });
  const [file,    setFile]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const fileRef               = useRef();

  const submit = async () => {
    if (!form.title.trim()) return setError("Title is required.");
    if (!file)              return setError("Please select a file.");
    setLoading(true); setError("");
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k,v]) => fd.append(k, v));
      fd.append("file", file);
      const r = await resourceAPI.upload(fd);
      onUploaded(r.data);
      onClose();
    } catch (e) {
      setError(e.response?.data?.detail || "Upload failed.");
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📤 Upload Resource</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <label>Title <span className="req">*</span></label>
          <input placeholder="e.g. JEE Mains 2023 Physics PYQ"
                 value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} />

          <label>Description</label>
          <textarea rows={2} placeholder="What's in this resource?"
                    value={form.description}
                    onChange={e => setForm(f=>({...f,description:e.target.value}))} />

          <div className="form-row">
            <div>
              <label>Type</label>
              <select value={form.resource_type}
                      onChange={e => setForm(f=>({...f,resource_type:e.target.value}))}>
                {TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label>Subject</label>
              <select value={form.subject}
                      onChange={e => setForm(f=>({...f,subject:e.target.value}))}>
                <option value="">— None —</option>
                {SUBJECTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div>
              <label>Exam Target</label>
              <input placeholder="e.g. JEE, NEET" value={form.exam_target}
                     onChange={e => setForm(f=>({...f,exam_target:e.target.value}))} />
            </div>
            <div>
              <label>Points Cost (0 = Free)</label>
              <input type="number" min={0} value={form.points_cost}
                     onChange={e => setForm(f=>({...f,points_cost:+e.target.value}))} />
            </div>
          </div>

          <label>File <span className="req">*</span></label>
          <div className="file-drop" onClick={() => fileRef.current.click()}>
            {file ? (
              <span>📎 {file.name} ({fmt_size(file.size)})</span>
            ) : (
              <span>Click to select file (max 10 MB)</span>
            )}
          </div>
          <input ref={fileRef} type="file" hidden onChange={e => setFile(e.target.files[0])} />

          {error && <p className="form-error">{error}</p>}
          <button className="btn-primary full" onClick={submit} disabled={loading}>
            {loading ? "Uploading…" : "Upload Resource"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────
export default function Resources() {
  const { user } = useAuthStore();

  const [resources,   setResources]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showUpload,  setShowUpload]  = useState(false);
  const [filters,     setFilters]     = useState({ q:"", subject:"", resource_type:"", sort:"newest" });
  const [page,        setPage]        = useState(1);
  const [hasMore,     setHasMore]     = useState(false);
  const [tab,         setTab]         = useState("all"); // all | mine

  const loadResources = async (p = 1, reset = false) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 12, sort: filters.sort };
      if (filters.q)             params.q             = filters.q;
      if (filters.subject)       params.subject       = filters.subject;
      if (filters.resource_type) params.resource_type = filters.resource_type;

      const r = await resourceAPI.list(params);
      let list = r.data?.resources || r.data || [];
      if (tab === "mine") list = list.filter(res => res.is_mine);

      setResources(prev => reset ? list : [...prev, ...list]);
      setHasMore(r.data?.has_more || false);
      setPage(p);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadResources(1, true); }, [filters, tab]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this resource?")) return;
    await resourceAPI.delete(id);
    setResources(prev => prev.filter(r => r.id !== id));
  };

  const displayed = tab === "mine" ? resources.filter(r => r.is_mine) : resources;

  return (
    <div className="resources-page">

      {/* ── HEADER ──────────────────────────────── */}
      <div className="resources-header">
        <div>
          <h1>📚 Resources</h1>
          <p>Study materials shared by the community</p>
        </div>
        <div className="header-right">
          <div className="points-display">
            🪙 <strong>{user?.help_points || 0}</strong> pts
          </div>
          <button className="btn-upload" onClick={() => setShowUpload(true)}>
            + Upload
          </button>
        </div>
      </div>

      {/* ── TABS ────────────────────────────────── */}
      <div className="resource-tabs">
        {[["all","🌐 All Resources"],["mine","📁 My Uploads"]].map(([t,l]) => (
          <button key={t} className={`res-tab ${tab===t?"active":""}`} onClick={() => setTab(t)}>{l}</button>
        ))}
      </div>

      {/* ── FILTERS ─────────────────────────────── */}
      <div className="resources-filters">
        <input className="search-input" placeholder="🔍 Search resources…"
               value={filters.q} onChange={e => setFilters(f=>({...f,q:e.target.value}))} />
        <select value={filters.resource_type}
                onChange={e => setFilters(f=>({...f,resource_type:e.target.value}))}>
          <option value="">All Types</option>
          {TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
        </select>
        <select value={filters.subject}
                onChange={e => setFilters(f=>({...f,subject:e.target.value}))}>
          <option value="">All Subjects</option>
          {SUBJECTS.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filters.sort}
                onChange={e => setFilters(f=>({...f,sort:e.target.value}))}>
          <option value="newest">Newest</option>
          <option value="popular">Most Popular</option>
        </select>
        {(filters.q||filters.subject||filters.resource_type) && (
          <button className="clear-btn" onClick={() => setFilters(f=>({...f,q:"",subject:"",resource_type:""}))}>
            ✕ Clear
          </button>
        )}
      </div>

      {/* ── GRID ────────────────────────────────── */}
      {loading && resources.length === 0 ? (
        <div className="resource-grid">
          {[1,2,3,4,5,6].map(i => <div key={i} className="res-skeleton" />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="empty-state">
          <span>📭</span>
          <p>{tab==="mine" ? "You haven't uploaded anything yet." : "No resources found."}</p>
          <button className="btn-primary" onClick={() => setShowUpload(true)}>Upload first resource</button>
        </div>
      ) : (
        <>
          <div className="resource-grid">
            {displayed.map(res => (
              <ResourceCard
                key={res.id}
                resource={res}
                currentUserId={user?.id}
                onDelete={handleDelete}
                onDownload={() => loadResources(1, true)}
              />
            ))}
          </div>
          {hasMore && tab !== "mine" && (
            <button className="load-more" onClick={() => loadResources(page + 1)}>Load more</button>
          )}
        </>
      )}

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={(r) => setResources(prev => [r, ...prev])}
        />
      )}

      <style>{`
        .resources-page { max-width:1000px;margin:0 auto;padding-bottom:60px; }

        .resources-header {
          display:flex;justify-content:space-between;align-items:flex-start;
          padding:28px 16px 16px;flex-wrap:wrap;gap:12px;
        }
        .resources-header h1 { margin:0;font-size:1.6rem;font-weight:800; }
        .resources-header p  { margin:4px 0 0;color:var(--text-muted);font-size:.95rem; }
        .header-right { display:flex;align-items:center;gap:12px; }
        .points-display {
          background:var(--bg-elevated);border:1px solid var(--border);
          border-radius:20px;padding:7px 16px;font-size:.9rem;
        }
        .points-display strong { color:var(--accent); }
        .btn-upload {
          background:var(--accent);color:#fff;border:none;
          padding:10px 22px;border-radius:20px;font-weight:700;cursor:pointer;font-size:.9rem;
        }

        .resource-tabs { display:flex;border-bottom:2px solid var(--border);margin-bottom:16px;padding:0 8px; }
        .res-tab { padding:10px 20px;border:none;background:none;cursor:pointer;color:var(--text-muted);font-weight:500;border-bottom:2px solid transparent;margin-bottom:-2px;transition:.15s; }
        .res-tab.active { color:var(--accent);border-bottom-color:var(--accent); }

        .resources-filters { display:flex;gap:10px;flex-wrap:wrap;padding:0 16px 20px;align-items:center; }
        .search-input { flex:1;min-width:180px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:10px;padding:9px 14px;color:var(--text-primary);font-size:.9rem; }
        .resources-filters select { background:var(--bg-elevated);border:1px solid var(--border);border-radius:10px;padding:9px 12px;color:var(--text-primary);font-size:.88rem;cursor:pointer; }
        .clear-btn { background:none;border:1px solid var(--border);border-radius:10px;padding:8px 14px;cursor:pointer;color:var(--text-muted);font-size:.88rem; }

        .resource-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;padding:0 16px; }

        .resource-card {
          background:var(--bg-card);border:1px solid var(--border);border-radius:16px;
          padding:18px;display:flex;flex-direction:column;gap:10px;
          transition:box-shadow .2s,transform .2s;
        }
        .resource-card:hover { box-shadow:0 4px 20px rgba(0,0,0,.1);transform:translateY(-2px); }
        .res-skeleton { height:220px;background:var(--bg-elevated);border-radius:16px;animation:shimmer 1.5s infinite ease-in-out; }
        @keyframes shimmer { 0%,100%{opacity:.4}50%{opacity:.8} }

        .resource-type-row { display:flex;align-items:center;justify-content:space-between; }
        .type-label { font-size:.82rem;color:var(--text-muted);font-weight:500; }
        .ext-badge { font-size:.72rem;font-weight:700;padding:2px 8px;border-radius:6px; }

        .resource-title { margin:0;font-size:1rem;font-weight:700;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden; }
        .resource-desc { margin:0;font-size:.85rem;color:var(--text-muted);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.45; }

        .resource-meta { display:flex;flex-wrap:wrap;gap:6px; }
        .meta-chip { font-size:.76rem;padding:3px 9px;border-radius:20px; }
        .meta-chip.subject { background:color-mix(in srgb,var(--accent) 12%,transparent);color:var(--accent); }
        .meta-chip.exam    { background:color-mix(in srgb,#7c3aed 12%,transparent);color:#7c3aed; }
        .meta-chip.size    { background:var(--bg-elevated);color:var(--text-muted); }

        .resource-uploader { display:flex;align-items:center;gap:8px;font-size:.83rem;color:var(--text-muted); }
        .uploader-avatar { width:24px;height:24px;border-radius:50%;object-fit:cover; }
        .points-badge { margin-left:auto;background:color-mix(in srgb,#f59e0b 15%,transparent);color:#92400e;font-size:.76rem;padding:2px 8px;border-radius:20px;font-weight:600; }

        .resource-actions { display:flex;align-items:center;gap:8px;padding-top:8px;border-top:1px solid var(--border);margin-top:auto; }
        .action-btn { background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:.88rem;padding:4px 8px;border-radius:8px; }
        .action-btn:hover { background:var(--bg-elevated); }
        .action-btn.liked { color:#e11d48; }
        .download-count { font-size:.82rem;color:var(--text-muted); }
        .btn-download {
          margin-left:auto;background:var(--accent);color:#fff;border:none;
          padding:6px 16px;border-radius:20px;cursor:pointer;font-size:.85rem;font-weight:600;
        }
        .btn-download:disabled { opacity:.6;cursor:not-allowed; }
        .btn-delete-res { background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:.9rem;padding:4px 8px;border-radius:8px; }
        .btn-delete-res:hover { color:#e11d48; }

        /* Modal */
        .modal-backdrop { position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px; }
        .modal-box { background:var(--bg-card);border-radius:16px;width:100%;max-width:520px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden; }
        .modal-header { display:flex;justify-content:space-between;align-items:center;padding:18px 20px;border-bottom:1px solid var(--border);flex-shrink:0; }
        .modal-header h3 { margin:0;font-size:1.1rem; }
        .modal-header button { background:none;border:none;cursor:pointer;font-size:1.2rem;color:var(--text-muted); }
        .modal-body { padding:20px;overflow-y:auto;display:flex;flex-direction:column;gap:12px; }
        .modal-body label { font-size:.84rem;font-weight:600;color:var(--text-secondary);margin-bottom:-6px; }
        .modal-body input,.modal-body textarea,.modal-body select {
          background:var(--bg-elevated);border:1px solid var(--border);border-radius:10px;
          padding:9px 12px;color:var(--text-primary);font-size:.9rem;width:100%;box-sizing:border-box;
        }
        .modal-body textarea { resize:vertical; }
        .form-row { display:grid;grid-template-columns:1fr 1fr;gap:12px; }
        .form-row > div { display:flex;flex-direction:column;gap:6px; }
        .file-drop {
          border:2px dashed var(--border);border-radius:10px;padding:20px;
          text-align:center;cursor:pointer;color:var(--text-muted);font-size:.88rem;
          transition:.2s;
        }
        .file-drop:hover { border-color:var(--accent);color:var(--accent); }
        .req { color:#e11d48; }
        .form-error { color:#e11d48;font-size:.85rem;margin:0; }
        .btn-primary { background:var(--accent);color:#fff;border:none;padding:10px 20px;border-radius:10px;cursor:pointer;font-weight:600; }
        .btn-primary.full { width:100%;text-align:center;padding:12px; }
        .btn-primary:disabled { opacity:.6;cursor:not-allowed; }

        .empty-state { display:flex;flex-direction:column;align-items:center;padding:60px 20px;gap:14px;color:var(--text-muted); }
        .empty-state span { font-size:3rem; }
        .load-more { display:block;margin:20px auto;padding:12px 32px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:20px;cursor:pointer;color:var(--text-secondary);font-size:.9rem; }

        @media(max-width:600px) {
          .resource-grid { grid-template-columns:1fr; }
          .resources-header { flex-direction:column; }
          .form-row { grid-template-columns:1fr; }
        }
      `}</style>
    </div>
  );
}
