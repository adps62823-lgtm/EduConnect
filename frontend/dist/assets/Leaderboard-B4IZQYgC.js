import{j as e}from"./motion-fY2R9ZPd.js";import{r as o,e as v}from"./vendor-CqT0HC8A.js";import{u as S,g as b}from"./index-BHg4HUyF.js";import"./icons-DDCQ9aL8.js";const _={weekly:"This Week",monthly:"This Month",all_time:"All Time"},f=["#f59e0b","#94a3b8","#cd7c3f"],u=["🥇","🥈","🥉"];function R({user:a,rank:t}){const l=v(),i=["120px","100px","90px"],c=["0","20px 0 0","20px 0 0"];return e.jsxs("div",{className:"top3-card",style:{marginTop:c[t]},onClick:()=>l(`/profile/${a.username}`),children:[e.jsx("div",{className:"top3-rank-icon",children:u[t]}),e.jsx("div",{className:"top3-avatar-wrap",style:{border:`3px solid ${f[t]}`},children:e.jsx("img",{src:a.avatar_url||`https://api.dicebear.com/7.x/initials/svg?seed=${a.name}&backgroundColor=0a7ea4,7c3aed,059669`,alt:a.name,style:{width:i[t],height:i[t]},className:"top3-avatar"})}),e.jsx("p",{className:"top3-name",children:a.name}),e.jsxs("p",{className:"top3-handle",children:["@",a.username]}),e.jsx("div",{className:"top3-score",style:{color:f[t]},children:a.score}),e.jsxs("div",{className:"top3-meta",children:[a.streak>0&&e.jsxs("span",{children:["🔥",a.streak]}),a.exam_target&&e.jsx("span",{children:a.exam_target})]}),a.is_me&&e.jsx("div",{className:"top3-you-badge",children:"You"})]})}function L({user:a,rank:t}){const l=v(),i=t<=3;return e.jsxs("div",{className:`lb-row ${a.is_me?"me":""} ${i?"top3":""}`,onClick:()=>l(`/profile/${a.username}`),children:[e.jsx("span",{className:"lb-rank",children:t<=3?u[t-1]:e.jsxs("span",{className:"rank-num",children:["#",t]})}),e.jsx("img",{src:a.avatar_url||`https://api.dicebear.com/7.x/initials/svg?seed=${a.name}`,alt:"",className:"lb-avatar"}),e.jsxs("div",{className:"lb-info",children:[e.jsxs("span",{className:"lb-name",children:[a.name," ",a.is_me&&e.jsx("span",{className:"you-chip",children:"You"})]}),e.jsxs("span",{className:"lb-sub",children:["@",a.username," ",a.exam_target&&`· ${a.exam_target}`]})]}),e.jsxs("div",{className:"lb-right",children:[a.streak>0&&e.jsxs("span",{className:"lb-streak",children:["🔥",a.streak]}),e.jsx("span",{className:"lb-score",children:a.score}),e.jsx("span",{className:"lb-score-label",children:"pts"})]})]})}function E(){const{user:a}=S(),[t,l]=o.useState("weekly"),[i,c]=o.useState([]),[j,x]=o.useState(!0),[d,y]=o.useState(null),[p,w]=o.useState(null);o.useEffect(()=>{x(!0),Promise.all([b.getLeaderboard({scope:t}),b.getMyStats()]).then(([s,n])=>{const h=s.data||[];c(h);const g=h.findIndex(z=>z.is_me);w(g>=0?g+1:null),y(n.data)}).catch(()=>{}).finally(()=>x(!1))},[t]);const r=i.slice(0,3),m=i.slice(3),k=r.length>=3?[r[1],r[0],r[2]]:r.length===2?[r[1],r[0]]:r,N=r.length>=3?[1,0,2]:r.length===2?[1,0]:[0];return e.jsxs("div",{className:"leaderboard-page",children:[e.jsxs("div",{className:"lb-header",children:[e.jsxs("div",{children:[e.jsx("h1",{children:"🏆 Leaderboard"}),e.jsx("p",{children:"Top students ranked by activity and reputation"})]}),d&&e.jsxs("div",{className:"my-stats-card",children:[e.jsxs("div",{className:"ms-item",children:[e.jsx("strong",{children:d.reputation}),e.jsx("span",{children:"Rep"})]}),e.jsxs("div",{className:"ms-item",children:[e.jsx("strong",{children:d.help_points}),e.jsx("span",{children:"Points"})]}),e.jsxs("div",{className:"ms-item",children:[e.jsxs("strong",{children:["🔥",d.current_streak]}),e.jsx("span",{children:"Streak"})]}),p&&e.jsxs("div",{className:"ms-item accent",children:[e.jsxs("strong",{children:["#",p]}),e.jsx("span",{children:"Rank"})]})]})]}),e.jsx("div",{className:"scope-tabs",children:Object.entries(_).map(([s,n])=>e.jsx("button",{className:`scope-tab ${t===s?"active":""}`,onClick:()=>l(s),children:n},s))}),j?e.jsx("div",{className:"lb-loading",children:[1,2,3,4,5].map(s=>e.jsx("div",{className:"lb-skeleton"},s))}):i.length===0?e.jsxs("div",{className:"empty-state",children:[e.jsx("span",{children:"🏆"}),e.jsx("p",{children:"No data yet. Start posting and answering to appear here!"})]}):e.jsxs(e.Fragment,{children:[r.length>0&&e.jsx("div",{className:"podium",children:k.map((s,n)=>s&&e.jsx(R,{user:s,rank:N[n]},s.id))}),m.length>0&&e.jsx("div",{className:"lb-list",children:m.map((s,n)=>e.jsx(L,{user:s,rank:n+4},s.id))}),!p&&a&&e.jsx("div",{className:"not-ranked",children:e.jsx("span",{children:"You're not on the leaderboard yet — post, answer questions, and check in daily!"})})]}),e.jsx("style",{children:`
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
      `})]})}export{E as default};
