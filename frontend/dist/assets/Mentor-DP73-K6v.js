import{j as e}from"./motion-fY2R9ZPd.js";import{e as F,r as l}from"./vendor-CqT0HC8A.js";import{u as J,m as y}from"./index-BHg4HUyF.js";import"./icons-DDCQ9aL8.js";const T=["Mathematics","Physics","Chemistry","Biology","English","History","Geography","Economics","Computer Science","Accountancy"],$=["JEE Mains","JEE Advanced","NEET","UPSC","CAT","GATE","CUET","Class 10 Boards","Class 12 Boards","SAT","GRE","GMAT"];function S({value:r=0,max:p=5,onChange:o}){const[c,h]=l.useState(0);return e.jsxs("div",{className:"star-rating",children:[Array.from({length:p},(n,m)=>m+1).map(n=>e.jsx("span",{className:`star ${n<=(c||r)?"filled":""}`,onClick:()=>o==null?void 0:o(n),onMouseEnter:()=>o&&h(n),onMouseLeave:()=>o&&h(0),children:"★"},n)),r>0&&e.jsx("span",{className:"rating-num",children:r.toFixed(1)})]})}function W({mentor:r,onConnect:p,currentUserId:o}){var m,u,b,f,t,s,d,w,C;const c=F(),h={accepted:"#16a34a",pending:"#f59e0b",rejected:"#e11d48"},n={accepted:"✓ Connected",pending:"⏳ Pending",rejected:"✗ Rejected"};return e.jsxs("div",{className:"mentor-card",children:[e.jsxs("div",{className:"mentor-card-top",children:[e.jsx("img",{src:((m=r.user)==null?void 0:m.avatar_url)||`https://api.dicebear.com/7.x/initials/svg?seed=${(u=r.user)==null?void 0:u.name}&backgroundColor=0a7ea4,7c3aed,059669`,alt:(b=r.user)==null?void 0:b.name,className:"mentor-avatar",onClick:()=>{var x;return c(`/profile/${(x=r.user)==null?void 0:x.username}`)}}),e.jsxs("div",{className:"mentor-info",children:[e.jsx("h3",{onClick:()=>{var x;return c(`/profile/${(x=r.user)==null?void 0:x.username}`)},children:(f=r.user)==null?void 0:f.name}),e.jsxs("p",{className:"mentor-handle",children:["@",(t=r.user)==null?void 0:t.username]}),((s=r.user)==null?void 0:s.grade)&&e.jsxs("span",{className:"mentor-chip",children:["🎓 ",r.user.grade]}),((d=r.user)==null?void 0:d.school)&&e.jsxs("span",{className:"mentor-chip",children:["🏫 ",r.user.school]})]}),e.jsxs("div",{className:"mentor-rating-col",children:[e.jsx(S,{value:r.avg_rating}),e.jsxs("span",{className:"review-count",children:[r.reviews_count," review",r.reviews_count!==1?"s":""]}),r.hourly_rate>0?e.jsxs("span",{className:"rate-badge",children:["₹",r.hourly_rate,"/hr"]}):e.jsx("span",{className:"rate-badge free",children:"Free"})]})]}),e.jsx("p",{className:"mentor-bio",children:r.bio}),e.jsxs("div",{className:"mentor-tags",children:[(w=r.subjects)==null?void 0:w.map(x=>e.jsx("span",{className:"subject-tag",children:x},x)),(C=r.exams)==null?void 0:C.map(x=>e.jsx("span",{className:"exam-tag",children:x},x))]}),r.achievements&&e.jsxs("p",{className:"mentor-achievements",children:["🏆 ",r.achievements]}),r.availability&&e.jsxs("p",{className:"mentor-availability",children:["🕐 ",r.availability]}),e.jsxs("div",{className:"mentor-card-footer",children:[r.is_mine?e.jsx("span",{className:"my-profile-badge",children:"Your mentor profile"}):r.connection_status?e.jsx("span",{className:"conn-status",style:{color:h[r.connection_status]},children:n[r.connection_status]}):e.jsx("button",{className:"btn-connect",onClick:()=>p(r.id),children:"+ Connect"}),e.jsx("button",{className:"btn-view",onClick:()=>c(`/mentor/${r.id}`),children:"View Profile →"})]})]})}function D({onClose:r,onCreated:p}){const[o,c]=l.useState({bio:"",achievements:"",availability:"",hourly_rate:0,subjects:[],exams:[]}),[h,n]=l.useState(!1),[m,u]=l.useState(""),b=(t,s)=>c(d=>({...d,[t]:d[t].includes(s)?d[t].filter(w=>w!==s):[...d[t],s]})),f=async()=>{var t,s;if(!o.bio.trim())return u("Bio is required.");if(o.subjects.length===0)return u("Select at least one subject.");if(o.exams.length===0)return u("Select at least one exam.");n(!0);try{const d=await y.createProfile(o);p(d.data)}catch(d){u(((s=(t=d.response)==null?void 0:t.data)==null?void 0:s.detail)||"Failed to create profile.")}finally{n(!1)}};return e.jsx("div",{className:"modal-backdrop",onClick:r,children:e.jsxs("div",{className:"modal-box wide",onClick:t=>t.stopPropagation(),children:[e.jsxs("div",{className:"modal-header",children:[e.jsx("h3",{children:"🎓 Become a Mentor"}),e.jsx("button",{onClick:r,children:"✕"})]}),e.jsxs("div",{className:"modal-body",children:[e.jsxs("label",{children:["Bio ",e.jsx("span",{className:"req",children:"*"})]}),e.jsx("textarea",{rows:3,placeholder:"Tell students about your experience…",value:o.bio,onChange:t=>c(s=>({...s,bio:t.target.value}))}),e.jsx("label",{children:"Achievements"}),e.jsx("input",{placeholder:"e.g. AIR 142 JEE 2023, 99 percentile CAT",value:o.achievements,onChange:t=>c(s=>({...s,achievements:t.target.value}))}),e.jsx("label",{children:"Availability"}),e.jsx("input",{placeholder:"e.g. Weekdays 6–9 PM, Weekends all day",value:o.availability,onChange:t=>c(s=>({...s,availability:t.target.value}))}),e.jsx("label",{children:"Hourly Rate (₹) — 0 = Free"}),e.jsx("input",{type:"number",min:0,value:o.hourly_rate,onChange:t=>c(s=>({...s,hourly_rate:+t.target.value}))}),e.jsxs("label",{children:["Subjects ",e.jsx("span",{className:"req",children:"*"})]}),e.jsx("div",{className:"chip-picker",children:T.map(t=>e.jsx("span",{className:`chip ${o.subjects.includes(t)?"selected":""}`,onClick:()=>b("subjects",t),children:t},t))}),e.jsxs("label",{children:["Exams ",e.jsx("span",{className:"req",children:"*"})]}),e.jsx("div",{className:"chip-picker",children:$.map(t=>e.jsx("span",{className:`chip ${o.exams.includes(t)?"selected":""}`,onClick:()=>b("exams",t),children:t},t))}),m&&e.jsx("p",{className:"form-error",children:m}),e.jsx("button",{className:"btn-primary full",onClick:f,disabled:h,children:h?"Creating…":"Create Mentor Profile"})]})]})})}function Y({mentorId:r,onClose:p,onReviewed:o}){const[c,h]=l.useState(0),[n,m]=l.useState(""),[u,b]=l.useState(!1),f=async()=>{var t,s;if(c&&n.trim()){b(!0);try{await y.addReview(r,{rating:c,comment:n}),o(),p()}catch(d){alert(((s=(t=d.response)==null?void 0:t.data)==null?void 0:s.detail)||"Could not submit review.")}finally{b(!1)}}};return e.jsx("div",{className:"modal-backdrop",onClick:p,children:e.jsxs("div",{className:"modal-box",onClick:t=>t.stopPropagation(),children:[e.jsxs("div",{className:"modal-header",children:[e.jsx("h3",{children:"⭐ Write a Review"}),e.jsx("button",{onClick:p,children:"✕"})]}),e.jsxs("div",{className:"modal-body",children:[e.jsx("label",{children:"Rating"}),e.jsx(S,{value:c,onChange:h}),e.jsx("label",{children:"Comment"}),e.jsx("textarea",{rows:4,placeholder:"Share your experience with this mentor…",value:n,onChange:t=>m(t.target.value)}),e.jsx("button",{className:"btn-primary full",onClick:f,disabled:u||!c,children:u?"Submitting…":"Submit Review"})]})]})})}function Q(){var P,q;const{user:r}=J();F();const[p,o]=l.useState([]),[c,h]=l.useState(!0),[n,m]=l.useState(null),[u,b]=l.useState(!1),[f,t]=l.useState(null),[s,d]=l.useState({subject:"",exam:"",q:""}),[w,C]=l.useState(1),[x,B]=l.useState(!1),[M,I]=l.useState([]),[z,_]=l.useState("discover"),N=async(a=1,i=!1)=>{var j,v;h(!0);try{const g={page:a,limit:12};s.subject&&(g.subject=s.subject),s.exam&&(g.exam=s.exam);const k=await y.listMentors(g),L=((j=k.data)==null?void 0:j.mentors)||k.data||[];o(H=>i?L:[...H,...L]),B(((v=k.data)==null?void 0:v.has_more)||!1),C(a)}finally{h(!1)}},G=async()=>{try{const a=await y.getMyProfile();m(a.data)}catch{m(null)}},E=async()=>{try{const a=await y.getMyConnections();I(a.data||[])}catch{}};l.useEffect(()=>{N(1,!0),G(),E()},[s.subject,s.exam]);const U=async a=>{var i,j;try{await y.connect(a),o(v=>v.map(g=>g.id===a?{...g,connection_status:"pending"}:g))}catch(v){alert(((j=(i=v.response)==null?void 0:i.data)==null?void 0:j.detail)||"Could not send request.")}},A=async(a,i)=>{try{await y.respondConnection(a,i),E(),N(1,!0)}catch{}},R=s.q?p.filter(a=>{var i,j,v,g;return((j=(i=a.user)==null?void 0:i.name)==null?void 0:j.toLowerCase().includes(s.q.toLowerCase()))||((v=a.bio)==null?void 0:v.toLowerCase().includes(s.q.toLowerCase()))||((g=a.subjects)==null?void 0:g.some(k=>k.toLowerCase().includes(s.q.toLowerCase())))}):p;return e.jsxs("div",{className:"mentor-page",children:[e.jsxs("div",{className:"mentor-header",children:[e.jsxs("div",{children:[e.jsx("h1",{children:"Find a Mentor"}),e.jsx("p",{children:"Connect with experienced students who've aced your target exam"})]}),!n&&e.jsx("button",{className:"btn-become-mentor",onClick:()=>b(!0),children:"🎓 Become a Mentor"})]}),e.jsx("div",{className:"mentor-tabs",children:[["discover","🔍 Discover"],["my-connections","🤝 My Connections"],...n?[["my-profile","👤 My Profile"]]:[]].map(([a,i])=>e.jsx("button",{className:`mentor-tab ${z===a?"active":""}`,onClick:()=>_(a),children:i},a))}),z==="discover"&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"mentor-filters",children:[e.jsx("input",{className:"search-input",placeholder:"🔍 Search mentors, subjects…",value:s.q,onChange:a=>d(i=>({...i,q:a.target.value}))}),e.jsxs("select",{value:s.subject,onChange:a=>d(i=>({...i,subject:a.target.value})),children:[e.jsx("option",{value:"",children:"All Subjects"}),T.map(a=>e.jsx("option",{children:a},a))]}),e.jsxs("select",{value:s.exam,onChange:a=>d(i=>({...i,exam:a.target.value})),children:[e.jsx("option",{value:"",children:"All Exams"}),$.map(a=>e.jsx("option",{children:a},a))]}),(s.subject||s.exam||s.q)&&e.jsx("button",{className:"clear-filters",onClick:()=>d({subject:"",exam:"",q:""}),children:"✕ Clear"})]}),c&&p.length===0?e.jsx("div",{className:"mentor-grid",children:[1,2,3,4,5,6].map(a=>e.jsx("div",{className:"mentor-card skeleton-card"},a))}):R.length===0?e.jsxs("div",{className:"empty-state",children:[e.jsx("span",{children:"🎓"}),e.jsx("p",{children:"No mentors found. Try different filters."})]}):e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"mentor-grid",children:R.map(a=>e.jsx(W,{mentor:a,onConnect:U,currentUserId:r==null?void 0:r.id},a.id))}),x&&e.jsx("button",{className:"load-more",onClick:()=>N(w+1),children:"Load more mentors"})]})]}),z==="my-connections"&&e.jsx("div",{className:"connections-list",children:M.length===0?e.jsxs("div",{className:"empty-state",children:[e.jsx("span",{children:"🤝"}),e.jsx("p",{children:"No connections yet. Find a mentor and send a request!"}),e.jsx("button",{className:"btn-primary",onClick:()=>_("discover"),children:"Browse Mentors"})]}):M.map(a=>{const i=a.mentee_id===(r==null?void 0:r.id);return e.jsxs("div",{className:"conn-card",children:[e.jsxs("div",{className:"conn-info",children:[e.jsxs("strong",{children:["Connection #",a.id.slice(0,8)]}),e.jsx("span",{className:`conn-badge ${a.status}`,children:a.status})]}),e.jsx("div",{className:"conn-time",children:new Date(a.created_at).toLocaleDateString()}),a.status==="pending"&&!i&&e.jsxs("div",{className:"conn-actions",children:[e.jsx("button",{className:"btn-accept",onClick:()=>A(a.id,!0),children:"✓ Accept"}),e.jsx("button",{className:"btn-reject",onClick:()=>A(a.id,!1),children:"✗ Reject"})]}),a.status==="accepted"&&e.jsx("button",{className:"btn-review",onClick:()=>t(a.mentor_id),children:"⭐ Write Review"})]},a.id)})}),z==="my-profile"&&n&&e.jsxs("div",{className:"my-mentor-profile",children:[e.jsxs("div",{className:"mp-hero",children:[e.jsx("img",{src:(r==null?void 0:r.avatar_url)||`https://api.dicebear.com/7.x/initials/svg?seed=${r==null?void 0:r.name}`,alt:"",className:"mp-avatar"}),e.jsxs("div",{children:[e.jsx("h2",{children:r==null?void 0:r.name}),e.jsxs("p",{children:["@",r==null?void 0:r.username]}),e.jsx(S,{value:n.avg_rating}),e.jsxs("span",{className:"review-count",children:[n.reviews_count," reviews"]})]}),e.jsxs("div",{className:"mp-stats",children:[e.jsxs("div",{className:"mp-stat",children:[e.jsx("strong",{children:n.reviews_count}),e.jsx("span",{children:"Reviews"})]}),e.jsxs("div",{className:"mp-stat",children:[e.jsx("strong",{children:n.avg_rating||"—"}),e.jsx("span",{children:"Avg Rating"})]}),e.jsxs("div",{className:"mp-stat",children:[e.jsx("strong",{children:n.hourly_rate>0?`₹${n.hourly_rate}`:"Free"}),e.jsx("span",{children:"Rate"})]})]})]}),e.jsxs("div",{className:"mp-section",children:[e.jsx("h4",{children:"About"}),e.jsx("p",{children:n.bio})]}),n.achievements&&e.jsxs("div",{className:"mp-section",children:[e.jsx("h4",{children:"🏆 Achievements"}),e.jsx("p",{children:n.achievements})]}),n.availability&&e.jsxs("div",{className:"mp-section",children:[e.jsx("h4",{children:"🕐 Availability"}),e.jsx("p",{children:n.availability})]}),e.jsxs("div",{className:"mp-section",children:[e.jsx("h4",{children:"Subjects"}),e.jsx("div",{className:"mentor-tags",children:(P=n.subjects)==null?void 0:P.map(a=>e.jsx("span",{className:"subject-tag",children:a},a))})]}),e.jsxs("div",{className:"mp-section",children:[e.jsx("h4",{children:"Target Exams"}),e.jsx("div",{className:"mentor-tags",children:(q=n.exams)==null?void 0:q.map(a=>e.jsx("span",{className:"exam-tag",children:a},a))})]})]}),u&&e.jsx(D,{onClose:()=>b(!1),onCreated:a=>{m(a),b(!1),N(1,!0)}}),f&&e.jsx(Y,{mentorId:f,onClose:()=>t(null),onReviewed:()=>N(1,!0)}),e.jsx("style",{children:`
        .mentor-page { max-width:1000px;margin:0 auto;padding-bottom:60px; }

        .mentor-header {
          display:flex;justify-content:space-between;align-items:flex-start;
          padding:28px 16px 20px;flex-wrap:wrap;gap:12px;
        }
        .mentor-header h1 { margin:0;font-size:1.6rem;font-weight:800; }
        .mentor-header p  { margin:4px 0 0;color:var(--text-muted);font-size:.95rem; }
        .btn-become-mentor {
          background:linear-gradient(135deg,var(--accent),#7c3aed);color:#fff;
          border:none;padding:10px 22px;border-radius:20px;font-weight:700;cursor:pointer;
          font-size:.95rem;white-space:nowrap;
        }

        .mentor-tabs { display:flex;border-bottom:2px solid var(--border);margin-bottom:20px;padding:0 8px; }
        .mentor-tab { padding:10px 20px;border:none;background:none;cursor:pointer;color:var(--text-muted);font-weight:500;border-bottom:2px solid transparent;margin-bottom:-2px;transition:.15s; }
        .mentor-tab.active { color:var(--accent);border-bottom-color:var(--accent); }

        /* Filters */
        .mentor-filters { display:flex;gap:10px;flex-wrap:wrap;padding:0 16px 20px;align-items:center; }
        .search-input {
          flex:1;min-width:200px;background:var(--bg-elevated);border:1px solid var(--border);
          border-radius:10px;padding:9px 14px;color:var(--text-primary);font-size:.9rem;
        }
        .mentor-filters select {
          background:var(--bg-elevated);border:1px solid var(--border);border-radius:10px;
          padding:9px 12px;color:var(--text-primary);font-size:.88rem;cursor:pointer;
        }
        .clear-filters {
          background:none;border:1px solid var(--border);border-radius:10px;
          padding:8px 14px;cursor:pointer;color:var(--text-muted);font-size:.88rem;
        }

        /* Grid */
        .mentor-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;padding:0 16px; }

        /* Mentor Card */
        .mentor-card {
          background:var(--bg-card);border:1px solid var(--border);border-radius:16px;
          padding:20px;display:flex;flex-direction:column;gap:12px;
          transition:box-shadow .2s,transform .2s;
        }
        .mentor-card:hover { box-shadow:0 4px 20px rgba(0,0,0,.12);transform:translateY(-2px); }
        .skeleton-card { height:280px;animation:shimmer 1.5s infinite ease-in-out;opacity:.5; }
        @keyframes shimmer { 0%,100%{opacity:.4}50%{opacity:.8} }

        .mentor-card-top { display:flex;gap:12px;align-items:flex-start; }
        .mentor-avatar {
          width:60px;height:60px;border-radius:50%;object-fit:cover;cursor:pointer;
          border:2px solid var(--border);flex-shrink:0;
        }
        .mentor-info { flex:1;min-width:0; }
        .mentor-info h3 { margin:0 0 2px;font-size:1rem;font-weight:700;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
        .mentor-info h3:hover { color:var(--accent); }
        .mentor-handle { margin:0 0 6px;font-size:.82rem;color:var(--text-muted); }
        .mentor-chip { display:inline-block;background:var(--bg-elevated);border-radius:20px;padding:2px 8px;font-size:.76rem;color:var(--text-secondary);margin-right:4px; }
        .mentor-rating-col { display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0; }
        .rate-badge { background:var(--bg-elevated);border-radius:20px;padding:3px 10px;font-size:.78rem;font-weight:600;color:var(--text-primary); }
        .rate-badge.free { background:rgba(22,163,74,.12);color:#16a34a; }
        .review-count { font-size:.76rem;color:var(--text-muted); }

        .star-rating { display:flex;align-items:center;gap:2px; }
        .star { font-size:1.1rem;cursor:default;color:var(--border);transition:.1s; }
        .star.filled { color:#f59e0b; }
        .rating-num { font-size:.85rem;font-weight:600;margin-left:4px;color:var(--text-primary); }

        .mentor-bio { margin:0;font-size:.88rem;color:var(--text-secondary);line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden; }
        .mentor-tags { display:flex;flex-wrap:wrap;gap:6px; }
        .subject-tag { background:color-mix(in srgb,var(--accent) 12%,transparent);color:var(--accent);border-radius:20px;padding:3px 10px;font-size:.78rem;font-weight:500; }
        .exam-tag { background:color-mix(in srgb,#7c3aed 12%,transparent);color:#7c3aed;border-radius:20px;padding:3px 10px;font-size:.78rem;font-weight:500; }
        .mentor-achievements,.mentor-availability { margin:0;font-size:.83rem;color:var(--text-muted); }

        .mentor-card-footer { display:flex;align-items:center;justify-content:space-between;padding-top:8px;border-top:1px solid var(--border);margin-top:auto; }
        .btn-connect {
          background:var(--accent);color:#fff;border:none;padding:7px 18px;
          border-radius:20px;font-weight:600;cursor:pointer;font-size:.88rem;
        }
        .btn-view { background:none;border:1px solid var(--border);padding:7px 16px;border-radius:20px;cursor:pointer;color:var(--text-secondary);font-size:.88rem; }
        .btn-view:hover { background:var(--bg-elevated); }
        .my-profile-badge { font-size:.82rem;color:var(--accent);font-weight:600; }
        .conn-status { font-size:.88rem;font-weight:600; }

        /* Connections list */
        .connections-list { padding:0 16px;display:flex;flex-direction:column;gap:12px; }
        .conn-card {
          background:var(--bg-card);border:1px solid var(--border);border-radius:14px;
          padding:16px 20px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;
        }
        .conn-info { flex:1;display:flex;align-items:center;gap:10px; }
        .conn-info strong { font-size:.9rem; }
        .conn-badge { padding:3px 10px;border-radius:20px;font-size:.78rem;font-weight:600; }
        .conn-badge.pending  { background:#fef3c7;color:#92400e; }
        .conn-badge.accepted { background:#dcfce7;color:#166534; }
        .conn-badge.rejected { background:#fee2e2;color:#991b1b; }
        .conn-time { font-size:.82rem;color:var(--text-muted); }
        .conn-actions { display:flex;gap:8px; }
        .btn-accept { background:#16a34a;color:#fff;border:none;padding:6px 16px;border-radius:20px;cursor:pointer;font-weight:600;font-size:.85rem; }
        .btn-reject { background:#e11d48;color:#fff;border:none;padding:6px 16px;border-radius:20px;cursor:pointer;font-weight:600;font-size:.85rem; }
        .btn-review { background:none;border:1px solid var(--border);padding:6px 14px;border-radius:20px;cursor:pointer;font-size:.85rem; }

        /* My mentor profile */
        .my-mentor-profile { padding:0 16px;display:flex;flex-direction:column;gap:20px; }
        .mp-hero { background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:24px;display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap; }
        .mp-avatar { width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid var(--border); }
        .mp-hero > div:nth-child(2) { flex:1; }
        .mp-hero h2 { margin:0 0 4px;font-size:1.3rem; }
        .mp-hero p  { margin:0 0 8px;color:var(--text-muted); }
        .mp-stats { display:flex;gap:20px;margin-left:auto; }
        .mp-stat { text-align:center; }
        .mp-stat strong { display:block;font-size:1.2rem;font-weight:800;color:var(--accent); }
        .mp-stat span { font-size:.78rem;color:var(--text-muted); }
        .mp-section { background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:18px 20px; }
        .mp-section h4 { margin:0 0 10px;font-size:.95rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;font-size:.8rem; }
        .mp-section p { margin:0;line-height:1.6;color:var(--text-secondary); }

        /* Modals */
        .modal-backdrop { position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px; }
        .modal-box { background:var(--bg-card);border-radius:16px;width:100%;max-width:440px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden; }
        .modal-box.wide { max-width:600px; }
        .modal-header { display:flex;justify-content:space-between;align-items:center;padding:18px 20px;border-bottom:1px solid var(--border);flex-shrink:0; }
        .modal-header h3 { margin:0;font-size:1.1rem; }
        .modal-header button { background:none;border:none;cursor:pointer;font-size:1.2rem;color:var(--text-muted); }
        .modal-body { padding:20px;overflow-y:auto;display:flex;flex-direction:column;gap:12px; }
        .modal-body label { font-size:.85rem;font-weight:600;color:var(--text-secondary);margin-bottom:-6px; }
        .modal-body input,.modal-body textarea,.modal-body select {
          background:var(--bg-elevated);border:1px solid var(--border);border-radius:10px;
          padding:9px 12px;color:var(--text-primary);font-size:.9rem;width:100%;box-sizing:border-box;
        }
        .modal-body textarea { resize:vertical; }
        .req { color:#e11d48; }
        .chip-picker { display:flex;flex-wrap:wrap;gap:8px; }
        .chip {
          padding:5px 12px;border-radius:20px;font-size:.82rem;cursor:pointer;
          border:1px solid var(--border);color:var(--text-secondary);transition:.15s;
        }
        .chip:hover { border-color:var(--accent);color:var(--accent); }
        .chip.selected { background:var(--accent);color:#fff;border-color:var(--accent); }
        .form-error { color:#e11d48;font-size:.85rem;margin:0; }
        .btn-primary { background:var(--accent);color:#fff;border:none;padding:10px 20px;border-radius:10px;cursor:pointer;font-weight:600;font-size:.95rem; }
        .btn-primary.full { width:100%;text-align:center; }
        .btn-primary:disabled { opacity:.6;cursor:not-allowed; }

        /* Empty state */
        .empty-state { display:flex;flex-direction:column;align-items:center;padding:60px 20px;gap:14px;color:var(--text-muted); }
        .empty-state span { font-size:3rem; }
        .empty-state p { font-size:1rem; }
        .load-more {
          display:block;margin:20px auto;padding:12px 32px;
          background:var(--bg-elevated);border:1px solid var(--border);
          border-radius:20px;cursor:pointer;color:var(--text-secondary);font-size:.9rem;
        }

        @media(max-width:600px) {
          .mentor-grid { grid-template-columns:1fr; }
          .mentor-header { flex-direction:column; }
          .mp-hero { flex-direction:column; }
          .mp-stats { margin-left:0; }
        }
      `})]})}export{Q as default};
