/**
 * Controlador de Menu Lateral - Versão "Whitelist" (Segurança Máxima)
 * Esconde todos os módulos por padrão e exibe apenas aqueles que o usuário tem permissão.
 */

const MenuController = {
    nivelHierarquia: ['PS', 'PA', 'Coordenador', 'Supervisor', 'Gerente', 'ADM'],
    
    // Mapeamento de permissões (replicando a lógica da index)
    permissoes: {
        'auditHse.html': 'Supervisor',
        'feedbackFaltas.html': 'Coordenador',
        'gestaoUsuarios.html': 'Gerente',
        'produtividade.html': 'PS' // Todos têm acesso
    },

    // Mapeamento de elementos por módulo
    elementosModulo: {
        'auditHse.html': ['.menu-item[href*="auditHse.html"]', '.menu-group:has(a[href*="auditHse.html"])', '#audit-parent', '#audit-submenu', '.menu-item:has(.fa-clipboard-check)'],
        'feedbackFaltas.html': ['.menu-item[href*="feedbackFaltas.html"]', '.menu-item[data-screen="feedback-main"]', '.menu-item:has(.fa-comments)'],
        'gestaoUsuarios.html': ['.menu-item[href*="gestaoUsuarios.html"]', '.menu-item:has(.fa-users-cog)'],
        'produtividade.html': ['.menu-item[href*="produtividade.html"]', '.menu-item:has(.fa-chart-line)']
    },

    aplicarFiltro: function() {
        if (typeof auth === 'undefined' || !auth.estaAutenticado()) return;

        const usuario = auth.obterUsuarioAtual();
        if (!usuario) return;

        const nivelUsuario = usuario.nivel;
        const indexNivelUsuario = this.nivelHierarquia.indexOf(nivelUsuario);

        // 1. Lidar com a seção de futuras telas
        const futureSection = document.getElementById('future-telas-section');
        if (futureSection) {
            const nivelNecessario = 'Supervisor';
            const indexNecessario = this.nivelHierarquia.indexOf(nivelNecessario);
            futureSection.style.setProperty('display', indexNivelUsuario >= indexNecessario ? 'block' : 'none', 'important');
        }

        // 2. Filtrar módulos
        Object.entries(this.permissoes).forEach(([pagina, nivelMinimo]) => {
            const indexMinimo = this.nivelHierarquia.indexOf(nivelMinimo);
            const temPermissao = indexNivelUsuario >= indexMinimo;
            
            // Buscar todos os elementos relacionados a este módulo
            const seletores = this.elementosModulo[pagina] || [];
            seletores.forEach(seletor => {
                document.querySelectorAll(seletor).forEach(el => {
                    if (temPermissao) {
                        // Se tem permissão, garante que o display seja o original (flex/block)
                        // mas não remove o !important se ele não estiver atrapalhando.
                        // O padrão da sidebar é flex para menu-item.
                        const displayPadrao = el.classList.contains('menu-item') ? 'flex' : 'block';
                        el.style.setProperty('display', displayPadrao, 'important');
                    } else {
                        // Se não tem permissão, esconde com prioridade máxima
                        el.style.setProperty('display', 'none', 'important');
                    }
                });
            });

            // Fallback: Esconder por texto caso os seletores falhem
            if (!temPermissao) {
                const textoBusca = pagina.replace('.html', '').toLowerCase();
                document.querySelectorAll('.menu-text').forEach(span => {
                    const textoMenu = span.textContent.toLowerCase();
                    // Mapeamento de nomes amigáveis para busca por texto
                    const nomesMap = {
                        'audithse': 'auditoria hse',
                        'feedbackfaltas': 'feedback de faltas',
                        'gestaousuarios': 'gestão de usuários',
                        'produtividade': 'produtividade'
                    };
                    
                    if (textoMenu.includes(nomesMap[textoBusca] || textoBusca)) {
                        const container = span.closest('.menu-group') || span.closest('.menu-item');
                        if (container) container.style.setProperty('display', 'none', 'important');
                    }
                });
            }
        });

        this.verificarAcessoPagina(indexNivelUsuario);
    },

    verificarAcessoPagina: function(indexNivelUsuario) {
        const path = window.location.pathname;
        const paginaAtual = path.split('/').pop() || 'index.html';
        const paginaNormalizada = paginaAtual.includes('.') ? paginaAtual : paginaAtual + '.html';
        
        for (const [file, nivelMinimo] of Object.entries(this.permissoes)) {
            if (paginaNormalizada.includes(file)) {
                const indexMinimo = this.nivelHierarquia.indexOf(nivelMinimo);
                if (indexNivelUsuario < indexMinimo) {
                    const prefix = path.includes('/html/') ? '../' : '';
                    window.location.href = prefix + 'index.html';
                }
                break;
            }
        }
    },

    init: function() {
        // Estilo CSS injetado para esconder os itens problemáticos imediatamente se possível
        const style = document.createElement('style');
        style.innerHTML = `
            /* Esconde itens de menu que sabemos que precisam de permissão alta por padrão */
            /* Eles serão re-exibidos via JS se o usuário tiver permissão */
            .menu-item[href*="auditHse.html"], 
            .menu-item[href*="gestaoUsuarios.html"],
            .menu-item[href*="feedbackFaltas.html"],
            .menu-group:has(a[href*="auditHse.html"]),
            #audit-parent { 
                display: none !important; 
            }
        `;
        document.head.appendChild(style);

        const executar = () => this.aplicarFiltro();

        // Ciclo de execução para cobrir todos os estados de carregamento
        executar();
        document.addEventListener('DOMContentLoaded', executar);
        window.addEventListener('load', executar);
        
        // Observer para mudanças dinâmicas
        const observer = new MutationObserver(executar);
        observer.observe(document.body, { childList: true, subtree: true });

        // Intervalo de segurança curto nos primeiros segundos
        let checks = 0;
        const interval = setInterval(() => {
            executar();
            if (++checks > 20) clearInterval(interval);
        }, 200);
    }
};

MenuController.init();
