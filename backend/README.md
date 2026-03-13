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
- `EMAIL_USER` (Gmail address used for Nodemailer)
- `EMAIL_PASS` (Gmail app password used for Nodemailer)
- `CONTACT_RECEIVER_EMAIL` (optional, defaults to console.notebook.app@gmail.com)

## Database

The backend uses Supabase Postgres through the standard `pg` driver.
Use the connection string from your Supabase project for `DATABASE_URL`.
