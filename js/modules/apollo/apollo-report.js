/**
 * Módulo de Relatório Visual para Auditoria Apollo
 */

function initializeReportExport() {
    const reportBtn = document.getElementById('export-report-btn');
    if (reportBtn) {
        reportBtn.onclick = async () => {
            if (!confrontoData.length) {
                alert('Nenhum dado disponível para exportar.');
                return;
            }

            const loadingSpinner = document.getElementById('loading-spinner');
            if (loadingSpinner) {
                loadingSpinner.style.display = 'flex';
                loadingSpinner.innerHTML = '<div class="spinner"></div><p id="loading-text">Gerando Relatório Visual...</p>';
            }

            try {
                const reportData = calculateReportData();
                if (window.fillReportTemplate) {
                    window.fillReportTemplate(reportData);
                    const captureArea = document.getElementById('capture-area');
                    const canvas = await html2canvas(captureArea, {
                        scale: 2,
                        useCORS: true,
                        backgroundColor: '#0a0e27'
                    });
                    const link = document.createElement('a');
                    link.download = `Relatorio_Apollo_${new Date().toISOString().split('T')[0]}.png`;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                }
            } catch (e) {
                console.error("Erro ao gerar relatório:", e);
                alert("Erro ao gerar relatório visual.");
            } finally {
                if (loadingSpinner) loadingSpinner.style.display = 'none';
            }
        };
    }
}

function calculateReportData() {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    // WTD: Domingo da semana atual até Ontem
    const weekStart = new Date(yesterday);
    weekStart.setDate(yesterday.getDate() - yesterday.getDay());
    weekStart.setHours(0, 0, 0, 0);

    // Dados Filtrados (respeitando filtros da tabela)
    const filteredBase = getFilteredCollaboratorsForReport();

    // Estatísticas D-1 e WTD
    const d1Stats = calculateStatsForPeriod(filteredBase, yesterday, yesterday);
    const wtdStats = calculateStatsForPeriod(filteredBase, weekStart, yesterday);

    // Dados por Função (WTD)
    const functionStats = calculateStatsByFunction(filteredBase, weekStart, yesterday);

    // Evolução Diária (WTD)
    const dailyStats = calculateDailyStatsForReport(filteredBase, weekStart, yesterday);

    return {
        d1: d1Stats,
        wtd: wtdStats,
        yesterday: yesterday,
        weekStart: weekStart,
        functionStats: functionStats,
        dailyStats: dailyStats
    };
}

function getFilteredCollaboratorsForReport() {
    const processed = confrontoData.map(item => {
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
        return { ...item, nome, dept, funcao };
    });

    return processed.filter(item => {
        if (collaboratorFilters.nome && !item.nome.toLowerCase().includes(collaboratorFilters.nome)) return false;
        if (collaboratorFilters.departamento.size > 0 && !collaboratorFilters.departamento.has(item.dept)) return false;
        if (collaboratorFilters.funcao.size > 0 && !collaboratorFilters.funcao.has(item.funcao)) return false;
        if (collaboratorFilters.status.size > 0) {
            const stats = calculateStatsForPeriod([item], collaboratorPeriodFilters.startDate || new Date(0), collaboratorPeriodFilters.endDate || new Date());
            if (!collaboratorFilters.status.has(stats.status)) return false;
        }
        return true;
    });
}

function calculateStatsForPeriod(data, start, end) {
    let metaAtigida = 0;
    let metaNaoAtigida = 0;
    let semAuditorias = 0;

    const sDate = new Date(start);
    sDate.setHours(0, 0, 0, 0);
    const eDate = new Date(end);
    eDate.setHours(23, 59, 59, 999);

    data.forEach(item => {
        let realizado = 0;
        let dias = 0;
        Object.keys(item).forEach(key => {
            const d = new Date(key);
            if (!isNaN(d.getTime())) {
                d.setHours(12, 0, 0, 0);
                if (d >= sDate && d <= eDate) {
                    realizado += parseInt(item[key]) || 0;
                    dias++;
                }
            }
        });

        const meta = dias * APOLLO_META_DIARIA;
        if (dias > 0) {
            if (realizado >= meta) metaAtigida++;
            else if (realizado > 0) metaNaoAtigida++;
            else semAuditorias++;
        }
    });

    const total = metaAtigida + metaNaoAtigida + semAuditorias;
    let status = 'Sem Auditorias';
    if (total > 0) {
        if (metaAtigida > 0) status = 'Meta Atingida';
        else if (metaNaoAtigida > 0) status = 'Meta Não Atingida';
    }

    return {
        total,
        metaAtigida,
        metaNaoAtigida,
        semAuditorias,
        status,
        adhesionPct: total > 0 ? ((metaAtigida / total) * 100).toFixed(1) + '%' : '0%',
        abovePct: total > 0 ? ((metaAtigida / total) * 100).toFixed(1) + '%' : '0%',
        belowPct: total > 0 ? ((metaNaoAtigida / total) * 100).toFixed(1) + '%' : '0%',
        nonePct: total > 0 ? ((semAuditorias / total) * 100).toFixed(1) + '%' : '0%'
    };
}

function calculateStatsByFunction(data, start, end) {
    const stats = {};
    data.forEach(item => {
        const f = item.funcao;
        if (!stats[f]) stats[f] = { total: 0, atingiu: 0, naoAtingiu: 0, naoResp: 0 };

        let realizado = 0;
        let dias = 0;
        Object.keys(item).forEach(key => {
            const d = new Date(key);
            if (!isNaN(d.getTime()) && d >= start && d <= end) {
                realizado += parseInt(item[key]) || 0;
                dias++;
            }
        });

        if (dias > 0) {
            stats[f].total++;
            const meta = dias * APOLLO_META_DIARIA;
            if (realizado >= meta) stats[f].atingiu++;
            else if (realizado > 0) stats[f].naoAtingiu++;
            else stats[f].naoResp++;
        }
    });
    return stats;
}

function calculateDailyStatsForReport(data, start, end) {
    const daily = {};
    let current = new Date(start);
    current.setHours(12, 0, 0, 0);
    const endLimit = new Date(end);
    endLimit.setHours(12, 0, 0, 0);

    const allKeys = data.length > 0 ? Object.keys(data[0]) : [];
    const dateKeyMap = {};
    allKeys.forEach(key => {
        const d = new Date(key);
        if (!isNaN(d.getTime())) {
            const iso = d.toISOString().split('T')[0];
            dateKeyMap[iso] = key;
        }
    });

    while (current <= endLimit) {
        const isoKey = current.toISOString().split('T')[0];
        const originalKey = dateKeyMap[isoKey];

        daily[isoKey] = { atingiu: 0, naoAtingiu: 0, naoResp: 0 };

        if (originalKey) {
            data.forEach(item => {
                const val = parseInt(item[originalKey]) || 0;
                if (val >= APOLLO_META_DIARIA) daily[isoKey].atingiu++;
                else if (val > 0) daily[isoKey].naoAtingiu++;
                else daily[isoKey].naoResp++;
            });
        }
        current.setDate(current.getDate() + 1);
    }
    return daily;
}
