import{j as e}from"./motion-fY2R9ZPd.js";import{r as p}from"./vendor-CqT0HC8A.js";import{u as _,e as w}from"./index-BHg4HUyF.js";import"./icons-DDCQ9aL8.js";function z({value:l=0,max:r=5,onChange:t,size:m="md"}){const[s,c]=p.useState(0),g=m==="sm"?"0.95rem":m==="lg"?"1.5rem":"1.15rem";return e.jsxs("span",{className:"star-row",style:{fontSize:g},children:[Array.from({length:r},(x,u)=>u+1).map(x=>e.jsx("span",{style:{color:x<=(s||l)?"#f59e0b":"var(--border)",cursor:t?"pointer":"default"},onClick:()=>t==null?void 0:t(x),onMouseEnter:()=>t&&c(x),onMouseLeave:()=>t&&c(0),children:"★"},x)),!t&&l>0&&e.jsx("span",{style:{fontSize:"0.82rem",color:"var(--text-muted)",marginLeft:4},children:Number(l).toFixed(1)})]})}function A({label:l,count:r,total:t}){const m=t?Math.round(r/t*100):0;return e.jsxs("div",{className:"rating-bar-row",children:[e.jsxs("span",{className:"rb-label",children:[l,"★"]}),e.jsx("div",{className:"rb-track",children:e.jsx("div",{className:"rb-fill",style:{width:`${m}%`}})}),e.jsx("span",{className:"rb-count",children:r})]})}function q({onClose:l,onAdded:r}){const[t,m]=p.useState({name:"",city:"",state:"",type:"",website:""}),[s,c]=p.useState(!1),[g,x]=p.useState(""),u=async()=>{var i,d;if(!t.name.trim()||!t.city.trim())return x("Name and city are required.");c(!0);try{const o=await w.create(t);r(o.data),l()}catch(o){x(((d=(i=o.response)==null?void 0:i.data)==null?void 0:d.detail)||"Failed to add college.")}finally{c(!1)}};return e.jsx("div",{className:"modal-backdrop",onClick:l,children:e.jsxs("div",{className:"modal-box",onClick:i=>i.stopPropagation(),children:[e.jsxs("div",{className:"modal-header",children:[e.jsx("h3",{children:"🏫 Add a College"}),e.jsx("button",{onClick:l,children:"✕"})]}),e.jsxs("div",{className:"modal-body",children:[e.jsxs("label",{children:["College Name ",e.jsx("span",{className:"req",children:"*"})]}),e.jsx("input",{placeholder:"e.g. IIT Bombay",value:t.name,onChange:i=>m(d=>({...d,name:i.target.value}))}),e.jsxs("div",{className:"form-row",children:[e.jsxs("div",{children:[e.jsxs("label",{children:["City ",e.jsx("span",{className:"req",children:"*"})]}),e.jsx("input",{placeholder:"Mumbai",value:t.city,onChange:i=>m(d=>({...d,city:i.target.value}))})]}),e.jsxs("div",{children:[e.jsx("label",{children:"State"}),e.jsx("input",{placeholder:"Maharashtra",value:t.state,onChange:i=>m(d=>({...d,state:i.target.value}))})]})]}),e.jsxs("div",{className:"form-row",children:[e.jsxs("div",{children:[e.jsx("label",{children:"Type"}),e.jsxs("select",{value:t.type,onChange:i=>m(d=>({...d,type:i.target.value})),children:[e.jsx("option",{value:"",children:"— Select —"}),["IIT","NIT","IIIT","Deemed","Private","State","Central","Medical","Law","Management"].map(i=>e.jsx("option",{children:i},i))]})]}),e.jsxs("div",{children:[e.jsx("label",{children:"Website"}),e.jsx("input",{placeholder:"https://…",value:t.website,onChange:i=>m(d=>({...d,website:i.target.value}))})]})]}),g&&e.jsx("p",{className:"form-error",children:g}),e.jsx("button",{className:"btn-primary full",onClick:u,disabled:s,children:s?"Adding…":"Add College"})]})]})})}function F({college:l,existingReview:r,onClose:t,onSaved:m}){const[s,c]=p.useState({rating:(r==null?void 0:r.rating)||0,title:(r==null?void 0:r.title)||"",pros:(r==null?void 0:r.pros)||"",cons:(r==null?void 0:r.cons)||"",academics:(r==null?void 0:r.academics)||0,placements:(r==null?void 0:r.placements)||0,campus_life:(r==null?void 0:r.campus_life)||0,faculty:(r==null?void 0:r.faculty)||0,course:(r==null?void 0:r.course)||"",year:(r==null?void 0:r.year)||""}),[g,x]=p.useState(!1),[u,i]=p.useState(""),d=async()=>{var o,n;if(!s.rating)return i("Overall rating is required.");x(!0);try{r?await w.updateReview(l.id,r.id,s):await w.addReview(l.id,s),m(),t()}catch(j){i(((n=(o=j.response)==null?void 0:o.data)==null?void 0:n.detail)||"Could not save review.")}finally{x(!1)}};return e.jsx("div",{className:"modal-backdrop",onClick:t,children:e.jsxs("div",{className:"modal-box wide",onClick:o=>o.stopPropagation(),children:[e.jsxs("div",{className:"modal-header",children:[e.jsxs("h3",{children:["✍️ ",r?"Edit":"Write a"," Review — ",l.name]}),e.jsx("button",{onClick:t,children:"✕"})]}),e.jsxs("div",{className:"modal-body",children:[e.jsxs("label",{children:["Overall Rating ",e.jsx("span",{className:"req",children:"*"})]}),e.jsx(z,{value:s.rating,onChange:o=>c(n=>({...n,rating:o})),size:"lg"}),e.jsx("label",{children:"Review Title"}),e.jsx("input",{placeholder:"Summarise your experience",value:s.title,onChange:o=>c(n=>({...n,title:o.target.value}))}),e.jsxs("div",{className:"form-row",children:[e.jsxs("div",{children:[e.jsx("label",{children:"Pros"}),e.jsx("textarea",{rows:3,placeholder:"What's great here?",value:s.pros,onChange:o=>c(n=>({...n,pros:o.target.value}))})]}),e.jsxs("div",{children:[e.jsx("label",{children:"Cons"}),e.jsx("textarea",{rows:3,placeholder:"What could be better?",value:s.cons,onChange:o=>c(n=>({...n,cons:o.target.value}))})]})]}),e.jsx("div",{className:"sub-ratings",children:[["academics","📖 Academics"],["placements","💼 Placements"],["campus_life","🌿 Campus Life"],["faculty","🧑‍🏫 Faculty"]].map(([o,n])=>e.jsxs("div",{className:"sub-rating-row",children:[e.jsx("span",{className:"sub-label",children:n}),e.jsx(z,{value:s[o],onChange:j=>c(N=>({...N,[o]:j}))})]},o))}),e.jsxs("div",{className:"form-row",children:[e.jsxs("div",{children:[e.jsx("label",{children:"Your Course"}),e.jsx("input",{placeholder:"e.g. B.Tech CSE",value:s.course,onChange:o=>c(n=>({...n,course:o.target.value}))})]}),e.jsxs("div",{children:[e.jsx("label",{children:"Year / Batch"}),e.jsx("input",{placeholder:"e.g. 2022-26",value:s.year,onChange:o=>c(n=>({...n,year:o.target.value}))})]})]}),u&&e.jsx("p",{className:"form-error",children:u}),e.jsx("button",{className:"btn-primary full",onClick:d,disabled:g,children:g?"Saving…":r?"Update Review":"Submit Review"})]})]})})}function M({college:l,currentUserId:r,onBack:t,onReviewSaved:m}){var j,N,k;const[s,c]=p.useState(null),[g,x]=p.useState(!0),[u,i]=p.useState(!1);p.useEffect(()=>{w.get(l.id).then(a=>c(a.data)).catch(()=>{}).finally(()=>x(!1))},[l.id]);const d=(j=s==null?void 0:s.reviews)==null?void 0:j.find(a=>a.reviewer_id===r);if(g)return e.jsx("div",{className:"detail-loading",children:e.jsx("div",{className:"spinner"})});if(!s)return null;const o=s.rating_distribution||{},n=s.reviews_count||0;return e.jsxs("div",{className:"college-detail",children:[e.jsx("button",{className:"back-btn",onClick:t,children:"← Back"}),e.jsxs("div",{className:"detail-hero",children:[e.jsx("div",{className:"college-initial-big",children:s.name[0]}),e.jsxs("div",{className:"detail-hero-info",children:[e.jsx("h1",{children:s.name}),e.jsxs("p",{className:"detail-location",children:["📍 ",s.city,s.state?`, ${s.state}`:""]}),s.type&&e.jsx("span",{className:"college-type-badge",children:s.type}),s.website&&e.jsx("a",{href:s.website,target:"_blank",rel:"noopener noreferrer",className:"website-link",children:"🔗 Visit Website"})]}),e.jsxs("div",{className:"detail-rating-summary",children:[e.jsx("span",{className:"big-rating",children:s.avg_rating?Number(s.avg_rating).toFixed(1):"—"}),e.jsx(z,{value:s.avg_rating,size:"md"}),e.jsxs("span",{className:"total-reviews",children:[n," review",n!==1?"s":""]})]})]}),n>0&&e.jsxs("div",{className:"rating-breakdown",children:[e.jsx("div",{className:"breakdown-bars",children:[5,4,3,2,1].map(a=>e.jsx(A,{label:a,count:o[a]||0,total:n},a))}),e.jsx("div",{className:"sub-avg-grid",children:[["academics","📖 Academics"],["placements","💼 Placements"],["campus_life","🌿 Campus Life"],["faculty","🧑‍🏫 Faculty"]].map(([a,h])=>{const b=s.reviews.map(f=>f[a]).filter(Boolean),v=b.length?(b.reduce((f,y)=>f+y,0)/b.length).toFixed(1):null;return v?e.jsxs("div",{className:"sub-avg-item",children:[e.jsx("span",{className:"sub-avg-label",children:h}),e.jsx(z,{value:+v,size:"sm"}),e.jsx("span",{className:"sub-avg-num",children:v})]},a):null})})]}),e.jsxs("div",{className:"write-review-row",children:[e.jsx("button",{className:"btn-write-review",onClick:()=>i(!0),children:d?"✏️ Edit Your Review":"✍️ Write a Review"}),d&&e.jsx("span",{className:"your-review-note",children:"You reviewed this college"})]}),e.jsxs("div",{className:"reviews-list",children:[((N=s.reviews)==null?void 0:N.length)===0&&e.jsxs("div",{className:"empty-reviews",children:[e.jsx("span",{children:"📝"}),e.jsx("p",{children:"No reviews yet. Be the first to review!"})]}),(k=s.reviews)==null?void 0:k.map(a=>{var h,b,v;return e.jsxs("div",{className:`review-card ${a.reviewer_id===r?"mine":""}`,children:[e.jsxs("div",{className:"review-top",children:[e.jsx("img",{src:((h=a.reviewer)==null?void 0:h.avatar_url)||`https://api.dicebear.com/7.x/initials/svg?seed=${(b=a.reviewer)==null?void 0:b.name}`,alt:"",className:"rev-avatar"}),e.jsxs("div",{className:"rev-meta",children:[e.jsx("strong",{children:((v=a.reviewer)==null?void 0:v.name)||"Anonymous"}),a.course&&e.jsx("span",{className:"rev-course",children:a.course}),a.year&&e.jsx("span",{className:"rev-year",children:a.year})]}),e.jsxs("div",{className:"rev-rating-col",children:[e.jsx(z,{value:a.rating,size:"sm"}),e.jsx("span",{className:"rev-date",children:new Date(a.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})})]})]}),a.title&&e.jsxs("p",{className:"rev-title",children:['"',a.title,'"']}),e.jsxs("div",{className:"rev-body",children:[a.pros&&e.jsxs("div",{className:"rev-pros",children:[e.jsx("span",{children:"👍"})," ",a.pros]}),a.cons&&e.jsxs("div",{className:"rev-cons",children:[e.jsx("span",{children:"👎"})," ",a.cons]})]}),(a.academics||a.placements||a.campus_life||a.faculty)&&e.jsxs("div",{className:"rev-sub-ratings",children:[a.academics&&e.jsxs("span",{children:["📖 ",a.academics,"/5"]}),a.placements&&e.jsxs("span",{children:["💼 ",a.placements,"/5"]}),a.campus_life&&e.jsxs("span",{children:["🌿 ",a.campus_life,"/5"]}),a.faculty&&e.jsxs("span",{children:["🧑‍🏫 ",a.faculty,"/5"]})]}),a.reviewer_id===r&&e.jsx("button",{className:"btn-delete-review",onClick:async()=>{confirm("Delete review?")&&(await w.deleteReview(l.id,a.id),c(f=>({...f,reviews:f.reviews.filter(y=>y.id!==a.id),reviews_count:f.reviews_count-1})))},children:"🗑️ Delete"})]},a.id)})]}),u&&e.jsx(F,{college:l,existingReview:d,onClose:()=>i(!1),onSaved:()=>{x(!0),w.get(l.id).then(a=>c(a.data)).finally(()=>x(!1)),m==null||m()}})]})}function L({college:l,onClick:r}){l.rating_distribution;const t=l.reviews_count||0;return e.jsxs("div",{className:"college-card",onClick:r,children:[e.jsxs("div",{className:"college-card-top",children:[e.jsx("div",{className:"college-initial",children:l.name[0]}),e.jsxs("div",{className:"college-info",children:[e.jsx("h3",{children:l.name}),e.jsxs("p",{children:["📍 ",l.city,l.state?`, ${l.state}`:""]}),l.type&&e.jsx("span",{className:"college-type-badge sm",children:l.type})]}),e.jsxs("div",{className:"college-rating-col",children:[e.jsx("span",{className:"college-avg",children:l.avg_rating?Number(l.avg_rating).toFixed(1):"—"}),e.jsx(z,{value:l.avg_rating||0,size:"sm"}),e.jsxs("span",{className:"college-review-count",children:[t," review",t!==1?"s":""]})]})]}),l.my_review&&e.jsx("div",{className:"my-review-chip",children:"✓ You reviewed this"}),e.jsx("div",{className:"college-card-footer",children:e.jsx("span",{className:"view-link",children:"View reviews →"})})]})}function P(){const{user:l}=_(),[r,t]=p.useState([]),[m,s]=p.useState(!0),[c,g]=p.useState(null),[x,u]=p.useState(!1),[i,d]=p.useState({q:"",sort:"rating"}),[o,n]=p.useState(1),[j,N]=p.useState(!1),k=async(a=1,h=!1)=>{var b,v;s(!0);try{const f={page:a,limit:20,sort:i.sort};i.q&&(f.q=i.q);const y=await w.list(f),C=((b=y.data)==null?void 0:b.colleges)||y.data||[];t(S=>h?C:[...S,...C]),N(((v=y.data)==null?void 0:v.has_more)||!1),n(a)}finally{s(!1)}};return p.useEffect(()=>{k(1,!0)},[i]),e.jsxs("div",{className:"colleges-page",children:[c?e.jsx(M,{college:c,currentUserId:l==null?void 0:l.id,onBack:()=>g(null),onReviewSaved:()=>k(1,!0)}):e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"colleges-header",children:[e.jsxs("div",{children:[e.jsx("h1",{children:"🏫 College Reviews"}),e.jsx("p",{children:"Real reviews from real students"})]}),e.jsx("button",{className:"btn-add-college",onClick:()=>u(!0),children:"+ Add College"})]}),e.jsxs("div",{className:"colleges-filters",children:[e.jsx("input",{className:"search-input",placeholder:"🔍 Search colleges…",value:i.q,onChange:a=>d(h=>({...h,q:a.target.value}))}),e.jsxs("select",{value:i.sort,onChange:a=>d(h=>({...h,sort:a.target.value})),children:[e.jsx("option",{value:"rating",children:"Top Rated"}),e.jsx("option",{value:"reviews",children:"Most Reviewed"}),e.jsx("option",{value:"name",children:"A–Z"})]}),i.q&&e.jsx("button",{className:"clear-btn",onClick:()=>d(a=>({...a,q:""})),children:"✕ Clear"})]}),m&&r.length===0?e.jsx("div",{className:"colleges-grid",children:[1,2,3,4,5,6].map(a=>e.jsx("div",{className:"college-skeleton"},a))}):r.length===0?e.jsxs("div",{className:"empty-state",children:[e.jsx("span",{children:"🏫"}),e.jsx("p",{children:"No colleges found. Add the first one!"}),e.jsx("button",{className:"btn-primary",onClick:()=>u(!0),children:"Add College"})]}):e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"colleges-grid",children:r.map(a=>e.jsx(L,{college:a,onClick:()=>g(a)},a.id))}),j&&e.jsx("button",{className:"load-more",onClick:()=>k(o+1),children:"Load more"})]})]}),x&&e.jsx(q,{onClose:()=>u(!1),onAdded:a=>{t(h=>[a,...h]),u(!1)}}),e.jsx("style",{children:`
        .colleges-page { max-width:1000px;margin:0 auto;padding-bottom:60px; }

        /* Header */
        .colleges-header { display:flex;justify-content:space-between;align-items:flex-start;padding:28px 16px 16px;flex-wrap:wrap;gap:12px; }
        .colleges-header h1 { margin:0;font-size:1.6rem;font-weight:800; }
        .colleges-header p  { margin:4px 0 0;color:var(--text-muted);font-size:.95rem; }
        .btn-add-college { background:var(--accent);color:#fff;border:none;padding:10px 22px;border-radius:20px;font-weight:700;cursor:pointer;font-size:.9rem; }

        /* Filters */
        .colleges-filters { display:flex;gap:10px;flex-wrap:wrap;padding:0 16px 20px;align-items:center; }
        .search-input { flex:1;min-width:180px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:10px;padding:9px 14px;color:var(--text-primary);font-size:.9rem; }
        .colleges-filters select { background:var(--bg-elevated);border:1px solid var(--border);border-radius:10px;padding:9px 12px;color:var(--text-primary);font-size:.88rem;cursor:pointer; }
        .clear-btn { background:none;border:1px solid var(--border);border-radius:10px;padding:8px 14px;cursor:pointer;color:var(--text-muted);font-size:.88rem; }

        /* College grid */
        .colleges-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;padding:0 16px; }
        .college-skeleton { height:140px;background:var(--bg-elevated);border-radius:16px;animation:shimmer 1.5s infinite ease-in-out; }
        @keyframes shimmer { 0%,100%{opacity:.4}50%{opacity:.8} }

        /* College card */
        .college-card { background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:18px;cursor:pointer;transition:box-shadow .2s,transform .2s;display:flex;flex-direction:column;gap:8px; }
        .college-card:hover { box-shadow:0 4px 20px rgba(0,0,0,.1);transform:translateY(-2px); }
        .college-card-top { display:flex;gap:12px;align-items:flex-start; }
        .college-initial { width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,var(--accent),#7c3aed);color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.4rem;font-weight:800;flex-shrink:0; }
        .college-info { flex:1;min-width:0; }
        .college-info h3 { margin:0 0 3px;font-size:.98rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
        .college-info p  { margin:0 0 5px;font-size:.82rem;color:var(--text-muted); }
        .college-type-badge { background:var(--bg-elevated);border-radius:20px;padding:2px 9px;font-size:.74rem;font-weight:600;color:var(--text-secondary); }
        .college-type-badge.sm { font-size:.72rem; }
        .college-rating-col { display:flex;flex-direction:column;align-items:flex-end;gap:3px;flex-shrink:0; }
        .college-avg { font-size:1.4rem;font-weight:800;color:var(--accent);line-height:1; }
        .college-review-count { font-size:.74rem;color:var(--text-muted); }
        .my-review-chip { background:color-mix(in srgb,#16a34a 12%,transparent);color:#16a34a;font-size:.78rem;padding:3px 10px;border-radius:20px;font-weight:600;align-self:flex-start; }
        .college-card-footer { border-top:1px solid var(--border);padding-top:8px;margin-top:auto; }
        .view-link { font-size:.85rem;color:var(--accent);font-weight:500; }

        .star-row { display:inline-flex;align-items:center;gap:1px; }

        /* Detail view */
        .college-detail { padding:0 16px;display:flex;flex-direction:column;gap:20px; }
        .back-btn { background:none;border:none;color:var(--accent);cursor:pointer;font-size:.95rem;font-weight:600;padding:8px 0;align-self:flex-start; }
        .detail-hero { background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:24px;display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap; }
        .college-initial-big { width:72px;height:72px;border-radius:16px;background:linear-gradient(135deg,var(--accent),#7c3aed);color:#fff;display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:800;flex-shrink:0; }
        .detail-hero-info { flex:1;min-width:180px; }
        .detail-hero-info h1 { margin:0 0 4px;font-size:1.4rem;font-weight:800; }
        .detail-location { margin:0 0 8px;color:var(--text-muted);font-size:.9rem; }
        .website-link { color:var(--accent);font-size:.88rem;text-decoration:none;display:block;margin-top:6px; }
        .website-link:hover { text-decoration:underline; }
        .detail-rating-summary { display:flex;flex-direction:column;align-items:flex-end;gap:4px;min-width:100px; }
        .big-rating { font-size:2.8rem;font-weight:900;color:var(--accent);line-height:1; }
        .total-reviews { font-size:.82rem;color:var(--text-muted); }

        /* Rating breakdown */
        .rating-breakdown { background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:20px;display:grid;grid-template-columns:1fr 1fr;gap:24px; }
        .breakdown-bars { display:flex;flex-direction:column;gap:7px; }
        .rating-bar-row { display:flex;align-items:center;gap:8px; }
        .rb-label { font-size:.82rem;color:var(--text-muted);width:20px;text-align:right; }
        .rb-track { flex:1;height:8px;background:var(--bg-elevated);border-radius:4px;overflow:hidden; }
        .rb-fill { height:100%;background:#f59e0b;border-radius:4px;transition:width .4s ease; }
        .rb-count { font-size:.78rem;color:var(--text-muted);width:20px; }
        .sub-avg-grid { display:flex;flex-direction:column;gap:10px;justify-content:center; }
        .sub-avg-item { display:flex;align-items:center;gap:8px; }
        .sub-avg-label { font-size:.82rem;color:var(--text-secondary);min-width:110px; }
        .sub-avg-num { font-size:.82rem;font-weight:700;color:var(--text-primary); }

        /* Write review row */
        .write-review-row { display:flex;align-items:center;gap:14px; }
        .btn-write-review { background:var(--accent);color:#fff;border:none;padding:10px 22px;border-radius:20px;font-weight:700;cursor:pointer;font-size:.9rem; }
        .your-review-note { font-size:.85rem;color:var(--text-muted); }

        /* Reviews list */
        .reviews-list { display:flex;flex-direction:column;gap:14px; }
        .review-card { background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:18px;display:flex;flex-direction:column;gap:10px; }
        .review-card.mine { border-color:var(--accent); }
        .review-top { display:flex;gap:12px;align-items:flex-start; }
        .rev-avatar { width:40px;height:40px;border-radius:50%;object-fit:cover;flex-shrink:0; }
        .rev-meta { flex:1; }
        .rev-meta strong { display:block;font-size:.9rem;margin-bottom:2px; }
        .rev-course { font-size:.78rem;color:var(--text-muted);margin-right:6px; }
        .rev-year   { font-size:.78rem;color:var(--text-muted); }
        .rev-rating-col { display:flex;flex-direction:column;align-items:flex-end;gap:3px; }
        .rev-date { font-size:.76rem;color:var(--text-muted); }
        .rev-title { margin:0;font-size:.95rem;font-style:italic;color:var(--text-secondary); }
        .rev-body { display:flex;flex-direction:column;gap:6px; }
        .rev-pros,.rev-cons { font-size:.88rem;line-height:1.5;color:var(--text-secondary); }
        .rev-pros span,.rev-cons span { margin-right:6px; }
        .rev-sub-ratings { display:flex;flex-wrap:wrap;gap:10px; }
        .rev-sub-ratings span { font-size:.8rem;color:var(--text-muted);background:var(--bg-elevated);padding:3px 9px;border-radius:20px; }
        .btn-delete-review { background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:.82rem;align-self:flex-start;padding:3px 8px;border-radius:6px; }
        .btn-delete-review:hover { color:#e11d48; }
        .empty-reviews { display:flex;flex-direction:column;align-items:center;padding:40px;gap:12px;color:var(--text-muted); }
        .empty-reviews span { font-size:2.5rem; }

        .detail-loading { display:flex;justify-content:center;padding:60px; }
        .spinner { width:36px;height:36px;border:3px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin .7s linear infinite; }
        @keyframes spin { to{transform:rotate(360deg)} }

        /* Modals */
        .modal-backdrop { position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px; }
        .modal-box { background:var(--bg-card);border-radius:16px;width:100%;max-width:460px;max-height:92vh;display:flex;flex-direction:column;overflow:hidden; }
        .modal-box.wide { max-width:640px; }
        .modal-header { display:flex;justify-content:space-between;align-items:center;padding:18px 20px;border-bottom:1px solid var(--border);flex-shrink:0; }
        .modal-header h3 { margin:0;font-size:1.05rem; }
        .modal-header button { background:none;border:none;cursor:pointer;font-size:1.2rem;color:var(--text-muted); }
        .modal-body { padding:20px;overflow-y:auto;display:flex;flex-direction:column;gap:12px; }
        .modal-body label { font-size:.83rem;font-weight:600;color:var(--text-secondary);margin-bottom:-6px; }
        .modal-body input,.modal-body textarea,.modal-body select {
          background:var(--bg-elevated);border:1px solid var(--border);border-radius:10px;
          padding:9px 12px;color:var(--text-primary);font-size:.9rem;width:100%;box-sizing:border-box;
        }
        .modal-body textarea { resize:vertical; }
        .form-row { display:grid;grid-template-columns:1fr 1fr;gap:12px; }
        .form-row > div { display:flex;flex-direction:column;gap:6px; }
        .sub-ratings { background:var(--bg-elevated);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:10px; }
        .sub-rating-row { display:flex;align-items:center;justify-content:space-between; }
        .sub-label { font-size:.85rem;color:var(--text-secondary);font-weight:500; }
        .req { color:#e11d48; }
        .form-error { color:#e11d48;font-size:.85rem;margin:0; }
        .btn-primary { background:var(--accent);color:#fff;border:none;padding:10px 20px;border-radius:10px;cursor:pointer;font-weight:600; }
        .btn-primary.full { width:100%;text-align:center;padding:12px; }
        .btn-primary:disabled { opacity:.6;cursor:not-allowed; }

        .empty-state { display:flex;flex-direction:column;align-items:center;padding:60px 20px;gap:14px;color:var(--text-muted); }
        .empty-state span { font-size:3rem; }
        .load-more { display:block;margin:20px auto;padding:12px 32px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:20px;cursor:pointer;color:var(--text-secondary);font-size:.9rem; }

        @media(max-width:600px) {
          .colleges-grid { grid-template-columns:1fr; }
          .colleges-header,.write-review-row { flex-direction:column; }
          .detail-hero { flex-direction:column; }
          .detail-rating-summary { align-items:flex-start; }
          .rating-breakdown { grid-template-columns:1fr; }
          .form-row { grid-template-columns:1fr; }
        }
      `})]})}export{P as default};
