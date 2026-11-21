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
  reviews from verified buyers, and **Security**: the list of signed-in devices with "sign out
  this device" / "sign out all other devices" (see [Security](#security)).
- **Languages and currency:** the shop is in English and Polish (switcher in the header and
  footer; the first visit follows the browser language), prices are in PLN. Translations live in
  `client/src/i18n/messages/{en,pl}`; the admin panel, emails and API errors stay English.
  The currency, free-shipping threshold and delivery methods are set in `server/src/config/shop.js`.
- **Order tracking and invoices:** every order has a page (`/account/orders/:id`, and the
  checkout result page for guests) with a status timeline (placed → paid → shipped → delivered,
  cancellation and returns), the parcel's carrier and tracking link, and an estimated delivery
  window (shipping method's working days from shipping, or from payment + 1 day; weekends
  skipped). Paid orders get a VAT invoice numbered `FV/YYYY/MM/NNNN` (per month, from an atomic
  counter) with net / 23% VAT / gross per line computed from the gross prices. The seller's company
  data (name, address, NIP with checksum validation, bank account) is set in Admin → Settings →
  Company. The invoice is an A4 print page (`/orders/:id/invoice`): **Download PDF** opens the
  browser's print dialog ("Save as PDF"). This needs no PDF library, keeps the text selectable
  and renders Polish characters with the page's own font.
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
│       ├── auth/              # AuthProvider + useAuth (in-memory token, cookie refresh)
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

### Public demo (optional)

For a public deployment set `DEMO_MODE=true` in `server/.env`:

- the sign-in page offers one-click **demo customer** (orders, addresses and a wishlist
  already there) and **demo admin** (staff with access to the dashboard, analytics, products, orders,
  returns and reviews only — no team, settings, customers or promo codes);
- demo accounts cannot change their username, email or password, or be deleted;
- every night at `DEMO_RESET_HOUR` (default 3:00, `DEMO_TIMEZONE` Europe/Warsaw) all shop data
  is reset to the demo state: catalog, reviews, orders, promo codes and settings; accounts
  created by visitors are removed, the owner `admin` stays.

The demo data is created on the first start in demo mode, or any time with `npm run seed:demo`.

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

## Deploy (Render + MongoDB Atlas, free)

In production the API also serves the built storefront, so the whole shop runs as **one web
service on one address** (the session cookie stays first-party, no CORS setup needed).

