import{j as e}from"./motion-fY2R9ZPd.js";import{e as z,r as c}from"./vendor-CqT0HC8A.js";import{u as S,g}from"./index-BHg4HUyF.js";import"./icons-DDCQ9aL8.js";function _({current:o,max:i}){const t=i?Math.min(100,Math.round(o/i*100)):0;return e.jsx("div",{className:"streak-bar-track",children:e.jsx("div",{className:"streak-bar-fill",style:{width:`${t}%`}})})}function C({activityDates:o=[]}){const i=new Date,t=[];for(let s=29;s>=0;s--){const n=new Date(i);n.setDate(i.getDate()-s);const m=n.toISOString().split("T")[0];t.push({iso:m,active:o.includes(m),isToday:s===0})}const p=["S","M","T","W","T","F","S"];return e.jsxs("div",{className:"calendar-strip",children:[e.jsx("div",{className:"cal-week-labels",children:p.map((s,n)=>e.jsx("span",{children:s},n))}),e.jsx("div",{className:"cal-grid",children:t.map(s=>e.jsx("div",{className:`cal-day ${s.active?"active":""} ${s.isToday?"today":""}`,title:s.iso},s.iso))})]})}function W(){var v;const{user:o}=S(),i=z(),[t,p]=c.useState([]),[s,n]=c.useState(null),[m,w]=c.useState(!0),[x,b]=c.useState(!1),[f,u]=c.useState("");c.useEffect(()=>{Promise.all([g.streakWars(),g.getMyStreak()]).then(([a,r])=>{p(a.data||[]),n(r.data)}).catch(()=>{}).finally(()=>w(!1))},[]);const y=async()=>{var a,r;if(!x)try{const d=await g.checkIn(),{streak:l,points_earned:M,message:N}=d.data;u(N),b(!0),n(h=>h?{...h,current_streak:l}:{current_streak:l,longest_streak:l,activity_dates:[]}),g.streakWars().then(h=>p(h.data||[]))}catch(d){const l=((r=(a=d.response)==null?void 0:a.data)==null?void 0:r.detail)||"Could not check in.";u(l)}},k=t.find(a=>a.is_me),j=((v=t[0])==null?void 0:v.current_streak)||0;return e.jsxs("div",{className:"streak-wars-page",children:[e.jsx("div",{className:"sw-header",children:e.jsxs("div",{children:[e.jsx("h1",{children:"🔥 Streak Wars"}),e.jsx("p",{children:"Build your daily study habit. Don't break the chain!"})]})}),e.jsxs("div",{className:"my-streak-card",children:[e.jsxs("div",{className:"msc-left",children:[e.jsx("div",{className:"flame-big",children:"🔥"}),e.jsxs("div",{children:[e.jsx("div",{className:"msc-streak-num",children:(s==null?void 0:s.current_streak)??0}),e.jsx("div",{className:"msc-streak-label",children:"day streak"})]})]}),e.jsx("div",{className:"msc-divider"}),e.jsxs("div",{className:"msc-stats",children:[e.jsxs("div",{className:"msc-stat",children:[e.jsx("strong",{children:(s==null?void 0:s.longest_streak)??0}),e.jsx("span",{children:"Best"})]}),e.jsxs("div",{className:"msc-stat",children:[k?e.jsxs("strong",{children:["#",t.indexOf(k)+1]}):e.jsx("strong",{children:"—"}),e.jsx("span",{children:"Rank"})]})]}),e.jsx("div",{className:"msc-divider"}),e.jsxs("div",{className:"msc-checkin",children:[e.jsx("button",{className:`btn-checkin ${x?"done":""}`,onClick:y,disabled:x,children:x?"✓ Checked In!":"Check In Today"}),f&&e.jsx("p",{className:"checkin-msg",children:f})]})]}),s&&e.jsxs("div",{className:"cal-section",children:[e.jsx("h3",{children:"Your Last 30 Days"}),e.jsx(C,{activityDates:s.activity_dates||[]}),e.jsxs("div",{className:"cal-legend",children:[e.jsx("span",{className:"cal-legend-dot active"})," Active day",e.jsx("span",{className:"cal-legend-dot",style:{marginLeft:14}})," Missed"]})]}),e.jsxs("div",{className:"wars-section",children:[e.jsx("h3",{children:"🏆 Streak Rankings"}),m?e.jsx("div",{className:"wars-loading",children:[1,2,3,4,5].map(a=>e.jsx("div",{className:"war-skeleton"},a))}):t.length===0?e.jsxs("div",{className:"empty-state",children:[e.jsx("span",{children:"🔥"}),e.jsx("p",{children:"No one has an active streak yet. Be the first!"})]}):e.jsx("div",{className:"wars-list",children:t.map((a,r)=>e.jsxs("div",{className:`war-row ${a.is_me?"me":""}`,onClick:()=>i(`/profile/${a.username}`),children:[e.jsx("span",{className:"war-rank",children:r===0?"🥇":r===1?"🥈":r===2?"🥉":`#${r+1}`}),e.jsx("img",{src:a.avatar_url||`https://api.dicebear.com/7.x/initials/svg?seed=${a.name}`,alt:"",className:"war-avatar"}),e.jsxs("div",{className:"war-info",children:[e.jsxs("span",{className:"war-name",children:[a.name,a.is_me&&e.jsx("span",{className:"you-chip",children:"You"})]}),e.jsx(_,{current:a.current_streak,max:j})]}),e.jsxs("div",{className:"war-streaks",children:[e.jsxs("span",{className:"war-current",children:["🔥",a.current_streak]}),e.jsxs("span",{className:"war-best",children:["Best: ",a.longest_streak]})]})]},a.id))})]}),e.jsxs("div",{className:"streak-tips",children:[e.jsx("h3",{children:"💡 How to grow your streak"}),e.jsx("div",{className:"tips-grid",children:[["📝","Post daily","Share what you studied today on the feed"],["💬","Answer questions","Help others in the Help Forum"],["📚","Upload resources","Share notes and PYQs with the community"],["🏠","Join study rooms","Study with others and use the Pomodoro timer"]].map(([a,r,d])=>e.jsxs("div",{className:"tip-card",children:[e.jsx("span",{className:"tip-icon",children:a}),e.jsx("strong",{children:r}),e.jsx("p",{children:d})]},r))})]}),e.jsx("style",{children:`
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
      `})]})}export{W as default};
