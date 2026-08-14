/**
 * Exportação Consolidada — Auditorias HSE + Apollo
 * Usado tanto em auditHse.html quanto em auditApollo.html.
 * Busca as duas bases de forma independente da tela em que o usuário está,
 * para que a exportação sempre traga os dois tipos de auditoria juntos.
 */

const CONSOLIDATED_HSE_URL = "https://script.google.com/macros/s/AKfycbzY_J3ODgUI6VTpCgzoBcw-RzImTlxDjzOlgxY5HQ3F4EK8aNQl25K2FqW13LGG-Eb77Q/exec?aba=Query";
const CONSOLIDATED_APOLLO_URL = "https://script.google.com/macros/s/AKfycbzY_J3ODgUI6VTpCgzoBcw-RzImTlxDjzOlgxY5HQ3F4EK8aNQl25K2FqW13LGG-Eb77Q/exec?aba=Query%20Apollo";
const CONSOLIDATED_BASE_URL = "https://script.google.com/macros/s/AKfycbzY_J3ODgUI6VTpCgzoBcw-RzImTlxDjzOlgxY5HQ3F4EK8aNQl25K2FqW13LGG-Eb77Q/exec?aba=Base Outbond Realizado";
let consolidatedRequiredDataPromise = null;
let consolidatedBaseDataPromise = null;
let consolidatedBaseResult = null;

function isValidConsolidatedDate(value) {
    return value instanceof Date && !isNaN(value.getTime());
}

function formatConsolidatedDate(value, options) {
    return isValidConsolidatedDate(value) ? value.toLocaleDateString('pt-BR', options) : '--';
}

function getConsolidatedDefaultPeriod() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(23, 59, 59, 999);
    const start = new Date(yesterday);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return { start, end: yesterday };
}

function normalizeConsolidatedDepartment(value) {
    const normalized = String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[\s_-]+/g, '');
    if (normalized === 'OUTBOUND') return 'Outbound';
    if (normalized === 'TRANSPORTE' || normalized === 'TRANSPORT') return 'Transporte';
    if (normalized === 'TRANSFEROUT') return 'TransferOut';
    return String(value || '').trim();
}

function getConsolidatedDepartmentValue(item) {
    return item.Departamento || item.DEPARTAMENTO || item.Warehouse || item.WAREHOUSE || item['Warehouse'] || '';
}

function getConsolidatedFunctionValue(item) {
    return String(item['Função'] || item.Função || item.FUNÇÃO || item.funcao || '').trim();
}

function consolidatedPersonKey(value) {
    return String(value ?? '').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]/g, '');
}

function getConsolidatedDateValue(item, dateField) {
    const candidates = [item?.[dateField], item?.Data, item?.['Início'], item?.Inicio, item?.['Created At'], item?.ID];
    for (const candidate of candidates) {
        const parsed = parseAnyDate(candidate);
        if (isValidConsolidatedDate(parsed)) return parsed;
    }
    return null;
}

function enrichConsolidatedHseRows(hseRows, peopleRows) {
    if (!Array.isArray(peopleRows) || !peopleRows.length) return hseRows;
    const byCpf = new Map();
    const byName = new Map();
    peopleRows.forEach(person => {
        const cpf = consolidatedPersonKey(person.CPF || person.Cpf || person.cpf);
        const name = consolidatedPersonKey(person.NOME || person.Nome || person.nome);
        if (cpf) byCpf.set(cpf, person);
        if (name) byName.set(name, person);
    });
    return hseRows.map(row => {
        const currentDepartment = String(getConsolidatedDepartmentValue(row) || '').trim();
        const currentFunction = String(getConsolidatedFunctionValue(row) || '').trim();
        const cpfKey = consolidatedPersonKey(row.CPF || row.Cpf || row.cpf);
        const nameKey = consolidatedPersonKey(row.Usuário || row.Usuario || row.NOME || row.Nome || row.nome);
        const person = (cpfKey && byCpf.get(cpfKey)) || (nameKey && byName.get(nameKey));
        if (!person) return row;
        const department = currentDepartment && !['#N/A', 'N/A', 'NA'].includes(currentDepartment.toUpperCase()) ? currentDepartment : (person.DEPARTAMENTO || person.Departamento || '');
        const func = currentFunction && !['#N/A', 'N/A', 'NA'].includes(currentFunction.toUpperCase()) ? currentFunction : (person['FUNÇÃO'] || person['Função'] || person.FUNCAO || '');
        return { ...row, Departamento: department, 'Função': func };
    });
}

function getConsolidatedSelectedValues(element) {
    if (!element) return [];
    if (element.multiple) return [...element.selectedOptions].map(option => option.value.trim()).filter(Boolean);
    return element.value?.trim() ? [element.value.trim()] : [];
}

function getConsolidatedMultiSelectValues(filterName) {
    return [...document.querySelectorAll(`.consolidated-multi-select[data-filter="${filterName}"] input[type="checkbox"]:checked`)]
        .map(input => input.value.trim()).filter(Boolean);
}

function updateConsolidatedMultiSelectLabel(wrapper) {
    if (!wrapper) return;
    const selected = [...wrapper.querySelectorAll('input[type="checkbox"]:checked')].map(input => input.value);
    const label = wrapper.querySelector('.multi-select-label');
    const btn = wrapper.querySelector('.multi-select-btn');
    const existingBadge = btn?.querySelector('.multi-select-count');
    if (existingBadge) existingBadge.remove();
    if (label) label.textContent = selected.length === 0 ? '(Tudo)' : selected.length === 1 ? selected[0] : `${selected.length} selecionados`;
    if (btn && selected.length > 1) {
        const badge = document.createElement('span');
        badge.className = 'multi-select-count';
        badge.textContent = selected.length;
        btn.insertBefore(badge, btn.querySelector('.multi-select-arrow'));
    }
}

function getConsolidatedActiveFilters() {
    const departments = getConsolidatedMultiSelectValues('department');
    const functions = getConsolidatedMultiSelectValues('function');
    const dateStartEl = document.getElementById('date-start');
    const dateEndEl = document.getElementById('date-end');
    const explicit = window.__auditFiltersExplicit === true;
    let start = dateStartEl?.value ? new Date(`${dateStartEl.value}T00:00:00`) : null;
    let end = dateEndEl?.value ? new Date(`${dateEndEl.value}T23:59:59.999`) : null;
    if (!isValidConsolidatedDate(start)) start = null;
    if (!isValidConsolidatedDate(end)) end = null;

    // Padrão: os sete dias completos anteriores, sempre sem incluir hoje.
    if (!explicit && !start && !end) {
        const period = getConsolidatedDefaultPeriod();
        start = period.start;
        end = period.end;
    }
    return { department: departments.length === 1 ? departments[0] : '', departments, functions, start, end, explicit };
}

function applyConsolidatedFilters(items, dateField, filters) {
    return items.filter(item => {
        const department = normalizeConsolidatedDepartment(getConsolidatedDepartmentValue(item));
        const date = getConsolidatedDateValue(item, dateField);

        const departments = (filters.departments?.length ? filters.departments : (filters.department ? [filters.department] : [])).map(normalizeConsolidatedDepartment);
        if (departments.length && !departments.includes(department)) return false;
        if (filters.functions?.length && !filters.functions.includes(getConsolidatedFunctionValue(item))) return false;
        if (filters.start && (!date || date < filters.start)) return false;
        if (filters.end && (!date || date > filters.end)) return false;
        return true;
    });
}

