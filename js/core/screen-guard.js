/**
 * Protetor de Telas Internas
 * Valida acesso a telas/screens dentro de uma página
 */

class ScreenGuard {
    constructor() {
        this.screenAccessLog = [];
    }

    /**
     * Valida se o usuário pode acessar uma tela específica
     */
    podeAcessarTela(screenId) {
        if (!auth || !auth.estaAutenticado()) {
            return false;
        }

        if (!permissionGuard) {
            console.warn('PermissionGuard não está disponível');
            return false;
        }

        const temPermissao = permissionGuard.temPermissaoTela(auth.obterUsuarioAtual().nivel, screenId);

        if (!temPermissao) {
            const usuario = auth.obterUsuarioAtual();
            this.screenAccessLog.push({
                timestamp: new Date().toISOString(),
                usuario: usuario.email,
                nivel: usuario.nivel,
                screenId: screenId,
                acesso: 'NEGADO'
            });
        }

        return temPermissao;
    }

    /**
     * Bloqueia uma tela se o usuário não tem permissão
     */
    bloquearTelaSeNecessario(screenId) {
        if (!this.podeAcessarTela(screenId)) {
            const screen = document.getElementById(`screen-${screenId}`);
            if (screen) {
                screen.style.display = 'none';
                screen.setAttribute('data-blocked', 'true');
                screen.innerHTML = '<div style="padding: 2rem; text-align: center; color: #ef4444;"><p>Acesso negado a esta tela.</p></div>';
            }
            return false;
        }
        return true;
    }

    /**
     * Intercepta mudanças de tela para validar permissões
     */
    interceptarMudancasTela() {
        const originalSwitchScreen = window.switchScreen;

        if (typeof originalSwitchScreen === 'function') {
            window.switchScreen = (screenName, callback) => {
                if (!this.podeAcessarTela(screenName)) {
                    console.warn(`Tentativa de acesso não autorizado à tela: ${screenName}`);
                    return;
                }

                // Chamar a função original se tem permissão
                originalSwitchScreen.call(window, screenName, callback);
            };
        }
    }

    /**
     * Protege o inicializador de telas
     */
    protegerInitializeScreens() {
        const originalInitializeScreens = window.initializeScreens;

        if (typeof originalInitializeScreens === 'function') {
            window.initializeScreens = (switchCallback) => {
                // Chamar a função original
                originalInitializeScreens.call(window, switchCallback);

                // Depois, interceptar cliques em itens de menu
                const menuItems = document.querySelectorAll('.menu-item[data-screen]');
                menuItems.forEach(item => {
                    const screenId = item.getAttribute('data-screen');

                    // Remover listeners anteriores
                    const newItem = item.cloneNode(true);
                    item.parentNode.replaceChild(newItem, item);

                    // Adicionar novo listener com validação
                    newItem.addEventListener('click', (e) => {
                        e.preventDefault();

                        if (!this.podeAcessarTela(screenId)) {
                            console.warn(`Acesso negado à tela: ${screenId}`);
                            alert('Você não tem permissão para acessar esta tela.');
                            return;
                        }

                        window.switchScreen(screenId, switchCallback);
                    });
                });
            };
        }
    }

    /**
     * Obtém o log de tentativas de acesso
     */
    obterLog() {
        return this.screenAccessLog;
    }

    /**
     * Limpa o log de tentativas de acesso
     */
    limparLog() {
        this.screenAccessLog = [];
    }
}

// Instância global do protetor de telas
const screenGuard = new ScreenGuard();

// Inicializar proteção de telas quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (screenGuard && auth && auth.estaAutenticado()) {
            // Interceptar mudanças de tela
            screenGuard.interceptarMudancasTela();

            // Proteger inicializador de telas
            screenGuard.protegerInitializeScreens();
        }
    }, 50);
});
