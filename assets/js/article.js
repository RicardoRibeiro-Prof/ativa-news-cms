import { supabase } from '../../supabase/client.js';

const root=document.getElementById('articleRoot');
const params=new URLSearchParams(location.search);
const slug=params.get('slug');
const safe=(value='')=>{const div=document.createElement('div');div.textContent=value;return div.innerHTML};
const fallback='data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675"><rect width="1200" height="675" fill="#ececea"/><text x="600" y="338" text-anchor="middle" font-family="Arial" font-size="44" font-weight="700" fill="#777">PORTAL SERRA ATUAL</text></svg>`);
let breakingTimer=null;

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

function setupBreakingStyle(){
  if(document.getElementById('breakingTickerStyle'))return;
  const style=document.createElement('style');
  style.id='breakingTickerStyle';
  style.textContent=`.breaking .wrap{overflow:hidden}.breaking-ticker{position:relative;display:block;flex:1;min-width:0;height:38px;color:#fff}.breaking-ticker-item{position:absolute;inset:0;display:flex;align-items:center;color:#fff;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:0;transform:translateY(100%);transition:opacity .45s ease,transform .45s ease}.breaking-ticker-item.active{opacity:1;transform:translateY(0)}.breaking-ticker-item.leaving{opacity:0;transform:translateY(-100%)}@media(max-width:620px){.breaking-ticker{height:32px}.breaking-ticker-item{font-size:12px}}`;
  document.head.appendChild(style);
}

function renderBreaking(items){
  const wrap=document.querySelector('.breaking .wrap');
  if(!wrap)return;
  setupBreakingStyle();
  clearInterval(breakingTimer);
  const news=items.slice(0,10);
  if(!news.length){wrap.innerHTML='<strong>AGORA</strong><span>Portal Serra Atual</span>';return}
  wrap.innerHTML=`<strong>AGORA</strong><div class="breaking-ticker">${news.map((item,index)=>`<a class="breaking-ticker-item${index===0?' active':''}" href="noticia.html?slug=${encodeURIComponent(item.slug||item.id)}">${safe(item.title)}</a>`).join('')}</div>`;
  if(news.length===1)return;
  let current=0;
  breakingTimer=setInterval(()=>{
    const links=[...wrap.querySelectorAll('.breaking-ticker-item')];
    links[current].classList.remove('active');links[current].classList.add('leaving');
    current=(current+1)%links.length;
    links[current].classList.remove('leaving');links[current].classList.add('active');
    setTimeout(()=>links.forEach((link,index)=>{if(index!==current)link.classList.remove('leaving')}),500);
  },4500);
}

async function loadBreakingNews(){
  const {data,error}=await supabase.from('news').select('id,slug,title,published_at,created_at').eq('status','published').order('published_at',{ascending:false}).order('created_at',{ascending:false}).limit(10);
  if(!error)renderBreaking(data||[]);
}

async function loadArticle(){
  if(!slug){root.innerHTML='<div class="article-error"><h1>Matéria não encontrada</h1><a href="index.html">Voltar ao portal</a></div>';return}
  const {data,error}=await supabase.from('news').select('id,title,subtitle,content,cover_image_url,published_at,created_at,meta_description,category:categories(name),author:authors(name)').eq('slug',slug).eq('status','published').single();
  if(error||!data){root.innerHTML='<div class="article-error"><h1>Matéria não encontrada</h1><p>Ela pode ter sido removida ou ainda não está publicada.</p><a href="index.html">Voltar ao portal</a></div>';return}
  document.title=`${data.title} | Portal Serra Atual`;
  const meta=document.querySelector('meta[name="description"]');if(meta)meta.content=data.meta_description||data.subtitle||data.title;
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
Promise.allSettled([loadArticle(),loadBreakingNews()]);