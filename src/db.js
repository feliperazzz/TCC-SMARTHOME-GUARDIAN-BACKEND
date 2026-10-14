// ============================================================
// CONEXÃO COM O BANCO MySQL/MariaDB
// Ajuste usuario/senha se a máquina tiver outro padrão
// ============================================================
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'senai2026',          // ajuste se o root da máquina tiver senha
  database: 'smart_home_guardian',
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = pool;