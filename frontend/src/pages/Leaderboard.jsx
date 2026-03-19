import { useState, useEffect } from "react";
import { gameAPI } from "../api";
import { useAuthStore } from "../store/authStore";
import { useNavigate } from "react-router-dom";

const SCOPE_LABELS = { weekly: "This Week", monthly: "This Month", all_time: "All Time" };

const RANK_COLORS  = ["#f59e0b", "#94a3b8", "#cd7c3f"];
const RANK_ICONS   = ["🥇", "🥈", "🥉"];

function TopThreeCard({ user, rank }) {
  const navigate = useNavigate();
  const sizes    = ["120px","100px","90px"];
  const margins  = ["0","20px 0 0","20px 0 0"];

  return (
    <div className="top3-card" style={{ marginTop: margins[rank] }}
         onClick={() => navigate(`/profile/${user.username}`)}>
      <div className="top3-rank-icon">{RANK_ICONS[rank]}</div>
      <div className="top3-avatar-wrap" style={{ border: `3px solid ${RANK_COLORS[rank]}` }}>
        <img
          src={user.avatar_url ||
            `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}&backgroundColor=0a7ea4,7c3aed,059669`}
          alt={user.name}
          style={{ width: sizes[rank], height: sizes[rank] }}
          className="top3-avatar"
        />
      </div>
      <p className="top3-name">{user.name}</p>
      <p className="top3-handle">@{user.username}</p>
      <div className="top3-score" style={{ color: RANK_COLORS[rank] }}>{user.score}</div>
      <div className="top3-meta">
        {user.streak > 0 && <span>🔥{user.streak}</span>}
        {user.exam_target && <span>{user.exam_target}</span>}
      </div>
      {user.is_me && <div className="top3-you-badge">You</div>}
    </div>
  );
}

