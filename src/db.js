// ============================================================
// CONEXÃO COM O BANCO MySQL — local ou nuvem (Aiven)
// Os dados sensíveis vêm do arquivo .env
// (nada de senha escrita direto no código!)
// ============================================================
require('dotenv').config(); // carrega o .env ANTES de tudo

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  // SSL: obrigatório na nuvem (Aiven). Ativa quando DB_SSL=true no .env.
  // Com DB_SSL=false (ou sem a linha), conecta normal no MySQL local.
  ssl:
    process.env.DB_SSL === 'true'
      ? { rejectUnauthorized: false }
      : undefined,
});

module.exports = pool;