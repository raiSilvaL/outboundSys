<div align="center">

# Outbound System

**Portal de Gestão Operacional para Ambientes de Logística**

[![Status](https://img.shields.io/badge/status-ativo-brightgreen)]()
[![Versão](https://img.shields.io/badge/versão-1.0.0-blue)]()
[![Licença](https://img.shields.io/badge/licença-privado-red)]()
[![Tecnologia](https://img.shields.io/badge/stack-HTML%20%7C%20CSS%20%7C%20JavaScript-orange)]()
[![Backend](https://img.shields.io/badge/backend-Google%20Apps%20Script-yellow)]()

</div>

---

## Índice

- [Sobre o Projeto](#sobre-o-projeto)
- [Funcionalidades](#funcionalidades)
- [Arquitetura e Stack](#arquitetura-e-stack)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Módulos do Sistema](#módulos-do-sistema)
  - [Autenticação e Permissões](#autenticação-e-permissões)
  - [Auditoria HSE](#auditoria-hse)
  - [Feedback de Faltas](#feedback-de-faltas)
  - [Gestão de Usuários](#gestão-de-usuários)
  - [Produtividade](#produtividade)
- [Utilitários Core](#utilitários-core)
- [Fluxo de Dados](#fluxo-de-dados)
- [Controle de Acesso](#controle-de-acesso)
- [Configuração e Instalação](#configuração-e-instalação)
- [Configurando as APIs do Google Apps Script](#configurando-as-apis-do-google-apps-script)
- [Implantação em Produção](#implantação-em-produção)
- [Considerações de Segurança](#considerações-de-segurança)
- [Dependências Externas](#dependências-externas)

---

## Sobre o Projeto

O **Outbound System** é uma aplicação web SPA (*Single Page Application*) desenvolvida para centralizar e otimizar a gestão operacional de ambientes de logística. O sistema consolida em um único portal ferramentas para monitoramento de produtividade, auditorias HSE, controle de faltas e administração de usuários, com interface responsiva e controle de acesso hierárquico.

A solução adota uma arquitetura **serverless leve**, utilizando **Google Apps Script** como camada de backend e **Google Sheets** como banco de dados, eliminando a necessidade de servidores dedicados e reduzindo custos de infraestrutura.

### Principais Diferenciais

| Característica | Descrição |
|---|---|
| **Sem backend próprio** | Toda persistência via Google Apps Script + Sheets |
| **Controle de acesso hierárquico** | 6 níveis de permissão distintos com restrição de menu e URL |
| **Dashboards interativos** | Gráficos em tempo real com Chart.js |
| **Relatórios visuais** | Exportação de relatórios em PNG via html2canvas |
| **Exportação de dados** | Suporte a Excel (.xlsx) e CSV |
| **Interface responsiva** | Adaptável para desktop e dispositivos móveis |
| **Preloader animado** | Intro com animação letra a letra do nome do sistema |

---

## Funcionalidades

- Portal central com navegação baseada em permissões do usuário
- Login seguro com validação de domínio (`@luftsolutions.com.br`) e regras de complexidade de senha
- Sessão persistente via `localStorage` com token JWT estruturado e expiração de 24 horas
- Dashboard de Auditoria HSE com KPIs, gráficos de linha e rosca, filtros por departamento e período
- Relatório D-1 e WTD de auditorias exportável como imagem PNG em alta fidelidade
- Gestão de faltas com edição inline, filtros avançados e carrossel de gráficos
- CRUD completo de usuários com importação e exportação CSV
- Acompanhamento de produtividade por processo (Picking, Rebin, Packing, Ship Dock) e por turno
- Ranking de colaboradores por hora, processo e turno com sistema de medalhas
- Paginação e filtragem dinâmica nas tabelas de dados
- Sidebar recolhível com exibição de avatar, nome e nível do usuário autenticado

---

## Arquitetura e Stack

```
┌─────────────────────────────────────────────────────┐
│                   CLIENTE (Browser)                 │
│                                                     │
│   HTML5 + CSS3 + JavaScript (ES6+)                  │
│   ├── Chart.js        (gráficos)                    │
│   ├── html2canvas     (exportação PNG)              │
│   ├── SheetJS (xlsx)  (exportação Excel)            │
│   └── Font Awesome    (ícones)                      │
└───────────────────┬─────────────────────────────────┘
                    │  HTTP (GET / POST)
                    ▼
┌─────────────────────────────────────────────────────┐
│             BACKEND (Google Apps Script)            │
│                                                     │
│   APIs REST serverless                              │
│   └── Google Sheets (banco de dados)               │
│       ├── Aba: Login                                │
│       ├── Aba: Query (auditorias)                   │
│       ├── Aba: Base Outbond Realizado               │
│       ├── Aba: Registro de Faltas                   │
│       ├── Aba: Produtividade                        │
│       ├── Aba: Pit                                  │
│       ├── Aba: Rebin                                │
│       ├── Aba: Packing                              │
│       └── Aba: ShipDock                             │
└─────────────────────────────────────────────────────┘
```

**Tecnologias utilizadas:**

- **Frontend:** HTML5, CSS3, JavaScript puro (ES6+)
- **Gráficos:** [Chart.js](https://www.chartjs.org/)
- **Exportação de imagens:** [html2canvas](https://html2canvas.hertzen.com/)
- **Exportação Excel:** [SheetJS](https://sheetjs.com/)
- **Ícones:** [Font Awesome](https://fontawesome.com/)
- **Backend/Dados:** Google Apps Script + Google Sheets

---

## Estrutura do Projeto

```
outboundSys/
│
├── index.html                      # Portal central (entry point)
├── Abrir_Sistema.bat               # Atalho para abertura local (Windows)
│
├── assets/
│   └── img/
│       ├── favicon.ico
│       ├── icon_base.png
│       ├── outbound_system.ico
│       └── visual.jpg
│
├── css/
│   └── style.css                   # Estilos globais da aplicação
│
├── html/
│   ├── login.html                  # Tela de login
│   ├── auditHse.html               # Módulo: Auditoria HSE
│   ├── feedbackFaltas.html         # Módulo: Feedback de Faltas
│   ├── gestaoUsuarios.html         # Módulo: Gestão de Usuários
│   └── produtividade.html          # Módulo: Produtividade
│
└── js/
    ├── core/                       # Scripts de infraestrutura
    │   ├── animation.js            # Preloader e animação de intro
    │   ├── auth.js                 # Autenticação e gerenciamento de sessão
    │   ├── login-handler.js        # Controlador da tela de login
    │   ├── menu-controller.js      # Controle de visibilidade do menu
    │   ├── permissions.js          # Regras e níveis de permissão
    │   ├── portal.js               # Coordenação do portal central
    │   ├── sidebar-user.js         # Exibição do usuário na sidebar
    │   ├── ui-controller.js        # Controle de UI (sidebar, navegação)
    │   └── utils.js                # Funções utilitárias compartilhadas
    │
    └── modules/                    # Scripts específicos por módulo
        ├── audit/
        │   ├── main.js             # Inicialização do módulo HSE
        │   ├── audit-dashboard.js  # Dashboard de auditorias
        │   ├── audit-collaborators.js # Visão por colaborador
        │   ├── audit-report.js     # Geração de relatório PNG
        │   ├── audit-export.js     # Exportação Excel/CSV
        │   └── report-engine.js    # Template HTML do relatório (V16)
        │
        ├── feedback/
        │   └── main.js             # Módulo completo de faltas
        │
        ├── prod/
        │   ├── main.js             # Inicialização do módulo
        │   ├── prod-dashboard.js   # Dashboard de produtividade
        │   └── prod-ranking.js     # Modal de ranking por hora
        │
        └── usuarios/
            ├── main.js             # Inicialização do módulo
            └── usuarios-manager.js # CRUD e gerenciamento de usuários
```

---

## Módulos do Sistema

### Autenticação e Permissões

O sistema implementa autenticação baseada em e-mail corporativo e controle de acesso por nível hierárquico. Toda a lógica de autenticação é encapsulada na classe `AuthSystem`, instanciada como singleton global (`auth`).

**Arquivos:**

- `js/core/auth.js` — Gerencia login, logout, criação de sessão e token
- `js/core/permissions.js` — Define hierarquia e permissões por nível via classe `PermissionSystem`
- `js/core/login-handler.js` — Controla a interface e validações do formulário de login
- `js/core/menu-controller.js` — Aplica as permissões dinamicamente no menu e bloqueia acesso direto por URL
- `js/core/sidebar-user.js` — Popula o card do usuário na sidebar com iniciais, nome e nível
- `js/core/animation.js` — Renderiza o preloader animado com entrada letra a letra e dispara o evento `introFinished`
- `js/core/portal.js` — Aguarda o evento `introFinished` para exibir o conteúdo principal; possui fallback de 5 segundos
- `js/core/ui-controller.js` — Gerencia recolhimento da sidebar, expansão do submenu de auditoria e troca de telas via `data-screen`

**Regras de validação:**

- E-mail obrigatoriamente do domínio `@luftsolutions.com.br` (verificado via regex em `auth.js`)
- Senha com mínimo de 8 caracteres contendo letras e números
- Sessão armazenada no `localStorage` sob a chave `outbound_user_session` com expiração de 24 horas

**Estrutura da sessão armazenada:**

```json
{
  "id": "...",
  "nome": "Nome do Usuário",
  "email": "usuario@luftsolutions.com.br",
  "nivel": "Supervisor",
  "funcao": "...",
  "turno": "...",
  "dataLogin": "2026-06-03T10:00:00.000Z",
  "token": "eyJ..."
}
```

**Geração do token:** o token segue o formato JWT estruturado (`header.payload.signature`) com `iat` e `exp` calculados em UNIX timestamp, gerado via `btoa`. Não há assinatura criptográfica real — ver seção de [Considerações de Segurança](#considerações-de-segurança).

**Métodos públicos da classe `AuthSystem`:**

| Método | Descrição |
|---|---|
| `login(email, senha)` | Valida credenciais via API e cria sessão |
| `logout()` | Remove sessão do localStorage e redireciona para login |
| `estaAutenticado()` | Retorna `true` se há sessão ativa |
| `obterUsuarioAtual()` | Retorna o objeto de sessão completo |
| `obterNivel()` | Retorna o nível do usuário autenticado |
| `temNivel(nivel)` | Verifica igualdade de nível |

**Métodos públicos da classe `PermissionSystem`:**

| Método | Descrição |
|---|---|
| `temPermissao(nivel, telaId)` | Verifica se um nível tem acesso a uma tela específica |
| `temNivelSuficiente(nivelAtual, nivelRequerido)` | Compara posição na hierarquia |
| `obterDescricaoNivel(nivel)` | Retorna o rótulo legível do nível |
| `obterCorNivel(nivel)` | Retorna a cor hex associada ao nível (usada na UI) |
| `obterIconeNivel(nivel)` | Retorna a classe Font Awesome associada ao nível |
| `obterTelasAcessiveis(nivel)` | Lista todas as telas acessíveis para o nível |

---

### Auditoria HSE

Módulo para gestão de auditorias de Saúde, Segurança e Meio Ambiente.

**Arquivos principais:**

- `html/auditHse.html` — Interface com abas *Dashboard* e *Colaboradores*
- `js/modules/audit/audit-dashboard.js` — Carrega e processa dados das APIs, renderiza gráficos e KPIs
- `js/modules/audit/audit-collaborators.js` — Desempenho individual por colaborador
- `js/modules/audit/audit-report.js` — Geração de relatório D-1 e WTD em PNG
- `js/modules/audit/audit-export.js` — Exportação de tabelas para `.xlsx` e `.csv`
- `js/modules/audit/report-engine.js` — Template HTML de alta fidelidade para captura com html2canvas (V16)

**Recursos:**

- Cards de KPIs dinâmicos
- Gráfico de linha: auditorias realizadas por data
- Gráfico de rosca: distribuição de scores
- Tabela de colaboradores com filtros por nome, departamento, função e status
- Relatório visual com estatísticas D-1, WTD e evolução diária exportado como PNG em 1200px de largura
- Ícones SVG inline no relatório para garantir fidelidade na captura via html2canvas (sem dependência de fontes externas)
- Rótulos verticais D-1 e WTD renderizados com SVG + `transform="rotate(-90)"` para compatibilidade com html2canvas

**APIs consumidas:**

- `?aba=Query` — Dados de auditorias realizadas
- `?aba=Base Outbond Realizado` — Base de colaboradores e metas

---

### Feedback de Faltas

Módulo para controle de justificativas e feedbacks de ausências.

**Arquivos principais:**

- `html/feedbackFaltas.html` — Interface com filtros, cards e carrossel de gráficos
- `js/modules/feedback/main.js` — Lógica completa do módulo

**Recursos:**

- Filtragem automática por departamentos: `OUTBOUND`, `TRANSFER OUT`, `TRANSPORTE`
- Status calculado automaticamente: `Concluído` / `Pendente`
- Edição de feedbacks via modal com envio para API
- Carrossel de gráficos: feedbacks justificados vs. pendentes e distribuição de motivos
- Filtros avançados: texto livre, multiselect e intervalo de datas

**API consumida:**

- `?aba=Registro de Faltas`

---

### Gestão de Usuários

Módulo administrativo com CRUD completo de usuários.

**Arquivos principais:**

- `html/gestaoUsuarios.html` — Tabela com paginação, modal de edição/criação e filtros
- `js/modules/usuarios/usuarios-manager.js` — Toda a lógica de gerenciamento

**Recursos:**

- Listagem com paginação e filtro dinâmico
- Criação e edição de usuários via modal
- Exclusão com confirmação
- Validação de e-mail e senha no front-end
- Importação de usuários via arquivo CSV
- Exportação da base de usuários em CSV

> **Acesso restrito:** disponível apenas para os níveis `Gerente` e `ADM`.

---

### Produtividade

Módulo de acompanhamento de eficiência operacional por processo e turno.

**Arquivos principais:**

- `html/produtividade.html` — Cards por processo, gráficos de linha e tabelas por turno
- `js/modules/prod/prod-dashboard.js` — Carrega dados do dia atual e renderiza visualizações
- `js/modules/prod/prod-ranking.js` — Modal de ranking detalhado por hora

**Processos monitorados:**

- Picking (Pit)
- Rebin
- Packing
- Ship Dock

**Recursos:**

- Dados filtrados automaticamente para o dia atual (comparação por `YYYY-MM-DD`)
- Cards de Meta vs. Realizado por processo
- Gráficos de linha de produção por hora
- Tabelas detalhadas por turno (1º, 2º, 3º) e visão consolidada
- Ranking de colaboradores ao clicar em uma célula de hora (Top 3 com medalhas)
- Dados de ranking carregados de APIs independentes por processo: `?aba=Pit`, `?aba=Rebin`, `?aba=Packing`, `?aba=ShipDock`
- Ordenação do ranking configurável por coluna (padrão: UPH decrescente)
- Normalização resiliente de nomes de colunas para compatibilidade com variações do Google Sheets (`Employee Name`, `Employee\u00a0Name`, `#REF!`)

**API consumida:**

- `?aba=Produtividade` (dashboard)
- APIs por processo (ranking)

---

## Utilitários Core

### `js/core/utils.js`

Funções compartilhadas entre todos os módulos:

| Função | Assinatura | Descrição |
|---|---|---|
| `fetchWithTimeout` | `(url, options, ms)` | Fetch com AbortController e timeout configurável (padrão: 15.000 ms) |
| `updateDateTime` | `()` | Atualiza elementos `#current-date`, `#current-time` e `#last-updated` em tempo real |
| `parseAnyDate` | `(value)` | Normaliza formatos `DD/MM/YYYY`, ISO e objetos Date para instância `Date` |
| `getScoreColor` | `(score)` | Retorna cor hex baseada no score HSE: verde (≥90%), azul (≥70%), amarelo (≥50%), vermelho (<50%) |

---

## Fluxo de Dados

```
[Usuário] ──login──► [auth.js] ──GET──► [API Google Apps Script]
                                              │
                                        aba: Login
                                              │
                          ◄── dados do usuário (nome, nível, etc.)
                                              │
                    [localStorage: sessão] ◄──┘

[Usuário acessa módulo]
        │
        ▼
[main.js do módulo] ──GET──► [API Google Apps Script]
                                      │
                               aba específica
                                      │
                         ◄── array de objetos JSON
                                      │
              [processamento: filtros, cálculos, normalização]
                                      │
                    [Chart.js / tabelas / cards de KPI]
                                      │
                               [Interface do usuário]

[Usuário edita/cria/deleta]
        │
        ▼
[JavaScript constrói payload] ──POST──► [API Google Apps Script]
                                                │
                                     [Google Sheets atualizado]
```

---

## Controle de Acesso

O sistema define 6 níveis hierárquicos com permissões cumulativas. A hierarquia é processada em ordem de índice pelo `PermissionSystem` e aplicada pelo `menu-controller.js`.

| Nível | Descrição | Produtividade | Feedback Faltas | Auditoria HSE | Gestão Usuários |
|---|---|:---:|:---:|:---:|:---:|
| `PS` | Operacional | Sim | Não | Não | Não |
| `PA` | Operacional Avançado | Sim | Não | Não | Não |
| `Coordenador` | Coordenador | Sim | Sim | Não | Não |
| `Supervisor` | Supervisor | Sim | Sim | Sim | Não |
| `Gerente` | Gerente | Sim | Sim | Sim | Sim |
| `ADM` | Administrador | Sim | Sim | Sim | Sim |

O controle é aplicado em dois momentos:

1. **Renderização do menu:** itens inacessíveis são ocultados via `menu-controller.js` usando `display: none`
2. **Acesso direto à URL:** o `menu-controller.js` verifica o arquivo atual (`window.location.pathname`) e redireciona para `index.html` caso o nível do usuário seja insuficiente

Adicionalmente, a seção de telas futuras (`#future-telas-section`) no menu é exibida apenas para usuários a partir do nível `Supervisor`.

---

## Configuração e Instalação

### Pré-requisitos

- Navegador web moderno (Chrome, Firefox, Edge, Safari)
- Conta Google com acesso ao Google Apps Script e Google Sheets
- (Opcional) Servidor web para implantação em produção

### Instalação Local

1. **Clone o repositório ou extraia o arquivo `.zip`:**
   ```bash
   git clone https://github.com/sua-org/outbound-system.git
   # ou extraia o .zip fornecido
   ```

2. **Configure as APIs** (veja a seção [Configurando as APIs](#configurando-as-apis-do-google-apps-script))

3. **Atualize as URLs das APIs** nos seguintes arquivos:

   ```
   js/core/auth.js                            → apiUrl (aba: Login)
   js/modules/audit/audit-dashboard.js       → URLs das APIs de auditoria
   js/modules/feedback/main.js               → URL da API de faltas
   js/modules/prod/prod-dashboard.js         → URL da API de produtividade
   js/modules/prod/prod-ranking.js           → RANKING_APIS (Pit, Rebin, Packing, ShipDock)
   js/modules/usuarios/usuarios-manager.js   → URL da API de usuários
   ```

4. **Abra o sistema:**
   - **Windows:** Clique duas vezes em `Abrir_Sistema.bat`
   - **Outros sistemas / Manual:** Abra `index.html` diretamente no navegador

---

## Configurando as APIs do Google Apps Script

Cada módulo consome uma API independente publicada via Google Apps Script. Siga os passos abaixo para cada API necessária.

### Estrutura esperada das planilhas

#### Aba `Login` (usada por `auth.js`)

| id | Nome | Email | Senha | Nivel | Funcao | Turno |
|---|---|---|---|---|---|---|
| 1 | João Silva | joao@luftsolutions.com.br | senha123 | Supervisor | Analista | 1 |

O mapeamento de colunas é case-insensitive: o sistema aceita tanto `Nome` quanto `nome`, `Email` quanto `email`, etc.

#### Aba `Produtividade`

Deve conter colunas: `Data`, `Turno`, `Processo`, `Colaborador`, `Hora`, `Realizado`, `Meta`

#### Abas de Ranking (`Pit`, `Rebin`, `Packing`, `ShipDock`)

Devem conter colunas incluindo `Employee Name`, `Data` (ou `Hora`) e `UPH`. O sistema normaliza variações de nome de coluna com caracteres especiais (`\u00a0`, `#REF!`) geradas pelo Google Sheets.

#### Aba `Registro de Faltas`

Deve conter colunas: `Data`, `Colaborador`, `Departamento`, `Motivo`, `Feedback`, `Status`

#### Abas `Query` e `Base Outbond Realizado` (Auditoria HSE)

Consulte a equipe responsável pelas planilhas para o schema detalhado.

### Publicando um Apps Script como API

1. Acesse [script.google.com](https://script.google.com) e crie um novo projeto
2. Cole o código do Apps Script que acessa sua planilha
3. Clique em **Implantar > Nova implantação**
4. Escolha tipo **Aplicativo da Web**
5. Configure:
   - **Executar como:** Eu mesmo
   - **Quem tem acesso:** Qualquer pessoa (para uso sem autenticação OAuth)
6. Copie a URL gerada e atualize nos arquivos JS correspondentes

> **Atenção:** Configure o CORS no Apps Script para aceitar apenas os domínios autorizados em produção.

---

## Implantação em Produção

O sistema é composto apenas de arquivos estáticos e pode ser hospedado em qualquer plataforma compatível com HTML/CSS/JS.

### Opções de hospedagem

| Plataforma | Custo | Complexidade | Observações |
|---|---|---|---|
| **GitHub Pages** | Gratuito | Baixa | Ideal para projetos internos |
| **Netlify** | Gratuito (plano básico) | Baixa | CI/CD automático por push |
| **Vercel** | Gratuito (plano básico) | Baixa | Excelente performance global |
| **Apache / Nginx** | Variável | Média | Controle total sobre o servidor |
| **Azure Static Web Apps** | Gratuito (plano básico) | Média | Boa integração corporativa |

### Checklist pré-produção

- [ ] Atualizar todas as URLs das APIs nos arquivos JS (incluindo `prod-ranking.js`)
- [ ] Configurar CORS nas APIs do Google Apps Script para o domínio de produção
- [ ] Revisar as credenciais de acesso padrão no Google Sheets
- [ ] Testar todos os módulos com usuários de diferentes níveis
- [ ] Configurar HTTPS no domínio de hospedagem
- [ ] Remover ou proteger o arquivo `Abrir_Sistema.bat` do deploy

---

## Considerações de Segurança

> **Importante:** Este sistema foi projetado para uso interno corporativo. As práticas abaixo devem ser revisadas antes de exposição a ambientes externos ou acesso público.

| Ponto | Status | Recomendação |
|---|---|---|
| Senhas armazenadas em texto simples no Google Sheets | Atenção | Considere hashing das senhas (ex: bcrypt no Apps Script) |
| Token JWT sem assinatura criptográfica real | Atenção | Utilize uma biblioteca JWT real se o ambiente exigir segurança elevada |
| Validação de acesso realizada no client-side | Atenção | As APIs do Apps Script devem validar o nível do usuário de forma independente |
| Domínio de e-mail restrito | Adequado | Validado via regex em `auth.js` |
| HTTPS | Depende do host | Obrigatório em produção |
| Dados sensíveis no localStorage | Atenção | Implemente expiração rigorosa e limpeza de sessão ao fechar o navegador |

---

## Dependências Externas

Todas as dependências são carregadas via CDN, sem necessidade de instalação local:

| Biblioteca | Versão | Uso |
|---|---|---|
| [Chart.js](https://www.chartjs.org/) | Latest | Gráficos de linha e rosca |
| [html2canvas](https://html2canvas.hertzen.com/) | Latest | Exportação de relatórios HSE em PNG |
| [SheetJS (xlsx)](https://sheetjs.com/) | Latest | Exportação de tabelas em Excel |
| [Font Awesome](https://fontawesome.com/) | 6.x | Ícones da interface e representação de níveis |

---

<div align="center">

**Outbound System** — Desenvolvido para otimizar a gestão operacional logística

*Última atualização: Junho de 2026*

</div>
