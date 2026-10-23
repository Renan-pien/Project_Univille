import { Router } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import { z } from 'zod'
import { query } from '../db.js'
import { requireAdmin } from '../auth.js'
import { AppError, parseId, wrap } from '../utils.js'

const router = Router()
router.use(...requireAdmin)

const ROLE_TO_DB = { Solicitante: 'SOLICITANTE', Administrador: 'ADMINISTRADOR' }
const ROLE_LABEL = { SOLICITANTE: 'Solicitante', ADMINISTRADOR: 'Administrador' }

const dto = (u) => ({ id: String(u.id), name: u.nome_completo, email: u.email, role: ROLE_LABEL[u.perfil], coordination: u.coordenacao || '', active: !!u.ativo })

router.get('/', wrap(async (_req, res) => {
  res.json((await query('SELECT id, nome_completo, email, perfil, coordenacao, ativo FROM usuarios ORDER BY criado_em DESC, id DESC')).map(dto))
}))

router.get('/form-options', wrap(async (_req, res) => {
  const cursos = await query('SELECT nome FROM cursos WHERE ativo = 1 ORDER BY nome')
  res.json({ roles: Object.keys(ROLE_TO_DB), coordinations: cursos.map((c) => c.nome) })
}))

const createSchema = z.object({
  name: z.string().trim().min(3).max(150),
  email: z.string().trim().toLowerCase().email().max(255),
  role: z.enum(['Solicitante', 'Administrador']),
  coordination: z.string().trim().max(150).default(''),
  active: z.boolean().default(true),
  password: z.string().min(8).max(100).optional(), // o front ainda não envia: gera senha temporária
})

router.post('/', wrap(async (req, res) => {
  const p = createSchema.parse(req.body)
  const [dup] = await query('SELECT id FROM usuarios WHERE email = ?', [p.email])
  if (dup) throw new AppError(409, 'Já existe um usuário com este e-mail.')
  const temporaryPassword = p.password ? undefined : crypto.randomBytes(9).toString('base64url')
  const hash = await bcrypt.hash(p.password || temporaryPassword, 10)
  const r = await query('INSERT INTO usuarios (nome_completo, email, senha_hash, perfil, coordenacao, ativo) VALUES (?,?,?,?,?,?)',
    [p.name, p.email, hash, ROLE_TO_DB[p.role], p.coordination || null, p.active ? 1 : 0])
  const [u] = await query('SELECT id, nome_completo, email, perfil, coordenacao, ativo FROM usuarios WHERE id = ?', [r.insertId])
  res.status(201).json({ ...dto(u), ...(temporaryPassword && { temporaryPassword }) })
}))

router.delete('/:id', wrap(async (req, res) => {
  const id = parseId(req.params.id)
  if (id === req.user.id) throw new AppError(400, 'Você não pode excluir o próprio usuário.')
  const [u] = await query('SELECT id FROM usuarios WHERE id = ?', [id])
  if (!u) throw new AppError(404, 'Usuário não encontrado.')
  try {
    await query('DELETE FROM usuarios WHERE id = ?', [id])
  } catch (e) {
    // tem solicitações/histórico vinculados (FK RESTRICT): apenas desativa
    if (e.errno === 1451) await query('UPDATE usuarios SET ativo = 0 WHERE id = ?', [id])
    else throw e
  }
  res.status(204).end()
}))

export default router
