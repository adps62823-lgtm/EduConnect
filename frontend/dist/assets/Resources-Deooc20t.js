import{j as e}from"./motion-fY2R9ZPd.js";import{r as l}from"./vendor-CqT0HC8A.js";import{u as M,d as C}from"./index-BHg4HUyF.js";import"./icons-DDCQ9aL8.js";const P=["Mathematics","Physics","Chemistry","Biology","English","History","Geography","Economics","Computer Science","Accountancy"],U=["notes","pyqs","book","video","mindmap","formula_sheet","mock_test","other"],E={notes:"📝 Notes",pyqs:"📋 PYQs",book:"📚 Book",video:"🎬 Video",mindmap:"🗺️ Mind Map",formula_sheet:"🧮 Formula Sheet",mock_test:"📝 Mock Test",other:"📦 Other"},q=r=>r?r<1024?`${r} B`:r<1048576?`${(r/1024).toFixed(1)} KB`:`${(r/1048576).toFixed(1)} MB`:"";function T({resource:r,onLike:j,onDownload:n,currentUserId:x}){var p,b,k,f,a;const[c,N]=l.useState(r.is_liked),[m,i]=l.useState(r.likes_count),[d,u]=l.useState(!1),g=((b=(p=r.file_name)==null?void 0:p.split(".").pop())==null?void 0:b.toUpperCase())||"FILE",y={PDF:"#e11d48",DOC:"#2563eb",DOCX:"#2563eb",PPT:"#f97316",PPTX:"#f97316",XLS:"#16a34a",XLSX:"#16a34a",ZIP:"#7c3aed"}[g]||"#6b7280",t=async()=>{try{const s=await C.like(r.id);N(s.data.liked),i(s.data.likes_count)}catch{}},o=async()=>{var s,v;if(!d){u(!0);try{const w=(await C.download(r.id)).data.file_url,h=document.createElement("a");h.href=w,h.download=r.file_name||"resource",h.target="_blank",h.click(),n==null||n()}catch(_){alert(((v=(s=_.response)==null?void 0:s.data)==null?void 0:v.detail)||"Download failed.")}finally{u(!1)}}};return e.jsxs("div",{className:"resource-card",children:[e.jsxs("div",{className:"resource-type-row",children:[e.jsx("span",{className:"type-label",children:E[r.resource_type]||r.resource_type}),e.jsx("span",{className:"ext-badge",style:{background:y+"22",color:y},children:g})]}),e.jsx("h3",{className:"resource-title",children:r.title}),r.description&&e.jsx("p",{className:"resource-desc",children:r.description}),e.jsxs("div",{className:"resource-meta",children:[r.subject&&e.jsx("span",{className:"meta-chip subject",children:r.subject}),r.exam_target&&e.jsx("span",{className:"meta-chip exam",children:r.exam_target}),r.file_size&&e.jsx("span",{className:"meta-chip size",children:q(r.file_size)})]}),e.jsxs("div",{className:"resource-uploader",children:[e.jsx("img",{src:((k=r.uploader)==null?void 0:k.avatar_url)||`https://api.dicebear.com/7.x/initials/svg?seed=${(f=r.uploader)==null?void 0:f.name}`,alt:"",className:"uploader-avatar"}),e.jsx("span",{children:(a=r.uploader)==null?void 0:a.name}),r.points_cost>0&&e.jsxs("span",{className:"points-badge",children:["🪙 ",r.points_cost," pts"]})]}),e.jsxs("div",{className:"resource-actions",children:[e.jsxs("button",{className:`action-btn ${c?"liked":""}`,onClick:t,children:[c?"❤️":"🤍"," ",m]}),e.jsxs("span",{className:"download-count",children:["⬇️ ",r.downloads||0]}),e.jsx("button",{className:"btn-download",onClick:o,disabled:d,children:d?"…":"⬇ Download"}),r.is_mine&&e.jsx("button",{className:"btn-delete-res",onClick:()=>onDelete==null?void 0:onDelete(r.id),children:"🗑️"})]})]})}function F({onClose:r,onUploaded:j}){const[n,x]=l.useState({title:"",description:"",subject:"",resource_type:"notes",exam_target:"",points_cost:0}),[c,N]=l.useState(null),[m,i]=l.useState(!1),[d,u]=l.useState(""),g=l.useRef(),y=async()=>{var t,o;if(!n.title.trim())return u("Title is required.");if(!c)return u("Please select a file.");i(!0),u("");try{const p=new FormData;Object.entries(n).forEach(([k,f])=>p.append(k,f)),p.append("file",c);const b=await C.upload(p);j(b.data),r()}catch(p){u(((o=(t=p.response)==null?void 0:t.data)==null?void 0:o.detail)||"Upload failed.")}finally{i(!1)}};return e.jsx("div",{className:"modal-backdrop",onClick:r,children:e.jsxs("div",{className:"modal-box",onClick:t=>t.stopPropagation(),children:[e.jsxs("div",{className:"modal-header",children:[e.jsx("h3",{children:"📤 Upload Resource"}),e.jsx("button",{onClick:r,children:"✕"})]}),e.jsxs("div",{className:"modal-body",children:[e.jsxs("label",{children:["Title ",e.jsx("span",{className:"req",children:"*"})]}),e.jsx("input",{placeholder:"e.g. JEE Mains 2023 Physics PYQ",value:n.title,onChange:t=>x(o=>({...o,title:t.target.value}))}),e.jsx("label",{children:"Description"}),e.jsx("textarea",{rows:2,placeholder:"What's in this resource?",value:n.description,onChange:t=>x(o=>({...o,description:t.target.value}))}),e.jsxs("div",{className:"form-row",children:[e.jsxs("div",{children:[e.jsx("label",{children:"Type"}),e.jsx("select",{value:n.resource_type,onChange:t=>x(o=>({...o,resource_type:t.target.value})),children:U.map(t=>e.jsx("option",{value:t,children:E[t]},t))})]}),e.jsxs("div",{children:[e.jsx("label",{children:"Subject"}),e.jsxs("select",{value:n.subject,onChange:t=>x(o=>({...o,subject:t.target.value})),children:[e.jsx("option",{value:"",children:"— None —"}),P.map(t=>e.jsx("option",{children:t},t))]})]})]}),e.jsxs("div",{className:"form-row",children:[e.jsxs("div",{children:[e.jsx("label",{children:"Exam Target"}),e.jsx("input",{placeholder:"e.g. JEE, NEET",value:n.exam_target,onChange:t=>x(o=>({...o,exam_target:t.target.value}))})]}),e.jsxs("div",{children:[e.jsx("label",{children:"Points Cost (0 = Free)"}),e.jsx("input",{type:"number",min:0,value:n.points_cost,onChange:t=>x(o=>({...o,points_cost:+t.target.value}))})]})]}),e.jsxs("label",{children:["File ",e.jsx("span",{className:"req",children:"*"})]}),e.jsx("div",{className:"file-drop",onClick:()=>g.current.click(),children:c?e.jsxs("span",{children:["📎 ",c.name," (",q(c.size),")"]}):e.jsx("span",{children:"Click to select file (max 10 MB)"})}),e.jsx("input",{ref:g,type:"file",hidden:!0,onChange:t=>N(t.target.files[0])}),d&&e.jsx("p",{className:"form-error",children:d}),e.jsx("button",{className:"btn-primary full",onClick:y,disabled:m,children:m?"Uploading…":"Upload Resource"})]})]})})}function A(){const{user:r}=M(),[j,n]=l.useState([]),[x,c]=l.useState(!0),[N,m]=l.useState(!1),[i,d]=l.useState({q:"",subject:"",resource_type:"",sort:"newest"}),[u,g]=l.useState(1),[y,t]=l.useState(!1),[o,p]=l.useState("all"),b=async(a=1,s=!1)=>{var v,_;c(!0);try{const w={page:a,limit:12,sort:i.sort};i.q&&(w.q=i.q),i.subject&&(w.subject=i.subject),i.resource_type&&(w.resource_type=i.resource_type);const h=await C.list(w);let z=((v=h.data)==null?void 0:v.resources)||h.data||[];o==="mine"&&(z=z.filter(S=>S.is_mine)),n(S=>s?z:[...S,...z]),t(((_=h.data)==null?void 0:_.has_more)||!1),g(a)}finally{c(!1)}};l.useEffect(()=>{b(1,!0)},[i,o]);const k=async a=>{confirm("Delete this resource?")&&(await C.delete(a),n(s=>s.filter(v=>v.id!==a)))},f=o==="mine"?j.filter(a=>a.is_mine):j;return e.jsxs("div",{className:"resources-page",children:[e.jsxs("div",{className:"resources-header",children:[e.jsxs("div",{children:[e.jsx("h1",{children:"📚 Resources"}),e.jsx("p",{children:"Study materials shared by the community"})]}),e.jsxs("div",{className:"header-right",children:[e.jsxs("div",{className:"points-display",children:["🪙 ",e.jsx("strong",{children:(r==null?void 0:r.help_points)||0})," pts"]}),e.jsx("button",{className:"btn-upload",onClick:()=>m(!0),children:"+ Upload"})]})]}),e.jsx("div",{className:"resource-tabs",children:[["all","🌐 All Resources"],["mine","📁 My Uploads"]].map(([a,s])=>e.jsx("button",{className:`res-tab ${o===a?"active":""}`,onClick:()=>p(a),children:s},a))}),e.jsxs("div",{className:"resources-filters",children:[e.jsx("input",{className:"search-input",placeholder:"🔍 Search resources…",value:i.q,onChange:a=>d(s=>({...s,q:a.target.value}))}),e.jsxs("select",{value:i.resource_type,onChange:a=>d(s=>({...s,resource_type:a.target.value})),children:[e.jsx("option",{value:"",children:"All Types"}),U.map(a=>e.jsx("option",{value:a,children:E[a]},a))]}),e.jsxs("select",{value:i.subject,onChange:a=>d(s=>({...s,subject:a.target.value})),children:[e.jsx("option",{value:"",children:"All Subjects"}),P.map(a=>e.jsx("option",{children:a},a))]}),e.jsxs("select",{value:i.sort,onChange:a=>d(s=>({...s,sort:a.target.value})),children:[e.jsx("option",{value:"newest",children:"Newest"}),e.jsx("option",{value:"popular",children:"Most Popular"})]}),(i.q||i.subject||i.resource_type)&&e.jsx("button",{className:"clear-btn",onClick:()=>d(a=>({...a,q:"",subject:"",resource_type:""})),children:"✕ Clear"})]}),x&&j.length===0?e.jsx("div",{className:"resource-grid",children:[1,2,3,4,5,6].map(a=>e.jsx("div",{className:"res-skeleton"},a))}):f.length===0?e.jsxs("div",{className:"empty-state",children:[e.jsx("span",{children:"📭"}),e.jsx("p",{children:o==="mine"?"You haven't uploaded anything yet.":"No resources found."}),e.jsx("button",{className:"btn-primary",onClick:()=>m(!0),children:"Upload first resource"})]}):e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"resource-grid",children:f.map(a=>e.jsx(T,{resource:a,currentUserId:r==null?void 0:r.id,onDelete:k,onDownload:()=>b(1,!0)},a.id))}),y&&o!=="mine"&&e.jsx("button",{className:"load-more",onClick:()=>b(u+1),children:"Load more"})]}),N&&e.jsx(F,{onClose:()=>m(!1),onUploaded:a=>n(s=>[a,...s])}),e.jsx("style",{children:`
        .resources-page { max-width:1000px;margin:0 auto;padding-bottom:60px; }

        .resources-header {
          display:flex;justify-content:space-between;align-items:flex-start;
          padding:28px 16px 16px;flex-wrap:wrap;gap:12px;
        }
        .resources-header h1 { margin:0;font-size:1.6rem;font-weight:800; }
        .resources-header p  { margin:4px 0 0;color:var(--text-muted);font-size:.95rem; }
        .header-right { display:flex;align-items:center;gap:12px; }
        .points-display {
          background:var(--bg-elevated);border:1px solid var(--border);
          border-radius:20px;padding:7px 16px;font-size:.9rem;
        }
        .points-display strong { color:var(--accent); }
        .btn-upload {
          background:var(--accent);color:#fff;border:none;
          padding:10px 22px;border-radius:20px;font-weight:700;cursor:pointer;font-size:.9rem;
        }

        .resource-tabs { display:flex;border-bottom:2px solid var(--border);margin-bottom:16px;padding:0 8px; }
        .res-tab { padding:10px 20px;border:none;background:none;cursor:pointer;color:var(--text-muted);font-weight:500;border-bottom:2px solid transparent;margin-bottom:-2px;transition:.15s; }
        .res-tab.active { color:var(--accent);border-bottom-color:var(--accent); }

        .resources-filters { display:flex;gap:10px;flex-wrap:wrap;padding:0 16px 20px;align-items:center; }
        .search-input { flex:1;min-width:180px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:10px;padding:9px 14px;color:var(--text-primary);font-size:.9rem; }
        .resources-filters select { background:var(--bg-elevated);border:1px solid var(--border);border-radius:10px;padding:9px 12px;color:var(--text-primary);font-size:.88rem;cursor:pointer; }
        .clear-btn { background:none;border:1px solid var(--border);border-radius:10px;padding:8px 14px;cursor:pointer;color:var(--text-muted);font-size:.88rem; }

        .resource-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;padding:0 16px; }

        .resource-card {
          background:var(--bg-card);border:1px solid var(--border);border-radius:16px;
          padding:18px;display:flex;flex-direction:column;gap:10px;
          transition:box-shadow .2s,transform .2s;
        }
        .resource-card:hover { box-shadow:0 4px 20px rgba(0,0,0,.1);transform:translateY(-2px); }
        .res-skeleton { height:220px;background:var(--bg-elevated);border-radius:16px;animation:shimmer 1.5s infinite ease-in-out; }
        @keyframes shimmer { 0%,100%{opacity:.4}50%{opacity:.8} }

        .resource-type-row { display:flex;align-items:center;justify-content:space-between; }
        .type-label { font-size:.82rem;color:var(--text-muted);font-weight:500; }
        .ext-badge { font-size:.72rem;font-weight:700;padding:2px 8px;border-radius:6px; }

        .resource-title { margin:0;font-size:1rem;font-weight:700;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden; }
        .resource-desc { margin:0;font-size:.85rem;color:var(--text-muted);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.45; }

        .resource-meta { display:flex;flex-wrap:wrap;gap:6px; }
        .meta-chip { font-size:.76rem;padding:3px 9px;border-radius:20px; }
        .meta-chip.subject { background:color-mix(in srgb,var(--accent) 12%,transparent);color:var(--accent); }
        .meta-chip.exam    { background:color-mix(in srgb,#7c3aed 12%,transparent);color:#7c3aed; }
        .meta-chip.size    { background:var(--bg-elevated);color:var(--text-muted); }

        .resource-uploader { display:flex;align-items:center;gap:8px;font-size:.83rem;color:var(--text-muted); }
        .uploader-avatar { width:24px;height:24px;border-radius:50%;object-fit:cover; }
        .points-badge { margin-left:auto;background:color-mix(in srgb,#f59e0b 15%,transparent);color:#92400e;font-size:.76rem;padding:2px 8px;border-radius:20px;font-weight:600; }

        .resource-actions { display:flex;align-items:center;gap:8px;padding-top:8px;border-top:1px solid var(--border);margin-top:auto; }
        .action-btn { background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:.88rem;padding:4px 8px;border-radius:8px; }
        .action-btn:hover { background:var(--bg-elevated); }
        .action-btn.liked { color:#e11d48; }
        .download-count { font-size:.82rem;color:var(--text-muted); }
        .btn-download {
          margin-left:auto;background:var(--accent);color:#fff;border:none;
          padding:6px 16px;border-radius:20px;cursor:pointer;font-size:.85rem;font-weight:600;
        }
        .btn-download:disabled { opacity:.6;cursor:not-allowed; }
        .btn-delete-res { background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:.9rem;padding:4px 8px;border-radius:8px; }
        .btn-delete-res:hover { color:#e11d48; }

        /* Modal */
        .modal-backdrop { position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px; }
        .modal-box { background:var(--bg-card);border-radius:16px;width:100%;max-width:520px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden; }
        .modal-header { display:flex;justify-content:space-between;align-items:center;padding:18px 20px;border-bottom:1px solid var(--border);flex-shrink:0; }
        .modal-header h3 { margin:0;font-size:1.1rem; }
        .modal-header button { background:none;border:none;cursor:pointer;font-size:1.2rem;color:var(--text-muted); }
        .modal-body { padding:20px;overflow-y:auto;display:flex;flex-direction:column;gap:12px; }
        .modal-body label { font-size:.84rem;font-weight:600;color:var(--text-secondary);margin-bottom:-6px; }
        .modal-body input,.modal-body textarea,.modal-body select {
          background:var(--bg-elevated);border:1px solid var(--border);border-radius:10px;
          padding:9px 12px;color:var(--text-primary);font-size:.9rem;width:100%;box-sizing:border-box;
        }
        .modal-body textarea { resize:vertical; }
        .form-row { display:grid;grid-template-columns:1fr 1fr;gap:12px; }
        .form-row > div { display:flex;flex-direction:column;gap:6px; }
        .file-drop {
          border:2px dashed var(--border);border-radius:10px;padding:20px;
          text-align:center;cursor:pointer;color:var(--text-muted);font-size:.88rem;
          transition:.2s;
        }
        .file-drop:hover { border-color:var(--accent);color:var(--accent); }
        .req { color:#e11d48; }
        .form-error { color:#e11d48;font-size:.85rem;margin:0; }
        .btn-primary { background:var(--accent);color:#fff;border:none;padding:10px 20px;border-radius:10px;cursor:pointer;font-weight:600; }
        .btn-primary.full { width:100%;text-align:center;padding:12px; }
        .btn-primary:disabled { opacity:.6;cursor:not-allowed; }

        .empty-state { display:flex;flex-direction:column;align-items:center;padding:60px 20px;gap:14px;color:var(--text-muted); }
        .empty-state span { font-size:3rem; }
        .load-more { display:block;margin:20px auto;padding:12px 32px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:20px;cursor:pointer;color:var(--text-secondary);font-size:.9rem; }

        @media(max-width:600px) {
          .resource-grid { grid-template-columns:1fr; }
          .resources-header { flex-direction:column; }
          .form-row { grid-template-columns:1fr; }
        }
      `})]})}export{A as default};
