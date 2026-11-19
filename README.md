# E-Commerce Shop

Clothing store built with the MERN stack: React (Create React App) on the frontend, Express + MongoDB on the backend.

## Project structure

```
.
├── public/            # static HTML, Netlify-style _redirects for SPA routing
├── src/               # React app
│   ├── api.js         # axios instance (base URL, auth header)
│   ├── context/       # AuthContext (login/register), CartContext (cart in localStorage)
│   ├── components/
│   └── pages/
├── server/            # Express API
│   ├── index.js
│   ├── middleware/    # JWT checks, async error wrapper
│   ├── models/
│   ├── routes/
│   └── seed.js        # demo products
└── docker-compose.yml # local MongoDB
```

## Getting started

Requirements: Node.js 18+, and MongoDB (Docker or a MongoDB Atlas cluster).

```bash
# 1. install dependencies
npm install
npm install --prefix server

# 2. configure the API
cp server/.env.example server/.env   # then edit MONGO_URL and JWT_SEC

# 3. start MongoDB locally (skip if you use Atlas)
docker compose up -d

# 4. load demo products (WARNING: replaces all products in the DB)
npm run seed

# 5. run API (port 8000) and frontend (port 3000) together
npm run dev
```

Open http://localhost:3000.

In development the frontend calls `/api/...`, and CRA proxies it to `http://localhost:8000`
(`proxy` in `package.json`). For a production build set `REACT_APP_API_URL`
(for example `https://api.example.com/api`) and set `CLIENT_URL` on the server for CORS.

> Port 5000 is not used on purpose: on macOS it is taken by the AirPlay Receiver.

## Scripts

| Command          | What it does                              |
| ---------------- | ----------------------------------------- |
| `npm run dev`    | API + frontend together                   |
| `npm start`      | frontend only                             |
| `npm run server` | API only (nodemon)                        |
| `npm run seed`   | fill the DB with demo products            |
| `npm run build`  | production build of the frontend          |

## API

All routes are prefixed with `/api`. Protected routes expect `Authorization: Bearer <token>`.

| Method | Route                     | Access        |
| ------ | ------------------------- | ------------- |
| POST   | `/auth/register`          | public        |
| POST   | `/auth/login`             | public (username or email) |
| GET    | `/products?category=&new=`| public        |
| GET    | `/products/find/:id`      | public        |
| POST/PUT/DELETE | `/products[/:id]`| admin         |
| GET/PUT/DELETE  | `/carts/.../:userId`| owner or admin |
| POST   | `/orders`                 | logged-in user (amount is calculated on the server) |
| GET    | `/orders/find/:userId`    | owner or admin |
| GET    | `/orders`, `/orders/income`, `/users`, `/users/stats` | admin |

To make a user an admin, set `isAdmin: true` on their document in MongoDB.
