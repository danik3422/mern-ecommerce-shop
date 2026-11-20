# MERN E-Commerce Shop

Clothing store: React client (Vite) and Express + MongoDB API in one npm workspace.

## Features

- **Catalog:** search, filters by brand, size, color, price, sale and stock (counts per option),
  sorting, sale prices with discounts, galleries, related products, ratings.
- **Shopping:** stock per size (sold-out sizes are disabled, low stock is shown), quick add
  from product cards, a mini bag after adding, a bag synced with the account, checkout with
  saved addresses and Stripe payments, back-in-stock email alerts for sold-out sizes.
- **Finding things:** search suggestions with products and brands, recent searches, recently
  viewed products, full-screen image zoom and a size guide.
- **Account:** orders with status (pay or cancel pending ones), profile, address book, wishlist,
  reviews from verified buyers.
- **Languages and currency:** the shop is in English and Polish (switcher in the header and
  footer; the first visit follows the browser language), prices are in PLN. Translations live in
  `client/src/i18n/messages/{en,pl}`; the admin panel, emails and API errors stay English.
  The currency, free-shipping threshold and delivery methods are set in `server/src/config/shop.js`.
- **Admin panel** (`/admin`): dashboard with revenue chart and low stock, products with image
  upload and stock per size, orders with status changes, customers, review moderation.

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
│       ├── i18n/              # I18nProvider, useI18n, translator, en/pl messages
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
server set `CLIENT_URL` (CORS and Stripe redirect URLs) and `TRUST_PROXY` behind a proxy.

**Admin account:** set `SEED_ADMIN_PASSWORD` in `server/.env`, run `npm run seed` and sign in as
`admin`. The admin panel is at http://localhost:3000/admin.

**After pulling schema changes** run `npm run migrate`: it syncs database indexes with the
models (for example, it removes indexes left by older versions).

### Email (optional)

Back-in-stock alerts are sent by email. Set `SMTP_URL` (for example
`smtp://user:password@smtp.example.com:587`) and `MAIL_FROM` in `server/.env`; without them the
emails are written to the server log, which is enough for development.

### Payments (Stripe, optional)

Without Stripe keys everything works and orders stay "awaiting payment". To take test payments:

1. In the Stripe Dashboard (test mode) copy the secret key into `STRIPE_SECRET_KEY` in `server/.env`.
2. Forward webhooks locally with the Stripe CLI and copy the printed `whsec_...` secret into
   `STRIPE_WEBHOOK_SECRET`:
   `stripe listen --forward-to localhost:8000/api/payments/webhook`
3. Pay with the test card `4242 4242 4242 4242`, any future date and CVC.

In production create a webhook endpoint `https://<api-host>/api/payments/webhook` for the events
`checkout.session.completed`, `checkout.session.async_payment_succeeded` and
`checkout.session.expired`.

## Scripts (run from the repository root)

| Command           | What it does                                   |
| ----------------- | ---------------------------------------------- |
| `npm run dev`     | API and client with hot reload                 |
| `npm test`        | all tests (server + client)                    |
| `npm run lint`    | ESLint                                         |
| `npm run format`  | Prettier                                       |
| `npm run check`   | lint + format check + tests + build (as in CI) |
| `npm run build`   | production build of the client → `client/dist` |
| `npm start`       | API in production mode                         |
| `npm run seed`    | demo catalog, reviews and the admin user       |
| `npm run migrate` | sync database indexes with the models          |

## API

All routes are under `/api`. Protected routes need `Authorization: Bearer <accessToken>`.
Errors always look like `{ message, details? }`; `details` lists invalid fields.

| Method                      | Route                                                                | Access                           | Notes                                                                                     |
| --------------------------- | -------------------------------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------- |
| GET                         | `/health`                                                            | public                           | 503 when the database is down                                                             |
| POST                        | `/auth/register`                                                     | public                           | rate limited                                                                              |
| POST                        | `/auth/login`                                                        | public                           | `{ login, password }`, login = username or email; rate limited                            |
| GET                         | `/products`                                                          | public                           | `q, category, brand, color, size, minPrice, maxPrice, onSale, inStock, sort, page, limit` |
| GET                         | `/products/facets`                                                   | public                           | filter options with counts for a category or search                                       |
| GET                         | `/products/:idOrSlug`, `/:id/related`                                | public                           |                                                                                           |
| POST / PATCH / DELETE       | `/products[/:id]`                                                    | admin                            |                                                                                           |
| POST                        | `/products/:id/stock-alerts`                                         | public                           | `{ size, email? }` — email when a sold-out size is back; rate limited                     |
| GET / POST / DELETE         | `/products/:id/reviews[/:reviewId]`                                  | public / buyer / author or admin | one review per buyer                                                                      |
| GET / PUT / DELETE          | `/cart`                                                              | user                             | the signed-in user's bag                                                                  |
| POST                        | `/orders`                                                            | user                             | reserves stock, returns `{ order, checkoutUrl }`                                          |
| GET                         | `/orders/mine`, `/orders/:id`                                        | user                             |                                                                                           |
| POST                        | `/orders/:id/pay`, `/orders/:id/cancel`                              | user                             | new Stripe session / cancel a pending order (stock is returned)                           |
| PATCH                       | `/orders/:id/status`                                                 | admin                            | pending → paid → shipped → delivered, cancel from pending/paid                            |
| POST                        | `/payments/webhook`                                                  | Stripe                           | signature verified                                                                        |
| GET / PUT / DELETE          | `/account/wishlist[/:productId]`                                     | user                             |                                                                                           |
| GET / POST / PATCH / DELETE | `/account/addresses[/:id]`                                           | user                             | up to 10, one default                                                                     |
| GET / PATCH / DELETE        | `/users/me`                                                          | user                             | changing email/password needs `currentPassword`                                           |
| GET / PATCH / DELETE        | `/users[/:id]`                                                       | admin                            | PATCH `{ isAdmin }`                                                                       |
| GET                         | `/admin/stats`, `/admin/products`, `/admin/orders`, `/admin/reviews` | admin                            |                                                                                           |
| POST                        | `/admin/uploads`                                                     | admin                            | image upload (JPEG/PNG/WebP, ≤ 5 MB) → `{ url }`                                          |

Deleting an account removes the user, cart, wishlist and addresses; orders and reviews are kept.

The marketplace features were built in parallel workstreams — see `docs/WORKSTREAMS.md`.
