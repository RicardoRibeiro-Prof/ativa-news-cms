import { supabase } from '../../supabase/client.js';
import { requireAuth, signOut } from '../../supabase/auth.js';

const selectors = {
  userEmail: document.querySelector('#userEmail'),
  published: document.querySelector('#publishedCount'),
  drafts: document.querySelector('#draftCount'),
  campaigns: document.querySelector('#campaignCount'),
  views: document.querySelector('#viewsCount'),
  latestBody: document.querySelector('#latestNewsBody'),
  logout: document.querySelector('#logoutButton'),
};

function formatNumber(value) {
  return new Intl.NumberFormat('pt-BR').format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return 'Sem data';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function renderLatestNews(items) {
  if (!items?.length) {
    selectors.latestBody.innerHTML = '<tr><td colspan="4" class="empty-state">Nenhuma notícia cadastrada.</td></tr>';
    return;
  }

  selectors.latestBody.innerHTML = items.map((item) => `
    <tr>
      <td>${item.title || 'Sem título'}</td>
      <td>${item.status || 'draft'}</td>
      <td>${item.category?.name || 'Sem categoria'}</td>
      <td>${formatDate(item.published_at || item.created_at)}</td>
    </tr>
  `).join('');
}

async function countRows(table, filters = []) {
  let query = supabase.from(table).select('*', { count: 'exact', head: true });
  filters.forEach(([column, value]) => { query = query.eq(column, value); });
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

async function loadDashboard() {
  const session = await requireAuth();
  selectors.userEmail.textContent = session.user.email || 'Administrador';

  const [published, drafts, campaigns, viewsResult, latestResult] = await Promise.all([
    countRows('news', [['status', 'published']]),
    countRows('news', [['status', 'draft']]),
    countRows('ad_campaigns', [['status', 'active']]),
    supabase.from('news_views').select('id', { count: 'exact', head: true }),
    supabase
      .from('news')
      .select('id,title,status,created_at,published_at,category:categories(name)')
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

  if (viewsResult.error) throw viewsResult.error;
  if (latestResult.error) throw latestResult.error;

  selectors.published.textContent = formatNumber(published);
  selectors.drafts.textContent = formatNumber(drafts);
  selectors.campaigns.textContent = formatNumber(campaigns);
  selectors.views.textContent = formatNumber(viewsResult.count);
  renderLatestNews(latestResult.data);
}

selectors.logout.addEventListener('click', async () => {
  selectors.logout.disabled = true;
  try {
    await signOut();
    window.location.replace('./login.html');
  } catch (error) {
    alert(error?.message || 'Não foi possível sair.');
    selectors.logout.disabled = false;
  }
});

loadDashboard().catch((error) => {
  console.error(error);
  selectors.latestBody.innerHTML = `<tr><td colspan="4" class="empty-state">Erro ao carregar o painel: ${error.message}</td></tr>`;
});
