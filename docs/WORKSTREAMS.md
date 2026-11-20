# Marketplace workstreams

The marketplace release is built by four parallel workstreams on top of a shared foundation
(commit "feat: marketplace foundation"). Each workstream owns a set of files; shared files are
frozen so branches merge without conflicts.

## Shared rules (all workstreams)

- Follow the existing structure and style: Express 5 layers (routes → validate → controller →
  services → models), zod schemas for every input, `HttpError` helpers, `toProductView` for every
  product sent to clients; React feature folders, TanStack Query for server state, CSS Modules with
  tokens from `client/src/styles/tokens.css`, components from `client/src/components/ui/`.
- Accessible, responsive UI (check 390px and 1440px widths). No new colors outside tokens.
- Tests are part of the work: API tests with supertest (see `server/tests/helpers.js`), client tests
  with Testing Library. `npm run check` must pass before finishing.
- Commit on your branch with Conventional Commit messages and the `Co-Authored-By` trailer.
- Do not edit frozen files. If a change there is unavoidable, keep it minimal and additive and list
  it in your final report.

### Frozen files (foundation, owned by the integrator)

`server/src/app.js`, `server/src/config/**`, `server/src/models/**`, `server/src/routes/index.js`,
`server/src/middleware/**`, `server/src/services/productView.js`, `server/src/services/lineItems.js`,
`server/tests/helpers.js`, `server/tests/setup.js`, `client/src/AppRoutes.jsx`, `client/src/App.jsx`,
`client/src/main.jsx`, `client/src/auth/**`, `client/src/components/layout/**`,
`client/src/components/ui/**`, `client/src/styles/**`, `client/src/api/client.js`,
`client/src/components/reviews/RatingStars.jsx` (props), package.json / lockfiles
(`stripe` and `multer` are already installed).

### Running a dev stack next to other workstreams

Use your own ports and database so stacks do not collide (MongoDB runs in Docker on 27017):

```bash
# A: 8101/3101, B: 8102/3102, C: 8103/3103, D: 8104/3104
MONGO_URL=mongodb://127.0.0.1:27017/shop_a JWT_SECRET=dev-secret-dev-secret-dev-secret-00 PORT=8101 \
  CLIENT_URL=http://localhost:3101 SEED_ADMIN_PASSWORD=admin12345 npm run seed -w server
MONGO_URL=... JWT_SECRET=... PORT=8101 CLIENT_URL=http://localhost:3101 npm run dev -w server
API_URL=http://localhost:8101 npx vite --port 3101 --strictPort   # in client/
```

## Data model (v2)

- **Product**: `title, slug (unique), brand, description, images[], categories[], colors[],
sizes[{ label, stock }]` (≥1; one-size items use `"One size"`), `price, compareAtPrice?,
active, rating { average, count }`. API adds `inStock, onSale, discountPercent`.
- **User**: `+ addresses[{ _id, fullName, street, city, postalCode, country, isDefault }],
wishlist[productId]`.
- **Review**: `product, user, username, rating 1..5, title?, body` — unique per product+user.
- **Order**: items snapshot `{ productId, quantity, size, color, title, brand, image, price }`,
  `subtotal, shipping, amount, address, status (pending|paid|shipped|delivered|cancelled),
payment { provider, sessionId, paidAt }`.
- Line items (cart and orders) always carry `size` (a label from `product.sizes`).

## A — Catalog (search, filters, product page)

Owns: `server/src/{controllers/products.controller.js, validation/product.js,
routes/products.routes.js}`, `server/scripts/seed.js`, `server/tests/products.test.js`,
`client/src/{pages/Home.jsx, pages/ProductList.jsx, pages/Product.jsx, components/product/**,
components/home/**, hooks/useProducts.js, api/products.js, data/catalog.js}`,
`client/public/images/**`.

API:

- `GET /api/products` adds `q` (title/brand/description, case-insensitive, regex-escaped),
  `brand`, `color`, `size` (comma-separated lists), `minPrice`, `maxPrice`, `onSale=true`,
  `inStock=true`, sort `newest | price_asc | price_desc | rating | discount`.
- `GET /api/products/facets?category&q` → `{ brands, colors, sizes: [{ value, count }],
price: { min, max } }` over active products in that scope.
- `GET /api/products/:id/related?limit=4` → same category, excluding the product.

UI: Zalando-like catalog — filter sidebar on desktop / drawer on mobile, active filter chips,
search results, sale badges; product gallery with thumbnails; related products; a richer home page
(e.g. "On sale" row, brands). Keep `<WishlistButton>` on cards and the product page and
`<ProductReviews>` below product details. Render `<RatingStars>` on cards. Seed ≥ 24 products,
several images where possible (photos from `images.unsplash.com`, checked visually, saved to
`client/public/images/products`, credited in `CREDITS.md`).

## B — Account, wishlist, reviews

