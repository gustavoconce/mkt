const DATABASE_KEYS = {
  posts: 'campanhas_posts_turbinados',
  campanhas: 'campanhas_metricas_ads',
  crm: 'crm_leads_board'
};

function criarSnapshotBanco() {
  return {
    app: 'dashboard_metricas_ads',
    version: 2,
    exportedAt: new Date().toISOString(),
    data: {
      postsTurbinados: safeParseStorage(DATABASE_KEYS.posts, []),
      campanhas: safeParseStorage(DATABASE_KEYS.campanhas, []),
      crmLeads: safeParseStorage(DATABASE_KEYS.crm, null) || getDefaultCRMBoard()
    }
  };
}

function exportarBancoDeDados() {
  const snapshot = criarSnapshotBanco();
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);

  a.href = url;
  a.download = `database-backup-${date}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  if (typeof showToast === 'function') showToast('Backup JSON exportado!');
}

function importarBancoDeDados(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    try {
      const payload = JSON.parse(reader.result);
      const data = payload.data || payload;

      if (Array.isArray(data.postsTurbinados)) {
        localStorage.setItem(DATABASE_KEYS.posts, JSON.stringify(data.postsTurbinados));
      }

      if (Array.isArray(data.campanhas)) {
        localStorage.setItem(DATABASE_KEYS.campanhas, JSON.stringify(data.campanhas));
      }

      if (data.crmLeads && Array.isArray(data.crmLeads.columns)) {
        localStorage.setItem(DATABASE_KEYS.crm, JSON.stringify(data.crmLeads));
      }

      if (typeof showToast === 'function') showToast('Banco importado com sucesso!');
      setTimeout(() => window.location.reload(), 650);
    } catch (error) {
      if (typeof showToast === 'function') showToast('Arquivo inválido. Use um JSON exportado pelo sistema.');
      console.error(error);
    } finally {
      event.target.value = '';
    }
  };

  reader.readAsText(file);
}

function safeParseStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

function getDefaultCRMBoard() {
  return {
    columns: [
      { id: 'novo', title: 'Novo lead', cards: [] },
      { id: 'contato', title: 'Em contato', cards: [] },
      { id: 'qualificado', title: 'Qualificado', cards: [] },
      { id: 'perdido', title: 'Perdido', cards: [] }
    ]
  };
}
