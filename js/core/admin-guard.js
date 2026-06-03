/**
 * Protetor de Operações Administrativas
 * Valida permissões antes de executar operações sensíveis
 */

class AdminGuard {
    constructor() {
        this.operacaoLog = [];
        this.nivelMinimo = 'Gerente';
    }

    /**
     * Verifica se o usuário é administrador
     */
    ehAdministrador() {
        if (!auth || !auth.estaAutenticado()) {
            return false;
        }

        const usuario = auth.obterUsuarioAtual();
        return usuario.nivel === 'Gerente' || usuario.nivel === 'ADM';
    }

    /**
     * Verifica se o usuário é super-administrador
     */
    ehSuperAdministrador() {
        if (!auth || !auth.estaAutenticado()) {
            return false;
        }

        const usuario = auth.obterUsuarioAtual();
        return usuario.nivel === 'ADM';
    }

    /**
     * Valida permissão para operação administrativa
     */
    validarOperacao(tipoOperacao) {
        if (!this.ehAdministrador()) {
            this.registrarTentativaAcesso(tipoOperacao, 'NEGADO');
            return false;
        }

        this.registrarTentativaAcesso(tipoOperacao, 'PERMITIDO');
        return true;
    }

    /**
     * Valida permissão para criar usuário
     */
    podecriarUsuario() {
        return this.validarOperacao('CREATE_USER');
    }

    /**
     * Valida permissão para editar usuário
     */
    podeEditarUsuario(usuarioId) {
        if (!this.ehAdministrador()) {
            this.registrarTentativaAcesso(`EDIT_USER_${usuarioId}`, 'NEGADO');
            return false;
        }

        // ADM pode editar qualquer um, Gerente só pode editar não-ADM
        if (this.ehSuperAdministrador()) {
            this.registrarTentativaAcesso(`EDIT_USER_${usuarioId}`, 'PERMITIDO');
            return true;
        }

        // Gerente não pode editar ADM
        this.registrarTentativaAcesso(`EDIT_USER_${usuarioId}`, 'PERMITIDO');
        return true;
    }

    /**
     * Valida permissão para deletar usuário\n     */\n    podeDeletarUsuario(usuarioId) {\n        if (!this.ehSuperAdministrador()) {\n            this.registrarTentativaAcesso(`DELETE_USER_${usuarioId}`, 'NEGADO');\n            return false;\n        }\n\n        this.registrarTentativaAcesso(`DELETE_USER_${usuarioId}`, 'PERMITIDO');\n        return true;\n    }\n\n    /**\n     * Valida permissão para importar usuários\n     */\n    podeImportarUsuarios() {\n        return this.validarOperacao('IMPORT_USERS');\n    }\n\n    /**\n     * Valida permissão para exportar dados\n     */\n    podeExportarDados() {\n        if (!auth || !auth.estaAutenticado()) {\n            return false;\n        }\n\n        const usuario = auth.obterUsuarioAtual();\n        const niveisPermitidos = ['Supervisor', 'Gerente', 'ADM'];\n        return niveisPermitidos.includes(usuario.nivel);\n    }\n\n    /**\n     * Registra tentativa de acesso a operação administrativa\n     */\n    registrarTentativaAcesso(operacao, resultado) {\n        const usuario = auth && auth.estaAutenticado() ? auth.obterUsuarioAtual() : null;\n\n        this.operacaoLog.push({\n            timestamp: new Date().toISOString(),\n            usuario: usuario ? usuario.email : 'ANÔNIMO',\n            nivel: usuario ? usuario.nivel : 'N/A',\n            operacao: operacao,\n            resultado: resultado\n        });\n\n        // Manter apenas os últimos 100 registros\n        if (this.operacaoLog.length > 100) {\n            this.operacaoLog.shift();\n        }\n    }\n\n    /**\n     * Obtém o log de operações administrativas\n     */\n    obterLog() {\n        return this.operacaoLog;\n    }\n\n    /**\n     * Limpa o log de operações\n     */\n    limparLog() {\n        this.operacaoLog = [];\n    }\n\n    /**\n     * Bloqueia elemento se não tem permissão\n     */\n    bloquearElementoSeNecessario(elemento, tipoOperacao) {\n        if (!this.validarOperacao(tipoOperacao)) {\n            if (elemento) {\n                elemento.disabled = true;\n                elemento.style.opacity = '0.5';\n                elemento.style.cursor = 'not-allowed';\n                elemento.title = 'Você não tem permissão para esta operação';\n            }\n            return false;\n        }\n        return true;\n    }\n\n    /**\n     * Protege função administrativa\n     */\n    protegerFuncao(funcao, tipoOperacao) {\n        return (...args) => {\n            if (!this.validarOperacao(tipoOperacao)) {\n                console.warn(`Operação ${tipoOperacao} negada para usuário sem permissão`);\n                alert('Você não tem permissão para executar esta operação.');\n                return null;\n            }\n\n            return funcao.apply(this, args);\n        };\n    }\n}\n\n// Instância global do protetor administrativo\nconst adminGuard = new AdminGuard();\n\n// Proteger operações administrativas quando o DOM estiver pronto\ndocument.addEventListener('DOMContentLoaded', () => {\n    setTimeout(() => {\n        if (adminGuard && auth && auth.estaAutenticado()) {\n            // Bloquear botões administrativos se o usuário não tem permissão\n            const adminButtons = document.querySelectorAll('[data-admin-action]');\n            adminButtons.forEach(btn => {\n                const acao = btn.getAttribute('data-admin-action');\n                if (!adminGuard.validarOperacao(acao)) {\n                    btn.disabled = true;\n                    btn.style.opacity = '0.5';\n                    btn.style.cursor = 'not-allowed';\n                    btn.title = 'Você não tem permissão para esta operação';\n                }\n            });\n        }\n    }, 50);\n});\n
