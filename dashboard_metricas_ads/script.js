let campanhas = [];
let chartMode = null;
let scatterChartInstance = null;
let pageConfig = null;
let editingCampaignId = null;
let modalChartMode = null;
let campaignModalChartInstance = null;

const pageType = document.body.dataset.page || 'posts';

const CONFIGS = {
  posts: {
    storageKey: 'campanhas_posts_turbinados',
    defaultChart: 'conversao',
    requiredFields: ['nome', 'dinheiro', 'alcance', 'seguidores'],
    previewFields: ['dinheiro', 'alcance', 'seguidores'],
    emptyMessage: 'Adicione sua primeira campanha acima',
    addMessage: 'Campanha adicionada e salva!',
    scatterTitle: 'Comparativo — Conversão vs Custo',
    computed: item => {
      item.custo = item.dinheiro / item.seguidores;
      item.conversao = (item.seguidores / item.alcance) * 100;
      return item;
    },
    previews: () => {
      const dinheiro = getNumber('dinheiro');
      const alcance = getNumber('alcance');
      const seguidores = getNumber('seguidores');

      setText('custo-preview', dinheiro > 0 && seguidores > 0 ? formatMoney(dinheiro / seguidores) : '—');
      setText('conv-preview', alcance > 0 && seguidores > 0 ? `${((seguidores / alcance) * 100).toFixed(2)}%` : '—');
    },
    clearPreview: () => {
      setText('custo-preview', '—');
      setText('conv-preview', '—');
    },
    readForm: () => ({
      id: Date.now(),
      nome: getValue('nome').trim(),
      dinheiro: getNumber('dinheiro'),
      alcance: getNumber('alcance'),
      seguidores: getNumber('seguidores')
    }),
    metrics: data => {
      const total = sum(data, 'dinheiro');
      const totalSeg = sum(data, 'seguidores');
      const totalAlc = sum(data, 'alcance');
      const avgConv = avg(data, 'conversao');
      const avgCusto = avg(data, 'custo');
      const melhor = data.reduce((a, b) => b.conversao > a.conversao ? b : a);

      return [
        ['Total investido', formatMoney(total, 0), `em ${data.length} camp.`],
        ['Novos seguidores', formatNumber(totalSeg), 'total acumulado'],
        ['Alcance total', formatNumber(totalAlc), 'pessoas atingidas'],
        ['Conversão média', `${avgConv.toFixed(2)}%`, 'seg / alcance', '#60a5fa'],
        ['Custo médio/seg', formatMoney(avgCusto), 'por seguidor', '#34d399'],
        ['Melhor campanha', escapeHTML(melhor.nome), `${melhor.conversao.toFixed(2)}% conversão`, '#f0f6ff', true]
      ];
    },
    tableHead: ['Campanha', 'Investimento', 'Alcance', 'Seguidores', 'Custo/Seg', 'Conversão', 'Ações'],
    tableRow: c => [
      { label: 'Campanha', value: escapeHTML(c.nome), cls: 'td-name' },
      { label: 'Investimento', value: formatMoney(c.dinheiro), cls: 'td-mono' },
      { label: 'Alcance', value: formatNumber(c.alcance), cls: 'td-mono' },
      { label: 'Seguidores', value: formatNumber(c.seguidores), cls: 'td-mono' },
      { label: 'Custo/Seg', value: formatMoney(c.custo), cls: 'td-blue' },
      { label: 'Conversão', value: `${c.conversao.toFixed(2)}%`, cls: 'td-green' }
    ],
    tabs: [
      { key: 'conversao', label: 'Conversão', legend: 'Conversão %', color: '#06b6d4', gradient: 'linear-gradient(180deg, #06b6d4, #0e7490)', value: c => c.conversao, format: v => `${v.toFixed(1)}%` },
      { key: 'alcance', label: 'Alcance', legend: 'Alcance', color: '#2563eb', gradient: 'linear-gradient(180deg, #1d4ed8, #1e3a8a)', value: c => c.alcance, format: compactNumber },
      { key: 'custo', label: 'Custo/Seg', legend: 'Custo/Seg R$', color: '#8b5cf6', gradient: 'linear-gradient(180deg, #8b5cf6, #6d28d9)', value: c => c.custo, format: v => formatMoney(v) }
    ],
    scatter: {
      xTitle: 'Custo por Seguidor (R$)',
      yTitle: 'Conversão (%)',
      tooltip: ctx => `${ctx.dataset.label}: custo ${formatMoney(ctx.parsed.x)} | conv ${ctx.parsed.y.toFixed(2)}%`,
      x: c => Number(c.custo.toFixed(2)),
      y: c => Number(c.conversao.toFixed(3)),
      yTick: v => `${Number(v).toFixed(1)}%`
    }
  },

  campanhas: {
    storageKey: 'campanhas_metricas_ads',
    defaultChart: 'resultados',
    requiredFields: ['nome', 'resultados', 'alcance', 'valor', 'impressoes', 'cliques'],
    previewFields: ['resultados', 'valor', 'cliques'],
    emptyMessage: 'Adicione sua primeira campanha acima',
    addMessage: 'Campanha adicionada e salva!',
    scatterTitle: 'Comparativo — Resultados vs Custo',
    computed: item => {
      item.custoResultado = item.valor / item.resultados;
      item.cpc = item.valor / item.cliques;
      return item;
    },
    previews: () => {
      const resultados = getNumber('resultados');
      const valor = getNumber('valor');
      const cliques = getNumber('cliques');

      setText('cpr-preview', valor > 0 && resultados > 0 ? formatMoney(valor / resultados) : '—');
      setText('cpc-preview', valor > 0 && cliques > 0 ? formatMoney(valor / cliques) : '—');
    },
    clearPreview: () => {
      setText('cpr-preview', '—');
      setText('cpc-preview', '—');
    },
    readForm: () => ({
      id: Date.now(),
      nome: getValue('nome').trim(),
      resultados: getNumber('resultados'),
      alcance: getNumber('alcance'),
      valor: getNumber('valor'),
      impressoes: getNumber('impressoes'),
      cliques: getNumber('cliques')
    }),
    metrics: data => {
      const totalValor = sum(data, 'valor');
      const totalResultados = sum(data, 'resultados');
      const totalAlcance = sum(data, 'alcance');
      const totalImpressoes = sum(data, 'impressoes');
      const totalCliques = sum(data, 'cliques');
      const cprMedio = totalResultados > 0 ? totalValor / totalResultados : 0;
      const cpcMedio = totalCliques > 0 ? totalValor / totalCliques : 0;
      const melhor = data.reduce((a, b) => b.custoResultado < a.custoResultado ? b : a);

      return [
        ['Valor usado', formatMoney(totalValor, 0), `em ${data.length} camp.`],
        ['Resultados', formatNumber(totalResultados), 'total acumulado'],
        ['Alcance total', formatNumber(totalAlcance), 'pessoas atingidas'],
        ['Impressões', formatNumber(totalImpressoes), 'total acumulado'],
        ['Cliques no link', formatNumber(totalCliques), 'total acumulado'],
        ['Custo/resultado', formatMoney(cprMedio), 'média ponderada', '#60a5fa'],
        ['CPC médio', formatMoney(cpcMedio), 'custo por clique', '#34d399'],
        ['Melhor campanha', escapeHTML(melhor.nome), `${formatMoney(melhor.custoResultado)} por resultado`, '#f0f6ff', true]
      ];
    },
    tableHead: ['Campanha', 'Resultados', 'Alcance', 'Custo/Resultado', 'Valor Usado', 'Impressões', 'Cliques', 'CPC', 'Ações'],
    tableRow: c => [
      { label: 'Campanha', value: escapeHTML(c.nome), cls: 'td-name' },
      { label: 'Resultados', value: formatNumber(c.resultados), cls: 'td-mono' },
      { label: 'Alcance', value: formatNumber(c.alcance), cls: 'td-mono' },
      { label: 'Custo/Resultado', value: formatMoney(c.custoResultado), cls: 'td-blue' },
      { label: 'Valor Usado', value: formatMoney(c.valor), cls: 'td-mono' },
      { label: 'Impressões', value: formatNumber(c.impressoes), cls: 'td-mono' },
      { label: 'Cliques', value: formatNumber(c.cliques), cls: 'td-mono' },
      { label: 'CPC', value: formatMoney(c.cpc), cls: 'td-green' }
    ],
    tabs: [
      { key: 'resultados', label: 'Resultados', legend: 'Resultados', color: '#06b6d4', gradient: 'linear-gradient(180deg, #06b6d4, #0e7490)', value: c => c.resultados, format: compactNumber },
      { key: 'alcance', label: 'Alcance', legend: 'Alcance', color: '#2563eb', gradient: 'linear-gradient(180deg, #1d4ed8, #1e3a8a)', value: c => c.alcance, format: compactNumber },
      { key: 'cpr', label: 'Custo/Res', legend: 'Custo/Resultado R$', color: '#8b5cf6', gradient: 'linear-gradient(180deg, #8b5cf6, #6d28d9)', value: c => c.custoResultado, format: v => formatMoney(v) },
      { key: 'cpc', label: 'CPC', legend: 'CPC R$', color: '#34d399', gradient: 'linear-gradient(180deg, #34d399, #047857)', value: c => c.cpc, format: v => formatMoney(v) }
    ],
    scatter: {
      xTitle: 'Custo por Resultado (R$)',
      yTitle: 'Resultados',
      tooltip: ctx => `${ctx.dataset.label}: custo/resultado ${formatMoney(ctx.parsed.x)} | resultados ${formatNumber(ctx.parsed.y)}`,
      x: c => Number(c.custoResultado.toFixed(2)),
      y: c => c.resultados,
      yTick: v => formatNumber(v)
    }
  }
};

