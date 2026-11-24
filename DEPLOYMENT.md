# Deploying to Vercel (frontend + API + Neon Postgres)

One Vercel project serves everything:
- `frontend/` is built by Vite into `frontend/dist` (static site)
- `api/index.js` exposes the Express app in `backend/` as a serverless function for `/api/*`
- Data lives in Neon Postgres, added from the Vercel Marketplace (tables are created automatically on first request)

## Steps (CLI)
1. `vercel login`, then create/link a project (`vercel project create hostel-laundry-system`, `vercel link`).
2. Add the database: `vercel integration add neon --name hostel-laundry-db` (accept Neon's terms in the browser once).
   This sets `DATABASE_URL` and the other `POSTGRES_*` env vars on the project.
3. Add a secret: `vercel env add JWT_SECRET production --sensitive` (long random string).
4. Seed once from your machine:
   ```
   vercel env pull .env.production.local --environment production
   # set DATABASE_URL from that file in your shell, then:
   cd backend && npm run seed
   ```
5. `vercel deploy --prod`

`npm run seed` truncates all users and bags first, so only run it on a fresh database.

Seeded logins (password `password123`, or `SEED_PASSWORD`): student card ID `1077`, staff `EMP-9042`.

## Local development
Start Postgres: `docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=hostel_laundry postgres:16`
`backend`: `npm run seed` then `npm run dev` (port 5000). `frontend`: `npm run dev` (port 5173; Vite proxies `/api` to the backend).

Staff self-registration: set the STAFF_SIGNUP_CODE env var; staff enter it as the 'Staff Access Code' when creating an admin account. If unset, staff signup is disabled.
