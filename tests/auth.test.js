// ============================================================
// TESTES - ROTAS DE AUTENTICAÇÃO
// O banco é substituído por mock: nada é gravado de verdade
// ============================================================
jest.mock('../src/db', () => ({ query: jest.fn(), getConnection: jest.fn() }));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../src/db');
const app = require('../src/app');

const tokenDe = (id) => jwt.sign({ id, nome: 'Teste' }, process.env.JWT_SECRET, { expiresIn: '1h' });

beforeEach(() => {
  pool.query.mockReset();
});

// ===== CADASTRO =====
describe('POST /api/auth/cadastrar', () => {
  it('retorna 400 quando faltam campos', async () => {
    const res = await request(app).post('/api/auth/cadastrar').send({ nome: 'Lucas' });
    expect(res.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('retorna 400 quando a senha tem menos de 6 caracteres', async () => {
    const res = await request(app)
      .post('/api/auth/cadastrar')
      .send({ nome: 'Lucas', email: 'a@teste.com', senha: '123' });
    expect(res.status).toBe(400);
  });

  it('retorna 409 quando o e-mail já existe', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 9 }]]);
    const res = await request(app)
      .post('/api/auth/cadastrar')
      .send({ nome: 'Lucas', email: 'a@teste.com', senha: '123456' });
    expect(res.status).toBe(409);
  });

  it('cria o usuário salvando o HASH, nunca a senha pura', async () => {
    pool.query
      .mockResolvedValueOnce([[]])               // e-mail não existe
      .mockResolvedValueOnce([{ insertId: 7 }]); // INSERT

    const res = await request(app)
      .post('/api/auth/cadastrar')
      .send({ nome: 'Lucas', email: 'a@teste.com', senha: '123456' });

    expect(res.status).toBe(201);
    expect(res.body.usuarioId).toBe(7);

    const [sql, params] = pool.query.mock.calls[1];
    expect(sql).toMatch(/INSERT INTO usuarios/);
    expect(params[2]).not.toBe('123456');
    expect(await bcrypt.compare('123456', params[2])).toBe(true);
  });
});

// ===== LOGIN =====
describe('POST /api/auth/login', () => {
  it('retorna 401 quando o e-mail não existe', async () => {
    pool.query.mockResolvedValueOnce([[]]);
    const res = await request(app).post('/api/auth/login').send({ email: 'x@teste.com', senha: '123456' });
    expect(res.status).toBe(401);
    expect(res.body.erro).toBe('Credenciais inválidas');
  });

  it('retorna 401 quando a senha está errada', async () => {
    const hash = await bcrypt.hash('certa123', 10);
    pool.query.mockResolvedValueOnce([[{ id: 1, nome: 'Lucas', email: 'a@teste.com', senha_hash: hash }]]);
    const res = await request(app).post('/api/auth/login').send({ email: 'a@teste.com', senha: 'errada' });
    expect(res.status).toBe(401);
  });

  it('retorna um token válido com o id do usuário', async () => {
    const hash = await bcrypt.hash('123456', 10);
    pool.query.mockResolvedValueOnce([[{ id: 1, nome: 'Lucas', email: 'a@teste.com', senha_hash: hash }]]);
    const res = await request(app).post('/api/auth/login').send({ email: 'a@teste.com', senha: '123456' });

    expect(res.status).toBe(200);
    const payload = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(payload.id).toBe(1);
  });
});

// ===== /me (GET) =====
describe('GET /api/auth/me', () => {
  it('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('busca SEMPRE pelo id do token (isolamento entre contas)', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 2, nome: 'Rafael', email: 'r@teste.com' }]]);
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${tokenDe(2)}`);

    expect(res.status).toBe(200);
    expect(res.body.nome).toBe('Rafael');
    expect(pool.query.mock.calls[0][1]).toEqual([2]);
  });

  it('retorna 404 quando o usuário do token não existe mais', async () => {
    pool.query.mockResolvedValueOnce([[]]);
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${tokenDe(99)}`);
    expect(res.status).toBe(404);
  });
});

