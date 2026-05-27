/**
 * Inicialização do Módulo de Produtividade
 */

window.addEventListener('introFinished', () => {
    const mainContent = document.getElementById('main-content');
    if (mainContent) mainContent.classList.remove('hidden');

    updateDateTime();
    setInterval(updateDateTime, 1000);

    initializeSidebar();
    
    setupViewControls();
    loadProdData();
    loadAllRankings();
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
