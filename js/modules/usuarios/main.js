/**
 * Inicialização do Módulo de Gestão de Usuários
 * Remove a classe 'hidden' do conteúdo principal após a animação de entrada
 * e inicializa o gerenciador de usuários.
 */

window.addEventListener('introFinished', () => {
    const mainContent = document.getElementById('main-content');
    if (mainContent) mainContent.classList.remove('hidden');

    // Inicializa a sidebar retrátil
    initializeSidebar();

    // Inicializa o gerenciador de usuários após o conteúdo ser revelado
    if (typeof auth !== 'undefined' && typeof permissions !== 'undefined') {
        if (!window.usuariosManager) {
            window.usuariosManager = new UsuariosManager();
        }
    }
});

// Fallback: caso o evento introFinished não seja disparado em até 5s
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const mainContent = document.getElementById('main-content');
        if (mainContent && mainContent.classList.contains('hidden')) {
            window.dispatchEvent(new CustomEvent('introFinished'));
        }
    }, 5000);
});
