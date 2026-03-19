import{j as e}from"./motion-fY2R9ZPd.js";import{r as o,e as E}from"./vendor-CqT0HC8A.js";import{u as L,f as k}from"./index-BHg4HUyF.js";import"./icons-DDCQ9aL8.js";const M=r=>{const t=(Date.now()-new Date(r))/1e3;return t<60?"just now":t<3600?`${Math.floor(t/60)}m ago`:t<86400?`${Math.floor(t/3600)}h ago`:`${Math.floor(t/86400)}d ago`};function D({post:r,onLike:t}){var c,s,d,p,x;const f=E(),[l,b]=o.useState(r.is_liked),[v,u]=o.useState(r.likes_count),n=async i=>{i.stopPropagation();try{const h=await k.likePost(r.id);b(h.data.liked),u(h.data.likes_count)}catch{}};return e.jsxs("div",{className:"explore-card",onClick:()=>{var i;return f(`/profile/${(i=r.author)==null?void 0:i.username}`)},children:[((c=r.images)==null?void 0:c[0])&&e.jsxs("div",{className:"explore-card-img",children:[e.jsx("img",{src:r.images[0],alt:""}),r.images.length>1&&e.jsxs("span",{className:"img-count",children:["+",r.images.length-1]})]}),e.jsxs("div",{className:"explore-card-body",children:[e.jsxs("div",{className:"explore-author",children:[e.jsx("img",{src:((s=r.author)==null?void 0:s.avatar_url)||`https://api.dicebear.com/7.x/initials/svg?seed=${(d=r.author)==null?void 0:d.name}`,alt:"",className:"explore-avatar"}),e.jsxs("div",{children:[e.jsx("span",{className:"explore-name",children:(p=r.author)==null?void 0:p.name}),e.jsx("span",{className:"explore-time",children:M(r.created_at)})]}),r.exam_tag&&e.jsx("span",{className:"explore-exam-tag",children:r.exam_tag})]}),e.jsx("p",{className:"explore-content",children:r.content}),((x=r.tags)==null?void 0:x.length)>0&&e.jsx("div",{className:"explore-tags",children:r.tags.slice(0,3).map(i=>e.jsxs("span",{className:"etag",children:["#",i]},i))}),e.jsxs("div",{className:"explore-actions",children:[e.jsxs("button",{className:`eaction ${l?"liked":""}`,onClick:n,children:[l?"❤️":"🤍"," ",v]}),e.jsxs("span",{className:"eaction",children:["💬 ",r.comments_count]})]})]})]})}function I(){const{user:r}=L(),[t,f]=o.useState([]),[l,b]=o.useState([]),[v,u]=o.useState(!0),[n,c]=o.useState(""),[s,d]=o.useState(""),[p,x]=o.useState(1),[i,h]=o.useState(!1),g=o.useCallback(async(a=!1,m=n,y=s)=>{var N,w;u(!0);try{const z={page:a?1:p,limit:18};m&&(z.q=m);const S=await k.explore(z),C=((N=S.data)==null?void 0:N.posts)||[];let _=y?C.filter(j=>{var $;return($=j.tags)==null?void 0:$.includes(y)}):C;f(j=>a?_:[...j,..._]),h(((w=S.data)==null?void 0:w.has_more)||!1),a&&x(1)}finally{u(!1)}},[n,s,p]);o.useEffect(()=>{k.getTags().then(a=>b(a.data||[])).catch(()=>{}),g(!0)},[]);const P=a=>{a.preventDefault(),g(!0,n,s)},T=a=>{const m=s===a?"":a;d(m),g(!0,n,m)};return e.jsxs("div",{className:"explore-page",children:[e.jsxs("div",{className:"explore-header",children:[e.jsx("h1",{children:"🔭 Explore"}),e.jsx("p",{children:"Discover trending posts from the community"})]}),e.jsxs("form",{className:"explore-search-row",onSubmit:P,children:[e.jsx("input",{className:"explore-search",placeholder:"Search posts…",value:n,onChange:a=>c(a.target.value)}),e.jsx("button",{type:"submit",className:"btn-search",children:"Search"}),(n||s)&&e.jsx("button",{type:"button",className:"btn-clear",onClick:()=>{c(""),d(""),g(!0,"","")},children:"✕ Clear"})]}),l.length>0&&e.jsx("div",{className:"tags-scroll",children:l.slice(0,20).map(a=>e.jsxs("button",{className:`tag-pill ${s===a.tag?"active":""}`,onClick:()=>T(a.tag),children:["#",a.tag," ",e.jsx("span",{className:"tag-count",children:a.count})]},a.tag))}),v&&t.length===0?e.jsx("div",{className:"explore-grid",children:[1,2,3,4,5,6].map(a=>e.jsx("div",{className:"explore-skeleton"},a))}):t.length===0?e.jsxs("div",{className:"empty-state",children:[e.jsx("span",{children:"🔭"}),e.jsx("p",{children:"Nothing found. Try a different search or tag."})]}):e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"explore-grid",children:t.map(a=>e.jsx(D,{post:a},a.id))}),i&&e.jsx("button",{className:"load-more",onClick:()=>{x(a=>a+1),g(!1)},children:"Load more"})]}),e.jsx("style",{children:`
        .explore-page { max-width:1000px;margin:0 auto;padding-bottom:60px; }
        .explore-header { padding:28px 16px 16px; }
        .explore-header h1 { margin:0;font-size:1.6rem;font-weight:800; }
        .explore-header p  { margin:4px 0 0;color:var(--text-muted);font-size:.9rem; }

        .explore-search-row { display:flex;gap:10px;padding:0 16px 14px;align-items:center; }
        .explore-search { flex:1;background:var(--bg-elevated);border:1px solid var(--border);border-radius:24px;padding:10px 18px;color:var(--text-primary);font-size:.9rem; }
        .btn-search { background:var(--accent);color:#fff;border:none;padding:10px 20px;border-radius:24px;cursor:pointer;font-weight:600;font-size:.88rem; }
        .btn-clear  { background:none;border:1px solid var(--border);padding:9px 16px;border-radius:24px;cursor:pointer;font-size:.85rem;color:var(--text-muted); }

        .tags-scroll { display:flex;gap:8px;overflow-x:auto;padding:0 16px 16px;scrollbar-width:none; }
        .tags-scroll::-webkit-scrollbar { display:none; }
        .tag-pill { background:var(--bg-elevated);border:1px solid var(--border);border-radius:20px;padding:5px 12px;cursor:pointer;font-size:.82rem;color:var(--text-secondary);white-space:nowrap;display:flex;align-items:center;gap:5px;flex-shrink:0;transition:.15s; }
        .tag-pill:hover { border-color:var(--accent);color:var(--accent); }
        .tag-pill.active { background:var(--accent);color:#fff;border-color:var(--accent); }
        .tag-count { font-size:.72rem;opacity:.75; }

        .explore-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:14px;padding:0 16px; }
        .explore-skeleton { height:220px;background:var(--bg-elevated);border-radius:14px;animation:shimmer 1.5s infinite ease-in-out; }
        @keyframes shimmer { 0%,100%{opacity:.4}50%{opacity:.8} }

        .explore-card { background:var(--bg-card);border:1px solid var(--border);border-radius:14px;overflow:hidden;cursor:pointer;transition:box-shadow .2s,transform .2s;display:flex;flex-direction:column; }
        .explore-card:hover { box-shadow:0 4px 20px rgba(0,0,0,.1);transform:translateY(-2px); }
        .explore-card-img { position:relative;aspect-ratio:16/9;overflow:hidden; }
        .explore-card-img img { width:100%;height:100%;object-fit:cover; }
        .img-count { position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,.6);color:#fff;font-size:.75rem;padding:2px 7px;border-radius:10px; }
        .explore-card-body { padding:14px;display:flex;flex-direction:column;gap:8px; }
        .explore-author { display:flex;align-items:center;gap:8px; }
        .explore-avatar { width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0; }
        .explore-name { display:block;font-size:.85rem;font-weight:600; }
        .explore-time { display:block;font-size:.74rem;color:var(--text-muted); }
        .explore-exam-tag { margin-left:auto;background:color-mix(in srgb,#7c3aed 12%,transparent);color:#7c3aed;font-size:.72rem;padding:2px 8px;border-radius:12px;font-weight:500;flex-shrink:0; }
        .explore-content { margin:0;font-size:.88rem;line-height:1.5;color:var(--text-secondary);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden; }
        .explore-tags { display:flex;flex-wrap:wrap;gap:4px; }
        .etag { color:var(--accent);font-size:.78rem; }
        .explore-actions { display:flex;gap:12px;padding-top:6px;border-top:1px solid var(--border);margin-top:auto; }
        .eaction { background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:.85rem;padding:3px 6px;border-radius:6px; }
        .eaction:hover { background:var(--bg-elevated); }
        .eaction.liked { color:#e11d48; }

        .empty-state { display:flex;flex-direction:column;align-items:center;padding:60px 20px;gap:14px;color:var(--text-muted); }
        .empty-state span { font-size:3rem; }
        .load-more { display:block;margin:20px auto;padding:12px 32px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:20px;cursor:pointer;color:var(--text-secondary);font-size:.9rem; }

        @media(max-width:600px) { .explore-grid { grid-template-columns:1fr; } }
      `})]})}export{I as default};
