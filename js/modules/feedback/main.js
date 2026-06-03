/**
 * Módulo de Feedback de Faltas
 * Responsável pela gestão da interface e integração com a API de Registro de Faltas
 */

// Nova URL da API com suporte a CRUD
const API_BASE_URL = "https://script.google.com/macros/s/AKfycbxOsYW5VrGoIgd4h5pP8M2oRQkyTYLfF-TjCGEO6krsH3bHDcqCEPu29W1n-Bh7B7u9lg/exec";
const API_URL = `${API_BASE_URL}?aba=Registro%20de%20Faltas`;

// Estado global
let allFeedbackData = [];
let filteredFeedbackData = [];
let feedbackFilters = {
    nome: '',
    cpf: '',
    setor: new Set(),
    departamento: new Set(),
    empregador: new Set(),
    turno: new Set(),
    motivo: new Set(),
    status: new Set()
};

let feedbackPeriodFilters = {
    startDate: null,
    endDate: null
};

// Variáveis para o carrossel
let feedbackChart = null;
let motivosChart = null;
let currentCarouselSlide = 0;
const carouselSlides = [
    'Análise de Faltas (Justificadas vs. Pendentes)',
    'Distribuição de Motivos',
    'Registros de Faltas (Tabela)'
];

window.addEventListener('introFinished', () => {
    const mainContent = document.getElementById('main-content');
    if (mainContent) mainContent.classList.remove('hidden');

    updateDateTime();
    setInterval(updateDateTime, 1000);

    initializeSidebar();
    // initializeMenus(); // Removido se não houver submenus específicos

    initializeScreens((screenName) => {
        console.log('Mudou para tela:', screenName);
    });

    loadFeedbackData();
    setupEventListeners();
    setupCarouselControls();
});

// Fallback para garantir que o conteúdo apareça
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const mainContent = document.getElementById('main-content');
        if (mainContent && mainContent.classList.contains('hidden')) {
            window.dispatchEvent(new CustomEvent('introFinished'));
        }
    }, 5000);
});

async function loadFeedbackData() {
    const tableBody = document.getElementById('feedback-table-body');
    const spinner = document.getElementById('loading-spinner');
    if (!tableBody) return;

    // Mostrar spinner (se existir)
    if (spinner) spinner.style.display = 'flex';

    try {
        const response = await fetch(API_URL);
        const data = await response.json();

        // Filtrar apenas departamentos específicos e normalizar dados
        const departamentosPermitidos = ['OUTBOUND', 'TRANSFER OUT', 'TRANSPORTE'];
        allFeedbackData = data.filter(item => {
            const departamento = (item["DEPARTAMENTO"] || item["Departamento"] || '').toString().trim().toUpperCase();
            return departamentosPermitidos.includes(departamento);
        }).map(item => {
            const normalizedItem = {
                dataFalta: item["DATA DA FALTA"] || item["Data da Falta"] || '',
                nome: (item["NOME"] || item["Nome"] || '').toString().trim(),
                cpf: (item["CPF"] || '').toString().trim(),
                setor: (item["SETOR"] || item["Setor"] || '').toString().trim(),
                departamento: (item["DEPARTAMENTO"] || item["Departamento"] || '').toString().trim(),
                empregador: (item["EMPREGADOR"] || item["Empregador"] || '').toString().trim(),
                turno: (item["TURNO"] || item["Turno"] || '').toString().trim(),
                coordenador: (item["COORDENADOR"] || item["Coordenador"] || '').toString().trim(),
                motivo: (item["Motivo da falta"] || item["MOTIVO DA FALTA"] || item["Motivo"] || '').toString().trim(),
                dataFeedback: item["Data do feedback"] || item["DATA DO FEEDBACK"] || '',
                statusOriginal: (item["Status"] || '').toString().trim(),
                observacao: (item["Observação"] || item["Observacao"] || '').toString().trim(),
            };

            const hasFeedbackDate = normalizedItem.dataFeedback && normalizedItem.dataFeedback !== "" && normalizedItem.dataFeedback !== "-";
            normalizedItem.statusCalculado = hasFeedbackDate ? 'Concluído' : 'Pendente';

            return normalizedItem;
        });

        filteredFeedbackData = allFeedbackData;
        renderFeedbackTable(filteredFeedbackData);
        updateStats(filteredFeedbackData);
        renderFeedbackChart(filteredFeedbackData);
        renderMotivosChart(filteredFeedbackData);

        populateAllMultiSelects(allFeedbackData);
        initializeHeaderFilters();

        if (spinner) spinner.style.display = 'none';

    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="12" style="text-align: center; color: #ef4444;">Erro ao carregar dados. Verifique a conexão.</td></tr>';
        }
        if (spinner) spinner.style.display = 'none';
    }
}

