import{j as e}from"./motion-fY2R9ZPd.js";import{e as S,r as s}from"./vendor-CqT0HC8A.js";import{u as C,p as E}from"./index-BHg4HUyF.js";import"./icons-DDCQ9aL8.js";const A=["dark","light","dim","midnight"],P=["blue","violet","green","rose","orange","cyan","yellow","pink"],T=["small","medium","large"],h={blue:"#3b82f6",violet:"#7c3aed",green:"#16a34a",rose:"#e11d48",orange:"#f97316",cyan:"#06b6d4",yellow:"#f59e0b",pink:"#ec4899"};function r({title:o,children:n}){return e.jsxs("div",{className:"settings-section",children:[e.jsx("h2",{className:"section-title",children:o}),e.jsx("div",{className:"section-body",children:n})]})}function a({label:o,desc:n,children:i}){return e.jsxs("div",{className:"settings-row",children:[e.jsxs("div",{className:"row-label",children:[e.jsx("span",{children:o}),n&&e.jsx("p",{children:n})]}),e.jsx("div",{className:"row-control",children:i})]})}function $(){var b;const o=S(),{user:n,logout:i,updateUser:L}=C(),[c,u]=s.useState(document.documentElement.getAttribute("data-theme")||"dark"),[l,g]=s.useState(((b=getComputedStyle(document.documentElement).getPropertyValue("--accent-name"))==null?void 0:b.trim())||"blue"),[d,f]=s.useState("medium"),[p,m]=s.useState(!1),[v,x]=s.useState(!1),j=t=>{document.documentElement.setAttribute("data-theme",t),u(t)},y=t=>{document.documentElement.style.setProperty("--accent",h[t]),document.documentElement.style.setProperty("--accent-name",t),g(t)},w=t=>{const z={small:"14px",medium:"16px",large:"18px"};document.documentElement.style.setProperty("--base-font-size",z[t]),f(t)},N=async()=>{m(!0);try{await E.updateTheme({base_theme:c,accent_color:l,font_size:d}),x(!0),setTimeout(()=>x(!1),2e3)}catch{}m(!1)},k=()=>{confirm("Log out of EduConnect?")&&i()};return e.jsxs("div",{className:"settings-page",children:[e.jsxs("div",{className:"settings-header",children:[e.jsx("h1",{children:"⚙️ Settings"}),e.jsx("p",{children:"Manage your account and preferences"})]}),e.jsxs(r,{title:"👤 Account",children:[e.jsx(a,{label:"Edit Profile",desc:"Update your name, bio, grade and exam details",children:e.jsx("button",{className:"btn-action",onClick:()=>o(`/profile/${n==null?void 0:n.username}`),children:"Open Profile →"})}),e.jsx(a,{label:"Username",desc:`@${n==null?void 0:n.username}`,children:e.jsxs("span",{className:"readonly-val",children:["@",n==null?void 0:n.username]})}),e.jsx(a,{label:"Email",desc:n==null?void 0:n.email,children:e.jsx("span",{className:"readonly-val",children:n==null?void 0:n.email})}),e.jsx(a,{label:"Role",children:e.jsx("span",{className:"role-badge",children:(n==null?void 0:n.role)||"student"})}),e.jsx(a,{label:"Help Points",children:e.jsxs("span",{className:"points-val",children:["🪙 ",(n==null?void 0:n.help_points)||0]})})]}),e.jsxs(r,{title:"🎨 Appearance",children:[e.jsx(a,{label:"Theme",desc:"Choose your base colour scheme",children:e.jsx("div",{className:"theme-picker",children:A.map(t=>e.jsx("button",{className:`theme-btn ${c===t?"active":""}`,onClick:()=>j(t),children:t.charAt(0).toUpperCase()+t.slice(1)},t))})}),e.jsx(a,{label:"Accent Colour",desc:"Highlight colour used throughout the app",children:e.jsx("div",{className:"accent-picker",children:P.map(t=>e.jsx("button",{className:`accent-dot ${l===t?"active":""}`,style:{background:h[t]},onClick:()=>y(t),title:t},t))})}),e.jsx(a,{label:"Font Size",desc:"Adjust text size across the app",children:e.jsx("div",{className:"fontsize-picker",children:T.map(t=>e.jsx("button",{className:`fontsize-btn ${d===t?"active":""}`,onClick:()=>w(t),children:t.charAt(0).toUpperCase()+t.slice(1)},t))})}),e.jsx(a,{label:"",children:e.jsx("button",{className:"btn-save",onClick:N,disabled:p,children:v?"✓ Saved!":p?"Saving…":"Save Appearance"})})]}),e.jsx(r,{title:"🔔 Notifications",children:e.jsx(a,{label:"Notification Centre",desc:"View all your notifications",children:e.jsx("button",{className:"btn-action",onClick:()=>o("/notifications"),children:"Open →"})})}),e.jsxs(r,{title:"🔒 Privacy",children:[e.jsx(a,{label:"Profile Visibility",desc:"Your profile is visible to all EduConnect users",children:e.jsx("span",{className:"readonly-val",children:"Public"})}),e.jsx(a,{label:"Anonymous Posts",desc:"You can post anonymously on the feed",children:e.jsx("span",{className:"readonly-val",children:"Enabled"})})]}),e.jsxs(r,{title:"ℹ️ About",children:[e.jsx(a,{label:"Version",children:e.jsx("span",{className:"readonly-val",children:"1.0.0"})}),e.jsx(a,{label:"Built with",children:e.jsx("span",{className:"readonly-val",children:"React · FastAPI · ❤️"})})]}),e.jsx(r,{title:"⚠️ Danger Zone",children:e.jsx(a,{label:"Log Out",desc:"You will need to log in again next time",children:e.jsx("button",{className:"btn-danger",onClick:k,children:"Log Out"})})}),e.jsx("style",{children:`
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
      `})]})}export{$ as default};
