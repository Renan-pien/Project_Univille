import { Router } from 'express'
import { z } from 'zod'
import { query } from '../db.js'
import { requireAdmin } from '../auth.js'
import { AppError, parseId, wrap } from '../utils.js'

const router = Router()
router.use(...requireAdmin)

const SELECT = 'SELECT id, nome, capacidade, localizacao, tipo, acessivel, eventos_externos, ativo FROM ambientes'
const dto = (a) => ({
  id: `env-${a.id}`, name: a.nome, capacity: a.capacidade ?? 0, location: a.localizacao || '', type: a.tipo || '',
  accessible: !!a.acessivel, externalEvents: !!a.eventos_externos, active: !!a.ativo,
})

router.get('/', wrap(async (_req, res) => res.json((await query(`${SELECT} ORDER BY nome`)).map(dto))))

router.get('/options', wrap(async (_req, res) => {
  const rows = await query("SELECT DISTINCT tipo FROM ambientes WHERE tipo IS NOT NULL AND tipo <> '' ORDER BY tipo")
  const base = ['Auditório', 'Sala de aula', 'Laboratório']
  res.json({ types: [...new Set([...base, ...rows.map((r) => r.tipo)])] })
}))

const patchSchema = z.object({
  name: z.string().trim().min(2).max(100),
  capacity: z.coerce.number().int().positive(),
  location: z.string().trim().max(150),
  type: z.string().trim().max(60),
  accessible: z.boolean(),
  externalEvents: z.boolean(),
  active: z.boolean(),
}).partial()

const COLS = { name: 'nome', capacity: 'capacidade', location: 'localizacao', type: 'tipo', accessible: 'acessivel', externalEvents: 'eventos_externos', active: 'ativo' }

router.patch('/:id', wrap(async (req, res) => {
  const id = parseId(req.params.id)
  const p = patchSchema.parse(req.body)
  const entries = Object.entries(p).filter(([, v]) => v !== undefined)
  if (!entries.length) throw new AppError(400, 'Nenhum campo para atualizar.')
  const [cur] = await query('SELECT id FROM ambientes WHERE id = ?', [id])
  if (!cur) throw new AppError(404, 'Ambiente não encontrado.')
  try {
    await query(`UPDATE ambientes SET ${entries.map(([k]) => `${COLS[k]} = ?`).join(', ')} WHERE id = ?`,
      [...entries.map(([, v]) => (typeof v === 'boolean' ? (v ? 1 : 0) : v)), id])
  } catch (e) {
    if (e.errno === 1062) throw new AppError(409, 'Já existe um ambiente com este nome.')
    throw e
  }
  const [a] = await query(`${SELECT} WHERE id = ?`, [id])
  res.json(dto(a))
}))

export default router
