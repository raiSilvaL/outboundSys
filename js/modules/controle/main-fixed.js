/**
 * Módulo Controle e Infos - Outbound System
 * Gerencia dashboard com métricas, tabelas TPH/DPMO e gráficos históricos
 */

class ControleInfosModule {
    constructor() {
        this.apiUrl = 'https://script.google.com/macros/s/AKfycbx_8_IK_Sv-PyCP0UVxv5SEb2Rk6bItwulCEll1FQwZs60RJPNUgEZP5heaY8Ga-ZGJ/exec';
        this.dataPlan = [];
        this.dataRealizado = [];
        this.historicChart = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadData();
    }

    setupEventListeners() {
        // Filtros principais
        const applyFiltersBtn = document.getElementById('apply-filters');
        const resetFiltersBtn = document.getElementById('reset-filters');
        
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => this.applyFilters());
        }
        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', () => this.resetFilters());
        }

        // Menu de navegação
        this.setupMenuNavigation();
    }

    setupMenuNavigation() {
        const menuItems = document.querySelectorAll('[data-screen]');
        menuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const screenId = item.getAttribute('data-screen');
                this.switchScreen(screenId);
                
                // Atualizar menu ativo
                document.querySelectorAll('[data-screen]').forEach(m => m.classList.remove('active'));
                item.classList.add('active');
            });
        });

        // Menu parent
        const menuParent = document.getElementById('controle-parent');
        if (menuParent) {
            menuParent.addEventListener('click', (e) => {
                e.preventDefault();
                menuParent.classList.toggle('expanded');
                const submenu = document.getElementById('controle-submenu');
                if (submenu) {
                    submenu.classList.toggle('active');
                }
            });
        }
    }

    switchScreen(screenId) {
        // Ocultar todas as telas
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        // Mostrar tela selecionada
        const screen = document.getElementById(`screen-${screenId}`);
        if (screen) {
            screen.classList.add('active');
        }
    }

    async loadData() {
        this.showLoading(true);
        try {
            console.log('Iniciando carregamento de dados...');
            
            // Carregar dados do plano
            const responsePlan = await fetch(`${this.apiUrl}?aba=data_base_plan`);
            if (!responsePlan.ok) {
                throw new Error(`Erro ao carregar dados do plano: ${responsePlan.status}`);
            }
            this.dataPlan = await responsePlan.json();
            console.log('Dados do plano carregados:', this.dataPlan.length, 'registros');

            // Carregar dados realizados
            const responseRealizado = await fetch(`${this.apiUrl}?aba=data_base_realizado`);
            if (!responseRealizado.ok) {
                throw new Error(`Erro ao carregar dados realizados: ${responseRealizado.status}`);
            }
            this.dataRealizado = await responseRealizado.json();
            console.log('Dados realizados carregados:', this.dataRealizado.length, 'registros');

            // Inicializar datas
            this.initializeDateFilters();

            // Atualizar visualizações
            this.updateMetrics();
            this.updateTPHTable();
            this.updateDPMOTable();
            this.updateHistoricChart();

            this.showLoading(false);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            this.showLoading(false);
            this.showError(`Erro ao carregar dados: ${error.message}`);
        }
    }

    /**
     * Define o intervalo padrão de datas como a semana atual (Domingo a Sábado).
     * Só sobrescreve os campos se eles ainda não tiverem valor, a menos que
     * `force` seja true (usado pelo botão "Limpar").
     */
    initializeDateFilters(force = false) {
        const dateStartInput = document.getElementById('date-start');
        const dateEndInput = document.getElementById('date-end');
        if (!dateStartInput || !dateEndInput) return;

        // Se o usuário já escolheu um período e não é um reset forçado, preserva a escolha
        if (!force && dateStartInput.value && dateEndInput.value) return;

        const { start, end } = this.getCurrentWeekRange();
        const formatDate = (date) => date.toISOString().split('T')[0];

        dateStartInput.value = formatDate(start);
        dateEndInput.value = formatDate(end);
    }

    /**
     * Retorna o intervalo (Domingo a Sábado) da semana atual.
     */
    getCurrentWeekRange() {
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 = Domingo

        const start = new Date(today);
        start.setDate(today.getDate() - dayOfWeek);
        start.setHours(0, 0, 0, 0);

        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);

        return { start, end };
    }

    getFilteredData() {
        const dateStartInput = document.getElementById('date-start');
        const dateEndInput = document.getElementById('date-end');
        
        if (!dateStartInput || !dateEndInput) return this.dataPlan;

        const startDate = new Date(dateStartInput.value);
        const endDate = new Date(dateEndInput.value);
        endDate.setHours(23, 59, 59, 999);

        return this.dataPlan.filter(item => {
            const itemDate = new Date(item.Data);
            return itemDate >= startDate && itemDate <= endDate;
        });
    }

    updateMetrics() {
        const filtered = this.getFilteredData();
        
        if (filtered.length === 0) {
            this.clearAllMetrics();
            return;
        }

        // Somas dos dados do plano
        const sumForecast = filtered.reduce((sum, d) => sum + (parseFloat(d.Forecast) || 0), 0);
        const sumCapacidade = filtered.reduce((sum, d) => sum + (parseFloat(d['Capacidade IPT']) || 0), 0);

        // Dados realizados no período
        const dateStartInput = document.getElementById('date-start');
        const dateEndInput = document.getElementById('date-end');
        
        const startDate = new Date(dateStartInput.value);
        const endDate = new Date(dateEndInput.value);
        endDate.setHours(23, 59, 59, 999);
        
        const filteredRealizado = this.dataRealizado.filter(item => {
            const itemDate = new Date(item.Data);
            return itemDate >= startDate && itemDate <= endDate;
        });

        const sumExpedido = filteredRealizado.reduce((sum, d) => sum + (parseFloat(d.Expedidas) || 0), 0);
        const avgTPH = filteredRealizado.length > 0 
            ? (filteredRealizado.reduce((sum, d) => sum + (parseFloat(d['TPH OB Total']) || 0), 0) / filteredRealizado.length).toFixed(2)
            : 0;
        const sumCeMisses = filteredRealizado.reduce((sum, d) => sum + (parseFloat(d['Ce Misses']) || 0), 0);
        const sumLateSlam = filteredRealizado.reduce((sum, d) => sum + (parseFloat(d['Late Slam']) || 0), 0);
        const sumLateDep = filteredRealizado.reduce((sum, d) => sum + (parseFloat(d['Late Departure OB']) || 0), 0);
        const sumLateTom = filteredRealizado.reduce((sum, d) => sum + (parseFloat(d['Late Departure TOM']) || 0), 0);
        const sumLatePos = filteredRealizado.reduce((sum, d) => sum + (parseFloat(d['Late Position']) || 0), 0);

        const metricForecast = document.getElementById('metric-forecast');
        const metricCapacidade = document.getElementById('metric-capacidade');
        const metricExpedido = document.getElementById('metric-expedido');
        const metricTPH = document.getElementById('metric-tph');
        const metricCeMisses = document.getElementById('metric-cemisses');
        const metricLateSlam = document.getElementById('metric-lateslam');
        const metricLateDep = document.getElementById('metric-latedep');
        const metricLateTom = document.getElementById('metric-latetom');
        const metricLatePos = document.getElementById('metric-latepos');

        if (metricForecast) metricForecast.textContent = this.formatNumber(sumForecast);
        if (metricCapacidade) metricCapacidade.textContent = this.formatNumber(sumCapacidade);
        if (metricExpedido) metricExpedido.textContent = this.formatNumber(sumExpedido);
        if (metricTPH) metricTPH.textContent = avgTPH;
        if (metricCeMisses) metricCeMisses.textContent = sumCeMisses;
        if (metricLateSlam) metricLateSlam.textContent = sumLateSlam;
        if (metricLateDep) metricLateDep.textContent = sumLateDep;
        if (metricLateTom) metricLateTom.textContent = sumLateTom;
        if (metricLatePos) metricLatePos.textContent = sumLatePos;
    }

    clearAllMetrics() {
        const metrics = [
            'metric-forecast', 'metric-capacidade', 'metric-expedido',
            'metric-tph', 'metric-cemisses', 'metric-lateslam',
            'metric-latedep', 'metric-latetom', 'metric-latepos'
        ];

        metrics.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.textContent = '-';
        });
    }

    updateTPHTable() {
        const dateStartInput = document.getElementById('date-start');
        const dateEndInput = document.getElementById('date-end');

        if (!dateStartInput || !dateEndInput || !dateStartInput.value || !dateEndInput.value) {
            this.clearTPHTable();
            return;
        }

        const startDate = new Date(dateStartInput.value);
        const endDate = new Date(dateEndInput.value);
        endDate.setHours(23, 59, 59, 999);

        // Atualizar headers com datas
        this.updateTableHeaders('tph-header-row', startDate, endDate);

        const filtered = this.dataRealizado.filter(item => {
            const itemDate = new Date(item.Data);
            return itemDate >= startDate && itemDate <= endDate;
        });

        console.log('Dados filtrados para TPH:', filtered.length, 'registros');

        if (filtered.length === 0) {
            this.clearTPHTable();
            return;
        }

        // Agrupar por dia da semana
        const dayData = this.groupByDayOfWeek(filtered);
        console.log('Dados agrupados por dia:', dayData);

        // Mapear atividades
        const activities = ['Pick', 'Rebin', 'Pack', 'Dock'];
        const tphFields = ['TPH Pick', 'TPH Rebin', 'TPH Pack', 'TPH Dock'];

        const tbody = document.getElementById('tph-body');
        if (!tbody) {
            console.error('Elemento tph-body não encontrado');
            return;
        }

        tbody.innerHTML = '';

        activities.forEach((activity, idx) => {
            const row = document.createElement('tr');
            const field = tphFields[idx];
            
            let rowHTML = `<td class="sticky-col">${activity}</td>`;
            
            for (let day = 0; day < 7; day++) {
                const dayKey = day.toString();
                const dayData_arr = dayData[dayKey] || [];
                let avgValue = '-';
                
                if (dayData_arr.length > 0) {
                    const sum = dayData_arr.reduce((total, d) => {
                        const val = parseFloat(d[field]) || 0;
                        return total + val;
                    }, 0);
                    avgValue = (sum / dayData_arr.length).toFixed(2);
                }
                
                rowHTML += `<td>${avgValue}</td>`;
            }
            
            row.innerHTML = rowHTML;
            tbody.appendChild(row);
        });

        console.log('Tabela TPH renderizada com sucesso');
    }

    updateDPMOTable() {
        const dateStartInput = document.getElementById('date-start');
        const dateEndInput = document.getElementById('date-end');

        if (!dateStartInput || !dateEndInput || !dateStartInput.value || !dateEndInput.value) {
            this.clearDPMOTable();
            return;
        }

        const startDate = new Date(dateStartInput.value);
        const endDate = new Date(dateEndInput.value);
        endDate.setHours(23, 59, 59, 999);

        // Atualizar headers com datas
        this.updateTableHeaders('dpmo-header-row', startDate, endDate);

        const filtered = this.dataRealizado.filter(item => {
            const itemDate = new Date(item.Data);
            return itemDate >= startDate && itemDate <= endDate;
        });

        console.log('Dados filtrados para DPMO:', filtered.length, 'registros');

        if (filtered.length === 0) {
            this.clearDPMOTable();
            return;
        }

        // Agrupar por dia da semana
        const dayData = this.groupByDayOfWeek(filtered);
        console.log('Dados agrupados por dia:', dayData);

        // Mapear atividades
        const activities = ['Pick Short', 'Sort', 'Pack', 'Ship'];
        const dpmoFields = ['Pick Short DPMO', 'Sort DPMO', 'Pack DPMO', 'Ship DPMO'];

        const tbody = document.getElementById('dpmo-body');
        if (!tbody) {
            console.error('Elemento dpmo-body não encontrado');
            return;
        }

        tbody.innerHTML = '';

        activities.forEach((activity, idx) => {
            const row = document.createElement('tr');
            const field = dpmoFields[idx];
            
            let rowHTML = `<td class="sticky-col">${activity}</td>`;
            
            for (let day = 0; day < 7; day++) {
                const dayKey = day.toString();
                const dayData_arr = dayData[dayKey] || [];
                let avgValue = '-';
                
                if (dayData_arr.length > 0) {
                    const sum = dayData_arr.reduce((total, d) => {
                        const val = parseFloat(d[field]) || 0;
                        return total + val;
                    }, 0);
                    avgValue = Math.round(sum / dayData_arr.length);
                }
                
                rowHTML += `<td>${avgValue}</td>`;
            }
            
            row.innerHTML = rowHTML;
            tbody.appendChild(row);
        });

        console.log('Tabela DPMO renderizada com sucesso');
    }

    updateTableHeaders(headerId, startDate, endDate) {
        const headerRow = document.getElementById(headerId);
        if (!headerRow) return;

        const headers = headerRow.querySelectorAll('th[data-day]');
        headers.forEach(header => {
            const dayOfWeek = parseInt(header.getAttribute('data-day'));
            const dayDate = new Date(startDate);
            
            // Calcular a data do dia da semana dentro do intervalo
            const daysDiff = dayOfWeek - startDate.getDay();
            if (daysDiff < 0) {
                dayDate.setDate(dayDate.getDate() + daysDiff + 7);
            } else {
                dayDate.setDate(dayDate.getDate() + daysDiff);
            }

            // Formatar data como dd/mm
            const day = String(dayDate.getDate()).padStart(2, '0');
            const month = String(dayDate.getMonth() + 1).padStart(2, '0');
            const dayNames = ['Dom.', 'Seg.', 'Ter.', 'Qua.', 'Qui.', 'Sex.', 'Sáb.'];
            const dayName = dayNames[dayOfWeek];
            
            header.textContent = `${dayName} (${day}/${month})`;
        });
    }

    groupByDayOfWeek(data) {
        const grouped = {};
        for (let i = 0; i < 7; i++) {
            grouped[i.toString()] = [];
        }

        data.forEach(item => {
            const date = new Date(item.Data);
            const dayOfWeek = date.getDay(); // Usar getDay() em vez de getUTCDay()
            grouped[dayOfWeek.toString()].push(item);
        });

        return grouped;
    }

    updateHistoricChart() {
        const dateStartInput = document.getElementById('date-start');
        const dateEndInput = document.getElementById('date-end');
        
        if (!dateStartInput || !dateEndInput) return;

        const startDate = new Date(dateStartInput.value);
        const endDate = new Date(dateEndInput.value);
        endDate.setHours(23, 59, 59, 999);

        const filtered = this.dataRealizado.filter(item => {
            const itemDate = new Date(item.Data);
            return itemDate >= startDate && itemDate <= endDate;
        }).sort((a, b) => new Date(a.Data) - new Date(b.Data));

        if (filtered.length === 0) return;

        // Preparar dados
        const labels = filtered.map(d => {
            const date = new Date(d.Data);
            return date.toLocaleDateString('pt-BR', { month: '2-digit', day: '2-digit' });
        });

        const forecastData = filtered.map(d => parseFloat(d.Forecast) || 0);
        const expedidoData = filtered.map(d => parseFloat(d.Expedidas) || 0);
        const ceMissesData = filtered.map(d => parseFloat(d['Ce Misses']) || 0);
        const lateSlamData = filtered.map(d => parseFloat(d['Late Slam']) || 0);
        const lateDepartureData = filtered.map(d => parseFloat(d['Late Departure OB']) || 0);

        // Destruir gráfico anterior se existir
        if (this.historicChart) {
            this.historicChart.destroy();
        }

        const chartCanvas = document.getElementById('historicChart');
        if (!chartCanvas) return;

        const ctx = chartCanvas.getContext('2d');
        this.historicChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Forecast',
                        data: forecastData,
                        borderColor: '#38bdf8',
                        backgroundColor: 'rgba(56, 189, 248, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: false
                    },
                    {
                        label: 'Expedido',
                        data: expedidoData,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: false
                    },
                    {
                        label: 'Ce Misses',
                        data: ceMissesData,
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: false
                    },
                    {
                        label: 'Late Slam',
                        data: lateSlamData,
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: false
                    },
                    {
                        label: 'Late Departure',
                        data: lateDepartureData,
                        borderColor: '#ec4899',
                        backgroundColor: 'rgba(236, 72, 153, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#e0e7ff',
                            font: {
                                size: 12,
                                weight: '500'
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            color: '#94a3b8'
                        },
                        grid: {
                            color: 'rgba(56, 189, 248, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#94a3b8'
                        },
                        grid: {
                            color: 'rgba(56, 189, 248, 0.1)'
                        }
                    }
                }
            }
        });
    }

    applyFilters() {
        this.updateMetrics();
        this.updateTPHTable();
        this.updateDPMOTable();
        this.updateHistoricChart();
    }

    resetFilters() {
        this.initializeDateFilters(true); // force = true: volta para a semana atual
        this.applyFilters();
    }

    clearTPHTable() {
        const tbody = document.getElementById('tph-body');
        if (!tbody) return;
        
        tbody.innerHTML = `
            <tr><td class="sticky-col">Pick</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>
            <tr><td class="sticky-col">Rebin</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>
            <tr><td class="sticky-col">Pack</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>
            <tr><td class="sticky-col">Dock</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>
        `;
    }

    clearDPMOTable() {
        const tbody = document.getElementById('dpmo-body');
        if (!tbody) return;
        
        tbody.innerHTML = `
            <tr><td class="sticky-col">Pick Short</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>
            <tr><td class="sticky-col">Sort</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>
            <tr><td class="sticky-col">Pack</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>
            <tr><td class="sticky-col">Ship</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>
        `;
    }

    formatNumber(num) {
        return new Intl.NumberFormat('pt-BR').format(Math.round(num));
    }

    showLoading(show) {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) {
            if (show) {
                spinner.classList.add('active');
            } else {
                spinner.classList.remove('active');
            }
        }
    }

    showError(message) {
        const loadingText = document.getElementById('loading-text');
        if (loadingText) {
            loadingText.textContent = message;
            loadingText.style.color = '#ef4444';
        }
    }
}

// Inicializar módulo quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    if (typeof auth === 'undefined' || !auth.estaAutenticado()) {
        window.location.href = 'login.html';
        return;
    }

    // Revelar conteúdo principal após a animação de intro
    const revealContent = () => {
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.classList.remove('hidden');
        }
        
        // Inicializar UI Controller (sidebar retrátil)
        if (typeof initializeSidebar === 'function') {
            initializeSidebar();
        }

        // Inicializar Menu Controller (aplicar filtros de permissão)
        if (typeof MenuController !== 'undefined' && MenuController.aplicarFiltro) {
            MenuController.aplicarFiltro();
        }

        // Inicializar módulo Controle e Infos
        new ControleInfosModule();
    };

    // Ouvir o evento de intro finalizado
    window.addEventListener('introFinished', revealContent);

    // Fallback: Se o intro não terminar em 5 segundos, revelar mesmo assim
    setTimeout(() => {
        const mainContent = document.getElementById('main-content');
        if (mainContent && mainContent.classList.contains('hidden')) {
            revealContent();
        }
    }, 5000);
});
