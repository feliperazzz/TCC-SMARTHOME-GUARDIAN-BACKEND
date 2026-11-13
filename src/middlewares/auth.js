// ============================================================
// MIDDLEWARE DE AUTENTICAÇÃO
// Verifica se a requisição traz um token JWT válido
// A JWT_SECRET vem do .env (nada de segredo no código)
// ============================================================
require('dotenv').config(); // carrega o .env ANTES de ler a secret
const jwt = require('jsonwebtoken');

// Secret vem do ambiente (.env)
const JWT_SECRET = process.env.JWT_SECRET;

// Aviso no terminal se o .env estiver sem a secret
if (!JWT_SECRET) {
  console.warn('⚠️  JWT_SECRET não encontrada no .env! O login vai falhar.');
}

// Último usuário autenticado que usou a API (usado pelo socket IoT)
let ultimoUsuarioId = null;

function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  // formato esperado: "Bearer TOKEN"
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ erro: 'Token não fornecido' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.usuarioId = payload.id; // deixa o id do usuário disponível nas rotas
    ultimoUsuarioId = payload.id; // registra quem está usando o app
    next();
  } catch (err) {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
}

function getUltimoUsuarioId() {
  return ultimoUsuarioId;
}

module.exports = { verificarToken, JWT_SECRET, getUltimoUsuarioId };