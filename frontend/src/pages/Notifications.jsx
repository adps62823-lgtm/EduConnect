import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../api";
import { useNotifStore } from "../store/notifStore";

const TYPE_ICON = {
  like:           "❤️",
  comment:        "💬",
  follow:         "👤",
  answer:         "💡",
  accepted:       "✅",
  mentor_request: "🎓",
  badge:          "🏅",
};

const ago = (iso) => {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

export default function Notifications() {
  const navigate = useNavigate();
  const { unread, clearUnread } = useNotifStore();
  const [notifs,   setNotifs]   = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    authAPI.getNotifications()
      .then(r => setNotifs(Array.isArray(r) ? r : (r?.notifications || [])))
      .catch(() => {})
      .finally(() => setLoading(false));

    // Mark all read
    authAPI.markAllRead().catch(() => {});
    clearUnread();
  }, []);

  const grouped = notifs.reduce((acc, n) => {
    const d   = new Date(n.created_at);
    const now = new Date();
    let label;
    if (d.toDateString() === now.toDateString()) label = "Today";
    else {
      const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
      label = d.toDateString() === yesterday.toDateString() ? "Yesterday"
        : d.toLocaleDateString("en-IN", { day: "numeric", month: "long" });
    }
    if (!acc[label]) acc[label] = [];
    acc[label].push(n);
    return acc;
  }, {});

  return (
    <div className="notifs-page">
      <div className="notifs-header">
        <h1>🔔 Notifications</h1>
        {notifs.length > 0 && (
          <span className="notif-count">{notifs.length} total</span>
        )}
      </div>

      {loading ? (
        <div className="notifs-list">
          {[1,2,3,4,5].map(i => <div key={i} className="notif-skeleton" />)}
        </div>
      ) : notifs.length === 0 ? (
        <div className="empty-state">
          <span>🔔</span>
          <p>You're all caught up! No new notifications.</p>
        </div>
      ) : (
        <div className="notifs-list">
          {Object.entries(grouped).map(([label, items]) => (
            <div key={label}>
              <div className="notif-group-label">{label}</div>
              {items.map(n => (
                <div key={n.id} className={`notif-row ${n.is_read ? "" : "unread"}`}>
                  <span className="notif-icon">{TYPE_ICON[n.type] || "🔔"}</span>
                  <div className="notif-body">
                    <p className="notif-title">{n.title}</p>
                    <p className="notif-msg">{n.message}</p>
                  </div>
                  <span className="notif-time">{ago(n.created_at)}</span>
                  {!n.is_read && <span className="unread-dot" />}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <style>{`
        .notifs-page { max-width:680px;margin:0 auto;padding-bottom:60px; }
        .notifs-header { display:flex;align-items:center;gap:12px;padding:28px 16px 20px; }
        .notifs-header h1 { margin:0;font-size:1.6rem;font-weight:800; }
        .notif-count { font-size:.85rem;color:var(--text-muted);margin-left:auto; }

        .notifs-list { display:flex;flex-direction:column;gap:2px;padding:0 16px; }
        .notif-skeleton { height:64px;background:var(--bg-elevated);border-radius:12px;animation:shimmer 1.5s infinite ease-in-out; }
        @keyframes shimmer { 0%,100%{opacity:.4}50%{opacity:.8} }

        .notif-group-label { font-size:.78rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;padding:14px 4px 6px; }

        .notif-row {
          display:flex;align-items:flex-start;gap:12px;padding:13px 14px;
          border-radius:12px;position:relative;transition:.15s;
        }
        .notif-row:hover { background:var(--bg-elevated); }
        .notif-row.unread { background:color-mix(in srgb,var(--accent) 6%,transparent); }
        .notif-icon { font-size:1.3rem;flex-shrink:0;margin-top:1px; }
        .notif-body { flex:1;min-width:0; }
        .notif-title { margin:0 0 2px;font-size:.9rem;font-weight:600; }
        .notif-msg   { margin:0;font-size:.83rem;color:var(--text-muted);line-height:1.45; }
        .notif-time  { font-size:.75rem;color:var(--text-muted);flex-shrink:0;margin-top:2px; }
        .unread-dot  { width:8px;height:8px;border-radius:50%;background:var(--accent);flex-shrink:0;margin-top:6px; }

        .empty-state { display:flex;flex-direction:column;align-items:center;padding:60px 20px;gap:14px;color:var(--text-muted); }
        .empty-state span { font-size:3rem; }
      `}</style>
    </div>
  );
}
