import { Router } from 'express'
import { z } from 'zod'
import { pool, query } from '../db.js'
import { optionalAuth, requireAuth } from '../auth.js'
import { AppError, colorFor, dayOf, fmtRange, hhmm, monthShort, protocol, wrap, weekday } from '../utils.js'

const router = Router()

// Agenda pública: eventos APROVADOS. Visitantes só veem os marcados como "abertos ao público".
router.get('/', optionalAuth, wrap(async (req, res) => {
  const mes = /^\d{4}-\d{2}$/.test(String(req.query.month || '')) ? String(req.query.month) : null
  const where = ["s.status = 'APROVADO'"]
  const params = []
  if (!req.user) where.push('s.evento_publico = 1')
  if (mes) { where.push("DATE_FORMAT(s.data_evento, '%Y-%m') = ?"); params.push(mes) }
  else where.push('s.data_evento >= CURDATE()')
  const rows = await query(
    `SELECT s.id, s.nome_evento, s.tema_id, t.nome AS tema, s.data_evento, s.hora_inicio, s.hora_fim,
            a.nome AS ambiente, s.palestrante
       FROM solicitacoes s
       JOIN temas t ON t.id = s.tema_id
       JOIN ambientes a ON a.id = s.ambiente_id
      WHERE ${where.join(' AND ')}
      ORDER BY s.data_evento, s.hora_inicio`, params)
  res.json(rows.map((r) => ({
    id: String(r.id), day: dayOf(r.data_evento), weekday: weekday(r.data_evento), month: monthShort(r.data_evento),
    title: r.nome_evento, theme: r.tema, time: fmtRange(r.hora_inicio, r.hora_fim),
    location: r.ambiente, speaker: r.palestrante, color: colorFor(r.tema_id),
  })))
}))

router.get('/form-options', requireAuth, wrap(async (_req, res) => {
  const [cursos, ambientes] = await Promise.all([
    query(`SELECT c.nome, cc.codigo, cc.nome AS cc_nome FROM cursos c JOIN centros_custo cc ON cc.id = c.centro_custo_id
            WHERE c.ativo = 1 AND cc.ativo = 1 ORDER BY c.nome`),
    query('SELECT id, nome FROM ambientes WHERE ativo = 1 ORDER BY nome'),
  ])
  res.json({
    coordinations: cursos.map((c) => ({ name: c.nome, costCenter: `${c.codigo} · ${c.cc_nome}` })),
    environments: ambientes.map((a) => ({ id: `env-${a.id}`, name: a.nome })),
  })
}))

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'use HH:MM')
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'use AAAA-MM-DD')
const slotSchema = z.object({ environment: z.string().min(1), date, startTime: time, endTime: time })
  .refine((v) => v.endTime > v.startTime, { message: 'O horário final deve ser maior que o inicial.', path: ['endTime'] })

const createSchema = z.object({
  name: z.string().trim().min(4).max(200),
  theme: z.string().trim().min(3).max(100),
  coordination: z.string().trim().min(1),
  speaker: z.string().trim().min(3).max(200),
  audienceSize: z.coerce.number().int().min(1),
  description: z.string().max(5000).optional().default(''),
  environment: z.string().min(1),
  date, startTime: time, endTime: time,
  accessible: z.boolean().default(false),
  publicEvent: z.boolean().default(true),
}).refine((v) => v.endTime > v.startTime, { message: 'O horário final deve ser maior que o inicial.', path: ['endTime'] })

async function findEnvironment(conn, name) {
  const [env] = (await conn.query('SELECT id, nome, capacidade FROM ambientes WHERE nome = ? AND ativo = 1', [name]))[0]
  if (!env) throw new AppError(400, 'Ambiente não encontrado ou inativo.')
  return env
}

export async function hasConflict(conn, { ambienteId, date, start, end, statuses, ignoreId = 0 }) {
  const [rows] = await conn.query(
    `SELECT id FROM solicitacoes
      WHERE ambiente_id = ? AND data_evento = ? AND status IN (?) AND id <> ?
        AND hora_inicio < ? AND hora_fim > ? LIMIT 1`,
    [ambienteId, date, statuses, ignoreId, `${end}:00`, `${start}:00`])
  return rows.length > 0
}

router.post('/conflict', requireAuth, wrap(async (req, res) => {
  const p = slotSchema.parse(req.body)
  const env = await findEnvironment(pool, p.environment)
  res.json({ hasConflict: await hasConflict(pool, { ambienteId: env.id, date: p.date, start: p.startTime, end: p.endTime, statuses: ['APROVADO', 'AGUARDANDO_APROVACAO'] }) })
}))

// Cria a solicitação já enviada para aprovação. Com ?draft=true salva como rascunho (sem checar conflito).
router.post('/', requireAuth, wrap(async (req, res) => {
  const p = createSchema.parse(req.body)
  const draft = req.query.draft === 'true'
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const env = await findEnvironment(conn, p.environment)
    if (env.capacidade && p.audienceSize > env.capacidade) throw new AppError(400, `Público estimado excede a capacidade do ambiente (${env.capacidade}).`)

    const [curso] = (await conn.query('SELECT id, centro_custo_id FROM cursos WHERE nome = ? AND ativo = 1', [p.coordination]))[0]
    if (!curso) throw new AppError(400, 'Curso/Coordenação não encontrado.')

    if (!draft && await hasConflict(conn, { ambienteId: env.id, date: p.date, start: p.startTime, end: p.endTime, statuses: ['APROVADO', 'AGUARDANDO_APROVACAO'] }))
      throw new AppError(409, `Conflito de agenda: o ${env.nome} já está reservado nesse horário.`)

    // tema: reutiliza o existente (por nome) ou cria
    let [tema] = (await conn.query('SELECT id FROM temas WHERE nome = ?', [p.theme]))[0]
    if (!tema) {
      const [ins] = await conn.query('INSERT INTO temas (nome) VALUES (?)', [p.theme])
      tema = { id: ins.insertId }
    }

    const status = draft ? 'RASCUNHO' : 'AGUARDANDO_APROVACAO'
    const texto = p.description.trim()
    const [ins] = await conn.query(
      `INSERT INTO solicitacoes
        (autor_id, solicitante_nome, nome_evento, tema_id, data_evento, hora_inicio, hora_fim, ambiente_id, curso_id, centro_custo_id,
         palestrante, publico_alvo, justificativa, objetivo, cerimonial, havera_inscricoes, necessidade_declaracoes,
         publico_estimado, acessibilidade, evento_publico, status, enviado_em)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,0,0,?,?,?,?,?)`,
      [req.user.id, req.user.nome_completo, p.name, tema.id, p.date, `${p.startTime}:00`, `${p.endTime}:00`, env.id, curso.id, curso.centro_custo_id,
       p.speaker, p.publicEvent ? 'Comunidade acadêmica e externa' : 'Comunidade acadêmica',
       texto || 'Não informada', texto || p.theme,
       p.audienceSize, p.accessible ? 1 : 0, p.publicEvent ? 1 : 0, status, draft ? null : new Date()])
    await conn.query(
      'INSERT INTO solicitacao_historico (solicitacao_id, status_anterior, status_novo, usuario_id, comentario) VALUES (?, NULL, ?, ?, ?)',
      [ins.insertId, status, req.user.id, draft ? 'Rascunho salvo' : 'Solicitação enviada'])
    await conn.commit()
    res.status(201).json({ protocol: protocol(ins.insertId) })
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
}))

export default router