function renderFeedbackTable(data) {
    const tableBody = document.getElementById('feedback-table-body');
    if (!tableBody) return;

    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="12" style="text-align: center;">Nenhum registro encontrado.</td></tr>';
        return;
    }

    tableBody.innerHTML = data.map((item, index) => {
        const dataFaltaStr = item.dataFalta ? new Date(item.dataFalta).toLocaleDateString('pt-BR') : '-';
        const dataFeedbackStr = item.dataFeedback ? new Date(item.dataFeedback).toLocaleDateString('pt-BR') : '-';
        const statusClass = item.statusCalculado === 'Concluído' ? 'status-completed' : 'status-pending';

        return `
            <tr>
                <td>${dataFaltaStr}</td>
                <td>
                    <button class="btn-action-feedback" onclick="openFeedbackModal(${index})">
                        <i class="fas fa-edit"></i> Feedback
                    </button>
                </td>
                <td>${item.nome || '-'}</td>
                <td>${item.cpf || '-'}</td>
                <td>${item.setor || '-'}</td>
                <td>${item.departamento || '-'}</td>
                <td>${item.empregador || '-'}</td>
                <td>${item.turno || '-'}</td>
                <td>${dataFeedbackStr}</td>
                <td>${item.motivo || '-'}</td>
                <td>${item.observacao || '-'}</td>
                <td><span class="status-badge ${statusClass}">${item.statusCalculado}</span></td>
            </tr>
        `;
    }).join('');
}

// Funções do Modal
window.openFeedbackModal = function(index) {
    const item = filteredFeedbackData[index];
    if (!item) return;

    document.getElementById('modal-nome').value = item.nome;
    document.getElementById('modal-cpf').value = item.cpf;
    
    // Formatar data para exibição amigável
    const dataFalta = item.dataFalta ? new Date(item.dataFalta).toLocaleDateString('pt-BR') : '';
    document.getElementById('modal-data-falta').value = dataFalta;
    
    document.getElementById('modal-motivo').value = item.motivo || '';
    document.getElementById('modal-observacao').value = item.observacao || '';

    document.getElementById('feedback-modal').classList.add('active');
};

function closeFeedbackModal() {
    document.getElementById('feedback-modal').classList.remove('active');
    document.getElementById('feedback-form-native').reset();
    
    // Resetar container de "Outros"
    const outroMotivoContainer = document.getElementById('outro-motivo-container');
    if (outroMotivoContainer) outroMotivoContainer.style.display = 'none';
}

