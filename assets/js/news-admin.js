import { supabase } from '../../supabase/client.js';
import { requireAuth } from '../../supabase/auth.js';
import { uploadPortalImage } from '../../supabase/storage.js';

const page = document.body.dataset.page;
const qs = (selector) => document.querySelector(selector);
const qsa = (selector, root=document) => [...root.querySelectorAll(selector)];

function escapeHtml(value = '') { return String(value).replace(/[&<>\"]/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[char])); }
function slugify(value = '') { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function formatDate(value) { if (!value) return '—'; return new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(value)); }
function showError(error, target = null) { console.error(error); const text = error?.message || 'Ocorreu um erro inesperado.'; if (target) { target.textContent = text; target.className = 'form-message error'; } else alert(text); }
function uid(){return crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`}

async function loadNewsList() {
  const tbody = qs('#newsTableBody'); const search = qs('#searchNews'); const status = qs('#statusFilter');
  async function fetchRows() {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Carregando...</td></tr>';
    let query = supabase.from('news').select('id,title,slug,status,homepage_position,is_breaking,created_at,published_at,category:categories(name)').order('created_at',{ascending:false});
    if (status.value) query = query.eq('status',status.value);
    if (search.value.trim()) query = query.ilike('title',`%${search.value.trim()}%`);
    const { data,error } = await query; if (error) throw error;
    if (!data?.length) { tbody.innerHTML='<tr><td colspan="6" class="empty-state">Nenhuma notícia encontrada.</td></tr>'; return; }
    const labels={hero:'Carrossel principal',side:'Destaques laterais',latest:'Últimas notícias',technology:'Tecnologia'};
    tbody.innerHTML=data.map(item=>`<tr><td><strong>${escapeHtml(item.title)}</strong><br><small>${escapeHtml(item.slug||'')}</small></td><td>${escapeHtml(item.category?.name||'Sem categoria')}</td><td><span class="status-badge status-${escapeHtml(item.status)}">${escapeHtml(item.status)}</span></td><td>${escapeHtml(labels[item.homepage_position]||'Últimas notícias')}${item.is_breaking?' · Urgente':''}</td><td>${formatDate(item.published_at||item.created_at)}</td><td class="table-actions"><a class="button button-small button-secondary" href="./noticia-form.html?id=${item.id}">Editar</a><button class="button button-small button-danger" data-delete-id="${item.id}">Excluir</button></td></tr>`).join('');
  }
  let timer; search.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>fetchRows().catch(showError),300)}); status.addEventListener('change',()=>fetchRows().catch(showError));
  tbody.addEventListener('click',async(event)=>{const button=event.target.closest('[data-delete-id]');if(!button||!confirm('Excluir esta notícia definitivamente?'))return;button.disabled=true;const{error}=await supabase.from('news').delete().eq('id',button.dataset.deleteId);if(error){button.disabled=false;return showError(error)}await fetchRows()});
  await fetchRows();
}

async function loadSelectOptions(){
  const [{data:categories,error:categoryError},{data:authors,error:authorError}]=await Promise.all([supabase.from('categories').select('id,name').order('name'),supabase.from('authors').select('id,name').order('name')]);
  if(categoryError)throw categoryError;if(authorError)throw authorError;
  qs('#categoryId').innerHTML='<option value="">Selecione</option>'+(categories||[]).map(i=>`<option value="${i.id}">${escapeHtml(i.name)}</option>`).join('');
  qs('#authorId').innerHTML='<option value="">Selecione</option>'+(authors||[]).map(i=>`<option value="${i.id}">${escapeHtml(i.name)}</option>`).join('');
}

function parseBlocks(value=''){
  if(!value)return[];
  try{const parsed=JSON.parse(value);if(Array.isArray(parsed))return parsed}catch{}
  return [{id:uid(),type:'text',text:value}];
}

function blockTemplate(block){
  const id=block.id||uid();
  const type=block.type||'text';
  const labels={text:'Texto',image:'Imagem',gallery:'Galeria',video:'Vídeo',quote:'Citação',highlight:'Destaque',ad:'Publicidade'};
  let body='';
  if(type==='text')body=`<textarea class="control block-value" rows="7" placeholder="Escreva o texto da matéria...">${escapeHtml(block.text||'')}</textarea>`;
  if(type==='image')body=`<label class="mini-upload"><input class="block-file" type="file" accept="image/jpeg,image/png,image/webp" hidden><span>Selecionar imagem</span></label><input class="control block-url" type="url" placeholder="Ou cole a URL da imagem" value="${escapeHtml(block.url||'')}"><input class="control block-caption" type="text" placeholder="Legenda da imagem" value="${escapeHtml(block.caption||'')}"><img class="block-preview" src="${escapeHtml(block.url||'')}" alt="">`;
  if(type==='gallery')body=`<label class="mini-upload"><input class="block-files" type="file" accept="image/jpeg,image/png,image/webp" multiple hidden><span>Selecionar várias imagens</span></label><div class="gallery-preview"></div><input class="gallery-data" type="hidden" value='${escapeHtml(JSON.stringify(block.images||[]))}'>`;
  if(type==='video')body=`<input class="control block-url" type="url" placeholder="Cole o link do YouTube" value="${escapeHtml(block.url||'')}"><input class="control block-caption" type="text" placeholder="Legenda do vídeo" value="${escapeHtml(block.caption||'')}">`;
  if(type==='quote')body=`<textarea class="control block-value" rows="4" placeholder="Digite a citação">${escapeHtml(block.text||'')}</textarea><input class="control block-author" type="text" placeholder="Autor da citação" value="${escapeHtml(block.author||'')}">`;
  if(type==='highlight')body=`<input class="control block-title" type="text" placeholder="Título do destaque" value="${escapeHtml(block.title||'')}"><textarea class="control block-value" rows="4" placeholder="Texto de destaque">${escapeHtml(block.text||'')}</textarea>`;
  if(type==='ad')body=`<select class="control block-ad-size"><option value="in-feed" ${block.size==='in-feed'?'selected':''}>Banner dentro da matéria</option><option value="square" ${block.size==='square'?'selected':''}>Banner quadrado</option></select><p class="block-help">O espaço será preenchido pelas campanhas ativas do portal.</p>`;
  return `<article class="editor-block" data-id="${id}" data-type="${type}" draggable="true"><header><span class="drag-handle" title="Arrastar">☰</span><strong>${labels[type]}</strong><div class="block-actions"><button type="button" data-move="up" title="Subir">↑</button><button type="button" data-move="down" title="Descer">↓</button><button type="button" data-remove title="Excluir">×</button></div></header><div class="editor-block-body">${body}</div></article>`;
}

function setupBlockEditor(initialBlocks=[]){
  const editor=qs('#blocksEditor');
  const content=qs('#content');
  const addBlock=(type,data={})=>{editor.insertAdjacentHTML('beforeend',blockTemplate({id:uid(),type,...data}));hydrateBlocks();sync()};
  const sync=()=>{content.value=JSON.stringify(readBlocks())};
  const render=blocks=>{editor.innerHTML=(blocks.length?blocks:[{id:uid(),type:'text',text:''}]).map(blockTemplate).join('');hydrateBlocks();sync()};
  const readBlocks=()=>qsa('.editor-block',editor).map(el=>{
    const type=el.dataset.type;const block={id:el.dataset.id,type};
    if(['text','quote','highlight'].includes(type))block.text=el.querySelector('.block-value')?.value.trim()||'';
    if(type==='image'){block.url=el.querySelector('.block-url')?.value.trim()||'';block.caption=el.querySelector('.block-caption')?.value.trim()||''}
    if(type==='gallery'){try{block.images=JSON.parse(el.querySelector('.gallery-data')?.value||'[]')}catch{block.images=[]}}
    if(type==='video'){block.url=el.querySelector('.block-url')?.value.trim()||'';block.caption=el.querySelector('.block-caption')?.value.trim()||''}
    if(type==='quote')block.author=el.querySelector('.block-author')?.value.trim()||'';
    if(type==='highlight')block.title=el.querySelector('.block-title')?.value.trim()||'';
    if(type==='ad')block.size=el.querySelector('.block-ad-size')?.value||'in-feed';
    return block;
  });
  const hydrateBlocks=()=>{
    qsa('.editor-block',editor).forEach(el=>{
      const preview=el.querySelector('.block-preview');if(preview&&!preview.getAttribute('src'))preview.style.display='none';
      const gallery=el.querySelector('.gallery-data');if(gallery){let images=[];try{images=JSON.parse(gallery.value||'[]')}catch{}renderGallery(el,images)}
    })
  };
  const renderGallery=(el,images)=>{const wrap=el.querySelector('.gallery-preview');if(!wrap)return;wrap.innerHTML=images.map((item,index)=>`<div><img src="${escapeHtml(item.url||item)}" alt=""><button type="button" data-gallery-remove="${index}">×</button></div>`).join('')};

  editor.addEventListener('input',sync);
  editor.addEventListener('change',async event=>{
    const el=event.target.closest('.editor-block');if(!el)return;
    try{
      if(event.target.matches('.block-file')){const file=event.target.files[0];if(!file)return;const preview=el.querySelector('.block-preview');preview.src=URL.createObjectURL(file);preview.style.display='block';const result=await uploadPortalImage(file,'news-blocks');el.querySelector('.block-url').value=result.publicUrl;preview.src=result.publicUrl;sync()}
      if(event.target.matches('.block-files')){const files=[...event.target.files];if(!files.length)return;const data=el.querySelector('.gallery-data');let images=[];try{images=JSON.parse(data.value||'[]')}catch{}for(const file of files){const result=await uploadPortalImage(file,'news-gallery');images.push({url:result.publicUrl,caption:''})}data.value=JSON.stringify(images);renderGallery(el,images);sync()}
      if(event.target.matches('.block-url')&&el.dataset.type==='image'){const preview=el.querySelector('.block-preview');preview.src=event.target.value;preview.style.display=event.target.value?'block':'none'}
    }catch(error){showError(error)}
  });
  editor.addEventListener('click',event=>{
    const block=event.target.closest('.editor-block');if(!block)return;
    if(event.target.closest('[data-remove]')){if(confirm('Excluir este bloco?')){block.remove();sync()}}
    if(event.target.closest('[data-move="up"]')&&block.previousElementSibling){editor.insertBefore(block,block.previousElementSibling);sync()}
    if(event.target.closest('[data-move="down"]')&&block.nextElementSibling){editor.insertBefore(block.nextElementSibling,block);sync()}
    const removeGallery=event.target.closest('[data-gallery-remove]');if(removeGallery){const data=block.querySelector('.gallery-data');let images=[];try{images=JSON.parse(data.value||'[]')}catch{}images.splice(Number(removeGallery.dataset.galleryRemove),1);data.value=JSON.stringify(images);renderGallery(block,images);sync()}
  });
  let dragged=null;
  editor.addEventListener('dragstart',event=>{dragged=event.target.closest('.editor-block');dragged?.classList.add('dragging')});
  editor.addEventListener('dragend',()=>{dragged?.classList.remove('dragging');dragged=null;sync()});
  editor.addEventListener('dragover',event=>{event.preventDefault();if(!dragged)return;const after=qsa('.editor-block:not(.dragging)',editor).find(el=>event.clientY<el.getBoundingClientRect().top+el.offsetHeight/2);after?editor.insertBefore(dragged,after):editor.appendChild(dragged)});
  qsa('[data-add-block]').forEach(button=>button.addEventListener('click',()=>addBlock(button.dataset.addBlock)));
  qs('#addFirstText')?.addEventListener('click',()=>addBlock('text'));
  render(initialBlocks);
  return {sync,readBlocks};
}

async function loadNewsForm(){
  const form=qs('#newsForm');const message=qs('#formMessage');const id=new URLSearchParams(location.search).get('id');await loadSelectOptions();let initialBlocks=[];
  if(id){const{data,error}=await supabase.from('news').select('*').eq('id',id).single();if(error)throw error;qs('#pageTitle').textContent='Editar notícia';qs('#title').value=data.title||'';qs('#slug').value=data.slug||'';qs('#subtitle').value=data.subtitle||'';qs('#categoryId').value=data.category_id||'';qs('#authorId').value=data.author_id||'';initialBlocks=parseBlocks(data.content||'');qs('#status').value=data.status||'draft';qs('#publishedAt').value=data.published_at?new Date(data.published_at).toISOString().slice(0,16):'';qs('#metaDescription').value=data.meta_description||'';qs('#isBreaking').checked=Boolean(data.is_breaking);qs('#homepagePosition').value=data.homepage_position||'latest';qs('#coverImageUrl').value=data.cover_image_url||'';if(data.cover_image_url)qs('#imagePreview').src=data.cover_image_url;}
  const blockEditor=setupBlockEditor(initialBlocks);
  qs('#title').addEventListener('input',()=>{if(!id||!qs('#slug').dataset.edited)qs('#slug').value=slugify(qs('#title').value)});qs('#slug').addEventListener('input',()=>{qs('#slug').dataset.edited='true'});qs('#coverImage').addEventListener('change',()=>{const file=qs('#coverImage').files[0];if(file)qs('#imagePreview').src=URL.createObjectURL(file)});
  form.addEventListener('submit',async(event)=>{event.preventDefault();const submit=qs('#saveButton');submit.disabled=true;message.textContent='Salvando...';message.className='form-message';try{blockEditor.sync();const blocks=blockEditor.readBlocks();if(!blocks.some(block=>block.type!=='ad'&&(block.text||block.url||(block.images&&block.images.length))))throw new Error('Adicione pelo menos um bloco de conteúdo à matéria.');let coverImageUrl=qs('#coverImageUrl').value||null;const file=qs('#coverImage').files[0];if(file){message.textContent='Enviando imagem...';coverImageUrl=(await uploadPortalImage(file,'news')).publicUrl;}const status=qs('#status').value;const position=qs('#homepagePosition').value;const payload={title:qs('#title').value.trim(),slug:slugify(qs('#slug').value||qs('#title').value),subtitle:qs('#subtitle').value.trim()||null,category_id:qs('#categoryId').value||null,author_id:qs('#authorId').value||null,content:JSON.stringify(blocks),status,homepage_position:position,is_featured:position==='hero',is_breaking:qs('#isBreaking').checked,cover_image_url:coverImageUrl,meta_description:qs('#metaDescription').value.trim()||null,published_at:status==='published'?(qs('#publishedAt').value?new Date(qs('#publishedAt').value).toISOString():new Date().toISOString()):null};const query=id?supabase.from('news').update(payload).eq('id',id).select('id').single():supabase.from('news').insert(payload).select('id').single();const{data,error}=await query;if(error)throw error;message.textContent='Notícia salva com sucesso.';message.className='form-message success';history.replaceState({},'',`./noticia-form.html?id=${data.id}`);}catch(error){showError(error,message)}finally{submit.disabled=false}});
}

await requireAuth();
if(page==='news-list')loadNewsList().catch(showError);
if(page==='news-form')loadNewsForm().catch(showError);