Owns: `server/src/{routes/account.routes.js, routes/reviews.routes.js, routes/users.routes.js,
controllers/account.controller.js, controllers/reviews.controller.js, controllers/users.controller.js,
services/reviews.js, validation/account.js, validation/review.js, validation/user.js}`,
`server/tests/{account,reviews,users}.test.js`, `client/src/{pages/account/**, components/account/**,
components/reviews/** (keep RatingStars props), api/account.js, api/reviews.js}`.

API:

- `GET /api/account/wishlist` (active products, product view), `GET /api/account/wishlist/ids`,
  `PUT|DELETE /api/account/wishlist/:productId`.
- `GET|POST /api/account/addresses`, `PATCH|DELETE /api/account/addresses/:id` (max 10; exactly one
  default when any exist).
- `GET /api/products/:productId/reviews?page&limit` → `{ items, page, pages, total,
summary: { average, count, distribution: { 1..5 } } }` (public).
- `POST /api/products/:productId/reviews` — signed-in customers who ordered the product (any status
  except cancelled); one review per product (409); updates `product.rating`.
- `DELETE /api/products/:productId/reviews/:reviewId` — author or admin; updates `product.rating`.

UI: `/account` with side navigation — Orders (list with status, details, "Pay now" for pending
orders via `api/orders.js#payOrder`, cancel via `cancelOrder`), Profile (username, email, password
with current password, delete account; update `useAuth().updateUser`), Addresses (CRUD, default),
Wishlist (grid of `ProductCard`). `WishlistButton` (guests are sent to sign in) and
`ProductReviews` (summary, distribution, list, form with accessible star input).

## C — Admin panel

Owns: `server/src/{routes/admin.routes.js, controllers/admin.controller.js, services/uploads.js,
validation/admin.js}`, `server/tests/admin.test.js`, `client/src/{admin/**, api/admin.js}`.

API (all admin-only, under `/api/admin`):

- `GET /stats` → revenue (non-cancelled), orders by status, customers, products, low-stock sizes,
  revenue per day (30 days), top products.
- `GET /products?q&status=active|hidden&lowStock=true&page&limit` and `GET /products/:id`
  (including hidden products). Create/update/delete use `POST|PATCH|DELETE /api/products`.
- `POST /uploads` (multipart field `image`, jpeg/png/webp, ≤ 5 MB) → `{ url: '/uploads/<name>' }`,
  random file names, files in `env.UPLOAD_DIR`.
- `GET /orders?status&q&page` (with customer username/email). Status changes use
  `PATCH /api/orders/:id/status`.
- `GET /reviews?page` (recent, with product title) — deletion via the reviews endpoint.
- Customers via existing `GET /api/users`, `PATCH /api/users/:id { isAdmin }`, `DELETE /api/users/:id`.

UI: `/admin` with its own layout (sidebar: Dashboard, Products, Orders, Customers, Reviews;
"View shop"). Dashboard KPIs, revenue chart (inline SVG), low stock, recent orders. Product list
(search, filters, pagination) and product form (title, slug from title, brand, description, price,
compare-at price, categories, colors, sizes with stock, image upload with preview/reorder/remove,
active). Orders with status filter and detail view. Customers (grant/revoke admin, not for
yourself). Reviews moderation.

## D — Checkout and payments (Stripe)

Owns: `server/src/{controllers/orders.controller.js, routes/orders.routes.js,
routes/payments.routes.js, validation/order.js, services/payments.js, services/stock.js,
services/pricing.js}`, `server/tests/{orders,payments,pricing,cart}.test.js`,
`client/src/{pages/Cart.jsx, pages/checkout/**, components/cart/**, api/orders.js, cart/**}`.

API:

- `POST /api/orders` → reserves stock atomically per size (rolls back on failure → 409), creates a
  pending order, clears the saved cart; with Stripe configured creates a Checkout Session
  (`success_url /checkout/success?order=<id>`, `cancel_url /checkout/cancel?order=<id>`) →
  `{ order, checkoutUrl }`; without Stripe `checkoutUrl: null`.
- `GET /api/orders/:id` (owner or admin), `POST /api/orders/:id/pay` (new session for a pending
  order), `POST /api/orders/:id/cancel` (owner, pending only; returns stock).
- `PATCH /api/orders/:id/status` (admin) follows allowed transitions
  (pending→paid→shipped→delivered, cancel from pending/paid) and returns stock on cancel.
- `POST /api/payments/webhook` — verifies the Stripe signature; `checkout.session.completed` →
  paid (idempotent); `checkout.session.expired` → cancel pending order and return stock.
- Stripe access only through `services/payments.js` so tests can mock it.

UI: checkout in the bag — saved addresses (`api/account.js#fetchAddresses`, default preselected) or
a new address with "save to my addresses"; redirect to Stripe; `/checkout/success` (order summary,
waits for the webhook to mark it paid) and `/checkout/cancel` (retry payment or cancel the order).
