/**
 * Módulo de Auditorias por Colaborador
 */

let collaboratorFilters = {
    nome: '',
    departamento: new Set(),
    funcao: new Set(),
    status: new Set()
};

let collaboratorPeriodFilters = {
    startDate: null,
    endDate: null
};

function initializeCollaboratorFilters() {
    const nameFilter = document.querySelector('.col-excel-filter-text[data-column="nome"]');
    if (nameFilter) {
        nameFilter.addEventListener('input', (e) => {
            collaboratorFilters.nome = e.target.value.toLowerCase();
            updateCollaboratorTable();
            updateCollaboratorStats();
        });
    }

    initMultiSelect('departamento');
    initMultiSelect('funcao');
    initMultiSelect('status');

    const applyBtn = document.getElementById('apply-collab-period-filters');
    if (applyBtn) applyBtn.onclick = () => {
        const start = document.getElementById('collaborator-date-start').value;
        const end = document.getElementById('collaborator-date-end').value;
        collaboratorPeriodFilters.startDate = start ? new Date(start + 'T00:00:00') : null;
        collaboratorPeriodFilters.endDate = end ? new Date(end + 'T23:59:59') : null;
        updateCollaboratorTable();
        updateCollaboratorStats();
    };

    const resetBtn = document.getElementById('reset-collab-period-filters');
    if (resetBtn) resetBtn.onclick = () => {
        document.getElementById('collaborator-date-start').value = '';
        document.getElementById('collaborator-date-end').value = '';
        collaboratorPeriodFilters = { startDate: null, endDate: null };
        updateCollaboratorTable();
        updateCollaboratorStats();
    };

    populateCollaboratorOptions();
}

function initMultiSelect(column) {
    const wrapper = document.querySelector(`.multi-select-wrapper[data-column="${column}"]`);
    if (!wrapper) return;

    const btn = wrapper.querySelector('.multi-select-btn');
    const dropdown = wrapper.querySelector('.multi-select-dropdown');
    const searchInput = wrapper.querySelector('.multi-select-search');
    const clearBtn = wrapper.querySelector('.multi-select-clear');

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
            if (e.target.checked) collaboratorFilters[column].add(val);
            else collaboratorFilters[column].delete(val);
            updateMultiSelectLabel(column);
            updateCollaboratorTable();
            updateCollaboratorStats();
        }
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            collaboratorFilters[column].clear();
            wrapper.querySelectorAll('.multi-select-option input[type="checkbox"]').forEach(cb => cb.checked = false);
            updateMultiSelectLabel(column);
            updateCollaboratorTable();
            updateCollaboratorStats();
        });
    }
}

