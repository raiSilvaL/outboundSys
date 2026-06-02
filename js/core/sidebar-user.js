/**
 * Populador de User Card no Sidebar
 * Atualiza as informações do usuário logado no sidebar
 */

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (!auth || !auth.estaAutenticado()) {
            return;
        }

        const usuario = auth.obterUsuarioAtual();
        if (!usuario) return;

        // Atualizar avatar
        const iniciais = usuario.nome
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

        const avatarElement = document.getElementById('sidebar-user-avatar');
        if (avatarElement) {
            avatarElement.textContent = iniciais;
            
            avatarElement.style.background = 'linear-gradient(135deg, #38bdf8 0%, #8b5cf6 100%)';
        }

        // Atualizar nome
        const nameElement = document.getElementById('sidebar-user-name');
        if (nameElement) {
            nameElement.textContent = usuario.nome;
        }

        // Atualizar nível
        const levelElement = document.getElementById('sidebar-user-level');
        if (levelElement) {
            levelElement.textContent = usuario.nivel;
        }

        // Adicionar evento de logout
        const logoutBtn = document.getElementById('sidebar-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (confirm('Tem certeza que deseja fazer logout?')) {
                    auth.logout();
                }
            });
        }
    }, 100);
});