// ===== /me (PUT) =====
describe('PUT /api/auth/me', () => {
  const usuarioAtual = { id: 1, nome: 'Lucas', email: 'a@teste.com', senha_hash: null };

  it('retorna 400 quando nenhum campo é enviado', async () => {
    pool.query.mockResolvedValueOnce([[usuarioAtual]]);
    const res = await request(app).put('/api/auth/me').set('Authorization', `Bearer ${tokenDe(1)}`).send({});
    expect(res.status).toBe(400);
  });

  it('retorna 409 quando o novo e-mail já pertence a outra conta', async () => {
    pool.query
      .mockResolvedValueOnce([[usuarioAtual]])
      .mockResolvedValueOnce([[{ id: 2 }]]);
    const res = await request(app)
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${tokenDe(1)}`)
      .send({ email: 'rafael@teste.com' });
    expect(res.status).toBe(409);
  });

  it('retorna 401 quando a senha atual está errada', async () => {
    const hash = await bcrypt.hash('123456', 10);
    pool.query.mockResolvedValueOnce([[{ ...usuarioAtual, senha_hash: hash }]]);
    const res = await request(app)
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${tokenDe(1)}`)
      .send({ senha_atual: 'errada', nova_senha: 'nova12345' });
    expect(res.status).toBe(401);
  });

  it('atualiza só o nome quando só o nome é enviado', async () => {
    pool.query
      .mockResolvedValueOnce([[usuarioAtual]])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);
    const res = await request(app)
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${tokenDe(1)}`)
      .send({ nome: 'Lucas Souza' });

    expect(res.status).toBe(200);
    expect(res.body.usuario.nome).toBe('Lucas Souza');
    expect(res.body.usuario.email).toBe('a@teste.com');
  });
});

// ===== /me (DELETE) =====
describe('DELETE /api/auth/me', () => {
  it('retorna 400 quando a senha não é enviada', async () => {
    const res = await request(app).delete('/api/auth/me').set('Authorization', `Bearer ${tokenDe(1)}`).send({});
    expect(res.status).toBe(400);
  });

  it('retorna 401 quando a senha está errada e não apaga nada', async () => {
    const hash = await bcrypt.hash('123456', 10);
    pool.query.mockResolvedValueOnce([[{ senha_hash: hash }]]);
    const res = await request(app)
      .delete('/api/auth/me')
      .set('Authorization', `Bearer ${tokenDe(1)}`)
      .send({ senha: 'errada' });

    expect(res.status).toBe(401);
    expect(pool.query).toHaveBeenCalledTimes(1); // só o SELECT, sem DELETE
  });

  it('exclui a própria conta com a senha correta', async () => {
    const hash = await bcrypt.hash('123456', 10);
    pool.query
      .mockResolvedValueOnce([[{ senha_hash: hash }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    const res = await request(app)
      .delete('/api/auth/me')
      .set('Authorization', `Bearer ${tokenDe(1)}`)
      .send({ senha: '123456' });

    expect(res.status).toBe(200);
    expect(pool.query.mock.calls[1][0]).toMatch(/DELETE FROM usuarios/);
    expect(pool.query.mock.calls[1][1]).toEqual([1]);
  });
});

// ===== LISTAR USUÁRIOS (pedido do professor) =====
describe('GET /api/auth/usuarios', () => {
  it('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/auth/usuarios');
    expect(res.status).toBe(401);
  });

  it('lista os usuários com token válido, sem expor senha_hash', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 1, nome: 'Lucas', email: 'a@teste.com', criado_em: '2026-01-01' }]]);
    const res = await request(app).get('/api/auth/usuarios').set('Authorization', `Bearer ${tokenDe(1)}`);

    expect(res.status).toBe(200);
    expect(res.body[0]).not.toHaveProperty('senha_hash');
    expect(pool.query.mock.calls[0][0]).not.toMatch(/senha_hash/);
  });
});