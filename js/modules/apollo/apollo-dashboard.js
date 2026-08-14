/**
 * Módulo de Dashboard de Auditoria Apollo
 */

const API_URL = "https://script.google.com/macros/s/AKfycbzY_J3ODgUI6VTpCgzoBcw-RzImTlxDjzOlgxY5HQ3F4EK8aNQl25K2FqW13LGG-Eb77Q/exec?aba=Query Apollo";
const API_CONFRONTO_URL = "https://script.google.com/macros/s/AKfycbzY_J3ODgUI6VTpCgzoBcw-RzImTlxDjzOlgxY5HQ3F4EK8aNQl25K2FqW13LGG-Eb77Q/exec?aba=Base Outbond Realizado";

let allData = [];
let confrontoData = [];
let filteredData = [];
window.__auditFiltersExplicit = false;
let departmentChart = null;
let typeChart = null;
let currentSlide = 0;
const slidesTitles = ["Visão Geral (Gráfico)", "Tipos de Auditoria", "Últimas Auditorias"];

// Nomes reais das colunas retornadas pela API (aba "Query Apollo")
const FIELD_DATE = 'Created At';
const FIELD_CREATED_BY = 'Created By';
const FIELD_WAREHOUSE = 'Warehouse';
const FIELD_AREA_AUDITORA = 'Selecione A área Auditora:';
const FIELD_ASSOCIATE_LOGIN = 'Associate Login';
const FIELD_TIPO_AUDITORIA = 'Tipo Auditoria';
const FIELD_DEPARTAMENTO = 'Departamento';
const FIELD_FUNCAO = 'Função';
const FIELD_CPF = 'CPF';
const FIELD_NOME = 'Nome';

// Meta de auditorias Apollo por colaborador, por dia
const APOLLO_META_DIARIA = 5;

