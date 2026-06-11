/**
 * Módulo de Feedback de Faltas (Versão 2)
 * Responsável pela gestão da interface e integração com a API de Registro de Faltas
 * 
 * Mudanças v2:
 * - Adicionado select com motivos específicos
 * - Campo "Outros" que exibe textarea quando selecionado
 * - Removido campo de observações adicionais
 * - Corrigida integração com API do Google Script
 */

const API_URL = "https://script.google.com/macros/s/AKfycby3Jm4vjjg-ArnnbwQui_LiBOH-nqiATyL47X-xel5PR4JJBHrpKj9sCoCQl3UsR9AQnQ/exec?aba=Registro%20de%20Faltas";
const FEEDBACK_API_URL = "https://script.google.com/macros/s/AKfycbwM6ACMtZUfydVGaUHVrMqXD4OogSFt4YF6pUrnYfpu5yxZOwBtVZyHK2vZUf3QJX9rJQ/exec";

// Estado global
let allFeedbackData = [];
let filteredFeedbackData = [];
let currentFeedbackItem = null; // Armazena o item de feedback sendo editado
let feedbackFilters = {
    nome: '',
    cpf: '',
    setor: new Set(),
    departamento: new Set(),
    empregador: new Set(),
    turno: new Set(),
    coordenador: new Set(),
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
    initializeMenus();

    initializeScreens((screenName) => {
        console.log('Mudou para tela:', screenName);
    });

    loadFeedbackData();
    setupEventListeners();
    initializeExportButtons();
    setupCarouselControls();
    setupFeedbackFormListener();
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

    // Mostrar spinner
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
            // Normalização das chaves para evitar erros de case-sensitive ou espaços
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
                observacao: (item["AB"] || item["Observacao"] || item["Observação"] || '').toString().trim(),
                quemRespondeu: (item["AC"] || item["Quem respondeu"] || item["Quem Respondeu"] || '').toString().trim()
            };

            // Calcular status
            const hasFeedbackDate = normalizedItem.dataFeedback && normalizedItem.dataFeedback !== "" && normalizedItem.dataFeedback !== "-";
            normalizedItem.statusCalculado = hasFeedbackDate ? 'Concluído' : 'Pendente';

            return normalizedItem;
        });

        filteredFeedbackData = allFeedbackData;
        renderFeedbackTable(filteredFeedbackData);
        updateStats(filteredFeedbackData);
        renderFeedbackChart(filteredFeedbackData);
        renderMotivosChart(filteredFeedbackData);

        // Inicializar filtros após carregar dados
        initializeHeaderFilters();

        // Ocultar spinner
        if (spinner) spinner.style.display = 'none';

    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="14" style="text-align: center; color: #ef4444;">Erro ao carregar dados. Verifique a conexão.</td></tr>';
        }
        // Ocultar spinner em caso de erro
        if (spinner) spinner.style.display = 'none';
    }
}