document.addEventListener('DOMContentLoaded', init);

function init() {
  pageConfig = CONFIGS[pageType] || CONFIGS.posts;
  chartMode = pageConfig.defaultChart;
  modalChartMode = pageConfig.defaultChart;

  pageConfig.previewFields.forEach(id => {
    const input = document.getElementById(id);
    if (input) input.addEventListener('input', updatePreview);
  });

  const scatterTitle = document.getElementById('scatter-section-title');
  if (scatterTitle) scatterTitle.textContent = pageConfig.scatterTitle;

  const emptyState = document.querySelector('#empty-state p');
  if (emptyState) emptyState.textContent = pageConfig.emptyMessage;

  ensureEditControls();
  ensureCampaignModal();
  renderTabs();
  carregarLocalStorage();
}

function salvarLocalStorage() {
  localStorage.setItem(pageConfig.storageKey, JSON.stringify(campanhas));
}

function carregarLocalStorage() {
  const dadosSalvos = localStorage.getItem(pageConfig.storageKey);

  if (dadosSalvos) {
    try {
      campanhas = JSON.parse(dadosSalvos).map(item => pageConfig.computed(item));
    } catch (error) {
      campanhas = [];
      localStorage.removeItem(pageConfig.storageKey);
    }
  }

  renderAll();
}