function updateMultiSelectLabel(column) {
    const wrapper = document.querySelector(`.multi-select-wrapper[data-column="${column}"]`);
    if (!wrapper) return;
    const labelEl = wrapper.querySelector('.multi-select-label');
    const selected = collaboratorFilters[column];
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

function populateMultiSelectOptions(column, values) {
    const wrapper = document.querySelector(`.multi-select-wrapper[data-column="${column}"]`);
    if (!wrapper) return;
    const optionsContainer = wrapper.querySelector('.multi-select-options');
    if (!optionsContainer || optionsContainer.children.length > 0) return;
    optionsContainer.innerHTML = [...values].sort().map(v =>
        `<label class="multi-select-option">
            <input type="checkbox" value="${v}"> ${v}
        </label>`
    ).join('');
}

function populateCollaboratorOptions() {
    if (!confrontoData.length) return;
    const depts = new Set();
    const funcs = new Set();

    confrontoData.forEach(item => {
        depts.add(item.DEPARTAMENTO || item.Departamento || "N/A");
        funcs.add(item.FUNÇÃO || item.Função || "COLABORADOR");
    });

    populateMultiSelectOptions('departamento', depts);
    populateMultiSelectOptions('funcao', funcs);
}

function getProcessedCollaborators() {
    return confrontoData.map(item => {
        const nome = Object.keys(item).reduce((acc, key) => {
            if (acc !== "N/A") return acc;
            if (key.trim().toUpperCase() === "NOME") {
                const valor = item[key];
                if (valor && typeof valor === 'string' && valor.trim() !== "") return valor.trim();
            }
            return "N/A";
        }, "N/A");
        const dept = item.DEPARTAMENTO || item.Departamento || "N/A";
        const funcao = item.FUNÇÃO || item.Função || "COLABORADOR";

        let realizado = 0;
        let dias = 0;
        Object.keys(item).forEach(key => {
            const d = new Date(key);
            if (!isNaN(d.getTime())) {
                if ((!collaboratorPeriodFilters.startDate || d >= collaboratorPeriodFilters.startDate) &&
                    (!collaboratorPeriodFilters.endDate || d <= collaboratorPeriodFilters.endDate)) {
                    realizado += parseInt(item[key]) || 0;
                    dias++;
                }
            }
        });

        const meta = dias * 3;
        let status = 'Sem Auditorias';
        let color = '#ef4444';
        if (realizado > 0) {
            if (realizado >= meta) { status = 'Meta Atingida'; color = '#10b981'; }
            else { status = 'Meta Não Atingida'; color = '#f59e0b'; }
        }

        return { nome, dept, funcao, realizado, meta, status, color };
    });
}

function updateCollaboratorStats() {
    const processed = getProcessedCollaborators();
    const filtered = processed.filter(item => {
        if (collaboratorFilters.nome && !item.nome.toLowerCase().includes(collaboratorFilters.nome)) return false;
        if (collaboratorFilters.departamento.size > 0 && !collaboratorFilters.departamento.has(item.dept)) return false;
        if (collaboratorFilters.funcao.size > 0 && !collaboratorFilters.funcao.has(item.funcao)) return false;
        if (collaboratorFilters.status.size > 0 && !collaboratorFilters.status.has(item.status)) return false;
        return true;
    });

    let metaAtigida = 0, metaNaoAtigida = 0, semAuditorias = 0;
    filtered.forEach(item => {
        if (item.status === 'Meta Atingida') metaAtigida++;
        else if (item.status === 'Meta Não Atingida') metaNaoAtigida++;
        else if (item.status === 'Sem Auditorias') semAuditorias++;
    });

    document.getElementById('collab-meta-atingida').textContent = metaAtigida;
    document.getElementById('collab-meta-nao-atingida').textContent = metaNaoAtigida;
    document.getElementById('collab-sem-auditorias').textContent = semAuditorias;
}

function updateCollaboratorTable() {
    const tableBody = document.getElementById('collaborator-table-body');
    if (!tableBody || !confrontoData.length) return;

    const processed = getProcessedCollaborators();
    const filtered = processed.filter(item => {
        if (collaboratorFilters.nome && !item.nome.toLowerCase().includes(collaboratorFilters.nome)) return false;
        if (collaboratorFilters.departamento.size > 0 && !collaboratorFilters.departamento.has(item.dept)) return false;
        if (collaboratorFilters.funcao.size > 0 && !collaboratorFilters.funcao.has(item.funcao)) return false;
        if (collaboratorFilters.status.size > 0 && !collaboratorFilters.status.has(item.status)) return false;
        return true;
    });

    tableBody.innerHTML = filtered.map(item => `
        <tr>
            <td>${item.nome}</td>
            <td>${item.dept}</td>
            <td>${item.funcao}</td>
            <td style="text-align:center; font-size: 0.8rem;">${collaboratorPeriodFilters.startDate ? collaboratorPeriodFilters.startDate.toLocaleDateString('pt-BR') : '--'} - ${collaboratorPeriodFilters.endDate ? collaboratorPeriodFilters.endDate.toLocaleDateString('pt-BR') : '--'}</td>
            <td style="text-align:center; font-weight:700; color:#38bdf8">${item.realizado}</td>
            <td style="text-align:center; font-weight:700">${item.meta}</td>
            <td style="padding: 1rem 1.5rem;">
                <span class="status-badge" style="background:rgba(${item.color === '#10b981' ? '16,185,129' : item.color === '#f59e0b' ? '245,158,11' : '239,68,68'}, 0.2); color:${item.color}; border:1px solid ${item.color}">
                    ${item.status}
                </span>
            </td>
        </tr>
    `).join('');
}
