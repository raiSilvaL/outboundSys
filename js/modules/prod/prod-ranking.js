/**
 * Módulo de Ranking de Produtividade - Corrigido com filtro estrito e resiliência
 */

const RANKING_APIS = {
    "Pit": "https://script.google.com/macros/s/AKfycbyHb2aTIK2b5-dpLkE0L0am1aCA-B_uIvkEjbz-cHs6DtMnwLBwCi7ZhkIRhLJK4njIzg/exec?aba=Pit",
    "Rebin": "https://script.google.com/macros/s/AKfycbyHb2aTIK2b5-dpLkE0L0am1aCA-B_uIvkEjbz-cHs6DtMnwLBwCi7ZhkIRhLJK4njIzg/exec?aba=Rebin",
    "Packing": "https://script.google.com/macros/s/AKfycbyHb2aTIK2b5-dpLkE0L0am1aCA-B_uIvkEjbz-cHs6DtMnwLBwCi7ZhkIRhLJK4njIzg/exec?aba=Packing",
    "ShipDock": "https://script.google.com/macros/s/AKfycbyHb2aTIK2b5-dpLkE0L0am1aCA-B_uIvkEjbz-cHs6DtMnwLBwCi7ZhkIRhLJK4njIzg/exec?aba=ShipDock"
};

let rankingData = {};
let currentSortColumn = 'UPH';
let currentSortOrder = 'desc';
let currentRankingSetor = null;
let currentRankingHora = null;
let currentRankingTurno = null;

async function loadAllRankings() {
    try {
        for (const [setor, url] of Object.entries(RANKING_APIS)) {
            const response = await fetch(url);
            const data = await response.json();
            rankingData[setor] = data.filter(row => row["Employee Name"] || row["Employee\u00a0Name"] || row["#REF!"]);
        }
        console.log("Dados de ranking carregados:", Object.keys(rankingData));
    } catch (error) {
        console.error("Erro ao carregar dados de ranking:", error);
    }
}

function getTodayDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function normalizeDate(row) {
    const dateVal = row.Data || row.Hora;
    if (dateVal) {
        const d = new Date(dateVal);
        if (!isNaN(d.getTime()) && d.getFullYear() > 1900) {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
    }
    return null;
}

function getHourFromISO(isoString) {
    if (!isoString) return -1;
    try {
        const date = new Date(isoString);
        return isNaN(date.getTime()) ? -1 : date.getHours();
    } catch (e) {
        return -1;
    }
}

function parseVal(val) {
    if (typeof val === 'string' && (val.includes('#DIV/0!') || val.trim() === '')) return 0;
    return parseFloat(val) || 0;
}

function openRankingModal(horaISO, setor, turno) {
    if (!rankingData[setor]) {
        console.warn(`Dados não carregados para ${setor}`);
        return;
    }

    const targetHour = getHourFromISO(horaISO);
    const today = getTodayDate();

    console.log(`Filtrando ranking para Setor: ${setor}, Hora: ${targetHour}, Turno: ${turno}, Data: ${today}`);

    let filteredData = rankingData[setor].filter(row => {
        // 1. Filtro de Data Estrito (Hoje)
        const rowDate = normalizeDate(row);
        
        // Se a linha tem uma data real, filtramos por hoje.
        // Se for 1899 ou nula, assumimos que não é de hoje para o RANKING (ser estrito).
        if (rowDate !== today) return false;

        // 2. Filtro de Turno/Hora
        if (turno === "Total") return true;

        const rowTurno = row.Turno || row[""];
        const turnoMatch = rowTurno && rowTurno.includes(turno.substring(0, 1));

        if (targetHour !== -1) {
            const rowHour = getHourFromISO(row.Hora);
            return rowHour === targetHour && turnoMatch;
        }

        return turnoMatch;
    });

    const uniqueEmployees = {};
    filteredData.forEach(row => {
        const id = row["Employee Id"] || row["Employee\u00a0Id"] || row["Employee Name"] || row["Employee\u00a0Name"] || row["#REF!"];
        if (!uniqueEmployees[id] || parseVal(row.UPH) > parseVal(uniqueEmployees[id].UPH)) {
            uniqueEmployees[id] = row;
        }
    });

    let sortedData = Object.values(uniqueEmployees);
    sortRankingData(sortedData);

    currentRankingSetor = setor;
    currentRankingHora = horaISO;
    currentRankingTurno = turno;

    const horaDisplay = targetHour !== -1 ? targetHour.toString().padStart(2, '0') + ":00" : "Total";
    
    const horaEl = document.getElementById('ranking-hora');
    const turnoEl = document.getElementById('ranking-turno');
    const setorEl = document.getElementById('ranking-setor');
    const titleEl = document.getElementById('ranking-title');

    if (horaEl) horaEl.textContent = horaDisplay;
    if (turnoEl) turnoEl.textContent = turno;
    if (setorEl) setorEl.textContent = setor;
    if (titleEl) titleEl.textContent = `Ranking de Produtividade - ${setor}`;

    renderRankingTable(sortedData.slice(0, 50), setor);

    const modal = document.getElementById('ranking-modal');
    if (modal) modal.classList.add('active');
}

function sortRankingData(data) {
    data.sort((a, b) => {
        let valueA, valueB;
        switch (currentSortColumn) {
            case 'name':
                valueA = (a["Employee Name"] || a["Employee\u00a0Name"] || "").toLowerCase();
                valueB = (b["Employee Name"] || b["Employee\u00a0Name"] || "").toLowerCase();
                break;
            case 'manager':
                valueA = (a["Manager Name"] || a["Manager\u00a0Name"] || "").toLowerCase();
                valueB = (b["Manager Name"] || b["Manager\u00a0Name"] || "").toLowerCase();
                break;
            case 'units':
                valueA = parseVal(a.Units || a.Quantity);
                valueB = parseVal(b.Units || b.Quantity);
                break;
            case 'UPH':
            default:
                valueA = parseVal(a.UPH);
                valueB = parseVal(b.UPH);
        }
        if (currentSortOrder === 'asc') {
            return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
        } else {
            return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
        }
    });
}

function toggleSortColumn(columnKey) {
    if (currentSortColumn === columnKey) {
        currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortColumn = columnKey;
        currentSortOrder = 'desc';
    }
    if (currentRankingSetor) {
        openRankingModal(currentRankingHora, currentRankingSetor, currentRankingTurno);
    }
}

function renderRankingTable(data, setor) {
    const table = document.getElementById('ranking-table-content');
    if (!table) return;

    if (data.length === 0) {
        table.innerHTML = `
            <thead>
                <tr><th>Aviso</th></tr>
            </thead>
            <tbody>
                <tr>
                    <td class="ranking-empty">
                        Nenhum dado encontrado para hoje neste setor.
                    </td>
                </tr>
            </tbody>
        `;
        return;
    }

    const getSortIndicator = (columnKey) => {
        if (currentSortColumn !== columnKey) return '';
        return currentSortOrder === 'asc' ? ' ▲' : ' ▼';
    };

    let html = `
        <thead>
            <tr>
                <th style="width: 60px;">Posição</th>
                <th style="cursor: pointer;" onclick="window.toggleSortColumn('name')">Funcionário${getSortIndicator('name')}</th>
                <th style="cursor: pointer;" onclick="window.toggleSortColumn('manager')">Gerente${getSortIndicator('manager')}</th>
                <th style="width: 100px; text-align: center; cursor: pointer;" onclick="window.toggleSortColumn('units')">Unidades${getSortIndicator('units')}</th>
                <th style="width: 100px; text-align: center; cursor: pointer;" onclick="window.toggleSortColumn('UPH')">UPH${getSortIndicator('UPH')}</th>
            </tr>
        </thead>
        <tbody>
    `;

    data.forEach((row, index) => {
        const position = index + 1;
        let positionClass = 'ranking-position-other';
        let positionSymbol = position + 'º';

        if (position === 1) {
            positionClass = 'ranking-position-1';
            positionSymbol = '🥇 1º';
        } else if (position === 2) {
            positionClass = 'ranking-position-2';
            positionSymbol = '🥈 2º';
        } else if (position === 3) {
            positionClass = 'ranking-position-3';
            positionSymbol = '🥉 3º';
        }

        const employeeName = row["Employee Name"] || row["Employee\u00a0Name"] || row["Employee Id"] || row["Employee\u00a0Id"] || row["#REF!"] || "N/A";
        const managerName = row["Manager Name"] || row["Manager\u00a0Name"] || "N/A";
        const units = Math.round(parseVal(row.Units || row.Quantity));
        const uph = parseVal(row.UPH).toFixed(2);

        html += `
            <tr>
                <td class="ranking-position ${positionClass}">${positionSymbol}</td>
                <td class="ranking-employee-name">${employeeName}</td>
                <td>${managerName}</td>
                <td style="text-align: center;">${units}</td>
                <td style="text-align: center;"><span class="ranking-uph">${uph}</span></td>
            </tr>
        `;
    });

    html += '</tbody>';
    table.innerHTML = html;
}

function closeRankingModal() {
    const modal = document.getElementById('ranking-modal');
    if (modal) modal.classList.remove('active');
    currentSortColumn = 'UPH';
    currentSortOrder = 'desc';
}

window.openRankingModal = openRankingModal;
window.closeRankingModal = closeRankingModal;
window.toggleSortColumn = toggleSortColumn;
