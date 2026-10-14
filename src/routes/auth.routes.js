// ============================================================
// ROTAS DE AUTENTICAÇÃO
// POST /api/auth/cadastrar  → cria conta
// POST /api/auth/login      → devolve token JWT
// ============================================================
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { JWT_SECRET } = require('../middlewares/auth');

const router = express.Router();

// ===== CADASTRO =====
router.post('/cadastrar', async (req, res) => {
  try {
    const { nome, email, senha } = req.body;

    // Validação básica
    if (!nome || !email || !senha) {
      return res.status(400).json({ erro: 'Nome, e-mail e senha são obrigatórios' });
    }
    if (senha.length < 6) {
      return res.status(400).json({ erro: 'A senha precisa ter no mínimo 6 caracteres' });
    }

    // Verifica se o e-mail já existe
    const [existe] = await pool.query('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existe.length > 0) {
      return res.status(409).json({ erro: 'E-mail já cadastrado' });
    }

    // Criptografa a senha (o hash é salvo, a senha pura nunca toca o banco)
    const hash = await bcrypt.hash(senha, 10);

    const [resultado] = await pool.query(
      'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
      [nome, email, hash]
    );

    res.status(201).json({
      mensagem: 'Usuário cadastrado com sucesso',
      usuarioId: resultado.insertId,
    });
  } catch (err) {
    console.error('Erro no cadastro:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// ===== LOGIN =====
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ erro: 'E-mail e senha são obrigatórios' });
    }

    const [linhas] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [email]);
    const usuario = linhas[0];

    // Mensagem genérica de propósito: não revelar se foi o e-mail ou a senha que errou
    if (!usuario) {
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    // Compara a senha digitada com o hash do banco
    const senhaCorreta = await bcrypt.compare(senha, usuario.senha);
    if (!senhaCorreta) {
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    // Gera o token (válido por 7 dias)
    const token = jwt.sign(
      { id: usuario.id, nome: usuario.nome },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      mensagem: 'Login realizado com sucesso',
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
      },
    });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// ===== LISTAR USUÁRIOS (somente para testes/dev) =====
router.get('/usuarios', async (req, res) => {
  try {
    const [linhas] = await pool.query('SELECT id, nome, email, criado_em FROM usuarios ORDER BY id');
    res.json(linhas);
  } catch (err) {
    console.error('Erro ao listar usuários:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});


module.exports = router;