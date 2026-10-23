import jwt from 'jsonwebtoken'
import { query } from './db.js'
import { AppError, wrap } from './utils.js'

const secret = () => {
  if (!process.env.JWT_SECRET) throw new AppError(500, 'JWT_SECRET não configurado.')
  return process.env.JWT_SECRET
}

export const signToken = (user) =>
  jwt.sign({ sub: String(user.id), perfil: user.perfil }, secret(), { expiresIn: process.env.JWT_EXPIRES_IN || '8h' })

async function loadUser(req, required) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    if (required) throw new AppError(401, 'Autenticação necessária.')
    return null
  }
  let payload
  try { payload = jwt.verify(token, secret()) } catch {
    if (required) throw new AppError(401, 'Sessão inválida ou expirada.')
    return null
  }
  const [user] = await query('SELECT id, nome_completo, email, perfil, ativo FROM usuarios WHERE id = ?', [payload.sub])
  if (!user || !user.ativo) {
    if (required) throw new AppError(401, 'Usuário inativo ou inexistente.')
    return null
  }
  return user
}

export const optionalAuth = wrap(async (req, _res, next) => { req.user = await loadUser(req, false); next() })
export const requireAuth = wrap(async (req, _res, next) => { req.user = await loadUser(req, true); next() })
export const requireAdmin = [
  requireAuth,
  (req, _res, next) => (req.user.perfil === 'ADMINISTRADOR' ? next() : next(new AppError(403, 'Acesso restrito a administradores.'))),
]
