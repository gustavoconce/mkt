const CRM_STORAGE_KEY = 'crm_leads_board';
let crmBoard = getDefaultCRMBoard();
let draggedCard = null;

const LEAD_STATUS_LABEL = {
  sim: 'Lead bom',
  nao: 'Lead fraco',
  avaliar: 'Avaliar'
};

const LEAD_STATUS_CLASS = {
  sim: 'good',
  nao: 'bad',
  avaliar: 'review'
};

document.addEventListener('DOMContentLoaded', () => {
  const dateInput = document.getElementById('lead-data');
  if (dateInput && !dateInput.value) dateInput.value = new Date().toISOString().slice(0, 10);

  carregarCRM();
});

function carregarCRM() {
  const saved = localStorage.getItem(CRM_STORAGE_KEY);

  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.columns)) crmBoard = parsed;
    } catch (error) {
      crmBoard = getDefaultCRMBoard();
      localStorage.removeItem(CRM_STORAGE_KEY);
    }
  }

  renderCRM();
}

function salvarCRM() {
  localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(crmBoard));
}

function addLead() {
  const lead = {
    id: String(Date.now()),
    nome: getValue('lead-nome').trim(),
    campanha: getValue('lead-campanha').trim(),
    data: getValue('lead-data'),
    leadBom: getValue('lead-bom') || 'avaliar',
    observacoes: getValue('lead-observacoes').trim(),
    createdAt: new Date().toISOString()
  };

  if (!lead.nome || !lead.campanha || !lead.data) {
    showToast('Preencha nome, campanha e data do lead.');
    return;
  }

  crmBoard.columns[0].cards.unshift(lead);
  salvarCRM();
  clearLeadForm();
  renderCRM();
  showToast('Lead adicionado ao CRM!');
}

function clearLeadForm() {
  ['lead-nome', 'lead-campanha', 'lead-observacoes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  setValue('lead-bom', 'sim');
  setValue('lead-data', new Date().toISOString().slice(0, 10));
}

function limparCRM() {
  const ok = confirm('Tem certeza que deseja apagar todos os leads do CRM?');
  if (!ok) return;

  crmBoard = getDefaultCRMBoard();
  salvarCRM();
  renderCRM();
  showToast('CRM limpo com sucesso!');
}

function renderCRM() {
  const board = document.getElementById('crm-board');
  const leadCount = document.getElementById('lead-count');
  if (!board) return;

  const total = crmBoard.columns.reduce((acc, col) => acc + col.cards.length, 0);
  if (leadCount) leadCount.textContent = total + ' lead' + (total !== 1 ? 's' : '');

  board.innerHTML = crmBoard.columns.map(column => `
    <section class="crm-column" data-column-id="${column.id}" ondragover="allowDrop(event)" ondrop="dropLead(event, '${column.id}')">
      <div class="crm-column-header">
        <h2>${escapeHTML(column.title)}</h2>
        <span>${column.cards.length}</span>
      </div>
      <div class="crm-column-body">
        ${column.cards.length ? column.cards.map(card => leadCardHTML(card, column.id)).join('') : '<div class="crm-empty-column">Arraste ou adicione leads aqui</div>'}
      </div>
    </section>
  `).join('');
}

function leadCardHTML(card, columnId) {
  const status = LEAD_STATUS_CLASS[card.leadBom] || 'review';
  const label = LEAD_STATUS_LABEL[card.leadBom] || 'Avaliar';

  return `
    <article class="lead-card" draggable="true" ondragstart="dragLead(event, '${card.id}', '${columnId}')" onclick="openLeadModal('${card.id}', '${columnId}')">
      <div class="lead-card-top">
        <h3>${escapeHTML(card.nome)}</h3>
        <span class="lead-status ${status}">${label}</span>
      </div>
      <div class="lead-meta"><strong>Campanha:</strong> ${escapeHTML(card.campanha)}</div>
      <div class="lead-meta"><strong>Data:</strong> ${formatDateBR(card.data)}</div>
      ${card.observacoes ? `<p class="lead-notes">${escapeHTML(card.observacoes)}</p>` : ''}
    </article>
  `;
}

function dragLead(event, cardId, columnId) {
  draggedCard = { cardId, columnId };
  event.dataTransfer.effectAllowed = 'move';
}

function allowDrop(event) {
  event.preventDefault();
}

function dropLead(event, targetColumnId) {
  event.preventDefault();
  if (!draggedCard) return;

  const sourceColumn = findColumn(draggedCard.columnId);
  const targetColumn = findColumn(targetColumnId);
  if (!sourceColumn || !targetColumn) return;

  const index = sourceColumn.cards.findIndex(card => card.id === draggedCard.cardId);
  if (index === -1) return;

  const [card] = sourceColumn.cards.splice(index, 1);
  targetColumn.cards.unshift(card);

  draggedCard = null;
  salvarCRM();
  renderCRM();
  showToast('Lead movido!');
}

function openLeadModal(cardId, columnId) {
  const column = findColumn(columnId);
  const card = column && column.cards.find(item => item.id === cardId);
  if (!card) return;

  setValue('edit-card-id', card.id);
  setValue('edit-column-id', columnId);
  setValue('edit-lead-nome', card.nome);
  setValue('edit-lead-campanha', card.campanha);
  setValue('edit-lead-data', card.data);
  setValue('edit-lead-bom', card.leadBom || 'avaliar');
  setValue('edit-lead-observacoes', card.observacoes || '');

  const modal = document.getElementById('lead-modal');
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}

function closeLeadModal() {
  const modal = document.getElementById('lead-modal');
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}

function saveLeadEdit() {
  const cardId = getValue('edit-card-id');
  const columnId = getValue('edit-column-id');
  const column = findColumn(columnId);
  const card = column && column.cards.find(item => item.id === cardId);

  if (!card) return;

  const nome = getValue('edit-lead-nome').trim();
  const campanha = getValue('edit-lead-campanha').trim();
  const data = getValue('edit-lead-data');

  if (!nome || !campanha || !data) {
    showToast('Preencha nome, campanha e data do lead.');
    return;
  }

  card.nome = nome;
  card.campanha = campanha;
  card.data = data;
  card.leadBom = getValue('edit-lead-bom') || 'avaliar';
  card.observacoes = getValue('edit-lead-observacoes').trim();
  card.updatedAt = new Date().toISOString();

  salvarCRM();
  renderCRM();
  closeLeadModal();
  showToast('Lead atualizado!');
}

function deleteLeadFromModal() {
  const cardId = getValue('edit-card-id');
  const columnId = getValue('edit-column-id');
  const column = findColumn(columnId);
  if (!column) return;

  const ok = confirm('Excluir este lead do CRM?');
  if (!ok) return;

  column.cards = column.cards.filter(card => card.id !== cardId);
  salvarCRM();
  renderCRM();
  closeLeadModal();
  showToast('Lead removido!');
}

function findColumn(columnId) {
  return crmBoard.columns.find(column => column.id === columnId);
}

function getValue(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

function setValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

function escapeHTML(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDateBR(date) {
  if (!date) return '—';
  const [year, month, day] = String(date).split('-');
  if (!year || !month || !day) return date;
  return `${day}/${month}/${year}`;
}

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;

  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

window.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeLeadModal();
});

window.addEventListener('click', event => {
  const modal = document.getElementById('lead-modal');
  if (event.target === modal) closeLeadModal();
});
