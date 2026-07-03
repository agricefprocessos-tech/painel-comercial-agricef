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
  renderizarCarteira(dados.carteira);
  renderizarCarteiraDetalhe(dados.carteira);
  renderizarMetaPorLinha(dados.resumo.atingimentoPorNivel1);
  renderizarFaturamentoMensal(dados.faturamentoMes);
  renderizarFaturamentoMensalPorLinha(dados.faturamentoMensalPorNivel1);
  renderizarNivel1(dados.resumo.faturadoPorNivel1);
  renderizarNivel3(dados.faturamentoPorNivel3);
  renderizarOportunidades(dados.oportunidades);
  renderizarOportunidadesPorLinha(dados.oportunidades.totalPorNivel1);
  renderizarOportunidadesLinhaCards(dados.oportunidades.totalPorNivel1);
  renderizarCenarios(dados.cenarios, dados.carteira);
  renderizarPipeline(dados.pipeline);
}

function renderizarCarteira(carteira) {
  if (!carteira) return;
  document.getElementById('cartSomaCarteira').textContent = fmtMoeda(carteira.somaCarteira);
  document.getElementById('cartSomaFaturadoCarteira').textContent = fmtMoeda(carteira.somaFaturadoCarteira);
  document.getElementById('cartPercentual').textContent = fmtPercent(carteira.percentualFaturadoCarteira);
}

function renderizarCarteiraDetalhe(carteira) {
  if (!carteira) return;
  destruirSeExistir('carteiraMensal');
  const ctx = document.getElementById('chartCarteiraMensal');
  const serie = carteira.previsaoConversaoMensal || [];
  charts.carteiraMensal = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: serie.map(s => s.anoMes),
      datasets: [{ label: 'Previsão (R$)', data: serie.map(s => s.valor), backgroundColor: PALETA.gold, borderRadius: 4 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { ticks: { callback: v => fmtMoeda(v) } } },
    },
  });

  const corpoTabela = document.querySelector('#tabelaCarteiraDetalhe tbody');
  if (!corpoTabela) return;
  corpoTabela.innerHTML = '';
  (carteira.detalhe || [])
    .slice()
    .sort((a, b) => (Number(b.ValorParcela) || 0) - (Number(a.ValorParcela) || 0))
    .slice(0, 10)
    .forEach(l => {
      const mes = l.MesParcela ? new Date(l.MesParcela).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }) : '';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${l.Cliente || ''}</td>
        <td>${l.Projeto || ''}</td>
        <td>${mes}</td>
        <td>${fmtMoeda(l.ValorParcela)}</td>
      `;
      corpoTabela.appendChild(tr);
    });
}

function renderizarCenarios(cenarios, carteira) {
  const corpoTabela = document.querySelector('#tabelaCenarios tbody');
  if (!corpoTabela || !cenarios || !carteira) return;
  const linhas = [
    { label: 'Faturado + Carteira', valor: carteira.somaFaturadoCarteira, pct: carteira.percentualFaturadoCarteira },
    { label: '+ Oportunidades Alta', valor: cenarios.somaFatCartA, pct: cenarios.percentualFatCartA },
    { label: '+ Oportunidades Alta e Média', valor: cenarios.somaFatCartAM, pct: cenarios.percentualFatCartAM },
    { label: '+ Todas as Oportunidades', valor: cenarios.somaFatCartOport, pct: cenarios.percentualFatCartOport },
  ];
  corpoTabela.innerHTML = '';
  linhas.forEach(l => {
    const pct = l.pct === null ? 0 : Math.min(l.pct * 100, 100);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${l.label}</td>
      <td>${fmtMoeda(l.valor)}</td>
      <td>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
        <span>${fmtPercent(l.pct)}</span>
      </td>
    `;
    corpoTabela.appendChild(tr);
  });
}

