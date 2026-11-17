const BLOG_FILE_LIMIT=10*1024*1024;
function blogFileSize(bytes) {return bytes>=1024*1024 ? (bytes/1024/1024).toFixed(1)+' MB' : Math.max(1,Math.ceil(bytes/1024))+' KB';}
function blogAttachments(files,editable=false) {
  return (files||[]).map(file=>`<div class="blog-file"><a href="/api/blog/attachments/${file.id}" download><span>${escapeHTML(file.filename)}</span><small>${blogFileSize(file.size)} · 다운로드</small></a>${editable?`<button type="button" class="text-button" data-file-delete="${file.id}" aria-label="${escapeHTML(file.filename)} 삭제">삭제</button>`:''}</div>`).join('');
}
function blogPendingFiles() {
  const list=document.querySelector('#blog-pending-files');
  if(list)list.innerHTML=(blogState.editor?.pendingFiles||[]).map(file=>`<li>${escapeHTML(file.name)} <span>${blogFileSize(file.size)}</span></li>`).join('');
}
async function blogUpload(postId,file) {
  let response;
  try {response=await fetch('/api/blog/posts/'+postId+'/attachments',{method:'POST',headers:{'Content-Type':'application/octet-stream','X-File-Name':encodeURIComponent(file.name)},body:file});}
  catch {throw Error('파일 전송 중 연결이 끊겼어요. 다시 저장해주세요.');}
  const data=await response.json();
  if(!response.ok)throw Error(data.error||'파일을 첨부하지 못했어요.');
  return data;
}
function bindBlogAttachments(root) {
  root.querySelector('#blog-files')?.addEventListener('change',event=>{
    const input=event.currentTarget,files=Array.from(input.files);
    const invalid=files.some(file=>file.size>BLOG_FILE_LIMIT || file.size===0);
    input.setCustomValidity(invalid?'빈 파일은 첨부할 수 없고, 파일당 10MB까지 가능해요.':'');
    blogState.editor.pendingFiles=files;
    blogPendingFiles();
    if(invalid)input.reportValidity();
  });
  root.querySelectorAll('[data-file-delete]').forEach(button=>button.onclick=async()=>{
    if(!confirm('첨부파일을 삭제할까요?'))return;button.disabled=true;
    try {
      await blogApi('/attachments/'+button.dataset.fileDelete,'DELETE',{});
      if(blogState.editor){blogState.editor.attachments=(blogState.editor.attachments||[]).filter(file=>file.id!==button.dataset.fileDelete);button.closest('.blog-file').remove();}
      else blogReload();
    } catch(error){toast(error.message);button.disabled=false;}
  });
  blogPendingFiles();
}

// Blog 화면·편집·댓글. 저장과 권한 검증은 server/blog.py에서 처리합니다.
const BLOG_TABS=[['tech','Tech'],['achievement','성과공유'],['qna','문의사항']];
const blogState={category:'tech',query:'',page:1,id:null,editor:null,data:null,loadedKey:'',loadingKey:'',error:'',request:0,commentEditor:null};
const blogIsAdmin=()=>globalThis.currentMember?.role==='admin';
const blogLabel=key=>BLOG_TABS.find(([id])=>id===key)?.[1] || 'Blog';
const blogKey=()=>blogState.id ? `post:${blogState.id}` : `${blogState.category}:${blogState.page}:${blogState.query}`;
const blogDate=value=>new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));

async function blogApi(path,method='GET',data) {
  if(globalThis.YOUWITH_PUBLIC_PREVIEW)throw Error('게시판은 준비 중이에요.');
  let response;
  try {response=await fetch('/api/blog'+path,{method,cache:'no-store',...(data===undefined ? {} : {headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})});}
  catch {throw Error('서버에 연결할 수 없어요. 잠시 뒤 다시 시도해주세요.');}
  let result;
  try {result=await response.json();} catch {throw Error('서버 응답을 확인할 수 없어요. 새로고침해주세요.');}
  if (!response.ok) throw Error(result.error || '처리하지 못했어요. 다시 시도해주세요.');
  return result;
}
function blogInline(value) {
  return escapeHTML(value).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}