function limparLocalStorage() {
  const confirmar = confirm('Tem certeza que deseja apagar todas as campanhas salvas desta página?');

  if (!confirmar) return;

  campanhas = [];
  editingCampaignId = null;
  localStorage.removeItem(pageConfig.storageKey);

  setEditingState(false);
  renderAll();
  showToast('Dados salvos apagados!');
}

function updatePreview() {
  pageConfig.previews();
}

function addCampanha() {
  const item = pageConfig.computed(pageConfig.readForm());
  const faltando = pageConfig.requiredFields.some(field => {
    if (field === 'nome') return !item.nome;
    return !Number.isFinite(item[field]) || item[field] <= 0;
  });

  if (faltando) {
    showToast('Preencha todos os campos!');
    return;
  }

  if (editingCampaignId !== null) {
    const index = campanhas.findIndex(c => String(c.id) === String(editingCampaignId));

    if (index === -1) {
      editingCampaignId = null;
      setEditingState(false);
      showToast('Campanha não encontrada para edição.');
      return;
    }

    item.id = campanhas[index].id;
    campanhas[index] = item;
    editingCampaignId = null;

    salvarLocalStorage();
    clearForm();
    setEditingState(false);
    renderAll();
    showToast('Campanha atualizada!');
    return;
  }

  campanhas.push(item);

  salvarLocalStorage();
  renderAll();
  clearForm();
  showToast(pageConfig.addMessage);
}

function clearForm() {
  pageConfig.requiredFields.forEach(id => {
    const input = document.getElementById(id);
    if (input) input.value = '';
  });

  pageConfig.clearPreview();
}