async function handleFeedbackSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submit-feedback-btn');
    const originalText = submitBtn.innerHTML;
    
    const cpf = document.getElementById('modal-cpf').value;
    const dataFalta = document.getElementById('modal-data-falta').value;
    let motivo = document.getElementById('modal-motivo').value;
    const outroMotivo = document.getElementById('modal-outro-motivo').value;
    
    if (motivo === 'Outros' && outroMotivo) {
        motivo = `Outros: ${outroMotivo}`;
    }

    const observacao = document.getElementById('modal-observacao').value;
    const dataFeedback = new Date().toLocaleDateString('pt-BR');

    // Desabilitar botão e mostrar loading
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

    try {
        const payload = {
            cpf: cpf,
            dataFalta: dataFalta,
            motivo: motivo,
            observacao: observacao,
            dataFeedback: dataFeedback
        };

        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            mode: 'no-cors',
            cache: 'no-cache',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        closeFeedbackModal();
        
        // Mostrar overlay de atualização
        const updateOverlay = document.getElementById('update-overlay');
        if (updateOverlay) updateOverlay.style.display = 'flex';
        
        // Recarregar dados após um pequeno delay para o Apps Script processar
        setTimeout(async () => {
            await loadFeedbackData();
            if (updateOverlay) updateOverlay.style.display = 'none';
            alert('Feedback enviado e dados atualizados com sucesso!');
        }, 3000);

    } catch (error) {
        console.error('Erro ao enviar feedback:', error);
        alert('Erro ao enviar feedback. Tente novamente.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

function updateStats(data) {
    const totalFaltas = data.length;
    const feedbacksPendentes = data.filter(item => item.statusCalculado === 'Pendente').length;
    const feedbacksConcluidos = data.filter(item => item.statusCalculado === 'Concluído').length;

    const totalEl = document.getElementById('total-faltas');
    const pendentesEl = document.getElementById('feedbacks-pendentes');
    const concluidosEl = document.getElementById('feedbacks-concluidos');

    if (totalEl) totalEl.textContent = totalFaltas;
    if (pendentesEl) pendentesEl.textContent = feedbacksPendentes;
    if (concluidosEl) concluidosEl.textContent = feedbacksConcluidos;
}

function setupEventListeners() {
    // Modal events
    document.getElementById('close-modal-btn').onclick = closeFeedbackModal;
    document.getElementById('cancel-modal-btn').onclick = closeFeedbackModal;
    document.getElementById('feedback-form-native').onsubmit = handleFeedbackSubmit;

    // Lógica para o campo "Outros" no motivo
    const motivoSelect = document.getElementById('modal-motivo');
    const outroMotivoContainer = document.getElementById('outro-motivo-container');
    const outroMotivoInput = document.getElementById('modal-outro-motivo');

    if (motivoSelect && outroMotivoContainer) {
        motivoSelect.addEventListener('change', (e) => {
            if (e.target.value === 'Outros') {
                outroMotivoContainer.style.display = 'block';
                outroMotivoInput.required = true;
            } else {
                outroMotivoContainer.style.display = 'none';
                outroMotivoInput.required = false;
            }
        });
    }

    // Fechar modal ao clicar fora
    window.onclick = (event) => {
        const modal = document.getElementById('feedback-modal');
        if (event.target == modal) closeFeedbackModal();
    };

    // Filtros de período
    const applyBtn = document.getElementById('apply-feedback-filters');
    if (applyBtn) {
        applyBtn.onclick = () => {
            const start = document.getElementById('feedback-date-start').value;
            const end = document.getElementById('feedback-date-end').value;
            feedbackPeriodFilters.startDate = start ? new Date(start + 'T00:00:00') : null;
            feedbackPeriodFilters.endDate = end ? new Date(end + 'T23:59:59') : null;
            applyFilters();
        };
    }

    const resetBtn = document.getElementById('reset-feedback-filters');
    if (resetBtn) {
        resetBtn.onclick = () => {
            document.getElementById('feedback-date-start').value = '';
            document.getElementById('feedback-date-end').value = '';
            feedbackPeriodFilters = { startDate: null, endDate: null };
            applyFilters();
        };
    }
}

function applyFilters() {
    filteredFeedbackData = allFeedbackData.filter(item => {
        const nomeMatch = item.nome.toLowerCase().includes(feedbackFilters.nome.toLowerCase());
        const cpfMatch = item.cpf.includes(feedbackFilters.cpf);
        
        const setorMatch = feedbackFilters.setor.size === 0 || feedbackFilters.setor.has(item.setor);
        const deptoMatch = feedbackFilters.departamento.size === 0 || feedbackFilters.departamento.has(item.departamento);
        const empMatch = feedbackFilters.empregador.size === 0 || feedbackFilters.empregador.has(item.empregador);
        const turnoMatch = feedbackFilters.turno.size === 0 || feedbackFilters.turno.has(item.turno);
        const motivoMatch = feedbackFilters.motivo.size === 0 || feedbackFilters.motivo.has(item.motivo);
        const statusMatch = feedbackFilters.status.size === 0 || feedbackFilters.status.has(item.statusCalculado);

        let periodMatch = true;
        if (feedbackPeriodFilters.startDate || feedbackPeriodFilters.endDate) {
            const itemDate = new Date(item.dataFalta);
            if (feedbackPeriodFilters.startDate && itemDate < feedbackPeriodFilters.startDate) periodMatch = false;
            if (feedbackPeriodFilters.endDate && itemDate > feedbackPeriodFilters.endDate) periodMatch = false;
        }

        return nomeMatch && cpfMatch && setorMatch && deptoMatch && empMatch && turnoMatch && motivoMatch && statusMatch && periodMatch;
    });

    renderFeedbackTable(filteredFeedbackData);
    updateStats(filteredFeedbackData);
    renderFeedbackChart(filteredFeedbackData);
    renderMotivosChart(filteredFeedbackData);
}

function updateDateTime() {
    const dateEl = document.getElementById('current-date');
    const timeEl = document.getElementById('current-time');

    if (dateEl) dateEl.textContent = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    if (timeEl) timeEl.textContent = new Date().toLocaleTimeString('pt-BR');
}

function initializeHeaderFilters() {
    // Filtros de texto (Nome e CPF)
    const textFilters = document.querySelectorAll('.col-excel-filter-text');
    textFilters.forEach(input => {
        const column = input.dataset.column;
        input.addEventListener('input', (e) => {
            feedbackFilters[column] = e.target.value;
            applyFilters();
        });
    });

    // Filtros Multi-select
    ['setor', 'departamento', 'empregador', 'turno', 'motivo', 'status'].forEach(col => {
        initMultiSelect(col);
    });
}

function initMultiSelect(column) {
    const wrapper = document.querySelector(`.multi-select-wrapper[data-column="${column}"]`);
    if (!wrapper) return;

    const btn = wrapper.querySelector('.multi-select-btn');
    const dropdown = wrapper.querySelector('.multi-select-dropdown');
    const searchInput = wrapper.querySelector('.multi-select-search');
    const clearBtn = wrapper.querySelector('.multi-select-clear');

    // Prevenir envio de formulário se o botão for clicado (embora esteja em uma tabela)
    btn.type = 'button';

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dropdown.classList.contains('open');
        document.querySelectorAll('.multi-select-dropdown.open').forEach(d => {
            if (d !== dropdown) {
                d.classList.remove('open');
                const otherBtn = d.closest('.multi-select-wrapper').querySelector('.multi-select-btn');
                if (otherBtn) otherBtn.classList.remove('open');
            }
        });

        if (!isOpen) {
            dropdown.classList.add('open');
            btn.classList.add('open');
            if (searchInput) searchInput.focus();
        } else {
            dropdown.classList.remove('open');
            btn.classList.remove('open');
        }
    });

    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            dropdown.classList.remove('open');
            btn.classList.remove('open');
        }
    });

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            wrapper.querySelectorAll('.multi-select-option').forEach(opt => {
                const text = opt.textContent.toLowerCase();
                opt.classList.toggle('hidden', !text.includes(q));
            });
        });
    }

    const optionsContainer = wrapper.querySelector('.multi-select-options');
    optionsContainer.addEventListener('change', (e) => {
        if (e.target.type === 'checkbox') {
            const val = e.target.value;
            if (e.target.checked) feedbackFilters[column].add(val);
            else feedbackFilters[column].delete(val);
            updateMultiSelectLabel(column);
            applyFilters();
        }
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            feedbackFilters[column].clear();
            wrapper.querySelectorAll('.multi-select-option input[type="checkbox"]').forEach(cb => cb.checked = false);
            updateMultiSelectLabel(column);
            applyFilters();
        });
    }
}