async function fetchConsolidatedJson(url) {
    const response = await fetchWithTimeout(url, { timeout: 60000 });
    if (!response.ok) throw new Error(`Resposta inválida da fonte (${response.status})`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('A fonte retornou um formato de dados inválido.');
    return data;
}

function assertConsolidatedSources(hseError, apolloError, baseError = false, details = {}) {
    if (!hseError && !apolloError && !baseError) return;
    const missing = [hseError ? `HSE (${details.hse || 'falha desconhecida'})` : '', apolloError ? `Apollo (${details.apollo || 'falha desconhecida'})` : '', baseError ? `Base de colaboradores (${details.base || 'falha desconhecida'})` : ''].filter(Boolean).join(' e ');
    throw new Error(`Não foi possível carregar: ${missing}. A exportação conjunta foi cancelada para evitar dados incompletos.`);
}

async function fetchConsolidatedData(activeFilters = null) {
    // HSE e Apollo são fontes obrigatórias. A base de colaboradores é auxiliar e
    // não pode bloquear a imagem caso esteja lenta ou indisponível.
    if (!consolidatedRequiredDataPromise) {
        consolidatedRequiredDataPromise = Promise.allSettled([
            fetchConsolidatedJson(CONSOLIDATED_HSE_URL),
            fetchConsolidatedJson(CONSOLIDATED_APOLLO_URL)
        ]);
    }
    if (!consolidatedBaseDataPromise) {
        consolidatedBaseDataPromise = fetchConsolidatedJson(CONSOLIDATED_BASE_URL)
            .then(value => { consolidatedBaseResult = { status: 'fulfilled', value }; return consolidatedBaseResult; })
            .catch(reason => { consolidatedBaseResult = { status: 'rejected', reason }; return consolidatedBaseResult; });
    }
    const [hseResult, apolloResult] = await consolidatedRequiredDataPromise;
    const baseResult = await consolidatedBaseDataPromise;

        const rawHse = hseResult.status === 'fulfilled' && Array.isArray(hseResult.value) ? hseResult.value : [];
        const rawApollo = apolloResult.status === 'fulfilled' && Array.isArray(apolloResult.value) ? apolloResult.value : [];
        const base = baseResult?.status === 'fulfilled' && Array.isArray(baseResult.value) ? baseResult.value : [];
        const enrichedHse = enrichConsolidatedHseRows(rawHse, base);
        const filters = activeFilters || getConsolidatedActiveFilters();

        return {
            // O dashboard conjunto usa exatamente os mesmos filtros visíveis na tela individual.
            hse: applyConsolidatedFilters(enrichedHse, 'Data', filters),
        apollo: applyConsolidatedFilters(rawApollo, 'Created At', filters),
        base,
        hseError: hseResult.status === 'rejected',
        apolloError: apolloResult.status === 'rejected',
        baseError: baseResult?.status === 'rejected',
        basePending: !baseResult,
        hseErrorMessage: hseResult.status === 'rejected' ? (hseResult.reason?.message || 'falha desconhecida') : '',
        apolloErrorMessage: apolloResult.status === 'rejected' ? (apolloResult.reason?.message || 'falha desconhecida') : '',
        baseErrorMessage: baseResult?.status === 'rejected' ? (baseResult.reason?.message || 'falha desconhecida') : '',
        filters
    };
}

/**
 * Normaliza os dois schemas (HSE: Data/Usuário/Formulário/Score/Conformidades;
 * Apollo: Created At/Nome/Warehouse/Tipo Auditoria) em um conjunto único de colunas.
 */
function buildConsolidatedRows(hse, apollo) {
    const rows = [];

    hse.forEach(item => {
        const d = parseAnyDate(item.Data);
        rows.push({
            tipoAuditoria: 'HSE',
            departamento: item.Departamento || '',
            nome: item.Usuário || '',
            funcao: '',
            formulario: item.Formulário || '',
            warehouse: '',
            areaAuditora: '',
            score: item.Score || '',
            conformidades: item.Conformidades ?? '',
            naoConformidades: item['Não Conformidades'] ?? '',
            data: d ? d.toLocaleString('pt-BR') : (item.Data || '')
        });
    });

    apollo.forEach(item => {
        const d = parseAnyDate(item['Created At']);
        rows.push({
            tipoAuditoria: 'Apollo',
            departamento: item.Departamento || '',
            nome: item.Nome || '',
            funcao: item['Função'] || '',
            formulario: item['Tipo Auditoria'] || '',
            warehouse: item.Warehouse || '',
            areaAuditora: item['Selecione A área Auditora:'] || '',
            score: '',
            conformidades: '',
            naoConformidades: '',
            data: d ? d.toLocaleString('pt-BR') : (item['Created At'] || '')
        });
    });

    return rows;
}

function getConsolidatedHeaders() {
    return ['Tipo de Auditoria', 'Departamento', 'Nome', 'Função', 'Formulário/Tipo', 'Warehouse', 'Área Auditora', 'Score', 'Conformidades', 'Não Conformidades', 'Data'];
}

function rowsToArray(rows) {
    return rows.map(r => [
        r.tipoAuditoria, r.departamento, r.nome, r.funcao, r.formulario,
        r.warehouse, r.areaAuditora, r.score, r.conformidades, r.naoConformidades, r.data
    ]);
}

function getConsolidatedFilterSummary() {
    const filters = getConsolidatedActiveFilters();
    const parts = [];
    if (filters.department) parts.push(`Departamento: ${filters.department}`);
    if (isValidConsolidatedDate(filters.start)) parts.push(`De: ${formatConsolidatedDate(filters.start)}`);
    if (isValidConsolidatedDate(filters.end)) parts.push(`Até: ${formatConsolidatedDate(filters.end)}`);
    if (parts.length) return parts.join(' • ');
    return filters.explicit ? 'Todos os períodos' : 'Últimos 7 dias';
}

function setConsolidatedBtnLoading(btn, loading, originalText) {
    if (!btn) return;
    btn.disabled = loading;
    btn.textContent = loading ? 'Gerando...' : originalText;
}

/* ---------------- Excel ---------------- */

async function exportConsolidatedExcel() {
    const btn = document.getElementById('export-consolidated-excel-btn');
    setConsolidatedBtnLoading(btn, true);
    try {
        const { hse, apollo, base, hseError, apolloError, baseError, baseErrorMessage, filters } = await fetchConsolidatedData();
        assertConsolidatedSources(hseError, apolloError, baseError, { base: baseErrorMessage });
        if (!Array.isArray(base) || !base.length) throw new Error('A base de colaboradores está vazia; não é possível montar as três abas por colaborador.');

        const active = filters || getConsolidatedActiveFilters();
        const start = isValidConsolidatedDate(active.start) ? new Date(active.start) : null;
        const end = isValidConsolidatedDate(active.end) ? new Date(active.end) : null;
        if (!start || !end) throw new Error('O período do filtro não está definido.');
        start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999);

        const dayKeys = [];
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            dayKeys.push(new Date(d).toISOString().slice(0, 10));
        }
        const dayLabel = iso => { const [y, m, d] = iso.split('-'); return `${d}/${m}`; };
        const periodLabel = `${formatConsolidatedDate(start)} — ${formatConsolidatedDate(end)}`;
        const normalizeKey = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        const keyOf = item => {
            const cpf = item?.CPF ?? item?.['CPF Colaborador'] ?? item?.['CPF COLABORADOR'];
            const nome = item?.NOME ?? item?.Nome ?? item?.['Usuário'] ?? item?.['Nome Completo'];
            return normalizeKey(cpf) || normalizeKey(nome);
        };
        const dateKeyOf = (value, fallback) => {
            const date = parseAnyDate(value);
            return date ? date.toISOString().slice(0, 10) : fallback;
        };
        const selectedDepartments = new Set(active.departments || []);
        const selectedFunctions = new Set(active.functions || []);
        const normalizeDept = value => normalizeConsolidatedDepartment(value);
        const keepPerson = person => {
            const dept = normalizeDept(getConsolidatedDepartmentValue(person));
            const func = String(getConsolidatedFunctionValue(person) || '').trim();
            return (!selectedDepartments.size || selectedDepartments.has(dept)) && (!selectedFunctions.size || selectedFunctions.has(func));
        };
        const people = base.filter(keepPerson);
        const peopleByKey = new Map();
        people.forEach(person => {
            const cpfKey = normalizeKey(person?.CPF ?? person?.['CPF Colaborador'] ?? person?.['CPF COLABORADOR']);
            const nameKey = normalizeKey(person?.NOME ?? person?.Nome ?? person?.['Usuário'] ?? person?.['Nome Completo']);
            if (cpfKey) peopleByKey.set(cpfKey, person);
            if (nameKey) peopleByKey.set(nameKey, person);
        });
        const countsFor = (rows, dateField) => {
            const map = new Map();
            rows.forEach(row => {
                const key = keyOf(row);
                const nameKey = normalizeKey(row?.['Usuário'] ?? row?.Nome ?? row?.['Nome Completo']);
                const dateKey = dateKeyOf(row?.[dateField], '');
                if ((!key && !nameKey) || !dateKey || !dayKeys.includes(dateKey)) return;
                const person = peopleByKey.get(key) || peopleByKey.get(nameKey);
                if (!person) return;
                if (!map.has(key)) map.set(key, {});
                const byDay = map.get(key);
                byDay[dateKey] = (byDay[dateKey] || 0) + 1;
            });
            return map;
        };
        const hseCounts = countsFor(hse, 'Data');
        const apolloCounts = countsFor(apollo, 'Created At');
        const personMeta = person => ({
            nome: person.NOME || person.Nome || '',
            cpf: person.CPF || '',
            departamento: getConsolidatedDepartmentValue(person) || '',
            funcao: getConsolidatedFunctionValue(person) || ''
        });
        const makeRows = (source, metaDiaria, includeOther) => people.map(person => {
            const key = keyOf(person);
            const hseDay = hseCounts.get(key) || {};
            const apolloDay = apolloCounts.get(key) || {};
            const row = personMeta(person);
            if (source === 'HSE' || source === 'Apollo') {
                dayKeys.forEach(day => {
                    const h = hseDay[day] || 0;
                    const a = apolloDay[day] || 0;
                    row[dayLabel(day)] = source === 'HSE' ? h : a;
                });
            }
            const totalHse = dayKeys.reduce((sum, day) => sum + (hseDay[day] || 0), 0);
            const totalApollo = dayKeys.reduce((sum, day) => sum + (apolloDay[day] || 0), 0);
            const validDaysForPerson = dayKeys.filter(day => Object.prototype.hasOwnProperty.call(hseDay, day) || Object.prototype.hasOwnProperty.call(apolloDay, day)).length;
            const hseMeta = validDaysForPerson * 3;
            const apolloMeta = validDaysForPerson * 5;
            if (source === 'HSE') { row['Total HSE'] = totalHse; row['Meta HSE'] = hseMeta; row['Status HSE'] = validDaysForPerson <= 0 ? 'Não fez' : totalHse >= hseMeta ? 'Meta Atingida' : totalHse > 0 ? 'Meta Não Atingida' : 'Não fez'; }
            if (source === 'Apollo') { row['Total Apollo'] = totalApollo; row['Meta Apollo'] = apolloMeta; row['Status Apollo'] = validDaysForPerson <= 0 ? 'Não fez' : totalApollo >= apolloMeta ? 'Meta Atingida' : totalApollo > 0 ? 'Meta Não Atingida' : 'Não fez'; }
            if (source === 'Consolidado') { row['HSE'] = totalHse; row['Apollo'] = totalApollo; row['Total Geral'] = totalHse + totalApollo; }
            row['Período'] = periodLabel;
            return row;
        });

        const wb = XLSX.utils.book_new();
        const appendSheet = (name, rows) => {
            const ws = XLSX.utils.json_to_sheet(rows);
            ws['!freeze'] = { xSplit: 4, ySplit: 1 };
            ws['!autofilter'] = { ref: ws['!ref'] };
            const headers = rows.length ? Object.keys(rows[0]) : [];
            ws['!cols'] = headers.map(header => ({ wch: Math.min(28, Math.max(12, header.length + 2)) }));
            XLSX.utils.book_append_sheet(wb, ws, name);
        };
        appendSheet('Consolidado', makeRows('Consolidado', 0, true));
        appendSheet('HSE', makeRows('HSE', 3, false));
        appendSheet('Apollo', makeRows('Apollo', 5, false));
        XLSX.writeFile(wb, `Auditorias_HSE_Apollo_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (e) {
        console.error('Erro ao exportar Excel consolidado:', e);
        alert(`Erro ao exportar Excel consolidado: ${e?.message || 'falha desconhecida'}`);
    } finally {
        setConsolidatedBtnLoading(btn, false, 'Excel');
    }
}

/* ---------------- CSV ---------------- */

async function exportConsolidatedCSV() {
    const btn = document.getElementById('export-consolidated-csv-btn');
    setConsolidatedBtnLoading(btn, true);
    try {
        const { hse, apollo, hseError, apolloError } = await fetchConsolidatedData();
        assertConsolidatedSources(hseError, apolloError, false);
        const rows = buildConsolidatedRows(hse, apollo);
        if (rows.length === 0) {
            alert('Nenhum dado encontrado para exportar (HSE e Apollo).');
            return;
        }

        const csvContent = [getConsolidatedHeaders(), ...rowsToArray(rows)]
            .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
            .join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", `Auditorias_HSE_Apollo_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (e) {
        console.error("Erro ao exportar CSV consolidado:", e);
        alert(`Erro ao exportar CSV consolidado: ${e?.message || 'falha desconhecida'}`);
    } finally {
        setConsolidatedBtnLoading(btn, false, 'CSV');
    }
}

/* ---------------- Helpers de período/estatística (mesmo estilo D-1/WTD dos relatórios individuais) ---------------- */

function getConsolidatedPeriodBounds(filters = null) {
    const today = new Date();
    const fallbackEnd = new Date(today);
    fallbackEnd.setDate(fallbackEnd.getDate() - 1);
    fallbackEnd.setHours(0, 0, 0, 0);
    const selectedEnd = filters?.end && isValidConsolidatedDate(new Date(filters.end)) ? new Date(filters.end) : fallbackEnd;
    const selectedStart = filters?.start && isValidConsolidatedDate(new Date(filters.start)) ? new Date(filters.start) : null;
    const yesterday = new Date(selectedEnd);
    yesterday.setHours(0, 0, 0, 0);
    const weekStart = selectedStart ? new Date(selectedStart) : new Date(yesterday);
    weekStart.setHours(0, 0, 0, 0);
    return { yesterday, weekStart };
}

function countInDateRange(items, dateField, start, end) {
    const s = new Date(start); s.setHours(0, 0, 0, 0);
    const e = new Date(end); e.setHours(23, 59, 59, 999);
    return items.filter(item => {
        const d = getConsolidatedDateValue(item, dateField);
        return d && d >= s && d <= e;
    }).length;
}

function countByDepartamento(items, deptField) {
    const map = {};
    items.forEach(item => {
        const dept = (item[deptField] || 'Não informado').toString().trim() || 'Não informado';
        map[dept] = (map[dept] || 0) + 1;
    });
    return map;
}

function countByDayRange(items, dateField, start, end) {
    const map = {};
    let current = new Date(start);
    current.setHours(12, 0, 0, 0);
    const endLimit = new Date(end);
    endLimit.setHours(12, 0, 0, 0);
    while (current <= endLimit) {
        map[current.toISOString().split('T')[0]] = 0;
        current.setDate(current.getDate() + 1);
    }
    items.forEach(item => {
        const d = getConsolidatedDateValue(item, dateField);
        if (d) {
            const iso = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().split('T')[0];
            if (iso in map) map[iso]++;
        }
    });
    return map;
}

/* ---------------- Configuração da imagem consolidada ---------------- */

function consolidatedEscape(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
}

function getConsolidatedModalOptions(items, getter) {
    return [...new Set(items.map(getter).map(value => String(value || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function buildConsolidatedChecks(name, values, checked = true) {
    return values.length ? values.map(value => `<label class="consolidated-check-option"><input type="checkbox" name="${name}" value="${consolidatedEscape(value)}" ${checked ? 'checked' : ''}><span>${consolidatedEscape(value)}</span></label>`).join('') : '<span class="consolidated-empty-option">Nenhuma opção encontrada</span>';
}

function buildConsolidatedBlockChecks() {
    const blocks = [['status', 'Cards D-1 e WTD'], ['function', 'Por função'], ['department', 'Por departamento'], ['type', 'Por tipo de auditoria'], ['daily', 'Progressão diária']];
    return blocks.map(([value, label]) => `<label class="consolidated-check-option"><input type="checkbox" name="consolidated-block" value="${value}" checked><span>${label}</span></label>`).join('');
}

async function openConsolidatedConfigModal() {
    if (document.getElementById('consolidated-config-modal')) return;
    const btn = document.getElementById('export-consolidated-img-btn');
    setConsolidatedBtnLoading(btn, true);
    try {
        const { hse, apollo } = await fetchConsolidatedData({ department: '', start: null, end: null, explicit: true });
        const all = [...hse, ...apollo];
        const normalizeModalDepartment = value => {
            const normalized = String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[\s_-]+/g, '');
            if (normalized === 'OUTBOUND') return 'Outbound';
            if (normalized === 'TRANSPORTE' || normalized === 'TRANSPORT') return 'Transporte';
            if (normalized === 'TRANSFEROUT') return 'TransferOut';
            return String(value || '').trim();
        };
        const departments = [...new Set(all.map(item => normalizeDepartment(getConsolidatedDepartmentValue(item))).filter(value => value && !['#N/A', 'N/A', 'NA'].includes(String(value).toUpperCase())))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
        const functions = getConsolidatedModalOptions(all, getConsolidatedFunctionValue);
        const types = getConsolidatedModalOptions(all, item => item.Formulário || item['Tipo Auditoria']);
        const currentStart = document.getElementById('date-start')?.value || '';
        const currentEnd = document.getElementById('date-end')?.value || '';
        const overlay = document.createElement('div');
        overlay.id = 'consolidated-config-modal';
        overlay.className = 'modal-overlay consolidated-config-overlay';
        overlay.innerHTML = `<div class="modal-content consolidated-config-modal" role="dialog" aria-modal="true" aria-labelledby="consolidated-config-title">
            <div class="modal-header"><div><h2 id="consolidated-config-title">Configurar imagem consolidada</h2><p class="consolidated-modal-subtitle">Escolha filtros e blocos antes de gerar.</p></div><button type="button" class="modal-close" id="consolidated-config-close" aria-label="Fechar">×</button></div>
            <div class="modal-body consolidated-config-body">
                <div class="consolidated-modal-grid"><div class="modal-field"><label for="consolidated-modal-start">Data inicial</label><input id="consolidated-modal-start" type="date" class="filter-input" value="${currentStart}"></div><div class="modal-field"><label for="consolidated-modal-end">Data final</label><input id="consolidated-modal-end" type="date" class="filter-input" value="${currentEnd}"></div></div>
                <div class="modal-field"><label>Departamentos</label><div class="consolidated-check-grid">${buildConsolidatedChecks('consolidated-department', departments)}</div></div>
                <div class="modal-field"><label>Funções que serão exibidas</label><div class="consolidated-check-grid consolidated-check-scroll">${buildConsolidatedChecks('consolidated-function', functions)}</div></div>
                <div class="modal-field"><label>Tipos de auditoria</label><div class="consolidated-check-grid consolidated-check-scroll">${buildConsolidatedChecks('consolidated-type', types)}</div></div>
                <div class="modal-field"><label>Blocos da imagem</label><div class="consolidated-check-grid consolidated-block-grid">${buildConsolidatedBlockChecks()}</div></div>
            </div>
            <div class="consolidated-modal-footer"><button type="button" class="btn-reset" id="consolidated-config-cancel">Cancelar</button><button type="button" class="btn-apply" id="consolidated-config-generate">Gerar imagem</button></div>
        </div>`;
        document.body.appendChild(overlay);
        const close = () => overlay.remove();
        overlay.querySelector('#consolidated-config-close').onclick = close;
        overlay.querySelector('#consolidated-config-cancel').onclick = close;
        overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
        overlay.querySelector('#consolidated-config-generate').onclick = () => {
            const values = name => [...overlay.querySelectorAll(`input[name="${name}"]:checked`)].map(input => input.value);
            const startValue = overlay.querySelector('#consolidated-modal-start').value;
            const endValue = overlay.querySelector('#consolidated-modal-end').value;
            const config = {
                departments: values('consolidated-department'), functions: values('consolidated-function'), types: values('consolidated-type'),
                blocks: Object.fromEntries(values('consolidated-block').map(value => [value, true])),
                filters: { department: '', start: startValue ? new Date(`${startValue}T00:00:00`) : null, end: endValue ? new Date(`${endValue}T23:59:59.999`) : null, explicit: true }
            };
            close();
            exportConsolidatedImage(config);
        };
    } catch (error) {
        console.error('Erro ao abrir configuração da imagem:', error);
        alert(`Não foi possível carregar as opções da imagem: ${error?.message || 'erro desconhecido'}`);
    } finally {
        setConsolidatedBtnLoading(btn, false, 'Imagem');
    }
}

/* ---------------- Imagem (super dash — HSE + Apollo) ---------------- */

async function exportConsolidatedImage(config = null) {
    const btn = document.getElementById('export-consolidated-img-btn');
    setConsolidatedBtnLoading(btn, true);
    let container = null;
    try {
        // Garante que a primeira exportação aguarde o carregamento compartilhado das bases e dos filtros.
        await new Promise(resolve => setTimeout(resolve, 250));
        let { hse, apollo, base, hseError, apolloError, baseError, basePending, hseErrorMessage, apolloErrorMessage, baseErrorMessage, filters } = await fetchConsolidatedData(config?.filters || null);
        assertConsolidatedSources(hseError, apolloError, false, { hse: hseErrorMessage, apollo: apolloErrorMessage });

        const hseDateField = 'Data';
        const apolloDateField = 'Created At';
        const hseDeptField = 'Departamento';
        const apolloDeptField = 'Departamento';
        const filterSummary = getConsolidatedFilterSummary();

        // KPIs gerais
        const hseTotal = hse.length;
        const hseDepts = new Set(hse.map(i => i.Departamento).filter(Boolean)).size;
        const hseScoreAvg = hseTotal
            ? (hse.reduce((acc, i) => acc + (parseFloat((i.Score || "0").toString().replace('%', '')) || 0), 0) / hseTotal).toFixed(1)
            : 0;
        const hseConf = hse.reduce((acc, i) => acc + (parseInt(i.Conformidades) || 0), 0);

        const apolloTotal = apollo.length;
        const apolloDepts = new Set(apollo.map(i => i.Departamento).filter(Boolean)).size;
        const apolloTipos = new Set(apollo.map(i => i['Tipo Auditoria']).filter(Boolean)).size;
        const apolloAreas = new Set(apollo.map(i => i['Selecione A área Auditora:']).filter(Boolean)).size;

        // Período (mesmo estilo D-1 / WTD dos relatórios individuais)
        const { yesterday, weekStart } = getConsolidatedPeriodBounds(filters);
        const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

        const hseD1 = countInDateRange(hse, hseDateField, yesterday, yesterday);
        const apolloD1 = countInDateRange(apollo, apolloDateField, yesterday, yesterday);
        const hseWtd = countInDateRange(hse, hseDateField, weekStart, yesterday);
        const apolloWtd = countInDateRange(apollo, apolloDateField, weekStart, yesterday);

        const pct = (part, total) => total > 0 ? ((part / total) * 100).toFixed(1) : '0.0';


        const normalizeDepartment = value => {
            const normalized = (value || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[\s_-]+/g, '');
            if (normalized === 'OUTBOUND') return 'Outbound';
            if (normalized === 'TRANSPORTE' || normalized === 'TRANSPORT') return 'Transporte';
            if (normalized === 'TRANSFEROUT') return 'TransferOut';
            return String(value || '').trim();
        };
        const isPriorityDepartment = value => ['Outbound', 'Transporte', 'TransferOut'].includes(normalizeDepartment(value));
        const sourceFilters = config?.filters || getConsolidatedActiveFilters();
        const selectedDepartment = sourceFilters.department || '';
        const selectedPriorityDepartment = normalizeDepartment(selectedDepartment);
        const selectedDepartmentValues = config ? (config.departments || []) : (sourceFilters.departments || []);
        const selectedFunctionValues = config ? (config.functions || []) : (sourceFilters.functions || []);
        const selectedDepartments = new Set(selectedDepartmentValues.map(normalizeDepartment).filter(Boolean));
        const selectedFunctions = new Set(selectedFunctionValues.map(value => String(value).trim()).filter(Boolean));
        const hasSelectedDepartments = selectedDepartments.size > 0;
        const hasSelectedFunctions = selectedFunctions.size > 0;
        const selectedTypes = config ? new Set(config.types || []) : null;
        const selectedBlocks = config?.blocks || { status: true, function: true, department: true, type: true, daily: true };

        // O consolidado considera somente os departamentos de interesse operacional.
        const getFunction = item => getConsolidatedFunctionValue(item) || 'Não informado';
        const preFilterHse = hse.slice();
        const preFilterApollo = apollo.slice();
        hse = hse.filter(item => (!selectedDepartments || selectedDepartments.has(normalizeDepartment(getConsolidatedDepartmentValue(item)))));
        apollo = apollo.filter(item => (!selectedDepartments || selectedDepartments.has(normalizeDepartment(getConsolidatedDepartmentValue(item)))));
        if (!config && selectedPriorityDepartment) {
            hse = hse.filter(item => normalizeDepartment(getConsolidatedDepartmentValue(item)) === selectedPriorityDepartment);
            apollo = apollo.filter(item => normalizeDepartment(getConsolidatedDepartmentValue(item)) === selectedPriorityDepartment);
        }
        if (selectedFunctions) {
            hse = hse.filter(item => selectedFunctions.has(getFunction(item)));
            apollo = apollo.filter(item => selectedFunctions.has(getFunction(item)));
        }
        if (selectedTypes) {
            hse = hse.filter(item => selectedTypes.has(String(item.Formulário || item['Tipo Auditoria'] || '').trim()));
            apollo = apollo.filter(item => selectedTypes.has(String(item.Formulário || item['Tipo Auditoria'] || '').trim()));
        }
        // Evita uma exportação visual incoerente quando a tela está em Tudo e os KPIs têm dados.
        // Com filtros explícitos, o vazio é legítimo e deve ser mostrado.
        if (!selectedDepartments && !selectedFunctions && !selectedTypes && (hseTotal + apolloTotal > 0) && (hse.length + apollo.length === 0)) {
            hse = preFilterHse;
            apollo = preFilterApollo;
        }

        const aggregateBy = (items, getter) => {
            const result = {};
            items.forEach(item => {
                const label = (getter(item) || 'Não informado').toString().trim() || 'Não informado';
                result[label] = (result[label] || 0) + 1;
            });
            return result;
        };
        const hseByFunction = aggregateBy(hse, getFunction);
        const apolloByFunction = aggregateBy(apollo, getFunction);
        const byFunction = aggregateBy([...hse, ...apollo], getFunction);
        const hseByType = aggregateBy(hse, item => item.Formulário);
        const apolloByType = aggregateBy(apollo, item => item['Tipo Auditoria']);
        const byType = aggregateBy(hse, item => `HSE · ${item.Formulário}`);
        Object.entries(aggregateBy(apollo, item => `Apollo · ${item['Tipo Auditoria']}`)).forEach(([key, value]) => { byType[key] = value; });
        const departmentCounts = aggregateBy([...hse, ...apollo], item => normalizeDepartment(getConsolidatedDepartmentValue(item)) || 'Não informado');
        const byDepartment = Object.fromEntries(Object.entries(departmentCounts).filter(([dept]) => isPriorityDepartment(dept)).sort((a, b) => b[1] - a[1]).slice(0, 5));
        const departmentSourceMap = {};
        hse.forEach(item => {
            const dept = normalizeDepartment(getConsolidatedDepartmentValue(item)) || 'Não informado';
            departmentSourceMap[dept] ||= { hse: 0, apollo: 0 };
            departmentSourceMap[dept].hse++;
        });
        apollo.forEach(item => {
            const dept = normalizeDepartment(getConsolidatedDepartmentValue(item)) || 'Não informado';
            departmentSourceMap[dept] ||= { hse: 0, apollo: 0 };
            departmentSourceMap[dept].apollo++;
        });
        const departmentAuditRows = Object.entries(departmentSourceMap)
            .sort((a, b) => (b[1].hse + b[1].apollo) - (a[1].hse + a[1].apollo))
            .slice(0, 5)
            .map(([dept, values]) => {
                const total = values.hse + values.apollo;
                return `<div style="display:grid;grid-template-columns:minmax(0,1fr) 54px 64px 54px;gap:6px;align-items:center;padding:8px 3px;border-bottom:1px solid #e3e6e9;font-size:9px;"><b style="color:#30343b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${dept}</b><b style="text-align:right;color:#3294c9;">${values.hse}</b><b style="text-align:right;color:#7661c9;">${values.apollo}</b><b style="text-align:right;color:#30343b;">${total}</b></div>`;
            }).join('') || '<div style="padding:20px;text-align:center;color:#8a9096;font-size:9px;">Sem dados</div>';

        const createBars = (data, color, maxRows = 6) => {
            const entries = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, maxRows);
            const max = Math.max(1, ...entries.map(([, value]) => value));
            return entries.length ? entries.map(([label, value]) => `
                    <div style="margin:4px 0 5px 0;">
                    <div style="display:flex;justify-content:space-between;gap:10px;font-size:10px;color:#cbd5e1;font-weight:700;"><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:190px;">${label}</span><b style="color:${color};">${value}</b></div>
                    <div style="height:5px;background:#1e293b;border-radius:4px;overflow:hidden;"><div style="height:100%;width:${(value / max) * 100}%;background:${color};border-radius:4px;"></div></div>
                </div>`).join('') : '<div style="color:#64748b;font-size:11px;padding:15px 0;text-align:center;">Sem dados</div>';
        };

        const getPeopleStats = (people, start, end, metaDiaria) => {
            const stats = { total: 0, atingiu: 0, naoAtingiu: 0, naoResp: 0 };
            const s = new Date(start); s.setHours(0, 0, 0, 0);
            const e = new Date(end); e.setHours(23, 59, 59, 999);
            people.filter(person => {
                const dept = normalizeDepartment(getConsolidatedDepartmentValue(person));
                const func = String(getConsolidatedFunctionValue(person) || '').trim();
                return (!hasSelectedDepartments || selectedDepartments.has(dept))
                    && (!selectedPriorityDepartment || dept === selectedPriorityDepartment)
                    && (!hasSelectedFunctions || selectedFunctions.has(func));
            }).forEach(person => {
                let realizado = 0; let dias = 0;
                Object.entries(person).forEach(([key, value]) => {
                    const d = new Date(key);
                    if (!isNaN(d.getTime()) && d >= s && d <= e) { realizado += parseInt(value, 10) || 0; dias++; }
                });
                // Mesma regra do módulo individual: somente colaboradores com
                // pelo menos uma chave de data válida entram no denominador.
                if (dias <= 0) return;
                stats.total++;
                const meta = dias * metaDiaria;
                if (realizado >= meta) stats.atingiu++;
                else if (realizado > 0) stats.naoAtingiu++;
                else stats.naoResp++;
            });
            return stats;
        };

        const peopleBase = base || [];
        const peopleStatsUnavailable = basePending || baseError || peopleBase.length === 0;
        const emptyPeopleStats = { atingiu: '—', naoAtingiu: '—', naoResp: '—' };
        const d1People = peopleStatsUnavailable ? emptyPeopleStats : getPeopleStats(peopleBase, yesterday, yesterday, 3);
        const wtdPeople = peopleStatsUnavailable ? emptyPeopleStats : getPeopleStats(peopleBase, weekStart, yesterday, 3);

        const normalizePersonKey = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        const personKey = item => {
            if (!item || typeof item !== 'object') return '';
            const cpf = item.CPF ?? item['CPF'] ?? item['CPF Colaborador'] ?? item['CPF COLABORADOR'];
            const nome = item.Nome ?? item.NOME ?? item.Usuário ?? item['Nome Completo'] ?? item.NomeCompleto ?? item['COLABORADOR'];
            const cpfKey = normalizePersonKey(cpf);
            return cpfKey || normalizePersonKey(nome);
        };
        const getSourcePeopleStats = (sourceRows, start, end) => {
            if (peopleStatsUnavailable) return emptyPeopleStats;
            const s = new Date(start); s.setHours(0, 0, 0, 0);
            const e = new Date(end); e.setHours(23, 59, 59, 999);
            const counts = new Map();
            sourceRows.forEach(row => {
                const key = personKey(row);
                const date = parseAnyDate(row.Data || row['Created At'] || row.Timestamp || row.data);
                if (!key || !date || date < s || date > e) return;
                counts.set(key, (counts.get(key) || 0) + 1);
            });
            const stats = { total: 0, atingiu: 0, naoAtingiu: 0, naoResp: 0 };
            const candidates = new Map();
            peopleBase.forEach(person => {
                const key = personKey(person);
                if (key) candidates.set(key, person);
            });
            candidates.forEach((person, key) => {
                const dept = normalizeDepartment(getConsolidatedDepartmentValue(person));
                const func = String(getConsolidatedFunctionValue(person) || '').trim();
                if (hasSelectedDepartments && !selectedDepartments.has(dept)) return;
                if (selectedPriorityDepartment && dept !== selectedPriorityDepartment) return;
                if (hasSelectedFunctions && !selectedFunctions.has(func)) return;
                const realizados = counts.get(key) || 0;
                stats.total++;
                const daysInPeriod = Math.max(1, Math.round((e - s) / 86400000) + 1);
                const meta = daysInPeriod * 3;
                if (realizados >= meta) stats.atingiu++;
                else if (realizados > 0) stats.naoAtingiu++;
                else stats.naoResp++;
            });
            return stats;
        };
        const d1Hse = getPeopleStats(peopleBase, yesterday, yesterday, 3);
        const d1Apollo = getPeopleStats(peopleBase, yesterday, yesterday, 5);
        const wtdHse = getPeopleStats(peopleBase, weekStart, yesterday, 3);
        const wtdApollo = getPeopleStats(peopleBase, weekStart, yesterday, 5);
        const statusCard = (title, stats) => `
            <div style="flex:1;background:#131c31;border:1px solid #26364e;border-radius:8px;padding:8px 12px;">
                <div style="font-size:11px;font-weight:900;color:#e0e7ff;text-transform:uppercase;margin-bottom:6px;">${title}</div>
                <div style="display:flex;gap:8px;">
                    <div style="flex:1;text-align:center;"><b style="font-size:18px;color:#10b981;">${stats.atingiu}</b><div style="font-size:8px;color:#94a3b8;line-height:1.1;">Atingiram</div></div>
                    <div style="flex:1;text-align:center;"><b style="font-size:18px;color:#f59e0b;">${stats.naoAtingiu}</b><div style="font-size:8px;color:#94a3b8;line-height:1.1;">Não atingiram</div></div>
                    <div style="flex:1;text-align:center;"><b style="font-size:18px;color:#ef4444;">${stats.naoResp}</b><div style="font-size:8px;color:#94a3b8;line-height:1.1;">Não fizeram</div></div>
                </div>
            </div>`;

        // Progressão diária dos dois tipos de auditoria, de D-6 a D-1.
        const chartEnd = yesterday;
        const chartStart = new Date(weekStart);
        const hseDaily = countByDayRange(hse, hseDateField, chartStart, chartEnd);
        const apolloDaily = countByDayRange(apollo, apolloDateField, chartStart, chartEnd);
        const dayKeys = Object.keys(hseDaily);
        const dataGeracao = new Date().toLocaleString('pt-BR');
        const deptRows = Object.entries(byDepartment).map(([dept, value]) => `<tr><td>${dept}</td><td>${value}</td></tr>`).join('');
        const typeBars = createBars(byType, '#a78bfa', 7);
        const hseFunctionBars = createBars(hseByFunction, '#38bdf8', 4);
        const apolloFunctionBars = createBars(apolloByFunction, '#a78bfa', 4);
        const functionBars = createBars(byFunction, '#38bdf8', 5);
        const hseTypeLegend = Object.entries(hseByType).sort((a,b) => b[1]-a[1]).slice(0, 4).map(([label, value]) => `<div style="display:flex;justify-content:space-between;font-size:9px;color:#cbd5e1;margin:2px 0;"><span style="max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${label}</span><b style="color:#38bdf8;">${value}</b></div>`).join('');
        const apolloTypeRows = Object.entries(apolloByType).sort((a, b) => b[1] - a[1]).map(([label, value], index) => `<div style="display:flex;align-items:center;justify-content:space-between;padding:4px 6px;border-bottom:1px solid #dbe5ee;font-size:9px;color:#263b53;"><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:210px;"><b style="display:inline-block;width:16px;color:#6d5ce7;">${index + 1}</b>${label || 'Não informado'}</span><b style="color:#6d5ce7;font-size:12px;">${value}</b></div>`).join('') || '<div style="padding:18px;text-align:center;color:#718096;font-size:10px;">Nenhuma auditoria Apollo no período</div>';
        const functionDetailRows = Object.entries(byFunction).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([label, total]) => `<div style="display:grid;grid-template-columns:minmax(0,1fr) 42px 42px 42px;gap:4px;align-items:center;padding:3px 5px;border-bottom:1px solid #dbe5ee;font-size:8px;color:#263b53;"><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${label || 'Não informado'}</span><b style="text-align:right;color:#17324d;">${total}</b><b style="text-align:right;color:#1687bd;">${hseByFunction[label] || 0}</b><b style="text-align:right;color:#6d5ce7;">${apolloByFunction[label] || 0}</b></div>`).join('') || '<div style="padding:18px;text-align:center;color:#718096;font-size:10px;">Nenhuma função no período</div>';
        const apolloTypeLegend = Object.entries(apolloByType).sort((a,b) => b[1]-a[1]).slice(0, 4).map(([label, value]) => `<div style="display:flex;justify-content:space-between;font-size:9px;color:#cbd5e1;margin:2px 0;"><span style="max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${label}</span><b style="color:#a78bfa;">${value}</b></div>`).join('');
        const departmentLegend = '';
        const typeLegend = Object.entries(byType).sort((a,b) => b[1]-a[1]).slice(0, 5).map(([label, value], i) => `<div style="display:flex;align-items:center;justify-content:space-between;font-size:9px;color:#cbd5e1;margin:2px 0;"><span style="max-width:210px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"><i style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${['#a78bfa','#38bdf8','#10b981','#f59e0b','#ef4444'][i % 5]};margin-right:5px;"></i>${label}</span><b>${value}</b></div>`).join('');

        const kpiCard = (label, value, caption, accent, icon) => `
            <div style="flex:1;min-width:0;background:#101b31;border:1px solid #223454;border-radius:10px;padding:10px 14px;position:relative;overflow:hidden;box-sizing:border-box;">
                <div style="position:absolute;left:0;top:0;bottom:0;width:4px;background:${accent};"></div>
                <div style="display:flex;align-items:center;justify-content:space-between;color:#94a3b8;font-size:9px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;"><span>${label}</span><span style="font-size:16px;color:${accent};">${icon}</span></div>
                <div style="font-size:28px;line-height:1.05;font-weight:900;color:#f8fafc;margin-top:7px;">${value}</div>
                <div style="font-size:9px;color:#64748b;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${caption}</div>
            </div>`;
        const statusCardProfessional = (title, stats, accent) => `
            <div style="flex:1;background:#101b31;border:1px solid #223454;border-radius:10px;padding:9px 13px;box-sizing:border-box;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;"><span style="font-size:10px;font-weight:900;letter-spacing:.5px;color:#f8fafc;text-transform:uppercase;">${title}</span><span style="font-size:9px;color:${accent};font-weight:800;">META DIÁRIA</span></div>
                <div style="display:flex;gap:7px;">
                    <div style="flex:1;background:#0c1729;border-radius:7px;padding:6px;text-align:center;border-top:2px solid #10b981;"><b style="font-size:20px;color:#10b981;">${stats.atingiu}</b><div style="font-size:8px;color:#94a3b8;margin-top:2px;">Atingiram</div></div>
                    <div style="flex:1;background:#0c1729;border-radius:7px;padding:6px;text-align:center;border-top:2px solid #f59e0b;"><b style="font-size:20px;color:#f59e0b;">${stats.naoAtingiu}</b><div style="font-size:8px;color:#94a3b8;margin-top:2px;">Não atingiram</div></div>
                    <div style="flex:1;background:#0c1729;border-radius:7px;padding:6px;text-align:center;border-top:2px solid #ef4444;"><b style="font-size:20px;color:#ef4444;">${stats.naoResp}</b><div style="font-size:8px;color:#94a3b8;margin-top:2px;">Não fizeram</div></div>
                </div>
            </div>`;

        const functionTableRows = Object.entries(byFunction).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([label, total]) => `<tr style="height:22px;"><td style="text-align:left;vertical-align:middle;padding:0 6px 0 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${label || 'Não informado'}</td><td style="text-align:right;vertical-align:middle;padding:0;font-family:monospace;font-weight:500;">${total}</td><td style="text-align:right;vertical-align:middle;padding:0;font-family:monospace;color:#2f8fd4;">${hseByFunction[label] || 0}</td><td style="text-align:right;vertical-align:middle;padding:0;font-family:monospace;color:#7a5cd6;">${apolloByFunction[label] || 0}</td></tr>`).join('') || '<tr><td colspan="4">Sem dados</td></tr>';
        const apolloListRows = Object.entries(apolloByType).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value], i) => `<li style="display:grid;grid-template-columns:24px minmax(0,1fr) 40px;align-items:center;gap:10px;height:32px;padding:0;border-bottom:1px solid #f0f1f3;list-style:none;"><span style="width:24px;height:24px;border-radius:6px;background:#eef0f4;color:#7c8493;display:flex;align-items:center;justify-content:center;font-size:11px;font-family:monospace;">${i + 1}</span><span style="min-width:0;font-size:12px;line-height:16px;color:#3f4652;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${label}</span><span style="width:40px;text-align:right;font-family:monospace;color:#7a5cd6;font-weight:600;">${value}</span></li>`).join('') || '<li>Sem dados</li>';
        const departmentRowsRef = Object.entries(departmentSourceMap).filter(([dept]) => isPriorityDepartment(dept)).sort((a, b) => (b[1].hse + b[1].apollo) - (a[1].hse + a[1].apollo)).slice(0, 3).map(([dept, values]) => { const total = values.hse + values.apollo; const maxDept = Math.max(1, ...Object.values(departmentSourceMap).map(v => v.hse + v.apollo)); const totalWidth = total / maxDept * 100; const hseWidth = total ? values.hse / total * 100 : 0; const apolloWidth = total ? values.apollo / total * 100 : 0; return `<li style="margin-bottom:15px;list-style:none;"><div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;"><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${dept}</span><span style="font-family:monospace;font-weight:600;">${total}</span></div><div style="width:100%;height:9px;margin-top:7px;border-radius:999px;background:#eef0f4;overflow:hidden;"><div style="display:flex;width:100%;height:100%;border-radius:999px;overflow:hidden;"><div style="height:100%;width:${hseWidth}%;background:#2f8fd4;"></div><div style="height:100%;width:${apolloWidth}%;background:#7a5cd6;"></div></div></div><div style="display:flex;justify-content:space-between;gap:12px;margin-top:5px;font-size:10px;color:#7c8493;"><span style="color:#2f8fd4;">HSE · ${values.hse}</span><span style="color:#7a5cd6;">Apollo · ${values.apollo}</span></div></li>`; }).join('') || '<li>Sem dados</li>';
        const dailyValues = Object.keys(hseDaily).map(key => [key, hseDaily[key] || 0, apolloDaily[key] || 0]);
        const dailyMax = Math.max(1, ...dailyValues.map(v => Math.max(v[1], v[2])));
        const dailyBarsRef = dailyValues.map(([key, hv, av]) => `<div style="flex:1;height:100%;display:flex;align-items:flex-end;justify-content:center;gap:4px;"><div style="width:18px;height:${Math.max(hv / dailyMax * 100, .5)}%;background:#2f8fd4;border-radius:3px 3px 0 0;"></div><div style="width:18px;height:${Math.max(av / dailyMax * 100, .5)}%;background:#7a5cd6;border-radius:3px 3px 0 0;"></div></div>`).join('');
        const dailyLabelsRef = dailyValues.map(([key]) => `<span style="flex:1;text-align:center;font-size:10px;color:#7c8493;font-family:monospace;">${key.slice(5, 10).replace('-', '/')}</span>`).join('');

        const html = `
        <div id="consolidated-capture-area" style="width:1280px;height:720px;overflow:hidden;background:#f4f5f7;color:#2b3240;font-family:Arial,'Segoe UI',sans-serif;border:0;box-sizing:border-box;">
          <style>
            #consolidated-capture-area *{box-sizing:border-box} #consolidated-capture-area .ref-panel{background:#fff;border:1px solid #e4e7ec;border-radius:8px;box-shadow:0 1px 2px rgba(43,50,64,.04);overflow:hidden} #consolidated-capture-area table{table-layout:fixed} #consolidated-capture-area table th:first-child,#consolidated-capture-area table td:first-child{width:58%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis} #consolidated-capture-area table th:not(:first-child),#consolidated-capture-area table td:not(:first-child){width:14%;white-space:nowrap} #consolidated-capture-area table td{height:22px;line-height:22px;vertical-align:middle;font-size:10px} #consolidated-capture-area main>section:nth-of-type(3)>article{height:236px;min-height:236px;overflow:hidden} #consolidated-capture-area main>section:nth-of-type(4){height:176px;min-height:176px;overflow:hidden} #consolidated-capture-area main>section:nth-of-type(4) .chart-area{height:112px}
          </style>
          <header style="height:76px;background:#fff;border-bottom:1px solid #e4e7ec;"><div style="height:100%;padding:13px 24px;display:flex;justify-content:space-between;align-items:flex-end;gap:16px;"><div><div style="font-size:9px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#7c8493;">OUTBOUND SYSTEM · RELATÓRIO CONSOLIDADO</div><div style="font-family:Arial,sans-serif;font-size:24px;font-weight:700;margin-top:4px;color:#2b3240;">Dashboard Consolidado de Auditorias</div><div style="margin-top:3px;font-size:11px;color:#7c8493;">HSE + Apollo · visão integrada de respostas e volume de auditorias</div></div><div style="display:flex;gap:28px;font-size:10px;"><div><div style="font-size:8px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#7c8493;">PERÍODO</div><div style="margin-top:4px;font-family:monospace;">${formatConsolidatedDate(filters.start,{day:'2-digit',month:'2-digit',year:'numeric'})} — ${formatConsolidatedDate(filters.end,{day:'2-digit',month:'2-digit',year:'numeric'})}</div></div><div><div style="font-size:8px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#7c8493;">GERADO EM</div><div style="margin-top:4px;font-family:monospace;">${dataGeracao}</div></div></div></div></header>
          <main style="padding:14px 24px 0;">
            <section style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">
              <article class="ref-panel" style="height:82px;padding:13px 14px;"><div style="font-size:8px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#7c8493;">D-1 · ONTEM</div><div style="font:700 23px monospace;margin-top:8px;">${formatConsolidatedDate(yesterday,{day:'2-digit',month:'2-digit',year:'numeric'})}</div><div style="font-size:10px;color:#7c8493;margin-top:3px;">${days[yesterday.getDay()]}</div></article>
              <article class="ref-panel" style="height:82px;padding:13px 14px;"><div style="font-size:8px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#7c8493;">WTD · SEMANA</div><div style="font:700 23px monospace;margin-top:8px;">${formatConsolidatedDate(weekStart,{day:'2-digit',month:'2-digit'})} — ${formatConsolidatedDate(yesterday,{day:'2-digit',month:'2-digit'})}</div><div style="font-size:10px;color:#7c8493;margin-top:3px;">${Math.max(1,Math.round((yesterday-weekStart)/86400000)+1)} dias corridos</div></article>
              <article class="ref-panel" style="height:82px;padding:13px 14px;"><div style="font-size:8px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#7c8493;">VOLUME HSE</div><div style="font:700 27px monospace;color:#2f8fd4;margin-top:8px;">${hseTotal}</div><div style="font-size:10px;color:#7c8493;margin-top:2px;">auditorias no período</div></article>
              <article class="ref-panel" style="height:82px;padding:13px 14px;"><div style="font-size:8px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#7c8493;">VOLUME APOLLO</div><div style="font:700 27px monospace;color:#7a5cd6;margin-top:8px;">${apolloTotal}</div><div style="font-size:10px;color:#7c8493;margin-top:2px;">auditorias no período</div></article>
            </section>
            <section style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:14px;">
              ${[['D-1 · HSE',d1Hse,'#2f8fd4'],['D-1 · APOLLO',d1Apollo,'#7a5cd6'],['WTD · HSE',wtdHse,'#2f8fd4'],['WTD · APOLLO',wtdApollo,'#7a5cd6']].map(([title,stats,color])=>`<article class="ref-panel" style="height:72px;padding:10px 12px;border-top:3px solid ${color};"><div style="display:flex;justify-content:space-between;align-items:center;"><b style="font-size:10px;letter-spacing:.6px;color:${color};">${title}</b><span style="font-size:9px;text-transform:uppercase;color:#7c8493;">COLABORADORES</span></div><div style="display:grid;grid-template-columns:repeat(3,1fr);margin-top:9px;"><div style="text-align:center;border-right:1px solid #e4e7ec;"><b style="font:600 19px monospace;color:#7c8493;">${stats.atingiu}</b><div style="font-size:8px;text-transform:uppercase;color:#7c8493;">Atingiram</div></div><div style="text-align:center;border-right:1px solid #e4e7ec;"><b style="font:600 19px monospace;color:#7c8493;">${stats.naoAtingiu}</b><div style="font-size:8px;text-transform:uppercase;color:#7c8493;">Não atingiram</div></div><div style="text-align:center;"><b style="font:600 19px monospace;color:#d64545;">${stats.naoResp}</b><div style="font-size:8px;text-transform:uppercase;color:#7c8493;">Não fizeram</div></div></div></article>`).join('')}
            </section>
            <section style="display:grid;grid-template-columns:1.12fr 1fr 1.12fr;gap:16px;margin-top:14px;">
              <article class="ref-panel" style="height:236px;padding:16px;"><div style="font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#7c8493;">DETALHAMENTO POR FUNÇÃO · WTD</div><table style="width:100%;border-collapse:collapse;margin-top:14px;font-size:9px;table-layout:fixed;"><colgroup><col style="width:58%"><col style="width:14%"><col style="width:14%"><col style="width:14%"></colgroup><thead><tr><th style="text-align:left;color:#7c8493;font-size:7px;text-transform:uppercase;padding-bottom:7px;border-bottom:1px solid #e4e7ec;">Função</th><th style="text-align:right;color:#7c8493;font-size:7px;text-transform:uppercase;padding-bottom:7px;border-bottom:1px solid #e4e7ec;">Total</th><th style="text-align:right;color:#2f8fd4;font-size:7px;text-transform:uppercase;padding-bottom:7px;border-bottom:1px solid #e4e7ec;">HSE</th><th style="text-align:right;color:#7a5cd6;font-size:7px;text-transform:uppercase;padding-bottom:7px;border-bottom:1px solid #e4e7ec;">Apollo</th></tr></thead><tbody>${functionTableRows}</tbody></table></article>
              <article class="ref-panel" style="height:236px;padding:16px;"><div style="font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#7c8493;">QTD. POR AUDITORIA APOLLO</div><ul style="list-style:none;margin:13px 0 0;padding:0;width:100%;">${apolloListRows}</ul></article>
              <article class="ref-panel" style="height:236px;padding:16px;"><div style="font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#7c8493;">AUDITORIAS POR DEPARTAMENTO</div><ul style="margin:15px 0 0;padding:0;">${departmentRowsRef}</ul></article>
            </section>
            <section class="ref-panel" style="height:176px;margin-top:14px;padding:16px;"><div style="display:flex;justify-content:space-between;align-items:center;"><div style="font-size:9px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#7c8493;">EVOLUÇÃO DIÁRIA DE AUDITORIAS</div><div style="display:flex;gap:18px;font-size:9px;color:#7c8493;"><span><i style="display:inline-block;width:9px;height:9px;background:#2f8fd4;border-radius:2px;margin-right:6px;"></i>HSE · ${hseTotal}</span><span><i style="display:inline-block;width:9px;height:9px;background:#7a5cd6;border-radius:2px;margin-right:6px;"></i>Apollo · ${apolloTotal}</span></div></div><div class="chart-area" style="display:flex;gap:12px;margin-top:15px;height:112px;"><div style="height:112px;display:flex;flex-direction:column;justify-content:space-between;font:9px monospace;color:#7c8493;"><span>${dailyMax}</span><span>${Math.round(dailyMax*2/3)}</span><span>${Math.round(dailyMax/3)}</span><span>0</span></div><div style="position:relative;flex:1;height:112px;"><div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:space-between;"><i style="border-top:1px solid #e4e7ec"></i><i style="border-top:1px solid #e4e7ec"></i><i style="border-top:1px solid #e4e7ec"></i><i style="border-top:1px solid #e4e7ec"></i></div><div style="position:relative;height:100%;display:flex;align-items:flex-end;gap:12px;">${dailyBarsRef}</div><div style="display:flex;gap:12px;margin-top:6px;height:12px;align-items:flex-start;">${dailyLabelsRef}</div></div></div></section>
            <footer style="display:flex;justify-content:space-between;font-size:9px;color:#7c8493;padding:12px 0 0;"><span>Outbound System · Relatório consolidado HSE + Apollo</span><span style="font-family:monospace;">D-6 a D-1 · HSE ${hseWtd} · Apollo ${apolloWtd}</span></footer>
          </main>
        </div>`;
        container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '0px';
        container.style.top = '0px';
        container.style.width = '1280px';
        container.style.zIndex = '9999';
        container.style.opacity = '1';
        container.style.pointerEvents = 'none';
        container.innerHTML = html;
        document.body.appendChild(container);

        drawConsolidatedHorizontalBars('consolidated-department-chart', byDepartment, ['#10b981', '#38bdf8', '#f59e0b'], container);
        drawConsolidatedDonutChart('consolidated-type-chart', byType, ['#a78bfa', '#38bdf8', '#10b981', '#f59e0b', '#ef4444'], container);
        drawConsolidatedDailyChart(dayKeys, hseDaily, apolloDaily, container);

        const captureEl = container.querySelector('#consolidated-capture-area');
        if (!captureEl) throw new Error('Não foi possível montar o relatório consolidado para captura.');

        // Aguarda o navegador concluir layout, fontes e desenho do canvas antes da captura.
        if (document.fonts?.ready) await document.fonts.ready;
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

        // Rasterização determinística do DOM: o html2canvas estava descartando
        // os descendentes Grid/Flex embora eles existissem no HTML capturado.
        const serializedCapture = new XMLSerializer().serializeToString(captureEl);
        const svgCapture = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xhtml="http://www.w3.org/1999/xhtml" width="1280" height="720" viewBox="0 0 1280 720"><foreignObject x="0" y="0" width="1280" height="720"><xhtml:div xmlns="http://www.w3.org/1999/xhtml" style="width:1280px;height:720px;overflow:hidden;">${serializedCapture}</xhtml:div></foreignObject></svg>`;
        const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgCapture)}`;
        const canvas = document.createElement('canvas');
        canvas.width = 1280;
        canvas.height = 720;
        const canvasContext = canvas.getContext('2d');
        const captureImage = new Image();
        await new Promise((resolve, reject) => {
            captureImage.onload = resolve;
            captureImage.onerror = () => reject(new Error('Não foi possível rasterizar o dashboard consolidado.'));
            captureImage.src = svgDataUrl;
        });
        canvasContext.drawImage(captureImage, 0, 0, 1280, 720);

        const blob = await new Promise((resolve, reject) => {
            canvas.toBlob(result => result ? resolve(result) : reject(new Error('O navegador não conseguiu converter o relatório em PNG.')), 'image/png');
        });
        const link = document.createElement('a');
        link.download = `Relatorio_Consolidado_HSE_Apollo_${new Date().toISOString().split('T')[0]}.png`;
        link.href = URL.createObjectURL(blob);
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);

    } catch (e) {
        console.error("Erro ao exportar imagem consolidada:", e);
        const message = e?.message || 'falha desconhecida';
        alert(`Erro ao exportar imagem consolidada: ${message}`);
    } finally {
        if (container) document.body.removeChild(container);
        setConsolidatedBtnLoading(btn, false, 'Imagem');
    }
}