function editCampanha(id) {
  const campanha = campanhas.find(c => String(c.id) === String(id));

  if (!campanha) {
    showToast('Campanha não encontrada.');
    return;
  }

  editingCampaignId = campanha.id;

  pageConfig.requiredFields.forEach(field => {
    const input = document.getElementById(field);
    if (input) input.value = campanha[field] ?? '';
  });

  updatePreview();
  setEditingState(true);
  renderTable();

  const form = document.querySelector('.form-card');
  if (form) form.scrollIntoView({ behavior: 'smooth', block: 'start' });

  showToast('Edite os campos e salve as alterações.');
}

function cancelEditCampanha() {
  editingCampaignId = null;
  clearForm();
  setEditingState(false);
  renderTable();
}

function ensureEditControls() {
  const buttonRow = document.querySelector('.button-row');
  if (!buttonRow || document.getElementById('cancel-edit')) return;

  const cancelButton = document.createElement('button');
  cancelButton.id = 'cancel-edit';
  cancelButton.type = 'button';
  cancelButton.className = 'btn-cancel';
  cancelButton.textContent = 'Cancelar edição';
  cancelButton.style.display = 'none';
  cancelButton.addEventListener('click', cancelEditCampanha);

  buttonRow.appendChild(cancelButton);
}

function ensureCampaignModal() {
  if (document.getElementById('campaign-modal')) return;

  const modal = document.createElement('div');
  modal.id = 'campaign-modal';
  modal.className = 'modal-backdrop campaign-modal-backdrop';
  modal.setAttribute('aria-hidden', 'true');

  modal.innerHTML = `
    <div class="modal-card campaign-modal-card" role="dialog" aria-modal="true" aria-labelledby="campaign-modal-title">
      <div class="modal-header">
        <div>
          <h2 id="campaign-modal-title">Visão Geral</h2>
          <p id="campaign-modal-subtitle">Detalhes da campanha selecionada.</p>
        </div>
        <button class="modal-close" type="button" id="campaign-modal-close" aria-label="Fechar modal">×</button>
      </div>

      <div class="section-title">Visão Geral</div>
      <div class="metrics-grid campaign-modal-metrics" id="campaign-modal-metrics"></div>

      <div class="two-col campaign-modal-charts">
        <div>
          <div class="section-title">Gráfico de Desempenho</div>
          <div class="chart-wrap">
            <div class="chart-header">
              <span class="chart-title"><span class="dot"></span>Campanha</span>
              <div class="tab-bar" id="campaign-modal-tab-bar"></div>
            </div>
            <div class="bar-chart-area campaign-modal-bar-chart" id="campaign-modal-bar-chart"></div>
            <div class="chart-legend">
              <div class="legend-item"><span class="legend-dot" style="background:#2563eb"></span>Referência</div>
              <div class="legend-item" id="campaign-modal-legend"></div>
            </div>
          </div>
        </div>

        <div>
          <div class="section-title" id="campaign-modal-scatter-title">Comparativo</div>
          <div class="chart-wrap">
            <div class="conversion-chart">
              <canvas id="campaignModalScatterChart" role="img" aria-label="Gráfico da campanha selecionada"></canvas>
            </div>
          </div>
        </div>
      </div>

      <div class="section-title">Dados da Campanha</div>
      <div class="campaigns-table scrollable">
        <table>
          <thead id="campaign-modal-table-head"></thead>
          <tbody id="campaign-modal-table-body"></tbody>
        </table>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('campaign-modal-close').addEventListener('click', closeCampaignModal);
  modal.addEventListener('click', event => {
    if (event.target === modal) closeCampaignModal();
  });

  window.addEventListener('keydown', event => {
    if (event.key === 'Escape' && modal.classList.contains('open')) closeCampaignModal();
  });
}

function setEditingState(isEditing) {
  const addButton = document.querySelector('.btn-add');
  const cancelButton = document.getElementById('cancel-edit');

  if (addButton) addButton.textContent = isEditing ? 'Salvar alterações' : '+ Adicionar Campanha';
  if (cancelButton) cancelButton.style.display = isEditing ? 'inline-flex' : 'none';
}

function deleteCampanha(id) {
  campanhas = campanhas.filter(c => String(c.id) !== String(id));

  if (String(editingCampaignId) === String(id)) {
    editingCampaignId = null;
    clearForm();
    setEditingState(false);
  }

  salvarLocalStorage();
  renderAll();
  showToast('Campanha removida!');
}

function renderAll() {
  const empty = document.getElementById('empty-state');
  const dash = document.getElementById('dashboard-section');
  const campCount = document.getElementById('camp-count');

  campCount.textContent = campanhas.length + ' campanha' + (campanhas.length !== 1 ? 's' : '');

  if (campanhas.length === 0) {
    empty.style.display = 'block';
    dash.style.display = 'none';

    if (scatterChartInstance) {
      scatterChartInstance.destroy();
      scatterChartInstance = null;
    }

    return;
  }

  empty.style.display = 'none';
  dash.style.display = 'block';

  renderMetrics();
  renderTable();
  renderBarChart();
  renderScatter();
}

function renderMetrics() {
  document.getElementById('metrics-grid').innerHTML = getMetricCardsHTML(campanhas);
}

function getMetricCardsHTML(data) {
  const cards = pageConfig.metrics(data);

  return cards.map(card => {
    const [label, value, sub, color, small] = card;
    const fontSize = small ? 'font-size:13px;' : '';
    const colorStyle = color ? `color:${color};` : '';

    return `
      <div class="metric-card">
        <div class="metric-label">${label}</div>
        <div class="metric-value" style="${colorStyle}${fontSize}">${value}</div>
        <div class="metric-sub">${sub}</div>
      </div>
    `;
  }).join('');
}

function renderTable() {
  const thead = document.getElementById('campaigns-head');
  const tbody = document.getElementById('campaigns-body');

  thead.innerHTML = `
    <tr>
      ${pageConfig.tableHead.map(head => `<th>${head}</th>`).join('')}
    </tr>
  `;

  tbody.innerHTML = campanhas.map((c, i) => {
    const cells = pageConfig.tableRow(c).map(cell => `
      <td class="${cell.cls}" data-label="${cell.label}">${cell.value}</td>
    `).join('');

    return `
      <tr class="campaign-row" data-campaign-id="${escapeHTML(c.id)}" tabindex="0" role="button" aria-label="Abrir visão geral da campanha ${escapeHTML(c.nome)}" style="animation-delay:${i * 0.05}s">
        ${cells}
        <td class="td-actions" data-label="Ações">
          <button class="btn-edit ${String(c.id) === String(editingCampaignId) ? 'active' : ''}" type="button" data-action="edit" data-id="${escapeHTML(c.id)}" aria-label="Editar campanha" title="Editar campanha">Editar</button>
          <button class="btn-del" type="button" data-action="delete" data-id="${escapeHTML(c.id)}" aria-label="Remover campanha" title="Remover campanha">✕</button>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('[data-action="edit"]').forEach(button => {
    button.addEventListener('click', event => {
      event.stopPropagation();
      editCampanha(button.dataset.id);
    });
  });

  tbody.querySelectorAll('[data-action="delete"]').forEach(button => {
    button.addEventListener('click', event => {
      event.stopPropagation();
      deleteCampanha(button.dataset.id);
    });
  });

  tbody.querySelectorAll('.campaign-row').forEach(row => {
    row.addEventListener('click', () => openCampaignModal(row.dataset.campaignId));
    row.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openCampaignModal(row.dataset.campaignId);
      }
    });
  });
}

