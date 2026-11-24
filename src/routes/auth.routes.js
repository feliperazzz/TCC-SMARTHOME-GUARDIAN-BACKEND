// ============================================================
// ROTAS DE AUTENTICAÇÃO
// POST   /api/auth/cadastrar → cria conta
// POST   /api/auth/login     → devolve token JWT
// GET    /api/auth/me        → dados do usuário logado
// PUT    /api/auth/me        → atualiza nome, e-mail e/ou senha
// DELETE /api/auth/me        → exclui a própria conta
// GET    /api/auth/usuarios  → lista usuários (pedido do professor; exige token)
// Rotas /me usam o id do TOKEN (nunca um id da URL)
// ============================================================
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { JWT_SECRET, verificarToken } = require('../middlewares/auth');

const router = express.Router();

// ===== CADASTRO =====
router.post('/cadastrar', async (req, res) => {
  try {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ erro: 'Nome, e-mail e senha são obrigatórios' });
    }
    if (senha.length < 6) {
      return res.status(400).json({ erro: 'A senha precisa ter no mínimo 6 caracteres' });
    }

    const [existe] = await pool.query('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existe.length > 0) {
      return res.status(409).json({ erro: 'E-mail já cadastrado' });
    }

    // O hash é salvo, a senha pura nunca toca o banco
    const hash = await bcrypt.hash(senha, 10);

    const [resultado] = await pool.query(
      'INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)',
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

    const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaCorreta) {
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

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

// ===== DADOS DO USUÁRIO LOGADO =====
router.get('/me', verificarToken, async (req, res) => {
  try {
    const [[usuario]] = await pool.query(
      'SELECT id, nome, email, criado_em FROM usuarios WHERE id = ?',
      [req.usuarioId]
    );
    if (!usuario) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }
    res.json(usuario);
  } catch (err) {
    console.error('Erro ao buscar usuário:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// ===== ATUALIZAR USUÁRIO LOGADO =====
// Body (todos opcionais, mas pelo menos um): nome, email, senha_atual, nova_senha
// Para trocar a senha, é obrigatório enviar senha_atual
router.put('/me', verificarToken, async (req, res) => {
  try {
    const { nome, email, senha_atual, nova_senha } = req.body;

    const [[usuario]] = await pool.query('SELECT * FROM usuarios WHERE id = ?', [req.usuarioId]);
    if (!usuario) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    if (nome === undefined && email === undefined && nova_senha === undefined) {
      return res.status(400).json({ erro: 'Envie pelo menos um campo para atualizar' });
    }

    const novoNome = nome !== undefined ? String(nome).trim() : usuario.nome;
    const novoEmail = email !== undefined ? String(email).trim() : usuario.email;

    if (!novoNome) {
      return res.status(400).json({ erro: 'O nome não pode ficar vazio' });
    }
    if (!novoEmail) {
      return res.status(400).json({ erro: 'O e-mail não pode ficar vazio' });
    }

    // Se o e-mail mudou, confere se não pertence a outra conta
    if (novoEmail !== usuario.email) {
      const [existe] = await pool.query(
        'SELECT id FROM usuarios WHERE email = ? AND id <> ?',
        [novoEmail, req.usuarioId]
      );
      if (existe.length > 0) {
        return res.status(409).json({ erro: 'E-mail já cadastrado' });
      }
    }

    let novoHash = usuario.senha_hash;
    if (nova_senha !== undefined) {
      if (!senha_atual) {
        return res.status(400).json({ erro: 'Informe a senha atual para trocar a senha' });
      }
      const senhaConfere = await bcrypt.compare(senha_atual, usuario.senha_hash);
      if (!senhaConfere) {
        return res.status(401).json({ erro: 'Senha atual incorreta' });
      }
      if (String(nova_senha).length < 6) {
        return res.status(400).json({ erro: 'A nova senha precisa ter no mínimo 6 caracteres' });
      }
      novoHash = await bcrypt.hash(String(nova_senha), 10);
    }

    await pool.query(
      'UPDATE usuarios SET nome = ?, email = ?, senha_hash = ? WHERE id = ?',
      [novoNome, novoEmail, novoHash, req.usuarioId]
    );

    res.json({
      mensagem: 'Dados atualizados com sucesso',
      usuario: { id: usuario.id, nome: novoNome, email: novoEmail },
    });
  } catch (err) {
    console.error('Erro ao atualizar usuário:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// ===== EXCLUIR CONTA DO USUÁRIO LOGADO =====
// Exige a senha no body para confirmar a exclusão.
// Ambientes e eventos somem junto (ON DELETE CASCADE no schema.sql).
router.delete('/me', verificarToken, async (req, res) => {
  try {
    const { senha } = req.body;
    if (!senha) {
      return res.status(400).json({ erro: 'Informe a senha para confirmar a exclusão' });
    }

    const [[usuario]] = await pool.query('SELECT senha_hash FROM usuarios WHERE id = ?', [req.usuarioId]);
    if (!usuario) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    const senhaConfere = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaConfere) {
      return res.status(401).json({ erro: 'Senha incorreta' });
    }

    await pool.query('DELETE FROM usuarios WHERE id = ?', [req.usuarioId]);

    res.json({ mensagem: 'Conta excluída com sucesso' });
  } catch (err) {
    console.error('Erro ao excluir usuário:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

// ===== LISTAR USUÁRIOS (pedido do professor; exige token) =====
router.get('/usuarios', verificarToken, async (req, res) => {
  try {
    const [linhas] = await pool.query('SELECT id, nome, email, criado_em FROM usuarios ORDER BY id');
    res.json(linhas);
  } catch (err) {
    console.error('Erro ao listar usuários:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
});

module.exports = router;