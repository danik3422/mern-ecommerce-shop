# MERN E-Commerce Shop

Clothing store: React client (Vite) and Express + MongoDB API in one npm workspace.

The UI is a small custom design system: design tokens in `client/src/styles/tokens.css`,
CSS Modules for components and [lucide](https://lucide.dev) icons. It is responsive down to 320px.

## Project structure

```
.
├── client/                    # React app (Vite)
│   ├── index.html
│   └── src/
│       ├── api/               # HTTP layer: one module per resource
│       ├── auth/              # AuthProvider + useAuth (session in localStorage)
│       ├── cart/              # CartProvider, pure cart logic, pricing, useCartItems
│       ├── components/
│       │   ├── layout/        # Header (with mobile menu), Footer, page Layout
│       │   ├── ui/            # design system: Button, TextField, Select, Alert, ...
│       │   ├── product/ cart/ home/ auth/
│       ├── data/              # categories, navigation, filter options
│       ├── hooks/             # useProducts, useDocumentTitle
│       ├── pages/             # one component per route (AppRoutes.jsx)
│       ├── styles/            # tokens.css (colors, spacing, type) + global.css
│       └── utils/
│   └── public/images/         # product and site photos (licenses in CREDITS.md)
├── server/                    # Express API
│   ├── src/
│   │   ├── app.js             # builds the Express app (used by tests)
│   │   ├── server.js          # connects to MongoDB, starts HTTP, graceful shutdown
│   │   ├── config/            # validated environment, database connection
│   │   ├── routes/            # URL → middleware → controller
│   │   ├── controllers/       # request handlers
│   │   ├── services/          # business logic: pricing, line items, tokens, passwords
│   │   ├── validation/        # zod schemas for every request
│   │   ├── middleware/        # auth, validation, rate limit, error handling
│   │   ├── models/            # Mongoose models
│   │   └── utils/
│   ├── scripts/seed.js
│   └── tests/                 # API tests (supertest + in-memory MongoDB)
├── docker-compose.yml         # local MongoDB
└── .github/workflows/ci.yml   # lint, format, tests, build
```

## Getting started

Requirements: Node.js 22.12+ (see `.nvmrc`) and Docker (or a MongoDB Atlas cluster).

```bash
npm install                                  # installs both workspaces
cp server/.env.example server/.env           # then set JWT_SECRET: openssl rand -hex 32
docker compose up -d                         # local MongoDB on port 27017
npm run seed                                 # demo products (replaces all products!)
npm run dev                                  # API on :8000, client on :3000
```

Open http://localhost:3000. In development the client calls `/api/...` and Vite proxies it
to the API. For production builds set `VITE_API_URL` (see `client/.env.example`), and on the
server set `CLIENT_URL` (CORS) and `TRUST_PROXY` if the API runs behind a proxy.

To get an admin account, run the seed with `SEED_ADMIN_PASSWORD=<password> npm run seed`
and sign in as `admin`.

## Scripts (run from the repository root)

| Command          | What it does                                   |
| ---------------- | ---------------------------------------------- |
| `npm run dev`    | API and client with hot reload                 |
| `npm test`       | all tests (server + client)                    |
| `npm run lint`   | ESLint                                         |
| `npm run format` | Prettier                                       |
| `npm run check`  | lint + format check + tests + build (as in CI) |
| `npm run build`  | production build of the client → `client/dist` |
| `npm start`      | API in production mode                         |
| `npm run seed`   | fill the database with demo products           |

## API

All routes are under `/api`. Protected routes need `Authorization: Bearer <accessToken>`.
Errors always look like `{ message, details? }`; `details` lists invalid fields.

| Method                | Route                                  | Access | Notes                                                                             |
| --------------------- | -------------------------------------- | ------ | --------------------------------------------------------------------------------- |
| GET                   | `/health`                              | public | 503 when the database is down                                                     |
| POST                  | `/auth/register`                       | public | rate limited                                                                      |
| POST                  | `/auth/login`                          | public | `{ login, password }`, login = username or email; rate limited                    |
| GET                   | `/products`                            | public | `category, color, size, ids, sort, page, limit` → `{ items, page, pages, total }` |
| GET                   | `/products/:id`                        | public |                                                                                   |
| POST / PATCH / DELETE | `/products[/:id]`                      | admin  |                                                                                   |
| GET / PUT / DELETE    | `/cart`                                | user   | the signed-in user's cart                                                         |
| POST                  | `/orders`                              | user   | prices and shipping are calculated on the server                                  |
| GET                   | `/orders/mine`                         | user   |                                                                                   |
| GET                   | `/orders`, `/orders/income`            | admin  |                                                                                   |
| PATCH                 | `/orders/:id/status`                   | admin  |                                                                                   |
| GET / PATCH / DELETE  | `/users/me`                            | user   | changing email/password needs `currentPassword`                                   |
| GET                   | `/users`, `/users/stats`, `/users/:id` | admin  |                                                                                   |
| PATCH / DELETE        | `/users/:id`                           | admin  | PATCH `{ isAdmin }`                                                               |

Deleting an account removes the user and their cart; orders are kept as business records.
