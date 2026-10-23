import 'dotenv/config'
import mysql from 'mysql2/promise'

// Pool reaproveitado entre invocações serverless (fica no escopo do módulo).
export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 4000),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE || 'agenda_eventos',
  ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }, // TiDB Cloud exige TLS
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL || 5),
  dateStrings: true, // DATE/TIME/DATETIME chegam como string, sem surpresa de fuso
  charset: 'utf8mb4',
})

export async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params)
  return rows
}
