// ============================================================
// TESTES - TODAS AS ROTAS PRIVADAS EXIGEM TOKEN
// ============================================================
jest.mock('../src/db', () => ({ query: jest.fn(), getConnection: jest.fn() }));

const request = require('supertest');
const app = require('../src/app');

const rotasPrivadas = [
  ['get', '/api/auth/me'],
  ['put', '/api/auth/me'],
  ['delete', '/api/auth/me'],
  ['get', '/api/auth/usuarios'],
  ['get', '/api/ambientes'],
  ['post', '/api/ambientes'],
  ['get', '/api/eventos'],
  ['get', '/api/eventos/pendentes'],
  ['post', '/api/eventos'],
  ['patch', '/api/eventos/1/lido'],
  ['get', '/api/sistema/estado'],
  ['post', '/api/sistema/armar'],
  ['post', '/api/sistema/desarmar'],
];

describe('Rotas privadas sem token', () => {
  it.each(rotasPrivadas)('%s %s retorna 401', async (metodo, url) => {
    const res = await request(app)[metodo](url);
    expect(res.status).toBe(401);
  });

  it('token com assinatura inválida também retorna 401', async () => {
    const res = await request(app)
      .get('/api/ambientes')
      .set('Authorization', 'Bearer token.falso.aqui');
    expect(res.status).toBe(401);
  });
});

describe('Rotas públicas', () => {
  it('GET /health responde 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api-docs.json entrega a especificação OpenAPI', async () => {
    const res = await request(app).get('/api-docs.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toMatch(/^3\./);
    expect(res.body.paths).toHaveProperty('/api/auth/me');
  });
});