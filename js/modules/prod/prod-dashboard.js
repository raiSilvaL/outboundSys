/**
 * Módulo de Produtividade - Restaurado com filtro de data inteligente
 */

const PROD_API_URL = "https://script.google.com/macros/s/AKfycbyHb2aTIK2b5-dpLkE0L0am1aCA-B_uIvkEjbz-cHs6DtMnwLBwCi7ZhkIRhLJK4njIzg/exec?aba=Produtividade";

let prodData = [];
let currentViewIndex = 0;
const views = [
    "Visão Geral (Gráfico)",
    "1º Turno (05:40 - 14:00)",
    "2º Turno (14:00 - 22:20)",
    "3º Turno (22:20 - 05:40)",
    "Resumo Consolidado"
];

let prodChart = null;

// Estado de ordenação para tabelas
let currentTableSort = { column: null, order: 'asc' };

async function loadProdData() {
    const overlay = document.getElementById('loading-overlay');
    try {
        console.log("Iniciando carregamento de dados da API...");
        const response = await fetch(PROD_API_URL);
        const rawData = await response.json();

        // Remove o primeiro item (cabeçalhos)
        const allData = rawData.slice(1);
        
        // Filtrar para os últimos 7 dias por padrão
        prodData = filterDataByLast7Days(allData);
        
        console.log(`Dados carregados: ${prodData.length} registros para hoje.`);

        updateCards();
        renderView();

        if (overlay) overlay.style.display = 'none';
    } catch (error) {
        console.error("Erro ao carregar dados de produtividade:", error);
        if (overlay) overlay.innerHTML = `<p style="color: #ef4444;">Erro ao carregar dados. Verifique a conexão.</p>`;
    }
}

function getTodayDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function filterDataByLast7Days(data) {
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    today.setHours(23, 59, 59, 999);

    return data.filter(row => {
        const dateVal = row.Data || row.Hora;
        if (!dateVal) return true; // Incluir dados sem data

        const d = new Date(dateVal);
        if (isNaN(d.getTime()) || d.getFullYear() <= 1900) return true; // Incluir datas inválidas (assumir hoje)
        
        return d >= sevenDaysAgo && d <= today;
    });
}

function filterDataByToday(data) {
    const today = getTodayDate();
    
    return data.filter(row => {
        // Tenta pegar a data de vários campos possíveis
        let rowDate = null;
        const dateVal = row.Data || row.Hora;
        
        if (dateVal) {
            const d = new Date(dateVal);
            // Se for uma data válida e NÃO for a data base do Excel (1899)
            if (!isNaN(d.getTime()) && d.getFullYear() > 1900) {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                rowDate = `${year}-${month}-${day}`;
            }
        }
        
        // Se não conseguimos extrair uma data válida (ou for 1899), 
        // assumimos que o dado é de hoje para garantir a exibição.
        if (!rowDate) return true;
        
        // Se temos uma data real, filtramos estritamente por hoje.
        return rowDate === today;
    });
}

function parseVal(val) {
    if (typeof val === 'string' && (val.includes('#DIV/0!') || val.trim() === '')) return 0;
    return parseFloat(val) || 0;
}

function updateCards() {
    let totals = {
        pick: { meta: 0, real: 0 },
        rebin: { meta: 0, real: 0 },
        pack: { meta: 0, real: 0 },
        ship: { meta: 0, real: 0 }
    };

    prodData.forEach(row => {
        totals.pick.meta += parseVal(row["Meta Pit"]);
        totals.pick.real += parseVal(row["Realizado Pit"]);

        totals.rebin.meta += parseVal(row["Meta Rebin"]);
        totals.rebin.real += parseVal(row["Reallizado Rebin"]);

        totals.pack.meta += parseVal(row["Meta Packing"]);
        totals.pack.real += parseVal(row["Realizado Packing"]);

        totals.ship.meta += parseVal(row["Meta Ship Dock"]);
        totals.ship.real += parseVal(row["Realizado Ship Dock"]);
    });

    updateCardUI('pick', totals.pick);
    updateCardUI('rebin', totals.rebin);
    updateCardUI('pack', totals.pack);
    updateCardUI('ship', totals.ship);
}

