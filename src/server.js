// ============================================================
// SMART HOME GUARDIAN - BACKEND
// Servidor principal + health check + banco + autenticação
// + Ambientes/Eventos + IoT simulada em tempo real (Socket.io)
// + Variáveis de ambiente (dotenv)
// ============================================================
require('dotenv').config(); // ⬅️ NOVO: carrega o .env PRIMEIRO de tudo

const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { Server } = require('socket.io');
const pool = require('./db');
const authRoutes = require('./routes/auth.routes');
const ambientesRoutes = require('./routes/ambientes.routes');
const eventosRoutes = require('./routes/eventos.routes');
const { configurarIoT } = require('./sockets/iot.socket');

const app = express();
const server = http.createServer(app);

// Socket.io: comunicação em tempo real (alertas IoT)
const io = new Server(server, {
  cors: { origin: '*' }, // em produção, restringir à origem do app/site
});
configurarIoT(io);

// ===== MIDDLEWARES =====
app.use(cors());          // permite acesso do app e do site
app.use(express.json());  // permite receber JSON nas requisições
// Arquivos estáticos (painel de simulação IoT)
app.use(express.static(path.join(__dirname, '..', 'public')));

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

// ===== ROTA DE SAÚDE =====
// O app e o site consultam esta rota pra saber se o backend está vivo
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    servico: 'Smart Home Guardian API',
    versao: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ===== PAINEL DE SIMULAÇÃO IOT =====
app.get('/painel', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'painel-iot.html'));
});

// ===== ROTAS DA API =====
app.use('/api/auth', authRoutes);           // cadastrar e login
app.use('/api/ambientes', ambientesRoutes); // ambientes: exigem token
app.use('/api/eventos', eventosRoutes);     // eventos: exigem token

// ===== ROTA 404 =====
// Deve vir DEPOIS de todas as rotas válidas (ordem importa!)
app.use((req, res) => {
  res.status(404).json({ erro: 'Endpoint não encontrado' });
});

// ===== TRATAMENTO DE ERROS GLOBAL =====
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ erro: 'Erro interno do servidor' });
});

// ===== SUBIR O SERVIDOR =====
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('================================================');
  console.log('🛡️  Smart Home Guardian API');
  console.log(`🚀  Servidor rodando em http://localhost:${PORT}`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
  console.log(`⚡ Painel IoT: http://localhost:${PORT}/painel`);
  console.log('================================================');
});