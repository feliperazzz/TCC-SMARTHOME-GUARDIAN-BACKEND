# 🛡️ SmartHome Guardian - Backend

*"Sua casa protege você, mesmo quando você não está nela."*

API oficial do sistema SmartHome Guardian, desenvolvida como parte de um Trabalho de Conclusão de Curso (TCC). O backend é responsável por autenticar usuários, gerenciar ambientes da residência, registrar eventos de segurança e transmitir alertas IoT em tempo real para o aplicativo e o dashboard web.

---

## Tecnologias Utilizadas

O backend concentra a lógica central do sistema, servindo o aplicativo mobile, o dashboard web e o painel de simulação IoT:

**API Backend (Este repositório)**
* **Runtime:** Node.js
* **Framework:** Express (API REST)
* **Banco de Dados:** MySQL (via mysql2)
* **Autenticação:** JWT (jsonwebtoken) + bcrypt (hash de senhas)
* **Comunicação em Tempo Real:** Socket.io (WebSockets)
* **Painel de Simulação:** Página web servida pelo próprio servidor (`/painel`)

**Arquitetura Geral do Sistema (Integração)**
* **Aplicativo Mobile:** Flutter (repositório próprio)
* **Plataforma Web / Dashboard:** React.js
* **Banco de Dados:** MySQL

---

## 🧩 Funcionalidades

- ✅ Cadastro e login de usuários (senhas protegidas com hash bcrypt)
- ✅ Autenticação via token JWT nas rotas protegidas
- ✅ Gestão de ambientes por usuário (cada usuário acessa apenas os seus)
- ✅ Registro e listagem de eventos de segurança
- ✅ Marcação de eventos como lidos
- ✅ Alertas em tempo real via Socket.io
- ✅ Painel web de simulação IoT para testes sem hardware físico

---

## 📋 Principais Rotas

| Rota | Método | Descrição | Autenticação |
|---|---|---|---|
| `/health` | GET | Verifica se a API está no ar | Não |
| `/api/auth/cadastrar` | POST | Cria conta de usuário | Não |
| `/api/auth/login` | POST | Autentica e retorna o token JWT | Não |
| `/api/ambientes` | GET | Lista os ambientes do usuário | Sim (Bearer Token) |
| `/api/ambientes` | POST | Cria um novo ambiente | Sim (Bearer Token) |
| `/api/eventos` | GET | Lista os eventos de segurança | Sim (Bearer Token) |
| `/api/eventos/:id/lido` | PATCH | Marca evento como lido | Sim (Bearer Token) |
| `/painel` | GET | Painel de simulação IoT | Não |

---

## ⚡ Eventos IoT Simulados

O painel de simulação (`/painel`) emite eventos via Socket.io que são validados, persistidos no banco e transmitidos em tempo real para todos os clientes conectados:

| Tipo | Severidade | Título |
|---|---|---|
| `movimento` | info | Movimento detectado |
| `porta_aberta` | atenção | Porta aberta |
| `temperatura_elevada` | atenção | Temperatura elevada |
| `invasao` | crítico | Possível tentativa de invasão |

---

## 📅 Cronograma e Metas de Desenvolvimento

### Fundações do Backend
- [x] Configuração do servidor Express e health check (`/health`).
- [x] Conexão com o banco MySQL e modelagem das tabelas (usuários, ambientes, eventos).
- [x] Estrutura de pastas organizada (routes, middlewares, sockets).

### Autenticação e Segurança
- [x] Cadastro de usuários com hash de senha (bcrypt).
- [x] Login com emissão de token JWT.
- [x] Middleware de autorização para rotas protegidas.

### Regras de Negócio (Ambientes e Eventos)
- [x] CRUD de ambientes isolados por usuário.
- [x] Registro e listagem de eventos com severidade.
- [x] Marcação de eventos como lidos.

### Tempo Real e IoT Simulada
- [x] Integração do Socket.io ao servidor HTTP.
- [x] Catálogo de eventos IoT simulados com validação de tipos.
- [x] Painel web de disparo de eventos (`/painel`).
- [x] Persistência do evento no banco ANTES da transmissão em tempo real.

### Integração com o Aplicativo (Em andamento)
- [ ] Consumo da API pelo app Flutter (login com token e listagens).
- [ ] Socket.io no Flutter recebendo `novo_evento` em tempo real.
- [ ] Tratamento de erros, loading states e reconexão.

### Polimento e Entrega
- [ ] Testes de usabilidade e caça a bugs (QA).
- [ ] Variáveis de ambiente (`.env`) para credenciais e JWT_SECRET.
- [ ] Ensaios práticos dos **5 Cenários de Demonstração** da banca.
- [ ] Congelamento de código (Code Freeze) e entrega da documentação final.

---

## 🚀 Como executar o projeto localmente

1. Certifique-se de ter o [Node.js](https://nodejs.org) instalado e um servidor MySQL ativo.
2. Clone este repositório:
   ```bash
   git clone [https://github.com/feliperazzz/TCC-SMARTHOME-GUARDIAN-BACKEND.git]
   cd backend
   ```
3. Instale as dependências:
   ```bash
   npm install
   ```
4. Configure a conexão com o banco em `src/db.js` (usuário, senha e nome do banco).
5. Inicie o servidor:
   ```bash
   npm run dev
   ```
6. Confira se está tudo no ar:
   - Health check: `http://localhost:3000/health`
   - Painel IoT: `http://localhost:3000/painel`

---

## 🔐 Contas de Teste

| E-mail | Senha |
|---|---|
| rafael@teste.com | 123456 |
| felipe@teste.com | 123456 |
| luan@teste.com | 123456 |

---

## 🔗 Repositórios do Projeto

- **Mobile (Flutter):** https://github.com/feliperazzz/SmartHome-Guardian.git
- **Backend:** https://github.com/feliperazzz/TCC-SMARTHOME-GUARDIAN-BACKEND.git