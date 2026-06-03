# Outbound System: Documentação Detalhada

Este documento fornece uma visão abrangente do **Outbound System**, um ecossistema de gestão operacional desenvolvido para otimizar processos e monitorar métricas chave em ambientes de logística e operações. O sistema é uma aplicação web front-end que interage com APIs do Google Apps Script (Google Sheets) para persistência e recuperação de dados, oferecendo uma solução leve e de fácil implantação.

## 1. Visão Geral do Sistema

O Outbound System é uma aplicação web de página única (SPA-like) que serve como um portal central para diversos módulos operacionais. Ele foi projetado para fornecer aos usuários acesso a ferramentas específicas baseadas em seu nível de permissão, garantindo que cada membro da equipe tenha as informações e funcionalidades necessárias para suas responsabilidades. A arquitetura é baseada em HTML, CSS e JavaScript puro, com forte dependência de APIs do Google Sheets para a gestão de dados.

**Principais Características:**

*   **Portal Central:** Um dashboard inicial que apresenta os módulos disponíveis para o usuário.
*   **Controle de Acesso:** Autenticação de usuários e gerenciamento de permissões baseado em níveis hierárquicos.
*   **Módulos Especializados:** Ferramentas dedicadas para Auditoria HSE, Feedback de Faltas, Gestão de Usuários e Produtividade.
*   **Integração com Google Sheets:** Utiliza APIs do Google Apps Script para leitura e escrita de dados, funcionando como um backend sem servidor.
*   **Interface Responsiva:** Design adaptável para diferentes tamanhos de tela.
*   **Relatórios Visuais:** Capacidade de gerar relatórios em formato de imagem para módulos específicos.

## 2. Estrutura do Projeto

A estrutura do projeto é organizada de forma modular, separando os recursos por tipo (HTML, CSS, JavaScript, Imagens) e as lógicas de negócio por módulos. A raiz do projeto contém o arquivo `index.html` (o portal central) e um script `.bat` para facilitar a abertura local.

```
outboundSys/
├── Abrir_Sistema.bat
├── assets/
│   └── img/
│       ├── favicon.ico
│       ├── icon_base.png
│       ├── outbound_system.ico
│       └── visual.jpg
├── css/
│   └── style.css
├── html/
│   ├── auditHse.html
│   ├── feedbackFaltas.html
│   ├── gestaoUsuarios.html
│   ├── login.html
│   └── produtividade.html
├── js/
│   ├── core/
│   │   ├── animation.js
│   │   ├── auth.js
│   │   ├── login-handler.js
│   │   ├── menu-controller.js
│   │   ├── permissions.js
│   │   ├── portal.js
│   │   ├── sidebar-user.js
│   │   ├── ui-controller.js
│   │   └── utils.js
│   └── modules/
│       ├── audit/
│       │   ├── audit-collaborators.js
│       │   ├── audit-dashboard.js
│       │   ├── audit-export.js
│       │   ├── audit-report.js
│       │   └── main.js
│       ├── feedback/
│       │   └── main.js
│       ├── prod/
│       │   ├── main.js
│       │   ├── prod-dashboard.js
│       │   └── prod-ranking.js
│       └── usuarios/
│           ├── main.js
│           └── usuarios-manager.js
└── index.html
```

## 3. Componentes Principais

### 3.1. Autenticação e Permissões

O sistema implementa um robusto sistema de autenticação e controle de acesso baseado em níveis de usuário. A autenticação é realizada através de uma API do Google Apps Script que valida credenciais contra uma planilha Google Sheets.

*   **`js/core/auth.js`**: Gerencia o processo de login, logout e a sessão do usuário. Ele valida o formato do e-mail (`@luftsolutions.com.br`) e a complexidade da senha (mínimo 8 caracteres, com letras e números). As credenciais são verificadas contra uma API do Google Sheets. A sessão do usuário é armazenada no `localStorage` do navegador, incluindo `id`, `nome`, `email`, `nivel`, `funcao`, `turno` e um `token` JWT simulado.
*   **`js/core/permissions.js`**: Define os níveis de hierarquia (`PS`, `PA`, `Coordenador`, `Supervisor`, `Gerente`, `ADM`) e os mapeia para permissões específicas. Este arquivo é a fonte da verdade para as regras de acesso dentro do sistema.
*   **`js/core/login-handler.js`**: Controla a interface de login (`html/login.html`), realizando validações em tempo real e interagindo com `auth.js` para efetuar o login e redirecionar o usuário para o `index.html` após a autenticação bem-sucedida.
*   **`js/core/menu-controller.js`**: Aplica as regras de permissão dinamicamente. No `DOMContentLoaded`, ele verifica o nível do usuário e esconde ou exibe itens do menu lateral, além de bloquear o acesso direto a páginas para as quais o usuário não tem permissão, redirecionando-o para o portal central (`index.html`).

### 3.2. Módulos

#### 3.2.1. Auditoria HSE

