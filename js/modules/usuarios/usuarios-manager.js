/**
 * Módulo de Gestão de Usuários
 * Gerencia CRUD de usuários via API Google Sheets, importação e exportação de CSV
 */

class UsuariosManager {
    constructor() {
        this.apiUrl = 'https://script.google.com/macros/s/AKfycbyHe8Dj_CIBXuCB0EH-5C5r4WGv3K2klbs2JkoDdv8G31XGcCofqMRpZyJGCC9BYJ7K/exec';
        this.usuarios = [];
        this.usuarioEmEdicao = null;
        this.paginaAtual = 1;
        this.itensPorPagina = 10;
        this.usuariosFiltrados = [];
        this.carregandoDados = false;
        this.inicializar();
    }

    async inicializar() {
        this.adicionarEventListeners();
        await this.carregarUsuariosDoAPI();
        this.renderizarTabela();
        this.renderizarPaginacao();
    }

    async carregarUsuariosDoAPI() {
        try {
            this.carregandoDados = true;
            const response = await fetch(`${this.apiUrl}?aba=Login`);

            if (!response.ok) {
                throw new Error(`Erro na API: ${response.status}`);
            }

            const dados = await response.json();

            // Mapear as chaves maiúsculas da API para minúsculas esperadas pelo sistema
            this.usuarios = dados.map(u => ({
                id: u.id || String(Date.now() + Math.random()),
                nome: u.Nome || u.nome || '',
                email: u.Email || u.email || '',
                senha: u.Senha || u.senha || '',
                nivel: u.Nivel || u.nivel || '',
                funcao: u.Funcao || u.funcao || '',
                turno: u.Turno || u.turno || ''
            }));

            this.usuariosFiltrados = [...this.usuarios];
            this.carregandoDados = false;
            return this.usuarios;
        } catch (erro) {
            console.error('Erro ao carregar usuários da API:', erro);
            this.carregandoDados = false;
            this.exibirMensagem('error', 'Erro ao carregar dados da API. Verifique sua conexão.');
            return [];
        }
    }

    async enviarDadosAPI(dados, metodo) {
        try {
            // Google Apps Script CORS doesn't like PUT/DELETE. We'll use POST for all write operations.
            const fetchMethod = metodo === 'GET' ? 'GET' : 'POST';
            let url = `${this.apiUrl}?aba=Login`;

            if (metodo !== 'GET') {
                url += `&action=${metodo}`;
            }

            if (metodo === 'DELETE') {
                url += `&id=${dados.id}`;
            }

            const options = {
                method: fetchMethod,
                mode: 'cors',
                headers: {
                    // Do not set Content-Type to application/json for Apps Script POST to avoid preflight
                    // We will send the data as a simple POST body or URL params
                }
            };

            if (fetchMethod === 'POST' && metodo !== 'DELETE') {
                options.body = JSON.stringify(dados);
            }

            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`Erro na API: ${response.status}`);
            }
            const resultado = await response.json();

