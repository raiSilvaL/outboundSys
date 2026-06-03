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
        
        // Mostrar telas em desenvolvimento apenas para Supervisor+ (ou ADM)
        const futureSection = document.getElementById('future-telas-section');
        if (futureSection) {
            // ADM tem index 5, Supervisor tem index 3. 
            // A lógica atual (indexNivel >= 3) já deveria funcionar para ADM (5).
            // No entanto, garantiremos que ADM sempre veja.
            if (indexNivel >= nivelHierarquia.indexOf('Supervisor') || usuario.nivel === 'ADM') {
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
        const paginaAtual = window.location.pathname.split('/').pop();
        
        if (menuFilters[paginaAtual] !== undefined) {
            const temPermissao = indexNivel >= menuFilters[paginaAtual];
            
            if (!temPermissao) {
                window.location.href = '../index.html';
            }
        }
    }, 100);
});