function updateCardUI(id, data) {
    const percent = data.meta > 0 ? ((data.real / data.meta) * 100).toFixed(1) : "0.0";
    const percentEl = document.getElementById(`card-${id}-percent`);
    const metaEl = document.getElementById(`card-${id}-meta`);
    const realEl = document.getElementById(`card-${id}-real`);

    if (percentEl) percentEl.textContent = `${percent}%`;
    if (metaEl) metaEl.textContent = Math.round(data.meta).toLocaleString('pt-BR');
    if (realEl) realEl.textContent = Math.round(data.real).toLocaleString('pt-BR');
}

function setupViewControls() {
    const prevBtn = document.getElementById('view-prev');
    const nextBtn = document.getElementById('view-next');

    if (prevBtn) prevBtn.onclick = () => {
        currentViewIndex = (currentViewIndex - 1 + views.length) % views.length;
        renderView();
    };

    if (nextBtn) nextBtn.onclick = () => {
        currentViewIndex = (currentViewIndex + 1) % views.length;
        renderView();
    };
}

function renderView() {
    const title = views[currentViewIndex];
    const titleEl = document.getElementById('view-title-text');
    if (titleEl) titleEl.textContent = title;

    const chartCont = document.getElementById('chart-container');
    const tableCont = document.getElementById('table-container');

    if (currentViewIndex === 0) {
        if (chartCont) chartCont.style.display = 'block';
        if (tableCont) tableCont.style.display = 'none';
        renderChart();
    } else {
        if (chartCont) chartCont.style.display = 'none';
        if (tableCont) tableCont.style.display = 'block';
        renderTable(title);
    }
}

function renderChart() {
    const canvas = document.getElementById('prodChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (prodChart) prodChart.destroy();

    // Garantir que apenas os últimos 7 dias sejam exibidos
    const dataFor7Days = filterDataByLast7Days(prodData);
    const labels = dataFor7Days.map(row => {
        const date = new Date(row.Hora);
        return date.getHours().toString().padStart(2, '0') + ":00";
    });

    const datasets = [{
            label: 'Picking',
            data: dataFor7Days.map(row => parseVal(row["Realizado Pit"])),
            borderColor: '#f97316',
            backgroundColor: 'rgba(249, 115, 22, 0.1)',
            fill: true,
            tension: 0.4
        },
        {
            label: 'Rebin',
            data: dataFor7Days.map(row => parseVal(row["Reallizado Rebin"])),
            borderColor: '#a855f7',
            backgroundColor: 'rgba(168, 85, 247, 0.1)',
            fill: true,
            tension: 0.4
        },
        {
            label: 'Packing',
            data: dataFor7Days.map(row => parseVal(row["Realizado Packing"])),
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            fill: true,
            tension: 0.4
        },
        {
            label: 'Ship Dock',
            data: dataFor7Days.map(row => parseVal(row["Realizado Ship Dock"])),
            borderColor: '#0ea5e9',
            backgroundColor: 'rgba(14, 165, 233, 0.1)',
            fill: true,
            tension: 0.4
        }
    ];

    prodChart = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#94a3b8', font: { family: 'Montserrat' } }
                }
            },
            scales: {
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94a3b8' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8' }
                }
            }
        }
    });
}

function sortTableByColumn(columnIndex, columnName) {
    if (currentTableSort.column === columnName) {
        currentTableSort.order = currentTableSort.order === 'asc' ? 'desc' : 'asc';
    } else {
        currentTableSort.column = columnName;
        currentTableSort.order = 'asc';
    }
    renderView();
}

