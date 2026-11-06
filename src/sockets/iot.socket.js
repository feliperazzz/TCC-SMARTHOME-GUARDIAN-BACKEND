// ============================================================
// IOT SOCKET — eventos em tempo real que GRAVAM NO BANCO
// O painel IoT dispara 'simular_evento' → o servidor:
// 1. valida o tipo contra o catálogo
// 2. insere o evento na tabela 'eventos'
// 3. transmite 'novo_evento' para todos (painel + quem mais escutar)
// ============================================================
const pool = require('../db');

// ===== Catálogo de eventos IoT (mesmo do eventos.routes.js) =====
// O servidor decide titulo/severidade — o cliente não inventa
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
  io.on('connection', (socket) => {
    console.log('⚡ Painel IoT conectado:', socket.id);

    // ===== REGISTRAR evento no BANCO + transmitir em tempo real =====
    socket.on('simular_evento', async ({ usuario_id, ambiente_id, tipo }) => {
      try {
        const def = CATALOGO_EVENTOS[tipo];
        if (!def) {
          return socket.emit('erro', { mensagem: 'Tipo de evento desconhecido' });
        }
        if (!usuario_id) {
          return socket.emit('erro', { mensagem: 'usuario_id é obrigatório' });
        }

        // 1. Grava na tabela eventos (lido = 0 → vira badge no app)
        const [resultado] = await pool.query(
          `INSERT INTO eventos
             (usuario_id, ambiente_id, tipo, titulo, descricao, severidade, lido)
           VALUES (?, ?, ?, ?, ?, ?, 0)`,
          [usuario_id, ambiente_id || null, tipo, def.titulo, def.descricao, def.severidade]
        );

        // 2. Busca o nome do ambiente pra mandar o evento completo
        let nomeAmbiente = null;
        if (ambiente_id) {
          const [ambRows] = await pool.query(
            'SELECT nome FROM ambientes WHERE id = ?',
            [ambiente_id]
          );
          nomeAmbiente = ambRows[0] ? ambRows[0].nome : null;
        }

        // 3. Evento completo (mesmo formato do GET /api/eventos)
        const evento = {
          id: resultado.insertId,
          usuario_id,
          ambiente_id: ambiente_id || null,
          ambiente: nomeAmbiente,
          tipo,
          titulo: def.titulo,
          descricao: def.descricao,
          severidade: def.severidade,
          lido: 0,
          criado_em: new Date().toISOString(),
        };

        // 4. Transmite pra todos — o painel mostra na hora
        io.emit('novo_evento', evento);
        socket.emit('evento_registrado', { id: evento.id });
      } catch (err) {
        console.error('Erro ao registrar evento IoT:', err);
        socket.emit('erro', { mensagem: 'Erro ao registrar evento' });
      }
    });

    socket.on('disconnect', () => {
      console.log('⚡ Painel IoT desconectado:', socket.id);
    });
  });
}

module.exports = { configurarIoT };