/**
 * Handler da Página de Login
 * Gerencia a interação do usuário com o formulário de login
 */

(function() {
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const passwordToggle = document.getElementById('password-toggle');
    const loginBtn = document.getElementById('login-btn');
    const messagesContainer = document.getElementById('login-messages');
    const emailValidation = document.getElementById('email-validation');
    const passwordValidation = document.getElementById('password-validation');

    function exibirMensagem(tipo, mensagem, icone = null) {
        const div = document.createElement('div');
        div.className = `login-message ${tipo}`;
        
        const iconeMap = {
            'success': 'fa-check-circle',
            'error': 'fa-exclamation-circle',
            'warning': 'fa-exclamation-triangle',
            'info': 'fa-info-circle'
        };

        const iconeClass = icone || iconeMap[tipo] || 'fa-info-circle';
        
        div.innerHTML = `
            <i class="fas ${iconeClass}"></i>
            <span>${mensagem}</span>
        `;

        messagesContainer.innerHTML = '';
        messagesContainer.appendChild(div);

        if (tipo !== 'error') {
            setTimeout(() => {
                div.style.animation = 'fadeOut 0.3s ease-out forwards';
                setTimeout(() => div.remove(), 300);
            }, 5000);
        }
    }

    function validarEmailEmTempo() {
        const email = emailInput.value.trim();
        
        if (!email) {
            emailValidation.textContent = '';
            return;
        }

        const isValid = auth.validarEmail(email);
        
        if (isValid) {
            emailValidation.className = 'form-validation valid';
            emailValidation.innerHTML = '<i class="fas fa-check"></i> Email válido';
        } else {
            emailValidation.className = 'form-validation invalid';
            emailValidation.innerHTML = '<i class="fas fa-times"></i> Deve ser @luftsolutions.com.br';
        }
    }

    function validarSenhaEmTempo() {
        const senha = passwordInput.value;
        
        if (!senha) {
            passwordValidation.textContent = '';
            return;
        }

        const isValid = auth.validarSenha(senha);
        
        if (isValid) {
            passwordValidation.className = 'form-validation valid';
            passwordValidation.innerHTML = '<i class="fas fa-check"></i> Senha válida';
        } else {
            passwordValidation.className = 'form-validation invalid';
            passwordValidation.innerHTML = '<i class="fas fa-times"></i> Mínimo 8 caracteres';
        }
    }

    function alternarVisibilidadeSenha() {
        const isPassword = passwordInput.type === 'password';
        
        passwordInput.type = isPassword ? 'text' : 'password';
        
        const icon = passwordToggle.querySelector('i');
        icon.className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
    }

    async function realizarLogin(e) {
        e.preventDefault();

        const email = emailInput.value.trim();
        const senha = passwordInput.value;

        if (!email || !senha) {
            exibirMensagem('error', 'Por favor, preencha todos os campos');
            return;
        }

        loginBtn.disabled = true;
        loginBtn.classList.add('loading');
        loginBtn.innerHTML = 'Autenticando...';

        try {
            // Aguardar o resultado do login assíncrono
            const resultado = await auth.login(email, senha);

            if (resultado.sucesso) {
                exibirMensagem('success', resultado.mensagem, 'fa-check-circle');
                
                setTimeout(() => {
                    window.location.href = '../index.html';
                }, 1500);
            } else {
                exibirMensagem('error', resultado.mensagem);
                loginBtn.disabled = false;
                loginBtn.classList.remove('loading');
                loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar';
                
                passwordInput.value = '';
                passwordValidation.textContent = '';
            }
        } catch (erro) {
            console.error('Erro ao fazer login:', erro);
            exibirMensagem('error', 'Erro ao processar login. Tente novamente.');
            loginBtn.disabled = false;
            loginBtn.classList.remove('loading');
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar';
        }
    }

    if (loginForm) {
        loginForm.addEventListener('submit', realizarLogin);
    }

    if (emailInput) {
        emailInput.addEventListener('input', validarEmailEmTempo);
        emailInput.addEventListener('blur', validarEmailEmTempo);
    }

    if (passwordInput) {
        passwordInput.addEventListener('input', validarSenhaEmTempo);
        passwordInput.addEventListener('blur', validarSenhaEmTempo);
    }

    if (passwordToggle) {
        passwordToggle.addEventListener('click', (e) => {
            e.preventDefault();
            alternarVisibilidadeSenha();
        });
    }

    window.addEventListener('introFinished', () => {
        const mainContent = document.querySelector('.login-wrapper');
        if (mainContent) {
            mainContent.style.opacity = '1';
            mainContent.style.transform = 'translateY(0)';
        }
        
        setTimeout(() => {
            if (emailInput) emailInput.focus();
        }, 500);
    });

    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                realizarLogin(e);
            }
        });
    }
})();
