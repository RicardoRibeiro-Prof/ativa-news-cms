import { supabase } from '../../supabase/client.js';

const params = new URLSearchParams(location.search);
const slug = params.get('slug') || 'cidade';
const titleEl = document.getElementById('categoryTitle');
const breadcrumbEl = document.getElementById('categoryBreadcrumb');
const descriptionEl = document.getElementById('categoryDescription');
const listEl = document.getElementById('categoryList');

function safe(value = '') {
  const div = document.createElement('div');
  div.textContent = String(value ?? '');
  return div.innerHTML;
}

function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function fallbackImage(title = 'Portal Serra Atual') {
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450"><rect width="800" height="450" fill="#ececea"/><text x="400" y="225" text-anchor="middle" font-family="Arial" font-size="30" font-weight="700" fill="#777">${title}</text></svg>`);
}

async function loadCategory() {
  const { data: category, error: categoryError } = await supabase
    .from('categories')
    .select('id,name,slug,description')
    .eq('slug', slug)
    .maybeSingle();

  if (categoryError) throw categoryError;

  const categoryName = category?.name || slug.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  document.title = `${categoryName} | Portal Serra Atual`;
  titleEl.textContent = categoryName;
  breadcrumbEl.textContent = categoryName;
  descriptionEl.textContent = category?.description || `Últimas notícias de ${categoryName}.`;

  if (!category?.id) {
    listEl.innerHTML = '<div class="empty">Categoria não encontrada.</div>';
    return;
  }

  const { data: news, error: newsError } = await supabase
    .from('news')
    .select('id,title,slug,subtitle,cover_image_url,image_url,published_at,created_at')
    .eq('category_id', category.id)
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (newsError) throw newsError;

  if (!news?.length) {
    listEl.innerHTML = '<div class="empty">Ainda não há notícias publicadas nesta categoria.</div>';
    return;
  }

  listEl.innerHTML = news.map((item) => {
    const image = item.cover_image_url || item.image_url || fallbackImage(categoryName);
    const href = `noticia.html?slug=${encodeURIComponent(item.slug || item.id)}`;
    return `<a class="category-card" href="${href}">
      <img src="${safe(image)}" alt="${safe(item.title)}">
      <div>
        <span class="tag">${safe(categoryName)}</span>
        <h2>${safe(item.title)}</h2>
        <p>${safe(item.subtitle || '')}</p>
        <small>${safe(formatDate(item.published_at || item.created_at))}</small>
      </div>
    </a>`;
  }).join('');
}

loadCategory().catch((error) => {
  console.error(error);
  listEl.innerHTML = `<div class="empty">Não foi possível carregar esta categoria: ${safe(error.message)}</div>`;
});