function renderizarMetaPorLinha(atingimentoPorNivel1) {
  const corpoTabela = document.querySelector('#tabelaMetaLinha tbody');
  if (!corpoTabela) return;
  corpoTabela.innerHTML = '';
  Object.entries(atingimentoPorNivel1 || {}).forEach(([linha, dado]) => {
    const pct = dado.percentual === null ? 0 : Math.min(dado.percentual * 100, 100);
    const pctPacing = dado.percentualPacing === null || dado.percentualPacing === undefined ? 0 : Math.min(dado.percentualPacing * 100, 100);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${linha}</td>
      <td>${fmtMoeda(dado.faturado)}</td>
      <td>${fmtMoeda(dado.meta)}</td>
      <td>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
        <span>${fmtPercent(dado.percentual)}</span>
      </td>
      <td>${fmtMoeda(dado.metaAcumulada)}</td>
      <td>
        <div class="progress-bar"><div class="progress-fill" style="width:${pctPacing}%"></div></div>
        <span>${fmtPercent(dado.percentualPacing)}</span>
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
  document.getElementById('cardRitmo').textContent = fmtPercent(resumo.percentualAtingimentoPacing);
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

function renderizarFaturamentoMensalPorLinha(serie) {
  destruirSeExistir('faturamentoMensalLinha');
  const ctx = document.getElementById('chartFaturamentoMensalLinha');
  const dadosSerie = serie || [];
  const linhas = Array.from(new Set(dadosSerie.flatMap(s => Object.keys(s.porNivel1))));
  const cores = { Equipamentos: PALETA.darkGreen, 'Serviços': PALETA.gold, 'Locação': PALETA.sage, 'Não Classificado': PALETA.grey };
  charts.faturamentoMensalLinha = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: dadosSerie.map(s => s.anoMes),
      datasets: linhas.map(linha => ({
        label: linha,
        data: dadosSerie.map(s => s.porNivel1[linha] || 0),
        backgroundColor: cores[linha] || PALETA.midGreen,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { stacked: true },
        y: { stacked: true, ticks: { callback: v => fmtMoeda(v) } },
      },
    },
  });
}

function renderizarNivel3(porNivel1) {
  const corpoTabela = document.querySelector('#tabelaNivel3 tbody');
  if (!corpoTabela) return;
  const linhas = [];
  Object.entries(porNivel1 || {}).forEach(([n1, dadoN1]) => {
    Object.values(dadoN1.porNivel2 || {}).forEach(dadoN2 => {
      Object.values(dadoN2.porNivel3 || {}).forEach(dadoN3 => {
        linhas.push({ n1, n2: dadoN2.label, n3: dadoN3.label, valor: dadoN3.total });
      });
    });
  });
  linhas.sort((a, b) => b.valor - a.valor);
  corpoTabela.innerHTML = '';
  linhas.forEach(l => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${l.n1}</td>
      <td>${l.n2}</td>
      <td>${l.n3}</td>
      <td>${fmtMoeda(l.valor)}</td>
    `;
    corpoTabela.appendChild(tr);
  });
}

function renderizarOportunidadesLinhaCards(porNivel1) {
  const container = document.getElementById('cardsOportunidadesLinha');
  if (!container) return;
  container.innerHTML = '';
  Object.entries(porNivel1 || {}).forEach(([linha, valor]) => {
    const div = document.createElement('div');
    div.className = 'mini-card';
    div.innerHTML = `<span class="mini-label">Oportunidades - ${linha}</span><span class="mini-value">${fmtMoeda(valor)}</span>`;
    container.appendChild(div);
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

function renderizarOportunidadesPorLinha(porNivel1) {
  destruirSeExistir('oportLinha');
  const ctx = document.getElementById('chartOportunidadesLinha');
  const labels = Object.keys(porNivel1 || {});
  charts.oportLinha = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: Object.values(porNivel1 || {}),
        backgroundColor: [PALETA.darkGreen, PALETA.gold, PALETA.sage, PALETA.midGreen],
      }],
    },
    options: { responsive: true, maintainAspectRatio: false },
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
