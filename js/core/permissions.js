/**
 * Sistema de Permissões - Outbound System
 * Gerencia o controle de acesso por nível de usuário
 */

class PermissionSystem {
    constructor() {
        this.permissoes = this.definirPermissoes();
        this.hierarquia = this.definirHierarquia();
    }

    definirPermissoes() {
        return {
            'PS': ['produtividade'],
            'PA': ['produtividade'],
            'Coordenador': ['produtividade', 'feedback-faltas'],
            'Supervisor': ['produtividade', 'feedback-faltas', 'audit-dashboard'],
            'Gerente': ['produtividade', 'feedback-faltas', 'audit-dashboard', 'gestao-usuarios'],
            'ADM': ['*']
        };
    }

    definirHierarquia() {
        return ['PS', 'PA', 'Coordenador', 'Supervisor', 'Gerente', 'ADM'];
    }

    temPermissao(nivel, telaId) {
        if (!nivel || !telaId) return false;

        const permissoesNivel = this.permissoes[nivel];
        if (!permissoesNivel) return false;

        if (permissoesNivel.includes('*')) return true;

        return permissoesNivel.includes(telaId);
    }

    obterPermissoes(nivel) {
        return this.permissoes[nivel] || [];
    }

    temNivelSuficiente(nivelAtual, nivelRequerido) {
        const indexAtual = this.hierarquia.indexOf(nivelAtual);
        const indexRequerido = this.hierarquia.indexOf(nivelRequerido);

        if (indexAtual === -1 || indexRequerido === -1) return false;

        return indexAtual >= indexRequerido;
    }

    obterDescricaoNivel(nivel) {
        const descricoes = {
            'PS': 'Operacional',
            'PA': 'Operacional Avançado',
            'Coordenador': 'Coordenador',
            'Supervisor': 'Supervisor',
            'Gerente': 'Gerente',
            'ADM': 'Administrador'
        };

        return descricoes[nivel] || 'Desconhecido';
    }

    obterCorNivel(nivel) {
        const cores = {
            'PS': '#94a3b8',
            'PA': '#38bdf8',
            'Coordenador': '#8b5cf6',
            'Supervisor': '#ec4899',
            'Gerente': '#f59e0b',
            'ADM': '#fbbf24'
        };

        return cores[nivel] || '#e0e7ff';
    }

    obterIconeNivel(nivel) {
        const icones = {
            'PS': 'fa-user',
            'PA': 'fa-user-tie',
            'Coordenador': 'fa-users-gear',
            'Supervisor': 'fa-person-military-pointing',
            'Gerente': 'fa-briefcase',
            'ADM': 'fa-crown'
        };

        return icones[nivel] || 'fa-user';
    }

    obterTelasAcessiveis(nivel) {
        const permissoes = this.permissoes[nivel];
        if (!permissoes) return [];

        if (permissoes.includes('*')) {
            return Object.keys(this.obterTodasAsTelas());
        }

        return permissoes;
    }

    obterTodasAsTelas() {
        return {
            'audit-dashboard': {
                nome: 'Dashboard Geral',
                icone: 'fa-chart-pie',
                descricao: 'Dashboard geral de auditoria HSE'
            },
            'audit-collaborator': {
                nome: 'Auditorias por Colaborador',
                icone: 'fa-users-gear',
                descricao: 'Auditorias agrupadas por colaborador'
            },
            'produtividade': {
                nome: 'Produtividade',
                icone: 'fa-chart-line',
                descricao: 'Acompanhamento de produtividade'
            },
            'feedback-faltas': {
                nome: 'Feedback de Faltas',
                icone: 'fa-comments',
                descricao: 'Gestão de feedback de faltas'
            },
            'relatorios': {
                nome: 'Relatórios Avançados',
                icone: 'fa-file-pdf',
                descricao: 'Relatórios avançados do sistema'
            }
        };
    }
}

const permissions = new PermissionSystem();
