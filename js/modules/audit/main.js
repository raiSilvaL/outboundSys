/**
 * Inicialização do Módulo de Auditoria HSE
 */

window.addEventListener('introFinished', () => {
    const mainContent = document.getElementById('main-content');
    if (mainContent) mainContent.classList.remove('hidden');

    updateDateTime();
    setInterval(updateDateTime, 1000);

    initializeSidebar();
    initializeMenus();
    
    initializeScreens((screenName) => {
        if (screenName === 'audit-collaborator') {
            initializeCollaboratorFilters();
            initializeExportButtons();
            initializeReportExport();
            updateCollaboratorTable();
            updateCollaboratorStats();
        }
    });

    loadDashboardData();
    initializeCarousel();
});

// Fallback
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const mainContent = document.getElementById('main-content');
        if (mainContent && mainContent.classList.contains('hidden')) {
            window.dispatchEvent(new CustomEvent('introFinished'));
        }
    }, 5000);
});
