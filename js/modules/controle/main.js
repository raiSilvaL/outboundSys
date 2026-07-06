/**
 * Módulo Controle e Infos - Outbound System
 * Gerencia dashboard com métricas, tabelas TPH/DPMO e gráficos históricos
 */

class ControleInfosModule {
    constructor() {
        this.apiUrl = 'https://script.google.com/macros/s/AKfycbx_8_IK_Sv-PyCP0UVxv5SEb2Rk6bItwulCEll1FQwZs60RJPNUgEZP5heaY8Ga-ZGJ/exec';
        this.dataPlan = [];
        this.dataRealizado = [];
        this.volumeChart = null;
        this.perdaChart = null;
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
            this.updateVolumeChart();
            this.updatePerdaChart();

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

        const startDate = parseInputDate(dateStartInput.value);
        const endDate = parseInputDate(dateEndInput.value, true);

        return this.dataPlan.filter(item => {
            const itemDate = parseAnyDate(item.Data);
            if (!itemDate) return false;
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
        
        const startDate = parseInputDate(dateStartInput.value);
        const endDate = parseInputDate(dateEndInput.value, true);
        
        const filteredRealizado = this.dataRealizado.filter(item => {
            const itemDate = parseAnyDate(item.Data);
            if (!itemDate) return false;
            return itemDate >= startDate && itemDate <= endDate;
        });

        const sumDrop = filteredRealizado.reduce((sum, d) => sum + (parseFloat(d.Drop) || 0), 0);
        const sumExpedido = filteredRealizado.reduce((sum, d) => sum + (parseFloat(d.Expedidas) || 0), 0);
        const avgTPHValue = filteredRealizado.length > 0 
            ? (filteredRealizado.reduce((sum, d) => sum + (parseFloat(d['TPH OB Total']) || 0), 0) / filteredRealizado.length)
            : 0;
        const sumCeMisses = filteredRealizado.reduce((sum, d) => sum + (parseFloat(d['Ce Misses']) || 0), 0);
        const sumLateSlam = filteredRealizado.reduce((sum, d) => sum + (parseFloat(d['Late Slam']) || 0), 0);
        const sumLateDep = filteredRealizado.reduce((sum, d) => sum + (parseFloat(d['Late Departure OB']) || 0), 0);
        const sumLateTom = filteredRealizado.reduce((sum, d) => sum + (parseFloat(d['Late Departure TOM']) || 0), 0);
        const sumLatePos = filteredRealizado.reduce((sum, d) => sum + (parseFloat(d['Late Position']) || 0), 0);

        const metricForecast = document.getElementById('metric-forecast');
        const metricCapacidade = document.getElementById('metric-capacidade');
        const metricDrop = document.getElementById('metric-drop');
        const metricExpedido = document.getElementById('metric-expedido');
        const metricTPH = document.getElementById('metric-tph');
        const metricCeMisses = document.getElementById('metric-cemisses');
        const metricLateSlam = document.getElementById('metric-lateslam');
        const metricLateDep = document.getElementById('metric-latedep');
        const metricLateTom = document.getElementById('metric-latetom');
        const metricLatePos = document.getElementById('metric-latepos');

        if (metricForecast) metricForecast.textContent = this.formatNumber(sumForecast);
        if (metricCapacidade) metricCapacidade.textContent = this.formatNumber(sumCapacidade);
        if (metricDrop) metricDrop.textContent = this.formatNumber(sumDrop);
        if (metricExpedido) metricExpedido.textContent = this.formatNumber(sumExpedido);
        if (metricTPH) metricTPH.textContent = this.formatDecimal(avgTPHValue, 2);
        if (metricCeMisses) metricCeMisses.textContent = this.formatNumber(sumCeMisses);
        if (metricLateSlam) metricLateSlam.textContent = this.formatNumber(sumLateSlam);
        if (metricLateDep) metricLateDep.textContent = this.formatNumber(sumLateDep);
        if (metricLateTom) metricLateTom.textContent = this.formatNumber(sumLateTom);
        if (metricLatePos) metricLatePos.textContent = this.formatNumber(sumLatePos);
    }

    clearAllMetrics() {
        const metrics = [
            'metric-forecast', 'metric-capacidade', 'metric-drop', 'metric-expedido',
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

        const startDate = parseInputDate(dateStartInput.value);
        const endDate = parseInputDate(dateEndInput.value, true);
        const dates = this.getDateRangeArray(startDate, endDate);

        // Atualizar headers com uma coluna para cada dia do período filtrado
        this.buildTableHeader('tph-header-row', dates);

        const filtered = this.dataRealizado.filter(item => {
            const itemDate = parseAnyDate(item.Data);
            if (!itemDate) return false;
            return itemDate >= startDate && itemDate <= endDate;
        });

        console.log('Dados filtrados para TPH:', filtered.length, 'registros');

        if (filtered.length === 0) {
            this.clearTPHTable();
            return;
        }

        // Agrupar por data exata (não mais por dia da semana)
        const groupedByDate = this.groupByDate(filtered);

        // Mapear atividades. As "keywords" tornam a busca do campo resiliente a
        // pequenas variações de nome de coluna na planilha (ex.: "TPH Pack" vs "TPH Packing").
        const activities = [
            { label: 'Pick', keywords: ['tph', 'pick'] },
            { label: 'Rebin', keywords: ['tph', 'rebin'] },
            { label: 'Pack', keywords: ['tph', 'pack'] },
            { label: 'Dock', keywords: ['tph', 'dock'] }
        ];

        const tbody = document.getElementById('tph-body');
        if (!tbody) {
            console.error('Elemento tph-body não encontrado');
            return;
        }

        tbody.innerHTML = '';

        activities.forEach(({ label, keywords }) => {
            const row = document.createElement('tr');
            let rowHTML = `<td class="sticky-col">${label}</td>`;

            dates.forEach(date => {
                const key = this.formatDateKey(date);
                const dayItems = groupedByDate.get(key) || [];
                rowHTML += `<td>${this.averageFieldForDay(dayItems, keywords, 'decimal')}</td>`;
            });

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

        const startDate = parseInputDate(dateStartInput.value);
        const endDate = parseInputDate(dateEndInput.value, true);
        const dates = this.getDateRangeArray(startDate, endDate);

        // Atualizar headers com uma coluna para cada dia do período filtrado
        this.buildTableHeader('dpmo-header-row', dates);

        const filtered = this.dataRealizado.filter(item => {
            const itemDate = parseAnyDate(item.Data);
            if (!itemDate) return false;
            return itemDate >= startDate && itemDate <= endDate;
        });

        console.log('Dados filtrados para DPMO:', filtered.length, 'registros');

        if (filtered.length === 0) {
            this.clearDPMOTable();
            return;
        }

        // Agrupar por data exata (não mais por dia da semana)
        const groupedByDate = this.groupByDate(filtered);

        // "Pack" estava sempre zerado porque o código só procurava a chave exata
        // "Pack DPMO". A busca por palavras-chave abaixo aceita variações como
        // "Packing DPMO", "DPMO Pack", espaços duplicados ou caracteres não-quebráveis
        // vindos do Google Sheets.
        const activities = [
            { label: 'Pick Short', keywords: ['pick', 'short', 'dpmo'] },
            { label: 'Sort', keywords: ['sort', 'dpmo'] },
            { label: 'Pack', keywords: ['pack', 'dpmo'] },
            { label: 'Ship', keywords: ['ship', 'dpmo'] }
        ];

        const tbody = document.getElementById('dpmo-body');
        if (!tbody) {
            console.error('Elemento dpmo-body não encontrado');
            return;
        }

        tbody.innerHTML = '';

        activities.forEach(({ label, keywords }) => {
            const row = document.createElement('tr');
            let rowHTML = `<td class="sticky-col">${label}</td>`;

            dates.forEach(date => {
                const key = this.formatDateKey(date);
                const dayItems = groupedByDate.get(key) || [];
                rowHTML += `<td>${this.averageFieldForDay(dayItems, keywords, 'number')}</td>`;
            });

            row.innerHTML = rowHTML;
            tbody.appendChild(row);
        });

        console.log('Tabela DPMO renderizada com sucesso');
    }

    /**
     * Gera a lista de datas (uma por dia) entre startDate e endDate, inclusive.
     * Substitui a antiga lógica de 7 colunas fixas (Dom.-Sáb.), que ignorava
     * períodos maiores que uma semana.
     */
    getDateRangeArray(startDate, endDate) {
        const dates = [];
        const current = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        const last = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

        while (current <= last) {
            dates.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }

        return dates;
    }

    formatDateKey(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    /**
     * Reconstrói a linha de cabeçalho da tabela com uma coluna para cada data
     * do período filtrado (em vez das 7 colunas fixas de dia da semana).
     */
    buildTableHeader(headerId, dates) {
        const headerRow = document.getElementById(headerId);
        if (!headerRow) return;

        const stickyHeader = headerRow.querySelector('.sticky-col');
        headerRow.innerHTML = '';
        if (stickyHeader) headerRow.appendChild(stickyHeader);

        const dayNames = ['Dom.', 'Seg.', 'Ter.', 'Qua.', 'Qui.', 'Sex.', 'Sáb.'];
        dates.forEach(date => {
            const th = document.createElement('th');
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            th.textContent = `${dayNames[date.getDay()]} (${day}/${month})`;
            th.setAttribute('data-date', this.formatDateKey(date));
            headerRow.appendChild(th);
        });
    }

    /**
     * Agrupa os registros por data exata (yyyy-mm-dd), em vez de por dia da
     * semana. Isso evita que dois dias de semanas diferentes (ex.: duas
     * segundas-feiras) sejam somados na mesma coluna quando o período filtrado
     * é maior que uma semana.
     */
    groupByDate(data) {
        const grouped = new Map();
        data.forEach(item => {
            const date = parseAnyDate(item.Data);
            if (!date) return; // Ignora registros com data inválida/ausente
            const key = this.formatDateKey(date);
            if (!grouped.has(key)) {
                grouped.set(key, []);
            }
            grouped.get(key).push(item);
        });

        return grouped;
    }

    /**
     * Procura o valor de um campo em um registro por palavras-chave, em vez de
     * uma chave exata. Isso torna a leitura resiliente a pequenas variações de
     * nome de coluna na planilha (ex.: "Pack DPMO" vs "Packing DPMO"),
     * diferenças de maiúsculas/minúsculas e espaços/caracteres extras (como o
     * \u00a0 que o Google Sheets às vezes insere).
     */
    getFieldValueFlexible(item, keywords) {
        const keys = Object.keys(item);
        for (const key of keys) {
            const normKey = key.toLowerCase().replace(/[\u00a0\s]+/g, ' ').trim();
            if (keywords.every(word => normKey.includes(word))) {
                const val = item[key];
                if (val !== undefined && val !== null && val !== '') {
                    return val;
                }
            }
        }
        return undefined;
    }

    /**
     * Calcula a média de um campo (localizado via palavras-chave) para os
     * registros de um único dia. Retorna '-' quando não há nenhum valor válido,
     * em vez de exibir 0 silenciosamente.
     */
    averageFieldForDay(dayItems, keywords, format = 'decimal') {
        if (dayItems.length === 0) return '-';

        let sum = 0;
        let count = 0;
        dayItems.forEach(item => {
            const raw = this.getFieldValueFlexible(item, keywords);
            const val = parseFloat(raw);
            if (!isNaN(val)) {
                sum += val;
                count++;
            }
        });

        if (count === 0) return '-';

        const avg = sum / count;
        return format === 'number' ? this.formatNumber(avg) : this.formatDecimal(avg, 2);
    }

    /**
     * Monta a série histórica combinando os dados do plano (Forecast, Capacidade)
     * com os dados realizados (Expedido, Ce Misses, Late Slam, Late Departure),
     * unindo por data. Antes, o Forecast era lido de `dataRealizado`, onde esse
     * campo não existe — por isso aparecia sempre zerado.
     */
    buildTimelineSeries() {
        const dateStartInput = document.getElementById('date-start');
        const dateEndInput = document.getElementById('date-end');

        if (!dateStartInput || !dateEndInput) return null;

        const startDate = parseInputDate(dateStartInput.value);
        const endDate = parseInputDate(dateEndInput.value, true);

        const filteredPlan = this.dataPlan.filter(item => {
            const itemDate = parseAnyDate(item.Data);
            if (!itemDate) return false;
            return itemDate >= startDate && itemDate <= endDate;
        });

        const filteredRealizado = this.dataRealizado.filter(item => {
            const itemDate = parseAnyDate(item.Data);
            if (!itemDate) return false;
            return itemDate >= startDate && itemDate <= endDate;
        });

        if (filteredPlan.length === 0 && filteredRealizado.length === 0) return null;

        // Mapas por data (chave = yyyy-mm-dd, em horário local) para permitir o merge dos dois conjuntos
        const dateKey = (date) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        };

        const planByDate = new Map();
        filteredPlan.forEach(d => {
            const date = parseAnyDate(d.Data);
            if (!date) return;
            planByDate.set(dateKey(date), d);
        });

        const realizadoByDate = new Map();
        filteredRealizado.forEach(d => {
            const date = parseAnyDate(d.Data);
            if (!date) return;
            realizadoByDate.set(dateKey(date), d);
        });

        // União de todas as datas presentes em qualquer um dos dois conjuntos
        const allDates = Array.from(new Set([...planByDate.keys(), ...realizadoByDate.keys()]))
            .map(key => new Date(`${key}T00:00:00`))
            .sort((a, b) => a - b);

        if (allDates.length === 0) return null;

        const labels = allDates.map(date => date.toLocaleDateString('pt-BR', { month: '2-digit', day: '2-digit' }));

        const getPlanValue = (date, field) => {
            const plan = planByDate.get(dateKey(date));
            return plan ? (parseFloat(plan[field]) || 0) : 0;
        };
        const getRealizadoValue = (date, field) => {
            const realizado = realizadoByDate.get(dateKey(date));
            return realizado ? (parseFloat(realizado[field]) || 0) : 0;
        };

        return {
            labels,
            forecastData: allDates.map(date => getPlanValue(date, 'Forecast')),
            capacidadeData: allDates.map(date => getPlanValue(date, 'Capacidade IPT')),
            expedidoData: allDates.map(date => getRealizadoValue(date, 'Expedidas')),
            ceMissesData: allDates.map(date => getRealizadoValue(date, 'Ce Misses')),
            lateSlamData: allDates.map(date => getRealizadoValue(date, 'Late Slam')),
            lateDepartureData: allDates.map(date => getRealizadoValue(date, 'Late Departure OB'))
        };
    }

    baseChartOptions() {
        return {
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
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const value = this.formatNumber(context.parsed.y);
                            return `${context.dataset.label}: ${value}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    ticks: {
                        color: '#94a3b8',
                        callback: (value) => this.formatNumber(value)
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
        };
    }

    updateVolumeChart() {
        if (this.volumeChart) {
            this.volumeChart.destroy();
            this.volumeChart = null;
        }

        const chartCanvas = document.getElementById('volumeChart');
        if (!chartCanvas) return;

        const series = this.buildTimelineSeries();
        if (!series) return;

        const ctx = chartCanvas.getContext('2d');
        this.volumeChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: series.labels,
                datasets: [
                    {
                        label: 'Capacidade',
                        data: series.capacidadeData,
                        borderColor: '#8b5cf6',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: false
                    },
                    {
                        label: 'Forecast',
                        data: series.forecastData,
                        borderColor: '#38bdf8',
                        backgroundColor: 'rgba(56, 189, 248, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: false
                    },
                    {
                        label: 'Expedido',
                        data: series.expedidoData,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: false
                    }
                ]
            },
            options: this.baseChartOptions()
        });
    }

    updatePerdaChart() {
        if (this.perdaChart) {
            this.perdaChart.destroy();
            this.perdaChart = null;
        }

        const chartCanvas = document.getElementById('perdaChart');
        if (!chartCanvas) return;

        const series = this.buildTimelineSeries();
        if (!series) return;

        const ctx = chartCanvas.getContext('2d');
        this.perdaChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: series.labels,
                datasets: [
                    {
                        label: 'Ce Misses',
                        data: series.ceMissesData,
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: false
                    },
                    {
                        label: 'Late Slam',
                        data: series.lateSlamData,
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: false
                    },
                    {
                        label: 'Late Departure',
                        data: series.lateDepartureData,
                        borderColor: '#ec4899',
                        backgroundColor: 'rgba(236, 72, 153, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: false
                    }
                ]
            },
            options: this.baseChartOptions()
        });
    }

    applyFilters() {
        this.updateMetrics();
        this.updateTPHTable();
        this.updateDPMOTable();
        this.updateVolumeChart();
        this.updatePerdaChart();
    }

    resetFilters() {
        this.initializeDateFilters(true); // force = true: volta para a semana atual
        this.applyFilters();
    }

    clearTPHTable() {
        const tbody = document.getElementById('tph-body');
        if (!tbody) return;

        const headerRow = document.getElementById('tph-header-row');
        const dateCols = headerRow ? headerRow.querySelectorAll('th:not(.sticky-col)').length : 7;
        const dashes = '<td>-</td>'.repeat(Math.max(dateCols, 1));

        tbody.innerHTML = ['Pick', 'Rebin', 'Pack', 'Dock']
            .map(activity => `<tr><td class="sticky-col">${activity}</td>${dashes}</tr>`)
            .join('');
    }

    clearDPMOTable() {
        const tbody = document.getElementById('dpmo-body');
        if (!tbody) return;

        const headerRow = document.getElementById('dpmo-header-row');
        const dateCols = headerRow ? headerRow.querySelectorAll('th:not(.sticky-col)').length : 7;
        const dashes = '<td>-</td>'.repeat(Math.max(dateCols, 1));

        tbody.innerHTML = ['Pick Short', 'Sort', 'Pack', 'Ship']
            .map(activity => `<tr><td class="sticky-col">${activity}</td>${dashes}</tr>`)
            .join('');
    }

    formatNumber(num) {
        return new Intl.NumberFormat('pt-BR').format(Math.round(num));
    }

    formatDecimal(num, decimals = 2) {
        return new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(num || 0);
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
