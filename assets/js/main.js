import { supabase } from '../../supabase/client.js';

const toggle = document.getElementById('searchToggle');
const panel = document.getElementById('searchPanel');
const input = document.getElementById('newsSearch');
const bottomAd = document.getElementById('bottomAd');
document.querySelector('a[href="admin/login.html"]')?.remove();

const FALLBACK_IMAGE = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450"><rect width="800" height="450" fill="#ececea"/><text x="400" y="225" text-anchor="middle" font-family="Arial" font-size="32" font-weight="700" fill="#777">PORTAL SERRA ATUAL</text><text x="400" y="265" text-anchor="middle" font-family="Arial" font-size="19" fill="#888">Imagem indisponível</text></svg>`);
let heroTimer = null;

function safe(value = '') {
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}

function imageOf(item) { return item.cover_image_url || item.image_url || FALLBACK_IMAGE; }
function categoryOf(item) { return item.category?.name || 'Notícias'; }
function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}
function linkFor(item) { return `noticia.html?slug=${encodeURIComponent(item.slug || item.id)}`; }

function applyImageFallbacks(root = document) {
  root.querySelectorAll('img').forEach((img) => {
    if (img.dataset.fallbackReady) return;
    img.dataset.fallbackReady = '1';
    img.addEventListener('error', () => { if (img.src !== FALLBACK_IMAGE) img.src = FALLBACK_IMAGE; });
  });
}

function startHeroCarousel(root) {
  const slides = [...root.querySelectorAll('.hero-slide')];
  const dots = [...root.querySelectorAll('.hero-dot')];
  if (slides.length < 2) return;
  let current = 0;

  const show = (index) => {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => slide.classList.toggle('active', i === current));
    dots.forEach((dot, i) => dot.classList.toggle('active', i === current));
  };
  const restart = () => {
    clearInterval(heroTimer);
    heroTimer = setInterval(() => show(current + 1), 6000);
  };

  root.querySelector('.hero-prev')?.addEventListener('click', (event) => { event.preventDefault(); show(current - 1); restart(); });
  root.querySelector('.hero-next')?.addEventListener('click', (event) => { event.preventDefault(); show(current + 1); restart(); });
  dots.forEach((dot, index) => dot.addEventListener('click', (event) => { event.preventDefault(); show(index); restart(); }));
  root.addEventListener('mouseenter', () => clearInterval(heroTimer));
  root.addEventListener('mouseleave', restart);
  show(0);
  restart();
}

function renderHero(items) {
  if (!items.length) return;
  const hero = document.querySelector('.hero');
  const slides = items.slice(0, 5);
  const sideItems = items.slice(5, 7).length ? items.slice(5, 7) : items.slice(1, 3);

  hero.innerHTML = `
    <div class="hero-carousel">
      ${slides.map((item, index) => `
        <a class="hero-main hero-slide news-card${index === 0 ? ' active' : ''}" href="${linkFor(item)}" data-search="${safe(`${categoryOf(item)} ${item.title}`)}">
          <img src="${safe(imageOf(item))}" alt="${safe(item.title)}">
          <div class="shade"></div>
          <div class="hero-text"><span class="tag">${safe(categoryOf(item))}</span><h1>${safe(item.title)}</h1><p>${safe(item.subtitle || '')}</p></div>
        </a>`).join('')}
      <button class="hero-arrow hero-prev" type="button" aria-label="Notícia anterior">‹</button>
      <button class="hero-arrow hero-next" type="button" aria-label="Próxima notícia">›</button>
      <div class="hero-dots">${slides.map((_, index) => `<button class="hero-dot${index === 0 ? ' active' : ''}" type="button" aria-label="Ir para notícia ${index + 1}"></button>`).join('')}</div>
    </div>
    <div class="hero-side">
      ${sideItems.map((item) => `<a class="side news-card" href="${linkFor(item)}"><img src="${safe(imageOf(item))}" alt="${safe(item.title)}"><div class="shade"></div><div class="side-text"><span class="tag">${safe(categoryOf(item))}</span><h2>${safe(item.title)}</h2></div></a>`).join('')}
    </div>`;
  applyImageFallbacks(hero);
  startHeroCarousel(hero.querySelector('.hero-carousel'));
}

