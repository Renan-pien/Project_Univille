import { Router } from 'express'
import { z } from 'zod'
import { pool, query } from '../db.js'
import { requireAdmin, requireAuth } from '../auth.js'
import { AppError, fmtDate, fmtDateTime, fmtRange, parseId, protocol, wrap } from '../utils.js'
import { hasConflict } from './events.js'

const router = Router()

const ADMIN_STATUS = { Pendente: 'AGUARDANDO_APROVACAO', Aceita: 'APROVADO', Negada: 'REJEITADO' }
const ADMIN_LABEL = { AGUARDANDO_APROVACAO: 'Pendente', APROVADO: 'Aceita', REJEITADO: 'Negada' }
const MY_LABEL = { APROVADO: 'Aprovado', AGUARDANDO_APROVACAO: 'Em análise', REJEITADO: 'Rejeitado', RASCUNHO: 'Rascunho' }

// ---------- Administrador ----------
router.get('/', ...requireAdmin, wrap(async (req, res) => {
  const status = ADMIN_STATUS[String(req.query.status || 'Pendente')]
  if (!status) throw new AppError(400, 'Status inválido. Use Pendente, Aceita ou Negada.')
  const rows = await query(
    `SELECT s.id, s.nome_evento, t.nome AS tema, s.solicitante_nome, s.data_evento, s.hora_inicio, s.hora_fim,
            a.nome AS ambiente, s.publico_alvo, s.justificativa, s.status, s.enviado_em, s.criado_em
       FROM solicitacoes s
       LEFT JOIN temas t ON t.id = s.tema_id
       LEFT JOIN ambientes a ON a.id = s.ambiente_id
      WHERE s.status = ?
      ORDER BY COALESCE(s.enviado_em, s.criado_em) DESC`, [status])
  res.json(rows.map((r) => ({
    id: protocol(r.id), event: r.nome_evento, theme: r.tema, requester: r.solicitante_nome,
    date: fmtDate(r.data_evento), time: fmtRange(r.hora_inicio, r.hora_fim), location: r.ambiente,
    audience: r.publico_alvo, justification: r.justificativa, status: ADMIN_LABEL[r.status],
    receivedAt: fmtDateTime(r.enviado_em || r.criado_em),
  })))
}))

async function loadPending(conn, id) {
  const [rows] = await conn.query('SELECT * FROM solicitacoes WHERE id = ? FOR UPDATE', [id])
  const s = rows[0]
  if (!s) throw new AppError(404, 'Solicitação não encontrada.')
  if (s.status !== 'AGUARDANDO_APROVACAO') throw new AppError(409, 'Apenas solicitações pendentes podem ser avaliadas.')
  return s
}

async function decide(req, res, fn) {
  const id = parseId(req.params.id)
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const s = await loadPending(conn, id)
    const result = await fn(conn, s)
    await conn.commit()
    res.json(result)
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
}

const dto = (s, status) => ({ id: protocol(s.id), event: s.nome_evento, status })

router.post('/:id/approve', ...requireAdmin, wrap((req, res) => decide(req, res, async (conn, s) => {
  // revalida: outra solicitação pode ter sido aprovada no mesmo horário enquanto esta esperava
  const start = String(s.hora_inicio).slice(0, 5), end = String(s.hora_fim).slice(0, 5)
  if (await hasConflict(conn, { ambienteId: s.ambiente_id, date: s.data_evento, start, end, statuses: ['APROVADO'], ignoreId: s.id }))
    throw new AppError(409, 'Conflito: já existe evento aprovado neste ambiente e horário.')
  await conn.query("UPDATE solicitacoes SET status='APROVADO', avaliado_por_id=?, avaliado_em=NOW(), motivo_rejeicao=NULL WHERE id=?", [req.user.id, s.id])
  await conn.query('INSERT INTO solicitacao_historico (solicitacao_id, status_anterior, status_novo, usuario_id, comentario) VALUES (?,?,?,?,?)',
    [s.id, s.status, 'APROVADO', req.user.id, 'Solicitação aprovada'])
  return dto(s, 'Aceita')
})))

const rejectSchema = z.object({ reason: z.string().trim().min(10, 'Informe ao menos 10 caracteres.').max(500), allowReadjustment: z.boolean().default(true) })

router.post('/:id/reject', ...requireAdmin, wrap((req, res) => {
  const { reason, allowReadjustment } = rejectSchema.parse(req.body)
  return decide(req, res, async (conn, s) => {
    await conn.query("UPDATE solicitacoes SET status='REJEITADO', motivo_rejeicao=?, permite_reajuste=?, avaliado_por_id=?, avaliado_em=NOW() WHERE id=?",
      [reason, allowReadjustment ? 1 : 0, req.user.id, s.id])
    await conn.query('INSERT INTO solicitacao_historico (solicitacao_id, status_anterior, status_novo, usuario_id, comentario) VALUES (?,?,?,?,?)',
      [s.id, s.status, 'REJEITADO', req.user.id, reason])
    return dto(s, 'Negada')
  })
}))

// ---------- Solicitante ----------
router.get('/mine', requireAuth, wrap(async (req, res) => {
  const rows = await query(
    `SELECT s.id, s.nome_evento, t.nome AS tema, s.data_evento, a.nome AS ambiente, s.status, s.atualizado_em,
            s.motivo_rejeicao, s.permite_reajuste
       FROM solicitacoes s
       LEFT JOIN temas t ON t.id = s.tema_id
       LEFT JOIN ambientes a ON a.id = s.ambiente_id
      WHERE s.autor_id = ? AND s.status <> 'CANCELADO'
      ORDER BY s.atualizado_em DESC`, [req.user.id])
  res.json(rows.map((r) => ({
    id: protocol(r.id), event: r.nome_evento || 'Sem título', theme: r.tema || '—', date: fmtDate(r.data_evento),
    location: r.ambiente || 'A definir', status: MY_LABEL[r.status], updatedAt: fmtDateTime(r.atualizado_em),
    rejectionReason: r.motivo_rejeicao || undefined, canResubmit: r.status === 'REJEITADO' ? !!r.permite_reajuste : undefined,
  })))
}))

// Rascunho/rejeitada é apagada; pendente/aprovada é cancelada (mantém histórico).
router.delete('/mine/:id', requireAuth, wrap(async (req, res) => {
  const id = parseId(req.params.id)
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [rows] = await conn.query('SELECT id, status, autor_id FROM solicitacoes WHERE id = ? FOR UPDATE', [id])
    const s = rows[0]
    if (!s || s.autor_id !== req.user.id) throw new AppError(404, 'Solicitação não encontrada.')
    if (s.status === 'CANCELADO') throw new AppError(409, 'Solicitação já cancelada.')
    if (s.status === 'RASCUNHO' || s.status === 'REJEITADO') {
      await conn.query('DELETE FROM solicitacoes WHERE id = ?', [id]) // historico cai em cascata
    } else {
      await conn.query("UPDATE solicitacoes SET status='CANCELADO', cancelado_por_id=?, cancelado_em=NOW(), motivo_cancelamento='Cancelada pelo solicitante' WHERE id=?", [req.user.id, id])
      await conn.query('INSERT INTO solicitacao_historico (solicitacao_id, status_anterior, status_novo, usuario_id, comentario) VALUES (?,?,?,?,?)',
        [id, s.status, 'CANCELADO', req.user.id, 'Cancelada pelo solicitante'])
    }
    await conn.commit()
    res.status(204).end()
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
}))

export default router
