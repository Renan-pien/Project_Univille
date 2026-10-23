export class AppError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const DIAS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']
const CORES = ['green', 'blue', 'amber', 'purple']

const parts = (d) => String(d).slice(0, 10).split('-').map(Number) // [y, m, d]

export const fmtDate = (d) => {
  if (!d) return 'A definir'
  const [y, m, day] = parts(d)
  return `${String(day).padStart(2, '0')} ${MESES[m - 1]} ${y}`
}
export const fmtDateTime = (dt) => {
  if (!dt) return ''
  const s = String(dt)
  return `${fmtDate(s)}, às ${s.slice(11, 16)}`
}
export const hhmm = (t) => (t ? String(t).slice(0, 5) : '')
export const fmtRange = (a, b) => (a && b ? `${hhmm(a)} — ${hhmm(b)}` : 'A definir')
export const weekday = (d) => { const [y, m, day] = parts(d); return DIAS[new Date(Date.UTC(y, m - 1, day)).getUTCDay()] }
export const monthShort = (d) => MESES[parts(d)[1] - 1].toUpperCase()
export const dayOf = (d) => String(parts(d)[2]).padStart(2, '0')
export const colorFor = (temaId) => CORES[Math.abs(Number(temaId) || 0) % CORES.length]

export const protocol = (id) => `#EV-${id}`
// aceita "#EV-12", "EV-12", "12", "env-3"
export const parseId = (raw) => {
  const n = Number(String(raw ?? '').replace(/\D/g, ''))
  if (!Number.isInteger(n) || n <= 0) throw new AppError(400, 'Identificador inválido.')
  return n
}
export const initials = (name) =>
  String(name).trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('')
