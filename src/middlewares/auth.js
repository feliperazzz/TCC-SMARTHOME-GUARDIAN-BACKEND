// ============================================================
// MIDDLEWARE DE AUTENTICAÇÃO
// Verifica se a requisição traz um token JWT válido
// ============================================================
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'smart-home-guardian-secret-tcc'; // trocar por segredo forte na versão final

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
    next();
  } catch (err) {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
}

module.exports = { verificarToken, JWT_SECRET };