function renderLatest(items) {
  const list = document.querySelector('.news-list');
  if (!items.length) return;
  const nativeAd = list.querySelector('.native-ad')?.outerHTML || '';
  const inFeed = list.querySelector('.in-feed')?.outerHTML || '';
  const technology = list.querySelector('#tecnologia')?.outerHTML || '';
  list.innerHTML = items.map((item, index) => `<a class="list-card news-card" href="${linkFor(item)}"><img src="${safe(imageOf(item))}" alt="${safe(item.title)}"><div><span class="tag">${safe(categoryOf(item))}</span><h3>${safe(item.title)}</h3><p>${safe(item.subtitle || item.meta_description || '')}</p><small>${safe(formatDate(item.published_at || item.created_at))}</small></div></a>${index === 1 ? nativeAd : ''}${index === 3 ? inFeed : ''}`).join('') + technology;
}

function renderMostRead(items) {
  const list = document.querySelector('.most-read ol');
  if (!list || !items.length) return;
  list.innerHTML = items.slice(0, 4).map((item) => `<li><a href="${linkFor(item)}">${safe(item.title)}</a></li>`).join('');
}
function renderBreaking(items) {
  const breaking = items.find((item) => item.is_breaking);
  if (breaking) document.querySelector('.breaking span').textContent = breaking.title;
}
function normalizeCampaign(item) {
  return { ...item, target_url: item.target_url || item.link_url || null, starts_at: item.starts_at || item.start_date || null, ends_at: item.ends_at || item.end_date || null };
}
function campaignIsValid(item) {
  const now = Date.now();
  const starts = item.starts_at ? new Date(item.starts_at).getTime() : null;
  const ends = item.ends_at ? new Date(item.ends_at).getTime() : null;
  return item.status === 'active' && (!starts || starts <= now) && (!ends || ends >= now);
}
function renderTopCampaign(item) {
  const slot = document.getElementById('topBanner');
  if (!slot || !item?.desktop_image_url) return;
  const href = item.target_url || '#';
  const mobile = item.mobile_image_url || item.desktop_image_url;
  slot.classList.add('real-ad');
  slot.innerHTML = `<a href="${safe(href)}" ${item.target_url ? 'target="_blank" rel="noopener"' : ''}><picture><source media="(max-width:620px)" srcset="${safe(mobile)}"><img src="${safe(item.desktop_image_url)}" alt="${safe(item.name || 'Publicidade')}"></picture></a>`;
}
async function loadCampaigns() {
  const { data, error } = await supabase.from('ad_campaigns').select('*').eq('status', 'active').order('created_at', { ascending: false });
  if (error) return console.warn('Campanhas não carregadas:', error.message);
  const campaigns = (data || []).map(normalizeCampaign).filter(campaignIsValid);
  const top = campaigns.find((item) => ['top_banner', 'Banner superior 970 × 250', 'Banner superior 970 x 250'].includes(item.position));
  if (top) renderTopCampaign(top);
  applyImageFallbacks();
}
async function loadNews() {
  const { data, error } = await supabase.from('news').select('id,slug,title,subtitle,meta_description,cover_image_url,image_url,created_at,published_at,is_featured,is_breaking,category:categories(name)').eq('status', 'published').order('published_at', { ascending: false }).limit(30);
  if (error) return console.warn('Portal mantido com conteúdo demonstrativo:', error.message);
  const items = data || [];
  if (!items.length) return;
  const featured = [...items].sort((a, b) => Number(b.is_featured) - Number(a.is_featured));
  renderHero(featured.slice(0, 7));
  renderLatest(items.slice(7));
  renderMostRead(items);
  renderBreaking(items);
  applyImageFallbacks();
}

toggle?.addEventListener('click', () => { panel.classList.toggle('open'); if (panel.classList.contains('open')) input.focus(); });
input?.addEventListener('input', (event) => { const query = event.target.value.toLowerCase().trim(); document.querySelectorAll('.news-card').forEach((card) => { const text = `${card.dataset.search || ''} ${card.innerText}`.toLowerCase(); card.style.display = query && !text.includes(query) ? 'none' : ''; }); });
document.querySelectorAll('[data-category]').forEach((link) => { link.href = `categoria.html?slug=${encodeURIComponent(link.dataset.category)}`; });
document.querySelector('#bottomAd button')?.addEventListener('click', () => bottomAd?.remove());

applyImageFallbacks();
Promise.allSettled([loadNews(), loadCampaigns()]);