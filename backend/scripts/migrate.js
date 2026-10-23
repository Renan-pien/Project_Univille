// Uso: npm run migrate   (aplica migrations/*.sql; ignora "coluna já existe")
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { pool } from '../src/db.js'

const dir = path.resolve('migrations')
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
  const stmts = fs.readFileSync(path.join(dir, file), 'utf8').split('\n').filter((l) => !l.trim().startsWith('--')).join('\n').split(';').map((s) => s.trim()).filter(Boolean)
  for (const sql of stmts) {
    try { await pool.query(sql); console.log('ok   ', sql.slice(0, 70)) } catch (e) {
      if (e.errno === 1060) console.log('skip ', sql.slice(0, 70)); else { console.error('ERRO ', sql, e.message); process.exit(1) }
    }
  }
}
await pool.end()