function renderFeedbackTable(data) {
    const tableBody = document.getElementById('feedback-table-body');
    if (!tableBody) return;

    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="14" style="text-align: center;">Nenhum registro encontrado.</td></tr>';
        return;
    }

    tableBody.innerHTML = data.map((item, index) => {
        const dataFaltaStr = item.dataFalta ? new Date(item.dataFalta).toLocaleDateString('pt-BR') : '-';
        const dataFeedbackStr = item.dataFeedback ? new Date(item.dataFeedback).toLocaleDateString('pt-BR') : '-';
        const statusClass = item.statusCalculado === 'Concluído' ? 'status-completed' : 'status-pending';
        const isCompleted = item.statusCalculado === 'Concluído';
        const buttonText = isCompleted ? 'Visualizar' : 'Responder';
        const buttonClass = isCompleted ? 'action-button completed' : 'action-button';

        return `
            <tr>
                <td>${dataFaltaStr}</td>
                <td>${item.nome || '-'}</td>
                <td>${item.cpf || '-'}</td>
                <td>${item.setor || '-'}</td>
                <td>${item.departamento || '-'}</td>
                <td>${item.empregador || '-'}</td>
                <td>${item.turno || '-'}</td>
                <td>${item.coordenador || '-'}</td>
                <td>${dataFeedbackStr}</td>
                <td>${item.motivo || '-'}</td>
                <td>${item.observacao || '-'}</td>
                <td><span class="status-badge ${statusClass}">${item.statusCalculado}</span></td>
                <td>
                    <button class="${buttonClass}" onclick="openFeedbackModalWithData(${index})" title="${buttonText}">
                        <i class="fas fa-${isCompleted ? 'eye' : 'edit'}"></i> ${buttonText}
                    </button>
                </td>
            </tr>
        `;
    }).join('');
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
        // Filtros de texto
        const nomeMatch = item.nome.toLowerCase().includes(feedbackFilters.nome.toLowerCase());
        const cpfMatch = item.cpf.includes(feedbackFilters.cpf);

        // Filtros de múltipla seleção
        const setorMatch = feedbackFilters.setor.size === 0 || feedbackFilters.setor.has(item.setor);
        const departamentoMatch = feedbackFilters.departamento.size === 0 || feedbackFilters.departamento.has(item.departamento);
        const empregadorMatch = feedbackFilters.empregador.size === 0 || feedbackFilters.empregador.has(item.empregador);
        const turnoMatch = feedbackFilters.turno.size === 0 || feedbackFilters.turno.has(item.turno);
        const coordenadorMatch = feedbackFilters.coordenador.size === 0 || feedbackFilters.coordenador.has(item.coordenador);
        const motivoMatch = feedbackFilters.motivo.size === 0 || feedbackFilters.motivo.has(item.motivo);
        const statusMatch = feedbackFilters.status.size === 0 || feedbackFilters.status.has(item.statusCalculado);

        // Filtro de período
        let periodMatch = true;
        if (feedbackPeriodFilters.startDate || feedbackPeriodFilters.endDate) {
            const itemDate = new Date(item.dataFalta);
            if (feedbackPeriodFilters.startDate && itemDate < feedbackPeriodFilters.startDate) periodMatch = false;
            if (feedbackPeriodFilters.endDate && itemDate > feedbackPeriodFilters.endDate) periodMatch = false;
        }

        return nomeMatch && cpfMatch && setorMatch && departamentoMatch && empregadorMatch && turnoMatch && coordenadorMatch && motivoMatch && statusMatch && periodMatch;
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
    const textFilters = document.querySelectorAll('.col-excel-filter-text');
    textFilters.forEach(input => {
        const column = input.dataset.column;
        input.addEventListener('input', (e) => {
            feedbackFilters[column] = e.target.value;
            applyFilters();
        });
    });

    // Inicializar multiselects
    const columns = ['setor', 'departamento', 'empregador', 'turno', 'coordenador', 'motivo', 'status'];
    columns.forEach(col => {
        initMultiSelect(col);

        // Popular opções a partir dos dados normalizados
        const values = new Set(allFeedbackData.map(item => {
            if (col === 'status') return item.statusCalculado;
            return item[col];
        }));

        populateMultiSelectOptions(col, values);
    });
}

function initMultiSelect(column) {
    const wrapper = document.querySelector(`.multi-select-wrapper[data-column="${column}"]`);
    if (!wrapper) return;

    const btn = wrapper.querySelector('.multi-select-btn');
    const dropdown = wrapper.querySelector('.multi-select-dropdown');
    const searchInput = wrapper.querySelector('.multi-select-search');
    const clearBtn = wrapper.querySelector('.multi-select-clear');

    // Remover listeners antigos se houver (para evitar duplicidade ao recarregar)
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    newBtn.addEventListener('click', (e) => {
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
            newBtn.classList.add('open');
            if (searchInput) {
                searchInput.value = '';
                wrapper.querySelectorAll('.multi-select-option').forEach(opt => opt.classList.remove('hidden'));
                searchInput.focus();
            }
        } else {
            dropdown.classList.remove('open');
            newBtn.classList.remove('open');
        }
    });

    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            dropdown.classList.remove('open');
            newBtn.classList.remove('open');
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
    else labelEl.textContent = `(${selected.size})`;

    if (selected.size > 0) {
        const badge = document.createElement('span');
        badge.className = 'multi-select-count';
        badge.textContent = selected.size;
        const btn = wrapper.querySelector('.multi-select-btn');
        btn.insertBefore(badge, btn.querySelector('.multi-select-arrow'));
    }
}

