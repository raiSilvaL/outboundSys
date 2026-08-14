/**
 * Report Engine - VERSÃO FINAL DE ALTA FIDELIDADE V16
 * Foco: Resolver erro de rotação no html2canvas usando SVGs para os títulos verticais.
 */

const icons = {
    clipboard: `<svg viewBox="0 0 40 40" width="42" height="42"><rect x="8" y="5" width="24" height="30" rx="2" fill="#0c4a6e" stroke="#38bdf8" stroke-width="2"/><rect x="14" y="2" width="12" height="6" rx="2" fill="#38bdf8"/><line x1="14" y1="15" x2="26" y2="15" stroke="#7dd3fc" stroke-width="2"/><line x1="14" y1="22" x2="26" y2="22" stroke="#7dd3fc" stroke-width="2"/><line x1="14" y1="29" x2="22" y2="29" stroke="#7dd3fc" stroke-width="2"/></svg>`,
    target: `<svg viewBox="0 0 40 40" width="42" height="42"><circle cx="20" cy="22" r="15" stroke="#10b981" stroke-width="2" fill="none"/><circle cx="20" cy="22" r="10" stroke="#10b981" stroke-width="2" fill="none"/><circle cx="20" cy="22" r="5" fill="#10b981"/><path d="M20 18 L20 4 M16 8 L20 4 L24 8" stroke="#10b981" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    alert: `<svg viewBox="0 0 40 40" width="42" height="42"><path d="M20 5 L35 32 L5 32 Z" fill="#3a2a0f" stroke="#f59e0b" stroke-width="2.5"/><text x="20" y="27" text-anchor="middle" font-size="20" font-weight="900" fill="#f59e0b">!</text></svg>`,
    personX: `<svg viewBox="0 0 40 40" width="42" height="42"><circle cx="15" cy="12" r="6" fill="#ef4444"/><path d="M5 32 Q5 22 15 22 Q25 22 25 32" fill="#ef4444"/><line x1="28" y1="12" x2="36" y2="20" stroke="#ef4444" stroke-width="3"/><line x1="36" y1="12" x2="28" y2="20" stroke="#ef4444" stroke-width="3"/></svg>`,
    percent: `<svg viewBox="0 0 40 40" width="42" height="42"><circle cx="20" cy="20" r="16" stroke="#a78bfa" stroke-width="3" fill="#2e1f4d"/><text x="20" y="27" text-anchor="middle" font-size="18" font-weight="900" fill="#a78bfa">%</text></svg>`
};

const labels = {
    d1: `<svg viewBox="0 0 55 150" width="55" height="150"><text x="27" y="75" text-anchor="middle" font-size="20" font-weight="900" fill="#ffffff" transform="rotate(-90, 27, 75)" letter-spacing="3">D-1</text></svg>`,
    wtd: `<svg viewBox="0 0 55 150" width="55" height="150"><text x="27" y="75" text-anchor="middle" font-size="20" font-weight="900" fill="#ffffff" transform="rotate(-90, 27, 75)" letter-spacing="3">WTD</text></svg>`
};

function getLiteralTemplate() {
    return `
    <div id="capture-area" style="width: 1200px; background: linear-gradient(160deg, #0a0e27 0%, #0f172a 100%); padding: 0; margin: 0; font-family: 'Segoe UI', Arial, sans-serif; color: #e0e7ff; border: 1px solid #1e293b;">
        <style>
            #capture-area .header { background: linear-gradient(90deg, #0a0e27 0%, #0f2744 100%); height: 100px; padding: 0 30px; display: flex; align-items: center; justify-content: space-between; width: 100%; box-sizing: border-box; border-bottom: 2px solid #38bdf8; }
            #capture-area .header-left { display: flex; align-items: center; }
            #capture-area .shield-box { width: 64px; height: 64px; margin-right: 20px; flex-shrink: 0; }
            #capture-area .header-title h1 { color: #ffffff; font-size: 24px; font-weight: 800; text-transform: uppercase; margin: 0; line-height: 1.1; letter-spacing: 0.5px; }
            #capture-area .header-title h2 { color: #38bdf8; font-size: 15px; font-weight: 500; margin: 4px 0 0 0; }
            #capture-area .header-right { background: rgba(56,189,248,0.1); border-radius: 12px; padding: 10px 20px; display: flex; align-items: center; border: 1px solid rgba(56,189,248,0.35); }
            #capture-area .helmet-box { width: 50px; height: 50px; margin-right: 12px; flex-shrink: 0; }
            #capture-area .safety-text { color: #ffffff; font-size: 14px; font-weight: 800; text-align: center; text-transform: uppercase; line-height: 1.2; }

            #capture-area .period-section { background: #0f172a; padding: 20px 25px; display: flex; gap: 20px; }
            #capture-area .period-card { background: #131c31; border: 1.5px solid #1e293b; border-radius: 12px; padding: 15px 20px; flex: 1; display: flex; align-items: center; gap: 15px; box-shadow: 0 0 0 1px rgba(56,189,248,0.05), 0 4px 10px rgba(0,0,0,0.25); }
            #capture-area .cal-icon { width: 42px; height: 42px; flex-shrink: 0; }
            #capture-area .period-info h3 { font-size: 16px; font-weight: 800; color: #38bdf8; margin: 0 0 5px 0; }
            #capture-area .period-info p { font-size: 13.5px; color: #94a3b8; margin: 0; line-height: 1.5; }
            #capture-area .period-info p b { font-weight: 800; color: #e0e7ff; }

            #capture-area .section-header { background: linear-gradient(90deg, #0284c7, #38bdf8); color: #0a0e27; font-size: 14px; font-weight: 800; text-transform: uppercase; padding: 10px 25px; letter-spacing: 1px; }
            #capture-area .resumo-row { display: flex; background: #0f172a; border-bottom: 2px solid #1e293b; }
            
            #capture-area .row-label { 
                background: #0a0e27; 
                color: #ffffff; 
                width: 55px; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                border-right: 2px solid #1e293b; 
                flex-shrink: 0; 
                padding: 0;
                overflow: hidden;
            }
            
            #capture-area .kpi-card { flex: 1; padding: 15px 10px; border-right: 1.5px solid #1e293b; display: flex; flex-direction: column; align-items: center; text-align: center; min-height: 130px; }
            #capture-area .kpi-card:last-child { border-right: none; }
            #capture-area .kpi-label { font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 10px; height: 32px; display: flex; align-items: center; justify-content: center; line-height: 1.2; }
            #capture-area .kpi-icon-box { width: 42px; height: 42px; margin-bottom: 6px; }
            #capture-area .kpi-value { font-size: 30px; font-weight: 900; line-height: 1; margin: 4px 0; }
            #capture-area .kpi-sub { font-size: 13px; font-weight: 700; }
            #capture-area .kpi-blue { color: #38bdf8; }
            #capture-area .kpi-green { color: #10b981; }
            #capture-area .kpi-orange { color: #f59e0b; }
            #capture-area .kpi-red { color: #ef4444; }
            #capture-area .kpi-purple { color: #a78bfa; }

            #capture-area .charts-section { display: flex; background: #0f172a; padding: 20px 25px; gap: 25px; min-height: 420px; }
            #capture-area .chart-panel { background: #131c31; border: 1.5px solid #1e293b; border-radius: 12px; flex: 1; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 4px 10px rgba(0,0,0,0.25); }
            #capture-area .panel-header { background: linear-gradient(90deg, #0284c7, #8b5cf6); color: #ffffff; font-size: 13px; font-weight: 800; text-align: center; padding: 10px; text-transform: uppercase; letter-spacing: 0.5px; flex-shrink: 0; }
            #capture-area .panel-body { padding: 15px; flex: 1; position: relative; display: flex; flex-direction: column; height: 100%; box-sizing: border-box; overflow: hidden; }
            
            #capture-area .legend-box-top { display: flex; justify-content: center; gap: 20px; padding: 8px; background: #0f172a; border-bottom: 1px solid #1e293b; flex-shrink: 0; }
            #capture-area .legend-box-bottom { display: flex; justify-content: center; gap: 25px; padding: 12px; background: #131c31; border-top: 1.5px solid #1e293b; flex-shrink: 0; }
            #capture-area .legend-item { display: flex; align-items: center; gap: 8px; font-size: 11.5px; font-weight: 700; color: #cbd5e1; }
            #capture-area .legend-color { width: 14px; height: 14px; border-radius: 3px; }

            #capture-area .detail-table { width: 100%; height: 100%; border-collapse: collapse; font-size: 11px; table-layout: fixed; }
            #capture-area .detail-table th { background: #0c4a6e; color: #e0f2fe; font-weight: 800; padding: 4px; border: 1px solid #1e3a5c; text-transform: uppercase; font-size: 9.5px; line-height: 1.1; }
            #capture-area .detail-table td { padding: 4px; text-align: center; border: 1px solid #1e293b; color: #cbd5e1; vertical-align: middle; }
            #capture-area .detail-table .func-col { width: 35%; text-align: left; padding-left: 8px; font-weight: 800; font-size: 10.5px; color: #e0e7ff; }
            #capture-area .detail-table .adesao-col { background: rgba(16,185,129,0.15); color: #10b981; font-weight: 700; }
            #capture-area .detail-table tfoot td { background: #0284c7 !important; color: #ffffff !important; font-weight: 800 !important; padding: 8px; font-size: 11px; }

            #capture-area .evolution-section { background: #0f172a; padding: 0 25px 25px 25px; }
            #capture-area .evolution-panel { background: #131c31; border: 1.5px solid #1e293b; border-radius: 12px; overflow: hidden; }

            #capture-area .footer { background: #0a0e27; border-top: 1.5px solid #1e293b; padding: 12px 25px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748b; }
        </style>

        <div class="header">
            <div class="header-left">
                <div class="shield-box"><svg viewBox="0 0 80 90" width="64" height="64"><polygon points="26,55 8,80 26,73" fill="#8b5cf6"/><polygon points="54,55 72,80 54,73" fill="#8b5cf6"/><path d="M40 3 C56 20 59 42 59 57 L59 61 C59 64 56 66 53 66 L27 66 C24 66 21 64 21 61 L21 57 C21 42 24 20 40 3 Z" fill="#38bdf8" stroke="#0284c7" stroke-width="2"/><circle cx="40" cy="34" r="9" fill="#e0f2fe" stroke="#0284c7" stroke-width="2"/><path d="M33 66 L40 88 L47 66 Z" fill="#f59e0b"/><path d="M36.5 66 L40 80 L43.5 66 Z" fill="#ef4444"/></svg></div>
                <div class="header-title"><h1>DASHBOARD – FORMULÁRIO APOLLO</h1><h2>KPIs de Resposta</h2></div>
            </div>
            <div class="header-right">
                <div class="helmet-box"><svg viewBox="0 0 60 60" width="50" height="50"><circle cx="30" cy="28" r="24" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2"/><ellipse cx="30" cy="30" rx="17" ry="15" fill="#0369a1" stroke="#0a0e27" stroke-width="1.5"/><ellipse cx="24" cy="24" rx="5" ry="4" fill="#ffffff" opacity="0.55"/><rect x="6" y="40" width="48" height="9" rx="4.5" fill="#94a3b8"/></svg></div>
                <div class="safety-text">AUDITORIA<br>APOLLO</div>
            </div>
        </div>


        <div class="period-section">
            <div class="period-card">
                <div class="cal-icon"><svg viewBox="0 0 40 40" width="42" height="42"><rect x="2" y="6" width="36" height="30" rx="5" fill="#0f172a" stroke="#38bdf8" stroke-width="2.5"/><rect x="2" y="6" width="36" height="10" rx="5" fill="#38bdf8"/><line x1="12" y1="2" x2="12" y2="12" stroke="#38bdf8" stroke-width="3"/><line x1="28" y1="2" x2="28" y2="12" stroke="#38bdf8" stroke-width="3"/></svg></div>
                <div class="period-info">
                    <h3>D-1 (Ontem)</h3>
                    <p><b>Período:</b> <span id="rep-d1-period">--</span></p>
                    <p><b>Dia da semana:</b> <span id="rep-d1-day">--</span></p>
                </div>
            </div>
            <div class="period-card">
                <div class="cal-icon"><svg viewBox="0 0 40 40" width="42" height="42"><rect x="2" y="6" width="36" height="30" rx="5" fill="#0f172a" stroke="#38bdf8" stroke-width="2.5"/><rect x="2" y="6" width="36" height="10" rx="5" fill="#38bdf8"/><line x1="12" y1="2" x2="12" y2="12" stroke="#38bdf8" stroke-width="3"/><line x1="28" y1="2" x2="28" y2="12" stroke="#38bdf8" stroke-width="3"/></svg></div>
                <div class="period-info">
                    <h3>WTD (Semana)</h3>
                    <p><b>Período:</b> <span id="rep-wtd-period">--</span></p>
                    <p><b>Dia da semana:</b> <span id="rep-wtd-days-range">--</span></p>
                </div>
            </div>
        </div>

        <div class="section-header">RESUMO DE INDICADORES</div>
        <div class="resumo-row">
            <div class="row-label" id="rep-label-d1"></div>
            <div class="kpi-card"><div class="kpi-label">QUANTIDADE DE<br>AUDITORES</div><div class="kpi-icon-box" id="rep-d1-icon-1"></div><div class="kpi-value kpi-blue" id="rep-d1-total">0</div></div>
            <div class="kpi-card"><div class="kpi-label">RESPONDERAM<br>ATINGINDO A META</div><div class="kpi-icon-box" id="rep-d1-icon-2"></div><div class="kpi-value kpi-green" id="rep-d1-above">0</div><div class="kpi-sub kpi-green" id="rep-d1-above-pct">(0%)</div></div>
            <div class="kpi-card"><div class="kpi-label">RESPONDERAM<br>NÃO ATINGINDO A META</div><div class="kpi-icon-box" id="rep-d1-icon-3"></div><div class="kpi-value kpi-orange" id="rep-d1-below">0</div><div class="kpi-sub kpi-orange" id="rep-d1-below-pct">(0%)</div></div>
            <div class="kpi-card"><div class="kpi-label">NÃO RESPONDERAM</div><div class="kpi-icon-box" id="rep-d1-icon-4"></div><div class="kpi-value kpi-red" id="rep-d1-none">0</div><div class="kpi-sub kpi-red" id="rep-d1-none-pct">(0%)</div></div>
            <div class="kpi-card"><div class="kpi-label">% DE ADESÃO<br>(ATINGIRAM A META)</div><div class="kpi-icon-box" id="rep-d1-icon-5"></div><div class="kpi-value kpi-purple" id="rep-d1-adhesion">0%</div></div>
        </div>
        <div class="resumo-row">
            <div class="row-label" id="rep-label-wtd"></div>
            <div class="kpi-card"><div class="kpi-label">QUANTIDADE DE<br>AUDITORES</div><div class="kpi-icon-box" id="rep-wtd-icon-1"></div><div class="kpi-value kpi-blue" id="rep-wtd-total">0</div></div>
            <div class="kpi-card"><div class="kpi-label">RESPONDERAM<br>ATINGINDO A META</div><div class="kpi-icon-box" id="rep-wtd-icon-2"></div><div class="kpi-value kpi-green" id="rep-wtd-above">0</div><div class="kpi-sub kpi-green" id="rep-wtd-above-pct">(0%)</div></div>
            <div class="kpi-card"><div class="kpi-label">RESPONDERAM<br>NÃO ATINGINDO A META</div><div class="kpi-icon-box" id="rep-wtd-icon-3"></div><div class="kpi-value kpi-orange" id="rep-wtd-below">0</div><div class="kpi-sub kpi-orange" id="rep-wtd-below-pct">(0%)</div></div>
            <div class="kpi-card"><div class="kpi-label">NÃO RESPONDERAM</div><div class="kpi-icon-box" id="rep-wtd-icon-4"></div><div class="kpi-value kpi-red" id="rep-wtd-none">0</div><div class="kpi-sub kpi-red" id="rep-wtd-none-pct">(0%)</div></div>
            <div class="kpi-card"><div class="kpi-label">% DE ADESÃO<br>(ATINGIRAM A META)</div><div class="kpi-icon-box" id="rep-wtd-icon-5"></div><div class="kpi-value kpi-purple" id="rep-wtd-adhesion">0%</div></div>
        </div>

        <div class="charts-section">
            <div class="chart-panel">
                <div class="panel-header">RESPOSTAS POR FUNÇÃO (WTD)</div>
                <div class="legend-box-top">
                    <div class="legend-item"><div class="legend-color" style="background:#10b981;"></div>Atingiram a Meta</div>
                    <div class="legend-item"><div class="legend-color" style="background:#f59e0b;"></div>Não Atingiram a Meta</div>
                    <div class="legend-item"><div class="legend-color" style="background:#ef4444;"></div>Não responderam</div>
                </div>
                <div class="panel-body" style="justify-content:center;"><canvas id="rep-bar-chart" style="width:520px; height:320px;"></canvas></div>
            </div>
            <div class="chart-panel">
                <div class="panel-header">DETALHAMENTO POR FUNÇÃO (WTD)</div>
                <div class="panel-body">
                    <table class="detail-table">
                        <thead>
                            <tr>
                                <th rowspan="2" class="func-col">Função</th>
                                <th rowspan="2" style="width:11%;">Total de<br>colaboradores</th>
                                <th colspan="3">RESPOSTA</th>
                                <th rowspan="2" style="width:14%;">% de Adesão<br>(Atingiram a meta)</th>
                            </tr>
                            <tr>
                                <th style="width:11%;">Atingiram a meta</th>
                                <th style="width:11%;">Não atingiram a meta</th>
                                <th style="width:11%;">Não responderam</th>
                            </tr>
                        </thead>
                        <tbody id="rep-table-body"></tbody>
                        <tfoot id="rep-table-footer"></tfoot>
                    </table>
                </div>
            </div>
        </div>

        <div class="evolution-section">
            <div class="evolution-panel">
                <div class="panel-header">EVOLUÇÃO DIÁRIA DE RESPOSTAS (WTD)</div>
                <div class="panel-body"><canvas id="rep-line-chart" style="width:1120px; height:260px;"></canvas></div>
                <div class="legend-box-bottom">
                    <div class="legend-item"><div class="legend-color" style="background:#10b981;"></div>Meta Atingida</div>
                    <div class="legend-item"><div class="legend-color" style="background:#f59e0b;"></div>Meta Não Atingida</div>
                    <div class="legend-item"><div class="legend-color" style="background:#ef4444;"></div>Não Respondido</div>
                </div>
            </div>
        </div>

        <div class="footer">
            <div>Outbound System - Gerado em: <span id="rep-gen-date">--</span></div>
            <div>© 2026 Dashboard de Segurança</div>
        </div>
    </div>`;
}

function initExportSystem() {
    let wrapper = document.getElementById('report-export-wrapper');
    if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.id = 'report-export-wrapper';
        wrapper.style.position = 'fixed';
        wrapper.style.left = '-10000px';
        wrapper.style.top = '0';
        wrapper.style.zIndex = '-1';
        document.body.appendChild(wrapper);
    }
    wrapper.innerHTML = getLiteralTemplate();
}

window.fillReportTemplate = function(data) {
    initExportSystem();
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    // Injeção de Rótulos Verticais Infalíveis via SVG
    document.getElementById('rep-label-d1').innerHTML = labels.d1;
    document.getElementById('rep-label-wtd').innerHTML = labels.wtd;

    const iconList = [icons.clipboard, icons.target, icons.alert, icons.personX, icons.percent];
    for (let i = 1; i <= 5; i++) {
        document.getElementById(`rep-d1-icon-${i}`).innerHTML = iconList[i - 1];
        document.getElementById(`rep-wtd-icon-${i}`).innerHTML = iconList[i - 1];
    }

    document.getElementById('rep-d1-period').textContent = data.yesterday.toLocaleDateString('pt-BR');
    document.getElementById('rep-d1-day').textContent = days[data.yesterday.getDay()];
    document.getElementById('rep-wtd-period').textContent = `${data.weekStart.toLocaleDateString('pt-BR')} a ${data.yesterday.toLocaleDateString('pt-BR')}`;
    document.getElementById('rep-wtd-days-range').textContent = `${days[data.weekStart.getDay()]} a ${days[data.yesterday.getDay()]}`;

    document.getElementById('rep-d1-total').textContent = data.d1.total || 0;
    document.getElementById('rep-d1-above').textContent = data.d1.metaAtigida || 0;
    document.getElementById('rep-d1-above-pct').textContent = `(${data.d1.abovePct || 0}%)`;
    document.getElementById('rep-d1-below').textContent = data.d1.metaNaoAtigida || 0;
    document.getElementById('rep-d1-below-pct').textContent = `(${data.d1.belowPct || 0}%)`;
    document.getElementById('rep-d1-none').textContent = data.d1.semAuditorias || 0;
    document.getElementById('rep-d1-none-pct').textContent = `(${data.d1.nonePct || 0}%)`;
    document.getElementById('rep-d1-adhesion').textContent = `${data.d1.adhesionPct || 0}%`;

    document.getElementById('rep-wtd-total').textContent = data.wtd.total || 0;
    document.getElementById('rep-wtd-above').textContent = data.wtd.metaAtigida || 0;
    document.getElementById('rep-wtd-above-pct').textContent = `(${data.wtd.abovePct || 0}%)`;
    document.getElementById('rep-wtd-below').textContent = data.wtd.metaNaoAtigida || 0;
    document.getElementById('rep-wtd-below-pct').textContent = `(${data.wtd.belowPct || 0}%)`;
    document.getElementById('rep-wtd-none').textContent = data.wtd.semAuditorias || 0;
    document.getElementById('rep-wtd-none-pct').textContent = `(${data.wtd.nonePct || 0}%)`;
    document.getElementById('rep-wtd-adhesion').textContent = `${data.wtd.adhesionPct || 0}%`;

    const tbody = document.getElementById('rep-table-body');
    let tTotal = 0,
        tAtingiu = 0,
        tNaoAtingiu = 0,
        tNaoResp = 0;
    const sortedStats = Object.entries(data.functionStats).sort((a, b) => b[1].total - a[1].total);

    tbody.innerHTML = sortedStats.map(([func, s]) => {
        const adhesion = s.total > 0 ? ((s.atingiu / s.total) * 100).toFixed(1) : 0;
        tTotal += s.total;
        tAtingiu += s.atingiu;
        tNaoAtingiu += s.naoAtingiu;
        tNaoResp += s.naoResp;
        return `<tr><td class="func-col">${func}</td><td>${s.total}</td><td>${s.atingiu}</td><td>${s.naoAtingiu}</td><td>${s.naoResp}</td><td class="adesao-col">${adhesion}%</td></tr>`;
    }).join('');

    const tAdhesion = tTotal > 0 ? ((tAtingiu / tTotal) * 100).toFixed(1) : 0;
    document.getElementById('rep-table-footer').innerHTML = `
        <tr>
            <td class="func-col" style="background:#0284c7; color:#fff;">TOTAL GERAL</td>
            <td style="background:#0284c7; color:#fff;">${tTotal}</td>
            <td style="background:#0284c7; color:#fff;">${tAtingiu}</td>
            <td style="background:#0284c7; color:#fff;">${tNaoAtingiu}</td>
            <td style="background:#0284c7; color:#fff;">${tNaoResp}</td>
            <td style="background:#0284c7; color:#fff;">${tAdhesion}%</td>
        </tr>`;

    document.getElementById('rep-gen-date').textContent = new Date().toLocaleString('pt-BR');

    const dpr = 2;
    const barCanvas = document.getElementById('rep-bar-chart');
    const bCtx = barCanvas.getContext('2d');

    const visibleStats = sortedStats.slice(0, 20);
    const barHeight = 22;
    const barGap = 8;
    const totalHeight = visibleStats.length * (barHeight + barGap) + 60;
    barCanvas.width = 520 * dpr;
    barCanvas.height = Math.max(320, totalHeight) * dpr;
    bCtx.scale(dpr, dpr);

    const bW = 520 - 180,
        bH = barCanvas.height / dpr - 60,
        maxVal = Math.max(...visibleStats.map(e => e[1].total), 10) * 1.15;

    bCtx.fillStyle = '#94a3b8';
    bCtx.font = 'bold 11px Arial';
    bCtx.textAlign = 'center';
    bCtx.fillText('NÚMERO DE COLABORADORES', 160 + bW / 2, barCanvas.height / dpr - 15);

    bCtx.strokeStyle = 'rgba(148,163,184,0.15)';
    bCtx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const x = 160 + (i / 5) * bW;
        bCtx.beginPath();
        bCtx.moveTo(x, 10);
        bCtx.lineTo(x, barCanvas.height / dpr - 40);
        bCtx.stroke();
        bCtx.fillStyle = '#64748b';
        bCtx.font = '9px Arial';
        bCtx.fillText(Math.round((i / 5) * maxVal), x, barCanvas.height / dpr - 30);
    }

    visibleStats.forEach(([name, s], i) => {
        const y = 20 + i * (barHeight + barGap);
        let x = 160;
        const items = [{ v: s.atingiu, c: '#10b981' }, { v: s.naoAtingiu, c: '#f59e0b' }, { v: s.naoResp, c: '#ef4444' }];
        items.forEach(item => {
            const bw = (item.v / maxVal) * bW;
            if (bw > 0) {
                bCtx.fillStyle = item.c;
                bCtx.fillRect(x, y, bw, barHeight);
                if (bw > 15) {
                    bCtx.fillStyle = '#0a0e27';
                    bCtx.font = 'bold 9px Arial';
                    bCtx.textAlign = 'center';
                    bCtx.fillText(item.v, x + bw / 2, y + barHeight * 0.7);
                }
                x += bw;
            }
        });
        bCtx.fillStyle = '#e0e7ff';
        bCtx.font = 'bold 10px Arial';
        bCtx.textAlign = 'left';
        bCtx.fillText(s.total, x + 5, y + barHeight * 0.7);
        bCtx.fillStyle = '#cbd5e1';
        bCtx.font = 'bold 9px Arial';
        bCtx.textAlign = 'right';
        bCtx.fillText(name.substring(0, 25), 155, y + barHeight * 0.7);
    });

    const lineCanvas = document.getElementById('rep-line-chart');
    const lCtx = lineCanvas.getContext('2d');
    const dailyEntries = Object.entries(data.dailyStats).sort((a, b) => a[0].localeCompare(b[0]));
    lineCanvas.width = 1120 * dpr;
    lineCanvas.height = 260 * dpr;
    lCtx.scale(dpr, dpr);

    const lW = 1120 - 150,
        lH = 260 - 100;
    const maxDaily = Math.max(...dailyEntries.map(e => Math.max(e[1].atingiu, e[1].naoAtingiu, e[1].naoResp)), 5) * 1.4;
    const xStep = dailyEntries.length > 1 ? lW / (dailyEntries.length - 1) : 0;

    lCtx.fillStyle = '#94a3b8';
    lCtx.font = 'bold 12px Arial';
    lCtx.textAlign = 'center';
    lCtx.fillText('DATA DA AUDITORIA', 1120 / 2, 250);
    lCtx.save();
    lCtx.translate(25, 120);
    lCtx.rotate(-Math.PI / 2);
    lCtx.fillText('QUANTIDADE DE RESPOSTAS', 0, 0);
    lCtx.restore();

    const series = [
        { key: 'atingiu', color: '#10b981' },
        { key: 'naoAtingiu', color: '#f59e0b' },
        { key: 'naoResp', color: '#ef4444' }
    ];

    // 1. Desenhar Linhas
    series.forEach(s => {
        if (dailyEntries.length > 1) {
            lCtx.beginPath();
            lCtx.strokeStyle = s.color;
            lCtx.lineWidth = 4;
            dailyEntries.forEach((e, i) => {
                const x = 85 + i * xStep;
                const y = 200 - (e[1][s.key] / maxDaily * lH);
                if (i === 0) lCtx.moveTo(x, y);
                else lCtx.lineTo(x, y);
            });
            lCtx.stroke();
        }
    });

    // 2. Desenhar Pontos e Rótulos com Evitação de Sobreposição
    dailyEntries.forEach((e, i) => {
        const x = 85 + (dailyEntries.length > 1 ? i * xStep : lW / 2);
        
        // Coletar pontos para esta data
        let points = series.map(s => ({
            val: e[1][s.key],
            y: 200 - (e[1][s.key] / maxDaily * lH),
            color: s.color
        }));

        // Desenhar círculos dos pontos
        points.forEach(p => {
            lCtx.fillStyle = p.color;
            lCtx.beginPath();
            lCtx.arc(x, p.y, 7, 0, Math.PI * 2);
            lCtx.fill();
            lCtx.strokeStyle = '#ffffff';
            lCtx.lineWidth = 2.5;
            lCtx.stroke();
        });

        // Desenhar rótulos (números) com ajuste inteligente de posição
        let occupiedY = points.map(p => p.y); // Evitar sobrepor o próprio ponto
        
        // Ordenar pontos por Y (do topo para baixo) para processar rótulos
        const sortedPoints = [...points].sort((a, b) => a.y - b.y);
        
        sortedPoints.forEach(p => {
            let labelY = p.y - 14; // Posição padrão (acima)
            // Opções de posição: Acima, Muito Acima, Abaixo, Muito Abaixo
            const options = [p.y - 14, p.y - 30, p.y + 22, p.y + 38];
            
            for (let opt of options) {
                let collision = occupiedY.some((occY, idx) => {
                    // Se for um ponto, distância mínima de 12px; se for outro rótulo, 15px
                    const minDist = idx < points.length ? 12 : 15;
                    return Math.abs(occY - opt) < minDist;
                });
                
                if (!collision) {
                    labelY = opt;
                    break;
                }
            }
            
            lCtx.fillStyle = '#e0e7ff';
            lCtx.font = 'bold 13px Arial';
            lCtx.textAlign = 'center';
            lCtx.fillText(p.val, x, labelY);
            occupiedY.push(labelY);
        });
    });

    lCtx.fillStyle = '#cbd5e1';
    lCtx.font = 'bold 13px Arial';
    lCtx.textAlign = 'center';
    dailyEntries.forEach((e, i) => {
        const date = e[0].split('-').reverse().slice(0, 2).join('/');
        lCtx.fillText(date, 85 + i * xStep, 222);
    });
};

window.exportReportAsImage = function() {
    if (window.reportData) window.fillReportTemplate(window.reportData);
    const wrapper = document.getElementById('report-export-wrapper');
    const captureArea = document.getElementById('capture-area');
    wrapper.style.left = '0';
    wrapper.style.zIndex = '99999';

    setTimeout(() => {
        html2canvas(captureArea, { scale: 2, useCORS: true, backgroundColor: '#0a0e27', logging: false }).then(canvas => {
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = `Relatorio_Seguranca_Final_v16.png`;
            link.click();
            wrapper.style.left = '-10000px';
        }).catch(err => {
            console.error(err);
            wrapper.style.left = '-10000px';
            alert('Erro ao gerar imagem.');
        });
    }, 2000);
};

initExportSystem();