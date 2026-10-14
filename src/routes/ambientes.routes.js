// ============================================================
// ROTAS DE AMBIENTES (protegidas por token)
// GET /api/ambientes  → lista os ambientes do usuário logado
// POST /api/ambientes → cria um ambiente
// ============================================================
const express = require('express');
const pool = require('../db');
const { verificarToken } = require('../middlewares/auth');

const router = express.Router();

router.use(verificarToken); // todas as rotas abaixo exigem token

// LISTAR ambientes do usuário
router.get('/', async (req, res) => {
  try {
    const [linhas] = await pool.query(
      'SELECT * FROM ambientes WHERE usuario_id = ? ORDER BY id',
      [req.usuarioId]
    );
    res.json(linhas);
  } catch (err) {
    console.error('Erro ao listar ambientes:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// CRIAR ambiente
router.post('/', async (req, res) => {
  try {
    const { nome, icone, status } = req.body;
    if (!nome) {
      return res.status(400).json({ erro: 'O nome do ambiente é obrigatório' });
    }
    const [resultado] = await pool.query(
      'INSERT INTO ambientes (usuario_id, nome, icone, status) VALUES (?, ?, ?, ?)',
      [req.usuarioId, nome, icone || 'home', status || 'seguro']
    );
    res.status(201).json({
      mensagem: 'Ambiente criado com sucesso',
      ambienteId: resultado.insertId,
    });
  } catch (err) {
    console.error('Erro ao criar ambiente:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

module.exports = router;