function populateMultiSelectOptions(column, values) {
    const wrapper = document.querySelector(`.multi-select-wrapper[data-column="${column}"]`);
    if (!wrapper) return;
    const optionsContainer = wrapper.querySelector('.multi-select-options');
    if (!optionsContainer) return;

    optionsContainer.innerHTML = [...values].filter(v => v && v !== '-' && v !== '').sort().map(v => `
        <label class="multi-select-option">
            <input type="checkbox" value="${v}" ${feedbackFilters[column].has(v) ? 'checked' : ''}>
            <span>${v}</span>
        </label>
    `).join('');
}

function initializeExportButtons() {
    const excelBtn = document.getElementById('export-excel-btn');
    const csvBtn = document.getElementById('export-csv-btn');

    if (excelBtn) excelBtn.addEventListener('click', exportTableToExcel);
    if (csvBtn) csvBtn.addEventListener('click', exportTableToCSV);
}

function getTableDataForExport() {
    const tableBody = document.getElementById('feedback-table-body');
    if (!tableBody) return [];

    const data = [];
    const rows = tableBody.querySelectorAll('tr');
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const rowData = [];
        // Excluir a última coluna (Ação)
        for (let i = 0; i < cells.length - 1; i++) {
            rowData.push(cells[i].textContent.trim());
        }
        if (rowData.length > 0) data.push(rowData);
    });
    return data;
}

function getTableHeaders() {
    return ['Data Falta', 'Nome', 'CPF', 'Setor', 'Departamento', 'Empregador', 'Turno', 'Coordenador', 'Data Feedback', 'Motivo', 'Justificativa', 'Status'];
}

function exportTableToExcel() {
    try {
        const headers = getTableHeaders();
        const data = getTableDataForExport();
        if (data.length === 0) { alert('Nenhum dado para exportar.'); return; }

        const exportData = [headers, ...data];
        const ws = XLSX.utils.aoa_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Feedback_Faltas");
        XLSX.writeFile(wb, `Feedback_Faltas_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (e) {
        console.error("Erro ao exportar Excel:", e);
        alert("Erro ao exportar para Excel.");
    }
}

function exportTableToCSV() {
    try {
        const headers = getTableHeaders();
        const data = getTableDataForExport();
        if (data.length === 0) { alert('Nenhum dado para exportar.'); return; }

        const csvContent = [headers, ...data].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `Feedback_Faltas_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (e) {
        console.error("Erro ao exportar CSV:", e);
        alert("Erro ao exportar para CSV.");
    }
}

/**
 * Abre o modal de feedback com dados do registro selecionado
 */
function openFeedbackModalWithData(index) {
    const item = filteredFeedbackData[index];
    if (!item) return;

    currentFeedbackItem = item;

    // Preencher campos de somente leitura
    document.getElementById('feedback-nome').value = item.nome || '-';
    document.getElementById('feedback-cpf').value = item.cpf || '-';
    document.getElementById('feedback-data-falta').value = item.dataFalta ? new Date(item.dataFalta).toLocaleDateString('pt-BR') : '-';

    // Limpar campos de resposta
    document.getElementById('feedback-motivo-select').value = '';
    document.getElementById('feedback-outros-motivo').value = '';
    document.getElementById('feedback-justificativa').value = '';
    
    // Ocultar campo de "Outros"
    document.getElementById('outros-text-group').style.display = 'none';

    // Limpar mensagem anterior
    const messageEl = document.getElementById('feedback-message');
    if (messageEl) {
        messageEl.style.display = 'none';
        messageEl.textContent = '';
        messageEl.className = 'feedback-message';
    }

    // Se já foi respondido, preencher com dados existentes
    if (item.statusCalculado === 'Concluído') {
        document.getElementById('feedback-motivo-select').value = item.motivo || '';
        document.getElementById('feedback-justificativa').value = item.observacao || '';
        document.getElementById('feedback-motivo-select').disabled = true;
        document.getElementById('feedback-justificativa').disabled = true;
        document.getElementById('feedback-submit-btn').disabled = true;
        document.getElementById('feedback-submit-btn').textContent = 'Já Respondido';
    } else {
        document.getElementById('feedback-motivo-select').disabled = false;
        document.getElementById('feedback-justificativa').disabled = false;
        document.getElementById('feedback-submit-btn').disabled = false;
        document.getElementById('feedback-submit-btn').textContent = 'Enviar Resposta';
    }

    // Abrir modal
    const modal = document.getElementById('feedback-modal');
    if (modal) {
        modal.classList.add('active');
    }
}

/**
 * Fecha o modal de feedback
 */
function closeFeedbackModal() {
    const modal = document.getElementById('feedback-modal');
    if (modal) {
        modal.classList.remove('active');
    }
    currentFeedbackItem = null;
}

/**
 * Configura o listener do formulário de feedback
 */
function setupFeedbackFormListener() {
    const form = document.getElementById('feedback-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitFeedback();
    });

    // Listener para o select de motivo
    const motivoSelect = document.getElementById('feedback-motivo-select');
    if (motivoSelect) {
        motivoSelect.addEventListener('change', (e) => {
            const outrosGroup = document.getElementById('outros-text-group');
            const outrosTextarea = document.getElementById('feedback-outros-motivo');
            
            if (e.target.value === 'Outros') {
                outrosGroup.style.display = 'flex';
                outrosTextarea.required = true;
            } else {
                outrosGroup.style.display = 'none';
                outrosTextarea.required = false;
                outrosTextarea.value = '';
            }
        });
    }

    // Fechar modal ao clicar fora
    const modal = document.getElementById('feedback-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeFeedbackModal();
            }
        });
    }
}

