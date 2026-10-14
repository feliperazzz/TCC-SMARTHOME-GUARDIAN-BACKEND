// ============================================================
// ROTAS DE EVENTOS/ALERTAS (protegidas por token)
// GET  /api/eventos         → lista eventos do usuário
// GET  /api/eventos/pendentes → só os não lidos
// PATCH /api/eventos/:id/lido → marca evento como lido (o swipe do app!)
// ============================================================
const express = require('express');
const pool = require('../db');
const { verificarToken } = require('../middlewares/auth');

const router = express.Router();

router.use(verificarToken);

// LISTAR eventos (mais recentes primeiro)
router.get('/', async (req, res) => {
  try {
    const [linhas] = await pool.query(
      `SELECT e.*, a.nome AS ambiente
       FROM eventos e
       LEFT JOIN ambientes a ON a.id = e.ambiente_id
       WHERE e.usuario_id = ?
       ORDER BY e.criado_em DESC
       LIMIT 50`,
      [req.usuarioId]
    );
    res.json(linhas);
  } catch (err) {
    console.error('Erro ao listar eventos:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// LISTAR só os pendentes (badge de não lidos)
router.get('/pendentes', async (req, res) => {
  try {
    const [linhas] = await pool.query(
      'SELECT * FROM eventos WHERE usuario_id = ? AND lido = 0 ORDER BY criado_em DESC',
      [req.usuarioId]
    );
    res.json(linhas);
  } catch (err) {
    console.error('Erro ao listar pendentes:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// MARCAR como lido (acionado pelo swipe no app)
router.patch('/:id/lido', async (req, res) => {
  try {
    const { id } = req.params;
    // o WHERE garante que o usuário só marca os PRÓPRIOS eventos
    const [resultado] = await pool.query(
      'UPDATE eventos SET lido = 1 WHERE id = ? AND usuario_id = ?',
      [id, req.usuarioId]
    );
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ erro: 'Evento não encontrado' });
    }
    res.json({ mensagem: 'Evento marcado como lido' });
  } catch (err) {
    console.error('Erro ao marcar evento:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

module.exports = router;