function openCampaignModal(id) {
  const campanha = campanhas.find(c => String(c.id) === String(id));
  const modal = document.getElementById('campaign-modal');

  if (!campanha || !modal) return;

  modalChartMode = pageConfig.defaultChart;

  document.getElementById('campaign-modal-title').textContent = campanha.nome;
  document.getElementById('campaign-modal-subtitle').textContent = 'Visão individual da campanha selecionada.';
  document.getElementById('campaign-modal-scatter-title').textContent = pageConfig.scatterTitle;
  document.getElementById('campaign-modal-metrics').innerHTML = getMetricCardsHTML([campanha]);

  renderCampaignModalTabs(campanha);
  renderCampaignModalBar(campanha);
  renderCampaignModalTable(campanha);

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  renderCampaignModalScatter(campanha);
}

function closeCampaignModal() {
  const modal = document.getElementById('campaign-modal');
  if (!modal) return;

  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');

  if (campaignModalChartInstance) {
    campaignModalChartInstance.destroy();
    campaignModalChartInstance = null;
  }
}

function renderCampaignModalTabs(campanha) {
  const tabBar = document.getElementById('campaign-modal-tab-bar');
  if (!tabBar) return;

  tabBar.innerHTML = pageConfig.tabs.map((tab, index) => `
    <button class="tab ${index === 0 ? 'active' : ''}" type="button" data-modal-chart="${tab.key}">${tab.label}</button>
  `).join('');

  tabBar.querySelectorAll('[data-modal-chart]').forEach(button => {
    button.addEventListener('click', () => {
      modalChartMode = button.dataset.modalChart;
      tabBar.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
      button.classList.add('active');
      updateCampaignModalLegend();
      renderCampaignModalBar(campanha);
    });
  });

  updateCampaignModalLegend();
}

