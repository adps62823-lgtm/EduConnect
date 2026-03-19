import{j as e}from"./motion-fY2R9ZPd.js";import{f as O,e as Q,r as n,L as V}from"./vendor-CqT0HC8A.js";import{u as X,p as b,b as E,f as $}from"./index-BHg4HUyF.js";import"./icons-DDCQ9aL8.js";const Z=r=>{const d=(Date.now()-new Date(r))/1e3;return d<60?"just now":d<3600?`${Math.floor(d/60)}m ago`:d<86400?`${Math.floor(d/3600)}h ago`:`${Math.floor(d/86400)}d ago`},ee=r=>Math.max(0,Math.ceil((new Date(r)-new Date)/864e5));function ae({post:r,onDelete:d,currentUserId:x}){var _,C;const[u,h]=n.useState(!1),[l,o]=n.useState([]),[p,y]=n.useState(""),[v,L]=n.useState(r.is_liked),[w,j]=n.useState(r.likes_count),P=async()=>{try{const s=await $.likePost(r.id);L(s.liked),j(s.likes_count)}catch{}},F=async()=>{if(!u){const s=await $.getComments(r.id);o(s.comments||[])}h(s=>!s)},N=async s=>{if(s.preventDefault(),!p.trim())return;const g=await $.addComment(r.id,{content:p});o(i=>[...i,g]),y("")};return e.jsxs("div",{className:"profile-post-card",children:[((_=r.images)==null?void 0:_.length)>0&&e.jsx("div",{className:`post-images count-${Math.min(r.images.length,4)}`,children:r.images.slice(0,4).map((s,g)=>e.jsx("img",{src:s,alt:""},g))}),r.content&&e.jsx("p",{className:"post-content",children:r.content}),((C=r.tags)==null?void 0:C.length)>0&&e.jsx("div",{className:"post-tags",children:r.tags.map(s=>e.jsxs("span",{className:"tag",children:["#",s]},s))}),e.jsxs("div",{className:"post-actions",children:[e.jsxs("button",{className:`action-btn ${v?"liked":""}`,onClick:P,children:[v?"❤️":"🤍"," ",w]}),e.jsxs("button",{className:"action-btn",onClick:F,children:["💬 ",r.comments_count]}),r.is_mine&&e.jsx("button",{className:"action-btn danger",onClick:()=>d(r.id),children:"🗑️"}),e.jsx("span",{className:"post-time",children:Z(r.created_at)})]}),u&&e.jsxs("div",{className:"comments-section",children:[l.map(s=>{var g,i,k;return e.jsxs("div",{className:"comment",children:[e.jsx("img",{src:((g=s.author)==null?void 0:g.avatar_url)||`https://api.dicebear.com/7.x/initials/svg?seed=${(i=s.author)==null?void 0:i.name}`,alt:"",className:"comment-avatar"}),e.jsxs("div",{children:[e.jsx("span",{className:"comment-author",children:(k=s.author)==null?void 0:k.name}),e.jsxs("span",{className:"comment-text",children:[" ",s.content]})]})]},s.id)}),e.jsxs("form",{onSubmit:N,className:"comment-form",children:[e.jsx("input",{value:p,onChange:s=>y(s.target.value),placeholder:"Write a comment…"}),e.jsx("button",{type:"submit",children:"Send"})]})]})]})}function te({username:r,type:d,onClose:x}){const[u,h]=n.useState([]);return n.useEffect(()=>{(d==="followers"?b.getFollowers:b.getFollowing)(r).then(h).catch(()=>setLoading(!1))},[r,d]),e.jsx("div",{className:"modal-backdrop",onClick:x,children:e.jsxs("div",{className:"modal-box",onClick:l=>l.stopPropagation(),children:[e.jsxs("div",{className:"modal-header",children:[e.jsx("h3",{children:d==="followers"?"Followers":"Following"}),e.jsx("button",{onClick:x,children:"✕"})]}),e.jsxs("div",{className:"modal-list",children:[u.map(l=>e.jsxs(V,{to:`/profile/${l.username}`,onClick:x,className:"modal-user",children:[e.jsx("img",{src:l.avatar_url||`https://api.dicebear.com/7.x/initials/svg?seed=${l.name}`,alt:""}),e.jsxs("div",{children:[e.jsx("strong",{children:l.name}),e.jsxs("span",{children:["@",l.username]})]}),l.is_following&&e.jsx("span",{className:"following-badge",children:"Following"})]},l.id)),u.length===0&&e.jsxs("p",{className:"empty-state",children:["No ",d," yet."]})]})]})})}function ie(){const{username:r}=O(),d=Q(),{user:x,updateUser:u}=X(),h=n.useRef(),l=n.useRef(),[o,p]=n.useState(null),[y,v]=n.useState([]),[L,w]=n.useState(!0),[j,P]=n.useState("posts"),[F,N]=n.useState(null),[_,C]=n.useState(!1),[s,g]=n.useState(!1),[i,k]=n.useState(!1),[m,M]=n.useState({}),[z,D]=n.useState({exam_name:"",exam_date:""}),[R,A]=n.useState(!1),[U,I]=n.useState(1),f=(x==null?void 0:x.username)===r;n.useEffect(()=>{w(!0),P("posts"),b.getProfile(r).then(a=>{p(a),C(a.is_following),M({name:a.name,bio:a.bio||"",grade:a.grade||"",school:a.school||"",exam_target:a.exam_target||"",study_status:a.study_status||""})}).catch(()=>w(!1)).finally(()=>w(!1))},[r]),n.useEffect(()=>{o&&b.getUserPosts(r,{page:1,limit:12}).then(a=>{v(a.posts||[]),A(a.has_more),I(1)}).catch(()=>w(!1))},[o==null?void 0:o.id]);const W=async()=>{const a=await b.getUserPosts(r,{page:U+1,limit:12});v(t=>[...t,...a.posts||[]]),A(a.has_more),I(t=>t+1)},B=async()=>{if(!s){g(!0);try{const a=await E.follow(o.id);C(a.following),p(t=>({...t,followers_count:a.following?t.followers_count+1:t.followers_count-1}))}finally{g(!1)}}},G=async a=>{const t=a.target.files[0];if(!t)return;const c=await E.uploadAvatar(t);p(S=>({...S,avatar_url:c.avatar_url})),u({avatar_url:c.avatar_url})},H=async a=>{const t=a.target.files[0];if(!t)return;const c=await E.uploadCover(t);p(S=>({...S,cover_url:c.cover_url}))},J=async()=>{const a=await E.updateMe(m);p(t=>({...t,...a})),u(a),k(!1)},T=async a=>{confirm("Delete this post?")&&(await $.deletePost(a),v(t=>t.filter(c=>c.id!==a)),p(t=>({...t,posts_count:t.posts_count-1})))},Y=async()=>{if(!z.exam_name||!z.exam_date)return;const a=await b.addCountdown(z);p(t=>({...t,exam_countdowns:[...t.exam_countdowns||[],a]})),D({exam_name:"",exam_date:""})},q=async a=>{await b.deleteCountdown(a),p(t=>({...t,exam_countdowns:t.exam_countdowns.filter(c=>c.id!==a)}))};if(L)return e.jsxs("div",{className:"profile-loading",children:[e.jsx("div",{className:"skeleton cover-skel"}),e.jsx("div",{className:"skeleton avatar-skel"}),e.jsx("div",{className:"skeleton name-skel"}),e.jsx("div",{className:"skeleton line-skel"})]});if(!o)return null;const K=o.avatar_url||`https://api.dicebear.com/7.x/initials/svg?seed=${o.name}&backgroundColor=0a7ea4,7c3aed,059669,dc2626`;return e.jsxs("div",{className:"profile-page",children:[e.jsxs("div",{className:"profile-cover",style:o.cover_url?{backgroundImage:`url(${o.cover_url})`}:{},children:[e.jsx("div",{className:"cover-overlay"}),f&&e.jsxs(e.Fragment,{children:[e.jsx("button",{className:"cover-edit-btn",onClick:()=>l.current.click(),children:"📷 Edit cover"}),e.jsx("input",{ref:l,type:"file",accept:"image/*",hidden:!0,onChange:H})]})]}),e.jsxs("div",{className:"profile-header-card",children:[e.jsxs("div",{className:"profile-avatar-wrap",children:[e.jsx("img",{src:K,alt:o.name,className:"profile-avatar-img"}),f&&e.jsxs(e.Fragment,{children:[e.jsx("button",{className:"avatar-edit-btn",onClick:()=>h.current.click(),children:"✏️"}),e.jsx("input",{ref:h,type:"file",accept:"image/*",hidden:!0,onChange:G})]})]}),e.jsxs("div",{className:"profile-identity",children:[i?e.jsx("input",{className:"edit-name-input",value:m.name,onChange:a=>M(t=>({...t,name:a.target.value}))}):e.jsxs("h1",{className:"profile-name",children:[o.name,o.is_verified&&e.jsx("span",{className:"verified-badge",children:"✓"}),o.role==="mentor"&&e.jsx("span",{className:"mentor-badge",children:"Mentor"})]}),e.jsxs("p",{className:"profile-username",children:["@",o.username]}),i?e.jsx("textarea",{className:"edit-bio-input",value:m.bio,rows:2,onChange:a=>M(t=>({...t,bio:a.target.value})),placeholder:"Write a bio…"}):o.bio&&e.jsx("p",{className:"profile-bio",children:o.bio}),e.jsxs("div",{className:"profile-meta-chips",children:[(i?m.grade:o.grade)&&e.jsxs("span",{className:"meta-chip",children:["🎓 ",i?m.grade:o.grade]}),(i?m.exam_target:o.exam_target)&&e.jsxs("span",{className:"meta-chip",children:["🎯 ",i?m.exam_target:o.exam_target]}),(i?m.school:o.school)&&e.jsxs("span",{className:"meta-chip",children:["🏫 ",i?m.school:o.school]}),(i?m.study_status:o.study_status)&&e.jsxs("span",{className:"meta-chip status",children:["📚 ",i?m.study_status:o.study_status]})]})]}),e.jsx("div",{className:"profile-actions-col",children:f?i?e.jsxs("div",{className:"edit-actions",children:[e.jsx("button",{className:"btn-primary",onClick:J,children:"Save"}),e.jsx("button",{className:"btn-ghost",onClick:()=>k(!1),children:"Cancel"})]}):e.jsx("button",{className:"btn-outline",onClick:()=>k(!0),children:"✏️ Edit Profile"}):e.jsxs("div",{className:"visitor-actions",children:[e.jsx("button",{className:`btn-follow ${_?"following":""}`,onClick:B,disabled:s,children:_?"✓ Following":"+ Follow"}),e.jsx("button",{className:"btn-outline",onClick:()=>d("/chat"),children:"💬 Message"})]})})]}),i&&e.jsx("div",{className:"edit-fields-row",children:[["Grade (e.g. Class 12)","grade"],["Exam target","exam_target"],["School / College","school"],["Study status","study_status"]].map(([a,t])=>e.jsx("input",{placeholder:a,value:m[t],onChange:c=>M(S=>({...S,[t]:c.target.value}))},t))}),e.jsx("div",{className:"profile-stats-row",children:[{label:"Posts",value:o.posts_count,click:null},{label:"Followers",value:o.followers_count,click:()=>N("followers")},{label:"Following",value:o.following_count,click:()=>N("following")},{label:"Reputation",value:o.reputation,click:null},{label:"Points",value:o.help_points,click:null},{label:"Streak",value:`🔥 ${o.streak||0}`,click:null}].map(({label:a,value:t,click:c})=>e.jsxs("div",{className:`stat-item ${c?"clickable":""}`,onClick:c||void 0,children:[e.jsx("strong",{children:t}),e.jsx("span",{children:a})]},a))}),e.jsx("div",{className:"profile-tabs",children:[["posts","📝 Posts"],["badges","🏅 Badges"],["countdowns","⏳ Exams"]].map(([a,t])=>e.jsx("button",{className:`profile-tab ${j===a?"active":""}`,onClick:()=>P(a),children:t},a))}),j==="posts"&&e.jsxs("div",{className:"profile-posts-grid",children:[y.length===0&&e.jsxs("div",{className:"empty-posts",children:[e.jsx("span",{children:"📭"}),e.jsx("p",{children:f?"You haven't posted yet.":"No posts yet."}),f&&e.jsx("button",{className:"btn-primary",onClick:()=>d("/feed"),children:"Create first post"})]}),y.map(a=>e.jsx(ae,{post:a,onDelete:T,currentUserId:x==null?void 0:x.id},a.id)),R&&e.jsx("button",{className:"load-more-btn",onClick:W,children:"Load more"})]}),j==="badges"&&e.jsxs("div",{className:"badges-grid",children:[(o.badges||[]).length===0&&e.jsxs("div",{className:"empty-posts",children:[e.jsx("span",{children:"🏅"}),e.jsx("p",{children:"No badges yet — keep contributing!"})]}),(o.badges||[]).map(a=>e.jsxs("div",{className:"badge-card",children:[e.jsx("span",{className:"badge-icon",children:a.icon}),e.jsx("strong",{children:a.name}),e.jsx("p",{children:a.desc})]},a.id))]}),j==="countdowns"&&e.jsxs("div",{className:"countdowns-section",children:[f&&e.jsxs("div",{className:"add-countdown",children:[e.jsx("input",{placeholder:"Exam name (e.g. JEE Mains)",value:z.exam_name,onChange:a=>D(t=>({...t,exam_name:a.target.value}))}),e.jsx("input",{type:"date",value:z.exam_date,onChange:a=>D(t=>({...t,exam_date:a.target.value}))}),e.jsx("button",{className:"btn-primary",onClick:Y,children:"Add"})]}),(o.exam_countdowns||[]).length===0&&e.jsxs("div",{className:"empty-posts",children:[e.jsx("span",{children:"📅"}),e.jsx("p",{children:"No exam countdowns added yet."})]}),(o.exam_countdowns||[]).map(a=>{const t=ee(a.exam_date);return e.jsxs("div",{className:`countdown-card ${t<=30?"urgent":""}`,children:[e.jsxs("div",{className:"countdown-info",children:[e.jsx("strong",{children:a.exam_name}),e.jsx("span",{children:new Date(a.exam_date).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})})]}),e.jsxs("div",{className:"countdown-days",children:[e.jsx("span",{className:"days-num",children:t}),e.jsx("span",{children:"days left"})]}),f&&e.jsx("button",{className:"delete-countdown",onClick:()=>q(a.id),children:"✕"})]},a.id)})]}),F&&e.jsx(te,{username:r,type:F,onClose:()=>N(null)}),e.jsx("style",{children:`
        .profile-page { max-width:900px;margin:0 auto;padding-bottom:60px; }

        .profile-cover {
          height:240px;background:linear-gradient(135deg,var(--accent) 0%,#7c3aed 100%);
          background-size:cover;background-position:center;
          position:relative;border-radius:0 0 16px 16px;overflow:hidden;
        }
        .cover-overlay { position:absolute;inset:0;background:linear-gradient(to bottom,transparent 50%,rgba(0,0,0,.35)); }
        .cover-edit-btn {
          position:absolute;bottom:12px;right:12px;background:rgba(0,0,0,.55);color:#fff;
          border:none;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:.82rem;backdrop-filter:blur(4px);
        }

        .profile-header-card {
          display:flex;align-items:flex-start;gap:20px;padding:0 24px 20px;
          margin-top:-52px;position:relative;flex-wrap:wrap;
        }
        .profile-avatar-wrap { position:relative;flex-shrink:0; }
        .profile-avatar-img {
          width:112px;height:112px;border-radius:50%;border:4px solid var(--bg-card);
          object-fit:cover;background:var(--bg-elevated);display:block;
        }
        .avatar-edit-btn {
          position:absolute;bottom:4px;right:4px;background:var(--accent);border:none;
          border-radius:50%;width:28px;height:28px;cursor:pointer;font-size:.8rem;
        }
        .profile-identity { flex:1;min-width:200px;padding-top:58px; }
        .profile-name { font-size:1.45rem;font-weight:700;margin:0;display:flex;align-items:center;gap:8px; }
        .verified-badge { background:var(--accent);color:#fff;border-radius:50%;width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;font-size:.7rem; }
        .mentor-badge { background:#16a34a;color:#fff;font-size:.72rem;padding:2px 8px;border-radius:12px;font-weight:600; }
        .profile-username { color:var(--text-muted);margin:2px 0 8px;font-size:.92rem; }
        .profile-bio { font-size:.95rem;color:var(--text-secondary);margin:4px 0 10px;line-height:1.55; }
        .profile-meta-chips { display:flex;flex-wrap:wrap;gap:6px;margin-top:8px; }
        .meta-chip { background:var(--bg-elevated);padding:4px 10px;border-radius:20px;font-size:.8rem;color:var(--text-secondary); }
        .meta-chip.status { background:color-mix(in srgb,var(--accent) 15%,transparent);color:var(--accent); }

        .profile-actions-col { padding-top:68px; }
        .btn-follow { background:var(--accent);color:#fff;border:none;padding:9px 22px;border-radius:20px;font-weight:600;cursor:pointer;transition:.2s; }
        .btn-follow.following { background:var(--bg-elevated);color:var(--text-primary);border:1px solid var(--border); }
        .btn-outline { background:transparent;border:1px solid var(--border);color:var(--text-primary);padding:8px 18px;border-radius:20px;cursor:pointer;font-weight:500; }
        .visitor-actions { display:flex;gap:10px;flex-wrap:wrap; }
        .edit-actions { display:flex;gap:8px; }
        .btn-primary { background:var(--accent);color:#fff;border:none;padding:9px 20px;border-radius:10px;cursor:pointer;font-weight:600; }
        .btn-ghost { background:transparent;border:none;color:var(--text-muted);cursor:pointer;padding:8px 12px; }

        .edit-name-input,.edit-bio-input {
          width:100%;background:var(--bg-elevated);border:1px solid var(--accent);
          border-radius:8px;padding:5px 10px;color:var(--text-primary);font-weight:700;font-size:1.3rem;
        }
        .edit-bio-input { font-size:.95rem;font-weight:400;resize:none;margin-top:6px; }
        .edit-fields-row { display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:0 24px 16px; }
        .edit-fields-row input {
          background:var(--bg-elevated);border:1px solid var(--border);
          border-radius:8px;padding:9px 12px;color:var(--text-primary);font-size:.9rem;
        }

        .profile-stats-row { display:flex;border-top:1px solid var(--border);border-bottom:1px solid var(--border);margin:0 0 16px; }
        .stat-item { flex:1;display:flex;flex-direction:column;align-items:center;padding:14px 6px;gap:3px;border-right:1px solid var(--border); }
        .stat-item:last-child { border-right:none; }
        .stat-item strong { font-size:1.05rem;font-weight:700;color:var(--text-primary); }
        .stat-item span { font-size:.73rem;color:var(--text-muted); }
        .stat-item.clickable { cursor:pointer; }
        .stat-item.clickable:hover { background:var(--bg-elevated); }

        .profile-tabs { display:flex;border-bottom:2px solid var(--border);margin-bottom:20px;padding:0 8px; }
        .profile-tab { padding:10px 20px;border:none;background:none;cursor:pointer;color:var(--text-muted);font-weight:500;border-bottom:2px solid transparent;margin-bottom:-2px;transition:.15s; }
        .profile-tab.active { color:var(--accent);border-bottom-color:var(--accent); }

        .profile-posts-grid { padding:0 16px;display:flex;flex-direction:column;gap:16px; }
        .profile-post-card { background:var(--bg-card);border-radius:14px;overflow:hidden;border:1px solid var(--border); }
        .post-images { display:grid;gap:2px; }
        .post-images.count-1 { grid-template-columns:1fr; }
        .post-images.count-2 { grid-template-columns:1fr 1fr; }
        .post-images.count-3 { grid-template-columns:2fr 1fr;grid-template-rows:auto auto; }
        .post-images.count-3 img:first-child { grid-row:span 2; }
        .post-images.count-4 { grid-template-columns:1fr 1fr;grid-template-rows:auto auto; }
        .post-images img { width:100%;height:220px;object-fit:cover; }
        .post-content { padding:14px 16px 8px;margin:0;line-height:1.6;white-space:pre-wrap; }
        .post-tags { display:flex;flex-wrap:wrap;gap:4px;padding:0 16px 8px; }
        .tag { color:var(--accent);font-size:.82rem; }
        .post-actions { display:flex;align-items:center;gap:12px;padding:8px 16px 14px;border-top:1px solid var(--border); }
        .action-btn { background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:.9rem;padding:4px 8px;border-radius:8px; }
        .action-btn:hover { background:var(--bg-elevated); }
        .action-btn.liked { color:#e11d48; }
        .action-btn.danger:hover { color:#e11d48; }
        .post-time { margin-left:auto;font-size:.8rem;color:var(--text-muted); }

        .comments-section { padding:0 16px 12px;border-top:1px solid var(--border); }
        .comment { display:flex;gap:8px;align-items:flex-start;padding:7px 0; }
        .comment-avatar { width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0; }
        .comment-author { font-weight:600;font-size:.85rem; }
        .comment-text { font-size:.88rem; }
        .comment-form { display:flex;gap:8px;margin-top:8px; }
        .comment-form input { flex:1;background:var(--bg-elevated);border:1px solid var(--border);border-radius:20px;padding:7px 14px;color:var(--text-primary);font-size:.88rem; }
        .comment-form button { background:var(--accent);color:#fff;border:none;padding:7px 16px;border-radius:20px;cursor:pointer;font-size:.88rem; }

        .badges-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:16px;padding:0 16px; }
        .badge-card { background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:20px 16px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:8px; }
        .badge-icon { font-size:2.2rem; }
        .badge-card strong { font-size:.9rem; }
        .badge-card p { font-size:.78rem;color:var(--text-muted);margin:0; }

        .countdowns-section { padding:0 16px;display:flex;flex-direction:column;gap:12px; }
        .add-countdown { display:flex;gap:10px;flex-wrap:wrap;margin-bottom:4px; }
        .add-countdown input { flex:1;min-width:140px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:10px;padding:9px 12px;color:var(--text-primary);font-size:.9rem; }
        .countdown-card { background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:16px 20px;display:flex;align-items:center;gap:16px; }
        .countdown-card.urgent { border-color:#f97316;background:rgba(249,115,22,.06); }
        .countdown-info { flex:1; }
        .countdown-info strong { display:block;font-size:1rem;margin-bottom:3px; }
        .countdown-info span { font-size:.85rem;color:var(--text-muted); }
        .countdown-days { text-align:center;background:var(--bg-elevated);border-radius:12px;padding:10px 18px; }
        .days-num { display:block;font-size:1.6rem;font-weight:800;color:var(--accent);line-height:1; }
        .countdown-days span { font-size:.72rem;color:var(--text-muted); }
        .delete-countdown { background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:1rem;padding:4px 8px;border-radius:6px; }
        .delete-countdown:hover { color:#e11d48; }

        .modal-backdrop { position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px; }
        .modal-box { background:var(--bg-card);border-radius:16px;width:100%;max-width:400px;max-height:80vh;display:flex;flex-direction:column;overflow:hidden; }
        .modal-header { display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid var(--border); }
        .modal-header h3 { margin:0;font-size:1.05rem; }
        .modal-header button { background:none;border:none;cursor:pointer;font-size:1.2rem;color:var(--text-muted); }
        .modal-list { overflow-y:auto;padding:8px; }
        .modal-user { display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;text-decoration:none;color:var(--text-primary); }
        .modal-user:hover { background:var(--bg-elevated); }
        .modal-user img { width:40px;height:40px;border-radius:50%;object-fit:cover; }
        .modal-user strong { display:block;font-size:.9rem; }
        .modal-user span { font-size:.8rem;color:var(--text-muted); }
        .following-badge { margin-left:auto;background:color-mix(in srgb,var(--accent) 15%,transparent);color:var(--accent);font-size:.75rem;padding:2px 8px;border-radius:12px; }

        .empty-posts { display:flex;flex-direction:column;align-items:center;padding:40px;gap:12px;color:var(--text-muted); }
        .empty-posts span { font-size:2.5rem; }
        .empty-state { text-align:center;color:var(--text-muted);padding:20px; }
        .load-more-btn { width:100%;padding:12px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:10px;cursor:pointer;color:var(--text-secondary); }

        .profile-loading { max-width:900px;margin:0 auto; }
        .skeleton { background:var(--bg-elevated);border-radius:8px;animation:shimmer 1.5s infinite ease-in-out; }
        @keyframes shimmer { 0%,100%{opacity:.5} 50%{opacity:1} }
        .cover-skel { height:240px;border-radius:0 0 16px 16px;display:block; }
        .avatar-skel { width:112px;height:112px;border-radius:50%;margin:-56px 0 0 24px;display:block; }
        .name-skel { height:26px;width:180px;margin:16px 24px 8px;display:block; }
        .line-skel { height:15px;width:280px;margin:0 24px;display:block; }

        @media(max-width:600px) {
          .profile-header-card { flex-direction:column;align-items:center;text-align:center; }
          .profile-actions-col { padding-top:0;width:100%;display:flex;justify-content:center; }
          .edit-fields-row { grid-template-columns:1fr; }
          .stat-item { min-width:30%;font-size:.85rem; }
          .profile-stats-row { flex-wrap:wrap; }
        }
      `})]})}export{ie as default};
