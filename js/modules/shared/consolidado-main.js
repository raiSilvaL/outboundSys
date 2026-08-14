window.addEventListener('introFinished', () => {
    const mainContent = document.getElementById('main-content');
    if (mainContent) mainContent.classList.remove('hidden');
    if (typeof initializeSidebar === 'function') initializeSidebar();
    if (typeof initializeMenus === 'function') initializeMenus();
    if (typeof initializeConsolidatedExport === 'function') initializeConsolidatedExport();
});

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const mainContent = document.getElementById('main-content');
        if (mainContent && mainContent.classList.contains('hidden')) {
            window.dispatchEvent(new CustomEvent('introFinished'));
        }
    }, 5000);
});
