# Freelio — a full-stack freelance marketplace

A freelance job-board style platform (inspired by the GeezJobs layout, rebuilt with its own
identity — no career guide, no CV search). Built with **React + Vite** on the front end and
**Node.js + Express + MySQL** on the back end.

## Features

- Clients post projects with **job type** (part-time / full-time / contract) and **work mode**
  (remote / on-site / hybrid), budget, category, experience level and skills.
- Freelancers browse and filter projects, save favorites, and submit proposals.
- **Featured freelancers** and **featured projects** sections (toggled from the admin panel).
- Client dashboard: manage projects, review and accept/reject applicants.
- Freelancer dashboard: track applications, manage saved projects, edit profile.
- Reviews: clients can rate a freelancer after accepting their application on a project.
- Admin panel: site-wide stats, feature/unfeature projects and freelancers, manage users.
- JWT auth in httpOnly cookies, bcrypt password hashing, input validation with Zod.

## Tech stack

- **Frontend:** React 18, React Router, Vite, plain CSS (no framework, custom design tokens)
- **Backend:** Node.js, Express, MySQL (mysql2), JWT, bcryptjs, Zod
- **Database:** MySQL 8+

## Project structure

```
freelio/
  server/        Express API
    src/
      routes/    auth, projects, applications, saved, freelancers, clients, admin, meta
      middleware/auth.js, validate.js
      db.js, constants.js, utils.js, setup.js, index.js
    schema.sql
  client/        React app (Vite)
    src/
      pages/, pages/dashboard/, components/, context/, api/
```

## Getting started

### 1. Prerequisites
- Node.js 18+
- A running MySQL server (local install, XAMPP/MAMP, or Docker)

### 2. Install dependencies
```bash
npm run install:all
```
This installs the root, `server` and `client` dependencies.

### 3. Configure the database
```bash
cd server
cp .env.example .env
```
Edit `.env` and set `DB_USER`, `DB_PASSWORD`, etc. to match your local MySQL setup.
Then generate a real `JWT_SECRET` (any long random string works).

### 4. Create the database and load demo data
From the project root:
```bash
npm run db:setup
```
This creates the `freelio` database, all tables, and — only if the database is empty —
seeds it with demo clients, freelancers, projects and applications so the site isn't empty
on first run.

To wipe and reseed at any point:
```bash
npm run db:reset
```

**Demo accounts** (created by the seed):
| Role | Email | Password |
|---|---|---|
| Admin | admin@freelio.dev | Admin123! |
| Client | rahel@sheba-coffee.example | Client123! |
| Freelancer | hana@freelio.example | Freelancer123! |

(Every seeded freelancer's email is `firstname@freelio.example`, password `Freelancer123!`.
Every seeded client's password is `Client123!`.)

### 5. Run it
From the project root:
```bash
npm run dev
```
This starts the API on **http://localhost:5000** and the React app on
**http://localhost:5173** (with API calls proxied automatically). Open the Vite URL in
your browser.

### 6. Build for production
```bash
npm run build     # builds the React app into client/dist
npm start         # starts the Express server, which also serves client/dist
```
Set `COOKIE_SECURE=true` in `.env` once you're serving over HTTPS.

## Deploying to Vercel

The repo is set up to deploy as a single Vercel project: the React app builds as a static
site and the Express API runs as a serverless function under `/api`, both on one domain
(so cookies work with no CORS complications). This is driven by `vercel.json`,
`server/src/app.js` (the Express app with no `app.listen`, reused by both the serverless
function and local dev) and `api/index.js` (the serverless entry point).

**1. Get a hosted MySQL database.** Vercel's serverless functions can't talk to a MySQL
server on your laptop. Use a hosted MySQL — e.g. Railway, Aiven, or TiDB Cloud all have
free/cheap tiers. Load `server/schema.sql` (and optionally run the seed via
`node server/src/setup.js` pointed at that database) to set it up.

**2. Import the project into Vercel** (New Project → import this repo). Leave the root
directory as the repo root — `vercel.json` handles the client/api split.

**3. Set these environment variables** in the Vercel project settings:

| Variable | Value |
|---|---|
| `DB_HOST` | your hosted MySQL host |
| `DB_PORT` | usually `3306` |
| `DB_USER` / `DB_PASSWORD` | your DB credentials |
| `DB_NAME` | `freelio` (or whatever you named it) |
| `JWT_SECRET` | a long random string |
| `JWT_EXPIRES_IN` | `7d` |
| `COOKIE_SECURE` | `true` |
| `CLIENT_URL` | your Vercel deployment URL (e.g. `https://freelio.vercel.app`) |

**4. Deploy.** Vercel builds `client/` with Vite and deploys `api/index.js` as a
serverless function; `vercel.json` routes `/api/*` to it and everything else to the
built React app, with SPA fallback so client-side routes work on refresh.

A couple of things worth knowing about this setup:
- Each serverless invocation is a fresh process, so the `mysql2` pool in `server/src/db.js`
  reconnects often; if you see connection-limit errors on a free-tier DB, lower
  `connectionLimit` in `db.js` to something small (e.g. `2`).
- If you'd rather not run the API on Vercel at all, you can instead deploy `client/` to
  Vercel on its own and the `server/` folder to a plain Node host (Railway, Render, Fly.io)
  — just point `CLIENT_URL`/your Vercel rewrites at that server's URL and keep
  `COOKIE_SECURE=true` with `sameSite: 'none'` in `server/src/middleware/auth.js` since the
  two would then be on different domains.

## Notes on extending it

- Add real image uploads (avatars, project attachments) with `multer` + S3/Cloudinary.
- Add email notifications (e.g. with `nodemailer`) on new applications / status changes.
- Add a messaging thread between client and freelancer per application.
- The `is_featured` flags on `projects` and `freelancer_profiles` are toggled from
  `/admin` — extend that panel however you like (e.g. auto-feature based on rating).