            if (resultado.success || resultado.sucesso || Array.isArray(resultado)) {
                return { sucesso: true, dados: resultado };
            } else {
                return { sucesso: false, mensagem: resultado.error || resultado.erro || 'Erro desconhecido' };
            }
        } catch (error) {
            console.error(`Erro ao ${metodo} usuário:`, error);
            return { sucesso: false, mensagem: 'Erro de comunicação com a API.' };
        }
    }

    adicionarEventListeners() {
        document.getElementById('btn-novo-usuario').addEventListener('click', () => this.abrirFormulario());
        document.getElementById('btn-importar-csv').addEventListener('click', () => this.importarCSV());
        document.getElementById('btn-exportar-csv').addEventListener('click', () => this.exportarCSV());

        document.getElementById('modal-close').addEventListener('click', () => this.fecharFormulario());
        document.getElementById('btn-form-cancel').addEventListener('click', () => this.fecharFormulario());

        document.getElementById('usuario-form').addEventListener('submit', (e) => this.salvarUsuario(e));

        document.getElementById('filter-nome').addEventListener('input', () => this.aplicarFiltros());
        document.getElementById('filter-nivel').addEventListener('change', () => this.aplicarFiltros());
        document.getElementById('filter-turno').addEventListener('change', () => this.aplicarFiltros());

        document.getElementById('csv-input').addEventListener('change', (e) => this.processarCSV(e));

        // Validação em tempo real da senha
        document.getElementById('form-senha').addEventListener('input', (e) => this.validarSenhaEmTempo(e.target.value));
    }

    validarSenhaEmTempo(senha) {
        const validationDiv = document.getElementById('senha-validation');
        const lengthCheck = document.getElementById('senha-length');
        const lettersCheck = document.getElementById('senha-letters');
        const numbersCheck = document.getElementById('senha-numbers');

        if (!validationDiv) return;

        // Mostrar o div de validação
        validationDiv.style.display = 'block';

        // Verificar comprimento
        const temComprimento = senha.length >= 8;
        this.atualizarCheckItem(lengthCheck, temComprimento);

        // Verificar letras
        const temLetras = /[a-zA-Z]/.test(senha);
        this.atualizarCheckItem(lettersCheck, temLetras);

        // Verificar números
        const temNumeros = /[0-9]/.test(senha);
        this.atualizarCheckItem(numbersCheck, temNumeros);

        // Esconder se a senha está vazia
        if (!senha) {
            validationDiv.style.display = 'none';
        }
    }

    atualizarCheckItem(element, isValid) {
        if (!element) return;

        const icon = element.querySelector('i');
        if (isValid) {
            element.style.color = '#10b981';
            icon.className = 'fas fa-check-circle';
        } else {
            element.style.color = '#cbd5e1';
            icon.className = 'fas fa-circle';
        }
    }

    abrirFormulario(usuario = null) {
        this.usuarioEmEdicao = usuario;
        const modal = document.getElementById('modal-usuario');
        const form = document.getElementById('usuario-form');
        const titleText = document.getElementById('modal-title-text');
        const formMessage = document.getElementById('form-message');

        formMessage.innerHTML = '';

        if (usuario) {
            titleText.textContent = 'Editar Usuário';
            document.getElementById('form-nome').value = usuario.nome;
            document.getElementById('form-email').value = usuario.email;
            document.getElementById('form-funcao').value = usuario.funcao;
            document.getElementById('form-turno').value = usuario.turno;
            document.getElementById('form-nivel').value = usuario.nivel;
            document.getElementById('form-senha').value = usuario.senha;
        } else {
            titleText.textContent = 'Novo Usuário';
            form.reset();
        }

        modal.classList.add('active');
    }

    fecharFormulario() {
        const modal = document.getElementById('modal-usuario');
        modal.classList.remove('active');
        this.usuarioEmEdicao = null;
        document.getElementById('usuario-form').reset();
    }

    async salvarUsuario(e) {
        e.preventDefault();

        const nome = document.getElementById('form-nome').value.trim();
        const email = document.getElementById('form-email').value.trim();
        const turno = document.getElementById('form-turno').value;
        const nivel = document.getElementById('form-nivel').value;
        const senha = document.getElementById('form-senha').value;

        // Mapeamento automático de função baseado no nível
        let funcao = document.getElementById('form-funcao').value.trim();
        if (nivel === 'PS') funcao = 'Problem Solver';
        else if (nivel === 'PA') funcao = 'Problem Assistant';
        else if (nivel === 'ADM') funcao = 'Analista';
        else if (['Coordenador', 'Supervisor', 'Gerente'].includes(nivel)) funcao = nivel;

        if (!nome || !email || !funcao || !turno || !nivel || !senha) {
            this.exibirMensagem('error', 'Todos os campos são obrigatórios');
            return;
        }

        if (!this.validarEmail(email)) {
            this.exibirMensagem('error', 'Email deve ser do domínio @luftsolutions.com.br');
            return;
        }

        if (senha.length < 8) {
            this.exibirMensagem('error', 'Senha deve ter no mínimo 8 caracteres');
            return;
        }

        // Verificar se contém letras
        const temLetras = /[a-zA-Z]/.test(senha);
        // Verificar se contém números
        const temNumeros = /[0-9]/.test(senha);

        if (!temLetras || !temNumeros) {
            this.exibirMensagem('error', 'Senha deve conter letras e números');
            return;
        }

        const emailExistente = this.usuarios.find(u =>
            u.email.toLowerCase() === email.toLowerCase() &&
            (!this.usuarioEmEdicao || u.id !== this.usuarioEmEdicao.id)
        );

        if (emailExistente) {
            this.exibirMensagem('error', 'Este email já está cadastrado');
            return;
        }

        // Desabilitar botão durante o envio
        const btnSubmit = document.querySelector('#usuario-form button[type="submit"]');
        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = 'Salvando...';
        }

        try {
            if (this.usuarioEmEdicao) {
                // Atualizar usuário
                const usuarioAtualizado = {
                    id: this.usuarioEmEdicao.id,
                    Nome: nome,
                    Email: email,
                    Funcao: funcao,
                    Turno: turno,
                    Nivel: nivel,
                    Senha: senha
                };

                const resultado = await this.enviarDadosAPI(usuarioAtualizado, 'PUT');

                if (resultado.sucesso) {
                    const index = this.usuarios.findIndex(u => u.id === this.usuarioEmEdicao.id);
                    if (index !== -1) {
                        this.usuarios[index] = {
                            ...this.usuarios[index],
                            nome,
                            email,
                            funcao,
                            turno,
                            nivel,
                            senha
                        };
                    }
                    this.exibirMensagem('success', 'Usuário atualizado com sucesso!');
                } else {
                    this.exibirMensagem('error', resultado.mensagem || 'Erro ao atualizar usuário.');
                    if (btnSubmit) {
                        btnSubmit.disabled = false;
                        btnSubmit.innerHTML = '<i class="fas fa-save"></i> Salvar';
                    }
                    return;
                }
            } else {
                // Criar novo usuário
                const novoUsuario = {
                    id: String(Date.now()),
                    Nome: nome,
                    Email: email,
                    Funcao: funcao,
                    Turno: turno,
                    Nivel: nivel,
                    Senha: senha
                };

                const resultado = await this.enviarDadosAPI(novoUsuario, 'POST');

                if (resultado.sucesso) {
                    this.usuarios.push({
                        id: novoUsuario.id,
                        nome,
                        email,
                        funcao,
                        turno,
                        nivel,
                        senha
                    });
                    this.exibirMensagem('success', 'Usuário criado com sucesso!');
                } else {
                    this.exibirMensagem('error', resultado.mensagem || 'Erro ao criar usuário.');
                    if (btnSubmit) {
                        btnSubmit.disabled = false;
                        btnSubmit.innerHTML = '<i class="fas fa-save"></i> Salvar';
                    }
                    return;
                }
            }

            setTimeout(() => {
                this.fecharFormulario();
                this.aplicarFiltros();
                if (btnSubmit) {
                    btnSubmit.disabled = false;
                    btnSubmit.innerHTML = '<i class="fas fa-save"></i> Salvar';
                }
            }, 1500);
        } catch (erro) {
            console.error('Erro ao salvar usuário:', erro);
            this.exibirMensagem('error', 'Erro inesperado ao salvar usuário.');
            if (btnSubmit) {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = '<i class="fas fa-save"></i> Salvar';
            }
        }
    }

    async deletarUsuario(id) {
        if (confirm('Tem certeza que deseja deletar este usuário?')) {
            try {
                const resultado = await this.enviarDadosAPI({ id: id }, 'DELETE');

                if (resultado.sucesso) {
                    this.usuarios = this.usuarios.filter(u => u.id !== id);
                    this.exibirMensagem('success', 'Usuário deletado com sucesso!');
                    this.aplicarFiltros();
                } else {
                    this.exibirMensagem('error', resultado.mensagem || 'Erro ao deletar usuário.');
                }
            } catch (erro) {
                console.error('Erro ao deletar usuário:', erro);
                this.exibirMensagem('error', 'Erro inesperado ao deletar usuário.');
            }
        }
    }

    aplicarFiltros() {
        const nome = document.getElementById('filter-nome').value.toLowerCase() || '';
        const nivel = document.getElementById('filter-nivel').value || '';
        const turno = document.getElementById('filter-turno').value || '';

        this.usuariosFiltrados = this.usuarios.filter(u => {
            const nomeMatch = u.nome.toLowerCase().includes(nome);
            const nivelMatch = !nivel || u.nivel === nivel;
            const turnoMatch = !turno || u.turno === turno;

            return nomeMatch && nivelMatch && turnoMatch;
        });

        this.paginaAtual = 1;
        this.renderizarTabela();
        this.renderizarPaginacao();
    }

    renderizarTabela() {
        const tbody = document.getElementById('usuarios-tbody');
        const empty = document.getElementById('usuarios-empty');
        const inicio = (this.paginaAtual - 1) * this.itensPorPagina;
        const fim = inicio + this.itensPorPagina;
        const usuariosPagina = this.usuariosFiltrados.slice(inicio, fim);

        if (usuariosPagina.length === 0) {
            tbody.innerHTML = '';
            empty.style.display = 'block';
            return;
        }

        empty.style.display = 'none';
        tbody.innerHTML = usuariosPagina.map(usuario => this.criarLinhaTabela(usuario)).join('');

        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const usuario = this.usuarios.find(u => u.id === id);
                if (usuario) this.abrirFormulario(usuario);
            });
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                this.deletarUsuario(id);
            });
        });
    }

    criarLinhaTabela(usuario) {
        const iniciais = usuario.nome
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

        const nivelClass = `nivel-${usuario.nivel.toLowerCase()}`;

        let nivelExibicao = usuario.nivel;
        if (usuario.nivel === 'PS') nivelExibicao = 'PS (Problem Solver)';
        else if (usuario.nivel === 'PA') nivelExibicao = 'PA (Problem Assistant)';
        else if (usuario.nivel === 'ADM') nivelExibicao = 'ADM (Analista)';

        return `
            <tr>
                <td>
                    <div class="usuario-nome">
                        <div class="usuario-avatar">${iniciais}</div>
                        <span>${usuario.nome}</span>
                    </div>
                </td>
                <td>${usuario.email}</td>
                <td>${usuario.funcao}</td>
                <td>${usuario.turno}</td>
                <td>
                    <span class="nivel-badge ${nivelClass}">${nivelExibicao}</span>
                </td>
                <td>
                    <div class="usuario-actions">
                        <button class="btn-icon btn-edit" data-id="${usuario.id}" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-delete" data-id="${usuario.id}" title="Deletar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    renderizarPaginacao() {
        const totalPaginas = Math.ceil(this.usuariosFiltrados.length / this.itensPorPagina);
        const paginacao = document.getElementById('pagination');

        if (totalPaginas <= 1) {
            paginacao.innerHTML = '';
            return;
        }

        let html = '<button onclick="usuariosManager.irParaPagina(1)" ' +
            (this.paginaAtual === 1 ? 'disabled' : '') + '>&laquo; Primeira</button>';

        for (let i = 1; i <= totalPaginas; i++) {
            if (i === this.paginaAtual) {
                html += `<button class="active">${i}</button>`;
            } else {
                html += `<button onclick="usuariosManager.irParaPagina(${i})">${i}</button>`;
            }
        }

        html += '<button onclick="usuariosManager.irParaPagina(' + totalPaginas + ')" ' +
            (this.paginaAtual === totalPaginas ? 'disabled' : '') + '>&raquo; Última</button>';

        paginacao.innerHTML = html;
    }

    irParaPagina(pagina) {
        this.paginaAtual = pagina;
        this.renderizarTabela();
        this.renderizarPaginacao();
    }

    validarEmail(email) {
        const regex = /^[^\s@]+@luftsolutions\.com\.br$/i;
        return regex.test(email);
    }

    exibirMensagem(tipo, mensagem) {
        const container = document.getElementById('form-message');
        if (!container) return;

        const div = document.createElement('div');
        div.className = `form-message ${tipo}`;

        const iconeMap = {
            'success': 'fa-check-circle',
            'error': 'fa-exclamation-circle',
            'warning': 'fa-exclamation-triangle',
            'info': 'fa-info-circle'
        };

        const icone = iconeMap[tipo] || 'fa-info-circle';

        div.innerHTML = `
            <i class="fas ${icone}"></i>
            <span>${mensagem}</span>
        `;

        container.innerHTML = '';
        container.appendChild(div);

        if (tipo !== 'error') {
            setTimeout(() => {
                div.style.animation = 'fadeOut 0.3s ease-out forwards';
                setTimeout(() => div.remove(), 300);
            }, 5000);
        }
    }

    importarCSV() {
        const input = document.getElementById('csv-input');
        if (input) input.click();
    }

    processarCSV(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const csv = event.target.result;
                const linhas = csv.split('\n').filter(linha => linha.trim());
                const headers = linhas[0].split(',').map(h => h.trim().toLowerCase());

                const usuarios = linhas.slice(1).map(linha => {
                    const valores = linha.split(',').map(v => v.trim());
                    const usuario = {};
                    headers.forEach((header, i) => {
                        usuario[header] = valores[i] || '';
                    });
                    return usuario;
                }).filter(u => u.nome && u.email);

                if (usuarios.length === 0) {
                    this.exibirMensagem('error', 'Nenhum usuário válido encontrado no CSV');
                    return;
                }

                this.exibirMensagem('success', `${usuarios.length} usuários importados com sucesso!`);
                this.usuarios.push(...usuarios);
                this.aplicarFiltros();
            } catch (erro) {
                console.error('Erro ao processar CSV:', erro);
                this.exibirMensagem('error', 'Erro ao processar arquivo CSV');
            }
        };
        reader.readAsText(file);
    }

    exportarCSV() {
        const headers = ['id', 'Nome', 'Email', 'Senha', 'Nivel', 'Funcao', 'Turno'];
        const csv = [
            headers.join(','),
            ...this.usuarios.map(u => [
                u.id,
                u.nome,
                u.email,
                u.senha,
                u.nivel,
                u.funcao,
                u.turno
            ].join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `usuarios_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    }
}