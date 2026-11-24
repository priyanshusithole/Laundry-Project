# Deploying to Vercel (frontend + API + MongoDB Atlas)

One Vercel project serves everything:
- `frontend/` is built by Vite into `frontend/dist` (static site)
- `api/index.js` exposes the Express app in `backend/` as a serverless function for `/api/*`
- Data lives in MongoDB Atlas, added from the Vercel Marketplace

## Steps
1. Push this repo to GitHub, then in Vercel choose **Add New > Project** and import it. Leave the root directory as the repo root; `vercel.json` already sets the build.
2. In the project, open **Storage > Create Database > MongoDB Atlas** (Marketplace) and connect it to the project. Vercel adds the connection string as an env var (usually `MONGODB_URI`; the API reads `MONGO_URI` or `MONGODB_URI`).
3. Add env var `JWT_SECRET` (long random string). Optionally `SEED_PASSWORD`.
4. Deploy (or redeploy so the new env vars apply).
5. Seed the database once from your machine:
   ```
   vercel env pull .env.production.local
   cd backend
   # PowerShell: copy the MONGODB_URI value, then
   $env:MONGO_URI="<value>"; npm run seed
   ```
   In Atlas, make sure Network Access allows your IP (the Vercel integration normally allows 0.0.0.0/0).
6. Open the site. Student sign-in: card ID `1077`, password `password123`. Staff: `EMP-9042`, same password.

`npm run seed` deletes all users and bags first, so only run it on a fresh database.

## Local development
`backend`: `npm run dev` (port 5000). `frontend`: `npm run dev` (port 5173; Vite proxies `/api` to the backend).