function consolidatedSvgEscape(value) {
    return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function drawConsolidatedHorizontalBars(canvasId, data, colors, root = document) {
    const svg = root.querySelector ? root.querySelector(`#${canvasId}`) : document.getElementById(canvasId);
    if (!svg) return;
    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const max = Math.max(1, ...entries.map(([, value]) => value));
    const chartLeft = 84;
    const chartWidth = 150;
    const rowHeight = 42;
    const body = entries.length ? entries.map(([label, value], index) => {
        const y = 10 + index * rowHeight;
        const barWidth = Math.max(2, (value / max) * chartWidth);
        return `<text x="${chartLeft - 7}" y="${y + 11}" fill="#cbd5e1" font-size="9" text-anchor="end">${consolidatedSvgEscape(label)}</text><rect x="${chartLeft}" y="${y}" width="${chartWidth}" height="14" rx="4" fill="#1a2940"/><rect x="${chartLeft}" y="${y}" width="${barWidth}" height="14" rx="4" fill="${colors[index % colors.length]}"/><text x="${Math.min(chartLeft + barWidth + 6, 242)}" y="${y + 11}" fill="#f8fafc" font-size="10" font-weight="700">${value}</text>`;
    }).join('') : '<text x="125" y="70" fill="#718aa3" font-size="11" text-anchor="middle">Sem dados</text>';
    svg.innerHTML = `<rect width="250" height="150" fill="transparent"/>${body}`;
}

function drawConsolidatedDonutChart(canvasId, data, colors, root = document) {
    const svg = root.querySelector ? root.querySelector(`#${canvasId}`) : document.getElementById(canvasId);
    if (!svg) return;
    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const total = entries.reduce((sum, [, value]) => sum + value, 0);
    const circumference = 2 * Math.PI * 43;
    let offset = 0;
    const rings = entries.map(([label, value], index) => {
        const length = total ? (value / total) * circumference : 0;
        const ring = `<circle cx="78" cy="75" r="43" fill="none" stroke="${colors[index % colors.length]}" stroke-width="17" stroke-dasharray="${length} ${circumference - length}" stroke-dashoffset="${-offset}" transform="rotate(-90 78 75)"/>`;
        offset += length;
        return ring;
    }).join('');
    svg.innerHTML = `<rect width="190" height="150" fill="transparent"/><circle cx="78" cy="75" r="43" fill="none" stroke="#1a2940" stroke-width="17"/>${rings}<circle cx="78" cy="75" r="28" fill="#101b31"/><text x="78" y="80" fill="#f8fafc" font-size="17" font-weight="800" text-anchor="middle">${total}</text>`;
}

function drawConsolidatedDailyChart(dayKeys, hseDaily, apolloDaily, root = document) {
    const svg = root.querySelector ? root.querySelector('#consolidated-daily-chart') : document.getElementById('consolidated-daily-chart');
    if (!svg) return;
    const width = 1210;
    const height = 92;
    const left = 38;
    const top = 8;
    const chartHeight = 57;
    const chartWidth = width - left - 12;
    const maxValue = Math.max(1, ...dayKeys.map(key => Math.max(hseDaily[key] || 0, apolloDaily[key] || 0)));
    const groupWidth = chartWidth / Math.max(1, dayKeys.length);
    const barWidth = Math.max(12, groupWidth * 0.22);
    let body = '';
    for (let i = 0; i <= 3; i++) {
        const y = top + (chartHeight / 3) * i;
        const value = Math.round(maxValue - (maxValue / 3) * i);
        body += `<line x1="${left}" y1="${y}" x2="${left + chartWidth}" y2="${y}" stroke="#263b57" stroke-width="1"/><text x="${left - 6}" y="${y + 3}" fill="#718aa3" font-size="8" text-anchor="end">${value}</text>`;
    }
    dayKeys.forEach((key, index) => {
        const center = left + index * groupWidth + groupWidth / 2;
        const hseValue = hseDaily[key] || 0;
        const apolloValue = apolloDaily[key] || 0;
        const hseHeight = (hseValue / maxValue) * chartHeight;
        const apolloHeight = (apolloValue / maxValue) * chartHeight;
        const date = parseAnyDate(key);
        const label = date ? formatConsolidatedDate(date, { day: '2-digit', month: '2-digit' }) : key;
        body += `<rect x="${center - barWidth - 2}" y="${top + chartHeight - hseHeight}" width="${barWidth}" height="${Math.max(1, hseHeight)}" rx="3" fill="#36b9ed"/><rect x="${center + 2}" y="${top + chartHeight - apolloHeight}" width="${barWidth}" height="${Math.max(1, apolloHeight)}" rx="3" fill="#a78bfa"/><text x="${center}" y="${height - 8}" fill="#cbd5e1" font-size="8" text-anchor="middle">${label}</text>`;
    });
    svg.innerHTML = `<rect width="${width}" height="${height}" fill="transparent"/>${body}`;
}

function initializeConsolidatedMultiSelect(wrapper) {
    if (!wrapper || wrapper.dataset.initialized === 'true') return;
    wrapper.dataset.initialized = 'true';
    const button = wrapper.querySelector('.multi-select-btn');
    const dropdown = wrapper.querySelector('.multi-select-dropdown');
    const search = wrapper.querySelector('.multi-select-search');
    const clear = wrapper.querySelector('.multi-select-clear');
    const options = wrapper.querySelector('.multi-select-options');
    button?.addEventListener('click', event => {
        event.stopPropagation();
        document.querySelectorAll('.consolidated-multi-select .multi-select-dropdown.open').forEach(item => {
            if (item !== dropdown) item.classList.remove('open');
        });
        dropdown?.classList.toggle('open');
        button?.classList.toggle('open', dropdown?.classList.contains('open'));
        if (dropdown?.classList.contains('open')) search?.focus();
    });
    search?.addEventListener('input', () => {
        const query = search.value.toLowerCase();
        options?.querySelectorAll('.multi-select-option').forEach(option => {
            option.classList.toggle('hidden', !option.textContent.toLowerCase().includes(query));
        });
    });
    options?.addEventListener('change', event => {
        if (event.target.matches('input[type="checkbox"]')) updateConsolidatedMultiSelectLabel(wrapper);
    });
    clear?.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        options?.querySelectorAll('input[type="checkbox"]').forEach(input => { input.checked = false; });
        updateConsolidatedMultiSelectLabel(wrapper);
    });
    document.addEventListener('click', event => {
        if (!wrapper.contains(event.target)) {
            dropdown?.classList.remove('open');
            button?.classList.remove('open');
        }
    });
}

