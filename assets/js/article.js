import { supabase } from '../../supabase/client.js';

const root=document.getElementById('articleRoot');
const params=new URLSearchParams(location.search);
const slug=params.get('slug');
const safe=(value='')=>{const div=document.createElement('div');div.textContent=value;return div.innerHTML};
const fallback='data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675"><rect width="1200" height="675" fill="#ececea"/><text x="600" y="338" text-anchor="middle" font-family="Arial" font-size="44" font-weight="700" fill="#777">PORTAL SERRA ATUAL</text></svg>`);

function formatDate(value){if(!value)return'';return new Intl.DateTimeFormat('pt-BR',{dateStyle:'long',timeStyle:'short'}).format(new Date(value))}
function youtubeId(url=''){const match=url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^?&/]+)/);return match?.[1]||''}
function parseBlocks(content=''){
  if(!content)return[];
  try{const data=JSON.parse(content);if(Array.isArray(data))return data}catch{}
  return [{type:'text',text:content}];
}
function renderBlock(block){
  if(block.type==='text')return `<div class="article-text">${safe(block.text||'').replace(/\n\n+/g,'</p><p>').replace(/\n/g,'<br>')}</div>`;
  if(block.type==='image'&&block.url)return `<figure><img src="${safe(block.url)}" alt="${safe(block.caption||'Imagem da matéria')}" onerror="this.src='${fallback}'">${block.caption?`<figcaption>${safe(block.caption)}</figcaption>`:''}</figure>`;
  if(block.type==='gallery'&&block.images?.length)return `<div class="article-gallery">${block.images.map(item=>`<figure><img src="${safe(item.url||item)}" alt="${safe(item.caption||'Imagem da galeria')}" onerror="this.src='${fallback}'">${item.caption?`<figcaption>${safe(item.caption)}</figcaption>`:''}</figure>`).join('')}</div>`;
  if(block.type==='video'&&block.url){const id=youtubeId(block.url);return id?`<figure class="article-video"><iframe src="https://www.youtube.com/embed/${safe(id)}" title="Vídeo da matéria" loading="lazy" allowfullscreen></iframe>${block.caption?`<figcaption>${safe(block.caption)}</figcaption>`:''}</figure>`:''}
  if(block.type==='quote')return `<blockquote><p>${safe(block.text||'')}</p>${block.author?`<cite>${safe(block.author)}</cite>`:''}</blockquote>`;
  if(block.type==='highlight')return `<aside class="article-highlight">${block.title?`<strong>${safe(block.title)}</strong>`:''}<p>${safe(block.text||'')}</p></aside>`;
  if(block.type==='ad')return `<div class="article-ad"><small>PUBLICIDADE</small><strong>Espaço publicitário</strong></div>`;
  return '';
}

async function loadArticle(){
  if(!slug){root.innerHTML='<div class="article-error"><h1>Matéria não encontrada</h1><a href="index.html">Voltar ao portal</a></div>';return}
  const {data,error}=await supabase.from('news').select('id,title,subtitle,content,cover_image_url,published_at,created_at,meta_description,category:categories(name),author:authors(name)').eq('slug',slug).eq('status','published').single();
  if(error||!data){root.innerHTML='<div class="article-error"><h1>Matéria não encontrada</h1><p>Ela pode ter sido removida ou ainda não está publicada.</p><a href="index.html">Voltar ao portal</a></div>';return}
  document.title=`${data.title} | Portal Serra Atual`;
  const meta=document.querySelector('meta[name="description"]');if(meta)meta.content=data.meta_description||data.subtitle||data.title;
  document.querySelector('.breaking span').textContent=data.title;
  const blocks=parseBlocks(data.content);
  root.innerHTML=`
    <header class="article-header">
      <span class="tag">${safe(data.category?.name||'Notícias')}</span>
      <h1>${safe(data.title)}</h1>
      ${data.subtitle?`<p class="article-subtitle">${safe(data.subtitle)}</p>`:''}
      <div class="article-meta">${data.author?.name?`Por <strong>${safe(data.author.name)}</strong> · `:''}${safe(formatDate(data.published_at||data.created_at))}</div>
    </header>
    ${data.cover_image_url?`<figure class="article-cover"><img src="${safe(data.cover_image_url)}" alt="${safe(data.title)}" onerror="this.src='${fallback}'"></figure>`:''}
    <div class="article-content">${blocks.map(renderBlock).join('')}</div>
    <div class="article-back"><a href="index.html">← Voltar para a página inicial</a></div>`;
}

document.querySelectorAll('[data-category]').forEach(link=>link.href=`categoria.html?slug=${encodeURIComponent(link.dataset.category)}`);
loadArticle();