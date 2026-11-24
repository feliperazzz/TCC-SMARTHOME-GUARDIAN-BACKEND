// ============================================================
// APLICAÇÃO EXPRESS (sem subir o servidor)
// Separada do server.js para poder ser testada com Supertest
// ============================================================
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./docs/swagger');

const authRoutes = require('./routes/auth.routes');
const ambientesRoutes = require('./routes/ambientes.routes');
const eventosRoutes = require('./routes/eventos.routes');
const sistemaRoutes = require('./routes/sistema');

const app = express();

// ===== MIDDLEWARES =====
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// ===== SAÚDE =====
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    servico: 'Smart Home Guardian API',
    versao: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ===== PAINEL IOT =====
app.get('/painel', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'painel-iot.html'));
});

// ===== DOCUMENTAÇÃO SWAGGER =====
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Smart Home Guardian API',
}));
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

// ===== ROTAS DA API =====
app.use('/api/auth', authRoutes);
app.use('/api/ambientes', ambientesRoutes);
app.use('/api/eventos', eventosRoutes);
app.use('/api/sistema', sistemaRoutes);

// ===== ROTA 404 =====
app.use((req, res) => {
  res.status(404).json({ erro: 'Endpoint não encontrado' });
});

// ===== ERROS GLOBAIS =====
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ erro: 'Erro interno do servidor' });
});

module.exports = app;