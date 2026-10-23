import { Router } from 'express'
import { query } from '../db.js'
import { requireAdmin } from '../auth.js'
import { fmtDate, protocol, wrap } from '../utils.js'

const router = Router()
router.use(...requireAdmin)

router.get('/filters', wrap(async (_req, res) => {
  const [cursos, anos] = await Promise.all([
    query('SELECT nome FROM cursos WHERE ativo = 1 ORDER BY nome'),
    query("SELECT DISTINCT YEAR(data_evento) AS ano FROM solicitacoes WHERE status = 'APROVADO' AND data_evento IS NOT NULL ORDER BY ano DESC"),
  ])
  const years = anos.length ? anos.map((a) => a.ano) : [new Date().getFullYear()]
  res.json({
    periods: years.flatMap((y) => [`Ano completo · ${y}`, `1.º semestre · ${y}`, `2.º semestre · ${y}`]),
    courses: cursos.map((c) => c.nome),
    statuses: ['Todos os estados', 'Realizado', 'Agendado'],
  })
}))

// "Realizado" = aprovado com data já passada; "Agendado" = aprovado com data de hoje em diante.
router.get('/annual-events', wrap(async (req, res) => {
  const { course = '', period = '', status = 'Todos os estados' } = req.query
  const where = ["s.status = 'APROVADO'"]
  const params = []
  if (course) { where.push('c.nome = ?'); params.push(String(course)) }
  const year = String(period).match(/(\d{4})/)?.[1]
  if (year) {
    where.push('YEAR(s.data_evento) = ?'); params.push(Number(year))
    if (String(period).startsWith('1.º')) where.push('MONTH(s.data_evento) <= 6')
    if (String(period).startsWith('2.º')) where.push('MONTH(s.data_evento) >= 7')
  }
  if (status === 'Realizado') where.push('s.data_evento < CURDATE()')
  if (status === 'Agendado') where.push('s.data_evento >= CURDATE()')
  const rows = await query(
    `SELECT s.id, s.nome_evento, c.nome AS curso, s.data_evento, s.publico_estimado, (s.data_evento < CURDATE()) AS realizado
       FROM solicitacoes s JOIN cursos c ON c.id = s.curso_id
      WHERE ${where.join(' AND ')} ORDER BY s.data_evento`, params)
  res.json(rows.map((r) => ({
    id: protocol(r.id).slice(1), event: r.nome_evento, course: r.curso, date: fmtDate(r.data_evento),
    status: r.realizado ? 'Realizado' : 'Agendado', participants: r.publico_estimado ?? 0,
  })))
}))

export default router
