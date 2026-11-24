// ============================================================
// SERVIDOR - sobe o HTTP, o Socket.io e o banco
// A aplicação Express fica em app.js
// ============================================================
require('dotenv').config(); // carrega o .env PRIMEIRO

const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const pool = require('./db');
const { configurarIoT } = require('./sockets/iot.socket');

const server = http.createServer(app);

// Socket.io: alertas IoT em tempo real
const io = new Server(server, {
  cors: { origin: '*' }, // em produção, restringir à origem do app/site
});
configurarIoT(io);

// ===== TESTE DE CONEXÃO COM O BANCO =====
pool.getConnection()
  .then((conn) => {
    console.log('🗄️  Banco de dados conectado com sucesso!');
    conn.release();
  })
  .catch((err) => {
    console.error('❌ Falha ao conectar no banco:', err.code);
    console.error('   Verifique usuário, senha e banco no db.js.');
  });

// ===== SUBIR O SERVIDOR =====
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('================================================');
  console.log('🛡️  Smart Home Guardian API');
  console.log(`🚀  Servidor rodando em http://localhost:${PORT}`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
  console.log(`⚡ Painel IoT: http://localhost:${PORT}/painel`);
  console.log(`📘 Documentação: http://localhost:${PORT}/api-docs`);
  console.log('================================================');
});