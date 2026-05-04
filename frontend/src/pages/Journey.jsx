import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { feedAPI } from "../api";
import { useAuthStore } from "../store/authStore";
import { Button } from "../components/ui";

const SUBJECTS = ["Mathematics","Physics","Chemistry","Biology","English","History",
                  "Geography","Economics","Computer Science","Accountancy"];

function ScoreChart({ entries }) {
  if (!entries.some(e => e.mock_score != null)) return null;
  const scored  = entries.filter(e => e.mock_score != null).slice(-10);
  const max     = Math.max(...scored.map(e => e.mock_score), 100);
  const W = 320, H = 140, PAD = 30;
  const pts = scored.map((e, i) => ({
    x: PAD + (i / Math.max(scored.length - 1, 1)) * (W - PAD * 2),
    y: H - PAD - ((e.mock_score / max) * (H - PAD * 2)),
    score: e.mock_score, week: e.week_number,
  }));
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

  return (
    <div className="score-chart">
      <h3>📈 Mock Score Trend</h3>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg">
        <defs>
          <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity=".3" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[0,25,50,75,100].map(v => {
          const y = H - PAD - ((v / max) * (H - PAD * 2));
          return (
            <g key={v}>
              <line x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="var(--border)" strokeWidth="1" />
              <text x={PAD - 4} y={y + 4} fontSize="9" fill="var(--text-muted)" textAnchor="end">{v}</text>
            </g>
          );
        })}
        {/* Area fill */}
        {pts.length > 1 && (
          <path d={`${path} L${pts[pts.length-1].x},${H-PAD} L${pts[0].x},${H-PAD} Z`}
                fill="url(#scoreGrad)" />
        )}
        {/* Line */}
        {pts.length > 1 && (
          <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round" />
        )}
        {/* Dots */}
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="5" fill="var(--accent)" />
            <text x={p.x} y={p.y - 9} fontSize="9" fill="var(--text-muted)"
                  textAnchor="middle">W{p.week}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function EntryCard({ entry, isMe, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="journey-card">
      <div className="jcard-header" onClick={() => setExpanded(v => !v)}>
        <div className="week-badge">Week {entry.week_number}</div>
        {entry.mock_score != null && (
          <div className="score-badge">
            📊 {entry.mock_score}
            <span className="score-label">/100</span>
          </div>
        )}
        <span className="jcard-chevron">{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && (
        <div className="jcard-body">
          {entry.topics_done?.length > 0 && (
            <div className="jcard-section">
              <h4>✅ Topics Done</h4>
              <div className="topics-grid">
                {entry.topics_done.map((t, i) => (
                  <span key={i} className="topic-chip">{t}</span>
                ))}
              </div>
            </div>
          )}
          {entry.reflection && (
            <div className="jcard-section">
              <h4>💭 Reflection</h4>
              <p>{entry.reflection}</p>
            </div>
          )}
          {entry.goals_next && (
            <div className="jcard-section">
              <h4>🎯 Goals for Next Week</h4>
              <p>{entry.goals_next}</p>
            </div>
          )}
          <div className="jcard-date">
            {new Date(entry.created_at).toLocaleDateString("en-IN",
              { day:"numeric", month:"long", year:"numeric" })}
          </div>
          {isMe && (
            <button className="btn-delete-entry" onClick={() => onDelete?.(entry.id)}>
              🗑️ Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function AddEntryModal({ onClose, onAdded }) {
  const [form, setForm] = useState({
    week_number: 1, mock_score: "", reflection: "", goals_next: "", topics_done: []
  });
  const [topicInput, setTopicInput] = useState("");
  const [loading, setLoading]       = useState(false);
  const [error,   setError]         = useState("");

  const addTopic = () => {
    const t = topicInput.trim();
    if (t && !form.topics_done.includes(t)) {
      setForm(f => ({ ...f, topics_done: [...f.topics_done, t] }));
      setTopicInput("");
    }
  };

  const submit = async () => {
    if (!form.week_number || form.week_number < 1) return setError("Week number is required.");
    setLoading(true);
    try {
      const payload = {
        week_number: +form.week_number,
        mock_score:  form.mock_score !== "" ? +form.mock_score : null,
        reflection:  form.reflection || null,
        goals_next:  form.goals_next || null,
        topics_done: form.topics_done,
      };
      const r = await feedAPI.createJourney(payload);
      onAdded(r);
      onClose();
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to add entry.");
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="modal-box" 
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
          maxWidth: 550
        }}
      >
        <div style={{
          padding: '24px 24px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>📓 Add Weekly Entry</h3>
          <button onClick={onClose} style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-3)',
            fontSize: '1.2rem',
            padding: 0,
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>✕</button>
        </div>
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Week Number & Mock Score */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{
                fontSize: '0.83rem',
                fontWeight: 600,
                color: 'var(--text-2)',
                display: 'block',
                marginBottom: 6
              }}>Week Number <span style={{ color: 'var(--red)' }}>*</span></label>
              <input 
                className="input"
                type="number" 
                min={1} 
                value={form.week_number}
                onChange={e => setForm(f=>({...f,week_number:e.target.value}))}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{
                fontSize: '0.83rem',
                fontWeight: 600,
                color: 'var(--text-2)',
                display: 'block',
                marginBottom: 6
              }}>Mock Score (out of 100)</label>
              <input 
                className="input"
                type="number" 
                min={0} 
                max={100} 
                placeholder="Optional"
                value={form.mock_score}
                onChange={e => setForm(f=>({...f,mock_score:e.target.value}))}
              />
            </div>
          </div>

          {/* Topics */}
          <div>
            <label style={{
              fontSize: '0.83rem',
              fontWeight: 600,
              color: 'var(--text-2)',
              display: 'block',
              marginBottom: 6
            }}>Topics Completed</label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              <input 
                className="input"
                placeholder="Type a topic and press Add"
                value={topicInput} 
                onChange={e => setTopicInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTopic())}
                style={{ flex: 1 }}
              />
              <Button 
                variant="ghost" 
                size="sm"
                type="button" 
                onClick={addTopic}
                style={{ flexShrink: 0 }}
              >
                Add
              </Button>
            </div>
            
            {/* Topic chips */}
            {form.topics_done.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                {form.topics_done.map((t, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--primary-light)',
                      color: 'var(--primary)',
                      fontSize: '0.8rem',
                      fontWeight: 500
                    }}
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() => setForm(f => ({...f, topics_done: f.topics_done.filter((_,j)=>j!==i)}))}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--primary)',
                        fontSize: '1rem',
                        padding: 0,
                        display: 'flex'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Quick subjects */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
              {SUBJECTS.slice(0, 6).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => !form.topics_done.includes(s) && setForm(f=>({...f,topics_done:[...f.topics_done,s]}))}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: 'var(--text-2)',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 150ms'
                  }}
                  onMouseEnter={e => {
                    e.target.style.borderColor = 'var(--primary)'
                    e.target.style.background = 'var(--primary-light)'
                    e.target.style.color = 'var(--primary)'
                  }}
                  onMouseLeave={e => {
                    e.target.style.borderColor = 'var(--border)'
                    e.target.style.background = 'transparent'
                    e.target.style.color = 'var(--text-2)'
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Reflection */}
          <div>
            <label style={{
              fontSize: '0.83rem',
              fontWeight: 600,
              color: 'var(--text-2)',
              display: 'block',
              marginBottom: 6
            }}>Reflection</label>
            <textarea 
              className="input"
              rows={3} 
              placeholder="How did this week go? What did you learn?"
              value={form.reflection}
              onChange={e => setForm(f=>({...f,reflection:e.target.value}))}
            />
          </div>

          {/* Goals */}
          <div>
            <label style={{
              fontSize: '0.83rem',
              fontWeight: 600,
              color: 'var(--text-2)',
              display: 'block',
              marginBottom: 6
            }}>Goals for Next Week</label>
            <textarea 
              className="input"
              rows={2} 
              placeholder="What will you focus on next week?"
              value={form.goals_next}
              onChange={e => setForm(f=>({...f,goals_next:e.target.value}))}
            />
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: 'var(--red-light, rgba(239,68,68,0.1))',
                border: '1px solid var(--red, #ef4444)',
                borderRadius: 'var(--radius)',
                padding: '10px 14px',
                fontSize: '0.85rem',
                color: 'var(--red, #fca5a5)',
              }}
            >
              ⚠️ {error}
            </motion.div>
          )}

          {/* Button */}
          <Button 
            variant="primary" 
            onClick={submit} 
            disabled={loading}
            style={{ height: 44, fontSize: '0.95rem', marginTop: 8 }}
          >
            {loading ? "Saving…" : "Add Entry"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

export default function Journey() {
  const { username }  = useParams();
  const { user }      = useAuthStore();
  const [entries,     setEntries]    = useState([]);
  const [loading,     setLoading]    = useState(true);
  const [showAdd,     setShowAdd]    = useState(false);
  const [hasMore,     setHasMore]    = useState(false);
  const [page,        setPage]       = useState(1);

  const targetUsername = username || user?.username;
  const isMe           = !username || username === user?.username;

  useEffect(() => {
    setLoading(true);
    feedAPI.getJourney({ username: targetUsername, page: 1, limit: 20 })
      .then(r => {
        setEntries(r?.entries || []);
        setHasMore(r?.has_more || false);
        setPage(1);
      }).catch(() => {}).finally(() => setLoading(false));
  }, [targetUsername]);

  const loadMore = async () => {
    const r = await feedAPI.getJourney({ username: targetUsername, page: page + 1, limit: 20 });
    setEntries(prev => [...prev, ...(r?.entries || [])]);
    setHasMore(r?.has_more || false);
    setPage(p => p + 1);
  };

  const totalWeeks    = entries.length;
  const avgScore      = entries.filter(e => e.mock_score != null).length
    ? Math.round(entries.filter(e=>e.mock_score!=null).reduce((a,e)=>a+e.mock_score,0) /
                 entries.filter(e=>e.mock_score!=null).length)
    : null;
  const totalTopics   = entries.reduce((a,e)=>a+(e.topics_done?.length||0),0);

  return (
    <div className="journey-page">
      <div className="journey-header">
        <div>
          <h1>📓 Study Journey</h1>
          <p>{isMe ? "Track your weekly progress" : `${targetUsername}'s journey`}</p>
        </div>
        {isMe && (
          <button className="btn-add-entry" onClick={() => setShowAdd(true)}>
            + Add Week
          </button>
        )}
      </div>

      {/* Stats */}
      {entries.length > 0 && (
        <div className="journey-stats">
          <div className="jstat"><strong>{totalWeeks}</strong><span>Weeks logged</span></div>
          <div className="jstat"><strong>{totalTopics}</strong><span>Topics done</span></div>
          {avgScore != null && <div className="jstat accent"><strong>{avgScore}</strong><span>Avg score</span></div>}
          {entries[0]?.mock_score != null && (
            <div className="jstat">
              <strong>{entries[0].mock_score}</strong>
              <span>Latest score</span>
            </div>
          )}
        </div>
      )}

      {/* Score chart */}
      {entries.length > 1 && <ScoreChart entries={[...entries].reverse()} />}

      {/* Entries */}
      {loading ? (
        <div className="journey-list">
          {[1,2,3].map(i => <div key={i} className="journey-skeleton" />)}
        </div>
      ) : entries.length === 0 ? (
        <div className="empty-state">
          <span>📓</span>
          <p>{isMe ? "Start tracking your journey — add your first weekly entry!" : "No entries yet."}</p>
          {isMe && <button className="btn-primary" onClick={() => setShowAdd(true)}>Add Week 1</button>}
        </div>
      ) : (
        <div className="journey-list">
          {entries.map(e => (
            <EntryCard key={e.id} entry={e} isMe={isMe}
                       onDelete={id => setEntries(prev => prev.filter(x => x.id !== id))} />
          ))}
          {hasMore && <button className="load-more" onClick={loadMore}>Load more</button>}
        </div>
      )}

      {showAdd && (
        <AddEntryModal
          onClose={() => setShowAdd(false)}
          onAdded={e => setEntries(prev => [e, ...prev])}
        />
      )}

      <style>{`
        .journey-page { max-width:700px;margin:0 auto;padding-bottom:60px; }
        .journey-header { display:flex;justify-content:space-between;align-items:flex-start;padding:28px 16px 16px;flex-wrap:wrap;gap:12px; }
        .journey-header h1 { margin:0;font-size:1.6rem;font-weight:800; }
        .journey-header p  { margin:4px 0 0;color:var(--text-muted);font-size:.9rem; }
        .btn-add-entry { background:var(--accent);color:#fff;border:none;padding:10px 22px;border-radius:20px;font-weight:700;cursor:pointer;font-size:.9rem; }

        .journey-stats { display:flex;gap:0;margin:0 16px 16px;background:var(--bg-card);border:1px solid var(--border);border-radius:14px;overflow:hidden; }
        .jstat { flex:1;display:flex;flex-direction:column;align-items:center;padding:14px 8px;gap:3px;border-right:1px solid var(--border); }
        .jstat:last-child { border-right:none; }
        .jstat strong { font-size:1.2rem;font-weight:800;color:var(--text-primary); }
        .jstat span   { font-size:.72rem;color:var(--text-muted); }
        .jstat.accent strong { color:var(--accent); }

        .score-chart { margin:0 16px 16px;background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:16px 20px; }
        .score-chart h3 { margin:0 0 12px;font-size:.95rem;font-weight:700; }
        .chart-svg { width:100%;height:auto;display:block; }

        .journey-list { display:flex;flex-direction:column;gap:10px;padding:0 16px; }
        .journey-skeleton { height:60px;background:var(--bg-elevated);border-radius:12px;animation:shimmer 1.5s infinite ease-in-out; }
        @keyframes shimmer { 0%,100%{opacity:.4}50%{opacity:.8} }

        .journey-card { background:var(--bg-card);border:1px solid var(--border);border-radius:14px;overflow:hidden; }
        .jcard-header { display:flex;align-items:center;gap:12px;padding:14px 18px;cursor:pointer;transition:.15s; }
        .jcard-header:hover { background:var(--bg-elevated); }
        .week-badge { background:var(--accent);color:#fff;font-size:.8rem;font-weight:700;padding:4px 12px;border-radius:20px; }
        .score-badge { display:flex;align-items:baseline;gap:3px;font-size:1.1rem;font-weight:800;color:var(--text-primary); }
        .score-label { font-size:.72rem;color:var(--text-muted);font-weight:400; }
        .jcard-chevron { margin-left:auto;color:var(--text-muted);font-size:.8rem; }

        .jcard-body { padding:16px 18px;border-top:1px solid var(--border);display:flex;flex-direction:column;gap:14px; }
        .jcard-section h4 { margin:0 0 8px;font-size:.82rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em; }
        .jcard-section p  { margin:0;font-size:.9rem;line-height:1.6;color:var(--text-secondary); }
        .topics-grid { display:flex;flex-wrap:wrap;gap:6px; }
        .topic-chip { background:color-mix(in srgb,var(--accent) 12%,transparent);color:var(--accent);font-size:.8rem;padding:4px 10px;border-radius:20px;font-weight:500;display:flex;align-items:center;gap:5px; }
        .topic-chip.removable span { cursor:pointer;opacity:.7; }
        .topic-chip.removable span:hover { opacity:1; }
        .jcard-date { font-size:.78rem;color:var(--text-muted); }
        .btn-delete-entry { background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:.82rem;padding:4px 8px;border-radius:6px;align-self:flex-start; }
        .btn-delete-entry:hover { color:#e11d48; }

        /* Modal */
        .modal-backdrop { position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px; }
        .modal-box { background:var(--bg-card);border-radius:16px;width:100%;max-width:520px;max-height:92vh;display:flex;flex-direction:column;overflow:hidden; }
        .modal-header { display:flex;justify-content:space-between;align-items:center;padding:18px 20px;border-bottom:1px solid var(--border);flex-shrink:0; }
        .modal-header h3 { margin:0;font-size:1.05rem; }
        .modal-header button { background:none;border:none;cursor:pointer;font-size:1.2rem;color:var(--text-muted); }
        .modal-body { padding:20px;overflow-y:auto;display:flex;flex-direction:column;gap:12px; }
        .modal-body label { font-size:.83rem;font-weight:600;color:var(--text-secondary);margin-bottom:-6px; }
        .modal-body input,.modal-body textarea {
          background:var(--bg-elevated);border:1px solid var(--border);border-radius:10px;
          padding:9px 12px;color:var(--text-primary);font-size:.9rem;width:100%;box-sizing:border-box;
        }
        .modal-body textarea { resize:vertical; }
        .form-row { display:grid;grid-template-columns:1fr 1fr;gap:12px; }
        .form-row > div { display:flex;flex-direction:column;gap:6px; }
        .topic-input-row { display:flex;gap:8px; }
        .topic-input-row input { flex:1; }
        .btn-add-topic { background:var(--accent);color:#fff;border:none;padding:9px 16px;border-radius:10px;cursor:pointer;font-size:.88rem;white-space:nowrap; }
        .subject-quick { display:flex;flex-wrap:wrap;gap:6px; }
        .subj-chip { font-size:.78rem;padding:3px 10px;border-radius:20px;background:var(--bg-elevated);border:1px solid var(--border);cursor:pointer;color:var(--text-muted);transition:.15s; }
        .subj-chip:hover { border-color:var(--accent);color:var(--accent); }
        .req { color:#e11d48; }
        .form-error { color:#e11d48;font-size:.85rem;margin:0; }
        .btn-primary { background:var(--accent);color:#fff;border:none;padding:10px 20px;border-radius:10px;cursor:pointer;font-weight:600; }
        .btn-primary.full { width:100%;text-align:center;padding:12px; }
        .btn-primary:disabled { opacity:.6;cursor:not-allowed; }

        .empty-state { display:flex;flex-direction:column;align-items:center;padding:60px 20px;gap:14px;color:var(--text-muted); }
        .empty-state span { font-size:3rem; }
        .load-more { display:block;margin:10px auto;padding:12px 32px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:20px;cursor:pointer;color:var(--text-secondary);font-size:.9rem; }

        @media(max-width:500px) { .form-row { grid-template-columns:1fr; } }
      `}</style>
    </div>
  );
}