function LeaderboardRow({ user, rank }) {
  const navigate = useNavigate();
  const isTop3   = rank <= 3;
  return (
    <div
      className={`lb-row ${user.is_me ? "me" : ""} ${isTop3 ? "top3" : ""}`}
      onClick={() => navigate(`/profile/${user.username}`)}
    >
      <span className="lb-rank">
        {rank <= 3 ? RANK_ICONS[rank - 1] : <span className="rank-num">#{rank}</span>}
      </span>
      <img
        src={user.avatar_url ||
          `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`}
        alt="" className="lb-avatar"
      />
      <div className="lb-info">
        <span className="lb-name">{user.name} {user.is_me && <span className="you-chip">You</span>}</span>
        <span className="lb-sub">@{user.username} {user.exam_target && `· ${user.exam_target}`}</span>
      </div>
      <div className="lb-right">
        {user.streak > 0 && <span className="lb-streak">🔥{user.streak}</span>}
        <span className="lb-score">{user.score}</span>
        <span className="lb-score-label">pts</span>
      </div>
    </div>
  );
}

export default function Leaderboard() {
  const { user }   = useAuthStore();
  const [scope,    setScope]    = useState("weekly");
  const [data,     setData]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [myStats,  setMyStats]  = useState(null);
  const [myRank,   setMyRank]   = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      gameAPI.getLeaderboard({ scope }),
      gameAPI.getMyStats(),
    ]).then(([lbRes, statsRes]) => {
      const list = lbRes.data || [];
      setData(list);
      const idx = list.findIndex(u => u.is_me);
      setMyRank(idx >= 0 ? idx + 1 : null);
      setMyStats(statsRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [scope]);

  const top3 = data.slice(0, 3);
  const rest  = data.slice(3);

  // Reorder top3 display: 2nd, 1st, 3rd (podium style)
  const podium = top3.length >= 3
    ? [top3[1], top3[0], top3[2]]
    : top3.length === 2
    ? [top3[1], top3[0]]
    : top3;
  const podiumRanks = top3.length >= 3 ? [1, 0, 2] : top3.length === 2 ? [1, 0] : [0];

  return (
    <div className="leaderboard-page">

      {/* Header */}
      <div className="lb-header">
        <div>
          <h1>🏆 Leaderboard</h1>
          <p>Top students ranked by activity and reputation</p>
        </div>
        {myStats && (
          <div className="my-stats-card">
            <div className="ms-item"><strong>{myStats.reputation}</strong><span>Rep</span></div>
            <div className="ms-item"><strong>{myStats.help_points}</strong><span>Points</span></div>
            <div className="ms-item"><strong>🔥{myStats.current_streak}</strong><span>Streak</span></div>
            {myRank && <div className="ms-item accent"><strong>#{myRank}</strong><span>Rank</span></div>}
          </div>
        )}
      </div>

      {/* Scope tabs */}
      <div className="scope-tabs">
        {Object.entries(SCOPE_LABELS).map(([s, label]) => (
          <button key={s} className={`scope-tab ${scope === s ? "active" : ""}`}
                  onClick={() => setScope(s)}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="lb-loading">
          {[1,2,3,4,5].map(i => <div key={i} className="lb-skeleton" />)}
        </div>
      ) : data.length === 0 ? (
        <div className="empty-state">
          <span>🏆</span>
          <p>No data yet. Start posting and answering to appear here!</p>
        </div>
      ) : (
        <>
          {/* Podium */}
          {top3.length > 0 && (
            <div className="podium">
              {podium.map((u, i) => u && (
                <TopThreeCard key={u.id} user={u} rank={podiumRanks[i]} />
              ))}
            </div>
          )}

          {/* Rest of leaderboard */}
          {rest.length > 0 && (
            <div className="lb-list">
              {rest.map((u, i) => (
                <LeaderboardRow key={u.id} user={u} rank={i + 4} />
              ))}
            </div>
          )}

          {/* My position if outside top 50 */}
          {!myRank && user && (
            <div className="not-ranked">
              <span>You're not on the leaderboard yet — post, answer questions, and check in daily!</span>
            </div>
          )}
        </>
      )}

      <style>{`
        .leaderboard-page { max-width:700px;margin:0 auto;padding-bottom:60px; }

        .lb-header { display:flex;justify-content:space-between;align-items:flex-start;padding:28px 16px 16px;flex-wrap:wrap;gap:14px; }
        .lb-header h1 { margin:0;font-size:1.6rem;font-weight:800; }
        .lb-header p  { margin:4px 0 0;color:var(--text-muted);font-size:.9rem; }

        .my-stats-card { display:flex;gap:0;background:var(--bg-card);border:1px solid var(--border);border-radius:14px;overflow:hidden; }
        .ms-item { display:flex;flex-direction:column;align-items:center;padding:10px 16px;border-right:1px solid var(--border);gap:2px; }
        .ms-item:last-child { border-right:none; }
        .ms-item strong { font-size:1.1rem;font-weight:800;color:var(--text-primary); }
        .ms-item span   { font-size:.7rem;color:var(--text-muted); }
        .ms-item.accent strong { color:var(--accent); }

        .scope-tabs { display:flex;gap:8px;padding:0 16px 20px; }
        .scope-tab { padding:8px 20px;border-radius:20px;border:1px solid var(--border);background:none;cursor:pointer;font-size:.88rem;font-weight:500;color:var(--text-muted);transition:.15s; }
        .scope-tab.active { background:var(--accent);color:#fff;border-color:var(--accent); }

        /* Podium */
        .podium { display:flex;justify-content:center;align-items:flex-end;gap:12px;padding:20px 16px 30px;background:linear-gradient(180deg,color-mix(in srgb,var(--accent) 8%,transparent) 0%,transparent 100%);border-radius:16px;margin:0 8px 16px; }
        .top3-card { display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer;position:relative;flex:1;max-width:140px; }
        .top3-card:hover .top3-avatar { transform:scale(1.05); }
        .top3-rank-icon { font-size:1.5rem;line-height:1; }
        .top3-avatar-wrap { border-radius:50%;overflow:hidden;flex-shrink:0; }
        .top3-avatar { display:block;object-fit:cover;border-radius:50%;transition:.2s; }
        .top3-name { margin:0;font-size:.88rem;font-weight:700;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px; }
        .top3-handle { margin:0;font-size:.74rem;color:var(--text-muted); }
        .top3-score { font-size:1.1rem;font-weight:800; }
        .top3-meta { display:flex;gap:6px;font-size:.74rem;color:var(--text-muted); }
        .top3-you-badge { position:absolute;top:-6px;right:0;background:var(--accent);color:#fff;font-size:.68rem;font-weight:700;padding:2px 7px;border-radius:20px; }

        /* List */
        .lb-list { display:flex;flex-direction:column;gap:4px;padding:0 16px; }
        .lb-row {
          display:flex;align-items:center;gap:12px;padding:12px 14px;
          border-radius:12px;cursor:pointer;transition:.15s;
        }
        .lb-row:hover { background:var(--bg-elevated); }
        .lb-row.me { background:color-mix(in srgb,var(--accent) 8%,transparent);border:1px solid color-mix(in srgb,var(--accent) 25%,transparent); }
        .lb-rank { width:32px;text-align:center;font-size:1.1rem;flex-shrink:0; }
        .rank-num { font-size:.85rem;font-weight:700;color:var(--text-muted); }
        .lb-avatar { width:40px;height:40px;border-radius:50%;object-fit:cover;flex-shrink:0; }
        .lb-info { flex:1;min-width:0; }
        .lb-name { display:block;font-size:.92rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
        .lb-sub  { display:block;font-size:.78rem;color:var(--text-muted); }
        .you-chip { background:var(--accent);color:#fff;font-size:.68rem;padding:1px 6px;border-radius:10px;margin-left:5px;font-weight:700; }
        .lb-right { display:flex;align-items:center;gap:6px;flex-shrink:0; }
        .lb-streak { font-size:.82rem;color:#f59e0b; }
        .lb-score { font-size:1.05rem;font-weight:800;color:var(--text-primary); }
        .lb-score-label { font-size:.72rem;color:var(--text-muted); }

        .lb-loading { display:flex;flex-direction:column;gap:8px;padding:0 16px; }
        .lb-skeleton { height:60px;background:var(--bg-elevated);border-radius:12px;animation:shimmer 1.5s infinite ease-in-out; }
        @keyframes shimmer { 0%,100%{opacity:.4}50%{opacity:.8} }

        .not-ranked { text-align:center;padding:16px;color:var(--text-muted);font-size:.88rem;background:var(--bg-elevated);border-radius:12px;margin:0 16px; }
        .empty-state { display:flex;flex-direction:column;align-items:center;padding:60px 20px;gap:14px;color:var(--text-muted); }
        .empty-state span { font-size:3rem; }

        @media(max-width:500px) {
          .podium { gap:6px;padding:16px 8px 24px; }
          .top3-name { max-width:80px; }
          .my-stats-card { flex-wrap:wrap; }
        }
      `}</style>
    </div>
  );
}
