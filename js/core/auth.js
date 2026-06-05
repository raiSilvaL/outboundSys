/**
 * Sistema de Autenticação - Outbound System
 * Gerencia login, logout e sessão de usuários via API Google Sheets
 */

class AuthSystem {
    constructor() {
        this.storageKey = 'outbound_user_session';
        this.apiUrl = 'https://script.google.com/macros/s/AKfycbx4v6jnLAxoHsKuBGZShnWDgbL0A-MPkGS77bQ7KEf1pd-SelJKEYzkPEryPYM8Y4v_/exec'; // Substitua pela URL da sua API do Google Apps Script
        this.usuarioAtual = this.recuperarSessao();
        this.usuariosCache = [];
    }

    recuperarSessao() {
        try {
            const sessao = localStorage.getItem(this.storageKey);
            return sessao ? JSON.parse(sessao) : null;
        } catch (e) {
            return null;
        }
    }

    validarEmail(email) {
        const regex = /^[^\s@]+@luftsolutions\.com\.br$/i;
        return regex.test(email);
    }

    validarSenha(senha) {
        if (!senha) return false;
        if (senha.length < 8) return false;
        
        // Verificar se contém letras
        const temLetras = /[a-zA-Z]/.test(senha);
        // Verificar se contém números
        const temNumeros = /[0-9]/.test(senha);
        
        return temLetras && temNumeros;
    }

    async carregarUsuariosDoAPI() {
        try {
            const response = await fetch(`${this.apiUrl}?aba=Login`);
            if (!response.ok) {
                throw new Error(`Erro na API: ${response.status}`);
            }
            const dados = await response.json();
            
            // Mapear as chaves maiúsculas da API para minúsculas esperadas pelo sistema
            const usuarios = dados.map(u => ({
                id: u.id || String(Date.now() + Math.random()),
                nome: u.Nome || u.nome || '',
                email: u.Email || u.email || '',
                senha: u.Senha || u.senha || '',
                nivel: (u.Nivel || u.nivel || '').trim(),
                funcao: u.Funcao || u.funcao || '',
                turno: u.Turno || u.turno || ''
            }));
            this.usuariosCache = usuarios;
            return usuarios;
        } catch (erro) {
            console.error('Erro ao carregar usuários da API:', erro);
            throw erro;
        }
    }

    async login(email, senha) {
        if (!this.validarEmail(email)) {
            return {
                sucesso: false,
                mensagem: 'Email deve ser do domínio @luftsolutions.com.br'
            };
        }

        if (!this.validarSenha(senha)) {
            return {
                sucesso: false,
                mensagem: 'Senha deve ter no mínimo 8 caracteres, com letras e números'
            };
        }

        try {
            // Carregar usuários da API
            const usuarios = await this.carregarUsuariosDoAPI();
            const usuario = usuarios.find(u => 
                u.email.toLowerCase() === email.toLowerCase() && 
                u.senha === senha
            );

            if (!usuario) {
                return {
                    sucesso: false,
                    mensagem: 'Email ou senha incorretos'
                };
            }

            this.criarSessao(usuario);

            return {
                sucesso: true,
                mensagem: 'Login realizado com sucesso!',
                usuario: usuario
            };
        } catch (erro) {
            console.error('Erro durante login:', erro);
            return {
                sucesso: false,
                mensagem: 'Erro ao conectar com o servidor. Verifique sua conexão.'
            };
        }
    }

    criarSessao(usuario) {
        const sessao = {
            id: usuario.id,
            email: usuario.email,
            nome: usuario.nome,
            nivel: usuario.nivel,
            funcao: usuario.funcao,
            turno: usuario.turno,
            dataLogin: new Date().toISOString(),
            token: this.gerarToken()
        };

        localStorage.setItem(this.storageKey, JSON.stringify(sessao));
        this.usuarioAtual = sessao;
    }

    gerarToken() {
        const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const payload = btoa(JSON.stringify({
            sub: this.usuarioAtual?.id || 'novo',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
        }));
        const signature = btoa('secret_key_simulado');
        
        return `${header}.${payload}.${signature}`;
    }

    logout() {
        localStorage.removeItem(this.storageKey);
        this.usuarioAtual = null;
        
        // Redirecionamento robusto para a página de login
        const pathParts = window.location.pathname.split('/');
        const isInHtmlFolder = pathParts.includes('html');
        
        if (isInHtmlFolder) {
            window.location.href = 'login.html';
        } else {
            // Se estiver na raiz ou em outro lugar, tenta o caminho padrão
            window.location.href = 'html/login.html';
        }
    }

    obterUsuarioAtual() {
        return this.usuarioAtual;
    }

    estaAutenticado() {
        return this.usuarioAtual !== null;
    }

    obterNivel() {
        return this.usuarioAtual?.nivel || null;
    }

    temNivel(nivel) {
        return this.usuarioAtual?.nivel === nivel;
    }
}

const auth = new AuthSystem();