Este módulo é dedicado à gestão de auditorias de Saúde, Segurança e Meio Ambiente (HSE). Ele oferece uma visão detalhada do desempenho das auditorias, com dashboards interativos e capacidade de geração de relatórios.

*   **`html/auditHse.html`**: A página principal do módulo, contendo a estrutura visual do dashboard, filtros, cards de KPIs, gráficos (Chart.js) e tabelas. Inclui duas abas principais: Dashboard e Colaboradores.
*   **`js/modules/audit/main.js`**: Ponto de entrada do módulo, responsável por inicializar a interface, carregar os dados do dashboard e configurar os listeners de eventos.
*   **`js/modules/audit/audit-dashboard.js`**: O coração do dashboard. Carrega dados de duas APIs do Google Apps Script (`Query` e `Base Outbond Realizado`), atualiza cards estatísticos, renderiza gráficos de linha (auditorias por data) e de rosca (distribuição de scores), e popula uma tabela resumida. Permite filtragem por departamento e período.
*   **`js/modules/audit/audit-collaborators.js`**: Gerencia a aba de colaboradores. Filtra e processa dados para exibir o desempenho individual, calculando metas atingidas, não atingidas e sem auditorias. Suporta filtros por nome, departamento, função e status.
*   **`js/modules/audit/audit-report.js`**: Responsável pela geração de relatórios visuais em formato PNG. Ele calcula estatísticas D-1 (dia anterior) e WTD (Week-to-Date), dados por função e evolução diária, e preenche um template HTML (`report-engine.js`) que é então capturado como imagem usando `html2canvas`.
*   **`js/modules/audit/audit-export.js`**: Fornece funcionalidades de exportação de dados da tabela de colaboradores para formatos Excel (`.xlsx`) e CSV.

#### 3.2.2. Feedback de Faltas

Este módulo permite o controle e a gestão de justificativas e feedbacks relacionados ao registro de faltas.

*   **`html/feedbackFaltas.html`**: A interface do usuário para o módulo, incluindo filtros, cards de resumo, carrossel de gráficos (feedback justificado vs. pendente, distribuição de motivos) e uma tabela de registros de faltas.
*   **`js/modules/feedback/main.js`**: O principal script do módulo. Carrega dados de uma API do Google Apps Script (`Registro de Faltas`), filtra por departamentos específicos (`OUTBOUND`, `TRANSFER OUT`, `TRANSPORTE`), normaliza os dados e calcula o status (`Concluído`/`Pendente`). Permite a edição de feedbacks via modal e o envio de atualizações para a API. Inclui filtros avançados por texto, multiselect e período.

#### 3.2.3. Gestão de Usuários

Um módulo para o gerenciamento completo de usuários, incluindo operações CRUD (Criar, Ler, Atualizar, Deletar), importação e exportação de dados.

*   **`html/gestaoUsuarios.html`**: A página que exibe a tabela de usuários, formulários de edição/criação (modal), filtros e controles de paginação.
*   **`js/modules/usuarios/usuarios-manager.js`**: Gerencia todas as operações relacionadas aos usuários. Ele carrega usuários de uma API do Google Apps Script, permite adicionar, editar e deletar usuários, valida e-mails e senhas, e oferece funcionalidades de importação/exportação de usuários via CSV. Implementa paginação e filtragem dinâmica na tabela de usuários.

#### 3.2.4. Produtividade

Este módulo acompanha métricas de produtividade e eficiência operacional da equipe.

*   **`html/produtividade.html`**: A interface para visualização de produtividade, com cards de resumo por processo (Picking, Rebin, Packing, Ship Dock), gráficos de linha por hora e tabelas detalhadas por turno.
*   **`js/modules/prod/prod-dashboard.js`**: Carrega dados de produtividade de uma API do Google Apps Script, filtra dados para o dia atual (com tratamento para datas inválidas), atualiza os cards de meta/realizado, e renderiza gráficos de linha por hora e tabelas detalhadas por turno. Permite alternar entre diferentes visões (gráfico, 1º, 2º, 3º turno e resumo consolidado).
*   **`js/modules/prod/prod-ranking.js`**: Implementa o modal de ranking de produtividade. Ao clicar em uma célula de hora na tabela de produtividade, este script abre um modal que exibe um ranking detalhado dos colaboradores para aquele processo, hora e turno específicos, com ordenação dinâmica e medalhas para os top 3.

### 3.3. Utilitários e Componentes Core

