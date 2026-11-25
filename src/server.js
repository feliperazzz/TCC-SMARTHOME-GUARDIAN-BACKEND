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

// Origens liberadas para o Socket.IO (site no Vercel + app)
const ORIGENS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
  : '*';

const server = http.createServer(app);

// ===== SOCKET.IO: ALERTAS IOT EM TEMPO REAL =====
const io = new Server(server, {
  cors: { origin: ORIGENS, methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
});
app.set('io', io); // permite emitir eventos de dentro das rotas REST
configurarIoT(io);

// ===== TESTE DE CONEXÃO COM O BANCO =====
pool.getConnection()
  .then((conn) => {
    console.log('🗄️  Banco de dados conectado com sucesso!');
    conn.release();
  })
  .catch((err) => {
    console.error('❌ Falha ao conectar no banco:', err.code);
    console.error('   Verifique DB_HOST, DB_PORT, DB_USER, DB_PASS (ou DB_SENHA/DB_PASSWORD) e DB_NAME.');
  });

// ===== SUBIR O SERVIDOR =====
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // obrigatório em container (Render, Railway, Docker)
const BASE = process.env.PUBLIC_URL || `http://localhost:${PORT}`;

server.listen(PORT, HOST, () => {
  console.log('================================================');
  console.log('🛡️  Smart Home Guardian API');
  console.log(`🚀  Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🚀  Porta: ${PORT}`);
  console.log(`❤️  Health check: ${BASE}/health`);
  console.log(`⚡ Painel IoT: ${BASE}/painel`);
  console.log(`📘 Documentação: ${BASE}/api-docs`);
  console.log('================================================');
});

server.on('error', (err) => {
  console.error('❌ Erro no servidor HTTP:', err.message);
  process.exit(1);
});

// ===== ENCERRAMENTO LIMPO (exigido por Render/Railway) =====
['SIGTERM', 'SIGINT'].forEach((sinal) => {
  process.on(sinal, () => {
    console.log(`\n🔻 Recebido ${sinal}. Encerrando...`);
    server.close(() => {
      pool.end().then(() => process.exit(0)).catch(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10000);
  });
});