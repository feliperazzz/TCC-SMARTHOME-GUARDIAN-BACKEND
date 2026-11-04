// ============================================================
// ROTAS DO SISTEMA - ARMAR / DESARMAR (7.7 - opção A)
// O estado fica na coluna "armado" do usuário logado (via token)
// ============================================================
const express = require('express');
const pool = require('../db');
const { verificarToken } = require('../middlewares/auth');

const router = express.Router();

router.use(verificarToken); // todas as rotas abaixo exigem token

// GET /api/sistema/estado → estado atual (pra Home carregar ao abrir)
router.get('/estado', async (req, res) => {
  try {
    const [linhas] = await pool.query(
      'SELECT armado FROM usuarios WHERE id = ?',
      [req.usuarioId]
    );
    if (linhas.length === 0) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }
    res.json({ armado: linhas[0].armado === 1 });
  } catch (err) {
    console.error('Erro ao buscar estado do sistema:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// POST /api/sistema/armar
router.post('/armar', async (req, res) => {
  try {
    await pool.query('UPDATE usuarios SET armado = 1 WHERE id = ?', [req.usuarioId]);
    res.json({ armado: true, mensagem: 'Sistema armado' });
  } catch (err) {
    console.error('Erro ao armar o sistema:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// POST /api/sistema/desarmar
router.post('/desarmar', async (req, res) => {
  try {
    await pool.query('UPDATE usuarios SET armado = 0 WHERE id = ?', [req.usuarioId]);
    res.json({ armado: false, mensagem: 'Sistema desarmado' });
  } catch (err) {
    console.error('Erro ao desarmar o sistema:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

module.exports = router;