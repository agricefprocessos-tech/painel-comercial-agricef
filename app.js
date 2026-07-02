const PALETA = {
  darkGreen: '#1B4032',
  midGreen: '#2D604B',
  sage: '#84A98C',
  gold: '#C98A27',
  goldLight: '#E8C97E',
  red: '#B33A3A',
  grey: '#9AA09D',
};

const fmtMoeda = (valor) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(valor || 0);

const fmtPercent = (valor) =>
  valor === null || valor === undefined ? '—' : new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 }).format(valor);

async function carregarDados() {
  document.getElementById('ultimaAtualizacao').textContent = 'Atualizando...';
  try {
    const resp = await fetch(`${API_URL}?recurso=tudo`);
    const dados = await resp.json();
    if (dados.erro) throw new Error(dados.erro);
    renderizarTudo(dados);
    document.getElementById('ultimaAtualizacao').textContent =
      'Atualizado em ' + new Date(dados.atualizadoEm).toLocaleString('pt-BR');
  } catch (err) {
    document.getElementById('ultimaAtualizacao').textContent = 'Erro ao carregar dados — ver console';
    console.error(err);
  }
}

function renderizarTudo(dados) {
  renderizarCards(dados.resumo, dados.pipeline);
  renderizarMetaPorLinha(dados.resumo.atingimentoPorNivel1);
  renderizarFaturamentoMensal(dados.faturamentoMes);
  renderizarNivel1(dados.resumo.faturadoPorNivel1);
  renderizarOportunidades(dados.oportunidades);
  renderizarPipeline(dados.pipeline);
}

function renderizarMetaPorLinha(atingimentoPorNivel1) {
  const corpoTabela = document.querySelector('#tabelaMetaLinha tbody');
  if (!corpoTabela) return;
  corpoTabela.innerHTML = '';
  Object.entries(atingimentoPorNivel1 || {}).forEach(([linha, dado]) => {
    const pct = dado.percentual === null ? 0 : Math.min(dado.percentual * 100, 100);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${linha}</td>
      <td>${fmtMoeda(dado.faturado)}</td>
      <td>${fmtMoeda(dado.meta)}</td>
      <td>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
        <span>${fmtPercent(dado.percentual)}</span>
      </td>
    `;
    corpoTabela.appendChild(tr);
  });
}

function renderizarCards(resumo, pipeline) {
  document.getElementById('cardFaturado').textContent = fmtMoeda(resumo.totalFaturado);
  document.getElementById('cardMeta').textContent = fmtMoeda(resumo.metaConservadora);
  document.getElementById('cardAtingimento').textContent = fmtPercent(resumo.percentualAtingimento);
  document.getElementById('cardPipeline').textContent = pipeline.totalPropostas + ' propostas';
}

let charts = {};
function destruirSeExistir(nome) {
  if (charts[nome]) charts[nome].destroy();
}

function renderizarFaturamentoMensal(serie) {
  destruirSeExistir('faturamento');
  const ctx = document.getElementById('chartFaturamento');
  charts.faturamento = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: serie.map(s => s.anoMes),
      datasets: [{
        label: 'Faturamento (R$)',
        data: serie.map(s => s.valor),
        backgroundColor: PALETA.darkGreen,
        borderRadius: 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { ticks: { callback: v => fmtMoeda(v) } },
      },
    },
  });
}

function renderizarNivel1(porNivel1) {
  destruirSeExistir('nivel1');
  const ctx = document.getElementById('chartNivel1');
  const labels = Object.keys(porNivel1);
  charts.nivel1 = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: Object.values(porNivel1),
        backgroundColor: [PALETA.darkGreen, PALETA.gold, PALETA.sage, PALETA.midGreen],
      }],
    },
    options: { responsive: true, maintainAspectRatio: false },
  });
}

function renderizarOportunidades(oport) {
  destruirSeExistir('oportunidades');
  const ctx = document.getElementById('chartOportunidades');
  const labels = Object.keys(oport.totalPorExpectativa);
  charts.oportunidades = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Valor (R$)',
        data: Object.values(oport.totalPorExpectativa),
        backgroundColor: [PALETA.darkGreen, PALETA.gold, PALETA.sage],
        borderRadius: 4,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { ticks: { callback: v => fmtMoeda(v) } } },
    },
  });

  const corpoTabela = document.querySelector('#tabelaOportunidades tbody');
  corpoTabela.innerHTML = '';
  oport.lista
    .slice()
    .sort((a, b) => (Number(b.ValorTotal) || 0) - (Number(a.ValorTotal) || 0))
    .slice(0, 10)
    .forEach(o => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${o.Cliente || ''}</td>
        <td>${o.Projeto || ''}</td>
        <td>${o.Status || ''}</td>
        <td>${o.Expectativa || ''}</td>
        <td>${fmtMoeda(o.ValorTotal)}</td>
      `;
      corpoTabela.appendChild(tr);
    });
}

function renderizarPipeline(pipeline) {
  destruirSeExistir('pipeline');
  const ctx = document.getElementById('chartPipeline');
  const labels = Object.keys(pipeline.porStatus);
  charts.pipeline = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Propostas',
        data: Object.values(pipeline.porStatus),
        backgroundColor: PALETA.gold,
        borderRadius: 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
    },
  });
}

document.getElementById('btnAtualizar').addEventListener('click', carregarDados);
carregarDados();
