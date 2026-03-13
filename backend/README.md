# Console Notebook Backend

## Setup

```bash
cd backend
npm install
```

## Run

```bash
npm start
```

Server runs on http://localhost:3000 and serves both API routes and frontend static files.

## Environment

Copy `.env.example` to `.env` and configure required values:

- `NODE_ENV`
- `FRONTEND_URL`
- `BASE_URL`
- `DATABASE_URL` - Supabase Postgres connection string
- `JWT_SECRET`
- `RESEND_API_KEY` (optional for email sending)

## Database

The backend uses Supabase Postgres through the standard `pg` driver.
Use the connection string from your Supabase project for `DATABASE_URL`.
