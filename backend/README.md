# API – Agenda de Eventos (Node + Express + TiDB)

## 1. Banco (uma vez só)
1. Rode `schema.sql` no TiDB (já recria as tabelas — **apaga dados existentes**).
2. Crie um `.env` (copie `.env.example`) com as credenciais do `banco.env` + `JWT_SECRET`.
3. `npm install`
4. `npm run migrate` → adiciona as colunas que o front usa e o schema não tinha (`migrations/001_ajustes_front.sql`).
5. `npm run seed` → cursos, centros de custo, ambientes e 2 usuários (admin e solicitante). A senha é impressa no terminal.

## 2. Rodar local
`npm run dev` → http://localhost:3333/api/health

## 3. Deploy na Vercel
Projeto novo apontando para a pasta `backend/`. Em *Settings → Environment Variables* cadastre:
`DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE, JWT_SECRET, CORS_ORIGIN` (URL do front).

## Endpoints (`/api`)
| Método | Rota | Acesso |
|---|---|---|
| POST | /auth/login `{email,password}` → `{token,user}` | público |
| GET | /session/me | público (sem token = visitante) |
| GET | /events?month=YYYY-MM | público (visitante só vê eventos "abertos ao público") |
| GET | /events/form-options | logado |
| POST | /events/conflict | logado |
| POST | /events (`?draft=true` salva rascunho) | logado |
| GET | /requests?status=Pendente\|Aceita\|Negada | admin |
| POST | /requests/:id/approve · /reject `{reason,allowReadjustment}` | admin |
| GET | /requests/mine · DELETE /requests/mine/:id | logado (só as próprias) |
| GET/POST/DELETE | /users · /users/form-options | admin |
| GET/PATCH | /environments · /environments/options | admin |
| GET | /reports/filters · /reports/annual-events | admin |

Erros: `{ "message": "..." }` com status HTTP adequado (o front já exibe `message`).