async function loadDashboardData() {
    const loadingSpinner = document.getElementById('loading-spinner');
    const loadingText = document.getElementById('loading-text');

    if (loadingSpinner) {
        loadingSpinner.style.display = 'flex';
        if (loadingText) loadingText.textContent = "Conectando à API...";
    }

    try {
        // Restaurar conteúdo original caso tenha havido erro anterior
        if (loadingSpinner) {
            loadingSpinner.innerHTML = '<div class="spinner"></div><p id="loading-text">Carregando dados...</p>';
        }
        const currentLoadingText = document.getElementById('loading-text');

        if (currentLoadingText) currentLoadingText.textContent = "Carregando Auditorias...";
        const resQuery = await fetchWithTimeout(API_URL);
        allData = await resQuery.json();

        if (currentLoadingText) currentLoadingText.textContent = "Carregando Base de Confronto...";
        const resConfronto = await fetchWithTimeout(API_CONFRONTO_URL);
        confrontoData = await resConfronto.json();

        // Filtrar para os últimos 7 dias por padrão
        filteredData = filterDataByLast7Days([...allData]);
        
        // Executar atualizações de UI com segurança para garantir que o spinner suma
        try { updateStats(); } catch (err) { console.error("Erro em updateStats:", err); }
        try { updateCharts(); } catch (err) { console.error("Erro em updateCharts:", err); }
        try { updateTable(); } catch (err) { console.error("Erro em updateTable:", err); }
        try { populateFilters(); } catch (err) { console.error("Erro em populateFilters:", err); }
        try { initializeApolloExportButtons(); } catch (err) { console.error("Erro em initializeApolloExportButtons:", err); }

        // Atualiza a aba "Auditorias por Colaborador" mesmo que o usuário já tenha
        // trocado para ela antes deste carregamento assíncrono terminar
        try {
            if (typeof populateCollaboratorOptions === 'function') populateCollaboratorOptions();
            if (typeof updateCollaboratorTable === 'function') updateCollaboratorTable();
            if (typeof updateCollaboratorStats === 'function') updateCollaboratorStats();
        } catch (err) { console.error("Erro ao atualizar aba de colaboradores:", err); }

        if (loadingSpinner) loadingSpinner.style.display = 'none';
    } catch (e) {
        console.error("Erro no carregamento:", e);
        if (loadingSpinner) {
            loadingSpinner.style.display = 'flex';
            loadingSpinner.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <p style="color: #ef4444; margin-bottom: 15px;">Erro ao carregar dados. Verifique a conexão.</p>
                    <button onclick="loadDashboardData()" class="btn-apply" style="cursor: pointer;">Tentar Novamente</button>
                </div>
            `;
        }
    }
}

function updateStats() {
    const totalAuditsEl = document.getElementById('total-audits');
    const totalTypesEl = document.getElementById('total-types');
    const totalDeptsEl = document.getElementById('total-departments');
    const totalAreasEl = document.getElementById('total-areas');

    if (totalAuditsEl) totalAuditsEl.textContent = filteredData.length;

    const types = new Set(filteredData.map(d => d[FIELD_TIPO_AUDITORIA]).filter(Boolean));
    if (totalTypesEl) totalTypesEl.textContent = types.size;

    const depts = new Set(filteredData.map(d => d[FIELD_DEPARTAMENTO]).filter(Boolean));
    if (totalDeptsEl) totalDeptsEl.textContent = depts.size;

    const areas = new Set(filteredData.map(d => d[FIELD_AREA_AUDITORA]).filter(Boolean));
    if (totalAreasEl) totalAreasEl.textContent = areas.size;
}

function updateCharts() {
    updateDepartmentChart();
    updateTypeChart();
}

function updateDepartmentChart() {
    // Garantir que apenas os últimos 7 dias sejam exibidos
    const dataFor7Days = filterDataByLast7Days(filteredData);
    const auditsByDate = {};
    dataFor7Days.forEach(item => {
        const d = parseAnyDate(item[FIELD_DATE]);
        if (d) {
            const key = d.toISOString().split('T')[0];
            auditsByDate[key] = (auditsByDate[key] || 0) + 1;
        }
    });

    const canvas = document.getElementById('departmentChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (departmentChart) departmentChart.destroy();

    const sortedKeys = Object.keys(auditsByDate).sort();
    const displayLabels = sortedKeys.map(key => {
        const [y, m, d] = key.split('-');
        return `${d}/${m}`;
    });

    departmentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: displayLabels,
            datasets: [{
                label: 'Auditorias',
                data: sortedKeys.map(k => auditsByDate[k]),
                borderColor: '#38bdf8',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                fill: true,
                tension: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { labels: { color: '#cbd5e1' } } },
            scales: {
                x: { ticks: { color: '#cbd5e1' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
                y: { ticks: { color: '#cbd5e1' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } }
            }
        }
    });
}

function updateTypeChart() {
    // Garantir que apenas os últimos 7 dias sejam exibidos
    const dataFor7Days = filterDataByLast7Days(filteredData);
    const counts = {};
    dataFor7Days.forEach(item => {
        const tipo = item[FIELD_TIPO_AUDITORIA] || 'Não informado';
        counts[tipo] = (counts[tipo] || 0) + 1;
    });

    const canvas = document.getElementById('scoreChart');
    if (!canvas) return;

    const palette = ['#10b981', '#38bdf8', '#f59e0b', '#ef4444', '#a78bfa', '#f472b6', '#facc15'];
    const ctx = canvas.getContext('2d');
    if (typeChart) typeChart.destroy();
    typeChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(counts),
            datasets: [{
                data: Object.values(counts),
                backgroundColor: Object.keys(counts).map((_, i) => palette[i % palette.length])
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { labels: { color: '#cbd5e1' } } }
        }
    });
}

function updateTable() {
    const tbody = document.getElementById('table-body');
    if (!tbody) return;
    tbody.innerHTML = filteredData.slice(0, 15).map(audit => {
        const d = parseAnyDate(audit[FIELD_DATE]);
        const dataFormatada = d ? d.toLocaleDateString('pt-BR') : (audit[FIELD_DATE] || '-');
        return `
        <tr>
            <td>${audit[FIELD_WAREHOUSE] || '-'}</td>
            <td>${audit[FIELD_DEPARTAMENTO] || '-'}</td>
            <td>${audit[FIELD_NOME] || '-'}</td>
            <td>${audit[FIELD_FUNCAO] || '-'}</td>
            <td>${audit[FIELD_TIPO_AUDITORIA] || '-'}</td>
            <td>${dataFormatada}</td>
        </tr>
    `;
    }).join('');
}

function populateFilters() {
    const deptFilter = document.getElementById('department-filter');
    if (!deptFilter) return;
    const depts = [...new Set(allData.map(d => d[FIELD_DEPARTAMENTO]))].filter(Boolean).sort();
    deptFilter.innerHTML = '<option value="">Todos os Departamentos</option>' +
        depts.map(d => `<option value="${d}">${d}</option>`).join('');

    initializeDashboardFilters();
}

function filterDataByLast7Days(data) {
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    today.setHours(23, 59, 59, 999);

    return data.filter(item => {
        const d = parseAnyDate(item[FIELD_DATE]);
        if (!d) return false;
        return d >= sevenDaysAgo && d <= today;
    });
}

function initializeDashboardFilters() {
    const applyBtn = document.getElementById('apply-filters');
    const resetBtn = document.getElementById('reset-filters');
    const deptFilter = document.getElementById('department-filter');
    const dateStart = document.getElementById('date-start');
    const dateEnd = document.getElementById('date-end');

    if (applyBtn) {
        applyBtn.onclick = () => {
            window.__auditFiltersExplicit = true;
            const dept = deptFilter.value;
            const start = dateStart.value ? new Date(dateStart.value + 'T00:00:00') : null;
            const end = dateEnd.value ? new Date(dateEnd.value + 'T23:59:59') : null;

            filteredData = allData.filter(item => {
                const d = parseAnyDate(item[FIELD_DATE]);
                if (dept && item[FIELD_DEPARTAMENTO] !== dept) return false;
                if (start && d < start) return false;
                if (end && d > end) return false;
                return true;
            });

            updateStats();
            updateCharts();
            updateTable();
        };
    }

    if (resetBtn) {
        resetBtn.onclick = () => {
            window.__auditFiltersExplicit = false;
            deptFilter.value = '';
            dateStart.value = '';
            dateEnd.value = '';
            filteredData = filterDataByLast7Days([...allData]);
            updateStats();
            updateCharts();
            updateTable();
        };
    }
}

function initializeCarousel() {
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');
    const indicators = document.querySelectorAll('.indicator');

    if (prevBtn) prevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        goToSlide(currentSlide - 1);
    });
    if (nextBtn) nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        goToSlide(currentSlide + 1);
    });

    indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', (e) => {
            e.preventDefault();
            goToSlide(index);
        });
    });
}

function goToSlide(slideIndex) {
    const slides = document.querySelectorAll('.carousel-slide');
    const indicators = document.querySelectorAll('.indicator');
    if (slides.length === 0) return;

    if (slideIndex >= slides.length) currentSlide = 0;
    else if (slideIndex < 0) currentSlide = slides.length - 1;
    else currentSlide = slideIndex;

    slides.forEach(slide => slide.classList.remove('active'));
    indicators.forEach(indicator => indicator.classList.remove('active'));

    slides[currentSlide].classList.add('active');
    indicators[currentSlide].classList.add('active');

    const titleElement = document.getElementById('carousel-title');
    if (titleElement) titleElement.textContent = slidesTitles[currentSlide];

    if (currentSlide === 0 && departmentChart) setTimeout(() => departmentChart.resize(), 100);
    else if (currentSlide === 1 && typeChart) setTimeout(() => typeChart.resize(), 100);
}