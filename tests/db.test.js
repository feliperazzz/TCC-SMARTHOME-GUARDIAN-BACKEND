jest.mock('mysql2/promise', () => ({
  createPool: jest.fn(() => ({ mocked: true })),
}));

const variaveisBanco = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASS', 'DB_PASSWORD', 'DB_SENHA', 'DB_NAME', 'DB_NOME'];
const valoresOriginais = Object.fromEntries(variaveisBanco.map((chave) => [chave, process.env[chave]]));

afterEach(() => {
  variaveisBanco.forEach((chave) => {
    if (valoresOriginais[chave] === undefined) {
      delete process.env[chave];
    } else {
      process.env[chave] = valoresOriginais[chave];
    }
  });
  jest.resetModules();
});

describe('database configuration', () => {
  it('uses DB_PASS as the connection password', () => {
    process.env.DB_PASS = 'senha-de-teste';
    delete process.env.DB_SENHA;
    delete process.env.DB_PASSWORD;

    require('../src/db');

    const mysql = require('mysql2/promise');
    expect(mysql.createPool).toHaveBeenCalledWith(expect.objectContaining({
      password: 'senha-de-teste',
    }));
  });

  it('uses DB_PASSWORD when DB_PASS is empty', () => {
    process.env.DB_PASS = '';
    process.env.DB_PASSWORD = 'senha-alternativa-de-teste';
    delete process.env.DB_SENHA;

    require('../src/db');

    const mysql = require('mysql2/promise');
    expect(mysql.createPool).toHaveBeenCalledWith(expect.objectContaining({
      password: 'senha-alternativa-de-teste',
    }));
  });
});