function renderTable(viewTitle) {
    const table = document.getElementById('prod-table-detail');
    if (!table) return;

    if (viewTitle === "Resumo Consolidado") {
        renderConsolidatedTable();
        return;
    }

    let html = `
        <thead>
            <tr>
                <th rowspan="2" style="cursor: pointer;" onclick="window.sortTableByColumn(0, 'hora')">HORA</th>
                <th rowspan="2" style="cursor: pointer;" onclick="window.sortTableByColumn(1, 'fct')">FCT</th>
                <th rowspan="2" style="cursor: pointer;" onclick="window.sortTableByColumn(2, 'cap')">CAP</th>
                <th colspan="4" class="header-pick">PICK</th>
                <th colspan="4" class="header-rebin">REBIN</th>
                <th colspan="4" class="header-pack">PACK</th>
                <th colspan="4" class="header-ship">SHIP</th>
            </tr>
            <tr>
                <th class="header-pick">META</th><th class="header-pick">REAL</th><th class="header-pick">PESS</th><th class="header-pick">TPH</th>
                <th class="header-rebin">META</th><th class="header-rebin">REAL</th><th class="header-rebin">PESS</th><th class="header-rebin">TPH</th>
                <th class="header-pack">META</th><th class="header-pack">REAL</th><th class="header-pack">PESS</th><th class="header-pack">TPH</th>
                <th class="header-ship">META</th><th class="header-ship">REAL</th><th class="header-ship">PESS</th><th class="header-ship">TPH</th>
            </tr>
        </thead>
        <tbody>
    `;

    let shiftHours = [];
    let turnoDisplay = "";
    if (viewTitle.includes("1º Turno")) {
        shiftHours = [6, 7, 8, 9, 10, 11, 12, 13];
        turnoDisplay = "1º Turno";
    } else if (viewTitle.includes("2º Turno")) {
        shiftHours = [14, 15, 16, 17, 18, 19, 20, 21];
        turnoDisplay = "2º Turno";
    } else if (viewTitle.includes("3º Turno")) {
        shiftHours = [22, 23, 0, 1, 2, 3, 4, 5];
        turnoDisplay = "3º Turno";
    }

    const dataByHour = {};
    prodData.forEach(r => {
        const d = new Date(r.Hora);
        if (!isNaN(d.getTime())) {
            dataByHour[d.getHours()] = r;
        }
    });

    shiftHours.forEach(h => {
        const row = dataByHour[h];
        const horaStr = h.toString().padStart(2, '0') + ":00";
        const horaISO = row ? row.Hora : `${getTodayDate()}T${h.toString().padStart(2, '0')}:00:00.000Z`;

        html += `
            <tr>
                <td style="cursor: pointer; color: inherit; text-decoration: none;" onclick="openRankingModal('${horaISO}', 'Pit', '${turnoDisplay}')">${horaStr}</td>
                <td>${row ? Math.round(parseVal(row.Forecast)) : 0}</td>
                <td>${row ? Math.round(parseVal(row.Capacidade)) : 0}</td>
                
                <td class="col-group-pick" style="cursor: pointer;" onclick="openRankingModal('${horaISO}', 'Pit', '${turnoDisplay}')">${row ? Math.round(parseVal(row["Meta Pit"])) : 0}</td>
                <td class="col-group-pick" style="cursor: pointer;" onclick="openRankingModal('${horaISO}', 'Pit', '${turnoDisplay}')"><span class="val-real">${row ? Math.round(parseVal(row["Realizado Pit"])) : 0}</span></td>
                <td class="col-group-pick" style="cursor: pointer;" onclick="openRankingModal('${horaISO}', 'Pit', '${turnoDisplay}')">${row ? Math.round(parseVal(row["Qtd. Pessoas Pit"])) : 0}</td>
                <td class="col-group-pick" style="cursor: pointer;" onclick="openRankingModal('${horaISO}', 'Pit', '${turnoDisplay}')">${row ? parseVal(row["TPH Pit"]).toFixed(1) : "0.0"}</td>
                
                <td class="col-group-rebin" style="cursor: pointer;" onclick="openRankingModal('${horaISO}', 'Rebin', '${turnoDisplay}')">${row ? Math.round(parseVal(row["Meta Rebin"])) : 0}</td>
                <td class="col-group-rebin" style="cursor: pointer;" onclick="openRankingModal('${horaISO}', 'Rebin', '${turnoDisplay}')"><span class="val-real">${row ? Math.round(parseVal(row["Reallizado Rebin"])) : 0}</span></td>
                <td class="col-group-rebin" style="cursor: pointer;" onclick="openRankingModal('${horaISO}', 'Rebin', '${turnoDisplay}')">${row ? Math.round(parseVal(row["Qtd.Pessoas Rebin"])) : 0}</td>
                <td class="col-group-rebin" style="cursor: pointer;" onclick="openRankingModal('${horaISO}', 'Rebin', '${turnoDisplay}')">${row ? parseVal(row["TPH Rebin"]).toFixed(1) : "0.0"}</td>
                
                <td class="col-group-pack" style="cursor: pointer;" onclick="openRankingModal('${horaISO}', 'Packing', '${turnoDisplay}')">${row ? Math.round(parseVal(row["Meta Packing"])) : 0}</td>
                <td class="col-group-pack" style="cursor: pointer;" onclick="openRankingModal('${horaISO}', 'Packing', '${turnoDisplay}')"><span class="val-real">${row ? Math.round(parseVal(row["Realizado Packing"])) : 0}</span></td>
                <td class="col-group-pack" style="cursor: pointer;" onclick="openRankingModal('${horaISO}', 'Packing', '${turnoDisplay}')">${row ? Math.round(parseVal(row["Qtd. Pessoas Packing"])) : 0}</td>
                <td class="col-group-pack" style="cursor: pointer;" onclick="openRankingModal('${horaISO}', 'Packing', '${turnoDisplay}')">${row ? parseVal(row["TPH Packing"]).toFixed(1) : "0.0"}</td>
                
                <td class="col-group-ship" style="cursor: pointer;" onclick="openRankingModal('${horaISO}', 'ShipDock', '${turnoDisplay}')">${row ? Math.round(parseVal(row["Meta Ship Dock"])) : 0}</td>
                <td class="col-group-ship" style="cursor: pointer;" onclick="openRankingModal('${horaISO}', 'ShipDock', '${turnoDisplay}')"><span class="val-real">${row ? Math.round(parseVal(row["Realizado Ship Dock"])) : 0}</span></td>
                <td class="col-group-ship" style="cursor: pointer;" onclick="openRankingModal('${horaISO}', 'ShipDock', '${turnoDisplay}')">${row ? Math.round(parseVal(row["Qtd. Pessoas Ship Dock"])) : 0}</td>
                <td class="col-group-ship" style="cursor: pointer;" onclick="openRankingModal('${horaISO}', 'ShipDock', '${turnoDisplay}')">${row ? parseVal(row["TPH Ship Dock"]).toFixed(1) : "0.0"}</td>
            </tr>
        `;
    });

    html += '</tbody>';
    table.innerHTML = html;
}

