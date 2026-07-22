import { supabase } from '../../supabase/client.js';

const toggle = document.getElementById('searchToggle');
const panel = document.getElementById('searchPanel');
const input = document.getElementById('newsSearch');
const bottomAd = document.getElementById('bottomAd');
document.querySelector('a[href="admin/login.html"]')?.remove();
const FALLBACK_IMAGE = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450"><rect width="800" height="450" fill="#ececea"/><text x="400" y="225" text-anchor="middle" font-family="Arial" font-size="32" font-weight="700" fill="#777">PORTAL SERRA ATUAL</text><text x="400" y="265" text-anchor="middle" font-family="Arial" font-size="19" fill="#888">Imagem indisponível</text></svg>`);

function safe(value = '') {
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}

function imageOf(item) {
  return item.cover_image_url || item.image_url || FALLBACK_IMAGE;
}

function categoryOf(item) {
  return item.category?.name || 'Notícias';
}

function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value));
}

function applyImageFallbacks(root = document) {
  root.querySelectorAll('img').forEach((img) => {
    if (img.dataset.fallbackReady) return;
    img.dataset.fallbackReady = '1';
    img.addEventListener('error', () => {
      if (img.src !== FALLBACK_IMAGE) img.src = FALLBACK_IMAGE;
    });
  });
}

function linkFor(item) {
  return `noticia.html?slug=${encodeURIComponent(item.slug || item.id)}`;
}

function renderHero(items) {
  if (!items.length) return;
  const [main, ...rest] = items;
  const hero = document.querySelector('.hero');
  hero.innerHTML = `
    <a class="hero-main news-card" href="${linkFor(main)}" data-search="${safe(`${categoryOf(main)} ${main.title}`)}">
      <img src="${safe(imageOf(main))}" alt="${safe(main.title)}">
      <div class="shade"></div>
      <div class="hero-text">
        <span class="tag">${safe(categoryOf(main))}</span>
        <h1>${safe(main.title)}</h1>
        <p>${safe(main.subtitle || '')}</p>
      </div>
    </a>
    <div class="hero-side">
      ${rest.slice(0, 2).map((item) => `
        <a class="side news-card" href="${linkFor(item)}" data-search="${safe(`${categoryOf(item)} ${item.title}`)}">
          <img src="${safe(imageOf(item))}" alt="${safe(item.title)}">
          <div class="shade"></div>
          <div class="side-text">
            <span class="tag">${safe(categoryOf(item))}</span>
            <h2>${safe(item.title)}</h2>
          </div>
        </a>
      `).join('')}
    </div>`;
}

function renderLatest(items) {
  const list = document.querySelector('.news-list');
  if (!items.length) return;
  const nativeAd = list.querySelector('.native-ad')?.outerHTML || '';
  const inFeed = list.querySelector('.in-feed')?.outerHTML || '';
  const technology = list.querySelector('#tecnologia')?.outerHTML || '';
  list.innerHTML = items.map((item, index) => `
    <a class="list-card news-card" href="${linkFor(item)}" data-search="${safe(`${categoryOf(item)} ${item.title} ${item.subtitle || ''}`)}">
      <img src="${safe(imageOf(item))}" alt="${safe(item.title)}">
      <div>
        <span class="tag">${safe(categoryOf(item))}</span>
        <h3>${safe(item.title)}</h3>
        <p>${safe(item.subtitle || item.meta_description || '')}</p>
        <small>${safe(formatDate(item.published_at || item.created_at))}</small>
      </div>
    </a>
    ${index === 1 ? nativeAd : ''}
    ${index === 3 ? inFeed : ''}
  `).join('') + technology;
}

function renderMostRead(items) {
  const list = document.querySelector('.most-read ol');
  if (!list || !items.length) return;
  list.innerHTML = items.slice(0, 4).map((item) => `<li><a href="${linkFor(item)}">${safe(item.title)}</a></li>`).join('');
}

function renderBreaking(items) {
  const breaking = items.find((item) => item.is_breaking);
  if (!breaking) return;
  const bar = document.querySelector('.breaking span');
  if (bar) bar.textContent = breaking.title;
}

async function loadNews() {
  const { data, error } = await supabase
    .from('news')
    .select('id,slug,title,subtitle,meta_description,cover_image_url,image_url,created_at,published_at,is_featured,is_breaking,category:categories(name)')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(20);

  if (error) {
    console.warn('Portal mantido com conteúdo demonstrativo:', error.message);
    return;
  }

  const items = data || [];
  if (!items.length) return;
  const featured = [...items].sort((a, b) => Number(b.is_featured) - Number(a.is_featured));
  renderHero(featured.slice(0, 3));
  renderLatest(items.slice(3));
  renderMostRead(items);
  renderBreaking(items);
  applyImageFallbacks();
}

toggle?.addEventListener('click', () => {
  panel.classList.toggle('open');
  if (panel.classList.contains('open')) input.focus();
});

input?.addEventListener('input', (event) => {
  const query = event.target.value.toLowerCase().trim();
  document.querySelectorAll('.news-card').forEach((card) => {
    const text = `${card.dataset.search || ''} ${card.innerText}`.toLowerCase();
    card.style.display = query && !text.includes(query) ? 'none' : '';
  });
});

document.querySelectorAll('[data-category]').forEach((link) => {
  link.href = `categoria.html?slug=${encodeURIComponent(link.dataset.category)}`;
});

document.querySelector('#bottomAd button')?.addEventListener('click', () => bottomAd?.remove());

applyImageFallbacks();
loadNews();