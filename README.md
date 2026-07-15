# Cnote Bakery — Console Notebook

**Cnote Bakery (Console Notebook)** is a web platform dedicated to the ecosystem of video game consoles.

The project aims to create a central hub where console enthusiasts, collectors, technicians and gamers can explore console history, compare hardware specifications, learn repair techniques and interact with a community passionate about gaming hardware.

Cnote Bakery focuses especially on the retro gaming world and aims to preserve and share knowledge about classic video game consoles.

---

## Project Status

This project is currently in **beta stage**.
Core features are implemented, but the platform is still under active development and improvements are being made continuously.

---

## Live Website

https://consolenotebook.com/
---

## Current Features

### Console Encyclopedia

A catalog of video game consoles including:

* hardware specifications
* console presentation
* advantages and disadvantages
* available in 6 languages (English, Spanish, French, Italian, German, Romanian)

---

### Console Comparison System

Users can compare consoles side-by-side to better understand hardware differences between gaming platforms.

---

### Console Repair Course

The platform includes a learning section focused on console repair and hardware understanding.

Features include:

* structured courses, modules and lessons (video, text, and quizzes)
* progress tracking per user
* comments and reactions on lessons
* XP, levels and an achievements system, with real-time unlock notifications

---

### Marketplace

A buy/sell marketplace for consoles, parts, and accessories:

* search, filter and sort listings
* sync listings from OLX and eBay via user-linked accounts
* favorite/save listings

---

### Community Hub

* discussion forum: threads, replies, and upvotes
* global community chat
* direct messages between users, with push notifications
* friends system (requests, accept/reject, friends list)
* console rating system
* in-app notifications for replies, DMs and marketplace activity

---

### Timeline

A short historical timeline showing important moments in the evolution of video game consoles.

---

### User System

The platform includes an authentication system with:

* user registration and login (email/password, Google OAuth)
* two-factor authentication (2FA)
* email verification and password reset
* session management with device/browser tracking
* personal, public user profiles

Users can customize their profiles with:

* profile picture (with an in-browser crop tool)
* personal bio

---

### Console Tracking

Users can manage their console collections:

* favorite consoles
* owned consoles
* console ratings

---

### Trust & Safety

* content reporting flow (notice-and-action, DSA Article 16 compliant)
* honeypot-protected contact form

---

### Contact Page

Users can send messages through a contact form available on the platform.

---

## Tech Stack

Frontend

* HTML, CSS, vanilla JavaScript (ES modules, no framework/bundler)
* Socket.io client (real-time achievement/notification toasts)
* DOMPurify (sanitized shared navbar/footer injection)
* KaTeX (math rendering in course lessons)

Backend

* Node.js, Express.js
* Socket.io (real-time notifications)
* Passport.js (Google OAuth 2.0)
* Multer + Sharp (avatar upload processing)
* Resend (transactional email)
* Firebase Admin / FCM (push notifications for direct messages)
* Sentry (error tracking, frontend + backend)

Database & Storage

* PostgreSQL (hosted on Supabase, raw `pg` driver — no ORM)
* Supabase Storage (avatar images)
* Self-hosted MinIO behind Caddy (chat image/voice attachments)

Hosting

* Railway (application hosting)
* Supabase (database + avatar storage)
* Self-hosted VPS (chat attachment storage)

---

## Environment Variables

The application is configured entirely through environment variables — see `backend/.env.example` for the full, documented list. Key groups:

* **Server** — `PORT`, `NODE_ENV`, `BASE_URL`, `FRONTEND_URL`, `API_BASE_URL`
* **Database** — `DATABASE_URL`
* **Auth** — `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
* **Supabase Storage** — `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
* **Chat attachment storage (MinIO)** — `OBJECT_STORAGE_ENDPOINT`, `OBJECT_STORAGE_PUBLIC_URL`, `OBJECT_STORAGE_REGION`, `OBJECT_STORAGE_BUCKET`, `OBJECT_STORAGE_ACCESS_KEY`, `OBJECT_STORAGE_SECRET_KEY`, `OBJECT_STORAGE_FORCE_PATH_STYLE`
* **Email** — `EMAIL_USER`, `EMAIL_PASS`, `RESEND_API_KEY`, `CONTACT_RECEIVER_EMAIL`, `ADMIN_EMAIL`
* **Marketplace sync** — `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET`, `EBAY_RU_NAME`, `EBAY_REDIRECT_URI`, `EBAY_VERIFICATION_TOKEN`, `EBAY_DELETION_ENDPOINT_URL`, `OLX_CLIENT_ID`, `OLX_CLIENT_SECRET`, `OLX_REDIRECT_URI`
* **Push notifications** — `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
* **Error tracking** — `SENTRY_DSN_BACKEND`, `SENTRY_DSN_FRONTEND`

---

## Version

Current version:

v0.1.0 (Beta)

---

## Roadmap

Planned improvements include:

* improved search
* advanced repair lessons
* modding tutorials
* dedicated gaming server

---

## License

This project is licensed under the MIT License.

---

## Author

Created by **Andrei Halcu**
GitHub: https://github.com/CNote-Hulk