/**
 * Controlador de Menu Lateral - Versão Robusta
 * Filtra itens do menu baseado nas permissões do usuário e monitora mudanças no DOM
 */

const MenuController = {
    nivelHierarquia: ['PS', 'PA', 'Coordenador', 'Supervisor', 'Gerente', 'ADM'],
    
    getFilters: function() {
        return {
            'auditHse.html': { minIndex: this.nivelHierarquia.indexOf('Supervisor'), keywords: ['audithse', 'audit-parent', 'audit-submenu'] },
            'feedbackFaltas.html': { minIndex: this.nivelHierarquia.indexOf('Coordenador'), keywords: ['feedbackfaltas', 'feedback-main'] },
            'gestaoUsuarios.html': { minIndex: this.nivelHierarquia.indexOf('Gerente'), keywords: ['gestaousuarios'] },
            'produtividade.html': { minIndex: this.nivelHierarquia.indexOf('PS'), keywords: ['produtividade'] }
        };
    },

    aplicarFiltro: function() {
        if (typeof auth === 'undefined' || !auth.estaAutenticado()) return;

        const usuario = auth.obterUsuarioAtual();
        if (!usuario) return;

        const indexNivel = this.nivelHierarquia.indexOf(usuario.nivel);
        const filters = this.getFilters();

        // 1. Telas em desenvolvimento
        const futureSection = document.getElementById('future-telas-section');
        if (futureSection) {
            const display = indexNivel >= this.nivelHierarquia.indexOf('Supervisor') ? 'block' : 'none';
            futureSection.style.setProperty('display', display, 'important');
        }

        // 2. Módulos
        Object.entries(filters).forEach(([fileName, config]) => {
            if (indexNivel < config.minIndex) {
                // Esconder por href
                document.querySelectorAll(`a[href*="${fileName}"]`).forEach(link => {
                    const container = link.closest('.menu-group') || link.closest('.menu-item') || link;
                    container.style.setProperty('display', 'none', 'important');
                });

                // Esconder por keywords
                config.keywords.forEach(keyword => {
                    // Por ID
                    const elById = document.getElementById(keyword);
                    if (elById) {
                        const container = elById.closest('.menu-group') || elById.closest('.menu-item') || elById;
                        container.style.setProperty('display', 'none', 'important');
                    }

                    // Por data-screen
                    document.querySelectorAll(`[data-screen*="${keyword}"]`).forEach(el => {
                        const container = el.closest('.menu-group') || el.closest('.menu-item') || el;
                        container.style.setProperty('display', 'none', 'important');
                    });

                    // Por texto
                    document.querySelectorAll('.menu-text').forEach(textEl => {
                        const text = textEl.textContent.toLowerCase();
                        const search = keyword.toLowerCase().replace('-', ' ');
                        if (text.includes(search)) {
                            const container = textEl.closest('.menu-group') || textEl.closest('.menu-item');
                            if (container) container.style.setProperty('display', 'none', 'important');
                        }
                    });
                });
            }
        });

        this.verificarAcessoPagina(indexNivel, filters);
    },

    verificarAcessoPagina: function(indexNivel, filters) {
        const path = window.location.pathname;
        const paginaAtual = path.split('/').pop() || 'index.html';
        const paginaNormalizada = paginaAtual.includes('.') ? paginaAtual : paginaAtual + '.html';
        
        for (const [file, config] of Object.entries(filters)) {
            if (paginaNormalizada.includes(file) && indexNivel < config.minIndex) {
                const prefix = path.includes('/html/') ? '../' : '';
                window.location.href = prefix + 'index.html';
                break;
            }
        }
    },

    init: function() {
        // Execução imediata
        this.aplicarFiltro();

        // Execução no carregamento
        window.addEventListener('load', () => this.aplicarFiltro());
        document.addEventListener('DOMContentLoaded', () => this.aplicarFiltro());

        // MutationObserver para lidar com renderizações dinâmicas
        const observer = new MutationObserver(() => this.aplicarFiltro());
        observer.observe(document.body, { childList: true, subtree: true });

        // Backup com Interval (último recurso)
        let count = 0;
        const interval = setInterval(() => {
            this.aplicarFiltro();
            if (++count > 10) clearInterval(interval);
        }, 500);
    }
};

MenuController.init();