function updateMultiSelectLabel(column) {
    const wrapper = document.querySelector(`.multi-select-wrapper[data-column="${column}"]`);
    if (!wrapper) return;
    const labelEl = wrapper.querySelector('.multi-select-label');
    const selected = feedbackFilters[column];
    const oldBadge = wrapper.querySelector('.multi-select-count');
    if (oldBadge) oldBadge.remove();

    if (selected.size === 0) labelEl.textContent = '(Tudo)';
    else if (selected.size === 1) labelEl.textContent = [...selected][0];
    else labelEl.textContent = `${selected.size} selecionados`;

    if (selected.size > 0) {
        const badge = document.createElement('span');
        badge.className = 'multi-select-count';
        badge.textContent = selected.size;
        const btn = wrapper.querySelector('.multi-select-btn');
        btn.insertBefore(badge, btn.querySelector('.multi-select-arrow'));
    }
}

function populateAllMultiSelects(data) {
    const columns = {
        setor: new Set(),
        departamento: new Set(),
        empregador: new Set(),
        turno: new Set(),
        motivo: new Set(),
        status: new Set()
    };

    data.forEach(item => {
        if (item.setor) columns.setor.add(item.setor);
        if (item.departamento) columns.departamento.add(item.departamento);
        if (item.empregador) columns.empregador.add(item.empregador);
        if (item.turno) columns.turno.add(item.turno);
        if (item.motivo) columns.motivo.add(item.motivo);
        if (item.statusCalculado) columns.status.add(item.statusCalculado);
    });

    Object.entries(columns).forEach(([col, values]) => {
        populateMultiSelectOptions(col, values);
    });
}

