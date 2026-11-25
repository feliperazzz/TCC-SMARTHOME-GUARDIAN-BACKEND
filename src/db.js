// ============================================================
// CONEXÃO COM O BANCO (MariaDB/MySQL)
// ============================================================
const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306, // Railway e Aiven usam porta própria
  user: process.env.DB_USER || 'root',
  password: process.env.DB_SENHA || process.env.DB_PASS || process.env.DB_PASSWORD || '',
  database: process.env.DB_NOME || process.env.DB_NAME || 'smart_home_guardian',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: '-03:00',
};

// SSL desligado por padrão; ligue com DB_SSL=true (obrigatório no Aiven)
if (String(process.env.DB_SSL).toLowerCase() === 'true') {
  config.ssl = { rejectUnauthorized: false };
}

const pool = mysql.createPool(config);

module.exports = pool;