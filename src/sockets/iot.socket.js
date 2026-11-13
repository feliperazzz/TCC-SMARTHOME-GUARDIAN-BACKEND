// ============================================================
// IOT SOCKET — registra eventos no banco e transmite em tempo real
//
// Compatível com o app e o painel atuais (sem alterações):
// - Painel IoT: conecta sem token e envia 'simular_evento'
// - App: conecta com ou sem token (se tiver, é identificado)
//
// Dono do evento (ordem de prioridade):
// 1. Usuário autenticado conectado por socket (app com token)
// 2. Último usuário que usou a API com token (REST)
// 3. usuario_id enviado pelo painel (último recurso)
// ============================================================
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { JWT_SECRET, getUltimoUsuarioId } = require('../middlewares/auth');

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

// socketId -> usuarioId, só para sockets que enviaram token válido
const usuariosConectados = new Map();

function resolverDono(usuarioDoPainel) {
  // 1. usuário autenticado mais recente conectado por socket
  const autenticados = [...usuariosConectados.values()];
  if (autenticados.length > 0) return autenticados[autenticados.length - 1];

  // 2. último usuário que usou a API com token
  const ultimo = getUltimoUsuarioId();
  if (ultimo) return ultimo;

  // 3. valor enviado pelo painel
  return usuarioDoPainel ? Number(usuarioDoPainel) : null;
}

function configurarIoT(io) {
  // Autenticação opcional: sem token (painel) ou com token inválido segue normal
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        const payload = jwt.verify(token, JWT_SECRET);
        socket.usuarioId = payload.id;
      } catch {
        // token inválido: trata como conexão sem identificação
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    if (socket.usuarioId) {
      usuariosConectados.set(socket.id, socket.usuarioId);
      console.log('⚡ App conectado como usuário', socket.usuarioId);
    } else {
      console.log('⚡ Painel IoT conectado:', socket.id);
    }

    socket.on('simular_evento', async (dados = {}) => {
      try {
        const { tipo } = dados;
        const def = CATALOGO_EVENTOS[tipo];
        if (!def) {
          return socket.emit('erro', { mensagem: 'Tipo de evento desconhecido' });
        }

        const usuarioId = resolverDono(dados.usuario_id);
        if (!usuarioId) {
          return socket.emit('erro', { mensagem: 'Não foi possível identificar o usuário' });
        }

        // Ambiente só é aceito se pertencer ao dono do evento
        let ambienteId = null;
        let nomeAmbiente = null;
        if (dados.ambiente_id) {
          const [ambRows] = await pool.query(
            'SELECT id, nome FROM ambientes WHERE id = ? AND usuario_id = ?',
            [dados.ambiente_id, usuarioId]
          );
          if (ambRows.length > 0) {
            ambienteId = ambRows[0].id;
            nomeAmbiente = ambRows[0].nome;
          }
        }

        const [resultado] = await pool.query(
          `INSERT INTO eventos
             (usuario_id, ambiente_id, tipo, titulo, descricao, severidade, lido)
           VALUES (?, ?, ?, ?, ?, ?, 0)`,
          [usuarioId, ambienteId, tipo, def.titulo, def.descricao, def.severidade]
        );

        const evento = {
          id: resultado.insertId,
          usuario_id: usuarioId,
          ambiente_id: ambienteId,
          ambiente: nomeAmbiente,
          tipo,
          titulo: def.titulo,
          descricao: def.descricao,
          severidade: def.severidade,
          lido: 0,
          criado_em: new Date().toISOString(),
        };

        console.log(`⚡ Evento ${evento.id} gravado para o usuário ${usuarioId}`);

        // Transmite para todos (como combinado). Cada evento leva usuario_id.
        io.emit('novo_evento', evento);
        socket.emit('evento_registrado', { id: evento.id });
      } catch (err) {
        console.error('Erro ao registrar evento IoT:', err);
        socket.emit('erro', { mensagem: 'Erro ao registrar evento' });
      }
    });

    socket.on('disconnect', () => {
      usuariosConectados.delete(socket.id);
    });
  });
}

module.exports = { configurarIoT };