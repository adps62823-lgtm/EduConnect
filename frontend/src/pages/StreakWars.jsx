import { useState, useEffect } from "react";
import { gameAPI } from "../api";
import { useAuthStore } from "../store/authStore";
import { useNavigate } from "react-router-dom";

function StreakBar({ current, max }) {
  const pct = max ? Math.min(100, Math.round((current / max) * 100)) : 0;
  return (
    <div className="streak-bar-track">
      <div className="streak-bar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

function CalendarStrip({ activityDates = [] }) {
  const today    = new Date();
  const days     = [];
  for (let i = 29; i >= 0; i--) {
    const d   = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = d.toISOString().split("T")[0];
    days.push({ iso, active: activityDates.includes(iso), isToday: i === 0 });
  }
  const weekLabels = ["S","M","T","W","T","F","S"];
  return (
    <div className="calendar-strip">
      <div className="cal-week-labels">
        {weekLabels.map((l,i) => <span key={i}>{l}</span>)}
      </div>
      <div className="cal-grid">
        {days.map(d => (
          <div key={d.iso}
               className={`cal-day ${d.active ? "active" : ""} ${d.isToday ? "today" : ""}`}
               title={d.iso}
          />
        ))}
      </div>
    </div>
  );
}

export default function StreakWars() {
  const { user }    = useAuthStore();
  const navigate    = useNavigate();
  const [wars,      setWars]      = useState([]);
  const [myStreak,  setMyStreak]  = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkMsg,  setCheckMsg]  = useState("");

  useEffect(() => {
    Promise.all([
      gameAPI.streakWars(),
      gameAPI.getMyStreak(),
    ]).then(([warsRes, streakRes]) => {
      setWars(warsRes.data || []);
      setMyStreak(streakRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleCheckIn = async () => {
    if (checkedIn) return;
    try {
      const r = await gameAPI.checkIn();
      const { streak, points_earned, message } = r.data;
      setCheckMsg(message);
      setCheckedIn(true);
      setMyStreak(prev => prev
        ? { ...prev, current_streak: streak }
        : { current_streak: streak, longest_streak: streak, activity_dates: [] }
      );
      // Re-fetch wars to update position
      gameAPI.streakWars().then(r => setWars(r.data || []));
    } catch (e) {
      const msg = e.response?.data?.detail || "Could not check in.";
      setCheckMsg(msg);
    }
  };

  const myData = wars.find(u => u.is_me);
  const topStreak = wars[0]?.current_streak || 0;

  return (
    <div className="streak-wars-page">

      {/* Header */}
      <div className="sw-header">
        <div>
          <h1>🔥 Streak Wars</h1>
          <p>Build your daily study habit. Don't break the chain!</p>
        </div>
      </div>

      {/* My streak card */}
      <div className="my-streak-card">
        <div className="msc-left">
          <div className="flame-big">🔥</div>
          <div>
            <div className="msc-streak-num">{myStreak?.current_streak ?? 0}</div>
            <div className="msc-streak-label">day streak</div>
          </div>
        </div>
        <div className="msc-divider" />
        <div className="msc-stats">
          <div className="msc-stat">
            <strong>{myStreak?.longest_streak ?? 0}</strong>
            <span>Best</span>
          </div>
          <div className="msc-stat">
            {myData ? <strong>#{wars.indexOf(myData) + 1}</strong> : <strong>—</strong>}
            <span>Rank</span>
          </div>
        </div>
        <div className="msc-divider" />
        <div className="msc-checkin">
          <button
            className={`btn-checkin ${checkedIn ? "done" : ""}`}
            onClick={handleCheckIn}
            disabled={checkedIn}
          >
            {checkedIn ? "✓ Checked In!" : "Check In Today"}
          </button>
          {checkMsg && <p className="checkin-msg">{checkMsg}</p>}
        </div>
      </div>

      {/* 30-day calendar */}
      {myStreak && (
        <div className="cal-section">
          <h3>Your Last 30 Days</h3>
          <CalendarStrip activityDates={myStreak.activity_dates || []} />
          <div className="cal-legend">
            <span className="cal-legend-dot active" /> Active day
            <span className="cal-legend-dot" style={{marginLeft:14}} /> Missed
          </div>
        </div>
      )}

      {/* Streak Wars ranking */}
      <div className="wars-section">
        <h3>🏆 Streak Rankings</h3>

        {loading ? (
          <div className="wars-loading">
            {[1,2,3,4,5].map(i => <div key={i} className="war-skeleton" />)}
          </div>
        ) : wars.length === 0 ? (
          <div className="empty-state">
            <span>🔥</span>
            <p>No one has an active streak yet. Be the first!</p>
          </div>
        ) : (
          <div className="wars-list">
            {wars.map((u, i) => (
              <div
                key={u.id}
                className={`war-row ${u.is_me ? "me" : ""}`}
                onClick={() => navigate(`/profile/${u.username}`)}
              >
                <span className="war-rank">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i+1}`}
                </span>
                <img
                  src={u.avatar_url ||
                    `https://api.dicebear.com/7.x/initials/svg?seed=${u.name}`}
                  alt="" className="war-avatar"
                />
                <div className="war-info">
                  <span className="war-name">
                    {u.name}
                    {u.is_me && <span className="you-chip">You</span>}
                  </span>
                  <StreakBar current={u.current_streak} max={topStreak} />
                </div>
                <div className="war-streaks">
                  <span className="war-current">🔥{u.current_streak}</span>
                  <span className="war-best">Best: {u.longest_streak}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="streak-tips">
        <h3>💡 How to grow your streak</h3>
        <div className="tips-grid">
          {[
            ["📝","Post daily","Share what you studied today on the feed"],
            ["💬","Answer questions","Help others in the Help Forum"],
            ["📚","Upload resources","Share notes and PYQs with the community"],
            ["🏠","Join study rooms","Study with others and use the Pomodoro timer"],
          ].map(([icon,title,desc]) => (
            <div key={title} className="tip-card">
              <span className="tip-icon">{icon}</span>
              <strong>{title}</strong>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .streak-wars-page { max-width:700px;margin:0 auto;padding-bottom:60px;display:flex;flex-direction:column;gap:20px; }

        .sw-header { padding:28px 16px 0; }
        .sw-header h1 { margin:0;font-size:1.6rem;font-weight:800; }
        .sw-header p  { margin:4px 0 0;color:var(--text-muted);font-size:.9rem; }

        /* My streak card */
        .my-streak-card {
          margin:0 16px;background:linear-gradient(135deg,var(--accent),#7c3aed);
          border-radius:18px;padding:24px;display:flex;align-items:center;gap:20px;
          flex-wrap:wrap;color:#fff;
        }
        .msc-left { display:flex;align-items:center;gap:12px; }
        .flame-big { font-size:2.8rem;line-height:1; }
        .msc-streak-num { font-size:3rem;font-weight:900;line-height:1; }
        .msc-streak-label { font-size:.88rem;opacity:.85; }
        .msc-divider { width:1px;height:60px;background:rgba(255,255,255,.25);flex-shrink:0; }
        .msc-stats { display:flex;gap:20px; }
        .msc-stat { display:flex;flex-direction:column;align-items:center;gap:2px; }
        .msc-stat strong { font-size:1.3rem;font-weight:800; }
        .msc-stat span   { font-size:.75rem;opacity:.8; }
        .msc-checkin { display:flex;flex-direction:column;gap:6px;margin-left:auto; }
        .btn-checkin {
          background:#fff;color:var(--accent);border:none;padding:10px 22px;
          border-radius:20px;font-weight:700;cursor:pointer;font-size:.9rem;white-space:nowrap;
          transition:.2s;
        }
        .btn-checkin.done { background:rgba(255,255,255,.25);color:#fff;cursor:default; }
        .checkin-msg { margin:0;font-size:.82rem;opacity:.9;text-align:center; }

        /* Calendar */
        .cal-section { margin:0 16px;background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:20px; }
        .cal-section h3 { margin:0 0 14px;font-size:1rem;font-weight:700; }
        .calendar-strip { display:flex;flex-direction:column;gap:6px; }
        .cal-week-labels { display:grid;grid-template-columns:repeat(7,1fr);text-align:center; }
        .cal-week-labels span { font-size:.7rem;color:var(--text-muted);font-weight:600; }
        .cal-grid { display:grid;grid-template-columns:repeat(7,1fr);gap:4px; }
        .cal-day { aspect-ratio:1;border-radius:4px;background:var(--bg-elevated);transition:.15s; }
        .cal-day.active { background:#16a34a; }
        .cal-day.today  { outline:2px solid var(--accent);outline-offset:1px; }
        .cal-legend { display:flex;align-items:center;gap:6px;margin-top:10px;font-size:.78rem;color:var(--text-muted); }
        .cal-legend-dot { width:12px;height:12px;border-radius:3px;display:inline-block;background:var(--bg-elevated); }
        .cal-legend-dot.active { background:#16a34a; }

        /* Wars */
        .wars-section { margin:0 16px; }
        .wars-section h3 { margin:0 0 14px;font-size:1rem;font-weight:700; }
        .wars-list { display:flex;flex-direction:column;gap:6px; }
        .wars-loading { display:flex;flex-direction:column;gap:8px; }
        .war-skeleton { height:56px;background:var(--bg-elevated);border-radius:12px;animation:shimmer 1.5s infinite ease-in-out; }
        @keyframes shimmer { 0%,100%{opacity:.4}50%{opacity:.8} }

        .war-row {
          display:flex;align-items:center;gap:12px;padding:12px 14px;
          background:var(--bg-card);border:1px solid var(--border);border-radius:12px;
          cursor:pointer;transition:.15s;
        }
        .war-row:hover { background:var(--bg-elevated); }
        .war-row.me { border-color:var(--accent);background:color-mix(in srgb,var(--accent) 6%,transparent); }
        .war-rank { width:32px;text-align:center;font-size:1rem;font-weight:700;color:var(--text-muted);flex-shrink:0; }
        .war-avatar { width:40px;height:40px;border-radius:50%;object-fit:cover;flex-shrink:0; }
        .war-info { flex:1;min-width:0;display:flex;flex-direction:column;gap:5px; }
        .war-name { font-size:.9rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
        .you-chip { background:var(--accent);color:#fff;font-size:.68rem;padding:1px 6px;border-radius:10px;margin-left:5px;font-weight:700; }
        .streak-bar-track { height:6px;background:var(--bg-elevated);border-radius:3px;overflow:hidden; }
        .streak-bar-fill { height:100%;background:linear-gradient(90deg,#f59e0b,#ef4444);border-radius:3px;transition:width .4s ease; }
        .war-streaks { display:flex;flex-direction:column;align-items:flex-end;gap:2px;flex-shrink:0; }
        .war-current { font-size:1rem;font-weight:800;color:#f59e0b; }
        .war-best { font-size:.74rem;color:var(--text-muted); }

        /* Tips */
        .streak-tips { margin:0 16px; }
        .streak-tips h3 { margin:0 0 14px;font-size:1rem;font-weight:700; }
        .tips-grid { display:grid;grid-template-columns:1fr 1fr;gap:12px; }
        .tip-card { background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:6px; }
        .tip-icon { font-size:1.5rem; }
        .tip-card strong { font-size:.9rem; }
        .tip-card p { margin:0;font-size:.82rem;color:var(--text-muted);line-height:1.45; }

        .empty-state { display:flex;flex-direction:column;align-items:center;padding:40px 20px;gap:12px;color:var(--text-muted); }
        .empty-state span { font-size:2.5rem; }

        @media(max-width:500px) {
          .my-streak-card { flex-direction:column;align-items:flex-start; }
          .msc-divider { width:100%;height:1px; }
          .msc-checkin { margin-left:0;width:100%; }
          .btn-checkin { width:100%; }
          .tips-grid { grid-template-columns:1fr; }
        }
      `}</style>
    </div>
  );
}
