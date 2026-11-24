// ============================================================
// TESTES - SISTEMA (armar / desarmar / estado)
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
  // Silencia o console.error das rotas nos testes de erro
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  console.error.mockRestore();
});

// ===== ESTADO =====
describe('GET /api/sistema/estado', () => {
  it('retorna armado: true quando o sistema está armado', async () => {
    pool.query.mockResolvedValueOnce([[{ armado: 1 }]]);
    const res = await request(app)
      .get('/api/sistema/estado')
      .set('Authorization', `Bearer ${tokenDe(1)}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ armado: true });
  });

  it('retorna armado: false quando o sistema está desarmado', async () => {
    pool.query.mockResolvedValueOnce([[{ armado: 0 }]]);
    const res = await request(app)
      .get('/api/sistema/estado')
      .set('Authorization', `Bearer ${tokenDe(1)}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ armado: false });
  });

  it('consulta SEMPRE pelo id do token (isolamento entre contas)', async () => {
    pool.query.mockResolvedValueOnce([[{ armado: 0 }]]);
    await request(app)
      .get('/api/sistema/estado')
      .set('Authorization', `Bearer ${tokenDe(7)}`);

    expect(pool.query.mock.calls[0][1]).toEqual([7]);
  });

  it('retorna 404 quando o usuário do token não existe', async () => {
    pool.query.mockResolvedValueOnce([[]]);
    const res = await request(app)
      .get('/api/sistema/estado')
      .set('Authorization', `Bearer ${tokenDe(99)}`);

    expect(res.status).toBe(404);
  });

  it('retorna 500 quando o banco falha', async () => {
    pool.query.mockRejectedValueOnce(new Error('banco fora do ar'));
    const res = await request(app)
      .get('/api/sistema/estado')
      .set('Authorization', `Bearer ${tokenDe(1)}`);

    expect(res.status).toBe(500);
    expect(res.body.erro).toBe('Erro interno do servidor');
  });
});

// ===== ARMAR =====
describe('POST /api/sistema/armar', () => {
  it('arma o sistema e responde armado: true', async () => {
    pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);
    const res = await request(app)
      .post('/api/sistema/armar')
      .set('Authorization', `Bearer ${tokenDe(1)}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ armado: true, mensagem: 'Sistema armado' });
    expect(pool.query.mock.calls[0][0]).toMatch(/UPDATE usuarios SET armado = 1/);
  });

  it('altera apenas a conta do token', async () => {
    pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);
    await request(app)
      .post('/api/sistema/armar')
      .set('Authorization', `Bearer ${tokenDe(3)}`);

    expect(pool.query.mock.calls[0][1]).toEqual([3]);
  });

  it('retorna 500 quando o banco falha', async () => {
    pool.query.mockRejectedValueOnce(new Error('falha'));
    const res = await request(app)
      .post('/api/sistema/armar')
      .set('Authorization', `Bearer ${tokenDe(1)}`);

    expect(res.status).toBe(500);
  });
});

// ===== DESARMAR =====
describe('POST /api/sistema/desarmar', () => {
  it('desarma o sistema e responde armado: false', async () => {
    pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);
    const res = await request(app)
      .post('/api/sistema/desarmar')
      .set('Authorization', `Bearer ${tokenDe(1)}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ armado: false, mensagem: 'Sistema desarmado' });
    expect(pool.query.mock.calls[0][0]).toMatch(/UPDATE usuarios SET armado = 0/);
  });

  it('altera apenas a conta do token', async () => {
    pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);
    await request(app)
      .post('/api/sistema/desarmar')
      .set('Authorization', `Bearer ${tokenDe(5)}`);

    expect(pool.query.mock.calls[0][1]).toEqual([5]);
  });

  it('retorna 500 quando o banco falha', async () => {
    pool.query.mockRejectedValueOnce(new Error('falha'));
    const res = await request(app)
      .post('/api/sistema/desarmar')
      .set('Authorization', `Bearer ${tokenDe(1)}`);

    expect(res.status).toBe(500);
  });
});