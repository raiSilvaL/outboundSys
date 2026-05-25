/**
 * Módulo de Dashboard de Auditoria HSE
 */

const API_URL = "https://script.google.com/macros/s/AKfycbzY_J3ODgUI6VTpCgzoBcw-RzImTlxDjzOlgxY5HQ3F4EK8aNQl25K2FqW13LGG-Eb77Q/exec?aba=Query";
const API_CONFRONTO_URL = "https://script.google.com/macros/s/AKfycbzY_J3ODgUI6VTpCgzoBcw-RzImTlxDjzOlgxY5HQ3F4EK8aNQl25K2FqW13LGG-Eb77Q/exec?aba=Base Outbond Realizado";

let allData = [];
let confrontoData = [];
let filteredData = [];
let departmentChart = null;
let scoreChart = null;
let currentSlide = 0;
const slidesTitles = ["Visão Geral (Gráfico)", "Score das Auditorias", "Últimas Auditorias"];

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

        filteredData = [...allData];
        
        // Executar atualizações de UI com segurança para garantir que o spinner suma
        try { updateStats(); } catch (err) { console.error("Erro em updateStats:", err); }
        try { updateCharts(); } catch (err) { console.error("Erro em updateCharts:", err); }
        try { updateTable(); } catch (err) { console.error("Erro em updateTable:", err); }
        try { populateFilters(); } catch (err) { console.error("Erro em populateFilters:", err); }

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
    const avgScoreEl = document.getElementById('avg-score');
    const totalDeptsEl = document.getElementById('total-departments');
    const conformitiesEl = document.getElementById('conformities');

    if (totalAuditsEl) totalAuditsEl.textContent = filteredData.length;

    const totalScore = filteredData.reduce((acc, curr) => {
        const scoreStr = (curr.Score || "0").toString();
        const val = parseFloat(scoreStr.replace('%', '')) || 0;
        return acc + val;
    }, 0);
    const avg = filteredData.length > 0 ? (totalScore / filteredData.length).toFixed(1) : 0;
    if (avgScoreEl) avgScoreEl.textContent = avg + '%';

    const depts = new Set(filteredData.map(d => d.Departamento).filter(Boolean));
    if (totalDeptsEl) totalDeptsEl.textContent = depts.size;

    const conf = filteredData.reduce((acc, curr) => acc + (parseInt(curr.Conformidades) || 0), 0);
    if (conformitiesEl) conformitiesEl.textContent = conf;
}

function updateCharts() {
    updateDepartmentChart();
    updateScoreChart();
}

function updateDepartmentChart() {
    const auditsByDate = {};
    filteredData.forEach(item => {
        const d = parseAnyDate(item.Data);
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

function updateScoreChart() {
    const ranges = { '90-100%': 0, '70-89%': 0, '50-69%': 0, '< 50%': 0 };
    filteredData.forEach(item => {
        const scoreStr = (item.Score || "0").toString();
        const score = parseFloat(scoreStr.replace('%', '')) || 0;
        if (score >= 90) ranges['90-100%']++;
        else if (score >= 70) ranges['70-89%']++;
        else if (score >= 50) ranges['50-69%']++;
        else ranges['< 50%']++;
    });

    const canvas = document.getElementById('scoreChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (scoreChart) scoreChart.destroy();
    scoreChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(ranges),
            datasets: [{
                data: Object.values(ranges),
                backgroundColor: ['#10b981', '#38bdf8', '#f59e0b', '#ef4444']
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
    tbody.innerHTML = filteredData.slice(0, 15).map(audit => `
        <tr>
            <td>${audit.Departamento}</td>
            <td>${audit.Usuário}</td>
            <td>${audit.Formulário}</td>
            <td><span class="score-badge" style="background:${getScoreColor(audit.Score)}">${audit.Score}</span></td>
            <td>${audit.Conformidades}</td>
            <td>${audit['Não Conformidades']}</td>
        </tr>
    `).join('');
}

function populateFilters() {
    const deptFilter = document.getElementById('department-filter');
    if (!deptFilter) return;
    const depts = [...new Set(allData.map(d => d.Departamento))].sort();
    deptFilter.innerHTML = '<option value="">Todos os Departamentos</option>' +
        depts.map(d => `<option value="${d}">${d}</option>`).join('');

    initializeDashboardFilters();
}

function initializeDashboardFilters() {
    const applyBtn = document.getElementById('apply-filters');
    const resetBtn = document.getElementById('reset-filters');
    const deptFilter = document.getElementById('department-filter');
    const dateStart = document.getElementById('date-start');
    const dateEnd = document.getElementById('date-end');

    if (applyBtn) {
        applyBtn.onclick = () => {
            const dept = deptFilter.value;
            const start = dateStart.value ? new Date(dateStart.value + 'T00:00:00') : null;
            const end = dateEnd.value ? new Date(dateEnd.value + 'T23:59:59') : null;

            filteredData = allData.filter(item => {
                const d = parseAnyDate(item.Data);
                if (dept && item.Departamento !== dept) return false;
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
            deptFilter.value = '';
            dateStart.value = '';
            dateEnd.value = '';
            filteredData = [...allData];
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
    else if (currentSlide === 1 && scoreChart) setTimeout(() => scoreChart.resize(), 100);
}