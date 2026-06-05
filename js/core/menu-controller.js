/**
 * Controlador de Menu Lateral
 * Filtra itens do menu baseado nas permissões do usuário
 */

document.addEventListener('DOMContentLoaded', () => {
    // Pequeno delay para garantir que outros scripts carregaram
    setTimeout(() => {
        if (typeof auth === 'undefined' || !auth.estaAutenticado()) {
            return;
        }

        const usuario = auth.obterUsuarioAtual();
        if (!usuario) return;

        const nivelHierarquia = ['PS', 'PA', 'Coordenador', 'Supervisor', 'Gerente', 'ADM'];
        const indexNivel = nivelHierarquia.indexOf(usuario.nivel);
        
        // 1. Mostrar/Esconder seção de telas em desenvolvimento apenas para Supervisor+
        const futureSection = document.getElementById('future-telas-section');
        if (futureSection) {
            if (indexNivel >= nivelHierarquia.indexOf('Supervisor')) {
                futureSection.style.display = 'block';
            } else {
                futureSection.style.display = 'none';
            }
        }

        // 2. Configuração de filtros do menu
        // Mapeia o arquivo ou identificador para o nível mínimo necessário
        const menuFilters = {
            'auditHse.html': { minIndex: nivelHierarquia.indexOf('Supervisor'), keywords: ['audithse', 'audit-parent', 'audit-submenu'] },
            'feedbackFaltas.html': { minIndex: nivelHierarquia.indexOf('Coordenador'), keywords: ['feedbackfaltas', 'feedback-main'] },
            'gestaoUsuarios.html': { minIndex: nivelHierarquia.indexOf('Gerente'), keywords: ['gestaousuarios'] },
            'produtividade.html': { minIndex: nivelHierarquia.indexOf('PS'), keywords: ['produtividade'] }
        };

        // 3. Aplicar filtragem
        Object.entries(menuFilters).forEach(([fileName, config]) => {
            const temPermissao = indexNivel >= config.minIndex;
            
            if (!temPermissao) {
                // Esconder links diretos por href (ex: href="auditHse.html" ou href="../html/auditHse.html")
                document.querySelectorAll(`a[href*="${fileName}"]`).forEach(link => {
                    // Tenta encontrar o container do item de menu (.menu-item ou .menu-group)
                    const menuItem = link.closest('.menu-item') || link;
                    const groupItem = link.closest('.menu-group');
                    
                    if (groupItem) {
                        groupItem.style.display = 'none';
                    } else {
                        menuItem.style.display = 'none';
                    }
                });

                // Esconder por keywords (IDs, data-screen, ou texto)
                config.keywords.forEach(keyword => {
                    // Por ID
                    const elementById = document.getElementById(keyword);
                    if (elementById) {
                        const container = elementById.closest('.menu-group') || elementById.closest('.menu-item') || elementById;
                        container.style.display = 'none';
                    }

                    // Por data-screen
                    document.querySelectorAll(`[data-screen*="${keyword}"]`).forEach(el => {
                        const container = el.closest('.menu-group') || el.closest('.menu-item') || el;
                        container.style.display = 'none';
                    });

                    // Por texto do menu (fallback)
                    document.querySelectorAll('.menu-text').forEach(textEl => {
                        const text = textEl.textContent.toLowerCase();
                        const search = keyword.toLowerCase().replace('-', ' ');
                        if (text.includes(search)) {
                            const container = textEl.closest('.menu-group') || textEl.closest('.menu-item');
                            if (container) container.style.display = 'none';
                        }
                    });
                });
            }
        });

        // 4. Verificar acesso à página atual (Segurança básica no lado do cliente)
        let path = window.location.pathname;
        let paginaAtual = path.split('/').pop();
        if (!paginaAtual || paginaAtual === '') paginaAtual = 'index.html';
        
        // Normalizar nome do arquivo
        const paginaNormalizada = paginaAtual.includes('.') ? paginaAtual : paginaAtual + '.html';
        
        // Se estiver em uma página de módulo, verificar permissão
        for (const [file, config] of Object.entries(menuFilters)) {
            if (paginaNormalizada.includes(file)) {
                if (indexNivel < config.minIndex) {
                    console.warn(`Acesso negado para ${paginaNormalizada}. Redirecionando...`);
                    // Se estiver dentro da pasta html, volta um nível, senão vai direto
                    const prefix = path.includes('/html/') ? '../' : '';
                    window.location.href = prefix + 'index.html';
                }
                break;
            }
        }
    }, 150);
});