/**
 * Envia o feedback para a API do Google Script
 */
async function submitFeedback() {
    if (!currentFeedbackItem) return;

    const motivoSelect = document.getElementById('feedback-motivo-select').value.trim();
    const outrosMotivo = document.getElementById('feedback-outros-motivo').value.trim();
    const justificativa = document.getElementById('feedback-justificativa').value.trim();
    const submitBtn = document.getElementById('feedback-submit-btn');
    const messageEl = document.getElementById('feedback-message');

    // Validação
    if (!motivoSelect) {
        showFeedbackMessage('Por favor, selecione um motivo.', 'error');
        return;
    }

    if (motivoSelect === 'Outros' && !outrosMotivo) {
        showFeedbackMessage('Por favor, especifique o motivo.', 'error');
        return;
    }

    if (!justificativa) {
        showFeedbackMessage('Por favor, preencha a justificativa.', 'error');
        return;
    }

    // Desabilitar botão durante envio
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';

    try {
        // Determinar o motivo final (se "Outros", usar o texto especificado)
        const motivoFinal = motivoSelect === 'Outros' ? outrosMotivo : motivoSelect;

        // Formatar a data da falta para o padrão esperado pela planilha (DD/MM/AAAA)
        let dataFaltaFormatada = currentFeedbackItem.dataFalta;
        if (dataFaltaFormatada && dataFaltaFormatada.includes('T')) {
            // Se estiver em formato ISO, converter para DD/MM/AAAA
            const date = new Date(dataFaltaFormatada);
            dataFaltaFormatada = String(date.getDate()).padStart(2, '0') + '/' + 
                                String(date.getMonth() + 1).padStart(2, '0') + '/' + 
                                date.getFullYear();
        } else if (dataFaltaFormatada && !dataFaltaFormatada.includes('/')) {
            // Se estiver em AAAA-MM-DD, converter para DD/MM/AAAA
            const [ano, mes, dia] = dataFaltaFormatada.split('-');
            dataFaltaFormatada = dia + '/' + mes + '/' + ano;
        }

        // Preparar dados para envio conforme esperado pela API
        const payload = {
            cpf: currentFeedbackItem.cpf,
            dataFalta: dataFaltaFormatada,
            motivo: motivoFinal,
            dataFeedback: new Date().toISOString().split('T')[0],
            observacao: justificativa
        };

        console.log('Enviando payload:', payload);
        console.log('Data formatada:', dataFaltaFormatada);

        // Enviar para API usando POST
        const response = await fetch(FEEDBACK_API_URL, {
            method: 'POST',
            mode: 'cors',
            headers: {
                // Não definir Content-Type para evitar preflight CORS
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Erro na API: ${response.status}`);
        }

        const resultado = await response.json();

        console.log('Resposta da API:', resultado);
        console.log('Payload enviado:', payload);

        // Verificar resposta da API
        if (resultado && (resultado.success || resultado.sucesso)) {
            showFeedbackMessage('Feedback enviado com sucesso!', 'success');
            
            // Recarregar dados após 1.5 segundos
            setTimeout(() => {
                closeFeedbackModal();
                loadFeedbackData();
            }, 1500);
        } else {
            const errorMsg = resultado ? (resultado.error || resultado.erro || 'Erro desconhecido') : 'Resposta vazia da API';
            throw new Error(errorMsg);
        }

    } catch (error) {
        console.error('Erro ao enviar feedback:', error);
        showFeedbackMessage(`Erro ao enviar: ${error.message}`, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Enviar Resposta';
    }
}

/**
 * Exibe mensagem de feedback no modal
 */
function showFeedbackMessage(message, type) {
    const messageEl = document.getElementById('feedback-message');
    if (!messageEl) return;

    messageEl.textContent = message;
    messageEl.className = `feedback-message ${type}`;
    messageEl.style.display = 'block';

    // Auto-hide após 5 segundos se for sucesso
    if (type === 'success') {
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 5000);
    }
}

// Funções para o Carrossel (Gráfico vs. Tabela)
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
    // Atualizar título
    const titleEl = document.getElementById('carousel-title');
    if (titleEl) titleEl.textContent = carouselSlides[currentCarouselSlide];

    // Mostrar/ocultar slides
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

    // Agrupar dados por data
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

    // Destruir gráfico anterior se existir
    if (feedbackChart) {
        feedbackChart.destroy();
    }

    // Criar novo gráfico de BARRAS
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

/**
 * Renderiza gráfico de distribuição de motivos das faltas
 */
function renderMotivosChart(data) {
    const ctx = document.getElementById('motivosChart');
    if (!ctx) return;

    // Contar ocorrências de cada motivo
    const motivosCont = {};
    data.forEach(item => {
        const motivo = item.motivo || "Sem informação";
        motivosCont[motivo] = (motivosCont[motivo] || 0) + 1;
    });

    // Ordenar por frequência (decrescente)
    const motivosOrdenados = Object.entries(motivosCont)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10); // Top 10 motivos

    const labels = motivosOrdenados.map(item => item[0]);
    const counts = motivosOrdenados.map(item => item[1]);

    // Cores vibrantes para o gráfico
    const colors = [
        'rgba(59, 130, 246, 0.8)',
        'rgba(34, 197, 94, 0.8)',
        'rgba(168, 85, 247, 0.8)',
        'rgba(249, 115, 22, 0.8)',
        'rgba(236, 72, 153, 0.8)',
        'rgba(14, 165, 233, 0.8)',
        'rgba(34, 197, 94, 0.8)',
        'rgba(168, 85, 247, 0.8)',
        'rgba(249, 115, 22, 0.8)',
        'rgba(236, 72, 153, 0.8)'
    ];

    // Destruir gráfico anterior se existir
    if (motivosChart) {
        motivosChart.destroy();
    }

    // Criar novo gráfico de barras horizontal
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
                    position: 'top',
                    labels: {
                        color: '#e0e7ff',
                        font: {
                            size: 12,
                            weight: 'bold'
                        },
                        padding: 15,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    titleColor: '#38bdf8',
                    bodyColor: '#e0e7ff',
                    borderColor: 'rgba(56, 189, 248, 0.3)',
                    borderWidth: 1,
                    padding: 10,
                    titleFont: {
                        size: 12,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 11
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        color: '#94a3b8',
                        font: {
                            size: 11
                        }
                    },
                    grid: {
                        color: 'rgba(56, 189, 248, 0.1)',
                        drawBorder: false
                    }
                },
                y: {
                    ticks: {
                        color: '#94a3b8',
                        font: {
                            size: 10
                        }
                    },
                    grid: {
                        display: false,
                        drawBorder: false
                    }
                }
            }
        }
    });
}