function renderConsolidatedTable() {
    const table = document.getElementById('prod-table-detail');
    if (!table) return;

    const getTurno = (h) => {
        if (h >= 6 && h < 14) return "1º Turno";
        if (h >= 14 && h < 22) return "2º Turno";
        return "3º Turno";
    };

    let consolidado = {
        "1º Turno": { fct: 0, cap: 0, pickM: 0, pickR: 0, pickP: 0, pickT: 0, rebinM: 0, rebinR: 0, rebinP: 0, rebinT: 0, packM: 0, packR: 0, packP: 0, packT: 0, shipM: 0, shipR: 0, shipP: 0, shipT: 0 },
        "2º Turno": { fct: 0, cap: 0, pickM: 0, pickR: 0, pickP: 0, pickT: 0, rebinM: 0, rebinR: 0, rebinP: 0, rebinT: 0, packM: 0, packR: 0, packP: 0, packT: 0, shipM: 0, shipR: 0, shipP: 0, shipT: 0 },
        "3º Turno": { fct: 0, cap: 0, pickM: 0, pickR: 0, pickP: 0, pickT: 0, rebinM: 0, rebinR: 0, rebinP: 0, rebinT: 0, packM: 0, packR: 0, packP: 0, packT: 0, shipM: 0, shipR: 0, shipP: 0, shipT: 0 }
    };

    prodData.forEach(row => {
        const d = new Date(row.Hora);
        if (!isNaN(d.getTime())) {
            const t = getTurno(d.getHours());
            consolidado[t].fct += parseVal(row.Forecast);
            consolidado[t].cap += parseVal(row.Capacidade);
            consolidado[t].pickM += parseVal(row["Meta Pit"]);
            consolidado[t].pickR += parseVal(row["Realizado Pit"]);
            consolidado[t].pickP += parseVal(row["Qtd. Pessoas Pit"]);
            consolidado[t].pickT += parseVal(row["TPH Pit"]);
            consolidado[t].rebinM += parseVal(row["Meta Rebin"]);
            consolidado[t].rebinR += parseVal(row["Reallizado Rebin"]);
            consolidado[t].rebinP += parseVal(row["Qtd.Pessoas Rebin"]);
            consolidado[t].rebinT += parseVal(row["TPH Rebin"]);
            consolidado[t].packM += parseVal(row["Meta Packing"]);
            consolidado[t].packR += parseVal(row["Realizado Packing"]);
            consolidado[t].packP += parseVal(row["Qtd. Pessoas Packing"]);
            consolidado[t].packT += parseVal(row["TPH Packing"]);
            consolidado[t].shipM += parseVal(row["Meta Ship Dock"]);
            consolidado[t].shipR += parseVal(row["Realizado Ship Dock"]);
            consolidado[t].shipP += parseVal(row["Qtd. Pessoas Ship Dock"]);
            consolidado[t].shipT += parseVal(row["TPH Ship Dock"]);
        }
    });

    let html = `
        <thead>
            <tr>
                <th rowspan="2" style="cursor: pointer;" onclick="window.sortTableByColumn(0, 'turno')">TURNO</th>
                <th rowspan="2" style="cursor: pointer;" onclick="window.sortTableByColumn(1, 'fct')">FCT</th>
                <th rowspan="2" style="cursor: pointer;" onclick="window.sortTableByColumn(2, 'cap')">CAP</th>
                <th colspan="4" class="header-pick">PICK</th>
                <th colspan="4" class="header-rebin">REBIN</th>
                <th colspan="4" class="header-pack">PACK</th>
                <th colspan="4" class="header-ship">SHIP</th>
            </tr>
            <tr>
                <th class="header-pick">META</th><th class="header-pick">REAL</th><th class="header-pick">PESS</th><th class="header-pick">TPH</th>
                <th class="header-rebin">META</th><th class="header-rebin">REAL</th><th class="header-rebin">PESS</th><th class="header-rebin">TPH</th>
                <th class="header-pack">META</th><th class="header-pack">REAL</th><th class="header-pack">PESS</th><th class="header-pack">TPH</th>
                <th class="header-ship">META</th><th class="header-ship">REAL</th><th class="header-ship">PESS</th><th class="header-ship">TPH</th>
            </tr>
        </thead>
        <tbody>
    `;

    let totals = { fct: 0, cap: 0, pickM: 0, pickR: 0, pickP: 0, pickT: 0, rebinM: 0, rebinR: 0, rebinP: 0, rebinT: 0, packM: 0, packR: 0, packP: 0, packT: 0, shipM: 0, shipR: 0, shipP: 0, shipT: 0 };

    Object.keys(consolidado).forEach(t => {
        const d = consolidado[t];
        html += `
            <tr>
                <td style="cursor: pointer; color: inherit; text-decoration: none;" onclick="openRankingModal(null, 'Pit', '${t}')">${t}</td>
                <td>${Math.round(d.fct)}</td>
                <td>${Math.round(d.cap)}</td>
                
                <td class="col-group-pick" style="cursor: pointer;" onclick="openRankingModal(null, 'Pit', '${t}')">${Math.round(d.pickM)}</td>
                <td class="col-group-pick" style="cursor: pointer;" onclick="openRankingModal(null, 'Pit', '${t}')"><span class="val-real">${Math.round(d.pickR)}</span></td>
                <td class="col-group-pick" style="cursor: pointer;" onclick="openRankingModal(null, 'Pit', '${t}')">${Math.round(d.pickP)}</td>
                <td class="col-group-pick" style="cursor: pointer;" onclick="openRankingModal(null, 'Pit', '${t}')">${d.pickT.toFixed(1)}</td>
                
                <td class="col-group-rebin" style="cursor: pointer;" onclick="openRankingModal(null, 'Rebin', '${t}')">${Math.round(d.rebinM)}</td>
                <td class="col-group-rebin" style="cursor: pointer;" onclick="openRankingModal(null, 'Rebin', '${t}')"><span class="val-real">${Math.round(d.rebinR)}</span></td>
                <td class="col-group-rebin" style="cursor: pointer;" onclick="openRankingModal(null, 'Rebin', '${t}')">${Math.round(d.rebinP)}</td>
                <td class="col-group-rebin" style="cursor: pointer;" onclick="openRankingModal(null, 'Rebin', '${t}')">${d.rebinT.toFixed(1)}</td>
                
                <td class="col-group-pack" style="cursor: pointer;" onclick="openRankingModal(null, 'Packing', '${t}')">${Math.round(d.packM)}</td>
                <td class="col-group-pack" style="cursor: pointer;" onclick="openRankingModal(null, 'Packing', '${t}')"><span class="val-real">${Math.round(d.packR)}</span></td>
                <td class="col-group-pack" style="cursor: pointer;" onclick="openRankingModal(null, 'Packing', '${t}')">${Math.round(d.packP)}</td>
                <td class="col-group-pack" style="cursor: pointer;" onclick="openRankingModal(null, 'Packing', '${t}')">${d.packT.toFixed(1)}</td>
                
                <td class="col-group-ship" style="cursor: pointer;" onclick="openRankingModal(null, 'ShipDock', '${t}')">${Math.round(d.shipM)}</td>
                <td class="col-group-ship" style="cursor: pointer;" onclick="openRankingModal(null, 'ShipDock', '${t}')"><span class="val-real">${Math.round(d.shipR)}</span></td>
                <td class="col-group-ship" style="cursor: pointer;" onclick="openRankingModal(null, 'ShipDock', '${t}')">${Math.round(d.shipP)}</td>
                <td class="col-group-ship" style="cursor: pointer;" onclick="openRankingModal(null, 'ShipDock', '${t}')">${d.shipT.toFixed(1)}</td>
            </tr>
        `;

        totals.fct += d.fct; totals.cap += d.cap;
        totals.pickM += d.pickM; totals.pickR += d.pickR; totals.pickP += d.pickP; totals.pickT += d.pickT;
        totals.rebinM += d.rebinM; totals.rebinR += d.rebinR; totals.rebinP += d.rebinP; totals.rebinT += d.rebinT;
        totals.packM += d.packM; totals.packR += d.packR; totals.packP += d.packP; totals.packT += d.packT;
        totals.shipM += d.shipM; totals.shipR += d.shipR; totals.shipP += d.shipP; totals.shipT += d.shipT;
    });

    html += `
        <tr class="total-row" style="background: linear-gradient(90deg, rgba(56, 189, 248, 0.15) 0%, rgba(56, 189, 248, 0.05) 100%); font-weight: 700; border-top: 2px solid rgba(56, 189, 248, 0.5); border-bottom: 2px solid rgba(56, 189, 248, 0.5);">
            <td style="color: #38bdf8; font-size: 1.05rem; letter-spacing: 0.5px;" onclick="openRankingModal(null, 'Pit', 'Total')">TOTAL</td>
            <td style="color: #f8fafc; font-weight: 700;">${Math.round(totals.fct)}</td>
            <td style="color: #f8fafc; font-weight: 700;">${Math.round(totals.cap)}</td>
            
            <td class="col-group-pick" style="color: #f8fafc; font-weight: 700;" onclick="openRankingModal(null, 'Pit', 'Total')">${Math.round(totals.pickM)}</td>
            <td class="col-group-pick" style="color: #f8fafc; font-weight: 700;" onclick="openRankingModal(null, 'Pit', 'Total')"><span class="val-real">${Math.round(totals.pickR)}</span></td>
            <td class="col-group-pick" style="color: #f8fafc; font-weight: 700;" onclick="openRankingModal(null, 'Pit', 'Total')">${Math.round(totals.pickP)}</td>
            <td class="col-group-pick" style="color: #f8fafc; font-weight: 700;" onclick="openRankingModal(null, 'Pit', 'Total')">${totals.pickT.toFixed(2)}</td>
            
            <td class="col-group-rebin" style="color: #f8fafc; font-weight: 700;" onclick="openRankingModal(null, 'Rebin', 'Total')">${Math.round(totals.rebinM)}</td>
            <td class="col-group-rebin" style="color: #f8fafc; font-weight: 700;" onclick="openRankingModal(null, 'Rebin', 'Total')"><span class="val-real">${Math.round(totals.rebinR)}</span></td>
            <td class="col-group-rebin" style="color: #f8fafc; font-weight: 700;" onclick="openRankingModal(null, 'Rebin', 'Total')">${Math.round(totals.rebinP)}</td>
            <td class="col-group-rebin" style="color: #f8fafc; font-weight: 700;" onclick="openRankingModal(null, 'Rebin', 'Total')">${totals.rebinT.toFixed(2)}</td>
            
            <td class="col-group-pack" style="color: #f8fafc; font-weight: 700;" onclick="openRankingModal(null, 'Packing', 'Total')">${Math.round(totals.packM)}</td>
            <td class="col-group-pack" style="color: #f8fafc; font-weight: 700;" onclick="openRankingModal(null, 'Packing', 'Total')"><span class="val-real">${Math.round(totals.packR)}</span></td>
            <td class="col-group-pack" style="color: #f8fafc; font-weight: 700;" onclick="openRankingModal(null, 'Packing', 'Total')">${Math.round(totals.packP)}</td>
            <td class="col-group-pack" style="color: #f8fafc; font-weight: 700;" onclick="openRankingModal(null, 'Packing', 'Total')">${totals.packT.toFixed(2)}</td>
            
            <td class="col-group-ship" style="color: #f8fafc; font-weight: 700;" onclick="openRankingModal(null, 'ShipDock', 'Total')">${Math.round(totals.shipM)}</td>
            <td class="col-group-ship" style="color: #f8fafc; font-weight: 700;" onclick="openRankingModal(null, 'ShipDock', 'Total')"><span class="val-real">${Math.round(totals.shipR)}</span></td>
            <td class="col-group-ship" style="color: #f8fafc; font-weight: 700;" onclick="openRankingModal(null, 'ShipDock', 'Total')">${Math.round(totals.shipP)}</td>
            <td class="col-group-ship" style="color: #f8fafc; font-weight: 700;" onclick="openRankingModal(null, 'ShipDock', 'Total')">${totals.shipT.toFixed(2)}</td>
        </tr>
    `;

    html += '</tbody>';
    table.innerHTML = html;
}

// Tornar global para os cliques nas tabelas
window.sortTableByColumn = sortTableByColumn;
window.loadProdData = loadProdData;