function updateCampaignModalLegend() {
  const tab = getModalActiveTab();
  const legend = document.getElementById('campaign-modal-legend');
  if (!tab || !legend) return;

  legend.innerHTML = `<span class="legend-dot" style="background:${tab.color}"></span>${tab.legend}`;
}

function renderCampaignModalBar(campanha) {
  const area = document.getElementById('campaign-modal-bar-chart');
  const tab = getModalActiveTab();
  if (!area || !tab) return;

  const value = tab.value(campanha);
  const h = value > 0 ? 140 : 8;

  area.innerHTML = `
    <div class="bar-group">
      <div class="bar-wrap">
        <div style="position:relative; width:100%; display:flex; align-items:flex-end; height:150px;">
          <div class="bar" style="height:${h}px; background:${tab.gradient}; width:100%; position:relative; border-radius:5px 5px 0 0;">
            <span class="bar-val">${tab.format(value)}</span>
          </div>
        </div>
      </div>
      <div class="bar-label" title="${escapeHTML(campanha.nome)}">${escapeHTML(campanha.nome)}</div>
    </div>
  `;
}

function renderCampaignModalScatter(campanha) {
  const ctx = document.getElementById('campaignModalScatterChart');
  if (!ctx || typeof Chart === 'undefined') return;

  if (campaignModalChartInstance) campaignModalChartInstance.destroy();

  campaignModalChartInstance = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [{
        label: campanha.nome,
        data: [{ x: pageConfig.scatter.x(campanha), y: pageConfig.scatter.y(campanha) }],
        backgroundColor: '#06b6d4cc',
        borderColor: '#06b6d4',
        pointRadius: 9,
        pointHoverRadius: 12,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0d1829',
          borderColor: '#1a2d4a',
          borderWidth: 1,
          titleColor: '#f0f6ff',
          bodyColor: '#93c5fd',
          callbacks: {
            label: pageConfig.scatter.tooltip
          }
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: pageConfig.scatter.xTitle,
            color: '#4a6fa5',
            font: { size: 11, family: 'Syne' }
          },
          grid: { color: 'rgba(26,45,74,0.5)' },
          ticks: { color: '#4a6fa5', font: { size: 10 } }
        },
        y: {
          title: {
            display: true,
            text: pageConfig.scatter.yTitle,
            color: '#4a6fa5',
            font: { size: 11, family: 'Syne' }
          },
          grid: { color: 'rgba(26,45,74,0.5)' },
          ticks: {
            color: '#4a6fa5',
            font: { size: 10 },
            callback: pageConfig.scatter.yTick
          }
        }
      }
    }
  });
}

function renderCampaignModalTable(campanha) {
  const thead = document.getElementById('campaign-modal-table-head');
  const tbody = document.getElementById('campaign-modal-table-body');
  if (!thead || !tbody) return;

  thead.innerHTML = `
    <tr>
      ${pageConfig.tableHead.filter(head => head !== 'Ações').map(head => `<th>${head}</th>`).join('')}
    </tr>
  `;

  tbody.innerHTML = `
    <tr>
      ${pageConfig.tableRow(campanha).map(cell => `
        <td class="${cell.cls}" data-label="${cell.label}">${cell.value}</td>
      `).join('')}
    </tr>
  `;
}

function renderTabs() {
  const tabBar = document.getElementById('tab-bar');
  if (!tabBar) return;

  tabBar.innerHTML = pageConfig.tabs.map((tab, index) => `
    <button class="tab ${index === 0 ? 'active' : ''}" onclick="setChart('${tab.key}', this)">${tab.label}</button>
  `).join('');

  updateLegend();
}

