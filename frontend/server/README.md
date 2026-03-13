# Console Notebook â€” Backend Server

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later

## Setup

```bash
cd server
npm install
```

## Running

```bash
npm start
```

The server starts at **http://localhost:3000** and serves both the API and the static frontend.

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable    | Description                        | Default                   |
| ----------- | ---------------------------------- | ------------------------- |
| `PORT`      | Server port                        | `3000`                    |
| `BASE_URL`  | Public URL for email links         | `http://localhost:3000`   |
| `SMTP_HOST` | SMTP server host                   | _(dev: logs to console)_  |
| `SMTP_PORT` | SMTP server port                   | `587`                     |
| `SMTP_USER` | SMTP username                      | â€”                         |
| `SMTP_PASS` | SMTP password                      | â€”                         |
| `SMTP_FROM` | Sender email address               | `Console Notebook <console.notebook.app@gmail.com>` |

If SMTP is not configured, all emails are printed to the server console (dev mode).

## API Endpoints

### Authentication

| Method | Endpoint                 | Description                       |
| ------ | ------------------------ | --------------------------------- |
| POST   | `/api/register`          | Register a new user               |
| POST   | `/api/login`             | Login (creates session)           |
| POST   | `/api/logout`            | Logout (invalidates session)      |
| GET    | `/api/me`                | Get current user info             |
| PUT    | `/api/me`                | Update profile (username/bio/avatar) |
| PUT    | `/api/me/email`          | Change email (requires password)  |
| PUT    | `/api/me/password`       | Change password                   |

### Email Verification

| Method | Endpoint                  | Description                      |
| ------ | ------------------------- | -------------------------------- |
| GET    | `/api/verify-email?token=` | Verify email with token         |
| POST   | `/api/resend-verification` | Resend verification email       |

### Password Reset

| Method | Endpoint                | Description                        |
| ------ | ----------------------- | ---------------------------------- |
| POST   | `/api/request-reset`    | Request password reset email       |
| POST   | `/api/reset-password`   | Reset password with token          |

### Session Management

| Method | Endpoint              | Description                          |
| ------ | --------------------- | ------------------------------------ |
| GET    | `/api/sessions`       | List active sessions                 |
| DELETE | `/api/sessions/:id`   | Terminate a specific session         |
| DELETE | `/api/sessions`       | Terminate all sessions except current |

## Database

SQLite database is automatically created at `server/data/console_notebook.db` on first run.

### Tables

- `users` â€” User accounts with email verification status
- `email_verification_tokens` â€” Email verification tokens (24h expiry)
- `password_reset_tokens` â€” Password reset tokens (24h expiry)
- `user_sessions` â€” Login sessions with device/browser/IP tracking

## Security

- Passwords hashed with **bcrypt** (12 rounds)
- Session tokens: **256-bit** cryptographically random (crypto.randomBytes)
- Tokens expire after **24 hours**
- Login blocked until email is verified
- Session cookies are **httpOnly** with **SameSite=Lax**
- All sessions invalidated on password reset
- Email enumeration prevented on reset/resend endpoints


