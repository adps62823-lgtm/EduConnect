import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { profileAPI } from "../api";

const THEMES     = ["dark","light","dim","midnight"];
const ACCENTS    = ["blue","violet","green","rose","orange","cyan","yellow","pink"];
const FONT_SIZES = ["small","medium","large"];

const ACCENT_HEX = {
  blue:"#3b82f6", violet:"#7c3aed", green:"#16a34a",
  rose:"#e11d48", orange:"#f97316", cyan:"#06b6d4",
  yellow:"#f59e0b", pink:"#ec4899",
};

function Section({ title, children }) {
  return (
    <div className="settings-section">
      <h2 className="section-title">{title}</h2>
      <div className="section-body">{children}</div>
    </div>
  );
}

function Row({ label, desc, children }) {
  return (
    <div className="settings-row">
      <div className="row-label">
        <span>{label}</span>
        {desc && <p>{desc}</p>}
      </div>
      <div className="row-control">{children}</div>
    </div>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuthStore();

  const [theme,    setThemeLocal]  = useState(
    document.documentElement.getAttribute("data-theme") || "dark"
  );
  const [accent,   setAccentLocal] = useState(
    getComputedStyle(document.documentElement).getPropertyValue("--accent-name")?.trim() || "blue"
  );
  const [fontSize, setFontSize]    = useState("medium");
  const [saving,   setSaving]      = useState(false);
  const [saved,    setSaved]       = useState(false);

  const applyTheme = (t) => {
    document.documentElement.setAttribute("data-theme", t);
    setThemeLocal(t);
  };

  const applyAccent = (a) => {
    document.documentElement.style.setProperty("--accent", ACCENT_HEX[a]);
    document.documentElement.style.setProperty("--accent-name", a);
    setAccentLocal(a);
  };

  const applyFontSize = (f) => {
    const sizes = { small: "14px", medium: "16px", large: "18px" };
    document.documentElement.style.setProperty("--base-font-size", sizes[f]);
    setFontSize(f);
  };

  const saveTheme = async () => {
    setSaving(true);
    try {
      await profileAPI.updateTheme({ base_theme: theme, accent_color: accent, font_size: fontSize });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  const handleLogout = () => {
    if (confirm("Log out of EduConnect?")) logout();
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>⚙️ Settings</h1>
        <p>Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <Section title="👤 Account">
        <Row label="Edit Profile" desc="Update your name, bio, grade and exam details">
          <button className="btn-action" onClick={() => navigate(`/profile/${user?.username}`)}>
            Open Profile →
          </button>
        </Row>
        <Row label="Username" desc={`@${user?.username}`}>
          <span className="readonly-val">@{user?.username}</span>
        </Row>
        <Row label="Email" desc={user?.email}>
          <span className="readonly-val">{user?.email}</span>
        </Row>
        <Row label="Role">
          <span className="role-badge">{user?.role || "student"}</span>
        </Row>
        <Row label="Help Points">
          <span className="points-val">🪙 {user?.help_points || 0}</span>
        </Row>
      </Section>

      {/* Appearance */}
      <Section title="🎨 Appearance">
        <Row label="Theme" desc="Choose your base colour scheme">
          <div className="theme-picker">
            {THEMES.map(t => (
              <button key={t} className={`theme-btn ${theme === t ? "active" : ""}`}
                      onClick={() => applyTheme(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </Row>
        <Row label="Accent Colour" desc="Highlight colour used throughout the app">
          <div className="accent-picker">
            {ACCENTS.map(a => (
              <button key={a}
                className={`accent-dot ${accent === a ? "active" : ""}`}
                style={{ background: ACCENT_HEX[a] }}
                onClick={() => applyAccent(a)}
                title={a}
              />
            ))}
          </div>
        </Row>
        <Row label="Font Size" desc="Adjust text size across the app">
          <div className="fontsize-picker">
            {FONT_SIZES.map(f => (
              <button key={f} className={`fontsize-btn ${fontSize === f ? "active" : ""}`}
                      onClick={() => applyFontSize(f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </Row>
        <Row label="">
          <button className="btn-save" onClick={saveTheme} disabled={saving}>
            {saved ? "✓ Saved!" : saving ? "Saving…" : "Save Appearance"}
          </button>
        </Row>
      </Section>

      {/* Notifications */}
      <Section title="🔔 Notifications">
        <Row label="Notification Centre" desc="View all your notifications">
          <button className="btn-action" onClick={() => navigate("/notifications")}>
            Open →
          </button>
        </Row>
      </Section>

      {/* Privacy */}
      <Section title="🔒 Privacy">
        <Row label="Profile Visibility" desc="Your profile is visible to all EduConnect users">
          <span className="readonly-val">Public</span>
        </Row>
        <Row label="Anonymous Posts" desc="You can post anonymously on the feed">
          <span className="readonly-val">Enabled</span>
        </Row>
      </Section>

      {/* About */}
      <Section title="ℹ️ About">
        <Row label="Version"><span className="readonly-val">1.0.0</span></Row>
        <Row label="Built with">
          <span className="readonly-val">React · FastAPI · ❤️</span>
        </Row>
      </Section>

      {/* Danger zone */}
      <Section title="⚠️ Danger Zone">
        <Row label="Log Out" desc="You will need to log in again next time">
          <button className="btn-danger" onClick={handleLogout}>Log Out</button>
        </Row>
      </Section>

      <style>{`
        .settings-page { max-width:680px;margin:0 auto;padding-bottom:60px; }
        .settings-header { padding:28px 16px 20px; }
        .settings-header h1 { margin:0;font-size:1.6rem;font-weight:800; }
        .settings-header p  { margin:4px 0 0;color:var(--text-muted);font-size:.9rem; }

        .settings-section { margin:0 16px 16px;background:var(--bg-card);border:1px solid var(--border);border-radius:16px;overflow:hidden; }
        .section-title { margin:0;padding:14px 20px;font-size:.8rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);border-bottom:1px solid var(--border); }
        .section-body { display:flex;flex-direction:column; }

        .settings-row { display:flex;align-items:center;justify-content:space-between;padding:14px 20px;gap:20px;border-bottom:1px solid var(--border); }
        .settings-row:last-child { border-bottom:none; }
        .row-label { flex:1;min-width:0; }
        .row-label span { font-size:.92rem;font-weight:500; }
        .row-label p    { margin:2px 0 0;font-size:.8rem;color:var(--text-muted); }
        .row-control { flex-shrink:0; }

        .readonly-val { font-size:.88rem;color:var(--text-muted); }
        .role-badge { background:color-mix(in srgb,var(--accent) 15%,transparent);color:var(--accent);font-size:.8rem;padding:3px 10px;border-radius:20px;font-weight:600;text-transform:capitalize; }
        .points-val { font-size:.92rem;font-weight:700;color:var(--accent); }

        .btn-action { background:none;border:1px solid var(--border);padding:7px 16px;border-radius:20px;cursor:pointer;font-size:.86rem;color:var(--accent);font-weight:600; }
        .btn-action:hover { background:var(--bg-elevated); }
        .btn-save { background:var(--accent);color:#fff;border:none;padding:8px 20px;border-radius:20px;cursor:pointer;font-weight:600;font-size:.88rem; }
        .btn-save:disabled { opacity:.6;cursor:not-allowed; }
        .btn-danger { background:#e11d48;color:#fff;border:none;padding:8px 18px;border-radius:20px;cursor:pointer;font-weight:600;font-size:.88rem; }

        .theme-picker { display:flex;gap:8px;flex-wrap:wrap; }
        .theme-btn { padding:6px 14px;border-radius:20px;border:1px solid var(--border);background:none;cursor:pointer;font-size:.82rem;color:var(--text-secondary);transition:.15s; }
        .theme-btn.active { background:var(--accent);color:#fff;border-color:var(--accent); }

        .accent-picker { display:flex;gap:8px;flex-wrap:wrap; }
        .accent-dot { width:26px;height:26px;border-radius:50%;border:3px solid transparent;cursor:pointer;transition:.15s; }
        .accent-dot.active { border-color:var(--text-primary);transform:scale(1.15); }

        .fontsize-picker { display:flex;gap:8px; }
        .fontsize-btn { padding:6px 14px;border-radius:20px;border:1px solid var(--border);background:none;cursor:pointer;font-size:.82rem;color:var(--text-secondary);transition:.15s; }
        .fontsize-btn.active { background:var(--accent);color:#fff;border-color:var(--accent); }

        @media(max-width:500px) {
          .settings-row { flex-direction:column;align-items:flex-start;gap:10px; }
        }
      `}</style>
    </div>
  );
}
