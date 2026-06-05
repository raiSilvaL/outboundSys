/**
 * Controlador de Menu Lateral
 * Filtra itens do menu baseado nas permissões do usuário
 * Agora integrado com o novo sistema de proteção de permissões
 */

document.addEventListener('DOMContentLoaded', () => {
    // A validação principal agora é feita pelo permission-guard.js o mais rápido possível.
    // Este arquivo cuida apenas de ajustes finos na UI após a validação.
    
    setTimeout(() => {
        if (!auth || !auth.estaAutenticado()) return;
        const usuario = auth.obterUsuarioAtual();

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
    }, 100);
});
