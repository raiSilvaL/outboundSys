/**
 * Módulo de Exportação (Excel e CSV) para Auditoria
 */

function initializeExportButtons() {
    const excelBtn = document.getElementById('export-excel-btn');
    const csvBtn = document.getElementById('export-csv-btn');

    if (excelBtn) excelBtn.addEventListener('click', exportTableToExcel);
    if (csvBtn) csvBtn.addEventListener('click', exportTableToCSV);
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
        XLSX.writeFile(wb, `Auditorias_Colaboradores_${new Date().toISOString().split('T')[0]}.xlsx`);
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
        link.setAttribute("download", `Auditorias_Colaboradores_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (e) {
        console.error("Erro ao exportar CSV:", e);
        alert("Erro ao exportar para CSV.");
    }
}
