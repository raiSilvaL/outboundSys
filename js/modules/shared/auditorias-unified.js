(() => {
    const HSE_URL = 'https://script.google.com/macros/s/AKfycbzY_J3ODgUI6VTpCgzoBcw-RzImTlxDjzOlgxY5HQ3F4EK8aNQl25K2FqW13LGG-Eb77Q/exec?aba=Query';
    const APOLLO_URL = 'https://script.google.com/macros/s/AKfycbzY_J3ODgUI6VTpCgzoBcw-RzImTlxDjzOlgxY5HQ3F4EK8aNQl25K2FqW13LGG-Eb77Q/exec?aba=Query Apollo';

    const normalizeDept = value => {
        const normalized = String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[\s_-]+/g, '');
        if (normalized === 'OUTBOUND') return 'Outbound';
        if (normalized === 'TRANSPORTE' || normalized === 'TRANSPORT') return 'Transporte';
        if (normalized === 'TRANSFEROUT') return 'TransferOut';
        return null;
    };

    const getJson = url => fetch(url).then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    });

    const render = (hse, apollo) => {
        const priority = ['Outbound', 'Transporte', 'TransferOut'];
        const all = [...hse.map(item => ({ ...item, origem: 'HSE' })), ...apollo.map(item => ({ ...item, origem: 'Apollo' }))];
        const counts = Object.fromEntries(priority.map(dept => [dept, 0]));
        all.forEach(item => { const dept = normalizeDept(item.Departamento); if (dept) counts[dept]++; });
        const byOrigin = { HSE: hse.length, Apollo: apollo.length };
        const total = all.length;
        const panel = document.getElementById('auditorias-unified-content');
        if (!panel) return;
        panel.innerHTML = `
            <div class="auditorias-unified-header"><div><span class="eyebrow">MÓDULO ÚNICO</span><h1>Auditorias</h1><p>Visão operacional integrada de auditorias HSE e Apollo.</p></div><div class="auditorias-unified-total"><strong>${total}</strong><span>auditorias carregadas</span></div></div>
            <div class="auditorias-origin-grid">
                <article class="auditoria-origin-card auditoria-origin-hse"><div class="origin-title"><i class="fas fa-shield-halved"></i><span>HSE</span></div><strong>${byOrigin.HSE}</strong><small>registros de auditoria</small></article>
                <article class="auditoria-origin-card auditoria-origin-apollo"><div class="origin-title"><i class="fas fa-rocket"></i><span>Apollo</span></div><strong>${byOrigin.Apollo}</strong><small>registros de auditoria</small></article>
                <article class="auditoria-origin-card auditoria-origin-total"><div class="origin-title"><i class="fas fa-layer-group"></i><span>Total integrado</span></div><strong>${total}</strong><small>HSE + Apollo</small></article>
            </div>
            <div class="auditorias-unified-table-wrap"><div class="unified-section-title"><span>Distribuição por departamento</span><small>Departamentos prioritários</small></div><div class="auditorias-department-grid">${priority.map(dept => `<div class="auditoria-dept-item"><span>${dept}</span><strong>${counts[dept]}</strong><div><i style="width:${total ? Math.min(100, counts[dept] / total * 100) : 0}%"></i></div></div>`).join('')}</div></div>
            <div class="auditorias-unified-hint"><i class="fas fa-circle-info"></i><span>Use <b>Visão HSE</b> e <b>Visão Apollo</b> para análises detalhadas por origem. Use <b>Consolidado</b> para unir os dados e gerar as exportações.</span></div>`;
    };

    Promise.allSettled([getJson(HSE_URL), getJson(APOLLO_URL)]).then(results => {
        const hse = results[0].status === 'fulfilled' && Array.isArray(results[0].value) ? results[0].value : [];
        const apollo = results[1].status === 'fulfilled' && Array.isArray(results[1].value) ? results[1].value : [];
        render(hse, apollo);
    }).catch(error => {
        console.error('Erro ao carregar módulo Auditorias:', error);
        const panel = document.getElementById('auditorias-unified-content');
        if (panel) panel.innerHTML = '<div class="auditorias-unified-error">Não foi possível carregar os dados integrados no momento.</div>';
    });
})();
