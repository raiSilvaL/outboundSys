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
            return; // Deixa o login handler cuidar
        }

        const usuario = auth.obterUsuarioAtual();
        const paginaAtual = this.obterPaginaAtual();

        // Não validar a página de login
        if (paginaAtual === 'login.html' || paginaAtual === 'index.html') {
            return;
        }

        if (!this.temPermissaoPagina(usuario.nivel, paginaAtual)) {
            console.warn(`Acesso negado à página ${paginaAtual} para usuário ${usuario.nivel}`);
            this.redirecionar('../index.html');
        }
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

// Validar acesso à página atual quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (permissionGuard && auth && auth.estaAutenticado()) {
            permissionGuard.validarAcessoPagina();
            permissionGuard.filtrarElementosPorPermissao();
        }
    }, 50);
});
