import { supabase } from '../../supabase/client.js';
import { requireAuth } from '../../supabase/auth.js';
import { uploadPortalImage } from '../../supabase/storage.js';

const entity = document.body.dataset.entity;
const form = document.querySelector('#entityForm');
const body = document.querySelector('#entityBody');
const message = document.querySelector('#entityMessage');

const configs = {
  categories: {
    order: 'name',
    fields: ['name', 'slug'],
    columns: [['name', 'Sem nome'], ['slug', '—']],
    emptyCols: 3,
  },
  advertisers: {
    order: 'created_at',
    fields: ['name', 'phone', 'email'],
    columns: [['name', 'Sem nome'], ['phone', '—'], ['email', '—']],
    emptyCols: 4,
  },
};

const config = configs[entity];

function escapeHtml(value = '') {
  const div = document.createElement('div');
  div.textContent = String(value ?? '');
  return div.innerHTML;
}

function showMessage(text, ok = false) {
  if (!message) return;
  message.textContent = text;
  message.className = ok ? 'form-message success' : 'form-message error';
}

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-BR').format(new Date(value));
}

function renderCampaigns(items = []) {
  if (!items.length) {
    body.innerHTML = '<tr><td colspan="5" class="empty-state">Nenhuma campanha cadastrada.</td></tr>';
    return;
  }

  body.innerHTML = items.map((item) => `
    <tr>
      <td><strong>${escapeHtml(item.name || 'Sem nome')}</strong>${item.desktop_image_url ? '<br><small>Banner enviado</small>' : '<br><small>Sem imagem</small>'}</td>
      <td>${escapeHtml(item.position || '—')}</td>
      <td>${escapeHtml(item.status || 'draft')}</td>
      <td>${formatDate(item.starts_at)} até ${formatDate(item.ends_at)}</td>
      <td><button class="entity-delete button button-small button-danger" type="button" data-id="${escapeHtml(item.id)}">Excluir</button></td>
    </tr>
  `).join('');
}

function render(items = []) {
  if (entity === 'ad_campaigns') {
    renderCampaigns(items);
    bindDeleteButtons();
    return;
  }

  if (!items.length) {
    body.innerHTML = `<tr><td colspan="${config.emptyCols}" class="empty-state">Nenhum registro cadastrado.</td></tr>`;
    return;
  }

  body.innerHTML = items.map((item) => {
    const cells = config.columns.map(([field, fallback]) => `<td>${escapeHtml(item[field] || fallback)}</td>`).join('');
    return `<tr>${cells}<td><button class="entity-delete" type="button" data-id="${escapeHtml(item.id)}">Excluir</button></td></tr>`;
  }).join('');
  bindDeleteButtons();
}

function bindDeleteButtons() {
  body.querySelectorAll('.entity-delete').forEach((button) => {
    button.addEventListener('click', () => removeItem(button.dataset.id));
  });
}

async function loadItems() {
  const cols = entity === 'ad_campaigns' ? 5 : (config?.emptyCols || 4);
  body.innerHTML = `<tr><td colspan="${cols}" class="empty-state">Carregando...</td></tr>`;

  let query = supabase.from(entity).select('*');
  const orderField = entity === 'ad_campaigns' ? 'created_at' : config.order;
  query = query.order(orderField, { ascending: entity === 'categories' });

  const { data, error } = await query;
  if (error) throw error;
  render(data || []);
}

async function removeItem(id) {
  if (!confirm('Deseja realmente excluir este registro?')) return;
  const { error } = await supabase.from(entity).delete().eq('id', id);
  if (error) return showMessage(error.message);
  showMessage('Registro excluído.', true);
  await loadItems();
}

function buildPayload() {
  return config.fields.reduce((payload, field) => {
    const control = document.querySelector(`#${field}`);
    if (!control) return payload;
    const value = control.value.trim();
    if (value) payload[field] = value;
    return payload;
  }, {});
}

function setupImagePreview(inputId, previewId) {
  const input = document.querySelector(inputId);
  const preview = document.querySelector(previewId);
  input?.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) return;
    preview.src = URL.createObjectURL(file);
  });
}

async function saveCampaign(event) {
  event.preventDefault();
  const button = document.querySelector('#saveCampaignButton');
  button.disabled = true;
  showMessage('Salvando campanha...', true);

  try {
    const desktopFile = document.querySelector('#desktopImage').files?.[0];
    const mobileFile = document.querySelector('#mobileImage').files?.[0];
    if (!desktopFile) throw new Error('Selecione o banner para computador.');

    showMessage('Enviando banner para computador...', true);
    const desktopUpload = await uploadPortalImage(desktopFile, 'campaigns/desktop');

    let mobileUrl = desktopUpload.publicUrl;
    if (mobileFile) {
      showMessage('Enviando banner para celular...', true);
      const mobileUpload = await uploadPortalImage(mobileFile, 'campaigns/mobile');
      mobileUrl = mobileUpload.publicUrl;
    }

    const startsValue = document.querySelector('#starts_at').value;
    const endsValue = document.querySelector('#ends_at').value;

    const payload = {
      name: document.querySelector('#name').value.trim(),
      position: document.querySelector('#position').value,
      status: document.querySelector('#status').value,
      target_url: document.querySelector('#target_url').value.trim() || null,
      starts_at: startsValue ? new Date(`${startsValue}T00:00:00`).toISOString() : null,
      ends_at: endsValue ? new Date(`${endsValue}T23:59:59`).toISOString() : null,
      desktop_image_url: desktopUpload.publicUrl,
      mobile_image_url: mobileUrl,
    };

    const { error } = await supabase.from('ad_campaigns').insert(payload);
    if (error) throw error;

    form.reset();
    document.querySelector('#desktopPreview').removeAttribute('src');
    document.querySelector('#mobilePreview').removeAttribute('src');
    showMessage('Campanha salva com sucesso.', true);
    await loadItems();
  } catch (error) {
    showMessage(error.message || 'Não foi possível salvar a campanha.');
  } finally {
    button.disabled = false;
  }
}

if (entity === 'ad_campaigns') {
  setupImagePreview('#desktopImage', '#desktopPreview');
  setupImagePreview('#mobileImage', '#mobilePreview');
  form?.addEventListener('submit', saveCampaign);
} else {
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    showMessage('Salvando...', true);
    const payload = buildPayload();
    const { error } = await supabase.from(entity).insert(payload);
    if (error) return showMessage(error.message);
    form.reset();
    showMessage('Registro adicionado com sucesso.', true);
    await loadItems();
  });
}

(async () => {
  try {
    await requireAuth();
    if (entity !== 'ad_campaigns' && !config) throw new Error('Módulo administrativo inválido.');
    await loadItems();
  } catch (error) {
    console.error(error);
    const cols = entity === 'ad_campaigns' ? 5 : (config?.emptyCols || 4);
    body.innerHTML = `<tr><td colspan="${cols}" class="empty-state">Erro: ${escapeHtml(error.message)}</td></tr>`;
  }
})();