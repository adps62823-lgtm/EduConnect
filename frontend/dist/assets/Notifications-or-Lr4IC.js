import{j as e}from"./motion-fY2R9ZPd.js";import{e as h,r as l}from"./vendor-CqT0HC8A.js";import{i as u,b as f}from"./index-BHg4HUyF.js";import"./icons-DDCQ9aL8.js";const j={like:"❤️",comment:"💬",follow:"👤",answer:"💡",accepted:"✅",mentor_request:"🎓",badge:"🏅"},v=d=>{const a=(Date.now()-new Date(d))/1e3;return a<60?"just now":a<3600?`${Math.floor(a/60)}m ago`:a<86400?`${Math.floor(a/3600)}h ago`:`${Math.floor(a/86400)}d ago`};function k(){h();const{unread:d,clearUnread:a}=u(),[s,p]=l.useState([]),[m,x]=l.useState(!0);l.useEffect(()=>{f.getNotifications().then(t=>p(t.data||[])).catch(()=>{}).finally(()=>x(!1)),f.markAllRead().catch(()=>{}),a()},[]);const g=s.reduce((t,o)=>{const i=new Date(o.created_at),r=new Date;let n;if(i.toDateString()===r.toDateString())n="Today";else{const c=new Date(r);c.setDate(r.getDate()-1),n=i.toDateString()===c.toDateString()?"Yesterday":i.toLocaleDateString("en-IN",{day:"numeric",month:"long"})}return t[n]||(t[n]=[]),t[n].push(o),t},{});return e.jsxs("div",{className:"notifs-page",children:[e.jsxs("div",{className:"notifs-header",children:[e.jsx("h1",{children:"🔔 Notifications"}),s.length>0&&e.jsxs("span",{className:"notif-count",children:[s.length," total"]})]}),m?e.jsx("div",{className:"notifs-list",children:[1,2,3,4,5].map(t=>e.jsx("div",{className:"notif-skeleton"},t))}):s.length===0?e.jsxs("div",{className:"empty-state",children:[e.jsx("span",{children:"🔔"}),e.jsx("p",{children:"You're all caught up! No new notifications."})]}):e.jsx("div",{className:"notifs-list",children:Object.entries(g).map(([t,o])=>e.jsxs("div",{children:[e.jsx("div",{className:"notif-group-label",children:t}),o.map(i=>e.jsxs("div",{className:`notif-row ${i.is_read?"":"unread"}`,children:[e.jsx("span",{className:"notif-icon",children:j[i.type]||"🔔"}),e.jsxs("div",{className:"notif-body",children:[e.jsx("p",{className:"notif-title",children:i.title}),e.jsx("p",{className:"notif-msg",children:i.message})]}),e.jsx("span",{className:"notif-time",children:v(i.created_at)}),!i.is_read&&e.jsx("span",{className:"unread-dot"})]},i.id))]},t))}),e.jsx("style",{children:`
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
      `})]})}export{k as default};
