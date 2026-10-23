import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { AppError } from './utils.js'
import { query } from './db.js'
import authRoutes from './routes/auth.js'
import eventsRoutes from './routes/events.js'
import requestsRoutes from './routes/requests.js'
import usersRoutes from './routes/users.js'
import environmentsRoutes from './routes/environments.js'
import reportsRoutes from './routes/reports.js'

const app = express()
const origins = (process.env.CORS_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean)

app.disable('x-powered-by')
app.use(helmet())
app.use(cors({ origin: origins.length ? origins : true, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] }))
app.use(express.json({ limit: '100kb' }))

app.get('/api/health', async (_req, res) => {
  try { await query('SELECT 1'); res.json({ ok: true, db: true }) } catch { res.status(503).json({ ok: false, db: false }) }
})

app.use('/api', authRoutes)
app.use('/api/events', eventsRoutes)
app.use('/api/requests', requestsRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/environments', environmentsRoutes)
app.use('/api/reports', reportsRoutes)

app.use((_req, _res, next) => next(new AppError(404, 'Rota não encontrada.')))

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err?.name === 'ZodError') {
    const first = err.issues?.[0]
    return res.status(400).json({ message: first ? `${first.path.join('.') || 'corpo'}: ${first.message}` : 'Dados inválidos.' })
  }
  if (err instanceof AppError) return res.status(err.status).json({ message: err.message })
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ message: 'JSON inválido.' })
  console.error(err)
  res.status(500).json({ message: 'Erro interno do servidor.' })
})

export default app
