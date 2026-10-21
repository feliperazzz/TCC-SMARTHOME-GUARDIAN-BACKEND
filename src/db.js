// ============================================================
// CONEXÃO COM O BANCO MySQL/MariaDB
// Os dados sensíveis agora vêm do arquivo .env
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
});

module.exports = pool;