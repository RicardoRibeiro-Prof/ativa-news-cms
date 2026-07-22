import { supabase } from '../../supabase/client.js';

const $ = (s) => document.querySelector(s);
const date = new Intl.DateTimeFormat('pt-BR',{dateStyle:'full'}).format(new Date());
$('#currentDate').textContent = date.charAt(0).toUpperCase()+date.slice(1);

function safe(v=''){const d=document.createElement('div');d.textContent=v;return d.innerHTML}
function imageOf(n){return n.cover_image_url || n.image_url || ''}
function categoryOf(n){return n.category?.name || 'Notícias'}
function when(v){if(!v)return '';return new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(v))}
function img(n){const url=imageOf(n);return url?`<img class="news-image" src="${safe(url)}" alt="">`:'<div class="news-image fallback-image"></div>'}

function renderHero(items){
  if(!items.length){$('#heroGrid').innerHTML='<p class="empty">Nenhuma notícia publicada ainda.</p>';return}
  const [main,...rest]=items;
  const card=(n,small=false)=>`<article class="${small?'small-card':'hero-card'}">${img(n)}<div class="card-overlay"><span class="category-tag">${safe(categoryOf(n))}</span><${small?'h2':'h1'}>${safe(n.title)}</${small?'h2':'h1'}><div class="card-meta">${when(n.published_at||n.created_at)}</div></div></article>`;
  $('#heroGrid').innerHTML=card(main)+`<div class="side-headlines">${rest.slice(0,2).map(n=>card(n,true)).join('')}</div>`;
}

function renderLatest(items){
  $('#latestNews').innerHTML=items.length?items.map(n=>`<article class="news-item"><div class="news-thumb">${img(n)}</div><div class="news-copy"><span class="box-label">${safe(categoryOf(n))}</span><h3>${safe(n.title)}</h3><p>${safe(n.subtitle||n.meta_description||'Leia os principais detalhes desta notícia.')}</p><small>${when(n.published_at||n.created_at)}</small></div></article>`).join(''):'<p class="empty">Nenhuma notícia publicada.</p>';
}

function renderRanking(items){
  $('#mostRead').innerHTML=items.slice(0,5).map((n,i)=>`<div class="ranking-item"><strong>${String(i+1).padStart(2,'0')}</strong><a href="#">${safe(n.title)}</a></div>`).join('');
}

async function load(){
  const {data,error}=await supabase.from('news').select('id,title,subtitle,meta_description,cover_image_url,image_url,created_at,published_at,is_featured,is_breaking,category:categories(name)').eq('status','published').order('published_at',{ascending:false}).limit(20);
  if(error) throw error;
  const items=data||[];
  const featured=[...items].sort((a,b)=>Number(b.is_featured)-Number(a.is_featured));
  renderHero(featured.slice(0,3));
  renderLatest(items.slice(3));
  renderRanking(items);
  const breaking=items.find(n=>n.is_breaking);
  if(breaking){$('#breakingBar').hidden=false;$('#breakingText').textContent=breaking.title}
}

load().catch(err=>{
  console.error(err);
  $('#heroGrid').innerHTML='<p class="empty">Não foi possível carregar as notícias. Verifique as permissões do Supabase.</p>';
  $('#latestNews').innerHTML='<p class="empty">Erro ao consultar notícias.</p>';
});