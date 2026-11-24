// ============================================================
// IoT EM TEMPO REAL - SMART HOME GUARDIAN
// - Só entra no socket quem envia um JWT válido
// - Cada usuário fica na sala "usuario_<id>"
// - O evento simulado é gravado para o DONO do ambiente
//   (ou para o usuário logado, se não houver ambiente)
// ============================================================
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { JWT_SECRET } = require('../middlewares/auth');

// Mesmo catálogo do eventos.routes.js (manter os dois iguais)
const CATALOGO_EVENTOS = {
  movimento: {
    titulo: 'Movimento detectado',
    descricao: 'Movimento detectado por sensor',
    severidade: 'info',
  },
  porta_aberta: {
    titulo: 'Porta aberta',
    descricao: 'Uma porta da residência foi aberta',
    severidade: 'atencao',
  },
  temperatura_elevada: {
    titulo: 'Temperatura elevada',
    descricao: 'Temperatura acima do limite seguro',
    severidade: 'atencao',
  },
  invasao: {
    titulo: 'Tentativa de invasão',
    descricao: 'Tentativa de invasão detectada',
    severidade: 'critico',
  },
};

function configurarIoT(io) {
  // ---------- 1) AUTENTICAÇÃO DO SOCKET ----------
  // O app Flutter e o painel enviam { auth: { token } } ao conectar
  io.use((socket, next) => {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) return next(new Error('Token não fornecido'));

    try {
      const payload = jwt.verify(token, JWT_SECRET);
      socket.usuarioId = payload.id;
      next();
    } catch {
      next(new Error('Token inválido ou expirado'));
    }
  });

  // ---------- 2) CONEXÃO ----------
  io.on('connection', (socket) => {
    // Cada usuário escuta somente a própria sala
    socket.join(`usuario_${socket.usuarioId}`);
    console.log(`📡 Socket conectado: usuário ${socket.usuarioId}`);

    // ---------- 3) SIMULAR EVENTO ----------
    // Dados esperados: { tipo, ambiente_id } (ambiente_id é opcional)
    socket.on('simular_evento', async (dados = {}, ack) => {
      try {
        const def = CATALOGO_EVENTOS[dados.tipo];
        if (!def) {
          return socket.emit('erro', { mensagem: 'Tipo de evento desconhecido' });
        }

        let ambienteId = null;
        let ambienteNome = null;

        // Se veio um ambiente, ele precisa pertencer ao usuário logado
        if (dados.ambiente_id) {
          const [[ambiente]] = await pool.query(
            'SELECT id, nome FROM ambientes WHERE id = ? AND usuario_id = ?',
            [Number(dados.ambiente_id), socket.usuarioId]
          );
          if (!ambiente) {
            return socket.emit('erro', { mensagem: 'Ambiente não pertence a este usuário' });
          }
          ambienteId = ambiente.id;
          ambienteNome = ambiente.nome;
        }

        const [resultado] = await pool.query(
          `INSERT INTO eventos (usuario_id, ambiente_id, tipo, titulo, descricao, severidade, lido)
           VALUES (?, ?, ?, ?, ?, ?, 0)`,
          [socket.usuarioId, ambienteId, dados.tipo, def.titulo, def.descricao, def.severidade]
        );

        const evento = {
          id: resultado.insertId,
          tipo: dados.tipo,
          titulo: def.titulo,
          descricao: def.descricao,
          severidade: def.severidade,
          ambiente_id: ambienteId,
          ambiente: ambienteNome,
          lido: 0,
          criado_em: new Date().toISOString(),
        };

        // Envia só para a sala do dono (o app dele recebe o aviso)
        io.to(`usuario_${socket.usuarioId}`).emit('novo_evento', evento);
        socket.emit('evento_registrado', { id: resultado.insertId });

        if (typeof ack === 'function') ack({ ok: true, id: resultado.insertId });
      } catch (err) {
        console.error('Erro no evento IoT:', err);
        socket.emit('erro', { mensagem: 'Erro interno ao registrar evento' });
      }
    });
  });
}

module.exports = { configurarIoT };