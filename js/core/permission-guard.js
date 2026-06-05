/**
 * Protetor de Permissões - Validação Robusta de Acesso
 * Fornece proteção em profundidade contra acesso não autorizado
 */

class PermissionGuard {
    constructor() {
        this.pagePermissions = this.definirPermissoesPaginas();
        this.screenPermissions = this.definirPermissoesTelaInternas();
    }

    /**
     * Define quais níveis de usuário podem acessar cada página
     */
    definirPermissoesPaginas() {
        return {
            'auditHse.html': ['Supervisor', 'Gerente', 'ADM'],
            'feedbackFaltas.html': ['Coordenador', 'Supervisor', 'Gerente', 'ADM'],
            'gestaoUsuarios.html': ['Gerente', 'ADM'],
            'produtividade.html': ['PS', 'PA', 'Coordenador', 'Supervisor', 'Gerente', 'ADM']
        };
    }

    /**
     * Define quais níveis de usuário podem acessar cada tela interna
     */
    definirPermissoesTelaInternas() {
        return {
            'audit-dashboard': ['Supervisor', 'Gerente', 'ADM'],
            'audit-collaborator': ['Supervisor', 'Gerente', 'ADM'],
            'feedback-faltas': ['Coordenador', 'Supervisor', 'Gerente', 'ADM'],
            'produtividade': ['PS', 'PA', 'Coordenador', 'Supervisor', 'Gerente', 'ADM'],
            'gestao-usuarios': ['Gerente', 'ADM']
        };
    }

    /**
     * Valida se o usuário tem permissão para acessar uma página
     */
    temPermissaoPagina(nivelUsuario, nomePagina) {
        if (!nivelUsuario || !nomePagina) return false;

        const niveisPermitidos = this.pagePermissions[nomePagina];
        if (!niveisPermitidos) return true; // Se não está na lista, permite (página pública)

        return niveisPermitidos.includes(nivelUsuario);
    }

    /**
     * Valida se o usuário tem permissão para acessar uma tela interna
     */
    temPermissaoTela(nivelUsuario, screenId) {
        if (!nivelUsuario || !screenId) return false;

        const niveisPermitidos = this.screenPermissions[screenId];
        if (!niveisPermitidos) return true; // Se não está na lista, permite

        return niveisPermitidos.includes(nivelUsuario);
    }

    /**
     * Obtém a página atual do navegador
     */
    obterPaginaAtual() {
        const pathname = window.location.pathname;
        const partes = pathname.split('/');
        return partes[partes.length - 1] || 'index.html';
    }

    /**
     * Valida acesso à página atual e redireciona se necessário
     */
    validarAcessoPagina() {
        if (!auth || !auth.estaAutenticado()) {
            return false; 
        }

        const usuario = auth.obterUsuarioAtual();
        const paginaAtual = this.obterPaginaAtual();

        // Não validar a página de login
        if (paginaAtual === 'login.html') {
            document.body.classList.remove('auth-pending');
            return true;
        }

        // Se estiver no index, apenas remove o bloqueio
        if (paginaAtual === 'index.html' || paginaAtual === '') {
            document.body.classList.remove('auth-pending');
            return true;
        }

        if (!this.temPermissaoPagina(usuario.nivel, paginaAtual)) {
            console.warn(`Acesso negado à página ${paginaAtual} para usuário ${usuario.nivel}`);
            this.redirecionar('../index.html');
            return false;
        }

        // Se passou em todas as validações, remove a classe de bloqueio
        document.body.classList.remove('auth-pending');
        return true;
    }

    /**
     * Valida acesso a uma tela interna
     */
    validarAcessoTela(screenId) {
        if (!auth || !auth.estaAutenticado()) {
            return false;
        }

        const usuario = auth.obterUsuarioAtual();
        const temPermissao = this.temPermissaoTela(usuario.nivel, screenId);

        if (!temPermissao) {
            console.warn(`Acesso negado à tela ${screenId} para usuário ${usuario.nivel}`);
        }

        return temPermissao;
    }

    /**
     * Filtra elementos visíveis baseado em permissões
     */
    filtrarElementosPorPermissao() {
        if (!auth || !auth.estaAutenticado()) {
            return;
        }

        const usuario = auth.obterUsuarioAtual();

        // Filtrar telas internas
        const screens = document.querySelectorAll('.screen[id^="screen-"]');
        screens.forEach(screen => {
            const screenId = screen.id.replace('screen-', '');
            if (!this.temPermissaoTela(usuario.nivel, screenId)) {
                screen.style.display = 'none';
                screen.setAttribute('data-blocked', 'true');
            }
        });

        // Filtrar itens de menu
        const menuItems = document.querySelectorAll('.menu-item[data-screen]');
        menuItems.forEach(item => {
            const screenId = item.getAttribute('data-screen');
            if (!this.temPermissaoTela(usuario.nivel, screenId)) {
                item.style.display = 'none';
                item.setAttribute('data-blocked', 'true');
            }
        });

        // Filtrar links de navegação
        const links = document.querySelectorAll('a[href*=".html"]');
        links.forEach(link => {
            const href = link.getAttribute('href');
            const nomePagina = href.split('/').pop();
            if (!this.temPermissaoPagina(usuario.nivel, nomePagina)) {
                link.style.display = 'none';
                link.setAttribute('data-blocked', 'true');
            }
        });
    }

    /**
     * Redireciona para uma página com segurança
     */
    redirecionar(url) {
        setTimeout(() => {
            window.location.href = url;
        }, 100);
    }

    /**
     * Obtém relatório de permissões do usuário atual
     */
    obterRelatorioPermissoes() {
        if (!auth || !auth.estaAutenticado()) {
            return null;
        }

        const usuario = auth.obterUsuarioAtual();
        const paginasAcessiveis = Object.entries(this.pagePermissions)
            .filter(([_, niveis]) => niveis.includes(usuario.nivel))
            .map(([pagina, _]) => pagina);

        const telasAcessiveis = Object.entries(this.screenPermissions)
            .filter(([_, niveis]) => niveis.includes(usuario.nivel))
            .map(([tela, _]) => tela);

        return {
            usuario: usuario.nome,
            nivel: usuario.nivel,
            paginasAcessiveis,
            telasAcessiveis
        };
    }
}

// Instância global do protetor de permissões
const permissionGuard = new PermissionGuard();

// Validar acesso à página atual o mais rápido possível
(function() {
    const checkAccess = () => {
        if (typeof auth !== 'undefined' && typeof permissionGuard !== 'undefined') {
            if (auth.estaAutenticado()) {
                const hasAccess = permissionGuard.validarAcessoPagina();
                if (hasAccess) {
                    permissionGuard.filtrarElementosPorPermissao();
                }
            } else {
                // Se não estiver autenticado e não for a página de login, redireciona
                const pagina = permissionGuard.obterPaginaAtual();
                if (pagina !== 'login.html') {
                    window.location.href = pagina.includes('html/') ? 'login.html' : 'html/login.html';
                } else {
                    document.body.classList.remove('auth-pending');
                }
            }
        } else {
            // Tenta novamente em 10ms se os objetos ainda não carregaram
            setTimeout(checkAccess, 10);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkAccess);
    } else {
        checkAccess();
    }
})();