function populateMultiSelectOptions(column, values) {
    const wrapper = document.querySelector(`.multi-select-wrapper[data-column="${column}"]`);
    if (!wrapper) return;
    const optionsContainer = wrapper.querySelector('.multi-select-options');
    if (!optionsContainer) return;
    
    // Limpar opções anteriores se necessário (opcional, dependendo se quer atualizar dinamicamente)
    optionsContainer.innerHTML = '';
    
    [...values].sort().forEach(v => {
        if (!v || v === '-') return;
        const label = document.createElement('label');
        label.className = 'multi-select-option';
        const isChecked = feedbackFilters[column].has(v);
        label.innerHTML = `
            <input type="checkbox" value="${v}" ${isChecked ? 'checked' : ''}>
            <span>${v}</span>
        `;
        optionsContainer.appendChild(label);
    });
}

function setupCarouselControls() {
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            currentCarouselSlide = (currentCarouselSlide - 1 + carouselSlides.length) % carouselSlides.length;
            updateCarouselView();
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            currentCarouselSlide = (currentCarouselSlide + 1) % carouselSlides.length;
            updateCarouselView();
        });
    }
}

function updateCarouselView() {
    const titleEl = document.getElementById('carousel-title');
    if (titleEl) titleEl.textContent = carouselSlides[currentCarouselSlide];

    for (let i = 0; i < carouselSlides.length; i++) {
        const slide = document.getElementById(`carousel-slide-${i}`);
        if (slide) {
            if (i === currentCarouselSlide) {
                slide.style.display = 'block';
                slide.classList.add('active');
            } else {
                slide.style.display = 'none';
                slide.classList.remove('active');
            }
        }
    }
}

function renderFeedbackChart(data) {
    const ctx = document.getElementById('feedbackChart');
    if (!ctx) return;

    const dataByDate = {};
    data.forEach(item => {
        const date = item.dataFalta ? new Date(item.dataFalta).toLocaleDateString('pt-BR') : 'N/A';
        if (!dataByDate[date]) {
            dataByDate[date] = { justificadas: 0, pendentes: 0 };
        }
        if (item.statusCalculado === 'Concluído') {
            dataByDate[date].justificadas++;
        } else {
            dataByDate[date].pendentes++;
        }
    });

    const sortedDates = Object.keys(dataByDate).sort((a, b) => {
        const [diaA, mesA, anoA] = a.split('/');
        const [diaB, mesB, anoB] = b.split('/');
        return new Date(anoA, mesA - 1, diaA) - new Date(anoB, mesB - 1, diaB);
    });

    const justificadas = sortedDates.map(date => dataByDate[date].justificadas);
    const pendentes = sortedDates.map(date => dataByDate[date].pendentes);

    if (feedbackChart) feedbackChart.destroy();

    feedbackChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedDates,
            datasets: [{
                    label: 'Justificadas',
                    data: justificadas,
                    backgroundColor: 'rgba(34, 197, 94, 0.7)',
                    borderColor: '#22c55e',
                    borderWidth: 1
                },
                {
                    label: 'Pendentes',
                    data: pendentes,
                    backgroundColor: 'rgba(239, 68, 68, 0.7)',
                    borderColor: '#ef4444',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#94a3b8' },
                    grid: { color: 'rgba(148, 163, 184, 0.1)' }
                },
                x: {
                    ticks: { color: '#94a3b8' },
                    grid: { display: false }
                }
            },
            plugins: {
                legend: {
                    labels: { color: '#e0e7ff' }
                }
            }
        }
    });
}

function renderMotivosChart(data) {
    const ctx = document.getElementById('motivosChart');
    if (!ctx) return;

    const motivosCont = {};
    data.forEach(item => {
        const motivo = item.motivo || "Sem informação";
        motivosCont[motivo] = (motivosCont[motivo] || 0) + 1;
    });

    const motivosOrdenados = Object.entries(motivosCont)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const labels = motivosOrdenados.map(item => item[0]);
    const counts = motivosOrdenados.map(item => item[1]);

    const colors = [
        'rgba(59, 130, 246, 0.8)',
        'rgba(34, 197, 94, 0.8)',
        'rgba(168, 85, 247, 0.8)',
        'rgba(249, 115, 22, 0.8)',
        'rgba(236, 72, 153, 0.8)',
        'rgba(14, 165, 233, 0.8)'
    ];

    if (motivosChart) motivosChart.destroy();

    motivosChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Quantidade de Faltas',
                data: counts,
                backgroundColor: colors.slice(0, labels.length),
                borderColor: colors.slice(0, labels.length).map(c => c.replace('0.8', '1')),
                borderWidth: 2,
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: { color: '#e0e7ff' }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { color: '#94a3b8' },
                    grid: { color: 'rgba(56, 189, 248, 0.1)' }
                },
                y: {
                    ticks: { color: '#94a3b8' },
                    grid: { display: false }
                }
            }
        }
    });
}
