import { supabase } from '../../supabase/client.js';
import { requireAuth } from '../../supabase/auth.js';
import { uploadPortalImage } from '../../supabase/storage.js';

const page = document.body.dataset.page;
const qs = (selector) => document.querySelector(selector);

function escapeHtml(value = '') { return String(value).replace(/[&<>"]/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[char])); }
function slugify(value = '') { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function formatDate(value) { if (!value) return '—'; return new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(value)); }
function showError(error, target = null) { console.error(error); const text = error?.message || 'Ocorreu um erro inesperado.'; if (target) { target.textContent = text; target.className = 'form-message error'; } else alert(text); }

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

async function loadNewsForm(){
  const form=qs('#newsForm');const message=qs('#formMessage');const id=new URLSearchParams(location.search).get('id');await loadSelectOptions();
  if(id){const{data,error}=await supabase.from('news').select('*').eq('id',id).single();if(error)throw error;qs('#pageTitle').textContent='Editar notícia';qs('#title').value=data.title||'';qs('#slug').value=data.slug||'';qs('#subtitle').value=data.subtitle||'';qs('#categoryId').value=data.category_id||'';qs('#authorId').value=data.author_id||'';qs('#content').value=data.content||'';qs('#status').value=data.status||'draft';qs('#publishedAt').value=data.published_at?new Date(data.published_at).toISOString().slice(0,16):'';qs('#metaDescription').value=data.meta_description||'';qs('#isBreaking').checked=Boolean(data.is_breaking);qs('#homepagePosition').value=data.homepage_position||'latest';qs('#coverImageUrl').value=data.cover_image_url||'';if(data.cover_image_url)qs('#imagePreview').src=data.cover_image_url;}
  qs('#title').addEventListener('input',()=>{if(!id||!qs('#slug').dataset.edited)qs('#slug').value=slugify(qs('#title').value)});qs('#slug').addEventListener('input',()=>{qs('#slug').dataset.edited='true'});qs('#coverImage').addEventListener('change',()=>{const file=qs('#coverImage').files[0];if(file)qs('#imagePreview').src=URL.createObjectURL(file)});
  form.addEventListener('submit',async(event)=>{event.preventDefault();const submit=qs('#saveButton');submit.disabled=true;message.textContent='Salvando...';message.className='form-message';try{let coverImageUrl=qs('#coverImageUrl').value||null;const file=qs('#coverImage').files[0];if(file){message.textContent='Enviando imagem...';coverImageUrl=(await uploadPortalImage(file,'news')).publicUrl;}const status=qs('#status').value;const position=qs('#homepagePosition').value;const payload={title:qs('#title').value.trim(),slug:slugify(qs('#slug').value||qs('#title').value),subtitle:qs('#subtitle').value.trim()||null,category_id:qs('#categoryId').value||null,author_id:qs('#authorId').value||null,content:qs('#content').value.trim(),status,homepage_position:position,is_featured:position==='hero',is_breaking:qs('#isBreaking').checked,cover_image_url:coverImageUrl,meta_description:qs('#metaDescription').value.trim()||null,published_at:status==='published'?(qs('#publishedAt').value?new Date(qs('#publishedAt').value).toISOString():new Date().toISOString()):null};const query=id?supabase.from('news').update(payload).eq('id',id).select('id').single():supabase.from('news').insert(payload).select('id').single();const{data,error}=await query;if(error)throw error;message.textContent='Notícia salva com sucesso.';message.className='form-message success';history.replaceState({},'',`./noticia-form.html?id=${data.id}`);}catch(error){showError(error,message)}finally{submit.disabled=false}});
}

await requireAuth();
if(page==='news-list')loadNewsList().catch(showError);
if(page==='news-form')loadNewsForm().catch(showError);