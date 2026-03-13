# CNote Project Structure

This repository is organized around a single frontend app and a single backend app.

## Main folders

- `frontend/` - all web app code (HTML/CSS/JS/assets)
- `backend/` - Node.js API server used locally and on Render
- `bibliografie/` - research and source material

## What runs in production

Render should run the backend from `backend/`.

At repository root, use:

```bash
npm start
```

Root scripts forward to `backend`:

- `npm run install:server`
- `npm run start:server`
- `npm run dev:server`

## Practical rule

- Edit backend logic only in `backend/`.
