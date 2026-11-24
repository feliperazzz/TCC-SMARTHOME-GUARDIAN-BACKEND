// ============================================================
// TESTES - AMBIENTES (listar e criar, isolados por usuário)
// O banco é substituído por mock: nada é gravado de verdade
// ============================================================
jest.mock('../src/db', () => ({ query: jest.fn(), getConnection: jest.fn() }));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const pool = require('../src/db');
const app = require('../src/app');

const tokenDe = (id) => jwt.sign({ id, nome: 'Teste' }, process.env.JWT_SECRET, { expiresIn: '1h' });

beforeEach(() => {
  pool.query.mockReset();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  console.error.mockRestore();
});

// ===== LISTAR =====
describe('GET /api/ambientes', () => {
  it('retorna a lista de ambientes do usuário', async () => {
    const ambientes = [
      { id: 1, usuario_id: 1, nome: 'Sala', icone: 'home', status: 'seguro' },
      { id: 2, usuario_id: 1, nome: 'Garagem', icone: 'garage', status: 'alerta' },
    ];
    pool.query.mockResolvedValueOnce([ambientes]);

    const res = await request(app)
      .get('/api/ambientes')
      .set('Authorization', `Bearer ${tokenDe(1)}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].nome).toBe('Sala');
  });

  it('filtra SEMPRE pelo usuário do token (isolamento entre contas)', async () => {
    pool.query.mockResolvedValueOnce([[]]);
    await request(app)
      .get('/api/ambientes')
      .set('Authorization', `Bearer ${tokenDe(8)}`);

    expect(pool.query.mock.calls[0][0]).toMatch(/WHERE usuario_id = \?/);
    expect(pool.query.mock.calls[0][1]).toEqual([8]);
  });

  it('retorna lista vazia quando o usuário não tem ambientes', async () => {
    pool.query.mockResolvedValueOnce([[]]);
    const res = await request(app)
      .get('/api/ambientes')
      .set('Authorization', `Bearer ${tokenDe(1)}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('retorna 500 quando o banco falha', async () => {
    pool.query.mockRejectedValueOnce(new Error('falha'));
    const res = await request(app)
      .get('/api/ambientes')
      .set('Authorization', `Bearer ${tokenDe(1)}`);

    expect(res.status).toBe(500);
  });
});

// ===== CRIAR =====
describe('POST /api/ambientes', () => {
  it('retorna 400 quando o nome não é enviado e não grava nada', async () => {
    const res = await request(app)
      .post('/api/ambientes')
      .set('Authorization', `Bearer ${tokenDe(1)}`)
      .send({ icone: 'garage' });

    expect(res.status).toBe(400);
    expect(res.body.erro).toBe('O nome do ambiente é obrigatório');
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('cria o ambiente com ícone e status padrão quando não são enviados', async () => {
    pool.query.mockResolvedValueOnce([{ insertId: 4 }]);
    const res = await request(app)
      .post('/api/ambientes')
      .set('Authorization', `Bearer ${tokenDe(1)}`)
      .send({ nome: 'Quarto' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ mensagem: 'Ambiente criado com sucesso', ambienteId: 4 });

    const params = pool.query.mock.calls[0][1];
    expect(params).toEqual([1, 'Quarto', 'home', 'seguro']);
  });

  it('usa ícone e status enviados pelo cliente quando informados', async () => {
    pool.query.mockResolvedValueOnce([{ insertId: 5 }]);
    await request(app)
      .post('/api/ambientes')
      .set('Authorization', `Bearer ${tokenDe(1)}`)
      .send({ nome: 'Garagem', icone: 'garage', status: 'alerta' });

    const params = pool.query.mock.calls[0][1];
    expect(params).toEqual([1, 'Garagem', 'garage', 'alerta']);
  });

  it('grava o ambiente sempre com o usuario_id do token', async () => {
    pool.query.mockResolvedValueOnce([{ insertId: 6 }]);
    await request(app)
      .post('/api/ambientes')
      .set('Authorization', `Bearer ${tokenDe(9)}`)
      .send({ nome: 'Sala' });

    expect(pool.query.mock.calls[0][1][0]).toBe(9);
  });

  it('retorna 500 quando o banco falha', async () => {
    pool.query.mockRejectedValueOnce(new Error('falha'));
    const res = await request(app)
      .post('/api/ambientes')
      .set('Authorization', `Bearer ${tokenDe(1)}`)
      .send({ nome: 'Sala' });

    expect(res.status).toBe(500);
  });
});