1. **MongoDB Atlas** — create a free M0 cluster (e.g. Frankfurt), a database user, allow access
   from `0.0.0.0/0` (Render's free plan has no fixed IPs) and copy the connection string,
   adding the database name: `mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/shop`.
2. **Render** — New → Blueprint → choose this repository. `render.yaml` sets up the service;
   enter `MONGO_URL` and `SEED_ADMIN_PASSWORD` when asked. `JWT_SECRET` is generated.
3. The first start creates the owner account `admin` and, with `DEMO_MODE=true`, the demo data.
   The public URL (`RENDER_EXTERNAL_URL`) is used automatically; set `CLIENT_URL` only for a
   custom domain (e.g. `https://shop.example.com`, added under Settings → Custom Domains).
4. Optional: Stripe test keys (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, webhook URL
   `https://YOUR-APP.onrender.com/api/payments/webhook`) and `SMTP_URL` for emails.

Free plan notes: the service sleeps after 15 minutes without visitors (the first request then
takes ~30–60 s) and its disk is temporary, so images uploaded in the admin panel disappear on
restarts — fine for the demo, which resets every night anyway (a missed nightly reset runs
when the service wakes up).

## Security

### Sessions: in-memory access token + rotating refresh token in an httpOnly cookie

| Token         | Where it lives                                                                    | Lifetime                         | What it is                                                    |
| ------------- | --------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------- |
| Access token  | JSON response → **JavaScript memory only** (`client/src/api/client.js`)           | `ACCESS_TOKEN_TTL` (15 min)      | JWT with the user id (`sub`) and the session id (`sid`)       |
| Refresh token | **httpOnly cookie** `refreshToken`, `Path=/api/auth`, SameSite=Lax, Secure (prod) | `SESSION_TTL_DAYS` (30, sliding) | opaque `<sessionId>.<256-bit random>`, stored only as SHA-256 |

**Why.** A token in `localStorage` can be read by any script that ends up on the page (one XSS
bug or a compromised npm package is enough) and sent anywhere — it stays valid for days. Now:

- the refresh token is in an **httpOnly** cookie: scripts cannot read it at all, and because of
  `Path=/api/auth` the browser sends it only to the auth endpoints, not with every request;
- the access token is kept **in memory** and expires after 15 minutes. After a reload the app
  calls `POST /api/auth/refresh` once to get a new one (protected pages show a short loading
  state meanwhile, nothing else waits). Shortly before it expires it is refreshed in the
  background; a request that still gets 401 triggers **one** refresh (single-flight: parallel
  failures share it, and requests sent during it wait) and is retried;
- only a non-secret flag `signedIn` is kept in `localStorage`, so anonymous visitors cause no
  refresh call; the old `session` key (token included) is deleted on start;
- signing out in one tab signs out the others (`BroadcastChannel`); signing in is picked up too.

Honest limit: an XSS bug can still send requests _while the page is open_ — no storage choice
prevents that (only a strict CSP and escaping do). What this design prevents is stealing a
long-lived credential to use later from elsewhere, and a stolen refresh token is caught by
reuse detection.

**Rotation and reuse detection** (`server/src/services/sessions.js`). Every refresh issues a
new refresh token and invalidates the previous one (an atomic compare-and-swap on the stored
hash, so two parallel refreshes can never both win). The session id is part of the token, so an
old token is still recognised: if a token that was already rotated is presented again, two
parties hold copies of it — one of them stole it — and the **whole session is revoked**; both
must sign in again. Exception: two tabs refreshing at the same moment. The loser of the race
(same previous token within 20 s) gets an access token but no new cookie, instead of being
taken for a thief.

**Revocation takes effect immediately.** `requireAuth` checks on every request, in parallel with
loading the user (two lookups by `_id`), that the token's session still exists, is not revoked
and not expired. So "sign out this device" or blocking an account does not wait 15 minutes for
the access token to expire. Sessions end:

| Event                                                   | Sessions revoked            |
| ------------------------------------------------------- | --------------------------- |
| Sign out                                                | this one                    |
| Account → Security → sign out a device / all other ones | that one / all but this one |
| Password change (`PATCH /users/me` with `newPassword`)  | all but the current one     |
| Customer blocked, or "Sign out everywhere" in the admin | all                         |
| Staff deactivated, password reset or removed (Team)     | all                         |
| Account deleted                                         | all                         |
| Refresh token reused                                    | that session                |

Expired sessions are deleted by a MongoDB TTL index; revoked ones are kept until then, so reuse
of their tokens is still recognised. The "Active sessions" list shows browser and system (parsed
from the User-Agent), the IP masked to `83.24.x.x` (the full IP never leaves the server; behind a
proxy set `TRUST_PROXY` so it is the visitor's IP) and the last activity.

**Shared demo accounts.** Many visitors use `demo` / `demo-admin` at once. Each sign-in gets its
own session, so one visitor signing out never affects another. A demo visitor sees only their
own session and cannot sign out others (the API answers 403, the UI hides the actions) — the
list would otherwise expose other visitors' devices and let anyone sign everyone out.

### CSRF

The API itself is not exposed to CSRF: it authenticates with the `Authorization` header, which
another site cannot make a browser send. The refresh cookie is the only thing a browser attaches
automatically, and it is used by just two endpoints — `POST /auth/refresh` and `POST /auth/logout`
— which are protected twice:

1. **SameSite=Lax** — browsers do not send the cookie with cross-site POST requests;
2. **Origin check** (`server/src/middleware/trustedOrigin.js`) — browsers state the page that
   started a POST in the `Origin` header (older ones in `Referer`), which scripts cannot forge.
   It must be one of `CLIENT_URL` or the API's own address (the production setup, where the API
   serves the shop); requests without either header are refused. In development any
   `localhost` port is accepted, so several dev stacks can run side by side.

Sign-in endpoints set the cookie, so they reject a foreign `Origin` as well (login CSRF: a
third-party page must not sign a visitor in to the attacker's account). A per-session CSRF token
was not needed: with only two cookie endpoints the Origin check gives the same protection
without storing extra secrets.

### Other measures

- **Passwords:** bcrypt with 12 rounds; the hash is never selected by default nor returned.
  Changing the email or password needs the current password. Login answers the same 401 for an
  unknown user and a wrong password; "blocked" is told only after the right password.
- **Rate limits:** failed sign-in/register attempts per IP (`AUTH_RATE_LIMIT`, default 10 per
  15 min); failed refreshes 3× that.
- **Permissions:** staff roles with per-area permissions, checked on the server for every
  request from the database (changes apply without a new sign-in); owners only can manage
  owners; non-owners cannot grant what they do not have; the last owner is protected.
- **Input:** every request body/query/params is validated with zod (strict objects, so
  `{ "$gt": "" }`-style query injection and unknown fields are rejected).
- **Headers:** helmet; CORS limited to `CLIENT_URL`.

### Production settings

The recommended setup — the API serves the built shop (see [Deploy](#deploy-render--mongodb-atlas-free))
— is same-origin, so the defaults are right: `COOKIE_SAMESITE=lax`, `COOKIE_SECURE=auto`
(Secure because `NODE_ENV=production`, so HTTPS is required), no `COOKIE_DOMAIN`. Set
`TRUST_PROXY=1` behind Render/Heroku/nginx so IPs, rate limits and `https` detection are right.

Optional, if the shop and the API are ever served separately:

- **subdomains of one site** (`shop.example.com` + `api.example.com`): same-site, so `lax`
  still works; set `CLIENT_URL=https://shop.example.com` and `VITE_API_URL` for the client build.
- **different sites** (e.g. `shop.vercel.app` + `api.onrender.com`): the cookie is third-party,
  so set `COOKIE_SAMESITE=none` and `COOKIE_SECURE=true` (the server refuses `none` without
  Secure), list the client in `CLIENT_URL` (CORS answers with `credentials: true`; the client
  sends auth calls `withCredentials`). Browsers that block third-party cookies (Safari, Firefox
  strict mode) will then lose the session on reload — prefer one domain.

## Scripts (run from the repository root)

| Command             | What it does                                                                |
| ------------------- | --------------------------------------------------------------------------- |
| `npm run dev`       | API and client with hot reload                                              |
| `npm test`          | all tests (server + client)                                                 |
| `npm run lint`      | ESLint                                                                      |
| `npm run format`    | Prettier                                                                    |
| `npm run check`     | lint + format check + tests + build (as in CI)                              |
| `npm run build`     | production build of the client → `client/dist`                              |
| `npm start`         | API in production mode                                                      |
| `npm run seed`      | demo catalog, reviews and the admin user                                    |
| `npm run seed:demo` | the full public demo: demo accounts, orders, promo codes (resets all data!) |
| `npm run migrate`   | sync database indexes with the models                                       |

## API

All routes are under `/api`. Protected routes need `Authorization: Bearer <accessToken>`
(the access token from sign-in or refresh; see [Security](#security)).
Errors always look like `{ message, details? }`; `details` lists invalid fields.

| Method                      | Route                                                                | Access                           | Notes                                                                                     |
| --------------------------- | -------------------------------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------- |
| GET                         | `/health`                                                            | public                           | 503 when the database is down                                                             |
| POST                        | `/auth/register`                                                     | public                           | rate limited                                                                              |
| POST                        | `/auth/login`                                                        | public                           | `{ login, password }`, login = username or email; rate limited                            |
| POST                        | `/auth/demo`                                                         | public                           | demo mode only: `{ account: customer \| admin }`                                          |
| POST                        | `/auth/refresh`                                                      | refresh cookie + own Origin      | rotates the cookie → `{ user, accessToken, expiresIn }`                                   |
| POST                        | `/auth/logout`                                                       | refresh cookie + own Origin      | revokes this session, clears the cookie                                                   |
| GET                         | `/auth/sessions`                                                     | user                             | active sessions, `current: true` for this one                                             |
| DELETE                      | `/auth/sessions/:id`                                                 | user                             | sign out one device                                                                       |
| POST                        | `/auth/sessions/revoke-others`                                       | user                             | sign out all other devices → `{ revoked }`                                                |
| POST                        | `/admin/customers/:id/sessions/revoke`                               | customers permission             | sign a customer out everywhere                                                            |
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
| GET                         | `/orders/:id/invoice`                                                | user / guest token / staff       | invoice data; 404 until the order is paid                                                 |
| PATCH                       | `/admin/orders/:id/tracking`                                         | staff (orders)                   | `{ carrier, number, url? }` for shipped orders; also accepted with status `shipped`       |
| POST                        | `/payments/webhook`                                                  | Stripe                           | signature verified                                                                        |
| GET / PUT / DELETE          | `/account/wishlist[/:productId]`                                     | user                             |                                                                                           |
| GET / POST / PATCH / DELETE | `/account/addresses[/:id]`                                           | user                             | up to 10, one default                                                                     |
| GET / PATCH / DELETE        | `/users/me`                                                          | user                             | changing email/password needs `currentPassword`                                           |
| GET / PATCH / DELETE        | `/users[/:id]`                                                       | admin                            | PATCH `{ isAdmin }`                                                                       |
| GET                         | `/admin/stats`, `/admin/products`, `/admin/orders`, `/admin/reviews` | admin                            |                                                                                           |
| POST                        | `/admin/uploads`                                                     | admin                            | image upload (JPEG/PNG/WebP, ≤ 5 MB) → `{ url }`                                          |

Deleting an account removes the user, cart, wishlist and addresses; orders and reviews are kept.

The marketplace features were built in parallel workstreams — see `docs/WORKSTREAMS.md`.
