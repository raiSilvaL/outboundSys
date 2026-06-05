/**
 * Controlador de Menu Lateral
 * Filtra itens do menu baseado nas permissões do usuário
 */

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (!auth || !auth.estaAutenticado()) {
            return;
        }

        const usuario = auth.obterUsuarioAtual();
        if (!usuario) return;

        const nivelHierarquia = ['PS', 'PA', 'Coordenador', 'Supervisor', 'Gerente', 'ADM'];
        const indexNivel = nivelHierarquia.indexOf(usuario.nivel);
        
        // Mostrar telas em desenvolvimento apenas para Supervisor+
        const futureSection = document.getElementById('future-telas-section');
        if (futureSection) {
            if (indexNivel >= nivelHierarquia.indexOf('Supervisor')) {
                futureSection.style.display = 'block';
            } else {
                futureSection.style.display = 'none';
            }
        }

        // Filtrar itens do menu por permissão
        const menuFilters = {
            'auditHse.html': { minIndex: nivelHierarquia.indexOf('Supervisor'), keywords: ['audithse', 'audit-parent'] },
            'feedbackFaltas.html': { minIndex: nivelHierarquia.indexOf('Coordenador'), keywords: ['feedbackfaltas', 'feedback-main'] },
            'gestaoUsuarios.html': { minIndex: nivelHierarquia.indexOf('Gerente'), keywords: ['gestaousuarios'] },
            'produtividade.html': { minIndex: nivelHierarquia.indexOf('PS'), keywords: ['produtividade'] }
        };

        Object.entries(menuFilters).forEach(([fileName, config]) => {
            const temPermissao = indexNivel >= config.minIndex;
            
            if (!temPermissao) {
                // 1. Esconder links diretos por href
                document.querySelectorAll(`a[href*="${fileName}"]`).forEach(link => {
                    const menuItem = link.closest('.menu-item') || link;
                    menuItem.style.display = 'none';
                });

                // 2. Esconder itens que podem estar ativos (href="#" com data-screen ou ID específico)
                config.keywords.forEach(keyword => {
                    // Por ID
                    const elementById = document.getElementById(keyword);
                    if (elementById) {
                        const container = elementById.closest('.menu-group') || elementById.closest('.menu-item') || elementById;
                        container.style.display = 'none';
                    }

                    // Por data-screen
                    document.querySelectorAll(`[data-screen*="${keyword}"]`).forEach(el => {
                        const container = el.closest('.menu-item') || el;
                        container.style.display = 'none';
                    });

                    // Por texto do menu (fallback seguro)
                    document.querySelectorAll('.menu-text').forEach(textEl => {
                        if (textEl.textContent.toLowerCase().includes(keyword.replace('-', ' '))) {
                            const container = textEl.closest('.menu-group') || textEl.closest('.menu-item');
                            if (container) container.style.display = 'none';
                        }
                    });
                });
            }
        });

        // Verificar acesso à página atual
        let paginaAtual = window.location.pathname.split('/').pop();
        if (!paginaAtual || paginaAtual === '') paginaAtual = 'index.html';
        
        // Normalizar caso o Netlify remova a extensão .html
        const paginaNormalizada = paginaAtual.endsWith('.html') ? paginaAtual : paginaAtual + '.html';
        
        const configPagina = menuFilters[paginaNormalizada];
        if (configPagina) {
            const temPermissao = indexNivel >= configPagina.minIndex;
            
            if (!temPermissao) {
                console.warn(`Acesso negado para ${paginaNormalizada}. Nível necessário: ${configPagina.minIndex}, Nível atual: ${indexNivel}`);
                window.location.href = '../index.html';
            }
        }
    }, 100);
});
