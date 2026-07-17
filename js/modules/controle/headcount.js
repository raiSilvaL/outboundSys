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

        // Estado dos filtros "estilo Excel" (texto + seleção múltipla por coluna)
        this.filtersNrsAso = {
            texto: '', tipo: new Set(), funcao: new Set(), situacao: new Set(),
            setor: new Set(), statusAso: new Set(), statusNrs: new Set()
        };
        this.filtersSpot = {
            texto: '', turno: new Set(), departamento: new Set(), funcao: new Set(),
            nivel: new Set(), setor: new Set(), baseSite: new Set(), emReciclagem: new Set()
        };
        this.filtersReciclagem = {
            texto: '', tipoSolicitacao: new Set(), turno: new Set(), tipoMaquina: new Set()
        };

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadData();
    }

    /**
     * Verifica se o departamento é um dos permitidos para os cards (Outbound, Tom, Transfer Out)
     */
    isAllowedForMetrics(deptName) {
        if (!deptName) return false;
        const normalized = deptName.toString().toUpperCase().trim();
        return normalized.includes('OUTBOUND') || 
               normalized === 'TOM' || 
               normalized.includes('TRANSFER OUT');
    }

    setupEventListeners() {
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const tabName = button.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });

        const subTabButtons = document.querySelectorAll('.sub-tab-button');
        subTabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const subTabName = button.getAttribute('data-subtab');
                this.switchSubTab(subTabName);
            });
        });

        const filterNrsAso = document.getElementById('filter-nrs-aso');
        if (filterNrsAso) {
            filterNrsAso.addEventListener('input', (e) => {
                this.filtersNrsAso.texto = e.target.value.toLowerCase();
                this.updateNrsAsoTab();
            });
        }

        const filterSpot = document.getElementById('filter-spot');
        if (filterSpot) {
            filterSpot.addEventListener('input', (e) => {
                this.filtersSpot.texto = e.target.value.toLowerCase();
                this.updateSpotTab();
            });
        }

        const filterReciclagem = document.getElementById('filter-reciclagem');
        if (filterReciclagem) {
            filterReciclagem.addEventListener('input', (e) => {
                this.filtersReciclagem.texto = e.target.value.toLowerCase();
                this.updateReciclagemTab();
            });
        }

        this.setupExcelFilters();

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

    /**
     * Transforma os <th data-filter-col="..."> das tabelas de Operadores em
     * dropdowns "estilo Excel" (com checkboxes) e liga cada um ao seu estado
     * de filtro correspondente.
     */
    setupExcelFilters() {
        this.enhanceTableHeaders('nrs-aso-table', this.filtersNrsAso, () => this.updateNrsAsoTab());
        this.enhanceTableHeaders('spot-table', this.filtersSpot, () => this.updateSpotTab());
        this.enhanceTableHeaders('reciclagem-table', this.filtersReciclagem, () => this.updateReciclagemTab());
    }

    enhanceTableHeaders(tableId, filtersObj, onChange) {
        const table = document.getElementById(tableId);
        if (!table) return;
        const headers = table.querySelectorAll('thead th[data-filter-col]');
        headers.forEach(th => {
            const key = th.getAttribute('data-filter-col');
            const label = th.textContent.trim();
            th.innerHTML = `
                <div class="header-with-filter">
                    <span>${label}</span>
                    <div class="multi-select-wrapper" data-column="${key}">
                        <button class="multi-select-btn" type="button">
                            <span class="multi-select-label">(Tudo)</span>
                            <span class="multi-select-arrow">▼</span>
                        </button>
                        <div class="multi-select-dropdown">
                            <input type="text" class="multi-select-search" placeholder="Pesquisar...">
                            <div class="multi-select-options"></div>
                            <div class="multi-select-footer">
                                <button class="multi-select-clear" type="button">Limpar</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            this.initGenericMultiSelect(th.querySelector('.multi-select-wrapper'), filtersObj, key, onChange);
        });
    }

    initGenericMultiSelect(wrapper, filtersObj, key, onChange) {
        if (!wrapper) return;
        const btn = wrapper.querySelector('.multi-select-btn');
        const dropdown = wrapper.querySelector('.multi-select-dropdown');
        const searchInput = wrapper.querySelector('.multi-select-search');
        const clearBtn = wrapper.querySelector('.multi-select-clear');
        const optionsContainer = wrapper.querySelector('.multi-select-options');

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = dropdown.classList.contains('open');
            document.querySelectorAll('.multi-select-dropdown.open').forEach(d => {
                if (d !== dropdown) {
                    d.classList.remove('open');
                    const otherBtn = d.closest('.multi-select-wrapper')?.querySelector('.multi-select-btn');
                    if (otherBtn) otherBtn.classList.remove('open');
                }
            });
            dropdown.classList.toggle('open', !isOpen);
            btn.classList.toggle('open', !isOpen);
            if (!isOpen && searchInput) searchInput.focus();
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
                    opt.classList.toggle('hidden', !opt.textContent.toLowerCase().includes(q));
                });
            });
        }

        optionsContainer.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                const val = e.target.value;
                if (e.target.checked) filtersObj[key].add(val);
                else filtersObj[key].delete(val);
                this.updateGenericMultiSelectLabel(wrapper, filtersObj[key]);
                onChange();
            }
        });

        if (clearBtn) {
            clearBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                filtersObj[key].clear();
                wrapper.querySelectorAll('.multi-select-option input[type="checkbox"]').forEach(cb => cb.checked = false);
                this.updateGenericMultiSelectLabel(wrapper, filtersObj[key]);
                onChange();
            });
        }
    }

    updateGenericMultiSelectLabel(wrapper, selectedSet) {
        const labelEl = wrapper.querySelector('.multi-select-label');
        const oldBadge = wrapper.querySelector('.multi-select-count');
        if (oldBadge) oldBadge.remove();

        if (selectedSet.size === 0) labelEl.textContent = '(Tudo)';
        else if (selectedSet.size === 1) labelEl.textContent = [...selectedSet][0];
        else labelEl.textContent = `${selectedSet.size} selecionados`;

        if (selectedSet.size > 0) {
            const badge = document.createElement('span');
            badge.className = 'multi-select-count';
            badge.textContent = selectedSet.size;
            const btn = wrapper.querySelector('.multi-select-btn');
            btn.insertBefore(badge, btn.querySelector('.multi-select-arrow'));
        }
    }

    /**
     * Popula as opções (checkboxes) de um dropdown com os valores únicos
     * encontrados nos dados. Só popula uma vez (evita perder seleção do
     * usuário ao re-renderizar a tabela).
     */
    populateMultiSelectOptionsFor(tableId, key, values) {
        const wrapper = document.querySelector(`#${tableId} .multi-select-wrapper[data-column="${key}"]`);
        if (!wrapper) return;
        const optionsContainer = wrapper.querySelector('.multi-select-options');
        if (!optionsContainer || optionsContainer.children.length > 0) return;
        const unique = [...new Set(values.map(v => (v ?? '').toString().trim() || '-'))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
        optionsContainer.innerHTML = unique.map(v =>
            `<label class="multi-select-option"><input type="checkbox" value="${v}"> ${v}</label>`
        ).join('');
    }


    switchTab(tabName) {
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        const tab = document.getElementById(`tab-${tabName}`);
        if (tab) tab.classList.add('active');
        const button = document.querySelector(`[data-tab="${tabName}"]`);
        if (button) button.classList.add('active');
        if (tabName === 'operadores') this.switchSubTab('nrs-aso');
        if (tabName === 'operadores') {
            setTimeout(() => {
                if (this.spotTurnoChart) this.spotTurnoChart.resize();
                if (this.spotBaseChart) this.spotBaseChart.resize();
            }, 100);
        }
    }

    switchSubTab(subTabName) {
        document.querySelectorAll('.sub-tab-content').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.sub-tab-button').forEach(btn => btn.classList.remove('active'));
        const subTab = document.getElementById(`subtab-${subTabName}`);
        if (subTab) subTab.classList.add('active');
        const button = document.querySelector(`[data-subtab="${subTabName}"]`);
        if (button) button.classList.add('active');
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

            const responseResumo = await fetch(`${this.apiUrl}?aba=data_base_resumo`);
            if (!responseResumo.ok) throw new Error(`Erro ao carregar resumo: ${responseResumo.status}`);
            this.dataResumo = await responseResumo.json();

            const responseOpsNrs = await fetch(`${this.apiUrl}?aba=data_base_ops_nrs`);
            if (!responseOpsNrs.ok) throw new Error(`Erro ao carregar ops NRs: ${responseOpsNrs.status}`);
            this.dataOpsNrs = await responseOpsNrs.json();

            const responseSpot = await fetch(`${this.apiUrl}?aba=data_base_spot_lista`);
            if (!responseSpot.ok) throw new Error(`Erro ao carregar spot: ${responseSpot.status}`);
            this.dataSpot = await responseSpot.json();

            const responseReciclagem = await fetch(`${this.apiUrl}?aba=data_base_reciclagem_lista`);
            if (!responseReciclagem.ok) throw new Error(`Erro ao carregar reciclagem: ${responseReciclagem.status}`);
            this.dataReciclagem = await responseReciclagem.json();

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



        // Calcular métricas baseadas nas somas das células específicas
        // Os índices foram ajustados conforme o retorno real da API (JSON):
        // Linha 6 da planilha = Índice 4 no array
        // Linha 12 da planilha = Índice 10 no array
        // Linha 18 da planilha = Índice 16 no array
        
        // HC total = d6 + d12 + d18
        const hcD6 = parseInt(this.dataResumo[4]?.['HC Atual (TOTAL)'] || 0);
        const hcD12 = parseInt(this.dataResumo[10]?.['HC Atual (TOTAL)'] || 0);
        const hcD18 = parseInt(this.dataResumo[16]?.['HC Atual (TOTAL)'] || 0);
        const totalHC = hcD6 + hcD12 + hcD18;

        // Assistentes ativos = h6 + h12 + h18
        const assistH6 = parseInt(this.dataResumo[4]?.['ASSISTENTE ATIVOS'] || 0);
        const assistH12 = parseInt(this.dataResumo[10]?.['ASSISTENTE ATIVOS'] || 0);
        const assistH18 = parseInt(this.dataResumo[16]?.['ASSISTENTE ATIVOS'] || 0);
        const totalAssistentes = assistH6 + assistH12 + assistH18;

        // Operadores ativos = n6 + n12 + n18
        const opN6 = parseInt(this.dataResumo[4]?.['ATIVOS OPERADOR'] || 0);
        const opN12 = parseInt(this.dataResumo[10]?.['ATIVOS OPERADOR'] || 0);
        const opN18 = parseInt(this.dataResumo[16]?.['ATIVOS OPERADOR'] || 0);
        const totalOperadores = opN6 + opN12 + opN18;

        // Operadores spot = o6 + o12 + o18
        const spotO6 = parseInt(this.dataResumo[4]?.['ATIVOS OPERADOR SPOT'] || 0);
        const spotO12 = parseInt(this.dataResumo[10]?.['ATIVOS OPERADOR SPOT'] || 0);
        const spotO18 = parseInt(this.dataResumo[16]?.['ATIVOS OPERADOR SPOT'] || 0);
        const totalSpot = spotO6 + spotO12 + spotO18;

        // NRs vencidas = t6 + t12 + t18
        const nrsT6 = parseInt(this.dataResumo[4]?.['NR VENCIDA OPERADOR'] || 0);
        const nrsT12 = parseInt(this.dataResumo[10]?.['NR VENCIDA OPERADOR'] || 0);
        const nrsT18 = parseInt(this.dataResumo[16]?.['NR VENCIDA OPERADOR'] || 0);
        const totalNrsVencidas = nrsT6 + nrsT12 + nrsT18;

        // ASOs vencidas = s6 + s12 + s18
        const asosS6 = parseInt(this.dataResumo[4]?.['ASO VENCIDO OPERADOR'] || 0);
        const asosS12 = parseInt(this.dataResumo[10]?.['ASO VENCIDO OPERADOR'] || 0);
        const asosS18 = parseInt(this.dataResumo[16]?.['ASO VENCIDO OPERADOR'] || 0);
        const totalAsosVencidas = asosS6 + asosS12 + asosS18;

        // Atualizar cards
        this.updateMetricCard('metric-hc-total', totalHC);
        this.updateMetricCard('metric-assistentes', totalAssistentes);
        this.updateMetricCard('metric-operadores', totalOperadores);
        this.updateMetricCard('metric-spot', totalSpot);
        this.updateMetricCard('metric-nrs-vencidas', totalNrsVencidas);
        this.updateMetricCard('metric-asos-vencidas', totalAsosVencidas);

        // Renderizar a tabela com TODOS os dados originais (sem filtro na visualização)
        this.renderQuadroTable();
    }

    renderQuadroTable() {
        const tbody = document.getElementById('quadro-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        // Linhas "separadoras" vindas da planilha (todas as colunas com "-")
        // servem apenas de espaçamento entre os blocos de turno e não devem
        // aparecer na tabela. this.dataResumo NÃO é alterado aqui, pois
        // outros cálculos (cards, hcD6/hcD12/hcD18 etc.) dependem dos
        // índices originais das linhas.
        const camposVerificados = [
            'Turno', 'HC Atual (TOTAL)', 'COORDENADOR', 'LIDER', 'P.A',
            'ASSISTENTE ATIVOS', 'AF/AB ASSISTENTE', 'TRABALHO EXTERNO ASSISTENTE',
            'FÉRIAS ASSISTENTE', 'P.S', 'ATIVOS OPERADOR', 'ATIVOS OPERADOR SPOT',
            'AF/AB OPERADOR', 'TRABALHO EXTERNO OPERADOR', 'FÉRIAS OPERADOR',
            'NR VENCIDA OPERADOR', 'ASO VENCIDO OPERADOR', 'PENDENTE DE RECI. OPERADOR'
        ];
        const isLinhaSeparadora = (row) => camposVerificados.every(campo => {
            const valor = (row[campo] ?? '').toString().trim();
            return valor === '' || valor === '-';
        });

        // Calcula quantas linhas seguidas pertencem ao mesmo departamento,
        // para mesclar (rowspan) a primeira coluna e mostrar o nome apenas uma vez.
        // Linhas sem DEPARTAMENTO (ex.: linhas de total/subtotal) "herdam" o
        // departamento da linha anterior, para continuarem dentro do mesmo grupo
        // mescladao invés de abrirem um novo grupo mostrando "-".
        const rows = this.dataResumo.filter(row => !isLinhaSeparadora(row));
        const effectiveDeptRef = [];
        for (let i = 0; i < rows.length; i++) {
            const raw = (rows[i]['DEPARTAMENTO'] || '').toString().trim();
            effectiveDeptRef[i] = (raw && raw !== '-') ? raw : (i > 0 ? effectiveDeptRef[i - 1] : '-');
        }

        const rowspanCount = new Array(rows.length).fill(0);
        for (let i = 0; i < rows.length; i++) {
            const dept = effectiveDeptRef[i];
            const prevDept = i > 0 ? effectiveDeptRef[i - 1] : null;
            if (dept === prevDept) {
                continue;
            }
            let count = 1;
            while (i + count < rows.length && effectiveDeptRef[i + count] === dept) {
                count++;
            }
            rowspanCount[i] = count;
        }

        rows.forEach((row, index) => {
            const tr = document.createElement('tr');
            const dept = effectiveDeptRef[index];
            const prevDept = index > 0 ? effectiveDeptRef[index - 1] : null;
            const isGroupStart = dept !== prevDept;

            const deptCellHtml = isGroupStart
                ? `<td class="sticky-col dept-merged-cell" rowspan="${rowspanCount[index]}">${dept}</td>`
                : '';

            tr.innerHTML = `
                ${deptCellHtml}
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
        if (this.dataOpsNrs.length === 0) return;

        this.populateMultiSelectOptionsFor('nrs-aso-table', 'tipo', this.dataOpsNrs.map(d => d['TIPO']));
        this.populateMultiSelectOptionsFor('nrs-aso-table', 'funcao', this.dataOpsNrs.map(d => d['FUNÇÃO']));
        this.populateMultiSelectOptionsFor('nrs-aso-table', 'situacao', this.dataOpsNrs.map(d => d['SITUAÇÃO']));
        this.populateMultiSelectOptionsFor('nrs-aso-table', 'setor', this.dataOpsNrs.map(d => d['DEPARTAMENTO']));
        this.populateMultiSelectOptionsFor('nrs-aso-table', 'statusAso', this.dataOpsNrs.map(d => d['Status Periódico']));
        this.populateMultiSelectOptionsFor('nrs-aso-table', 'statusNrs', this.dataOpsNrs.map(d =>
            (d['PASSOU NR11/12'] === 'NÃO' || d['PASSOU NR35'] === 'NÃO') ? 'Vencida' : 'OK'
        ));

        const filteredBase = this.getFilteredNrsAsoBase();
        const filteredForCards = filteredBase.filter(d => this.isAllowedForMetrics(d['DEPARTAMENTO']));

        const totalOps = filteredForCards.length;
        const nrsVencidas = filteredForCards.filter(d => d['PASSOU NR11/12'] === 'NÃO' || d['PASSOU NR35'] === 'NÃO').length;
        const asosSemDado = filteredForCards.filter(d => d['Status Periódico'] === 'Sem dados').length;
        const asosVencendo = filteredForCards.filter(d => d['Status Periódico'] === 'Vencendo').length;

        this.updateMetricCard('metric-ops-nrs-total', totalOps);
        this.updateMetricCard('metric-nrs-vencidas-ops', nrsVencidas);
        this.updateMetricCard('metric-asos-sem-dado', asosSemDado);
        this.updateMetricCard('metric-asos-vencendo', asosVencendo);

        this.renderNrsAsoTable(filteredBase);
    }

    /**
     * Aplica apenas os filtros do usuário (texto + colunas), sem a
     * restrição de departamento usada nos cards, preservando o
     * comportamento original da tabela (mostra todos os departamentos
     * salvo quando o usuário filtra por "Setor").
     */
    getFilteredNrsAsoBase() {
        const f = this.filtersNrsAso;
        const norm = (v) => (v ?? '').toString().trim() || '-';
        return this.dataOpsNrs.filter(d => {
            if (f.texto) {
                const text = Object.values(d).join(' ').toLowerCase();
                if (!text.includes(f.texto)) return false;
            }
            if (f.tipo.size && !f.tipo.has(norm(d['TIPO']))) return false;
            if (f.funcao.size && !f.funcao.has(norm(d['FUNÇÃO']))) return false;
            if (f.situacao.size && !f.situacao.has(norm(d['SITUAÇÃO']))) return false;
            if (f.setor.size && !f.setor.has(norm(d['DEPARTAMENTO']))) return false;
            if (f.statusAso.size && !f.statusAso.has(norm(d['Status Periódico']))) return false;
            if (f.statusNrs.size) {
                const statusNrs = (d['PASSOU NR11/12'] === 'NÃO' || d['PASSOU NR35'] === 'NÃO') ? 'Vencida' : 'OK';
                if (!f.statusNrs.has(statusNrs)) return false;
            }
            return true;
        });
    }

    renderNrsAsoTable(data) {
        const tbody = document.getElementById('nrs-aso-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#64748b;">Nenhum resultado encontrado</td></tr>`;
            return;
        }
        data.forEach((row, index) => {
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
        if (this.dataSpot.length === 0) return;

        // Remove linhas "vazias" (todas as colunas relevantes com "-" ou em branco),
        // que não representam operadores reais.
        const dataSpotValido = this.getSpotRowsValidas();

        this.populateMultiSelectOptionsFor('spot-table', 'turno', dataSpotValido.map(d => d['TURNO']));
        this.populateMultiSelectOptionsFor('spot-table', 'departamento', dataSpotValido.map(d => d['DEPARTAMENTO']));
        this.populateMultiSelectOptionsFor('spot-table', 'funcao', dataSpotValido.map(d => d['FUNÇÃO']));
        this.populateMultiSelectOptionsFor('spot-table', 'nivel', dataSpotValido.map(d => d['NÍVEL']));
        this.populateMultiSelectOptionsFor('spot-table', 'setor', dataSpotValido.map(d => d['SETOR']));
        this.populateMultiSelectOptionsFor('spot-table', 'baseSite', dataSpotValido.map(d => d['BASE/SITE']));
        this.populateMultiSelectOptionsFor('spot-table', 'emReciclagem', dataSpotValido.map(d => d['EM RECICLAGEM']));

        const filteredBase = this.getFilteredSpotBase(dataSpotValido);
        const filteredForCards = filteredBase.filter(d => this.isAllowedForMetrics(d['DEPARTAMENTO']));

        const spotOB = filteredForCards.filter(d => (d['DEPARTAMENTO'] || '').toUpperCase().includes('OUTBOUND')).length;
        const spotTransfer = filteredForCards.filter(d => (d['DEPARTAMENTO'] || '').toUpperCase().includes('TRANSFER OUT')).length;
        const spotReciclagem = filteredForCards.filter(d => d['EM RECICLAGEM'] === 'Sim').length;

        this.updateMetricCard('metric-spot-ob', spotOB);
        this.updateMetricCard('metric-spot-transfer', spotTransfer);
        this.updateMetricCard('metric-spot-reciclagem', spotReciclagem);

        this.renderSpotTable(filteredBase);
        this.updateSpotCharts(filteredBase);
    }

    /**
     * Filtra linhas da lista Spot que vêm em branco (todas as colunas com
     * "-" ou vazio) na planilha de origem e não representam operadores.
     */
    getSpotRowsValidas() {
        const campos = ['NOME', 'TURNO', 'DEPARTAMENTO', 'FUNÇÃO', 'NÍVEL', 'SETOR', 'BASE/SITE', 'EM RECICLAGEM'];
        return this.dataSpot.filter(row => {
            return campos.some(campo => {
                const valor = (row[campo] ?? '').toString().trim();
                return valor !== '' && valor !== '-';
            });
        });
    }

    getFilteredSpotBase(dataSpotValido) {
        const f = this.filtersSpot;
        const norm = (v) => (v ?? '').toString().trim() || '-';
        return dataSpotValido.filter(d => {
            if (f.texto) {
                const text = Object.values(d).join(' ').toLowerCase();
                if (!text.includes(f.texto)) return false;
            }
            if (f.turno.size && !f.turno.has(norm(d['TURNO']))) return false;
            if (f.departamento.size && !f.departamento.has(norm(d['DEPARTAMENTO']))) return false;
            if (f.funcao.size && !f.funcao.has(norm(d['FUNÇÃO']))) return false;
            if (f.nivel.size && !f.nivel.has(norm(d['NÍVEL']))) return false;
            if (f.setor.size && !f.setor.has(norm(d['SETOR']))) return false;
            if (f.baseSite.size && !f.baseSite.has(norm(d['BASE/SITE']))) return false;
            if (f.emReciclagem.size && !f.emReciclagem.has(norm(d['EM RECICLAGEM']))) return false;
            return true;
        });
    }

    renderSpotTable(data) {
        const tbody = document.getElementById('spot-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:#64748b;">Nenhum resultado encontrado</td></tr>`;
            return;
        }
        data.forEach((row, index) => {
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

    updateSpotCharts(data) {
        const turnoData = this.groupByField(data, 'TURNO');
        this.createDoughnutChart('spotTurnoChart', turnoData, 'Distribuição por Turno');
        const baseData = this.groupByField(data, 'BASE/SITE');
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
        if (canvasId === 'spotTurnoChart' && this.spotTurnoChart) this.spotTurnoChart.destroy();
        else if (canvasId === 'spotBaseChart' && this.spotBaseChart) this.spotBaseChart.destroy();

        const chart = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{ data: values, backgroundColor: colors, borderWidth: 0 }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 20, font: { size: 12 } } },
                    title: { display: true, text: title, color: '#f8fafc', font: { size: 16, weight: 'bold' }, padding: { bottom: 20 } },
                    tooltip: { callbacks: { label: (context) => `${context.label}: ${context.parsed}` } }
                }
            }
        });
        if (canvasId === 'spotTurnoChart') this.spotTurnoChart = chart;
        else if (canvasId === 'spotBaseChart') this.spotBaseChart = chart;
    }

    generateColors(count) {
        const colors = ['#38bdf8', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#14b8a6', '#f97316', '#6366f1'];
        const result = [];
        for (let i = 0; i < count; i++) result.push(colors[i % colors.length]);
        return result;
    }

    updateReciclagemTab() {
        if (this.dataReciclagem.length === 0) return;

        this.populateMultiSelectOptionsFor('reciclagem-table', 'tipoSolicitacao', this.dataReciclagem.map(d => d['Tipo de Solicitação']));
        this.populateMultiSelectOptionsFor('reciclagem-table', 'turno', this.dataReciclagem.map(d => d['Turno']));
        this.populateMultiSelectOptionsFor('reciclagem-table', 'tipoMaquina', this.dataReciclagem.map(d => d['Tipo de Máquina']));

        let pendentes = this.dataReciclagem.filter(d => d['Liberado Reciclagem'] === 'Não');
        pendentes = this.getFilteredReciclagem(pendentes);

        this.updateMetricCard('metric-reciclagem-pendentes', pendentes.length);
        pendentes.sort((a, b) => this.parseExcelDate(a['Data/Hora Ocorrido']) - this.parseExcelDate(b['Data/Hora Ocorrido']));
        this.renderReciclagemTable(pendentes);
    }

    getFilteredReciclagem(data) {
        const f = this.filtersReciclagem;
        const norm = (v) => (v ?? '').toString().trim() || '-';
        return data.filter(d => {
            if (f.texto) {
                const text = Object.values(d).join(' ').toLowerCase();
                if (!text.includes(f.texto)) return false;
            }
            if (f.tipoSolicitacao.size && !f.tipoSolicitacao.has(norm(d['Tipo de Solicitação']))) return false;
            if (f.turno.size && !f.turno.has(norm(d['Turno']))) return false;
            if (f.tipoMaquina.size && !f.tipoMaquina.has(norm(d['Tipo de Máquina']))) return false;
            return true;
        });
    }

    renderReciclagemTable(data) {
        const tbody = document.getElementById('reciclagem-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#64748b;">Nenhum resultado encontrado</td></tr>`;
            return;
        }
        data.forEach(row => {
            const tr = document.createElement('tr');
            const dataOcorrencia = this.formatExcelDate(row['Data/Hora Ocorrido']);
            const liberado = row['Liberado Reciclagem'] === 'Sim' ? 'Sim' : 'Não';
            tr.innerHTML = `
                <td class="sticky-col">${row['Status'] || '-'}</td>
                <td style="cursor: pointer; color: #38bdf8; text-decoration: underline;" data-nome="${row['Nome Funcionário']}" class="reciclagem-nome-link">${row['Nome Funcionário'] || '-'}</td>
                <td>${row['Tipo de Solicitação'] || '-'}</td>
                <td>${row['Turno'] || '-'}</td>
                <td>${row['Tipo de Máquina'] || '-'}</td>
                <td>${dataOcorrencia}</td>
                <td>${liberado}</td>
            `;
            const nameLink = tr.querySelector('.reciclagem-nome-link');
            if (nameLink) nameLink.addEventListener('click', () => this.openReciclagemModal(row));
            tbody.appendChild(tr);
        });
    }

    openReciclagemModal(row) {
        const modal = document.getElementById('reciclagem-modal');
        if (!modal) return;
        document.getElementById('modal-reciclagem-nome').textContent = row['Nome Funcionário'] || '-';
        document.getElementById('modal-reciclagem-local').textContent = row['Local'] || '-';
        document.getElementById('modal-reciclagem-axyma').textContent = row['AXYMA Aplicado'] || '-';
        document.getElementById('modal-reciclagem-motivo').textContent = row['Motivo Não Liberação'] || '-';
        document.getElementById('modal-reciclagem-obs').textContent = row['Obs Não Liberação'] || '-';
        document.getElementById('modal-reciclagem-data-prevista').textContent = this.formatExcelDate(row['Data prevista para devolutiva']);
        modal.style.display = 'flex';
    }

    closeReciclagemModal() {
        const modal = document.getElementById('reciclagem-modal');
        if (modal) modal.style.display = 'none';
    }

    parseExcelDate(excelDate) {
        if (!excelDate) return new Date();
        if (typeof excelDate === 'string') return parseAnyDate(excelDate) || new Date();
        const excelEpoch = new Date(1900, 0, 1);
        return new Date(excelEpoch.getTime() + excelDate * 24 * 60 * 60 * 1000);
    }

    formatExcelDate(excelDate) {
        return this.parseExcelDate(excelDate).toLocaleDateString('pt-BR');
    }

    updateMetricCard(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) element.textContent = this.formatNumber(value);
    }

    formatNumber(num) {
        return new Intl.NumberFormat('pt-BR').format(Math.round(num));
    }

    showLoading(show) {
        const spinner = document.getElementById('loading-spinner-headcount');
        if (spinner) spinner.classList.toggle('active', show);
    }

    showError(message) {
        const loadingText = document.getElementById('loading-text-headcount');
        if (loadingText) {
            loadingText.textContent = message;
            loadingText.style.color = '#ef4444';
        }
    }
}

window.HeadCountModule = HeadCountModule;
