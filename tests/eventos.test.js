// ============================================================
// TESTES - EVENTOS (isolamento por usuário e catálogo)
// ============================================================
jest.mock('../src/db', () => ({ query: jest.fn(), getConnection: jest.fn() }));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const pool = require('../src/db');
const app = require('../src/app');

const tokenDe = (id) => jwt.sign({ id, nome: 'Teste' }, process.env.JWT_SECRET, { expiresIn: '1h' });

beforeEach(() => pool.query.mockReset());

describe('GET /api/eventos', () => {
  it('filtra pelo usuário do token', async () => {
    pool.query.mockResolvedValueOnce([[]]);
    await request(app).get('/api/eventos').set('Authorization', `Bearer ${tokenDe(5)}`);
    expect(pool.query.mock.calls[0][1]).toEqual([5]);
  });
});

describe('POST /api/eventos', () => {
  it('retorna 400 para tipo desconhecido', async () => {
    const res = await request(app)
      .post('/api/eventos')
      .set('Authorization', `Bearer ${tokenDe(1)}`)
      .send({ tipo: 'tipo_inventado' });
    expect(res.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('usa título e severidade do catálogo, nunca os enviados pelo cliente', async () => {
    pool.query.mockResolvedValueOnce([{ insertId: 42 }]);
    const res = await request(app)
      .post('/api/eventos')
      .set('Authorization', `Bearer ${tokenDe(1)}`)
      .send({ tipo: 'invasao', titulo: 'Fingindo ser outro', severidade: 'info' });

    expect(res.status).toBe(201);
    expect(res.body.titulo).toBe('Tentativa de invasão');
    expect(res.body.severidade).toBe('critico');
  });
});

describe('PATCH /api/eventos/:id/lido', () => {
  it('retorna 404 quando o evento não é do usuário', async () => {
    pool.query.mockResolvedValueOnce([{ affectedRows: 0 }]);
    const res = await request(app)
      .patch('/api/eventos/10/lido')
      .set('Authorization', `Bearer ${tokenDe(1)}`);
    expect(res.status).toBe(404);
    expect(pool.query.mock.calls[0][1]).toEqual(['10', 1]);
  });

  it('marca como lido quando o evento é do usuário', async () => {
    pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);
    const res = await request(app)
      .patch('/api/eventos/10/lido')
      .set('Authorization', `Bearer ${tokenDe(1)}`);
    expect(res.status).toBe(200);
  });
});