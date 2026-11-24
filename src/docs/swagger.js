// ============================================================
// DOCUMENTAÇÃO OPENAPI 3 - SMART HOME GUARDIAN
// Acesse em http://localhost:3000/api-docs
// ============================================================

const erroSchema = {
  type: 'object',
  properties: { erro: { type: 'string', example: 'Mensagem de erro' } },
};

const respostaErro = (descricao) => ({
  description: descricao,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } },
});

const NaoAutorizado = respostaErro('Token não fornecido ou inválido/expirado');
const ErroInterno = respostaErro('Erro interno do servidor');
const SEGURANCA = [{ bearerAuth: [] }];

const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Smart Home Guardian API',
    version: '1.0.0',
    description:
      'API do TCC Smart Home Guardian. Autenticação por JWT (Bearer). ' +
      'Os dados são isolados por usuário: cada conta enxerga apenas os próprios ambientes e eventos. ' +
      'Os eventos em tempo real (Socket.IO) não fazem parte desta documentação.',
  },
  servers: [{ url: 'http://localhost:3000', description: 'Ambiente local' }],
  tags: [
    { name: 'Saúde', description: 'Verificação do servidor' },
    { name: 'Autenticação', description: 'Cadastro, login e dados da conta' },
    { name: 'Ambientes', description: 'Cômodos e áreas da residência' },
    { name: 'Eventos', description: 'Alertas gerados pelos sensores' },
    { name: 'Sistema', description: 'Armar e desarmar o sistema' },
  ],

  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    responses: { NaoAutorizado, ErroInterno },
    schemas: {
      Erro: erroSchema,
      Usuario: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          nome: { type: 'string', example: 'Lucas Souza' },
          email: { type: 'string', format: 'email', example: 'lucas@teste.com' },
          criado_em: { type: 'string', format: 'date-time' },
        },
      },
      CadastroBody: {
        type: 'object',
        required: ['nome', 'email', 'senha'],
        properties: {
          nome: { type: 'string', example: 'Lucas Souza' },
          email: { type: 'string', format: 'email', example: 'lucas@teste.com' },
          senha: { type: 'string', minLength: 6, example: '123456' },
        },
      },
      LoginBody: {
        type: 'object',
        required: ['email', 'senha'],
        properties: {
          email: { type: 'string', format: 'email', example: 'lucas@teste.com' },
          senha: { type: 'string', example: '123456' },
        },
      },
      LoginResposta: {
        type: 'object',
        properties: {
          mensagem: { type: 'string', example: 'Login realizado com sucesso' },
          token: { type: 'string', description: 'JWT válido por 7 dias' },
          usuario: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              nome: { type: 'string' },
              email: { type: 'string' },
            },
          },
        },
      },
      AtualizarUsuarioBody: {
        type: 'object',
        description: 'Envie pelo menos um campo. Para trocar a senha, envie senha_atual e nova_senha.',
        properties: {
          nome: { type: 'string', example: 'Lucas S. Souza' },
          email: { type: 'string', format: 'email', example: 'novo@teste.com' },
          senha_atual: { type: 'string', example: '123456' },
          nova_senha: { type: 'string', minLength: 6, example: '654321' },
        },
      },
      ExcluirContaBody: {
        type: 'object',
        required: ['senha'],
        properties: { senha: { type: 'string', example: '123456' } },
      },
      Ambiente: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          usuario_id: { type: 'integer', example: 1 },
          nome: { type: 'string', example: 'Sala' },
          icone: { type: 'string', example: 'home' },
          status: { type: 'string', example: 'seguro' },
          criado_em: { type: 'string', format: 'date-time' },
        },
      },
      AmbienteBody: {
        type: 'object',
        required: ['nome'],
        properties: {
          nome: { type: 'string', example: 'Garagem' },
          icone: { type: 'string', example: 'garage' },
          status: { type: 'string', example: 'seguro' },
        },
      },
      Evento: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 10 },
          usuario_id: { type: 'integer', example: 1 },
          ambiente_id: { type: 'integer', nullable: true, example: 1 },
          ambiente: { type: 'string', nullable: true, example: 'Sala', description: 'Nome do ambiente (só na listagem)' },
          tipo: { type: 'string', enum: ['movimento', 'porta_aberta', 'temperatura_elevada', 'invasao'] },
          titulo: { type: 'string', example: 'Tentativa de invasão' },
          descricao: { type: 'string', example: 'Tentativa de invasão detectada' },
          severidade: { type: 'string', enum: ['info', 'atencao', 'critico'] },
          lido: { type: 'integer', enum: [0, 1], example: 0 },
          criado_em: { type: 'string', format: 'date-time' },
        },
      },
      EventoBody: {
        type: 'object',
        required: ['tipo'],
        properties: {
          tipo: { type: 'string', enum: ['movimento', 'porta_aberta', 'temperatura_elevada', 'invasao'] },
          ambiente_id: { type: 'integer', nullable: true, example: 1 },
        },
      },
      Estado: {
        type: 'object',
        properties: { armado: { type: 'boolean', example: false } },
      },
    },
  },

  paths: {
    '/health': {
      get: {
        tags: ['Saúde'],
        summary: 'Verifica se o servidor está no ar',
        responses: {
          200: {
            description: 'Servidor operacional',
            content: { 'application/json': { schema: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'ok' },
                servico: { type: 'string' },
                versao: { type: 'string' },
                timestamp: { type: 'string', format: 'date-time' },
              },
            } } },
          },
        },
      },
    },

    '/api/auth/cadastrar': {
      post: {
        tags: ['Autenticação'],
        summary: 'Cria uma conta',
        description: 'A senha é guardada como hash bcrypt. A senha pura nunca vai para o banco.',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CadastroBody' } } } },
        responses: {
          201: {
            description: 'Usuário criado',
            content: { 'application/json': { schema: { type: 'object', properties: {
              mensagem: { type: 'string', example: 'Usuário cadastrado com sucesso' },
              usuarioId: { type: 'integer', example: 7 },
            } } } },
          },
          400: respostaErro('Campos obrigatórios ausentes ou senha com menos de 6 caracteres'),
          409: respostaErro('E-mail já cadastrado'),
          500: ErroInterno,
        },
      },
    },

    '/api/auth/login': {
      post: {
        tags: ['Autenticação'],
        summary: 'Faz login e devolve o token JWT',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginBody' } } } },
        responses: {
          200: { description: 'Login realizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResposta' } } } },
          400: respostaErro('E-mail ou senha ausentes'),
          401: respostaErro('Credenciais inválidas (mensagem genérica de propósito)'),
          500: ErroInterno,
        },
      },
    },

    '/api/auth/me': {
      get: {
        tags: ['Autenticação'],
        summary: 'Dados do usuário logado',
        description: 'O id vem do token, nunca da URL. Assim, ninguém acessa a conta de outro usuário.',
        security: SEGURANCA,
        responses: {
          200: { description: 'Dados do usuário', content: { 'application/json': { schema: { $ref: '#/components/schemas/Usuario' } } } },
          401: { $ref: '#/components/responses/NaoAutorizado' },
          404: respostaErro('Usuário não encontrado'),
          500: ErroInterno,
        },
      },
      put: {
        tags: ['Autenticação'],
        summary: 'Atualiza nome, e-mail e/ou senha do usuário logado',
        security: SEGURANCA,
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/AtualizarUsuarioBody' } } } },
        responses: {
          200: { description: 'Dados atualizados', content: { 'application/json': { schema: { type: 'object', properties: {
            mensagem: { type: 'string', example: 'Dados atualizados com sucesso' },
            usuario: { $ref: '#/components/schemas/Usuario' },
          } } } } },
          400: respostaErro('Nenhum campo enviado, campo vazio ou nova senha curta'),
          401: { $ref: '#/components/responses/NaoAutorizado' },
          404: respostaErro('Usuário não encontrado'),
          409: respostaErro('E-mail já cadastrado em outra conta'),
          500: ErroInterno,
        },
      },
      delete: {
        tags: ['Autenticação'],
        summary: 'Exclui a própria conta',
        description: 'Exige a senha para confirmar. Ambientes e eventos são removidos junto (ON DELETE CASCADE).',
        security: SEGURANCA,
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ExcluirContaBody' } } } },
        responses: {
          200: { description: 'Conta excluída', content: { 'application/json': { schema: { type: 'object', properties: {
            mensagem: { type: 'string', example: 'Conta excluída com sucesso' },
          } } } } },
          400: respostaErro('Senha não informada'),
          401: { $ref: '#/components/responses/NaoAutorizado' },
          404: respostaErro('Usuário não encontrado'),
          500: ErroInterno,
        },
      },
    },

    '/api/auth/usuarios': {
      get: {
        tags: ['Autenticação'],
        summary: 'Lista os usuários cadastrados',
        description: 'Pedido do professor. Exige token, mas qualquer usuário logado vê a lista completa.',
        security: SEGURANCA,
        responses: {
          200: { description: 'Lista de usuários', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Usuario' } } } } },
          401: { $ref: '#/components/responses/NaoAutorizado' },
          500: ErroInterno,
        },
      },
    },

    '/api/ambientes': {
      get: {
        tags: ['Ambientes'],
        summary: 'Lista os ambientes do usuário logado',
        security: SEGURANCA,
        responses: {
          200: { description: 'Lista de ambientes', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Ambiente' } } } } },
          401: { $ref: '#/components/responses/NaoAutorizado' },
          500: ErroInterno,
        },
      },
      post: {
        tags: ['Ambientes'],
        summary: 'Cria um ambiente para o usuário logado',
        security: SEGURANCA,
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/AmbienteBody' } } } },
        responses: {
          201: { description: 'Ambiente criado', content: { 'application/json': { schema: { type: 'object', properties: {
            mensagem: { type: 'string', example: 'Ambiente criado com sucesso' },
            ambienteId: { type: 'integer', example: 4 },
          } } } } },
          400: respostaErro('Nome do ambiente obrigatório'),
          401: { $ref: '#/components/responses/NaoAutorizado' },
          500: ErroInterno,
        },
      },
    },

    '/api/eventos': {
      get: {
        tags: ['Eventos'],
        summary: 'Lista os 50 eventos mais recentes do usuário logado',
        security: SEGURANCA,
        responses: {
          200: { description: 'Lista de eventos', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Evento' } } } } },
          401: { $ref: '#/components/responses/NaoAutorizado' },
          500: ErroInterno,
        },
      },
      post: {
        tags: ['Eventos'],
        summary: 'Registra um evento via REST',
        description: 'O título, a descrição e a severidade vêm do catálogo do servidor. O cliente só informa o tipo.',
        security: SEGURANCA,
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/EventoBody' } } } },
        responses: {
          201: { description: 'Evento registrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Evento' } } } },
          400: respostaErro('Tipo de evento desconhecido'),
          401: { $ref: '#/components/responses/NaoAutorizado' },
          500: ErroInterno,
        },
      },
    },

    '/api/eventos/pendentes': {
      get: {
        tags: ['Eventos'],
        summary: 'Lista só os eventos não lidos (badge do sino)',
        security: SEGURANCA,
        responses: {
          200: { description: 'Eventos não lidos', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Evento' } } } } },
          401: { $ref: '#/components/responses/NaoAutorizado' },
          500: ErroInterno,
        },
      },
    },

    '/api/eventos/{id}/lido': {
      patch: {
        tags: ['Eventos'],
        summary: 'Marca um evento como lido (swipe no app)',
        description: 'Só altera eventos do próprio usuário. Evento de outra conta retorna 404.',
        security: SEGURANCA,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' }, example: 10 }],
        responses: {
          200: { description: 'Evento marcado como lido', content: { 'application/json': { schema: { type: 'object', properties: {
            mensagem: { type: 'string', example: 'Evento marcado como lido' },
          } } } } },
          401: { $ref: '#/components/responses/NaoAutorizado' },
          404: respostaErro('Evento não encontrado'),
          500: ErroInterno,
        },
      },
    },

    '/api/sistema/estado': {
      get: {
        tags: ['Sistema'],
        summary: 'Estado atual do sistema (armado ou desarmado)',
        security: SEGURANCA,
        responses: {
          200: { description: 'Estado do sistema', content: { 'application/json': { schema: { $ref: '#/components/schemas/Estado' } } } },
          401: { $ref: '#/components/responses/NaoAutorizado' },
          404: respostaErro('Usuário não encontrado'),
          500: ErroInterno,
        },
      },
    },

    '/api/sistema/armar': {
      post: {
        tags: ['Sistema'],
        summary: 'Arma o sistema',
        security: SEGURANCA,
        responses: {
          200: { description: 'Sistema armado', content: { 'application/json': { schema: { type: 'object', properties: {
            armado: { type: 'boolean', example: true },
            mensagem: { type: 'string', example: 'Sistema armado' },
          } } } } },
          401: { $ref: '#/components/responses/NaoAutorizado' },
          500: ErroInterno,
        },
      },
    },

    '/api/sistema/desarmar': {
      post: {
        tags: ['Sistema'],
        summary: 'Desarma o sistema',
        security: SEGURANCA,
        responses: {
          200: { description: 'Sistema desarmado', content: { 'application/json': { schema: { type: 'object', properties: {
            armado: { type: 'boolean', example: false },
            mensagem: { type: 'string', example: 'Sistema desarmado' },
          } } } } },
          401: { $ref: '#/components/responses/NaoAutorizado' },
          500: ErroInterno,
        },
      },
    },
  },
};

module.exports = swaggerSpec;