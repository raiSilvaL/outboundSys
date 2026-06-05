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
            'auditHse.html': nivelHierarquia.indexOf('Supervisor'),
            'feedbackFaltas.html': nivelHierarquia.indexOf('Coordenador'),
            'gestaoUsuarios.html': nivelHierarquia.indexOf('Gerente'),
            'produtividade.html': nivelHierarquia.indexOf('PS')
        };

        Object.entries(menuFilters).forEach(([href, minIndex]) => {
            const links = document.querySelectorAll(`a[href="${href}"]`);
            links.forEach(link => {
                const temPermissao = indexNivel >= minIndex;
                
                if (!temPermissao) {
                    const menuItem = link.closest('.menu-item');
                    if (menuItem) {
                        menuItem.style.display = 'none';
                    }
                }
            });
        });

        // Verificar acesso à página atual
        let paginaAtual = window.location.pathname.split('/').pop();
        if (!paginaAtual || paginaAtual === '') paginaAtual = 'index.html';
        
        // Normalizar caso o Netlify remova a extensão .html
        const paginaNormalizada = paginaAtual.endsWith('.html') ? paginaAtual : paginaAtual + '.html';
        
        if (menuFilters[paginaNormalizada] !== undefined) {
            const temPermissao = indexNivel >= menuFilters[paginaNormalizada];
            
            if (!temPermissao) {
                console.warn(`Acesso negado para ${paginaNormalizada}. Nível necessário: ${menuFilters[paginaNormalizada]}, Nível atual: ${indexNivel}`);
                window.location.href = '../index.html';
            }
        }
    }, 100);
});
