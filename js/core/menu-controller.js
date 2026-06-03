/**
 * Controlador de Menu Lateral
 * Filtra itens do menu baseado nas permissões do usuário
 * Agora integrado com o novo sistema de proteção de permissões
 */

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (!auth || !auth.estaAutenticado()) {
            return;
        }

        const usuario = auth.obterUsuarioAtual();
        if (!usuario) return;

        // Usar o novo sistema de proteção de permissões
        if (permissionGuard) {
            // Validar acesso à página atual
            permissionGuard.validarAcessoPagina();
            
            // Filtrar elementos por permissão
            permissionGuard.filtrarElementosPorPermissao();
        }

        // Mostrar telas em desenvolvimento apenas para Supervisor+ (ou ADM)
        const futureSection = document.getElementById('future-telas-section');
        if (futureSection) {
            const niveisAvancados = ['Supervisor', 'Gerente', 'ADM'];
            if (niveisAvancados.includes(usuario.nivel)) {
                futureSection.style.display = 'block';
            } else {
                futureSection.style.display = 'none';
            }
        }
    }, 50);
});
