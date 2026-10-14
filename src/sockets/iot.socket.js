// ============================================================
// CAMADA IOT SIMULADA (Socket.io)
// O painel de simulação emite 'simular_evento' via WebSocket.
// O servidor: valida → salva no banco → transmite 'novo_evento'
// para todos os clientes conectados em tempo real.
// ============================================================
const pool = require('../db');

// Catálogo de eventos: o "dicionário" dos sensores simulados
const EVENTOS = {
  movimento:           { severidade: 'info',    titulo: 'Movimento detectado' },
  porta_aberta:        { severidade: 'atencao', titulo: 'Porta aberta' },
  temperatura_elevada: { severidade: 'atencao', titulo: 'Temperatura elevada' },
  invasao:             { severidade: 'critico', titulo: 'Possível tentativa de invasão' },
};

function configurarIoT(io) {
  io.on('connection', (socket) => {
    // roda CADA VEZ que alguém conecta (o painel, o app, o site...)
    console.log('🔗 Cliente conectado no socket:', socket.id);

    socket.on('disconnect', () => {
      console.log('🔌 Cliente desconectou:', socket.id);
    });

    // O painel emite esse evento quando um botão é clicado
    socket.on('simular_evento', async (dados) => {
      try {
        const { usuario_id = 1, ambiente_id = null, tipo } = dados;
        const definicao = EVENTOS[tipo];

        // Validação: tipo que não existe no dicionário = rejeita
        if (!definicao) {
          socket.emit('erro', { mensagem: 'Tipo de evento inválido' });
          return;
        }

        // Se veio com ambiente, busca o nome dele no banco
        let nomeAmbiente = null;
        if (ambiente_id) {
          const [amb] = await pool.query(
            'SELECT nome FROM ambientes WHERE id = ?',
            [ambiente_id]
          );
          nomeAmbiente = amb[0] ? amb[0].nome : null;
        }

        // Monta o título como o app exibe: "Porta aberta — Garagem"
        const titulo = nomeAmbiente
          ? `${definicao.titulo} — ${nomeAmbiente}`
          : definicao.titulo;

        // 1) REGISTRA no banco (histórico permanente)
        const [resultado] = await pool.query(
          `INSERT INTO eventos (usuario_id, ambiente_id, tipo, titulo, severidade)
           VALUES (?, ?, ?, ?, ?)`,
          [usuario_id, ambiente_id, tipo, titulo, definicao.severidade]
        );

        // 2) MONTA o objeto do evento completo
        const evento = {
          id: resultado.insertId,
          usuario_id,
          ambiente_id,
          ambiente: nomeAmbiente,
          tipo,
          titulo,
          severidade: definicao.severidade,
          lido: 0,
          criado_em: new Date().toISOString(),
        };

        // 3) TRANSMITE pra TODOS os clientes conectados (o pulo do gato!)
        io.emit('novo_evento', evento);

        // 4) Confirma só pro painel que disparou
        socket.emit('evento_registrado', evento);
        console.log('⚡ Evento simulado:', titulo);
      } catch (err) {
        console.error('Erro ao processar evento simulado:', err);
        socket.emit('erro', { mensagem: 'Erro ao registrar evento' });
      }
    });
  });
}

module.exports = { configurarIoT };