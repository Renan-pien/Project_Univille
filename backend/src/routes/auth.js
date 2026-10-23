import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { query } from '../db.js'
import { optionalAuth, signToken } from '../auth.js'
import { AppError, initials, wrap } from '../utils.js'

const router = Router()

export const sessionDto = (u) => ({
  id: String(u.id),
  name: u.nome_completo,
  initials: initials(u.nome_completo),
  role: u.perfil === 'ADMINISTRADOR' ? 'admin' : 'requester',
  roleLabel: u.perfil === 'ADMINISTRADOR' ? 'Administrador' : 'Solicitante',
})

const GUEST = { id: 'guest', name: 'Visitante', initials: 'VI', role: 'public', roleLabel: 'Acesso público' }

const loginSchema = z.object({ email: z.string().email().max(255), password: z.string().min(1).max(200) })

router.post('/auth/login', wrap(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body)
  const [user] = await query('SELECT * FROM usuarios WHERE email = ?', [email.trim().toLowerCase()])
  // compara sempre, para não vazar se o e-mail existe pelo tempo de resposta
  const ok = await bcrypt.compare(password, user?.senha_hash || '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv')
  if (!user || !ok || !user.ativo) throw new AppError(401, 'E-mail ou senha incorretos.')
  res.json({ token: signToken(user), user: sessionDto(user) })
}))

// Substitui fetchSessionUser: sem token devolve o visitante.
router.get('/session/me', optionalAuth, (req, res) => {
  res.json(req.user ? sessionDto(req.user) : GUEST)
})

export default router
