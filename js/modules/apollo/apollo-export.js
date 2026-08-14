/**
 * Módulo de Exportação (Excel e CSV) para Auditoria Apollo
 */

function initializeExportButtons() {
    const excelBtn = document.getElementById('export-excel-btn');
    const csvBtn = document.getElementById('export-csv-btn');

    if (excelBtn) excelBtn.onclick = exportTableToExcel;
    if (csvBtn) csvBtn.onclick = exportTableToCSV;

    const apolloExcelBtn = document.getElementById('export-apollo-excel-btn');
    const apolloCsvBtn = document.getElementById('export-apollo-csv-btn');

    if (apolloExcelBtn) apolloExcelBtn.onclick = exportApolloTableToExcel;
    if (apolloCsvBtn) apolloCsvBtn.onclick = exportApolloTableToCSV;
}

function getTableDataForExport() {
    const tableBody = document.getElementById('collaborator-table-body');
    if (!tableBody) return [];

    const data = [];
    const rows = tableBody.querySelectorAll('tr');
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const rowData = [];
        cells.forEach(cell => rowData.push(cell.textContent.trim()));
        if (rowData.length > 0) data.push(rowData);
    });
    return data;
}

function getTableHeaders() {
    return ['Colaborador', 'Departamento', 'Funcao', 'Periodo', 'Realizado', 'Meta', 'Status'];
}

function exportTableToExcel() {
    try {
        const headers = getTableHeaders();
        const data = getTableDataForExport();
        if (data.length === 0) { alert('Nenhum dado para exportar.'); return; }

        const exportData = [headers, ...data];
        const ws = XLSX.utils.aoa_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Auditorias");
        XLSX.writeFile(wb, `Auditorias_Apollo_Colaboradores_${new Date().toISOString().split('T')[0]}.xlsx`);
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
        link.setAttribute("download", `Auditorias_Apollo_Colaboradores_${new Date().toISOString().split('T')[0]}.csv`);
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
 * Exportação da tabela de Auditorias Apollo (dados brutos, aba "Query Apollo")
 */
function getApolloExportHeaders() {
    return ['Warehouse', 'Departamento', 'Nome', 'Função', 'Tipo Auditoria', 'Área Auditora', 'CPF', 'Associate Login', 'Created By', 'Created At'];
}

function getApolloExportData() {
    // Usa a base filtrada atual do dashboard (todo o período filtrado, não só os 15 exibidos na tela)
    const source = (typeof filteredData !== 'undefined' && filteredData.length) ? filteredData : allData;
    return source.map(item => {
        const d = parseAnyDate(item[FIELD_DATE]);
        const dataFormatada = d ? d.toLocaleString('pt-BR') : (item[FIELD_DATE] || '');
        return [
            item[FIELD_WAREHOUSE] || '',
            item[FIELD_DEPARTAMENTO] || '',
            item[FIELD_NOME] || '',
            item[FIELD_FUNCAO] || '',
            item[FIELD_TIPO_AUDITORIA] || '',
            item[FIELD_AREA_AUDITORA] || '',
            item[FIELD_CPF] || '',
            item[FIELD_ASSOCIATE_LOGIN] || '',
            item[FIELD_CREATED_BY] || '',
            dataFormatada
        ];
    });
}

function exportApolloTableToExcel() {
    try {
        const headers = getApolloExportHeaders();
        const data = getApolloExportData();
        if (data.length === 0) { alert('Nenhum dado para exportar.'); return; }

        const exportData = [headers, ...data];
        const ws = XLSX.utils.aoa_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Auditorias Apollo");
        XLSX.writeFile(wb, `Auditorias_Apollo_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (e) {
        console.error("Erro ao exportar Excel:", e);
        alert("Erro ao exportar para Excel.");
    }
}

function exportApolloTableToCSV() {
    try {
        const headers = getApolloExportHeaders();
        const data = getApolloExportData();
        if (data.length === 0) { alert('Nenhum dado para exportar.'); return; }

        const csvContent = [headers, ...data].map(e => e.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `Auditorias_Apollo_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (e) {
        console.error("Erro ao exportar CSV:", e);
        alert("Erro ao exportar para CSV.");
    }
}

function initializeApolloExportButtons() {
    const apolloExcelBtn = document.getElementById('export-apollo-excel-btn');
    const apolloCsvBtn = document.getElementById('export-apollo-csv-btn');

    if (apolloExcelBtn) apolloExcelBtn.onclick = exportApolloTableToExcel;
    if (apolloCsvBtn) apolloCsvBtn.onclick = exportApolloTableToCSV;
}