*   **`js/core/animation.js`**: Controla a animação de introdução (`preloader`) do sistema, exibindo o logo e o texto "Outbound System" com efeitos visuais antes de revelar o conteúdo principal.
*   **`js/core/portal.js`**: Um script simples que coordena a transição da animação de introdução para o portal central (`index.html`).
*   **`js/core/sidebar-user.js`**: Popula o card de informações do usuário na barra lateral (sidebar), exibindo iniciais, nome e nível do usuário logado.
*   **`js/core/ui-controller.js`**: Contém funções para controlar a interface do usuário, como a expansão/colapso da barra lateral e a navegação entre telas internas de um módulo (comportamento SPA-like).
*   **`js/core/utils.js`**: Biblioteca de funções utilitárias compartilhadas, incluindo: `fetchWithTimeout` (para requisições de API com timeout), `updateDateTime` (para exibir data e hora atuais), `parseAnyDate` (para lidar com diferentes formatos de data) e `getScoreColor` (para atribuir cores a scores, usado no módulo HSE).

## 4. Fluxo de Dados e Integrações

O Outbound System opera como um front-end puro, sem um backend tradicional próprio. Toda a persistência e recuperação de dados são realizadas através de **APIs do Google Apps Script**, que atuam como um intermediário para planilhas do Google Sheets. Este modelo oferece uma solução de baixo custo e fácil manutenção para a gestão de dados.

**Fluxo Geral:**

1.  **Autenticação:** O usuário insere credenciais na tela de login. `auth.js` envia essas credenciais para uma API do Google Apps Script (configurada para acessar uma planilha de "Login"). A API valida o usuário e retorna seus dados (nome, nível, etc.).
2.  **Sessão:** Após o login, os dados do usuário são armazenados no `localStorage` do navegador. `menu-controller.js` e `permissions.js` usam essas informações para controlar quais módulos e funcionalidades são visíveis e acessíveis.
3.  **Carregamento de Dados:** Ao acessar um módulo (ex: Auditoria HSE), o script `main.js` do módulo correspondente faz requisições `GET` para APIs específicas do Google Apps Script. Cada API é configurada para ler dados de uma aba específica de uma planilha Google Sheets (ex: "Query", "Base Outbond Realizado", "Registro de Faltas", "Produtividade").
4.  **Processamento e Visualização:** Os dados brutos recebidos das APIs são processados (filtragem, normalização, cálculos) pelos scripts JavaScript do módulo. Em seguida, são utilizados para popular cards de KPIs, renderizar gráficos (usando a biblioteca Chart.js) e preencher tabelas na interface do usuário.
5.  **Interação do Usuário:** Ações do usuário (ex: aplicar filtros, editar um registro, salvar um novo usuário) disparam funções JavaScript que constroem um `payload` de dados.
6.  **Atualização de Dados:** Este `payload` é enviado de volta para a API do Google Apps Script via requisições `POST`, `PUT` ou `DELETE` (embora o Google Apps Script muitas vezes simule PUT/DELETE via POST com um parâmetro `action`). A API então atualiza a planilha Google Sheets correspondente.
7.  **Relatórios e Exportação:** Módulos como Auditoria HSE podem gerar relatórios visuais (PNG) usando `html2canvas` para capturar a interface, ou exportar dados tabulares para Excel/CSV.

## 5. Como Usar/Instalar

O Outbound System é uma aplicação front-end estática. Para utilizá-lo, você precisará de um navegador web moderno. A implantação local é simples:

1.  **Baixe o Projeto:** Obtenha todos os arquivos do repositório ou do arquivo `.zip` fornecido.
2.  **APIs do Google Apps Script:** O sistema depende de APIs do Google Apps Script para funcionar. Você precisará configurar suas próprias APIs, conectadas às suas planilhas Google Sheets, e atualizar as URLs nos arquivos JavaScript (`js/core/auth.js`, `js/modules/audit/audit-dashboard.js`, `js/modules/feedback/main.js`, `js/modules/prod/prod-dashboard.js`, `js/modules/usuarios/usuarios-manager.js`).
    *   **Importante:** As APIs fornecidas no código são exemplos e provavelmente não funcionarão sem a devida configuração e permissões em sua conta Google.
3.  **Abrir Localmente:**
    *   **Windows:** Clique duas vezes no arquivo `Abrir_Sistema.bat`. Ele abrirá o `index.html` no seu navegador padrão.
    *   **Outros SOs / Manualmente:** Abra o arquivo `index.html` diretamente em qualquer navegador web (Chrome, Firefox, Edge, etc.).
4.  **Implantação em Servidor Web:** Para acesso multiusuário e produção, você pode hospedar os arquivos estáticos em qualquer servidor web (Apache, Nginx, GitHub Pages, Netlify, Vercel, etc.). Certifique-se de que as APIs do Google Apps Script estejam configuradas para aceitar requisições do domínio onde o sistema será hospedado (CORS).

## 6. Considerações Finais

O Outbound System é uma solução eficaz para a gestão operacional, demonstrando como aplicações front-end podem ser poderosas quando combinadas com serviços de backend leves como o Google Apps Script. A modularidade do código facilita a manutenção e a adição de novas funcionalidades. A segurança é tratada no nível de permissões e na validação de entrada, mas a integridade dos dados depende da correta configuração e segurança das APIs do Google Apps Script e das planilhas Google Sheets subjacentes.
