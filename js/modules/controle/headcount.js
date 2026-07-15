/**
 * Módulo HeadCount - Outbound System
 * Gerencia dados de recursos humanos, operadores e reciclagens
 */

class HeadCountModule {
    constructor() {
        this.apiUrl = 'https://script.google.com/macros/s/AKfycbx_8_IK_Sv-PyCP0UVxv5SEb2Rk6bItwulCEll1FQwZs60RJPNUgEZP5heaY8Ga-ZGJ/exec';
        this.dataResumo = [];
        this.dataOpsNrs = [];
        this.dataSpot = [];
        this.dataReciclagem = [];
        this.spotTurnoChart = null;
        this.spotBaseChart = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadData();
    }

    setupEventListeners() {
        // Navegação entre abas principais
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const tabName = button.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });

        // Navegação entre sub-abas
        const subTabButtons = document.querySelectorAll('.sub-tab-button');
        subTabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const subTabName = button.getAttribute('data-subtab');
                this.switchSubTab(subTabName);
            });
        });

        // Filtros de busca
        const filterNrsAso = document.getElementById('filter-nrs-aso');
        if (filterNrsAso) {
            filterNrsAso.addEventListener('input', (e) => this.filterTable('nrs-aso', e.target.value));
        }

        const filterSpot = document.getElementById('filter-spot');
        if (filterSpot) {
            filterSpot.addEventListener('input', (e) => this.filterTable('spot', e.target.value));
        }

        const filterReciclagem = document.getElementById('filter-reciclagem');
        if (filterReciclagem) {
            filterReciclagem.addEventListener('input', (e) => this.filterTable('reciclagem', e.target.value));
        }

        // Modal de reciclagem
        const closeModalBtn = document.getElementById('close-reciclagem-modal');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => this.closeReciclagemModal());
        }

        const modal = document.getElementById('reciclagem-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeReciclagemModal();
                }
            });
        }
    }

    switchTab(tabName) {
        // Ocultar todas as abas
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });

        // Remover classe active de todos os botões
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });

        // Mostrar aba selecionada
        const tab = document.getElementById(`tab-${tabName}`);
        if (tab) {
            tab.classList.add('active');
        }

        // Marcar botão como ativo
        const button = document.querySelector(`[data-tab="${tabName}"]`);
        if (button) {
            button.classList.add('active');
        }

        // Se for a aba de operadores, mostrar a primeira sub-aba
        if (tabName === 'operadores') {
            this.switchSubTab('nrs-aso');
        }

        // Atualizar gráficos se necessário
        if (tabName === 'operadores') {
            setTimeout(() => {
                if (this.spotTurnoChart) this.spotTurnoChart.resize();
                if (this.spotBaseChart) this.spotBaseChart.resize();
            }, 100);
        }
    }

    switchSubTab(subTabName) {
        // Ocultar todas as sub-abas
        document.querySelectorAll('.sub-tab-content').forEach(tab => {
            tab.classList.remove('active');
        });

        // Remover classe active de todos os botões
        document.querySelectorAll('.sub-tab-button').forEach(btn => {
            btn.classList.remove('active');
        });

        // Mostrar sub-aba selecionada
        const subTab = document.getElementById(`subtab-${subTabName}`);
        if (subTab) {
            subTab.classList.add('active');
        }

        // Marcar botão como ativo
        const button = document.querySelector(`[data-subtab="${subTabName}"]`);
        if (button) {
            button.classList.add('active');
        }

        // Atualizar gráficos se for a aba de Spot
        if (subTabName === 'spot') {
            setTimeout(() => {
                if (this.spotTurnoChart) this.spotTurnoChart.resize();
                if (this.spotBaseChart) this.spotBaseChart.resize();
            }, 100);
        }
    }

    async loadData() {
        this.showLoading(true);
        try {
            console.log('Iniciando carregamento de dados HeadCount...');

            // Carregar dados de resumo
            const responseResumo = await fetch(`${this.apiUrl}?aba=data_base_resumo`);
            if (!responseResumo.ok) throw new Error(`Erro ao carregar resumo: ${responseResumo.status}`);
            this.dataResumo = await responseResumo.json();
            console.log('Dados de resumo carregados:', this.dataResumo.length, 'registros');

            // Carregar dados de operadores NRs
            const responseOpsNrs = await fetch(`${this.apiUrl}?aba=data_base_ops_nrs`);
            if (!responseOpsNrs.ok) throw new Error(`Erro ao carregar ops NRs: ${responseOpsNrs.status}`);
            this.dataOpsNrs = await responseOpsNrs.json();
            console.log('Dados de ops NRs carregados:', this.dataOpsNrs.length, 'registros');

            // Carregar dados de Spot
            const responseSpot = await fetch(`${this.apiUrl}?aba=data_base_spot_lista`);
            if (!responseSpot.ok) throw new Error(`Erro ao carregar spot: ${responseSpot.status}`);
            this.dataSpot = await responseSpot.json();
            console.log('Dados de spot carregados:', this.dataSpot.length, 'registros');

            // Carregar dados de reciclagem
            const responseReciclagem = await fetch(`${this.apiUrl}?aba=data_base_reciclagem_lista`);
            if (!responseReciclagem.ok) throw new Error(`Erro ao carregar reciclagem: ${responseReciclagem.status}`);
            this.dataReciclagem = await responseReciclagem.json();
            console.log('Dados de reciclagem carregados:', this.dataReciclagem.length, 'registros');

            // Atualizar visualizações
            this.updateQuadroTab();
            this.updateNrsAsoTab();
            this.updateSpotTab();
            this.updateReciclagemTab();

            this.showLoading(false);
        } catch (error) {
            console.error('Erro ao carregar dados HeadCount:', error);
            this.showLoading(false);
            this.showError(`Erro ao carregar dados: ${error.message}`);
        }
    }

    updateQuadroTab() {
        if (this.dataResumo.length === 0) {
            console.warn('Nenhum dado de resumo disponível');
            return;
        }

        // Calcular métricas gerais
        const totalHC = this.dataResumo.reduce((sum, d) => sum + (parseInt(d['HC Atual (TOTAL)']) || 0), 0);
        const totalAssistentes = this.dataResumo.reduce((sum, d) => sum + (parseInt(d['ASSISTENTE ATIVOS']) || 0), 0);
        const totalOperadores = this.dataResumo.reduce((sum, d) => sum + (parseInt(d['ATIVOS OPERADOR']) || 0), 0);
        const totalSpot = this.dataResumo.reduce((sum, d) => sum + (parseInt(d['ATIVOS OPERADOR SPOT']) || 0), 0);
        const totalNrsVencidas = this.dataResumo.reduce((sum, d) => sum + (parseInt(d['NR VENCIDA OPERADOR']) || 0), 0);
        const totalAsosVencidas = this.dataResumo.reduce((sum, d) => sum + (parseInt(d['ASO VENCIDO OPERADOR']) || 0), 0);

        // Atualizar cards
        this.updateMetricCard('metric-hc-total', totalHC);
        this.updateMetricCard('metric-assistentes', totalAssistentes);
        this.updateMetricCard('metric-operadores', totalOperadores);
        this.updateMetricCard('metric-spot', totalSpot);
        this.updateMetricCard('metric-nrs-vencidas', totalNrsVencidas);
        this.updateMetricCard('metric-asos-vencidas', totalAsosVencidas);

        // Atualizar tabela
        this.renderQuadroTable();
    }

    renderQuadroTable() {
        const tbody = document.getElementById('quadro-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        this.dataResumo.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="sticky-col">${row['DEPARTAMENTO'] || '-'}</td>
                <td>${row['Turno'] || '-'}</td>
                <td>${row['HC Atual (TOTAL)'] || '-'}</td>
                <td>${row['COORDENADOR'] || '-'}</td>
                <td>${row['LIDER'] || '-'}</td>
                <td>${row['P.A'] || '-'}</td>
                <td>${row['ASSISTENTE ATIVOS'] || '-'}</td>
                <td>${row['AF/AB ASSISTENTE'] || '-'}</td>
                <td>${row['TRABALHO EXTERNO ASSISTENTE'] || '-'}</td>
                <td>${row['FÉRIAS ASSISTENTE'] || '-'}</td>
                <td>${row['P.S'] || '-'}</td>
                <td>${row['ATIVOS OPERADOR'] || '-'}</td>
                <td>${row['ATIVOS OPERADOR SPOT'] || '-'}</td>
                <td>${row['AF/AB OPERADOR'] || '-'}</td>
                <td>${row['TRABALHO EXTERNO OPERADOR'] || '-'}</td>
                <td>${row['FÉRIAS OPERADOR'] || '-'}</td>
                <td>${row['NR VENCIDA OPERADOR'] || '-'}</td>
                <td>${row['ASO VENCIDO OPERADOR'] || '-'}</td>
                <td>${row['PENDENTE DE RECI. OPERADOR'] || '-'}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    updateNrsAsoTab() {
        if (this.dataOpsNrs.length === 0) {
            console.warn('Nenhum dado de ops NRs disponível');
            return;
        }

        // Calcular métricas
        const totalOps = this.dataOpsNrs.length;
        const nrsVencidas = this.dataOpsNrs.filter(d => d['PASSOU NR11/12'] === 'NÃO' || d['PASSOU NR35'] === 'NÃO').length;
        const asosSemDado = this.dataOpsNrs.filter(d => d['Status Periódico'] === 'Sem dados').length;
        const asosVencendo = this.dataOpsNrs.filter(d => {
            const minVenc = parseAnyDate(d['Min Venc']);
            if (!minVenc) return false;
            const today = new Date();
            const daysUntil = Math.floor((minVenc - today) / (1000 * 60 * 60 * 24));
            return daysUntil >= 0 && daysUntil <= 30;
        }).length;

        // Atualizar cards
        this.updateMetricCard('metric-ops-nrs-total', totalOps);
        this.updateMetricCard('metric-nrs-vencidas-ops', nrsVencidas);
        this.updateMetricCard('metric-asos-sem-dado', asosSemDado);
        this.updateMetricCard('metric-asos-vencendo', asosVencendo);

        // Atualizar tabela
        this.renderNrsAsoTable();
    }

    renderNrsAsoTable() {
        const tbody = document.getElementById('nrs-aso-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        this.dataOpsNrs.forEach((row, index) => {
            const statusNrs = row['PASSOU NR11/12'] === 'NÃO' || row['PASSOU NR35'] === 'NÃO' ? 'V' : 'OK';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="sticky-col">${index + 1}</td>
                <td>${row['NOME'] || '-'}</td>
                <td>${row['TIPO'] || '-'}</td>
                <td>${row['FUNÇÃO'] || '-'}</td>
                <td>${row['SITUAÇÃO'] || '-'}</td>
                <td>${row['DEPARTAMENTO'] || '-'}</td>
                <td>${row['Status Periódico'] || '-'}</td>
                <td>${statusNrs}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    updateSpotTab() {
        if (this.dataSpot.length === 0) {
            console.warn('Nenhum dado de spot disponível');
            return;
        }

        // Calcular métricas
        const spotOB = this.dataSpot.filter(d => d['DEPARTAMENTO'] === 'OUTBOUND').length;
        const spotTransfer = this.dataSpot.filter(d => d['DEPARTAMENTO'] === 'TRANSFER OUT' || d['DEPARTAMENTO'] === 'TRANSFER IN').length;
        const spotReciclagem = this.dataSpot.filter(d => d['EM RECICLAGEM'] === 'Sim').length;

        // Atualizar cards
        this.updateMetricCard('metric-spot-ob', spotOB);
        this.updateMetricCard('metric-spot-transfer', spotTransfer);
        this.updateMetricCard('metric-spot-reciclagem', spotReciclagem);

        // Atualizar tabela
        this.renderSpotTable();

        // Atualizar gráficos
        this.updateSpotCharts();
    }

    renderSpotTable() {
        const tbody = document.getElementById('spot-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        this.dataSpot.forEach((row, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="sticky-col">${index + 1}</td>
                <td>${row['NOME'] || '-'}</td>
                <td>${row['TURNO'] || '-'}</td>
                <td>${row['DEPARTAMENTO'] || '-'}</td>
                <td>${row['FUNÇÃO'] || '-'}</td>
                <td>${row['NÍVEL'] || '-'}</td>
                <td>${row['SETOR'] || '-'}</td>
                <td>${row['BASE/SITE'] || '-'}</td>
                <td>${row['EM RECICLAGEM'] || '-'}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    updateSpotCharts() {
        // Gráfico por turno
        const turnoData = this.groupByField(this.dataSpot, 'TURNO');
        this.createDoughnutChart('spotTurnoChart', turnoData, 'Distribuição por Turno');

        // Gráfico por base/site
        const baseData = this.groupByField(this.dataSpot, 'BASE/SITE');
        this.createDoughnutChart('spotBaseChart', baseData, 'Distribuição por Base/Site');
    }

    groupByField(data, field) {
        const grouped = {};
        data.forEach(item => {
            const key = item[field] || 'Sem informação';
            grouped[key] = (grouped[key] || 0) + 1;
        });
        return grouped;
    }

    createDoughnutChart(canvasId, data, title) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const labels = Object.keys(data);
        const values = Object.values(data);
        const colors = this.generateColors(labels.length);

        // Destruir gráfico anterior se existir
        if (canvasId === 'spotTurnoChart' && this.spotTurnoChart) {
            this.spotTurnoChart.destroy();
        } else if (canvasId === 'spotBaseChart' && this.spotBaseChart) {
            this.spotBaseChart.destroy();
        }

        const ctx = canvas.getContext('2d');
        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors,
                    borderColor: 'rgba(15, 23, 42, 0.8)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#e0e7ff',
                            font: { size: 11, weight: '500' },
                            padding: 15
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.label}: ${context.parsed}`
                        }
                    }
                }
            }
        });

        if (canvasId === 'spotTurnoChart') {
            this.spotTurnoChart = chart;
        } else if (canvasId === 'spotBaseChart') {
            this.spotBaseChart = chart;
        }
    }

    generateColors(count) {
        const colors = [
            '#38bdf8', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444',
            '#ec4899', '#06b6d4', '#14b8a6', '#f97316', '#6366f1'
        ];
        const result = [];
        for (let i = 0; i < count; i++) {
            result.push(colors[i % colors.length]);
        }
        return result;
    }

    updateReciclagemTab() {
        if (this.dataReciclagem.length === 0) {
            console.warn('Nenhum dado de reciclagem disponível');
            return;
        }

        // Filtrar apenas reciclagens pendentes
        const pendentes = this.dataReciclagem.filter(d => d['Liberado Reciclagem'] === 'Não');

        // Atualizar card
        this.updateMetricCard('metric-reciclagem-pendentes', pendentes.length);

        // Ordenar por data de ocorrência mais antiga
        pendentes.sort((a, b) => {
            const dateA = this.parseExcelDate(a['Data/Hora Ocorrido']);
            const dateB = this.parseExcelDate(b['Data/Hora Ocorrido']);
            return dateA - dateB;
        });

        // Atualizar tabela
        this.renderReciclagemTable(pendentes);
    }

    renderReciclagemTable(data) {
        const tbody = document.getElementById('reciclagem-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        data.forEach(row => {
            const tr = document.createElement('tr');
            const dataOcorrencia = this.formatExcelDate(row['Data/Hora Ocorrido']);
            const liberado = row['Liberado Reciclagem'] === 'Sim' ? 'Sim' : 'Não';

            tr.innerHTML = `
                <td class="sticky-col">${row['Status'] || '-'}</td>
                <td style="cursor: pointer; color: #38bdf8; text-decoration: underline;" data-nome="${row['Nome Funcionário']}" class="reciclagem-nome-link">
                    ${row['Nome Funcionário'] || '-'}
                </td>
                <td>${row['Tipo de Solicitação'] || '-'}</td>
                <td>${row['Turno'] || '-'}</td>
                <td>${row['Tipo de Máquina'] || '-'}</td>
                <td>${dataOcorrencia}</td>
                <td>${liberado}</td>
            `;

            // Adicionar listener para abrir modal
            const nomeLink = tr.querySelector('.reciclagem-nome-link');
            if (nomeLink) {
                nomeLink.addEventListener('click', () => {
                    this.openReciclagemModal(row);
                });
            }

            tbody.appendChild(tr);
        });
    }

    openReciclagemModal(row) {
        const modal = document.getElementById('reciclagem-modal');
        if (!modal) return;

        // Preencher campos do modal
        const dataPrevisao = this.formatExcelDate(row['Data prevista para devolutiva']);

        document.getElementById('modal-reciclagem-nome').textContent = row['Nome Funcionário'] || '-';
        document.getElementById('modal-reciclagem-local').textContent = row['Local'] || '-';
        document.getElementById('modal-reciclagem-axyma').textContent = row['AXYMA Aplicado'] || '-';
        document.getElementById('modal-reciclagem-motivo').textContent = row['Motivo Não Liberação'] || '-';
        document.getElementById('modal-reciclagem-obs').textContent = row['Obs Não Liberação'] || '-';
        document.getElementById('modal-reciclagem-data-prevista').textContent = dataPrevisao;

        // Mostrar modal
        modal.style.display = 'flex';
    }

    closeReciclagemModal() {
        const modal = document.getElementById('reciclagem-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    parseExcelDate(excelDate) {
        if (!excelDate) return new Date();
        if (typeof excelDate === 'string') {
            return parseAnyDate(excelDate) || new Date();
        }
        // Excel date format: days since 1/1/1900
        const excelEpoch = new Date(1900, 0, 1);
        return new Date(excelEpoch.getTime() + excelDate * 24 * 60 * 60 * 1000);
    }

    formatExcelDate(excelDate) {
        const date = this.parseExcelDate(excelDate);
        return date.toLocaleDateString('pt-BR');
    }

    filterTable(tableType, searchTerm) {
        const tableId = tableType === 'nrs-aso' ? 'nrs-aso-table' : 
                       tableType === 'spot' ? 'spot-table' : 'reciclagem-table';
        const table = document.getElementById(tableId);
        if (!table) return;

        const rows = table.querySelectorAll('tbody tr');
        const term = searchTerm.toLowerCase();

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(term) ? '' : 'none';
        });
    }

    updateMetricCard(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = this.formatNumber(value);
        }
    }

    formatNumber(num) {
        return new Intl.NumberFormat('pt-BR').format(Math.round(num));
    }

    showLoading(show) {
        const spinner = document.getElementById('loading-spinner-headcount');
        if (spinner) {
            // Usamos a classe .active (não style.display) porque é ela que
            // aplica "display: flex" no CSS, responsável por centralizar
            // o spinner na tela. Definir style.display = 'block' direto
            // ignora esse flex e o spinner não fica centralizado.
            spinner.classList.toggle('active', show);
        }
    }

    showError(message) {
        const loadingText = document.getElementById('loading-text-headcount');
        if (loadingText) {
            loadingText.textContent = message;
            loadingText.style.color = '#ef4444';
        }
    }
}

// Inicializar módulo quando o HeadCount for acessado
window.HeadCountModule = HeadCountModule;