function setChart(mode, btn) {
  chartMode = mode;

  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');

  updateLegend();
  renderBarChart();
}

function updateLegend() {
  const tab = getActiveTab();
  const legend = document.getElementById('legend-label');
  if (!tab || !legend) return;

  legend.innerHTML = `<span class="legend-dot" style="background:${tab.color}"></span>${tab.legend}`;
}

function renderBarChart() {
  const area = document.getElementById('bar-chart');

  if (campanhas.length === 0) {
    area.innerHTML = '';
    return;
  }

  const tab = getActiveTab();
  const vals = campanhas.map(tab.value);
  const max = Math.max(...vals);

  area.innerHTML = campanhas.map((c, i) => {
    const value = tab.value(c);
    const h = max > 0 ? Math.max(8, (value / max) * 140) : 8;

    return `
      <div class="bar-group" style="animation-delay:${i * 0.08}s">
        <div class="bar-wrap">
          <div style="position:relative; width:100%; display:flex; align-items:flex-end; height:150px;">
            <div class="bar" style="height:${h}px; background:${tab.gradient}; width:100%; position:relative; border-radius:5px 5px 0 0;">
              <span class="bar-val">${tab.format(value)}</span>
            </div>
          </div>
        </div>
        <div class="bar-label" title="${escapeHTML(c.nome)}">${escapeHTML(c.nome)}</div>
      </div>
    `;
  }).join('');
}

function renderScatter() {
  const ctx = document.getElementById('scatterChart');

  if (scatterChartInstance) {
    scatterChartInstance.destroy();
  }

  if (campanhas.length === 0) return;

  const colors = ['#3b82f6', '#06b6d4', '#8b5cf6', '#f59e0b', '#34d399', '#f87171', '#a78bfa', '#60a5fa'];

  scatterChartInstance = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: campanhas.map((c, i) => ({
        label: c.nome,
        data: [{ x: pageConfig.scatter.x(c), y: pageConfig.scatter.y(c) }],
        backgroundColor: colors[i % colors.length] + 'cc',
        borderColor: colors[i % colors.length],
        pointRadius: 8,
        pointHoverRadius: 11,
        borderWidth: 2
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0d1829',
          borderColor: '#1a2d4a',
          borderWidth: 1,
          titleColor: '#f0f6ff',
          bodyColor: '#93c5fd',
          callbacks: {
            label: pageConfig.scatter.tooltip
          }
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: pageConfig.scatter.xTitle,
            color: '#4a6fa5',
            font: { size: 11, family: 'Syne' }
          },
          grid: { color: 'rgba(26,45,74,0.5)' },
          ticks: { color: '#4a6fa5', font: { size: 10 } }
        },
        y: {
          title: {
            display: true,
            text: pageConfig.scatter.yTitle,
            color: '#4a6fa5',
            font: { size: 11, family: 'Syne' }
          },
          grid: { color: 'rgba(26,45,74,0.5)' },
          ticks: {
            color: '#4a6fa5',
            font: { size: 10 },
            callback: pageConfig.scatter.yTick
          }
        }
      }
    }
  });
}

function getActiveTab() {
  return pageConfig.tabs.find(tab => tab.key === chartMode) || pageConfig.tabs[0];
}

function getModalActiveTab() {
  return pageConfig.tabs.find(tab => tab.key === modalChartMode) || pageConfig.tabs[0];
}

function getValue(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

function getNumber(id) {
  const value = parseFloat(getValue(id));
  return Number.isFinite(value) ? value : 0;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function sum(data, key) {
  return data.reduce((total, item) => total + (Number(item[key]) || 0), 0);
}

function avg(data, key) {
  return data.length ? sum(data, key) / data.length : 0;
}

function formatMoney(value, decimals = 2) {
  return `R$ ${Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}`;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('pt-BR');
}

function compactNumber(value) {
  const number = Number(value || 0);

  if (number >= 1000000) return `${(number / 1000000).toFixed(1)}mi`;
  if (number >= 1000) return `${(number / 1000).toFixed(1)}k`;

  return number.toFixed(0);
}

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;

  document.body.appendChild(t);

  setTimeout(() => t.remove(), 2500);
}

