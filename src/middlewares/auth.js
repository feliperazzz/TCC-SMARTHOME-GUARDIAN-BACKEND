// ============================================================
// MIDDLEWARE DE AUTENTICAÇÃO
// Verifica se a requisição traz um token JWT válido
// A JWT_SECRET vem do .env (nada de segredo no código)
// ============================================================
require('dotenv').config(); // carrega o .env ANTES de ler a secret
const jwt = require('jsonwebtoken');

// Secret vem do ambiente (.env)
const JWT_SECRET = process.env.JWT_SECRET;

// Falha explícita se a secret não existir
if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET não encontrada. Defina no .env ou nas variáveis da hospedagem.');
  if (process.env.NODE_ENV === 'production') {
    process.exit(1); // não sobe quebrado em produção
  }
  console.warn('⚠️  Continuando em desenvolvimento sem secret — o login vai falhar.');
}

function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  // formato esperado: "Bearer TOKEN"
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ erro: 'Token não fornecido' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    // Garante que o token realmente carrega o id do usuário
    if (!payload || !payload.id) {
      return res.status(401).json({ erro: 'Token sem identificador de usuário' });
    }

    req.usuarioId = payload.id; // deixa o id do usuário disponível nas rotas
    return next();
  } catch (err) {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
}

module.exports = { verificarToken, JWT_SECRET };