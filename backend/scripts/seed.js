// Uso: npm run seed  — dados iniciais (idempotente). Rode DEPOIS do schema.sql e do npm run migrate.
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import { pool, query } from '../src/db.js'

const pw = (v) => v || crypto.randomBytes(9).toString('base64url')
const adminPw = pw(process.env.SEED_ADMIN_PASSWORD)
const reqPw = pw(process.env.SEED_REQUESTER_PASSWORD)

const ccs = [['CC-3401', 'Engenharias'], ['CC-2150', 'Comunicação'], ['CC-4820', 'Saúde'], ['CC-2201', 'Ciências Jurídicas']]
for (const [codigo, nome] of ccs) await query('INSERT IGNORE INTO centros_custo (codigo, nome) VALUES (?,?)', [codigo, nome])

const cursos = [['Engenharia de Software', 'CC-3401'], ['Comunicação', 'CC-2150'], ['Medicina', 'CC-4820'], ['Direito', 'CC-2201']]
for (const [nome, cc] of cursos)
  await query('INSERT IGNORE INTO cursos (nome, centro_custo_id) SELECT ?, id FROM centros_custo WHERE codigo = ?', [nome, cc])

for (const t of ['Sustentabilidade e inovação', 'Tecnologia e sociedade', 'Mercado de trabalho', 'Ciência e comunidade'])
  await query('INSERT IGNORE INTO temas (nome) VALUES (?)', [t])

const ambientes = [
  ['Auditório Bloco A', 240, 'Bloco A · Piso térreo', 'Auditório', 1, 0],
  ['Sala B-201', 60, 'Bloco B · 2.º piso', 'Sala de aula', 1, 0],
  ['Centro de Eventos', 400, 'Área central', 'Auditório', 1, 1],
  ['Laboratório Maker', 35, 'Bloco D · Piso térreo', 'Laboratório', 1, 0],
]
for (const [nome, cap, loc, tipo, acc, ext] of ambientes)
  await query('INSERT IGNORE INTO ambientes (nome, capacidade, localizacao, tipo, acessivel, eventos_externos) VALUES (?,?,?,?,?,?)', [nome, cap, loc, tipo, acc, ext])

const users = [
  ['Rafael Martins', 'rafael@univille.br', 'ADMINISTRADOR', 'Administração', adminPw],
  ['Carla Moretti', 'carla@univille.br', 'SOLICITANTE', 'Engenharia de Software', reqPw],
]
for (const [nome, email, perfil, coord, senha] of users)
  await query('INSERT IGNORE INTO usuarios (nome_completo, email, senha_hash, perfil, coordenacao) VALUES (?,?,?,?,?)', [nome, email, await bcrypt.hash(senha, 10), perfil, coord])

console.log('Seed concluído.')
console.log('Admin:      rafael@univille.br /', adminPw, '(só vale se o usuário ainda não existia)')
console.log('Solicitante: carla@univille.br /', reqPw, '(só vale se o usuário ainda não existia)')
await pool.end()
