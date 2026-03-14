# ConsoleHub — CNote Community Platform

A dark-themed, real-time community platform for gaming console enthusiasts. Built with React, Node.js, Socket.io, and MongoDB.

## Features

- **Real-time Chat** — Discord-style channels with typing indicators, role badges, and date dividers
- **Console Forums** — Categorized discussion boards (PlayStation, Xbox, Nintendo, PC Gaming, Retro) with tags, upvotes, and threaded replies
- **Repair Wizard** — AI-powered diagnostic tool (OpenAI) with severity analysis, cost estimates, and repair submission
- **Marketplace** — Buy/sell listings with search, filters, image gallery, condition badges, and OLX integration
- **Direct Messages** — Real-time private messaging with conversation list and unread counters
- **Notifications** — Bell dropdown for forum replies, DMs, upvotes, and repair updates
- **Trust Badges** — Verified repairer, trusted seller, and restored console badges
- **Mobile Responsive** — Bottom tab bar on mobile, adaptive layouts

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Tailwind CSS 3.4, Vite 5 |
| Backend | Node.js, Express, Socket.io 4.7 |
| Database | MongoDB with Mongoose 8 |
| Auth | JWT (30-day tokens), bcrypt |
| AI | OpenAI API (repair diagnostics) |
| Images | Cloudinary (optional) |

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### 1. Server

```bash
cd server
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secret, OpenAI key
npm install
npm run dev
```

### 2. Client

```bash
cd client
npm install
npm run dev
```

The client runs on `http://localhost:3001` and proxies API/socket requests to `http://localhost:4000`.

## Environment Variables

Create `server/.env`:

```
MONGO_URI=mongodb://localhost:27017/consolehub
JWT_SECRET=your-secret-key
OPENAI_API_KEY=sk-... (optional, enables AI repair diagnosis)
CLOUDINARY_CLOUD_NAME=... (optional)
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

## Project Structure

```
consolehub/
├── server/
│   ├── server.js          # Express + Socket.io entry
│   ├── middleware/auth.js  # JWT authentication
│   ├── models/            # Mongoose schemas (7 models)
│   └── routes/            # REST endpoints (6 route files)
└── client/
    └── src/
        ├── api.js              # API helper
        ├── context/            # Auth + Socket contexts
        ├── App.jsx             # SPA shell with view routing
        └── components/         # 14 React components
```

## Design System

- **Theme**: Dark navy (#0d0e14 → #22253a)
- **Accent**: #5b73ff
- **Console Colors**: PlayStation blue, Xbox green, Nintendo red, PC purple
- **Fonts**: Exo 2 (headings), JetBrains Mono (timestamps)
- **Animations**: fadeSlide, slideRight, scaleIn
