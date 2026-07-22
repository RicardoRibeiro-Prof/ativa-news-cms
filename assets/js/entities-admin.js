import { supabase } from '../../supabase/client.js';
import { requireAuth } from '../../supabase/auth.js';

const entity = document.body.dataset.entity;
const form = document.querySelector('#entityForm');
const body = document.querySelector('#entityBody');
const message = document.querySelector('#entityMessage');

const configs = {
  categories: {
    order: 'name',
    fields: ['name', 'slug'],
    columns: [
      ['name', 'Sem nome'],
      ['slug', '—'],
    ],
    emptyCols: 3,
  },
  ad_campaigns: {
    order: 'created_at',
    fields: ['name', 'position', 'status'],
    columns: [
      ['name', 'Sem nome'],
      ['position', '—'],
      ['status', 'draft'],
    ],
    emptyCols: 4,
  },
  advertisers: {
    order: 'created_at',
    fields: ['name', 'phone', 'email'],
    columns: [
      ['name', 'Sem nome'],
      ['phone', '—'],
      ['email', '—'],
    ],
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
  message.style.color = ok ? '#3ddc84' : '';
}

function render(items = []) {
  if (!items.length) {
    body.innerHTML = `<tr><td colspan="${config.emptyCols}" class="empty-state">Nenhum registro cadastrado.</td></tr>`;
    return;
  }

  body.innerHTML = items.map((item) => {
    const cells = config.columns
      .map(([field, fallback]) => `<td>${escapeHtml(item[field] || fallback)}</td>`)
      .join('');

    return `<tr>${cells}<td><button class="entity-delete" type="button" data-id="${escapeHtml(item.id)}">Excluir</button></td></tr>`;
  }).join('');

  body.querySelectorAll('.entity-delete').forEach((button) => {
    button.addEventListener('click', () => removeItem(button.dataset.id));
  });
}

async function loadItems() {
  body.innerHTML = `<tr><td colspan="${config.emptyCols}" class="empty-state">Carregando...</td></tr>`;

  let query = supabase.from(entity).select('*');
  query = query.order(config.order, { ascending: entity === 'categories' });

  const { data, error } = await query;
  if (error) throw error;
  render(data || []);
}

async function removeItem(id) {
  if (!confirm('Deseja realmente excluir este registro?')) return;
  const { error } = await supabase.from(entity).delete().eq('id', id);
  if (error) {
    showMessage(error.message);
    return;
  }
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

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  showMessage('Salvando...', true);

  const payload = buildPayload();
  const { error } = await supabase.from(entity).insert(payload);

  if (error) {
    showMessage(error.message);
    return;
  }

  form.reset();
  showMessage('Registro adicionado com sucesso.', true);
  await loadItems();
});

(async () => {
  try {
    await requireAuth();
    if (!config) throw new Error('Módulo administrativo inválido.');
    await loadItems();
  } catch (error) {
    console.error(error);
    body.innerHTML = `<tr><td colspan="${config?.emptyCols || 4}" class="empty-state">Erro: ${escapeHtml(error.message)}</td></tr>`;
  }
})();