function populateConsolidatedMultiSelect(filterName, values) {
    const wrapper = document.querySelector(`.consolidated-multi-select[data-filter="${filterName}"]`);
    const options = wrapper?.querySelector('.multi-select-options');
    if (!wrapper || !options) return;
    options.innerHTML = [...values].map(value => `<label class="multi-select-option"><input type="checkbox" value="${consolidatedEscape(value)}"> ${consolidatedEscape(value)}</label>`).join('') || '<span class="multi-select-empty">Nenhuma opção disponível</span>';
    updateConsolidatedMultiSelectLabel(wrapper);
}

async function initializeConsolidatedFilterOptions() {
    if (!document.body.classList.contains('consolidado-page')) return;
    const departmentWrapper = document.querySelector('.consolidated-multi-select[data-filter="department"]');
    const functionWrapper = document.querySelector('.consolidated-multi-select[data-filter="function"]');
    const dateStartEl = document.getElementById('date-start');
    const dateEndEl = document.getElementById('date-end');
    if (!departmentWrapper && !functionWrapper) return;
    initializeConsolidatedMultiSelect(departmentWrapper);
    initializeConsolidatedMultiSelect(functionWrapper);

    const defaultPeriod = getConsolidatedDefaultPeriod();
    const toInputDate = value => {
        const d = new Date(value);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    if (dateStartEl && !dateStartEl.value) dateStartEl.value = toInputDate(defaultPeriod.start);
    if (dateEndEl && !dateEndEl.value) dateEndEl.value = toInputDate(defaultPeriod.end);

    try {
        const data = await fetchConsolidatedData({ department: '', departments: [], functions: [], start: null, end: null, explicit: true });
        const all = [...data.hse, ...data.apollo];
        const normalizeDepartment = value => {
            const normalized = String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[\s_-]+/g, '');
            if (normalized === 'OUTBOUND') return 'Outbound';
            if (normalized === 'TRANSPORTE' || normalized === 'TRANSPORT') return 'Transporte';
            if (normalized === 'TRANSFEROUT') return 'TransferOut';
            return String(value || '').trim();
        };
        const departments = [...new Set(all.map(item => normalizeDepartment(getConsolidatedDepartmentValue(item))).filter(value => value && !['#N/A', 'N/A', 'NA'].includes(String(value).toUpperCase())))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
        const functions = [...new Set(all.map(getConsolidatedFunctionValue).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
        populateConsolidatedMultiSelect('department', departments);
        populateConsolidatedMultiSelect('function', functions);
    } catch (error) {
        console.error('Erro ao carregar opções dos filtros consolidados:', error);
    }

    const applyBtn = document.getElementById('apply-filters');
    const resetBtn = document.getElementById('reset-filters');
    if (applyBtn) applyBtn.addEventListener('click', () => { window.__auditFiltersExplicit = true; });
    if (resetBtn) resetBtn.addEventListener('click', () => {
        window.__auditFiltersExplicit = false;
        if (dateStartEl) dateStartEl.value = toInputDate(defaultPeriod.start);
        if (dateEndEl) dateEndEl.value = toInputDate(defaultPeriod.end);
        document.querySelectorAll('.consolidated-multi-select input[type="checkbox"]').forEach(input => { input.checked = false; });
        document.querySelectorAll('.consolidated-multi-select').forEach(updateConsolidatedMultiSelectLabel);
    });
}

/* ---------------- Inicialização ---------------- */
function initializeConsolidatedExport() {
    const excelBtn = document.getElementById('export-consolidated-excel-btn');
    const csvBtn = document.getElementById('export-consolidated-csv-btn');
    const imgBtn = document.getElementById('export-consolidated-img-btn');
    if (excelBtn) excelBtn.onclick = exportConsolidatedExcel;
    if (csvBtn) csvBtn.onclick = exportConsolidatedCSV;
    if (imgBtn) imgBtn.onclick = () => exportConsolidatedImage();
    initializeConsolidatedFilterOptions();
}