function blogContent(value) {
  const blocks=[];let paragraph=[],code=null,list=[];
  const flush=()=>{if(paragraph.length){blocks.push('<p>'+paragraph.map(blogInline).join('<br>')+'</p>');paragraph=[];}if(list.length){blocks.push('<ul>'+list.map(x=>'<li>'+blogInline(x)+'</li>').join('')+'</ul>');list=[];}};
  for(const line of value.split('\n')) {
    if(line.startsWith('```')) {flush();if(code===null)code=[];else {blocks.push('<pre><code>'+escapeHTML(code.join('\n'))+'</code></pre>');code=null;}continue;}
    if(code!==null){code.push(line);continue;}
    if(!line.trim()){flush();continue;}
    if(/^#{1,6} /.test(line)){flush();blocks.push('<h2>'+blogInline(line.replace(/^#{1,6} /,''))+'</h2>');continue;}
    if(/^- /.test(line)){if(paragraph.length)flush();list.push(line.slice(2));continue;}
    if(list.length)flush();paragraph.push(line);
  }
  flush();if(code!==null)blocks.push('<pre><code>'+escapeHTML(code.join('\n'))+'</code></pre>');
  return blocks.join('');
}
function blogTags(tags) {return (tags||[]).map(tag=>`<span class="blog-tag">#${escapeHTML(tag)}</span>`).join('');}
function blogEditor() {
  const draft=blogState.editor;
  return `<section class="panel blog-editor"><div class="section-head"><h1>${draft.id ? '글 수정' : '새 글 쓰기'}</h1><button class="text-button" data-blog-cancel>취소</button></div><form id="blog-editor-form" class="form-grid"><label>게시판<select name="category" ${blogIsAdmin() ? '' : 'disabled'}>${BLOG_TABS.filter(([id])=>blogIsAdmin()||id==='qna').map(([id,name])=>`<option value="${id}" ${id===draft.category?'selected':''}>${name}</option>`).join('')}</select></label><label>제목<input name="title" maxlength="160" required value="${escapeHTML(draft.title||'')}" placeholder="제목을 입력해주세요"></label><label>한 줄 소개<input name="summary" maxlength="240" value="${escapeHTML(draft.summary||'')}" placeholder="목록에 보여줄 짧은 소개 (선택)"></label><label>본문<textarea name="content" rows="16" maxlength="20000" required placeholder="내용을 작성해주세요">${escapeHTML(draft.content||'')}</textarea></label><p class="small-muted">Markdown: ## 소제목, **강조**, - 목록, 코드 앞뒤에 \`\`\`를 사용할 수 있어요.</p><label>태그<input name="tags" maxlength="240" value="${escapeHTML((draft.tags||[]).join(', '))}" placeholder="Python, 프로젝트, 회고"></label><label>파일 첨부<input id="blog-files" type="file" multiple></label><p class="small-muted">파일당 최대 10MB · 글을 저장하면 함께 첨부돼요.</p><ul id="blog-pending-files" class="blog-pending-files"></ul><div id="blog-existing-files">${blogAttachments(draft.attachments,true)}</div><div class="blog-editor-actions"><button class="primary" type="submit">${draft.id ? '수정 내용 저장' : '글 등록'}</button><button type="button" class="secondary" data-blog-cancel>취소</button></div><p class="form-error" role="alert"></p></form></section>`;
}
function blogPostView(data) {
  const p=data.post;
  return `<article class="panel blog-article"><div class="blog-back-row"><button class="text-button" data-blog-list>← 목록으로</button>${p.canEdit?'<div class="blog-manage"><button class="text-button" data-blog-edit>수정</button><button class="text-button blog-danger" data-blog-delete>삭제</button></div>':''}</div><p class="blog-category">${blogLabel(p.category)}</p><h1>${escapeHTML(p.title)}</h1><p class="blog-meta">${escapeHTML(p.author)} · ${blogDate(p.created_at)}${p.updated_at!==p.created_at ? ' · 수정됨':''}</p><div class="blog-tags">${blogTags(p.tags)}</div>${p.summary?`<p class="blog-summary">${escapeHTML(p.summary)}</p>`:''}<div class="blog-content">${blogContent(p.content)}</div>${data.attachments?.length?`<section class="blog-attachments"><h2>첨부파일 ${data.attachments.length}</h2>${blogAttachments(data.attachments,p.canEdit)}</section>`:""}</article><section class="panel blog-comments"><h2>댓글 ${data.comments.length}</h2><div class="blog-comment-list">${data.comments.map(comment=>`<div class="blog-comment"><div class="blog-comment-heading"><strong>${escapeHTML(comment.author)}</strong><span class="blog-meta">${blogDate(comment.created_at)}</span>${comment.canEdit?`<span class="blog-manage"><button class="text-button" data-comment-edit="${comment.id}">수정</button><button class="text-button blog-danger" data-comment-delete="${comment.id}">삭제</button></span>`:''}</div>${blogState.commentEditor===comment.id?`<form data-comment-form="${comment.id}" class="form-grid"><label><span class="sr-only">댓글 수정</span><textarea name="content" required maxlength="2000" rows="3">${escapeHTML(comment.content)}</textarea></label><div class="blog-manage"><button class="primary">수정 저장</button><button type="button" class="text-button" data-comment-cancel>취소</button></div><p class="form-error" role="alert"></p></form>`:`<p class="blog-comment-text">${escapeHTML(comment.content)}</p>`}</div>`).join('') || '<p class="small-muted">첫 댓글을 남겨보세요.</p>'}</div><form id="blog-comment-form" class="form-grid"><label>댓글 작성<textarea name="content" required maxlength="2000" rows="3" placeholder="생각이나 답변을 남겨주세요"></textarea></label><button class="primary">댓글 등록</button><p class="form-error" role="alert"></p></form></section>`;
}
// Add a trusted HTML article here and put its files in frontend/tech/.
const TECH_ARTICLES=[
  {id:'mosfet',title:'MOSFET',summary:'드래그로 만나는 반도체의 구조',tags:'3D · 반도체',url:'tech/mosfet.html',preview:'tech/mosfet-cover.png?v=2'},
  {id:'finfet',title:'FinFET',summary:'채널의 세 면을 감싸는 게이트',tags:'3D · 반도체',url:'tech/finfet.html',preview:'tech/finfet-cover.png'},
  {id:'gaafet',title:'GAAFET',summary:'나노시트의 전체 둘레를 감싸다',tags:'3D · 반도체',url:'tech/gaafet.html',preview:'tech/gaafet-cover.png'},
  {id:'cfet',title:'CFET',summary:'nFET과 pFET을 위아래로 쌓다',tags:'3D · 반도체',url:'tech/cfet.html',preview:'tech/cfet-cover.png'},
  {id:'neural-network',title:'인공신경망',summary:'예측과 학습을 직접 따라가보세요',tags:'3D · AI 학습',url:'tech/neural-network.html',preview:'tech/neural-network-cover.png'},
  {id:'decision-tree',title:'결정트리 학습',summary:'질문을 나누며 예측의 길을 찾다',tags:'3D · AI 학습',url:'tech/decision-tree.html',preview:'tech/decision-tree-cover.png'}
];
function techArticleCards() {
  if(blogState.page!==1)return '';
  const query=blogState.query.toLocaleLowerCase();
  return TECH_ARTICLES.filter(article=>[article.title,article.summary,article.tags].join(' ').toLocaleLowerCase().includes(query)).map(article=>`<a class="tech-card ${article.id}-card image-card" data-cover="${article.id}" style="--cover:url('${article.preview}')" href="${article.url}"><svg class="tech-card-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12"/></svg><div><h2>${article.title}</h2><p>${article.summary}</p></div><span class="tech-card-meta">${article.tags}<span>열어보기</span></span></a>`).join('');
}
function blogList(data) {
  if(globalThis.YOUWITH_PUBLIC_PREVIEW&&blogState.category!=='tech')return '<section class="panel blog-feed blog-empty"><h2>게시판은 준비 중이에요.</h2><p>Tech에서는 반도체 구조와 AI 학습을 둘러볼 수 있어요.</p></section>';
  if(blogState.category==='tech') {
    const cards=techArticleCards()+data.posts.map(post=>`<button class="tech-card" data-blog-open="${post.id}"><svg class="tech-card-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12"/></svg><div><h2>${escapeHTML(post.title)}</h2><p>${escapeHTML(post.summary||post.excerpt)}</p></div><span class="tech-card-meta">${escapeHTML(post.author)}<span>${blogDate(post.created_at)}</span></span></button>`).join('');
    return `<section class="tech-grid" aria-label="Tech 글 목록">${cards||'<div class="panel blog-empty"><h2>검색 결과가 없어요.</h2><p>다른 제목이나 키워드로 검색해보세요.</p></div>'}</section>${data.total>data.pageSize?`<div class="blog-pagination"><button class="secondary" data-blog-page="${Math.max(1,blogState.page-1)}" ${blogState.page===1?'disabled':''}>이전</button><span>${blogState.page} / ${Math.max(1,Math.ceil(data.total/data.pageSize))}</span><button class="secondary" data-blog-page="${blogState.page+1}" ${blogState.page*data.pageSize>=data.total?'disabled':''}>다음</button></div>`:''}`;
  }
  return `<section class="panel blog-feed">${data.posts.length?data.posts.map(post=>`<button class="blog-card" data-blog-open="${post.id}"><span class="blog-meta">${escapeHTML(post.author)} · ${blogDate(post.created_at)}</span><h2>${escapeHTML(post.title)}</h2><p>${escapeHTML(post.summary || post.excerpt)}</p><span class="blog-tags">${blogTags(post.tags)}</span></button>`).join(''):`<div class="blog-empty"><h2>아직 ${blogLabel(blogState.category)} 글이 없어요.</h2><p>${blogState.query?'검색어를 바꾸거나 검색을 초기화해주세요.':blogState.category==='qna'?'궁금한 점을 질문해보세요.':'새로운 이야기를 기다려주세요.'}</p></div>`}</section><div class="blog-pagination"><button class="secondary" data-blog-page="${Math.max(1,blogState.page-1)}" ${blogState.page===1?'disabled':''}>이전</button><span>${blogState.page} / ${Math.max(1,Math.ceil(data.total/data.pageSize))}</span><button class="secondary" data-blog-page="${blogState.page+1}" ${blogState.page*data.pageSize>=data.total?'disabled':''}>다음</button></div>`;
}
function blog() {
  if(blogState.editor)return `<div class="blog-shell">${blogEditor()}</div>`;
  const title=blogState.id?'':`<div class="page-title"><h1>Blog</h1></div><div class="blog-toolbar"><div class="filters" aria-label="Blog 게시판">${BLOG_TABS.map(([id,name])=>`<button class="filter ${blogState.category===id?'selected':''}" data-blog-category="${id}" aria-pressed="${blogState.category===id}">${name}</button>`).join('')}</div>${!globalThis.YOUWITH_PUBLIC_PREVIEW&&(blogIsAdmin()||blogState.category==='qna')?'<button class="primary" data-blog-new>글 쓰기 +</button>':''}</div><form id="blog-search" class="blog-search"><label class="sr-only" for="blog-search-input">글 검색</label><input id="blog-search-input" name="q" type="search" maxlength="100" placeholder="제목, 내용, 태그 검색" value="${escapeHTML(blogState.query)}"><button class="secondary">검색</button></form>`;
  const body=blogState.error?`<section class="panel"><p role="alert">${escapeHTML(blogState.error)}</p><button class="secondary" data-blog-retry>다시 불러오기</button><button class="text-button" data-blog-list>목록으로</button></section>`:blogState.loadedKey!==blogKey()?'<section class="panel blog-loading" role="status">글을 불러오고 있어요.</section>':blogState.id?blogPostView(blogState.data):blogList(blogState.data);
  return `<div class="blog-shell ${blogState.category==='tech'&&!blogState.id?'tech-shell':''}">${title}<div id="blog-content-area" aria-live="polite">${body}</div></div>`;
}
async function loadBlog() {
  if(blogState.editor)return;
  if(globalThis.YOUWITH_PUBLIC_PREVIEW) {
    blogState.id=null;
    const key=blogKey();
    if(blogState.loadedKey===key)return;
    blogState.data={posts:[],total:0,pageSize:12};blogState.loadedKey=key;blogState.error='';
    if(page==='blog')render();
    return;
  }
  const key=blogKey();
  if(blogState.loadedKey===key || blogState.loadingKey===key)return;
  const request=++blogState.request;
  blogState.loadingKey=key;blogState.error='';
  try {
    const path=blogState.id?'/posts/'+blogState.id:'/posts?'+new URLSearchParams({category:blogState.category,q:blogState.query,page:blogState.page});
    const data=await blogApi(path);
    if(request!==blogState.request)return;
    blogState.data=data;blogState.loadedKey=key;
  } catch(error) {if(request===blogState.request){blogState.error=error.message;blogState.loadedKey=key;}}
  finally {if(request===blogState.request){blogState.loadingKey='';if(page==='blog'&&!blogState.editor)render();}}
}
function blogCanDiscard() {
  const form=document.querySelector('#blog-editor-form');
  if(!form || !blogState.editor)return true;
  const fields=new FormData(form),draft=blogState.editor;
  const dirty=['title','summary','content'].some(key=>(fields.get(key)||'')!==(draft[key]||'')) || (fields.get('tags')||'')!==(draft.tags||[]).join(', ') || (fields.get('category')||draft.category)!==draft.category;
  return !(dirty || blogState.editor.pendingFiles?.length) || confirm('저장하지 않은 내용을 닫을까요?');
}
function blogReload() {blogState.loadedKey='';blogState.error='';render();}
function bindBlog(root) {
  if(page!=='blog')return;
  root.querySelectorAll('[data-blog-category]').forEach(button=>button.onclick=()=>{blogState.category=button.dataset.blogCategory;blogState.page=1;blogState.id=null;blogState.query='';blogState.error='';render();});
  root.querySelectorAll('[data-blog-open]').forEach(button=>button.onclick=()=>{blogState.id=button.dataset.blogOpen;blogState.commentEditor=null;blogState.error='';render();window.scrollTo({top:0,behavior:'instant'});});
  root.querySelectorAll('[data-blog-list]').forEach(button=>button.onclick=()=>{blogState.id=null;blogState.error='';render();});
  root.querySelector('[data-blog-new]')?.addEventListener('click',()=>{blogState.editor={category:blogState.category,title:'',summary:'',content:'',tags:[]};render();});
  root.querySelector('[data-blog-edit]')?.addEventListener('click',()=>{blogState.editor={...blogState.data.post,attachments:blogState.data.attachments||[]};render();});
  root.querySelectorAll('[data-blog-cancel]').forEach(button=>button.onclick=()=>{if(blogCanDiscard()){blogState.editor=null;render();}});
  root.querySelector('[data-blog-retry]')?.addEventListener('click',blogReload);
  root.querySelectorAll('[data-blog-page]').forEach(button=>button.onclick=()=>{blogState.page=Number(button.dataset.blogPage);render();window.scrollTo({top:0,behavior:'instant'});});
  root.querySelector('#blog-search')?.addEventListener('submit',event=>{event.preventDefault();blogState.query=new FormData(event.currentTarget).get('q').trim();blogState.page=1;render();});
  root.querySelector('#blog-editor-form')?.addEventListener('submit',async event=>{
    event.preventDefault();const form=event.currentTarget,button=form.querySelector('button[type=submit]'),error=form.querySelector('.form-error');button.disabled=true;error.textContent='';
    const fields=Object.fromEntries(new FormData(form));fields.category=fields.category || blogState.editor.category;
    const draft=blogState.editor;
    try {
      if((draft.pendingFiles||[]).some(file=>file.size>BLOG_FILE_LIMIT||file.size===0))throw Error('파일당 0바이트 초과, 10MB 이하로 첨부해주세요.');
      const result=await blogApi('/posts'+(draft.id?'/'+draft.id:''),draft.id?'PATCH':'POST',fields);
      draft.id=result.id;draft.attachments=draft.attachments||[];
      while(draft.pendingFiles?.length) {
        button.textContent='파일 첨부 중…';
        const file=await blogUpload(result.id,draft.pendingFiles[0]);
        draft.attachments.push(file);draft.pendingFiles.shift();blogPendingFiles();
      }
      blogState.editor=null;blogState.id=result.id;blogState.category=fields.category;blogReload();toast('글을 저장했어요.');
    }
    catch(failure){
      error.textContent=(draft.id?'글은 저장되어 있어요. ':'')+failure.message;
      button.disabled=false;button.textContent=draft.id?'수정 내용 저장':'글 등록';
      const existing=form.querySelector('#blog-existing-files');if(existing){existing.innerHTML=blogAttachments(draft.attachments,true);bindBlogAttachments(existing);}
    }
  });
  root.querySelector('[data-blog-delete]')?.addEventListener('click',async event=>{
    if(!confirm('이 글과 연결된 댓글을 삭제할까요?'))return;
    const button=event.currentTarget;button.disabled=true;
    try {await blogApi('/posts/'+blogState.id,'DELETE',{});blogState.id=null;blogReload();toast('글을 삭제했어요.');}
    catch(error){toast(error.message);button.disabled=false;}
  });
  root.querySelector('#blog-comment-form')?.addEventListener('submit',async event=>{
    event.preventDefault();const form=event.currentTarget,button=form.querySelector('button');button.disabled=true;
    try {await blogApi('/posts/'+blogState.id+'/comments','POST',Object.fromEntries(new FormData(form)));blogReload();}
    catch(error){form.querySelector('.form-error').textContent=error.message;button.disabled=false;}
  });
  root.querySelectorAll('[data-comment-edit]').forEach(button=>button.onclick=()=>{blogState.commentEditor=button.dataset.commentEdit;render();});
  root.querySelector('[data-comment-cancel]')?.addEventListener('click',()=>{blogState.commentEditor=null;render();});
  root.querySelectorAll('[data-comment-form]').forEach(form=>form.onsubmit=async event=>{
    event.preventDefault();const button=form.querySelector('button');button.disabled=true;
    try {await blogApi('/comments/'+form.dataset.commentForm,'PATCH',Object.fromEntries(new FormData(form)));blogState.commentEditor=null;blogReload();}
    catch(error){form.querySelector('.form-error').textContent=error.message;button.disabled=false;}
  });
  root.querySelectorAll('[data-comment-delete]').forEach(button=>button.onclick=async()=>{
    if(!confirm('댓글을 삭제할까요?'))return;button.disabled=true;
    try {await blogApi('/comments/'+button.dataset.commentDelete,'DELETE',{});blogReload();}
    catch(error){toast(error.message);button.disabled=false;}
  });
  bindBlogAttachments(root);
  loadBlog();
}
