# The Pooja House

The Pooja House is a two-application React workspace backed by one Supabase project. The customer storefront follows the approved quick-commerce design in `design-reference/`; the separate administrator application manages catalog content and the complete COD order lifecycle.

```text
apps/customer ── public RLS + customer Edge Functions ──┐
                                                        ├── Supabase
apps/admin ───── Auth + admin RLS/RPC + Realtime ───────┘
```

## Applications and packages

- `apps/customer`: storefront, delivery gate, search, products, wishlist, cart, COD checkout, success, secure tracking, and PWA assets.
- `apps/admin`: Auth-protected CMS, dashboard, Realtime orders, order detail/status actions, secure PDF invoice downloads, and catalog/content editors.
- `packages/database-types`: shared database and order row types.
- `packages/shared-validation`: browser-safe Zod schemas and lifecycle constants.
- `packages/shared-utils`: currency/date formatting, labels, and display transition rules.
- `supabase`: versioned migrations, seed data, and Edge Functions.
- `catalog`, `scripts`, `reports`: source catalog, repeatable importer, and validation evidence.

The two apps have separate entry points, routers, environment files, Vite builds, outputs, and Vercel configurations. Neither app imports the other.

## Local setup

```powershell
npm install
Copy-Item apps/customer/.env.example apps/customer/.env
Copy-Item apps/admin/.env.example apps/admin/.env
npm run dev:customer   # http://localhost:5173
npm run dev:admin      # http://localhost:5174
```

Set the same browser-safe values in both app environment files:

```text
VITE_SUPABASE_URL=https://PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=publishable-or-anon-key
```

Customers can browse anonymously, but checkout, Profile, Addresses, and My Orders require passwordless Supabase email OTP authentication and a completed customer profile. The admin app continues to use email/password and requires an active `admin_profiles` row with an allowed role before rendering protected data.

Customer tracking links contain a one-time-returned random secret. Only its SHA-256 hash is stored, tracking responses are sanitized, and new tracking links expire after one year. Existing links receive at least a 30-day transition window when the expiry migration is applied.

### Customer email OTP setup

The storefront exposes separate **Login** and **Sign Up** tabs. Login calls `signInWithOtp` with `shouldCreateUser: false`; Sign Up validates the serviceable delivery PIN before calling it with `shouldCreateUser: true`. Both verify a six-digit code with `verifyOtp({ type: 'email' })`. The authenticated `complete_customer_signup` RPC derives `auth.uid()`, rechecks the PIN, and creates one profile/default address transactionally. Checkout then requires that profile and sends only an address ID, product IDs, quantities, optional offer code, instructions, and an idempotency key to the authenticated order function.

In **Supabase Dashboard → Authentication → Email Templates**, update both **Confirm signup** (new customers) and **Magic Link** (existing-customer login) to use a code template containing `{{ .Token }}`. A `{{ .ConfirmationURL }}`-only template sends a confirmation/magic link and is incompatible with the storefront's six-box OTP screen:

```html
<p>Your The Pooja House verification code is:</p>
<h1>{{ .Token }}</h1>
<p>This code is temporary. Do not share it with anyone.</p>
```

For local testing, set the Site URL to `http://localhost:5173` and add explicit customer/admin redirect URLs. For production, set the customer production URL as the Site URL and add only the required customer and admin origins. Configure a production SMTP provider with a branded **The Pooja House** sender; SMTP credentials stay in Supabase and never in either Vite app. Review Auth email rate limits, OTP expiry, and enable CAPTCHA/bot protection before launch. Automated tests never store OTP values; if the hosted inbox is not available, verify one real email OTP manually before release.

Server/import variables remain only in the uncommitted root `.env` or secure CI:

```text
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
CATALOG_WORKBOOK_PATH=
CATALOG_IMAGES_DIR=
```

`CATALOG_INVENTORY_PDF` is intentionally unsupported and unnecessary; recursive inspection of the actual image files is authoritative. Never add a service-role or Meta secret to a `VITE_*` variable or either browser app.

## Commands

```text
npm run dev:customer          npm run dev:admin
npm run build:customer        npm run build:admin
npm run test:customer         npm run test:admin
npm run typecheck             npm run lint             npm test
npm run test:e2e:customer     npm run test:e2e:admin
npm run skeletons:customer   # regenerate responsive Boneyard customer skeletons
# Explicit opt-in: creates then cancels one connected-project test order.
PLAYWRIGHT_REAL_ORDER=1 npm run test:e2e:real-order
npm run catalog:validate -- [--workbook PATH --images-dir PATH]
npm run catalog:import -- [--workbook PATH --images-dir PATH]
```

Each production build is written to its own `apps/<app>/dist` directory.

The customer catalog uses Boneyard-generated shimmer skeletons captured from the real product-card DOM at 390px, 768px, and 1440px. Generated bones live in `apps/customer/src/bones` and are loaded through its registry. Start the customer dev server on port 5173 before running `npm run skeletons:customer`; regenerate the bones whenever the product-card layout changes materially.

## Supabase database and security

Apply migrations in order:

```bash
supabase link --project-ref PROJECT_REF
supabase db push --dry-run
supabase db push
supabase functions deploy create-cod-order --no-verify-jwt
supabase functions deploy track-order --no-verify-jwt
supabase functions deploy download-invoice --no-verify-jwt
```

- `202608150001_initial_store.sql` creates the normalized catalog/CMS/orders schema, constraints, Storage buckets, RLS, and atomic COD calculation.
- `202608160001_order_management.sql` adds the five-state lifecycle, token hashes, status audit history, invoice outbox, admin transition RPC, summaries, private invoice bucket, and Realtime publication.
- `202608160002_security_hardening.sql` separates anonymous storefront policies from admin checks, blocks browser access to abuse records, and adds supporting indexes.
- `202608160003_policy_optimization.sql` consolidates and optimizes the RLS policy set.
- `202608160004_configure_delivery_pincode.sql` idempotently activates delivery for PIN `560087`.
- `202608160005_fix_cod_order_pgcrypto.sql` schema-qualifies pgcrypto calls used by the hardened, empty-search-path order RPC.
- `202608210004_google_maps_delivery_location.sql` validates optional Google Maps coordinate links, stores them on owned customer addresses, and snapshots them onto COD orders for administrators.
- `202608210005_downloadable_pdf_invoices.sql` stops confirmation from creating external-delivery jobs. Historical outbox rows remain intact, but current invoices are generated securely on demand.

Anonymous users cannot list orders, order items, history, invoice records, admin profiles, or delivery areas. There is no browser insert policy for orders. The public checkout function validates origin and input, then uses the service role only inside the Edge runtime to invoke the atomic order RPC. Administrators read through RLS and change status only through `transition_order_status`; direct browser updates to orders/history/outbox are not granted.

The admin app subscribes to `orders` through authenticated Supabase Realtime. It deduplicates events, removes its channel on unmount, reports disconnects, and refetches after reconnecting. Realtime loss does not affect checkout or catalog browsing.

## COD order architecture

The browser sends an owned address ID, product UUIDs/quantities, optional offer code, delivery instructions, and a UUID idempotency key. It does not send trusted prices or totals. `create-cod-order` rate-limits requests and the `create_authenticated_cod_order` transaction:

1. validates customer data, serviceable PIN, products, publication/stock, quantities, and offer validity;
2. reads current prices and computes subtotal, discount, delivery fee, and total in integer paise;
3. stores the normalized order and immutable order-item snapshots;
4. inserts exactly one initial `placed` history event;
5. generates 32 random bytes and stores only the SHA-256 tracking-token hash;
6. returns the raw token once with safe confirmation data.

Repeated idempotency keys return the existing order and never create duplicates. The cart is cleared only after a successful response.

Customers may optionally grant one-time browser geolocation access while entering an address. The storefront converts the coordinates into a strict `https://www.google.com/maps?q=latitude,longitude` link; it does not load a Google Maps SDK, require an API key, or continuously track the customer. The database rejects other domains and invalid coordinates. Checkout copies the saved link into the immutable order snapshot, and authorized staff receive an “Open delivery location in Google Maps” action on the order detail page.

Allowed transitions are enforced while the database row is locked:

```text
placed → confirmed → out_for_delivery → delivered
   └──────────────→ cancelled ←──────────────┘
```

More precisely: `placed` may become `confirmed` or `cancelled`; `confirmed` may become `out_for_delivery` or `cancelled`; `out_for_delivery` may become `delivered` or `cancelled`. `delivered` and `cancelled` are terminal. Each successful transition and its history row commit together. Invoice generation is independent of status updates and never calls an external messaging provider.

## Secure customer tracking

The success page builds `/track/:orderNumber?token=<secret>`. `track-order` validates the order-number/token formats, hashes the supplied token, performs a constant-time-safe hash comparison, rate-limits failures, and returns only a sanitized status view. It never returns customer phone/email, full address, token hash, admin IDs, or provider errors. The page checks every 15 seconds and stops at a terminal status; this avoids unsafe anonymous Realtime access to order rows.

If the one-time token is lost, it cannot be recovered from the database. This is deliberate; staff can still manage the order, but no phone-number-only lookup is provided.

## Secure PDF invoice download

Invoices are generated on demand by the `download-invoice` Edge Function from immutable `order_items` snapshots and server-calculated order totals. Nothing is sent through WhatsApp. The PDF is returned with `Cache-Control: private, no-store` and is never placed in a public Storage bucket.

Customers can download an invoice from the success page, secure tracking page, or authenticated **My Orders** page. Access requires one of:

- the valid high-entropy tracking token and matching order number;
- the authenticated customer who owns the order; or
- an authenticated active administrator.

The admin order-detail page offers the same PDF download. `process-invoice-deliveries` is retained only as a disabled HTTP 410 endpoint so an old scheduler cannot accidentally send a WhatsApp message. No Meta, WhatsApp, or invoice-worker secrets are required.

Generate a sanitized local design preview with `npm run invoice:preview`; the PDF is written under `reports/invoice-preview/`.

Configure the exact application origins as Supabase Edge Function secrets:

```bash
supabase secrets set CUSTOMER_APP_ORIGINS=https://shop.example.com
supabase secrets set ADMIN_APP_ORIGINS=https://admin.example.com
```

## First administrator

There is no public registration. In Supabase Dashboard, create and confirm a user under **Authentication → Users**, then execute as project owner:

```sql
insert into public.admin_profiles (id, full_name, role, is_active)
select id, 'Store Owner', 'admin', true
from auth.users
where email = 'OWNER_EMAIL@example.com';
```

Use an exact administrator email, verify that one row was inserted, and enable appropriate Supabase Auth password protections. For admin password resets, configure the admin domain as an explicit redirect URL.

## Catalog import

The approved catalog now contains `Agarbatti & Dhoop`, `Brass Items`, `Lakshmi Items`, `Diyas & Wicks`, `Kumkum Haldi Chandan`, and `Oils & Ghee`. Other workbook sheets remain excluded. Validation is read-only and scans the workbook plus image directory recursively:

```bash
npm run catalog:validate -- --workbook "D:\Pooja_Store\catalog\pooja_store_catalog_template (1).xlsx" --images-dir "D:\Pooja_Store\catalog\images"
npm run catalog:import -- --workbook "D:\Pooja_Store\catalog\pooja_store_catalog_template (1).xlsx" --images-dir "D:\Pooja_Store\catalog\images"
```

`catalog/image-overrides.json` contains the confirmed path-specific mappings `Agarbatti/L005.jpg → A005`, `Agarbatti/719Mx6HFm7L.jpg → D012`, and `Mud Items/M001_1.jpg → T001`. Exact filename stems are otherwise mandatory. Source images are never renamed or destroyed.

Current evidence in `reports/`: 190 complete products, 197 readable images, 183 exact matches, 3 override matches, no duplicate images or SKUs, and one invalid price. Eleven images belong to incomplete workbook rows and are reported as orphans rather than published. `A020`, `D018`, `L007`, `K023`, and invalid-price `A005` remain unpublished. AVIF sources are uploaded as non-destructive WebP derivatives.

## Customer-only Vercel deployment

Only the customer storefront needs to be connected to Vercel for the current release. Create one Vercel project from this repository using Root Directory `apps/customer`, Framework Preset **Vite**, and enable **Include source files outside of the Root Directory in the Build Step**. The checked-in `apps/customer/vercel.json` installs the npm workspace from the repository root, builds only the customer app, publishes `dist`, adds security/cache headers, and rewrites React Router deep links to `index.html`.

Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in both the Vercel Production and Preview environments. No server, database, SMTP, Meta, or service-role secret belongs in Vercel because this project is a static browser application. The admin app remains separate and is not connected or deployed.

For `balaji-pooja-store.com`, set the production domain in Vercel, then configure that exact domain (and `www` only if used) as the Supabase Auth Site URL/redirect origin and in `CUSTOMER_APP_ORIGINS`. Dynamic preview origins are not trusted automatically; add an exact stable preview origin only when connected checkout testing is required. Detailed steps are in `apps/customer/README.md`.

## Design reference and accessibility

`design-reference/index.html`, `style.css`, and `script.js` are retained as the approved interaction reference. The customer app reuses that updated CSS with React-specific compatibility overrides, Supabase data, real catalog images, semantic controls, focus styles, keyboard-accessible dialogs, reduced-motion handling, responsive rails/grids, loading/empty/error states, and persistent local cart/wishlist/recently viewed state. Reference-only demo PINs, Unsplash data, and WhatsApp checkout are intentionally excluded.

The admin app has its own responsive daily-use visual system: collapsible navigation, scan-friendly cards/tables, status text plus colour, touch targets, confirmation prompts, and mobile layouts. No admin component or query is included in the customer router.

## Known limitations

- A real administrator account is required to exercise authenticated dashboard and Realtime flows end to end.
- PDF invoice downloads are generated on demand; no external invoice delivery provider is configured or required.
- The included serviceable PIN codes are development seed data and must be replaced with real delivery areas before production.
- Web Push is intentionally deferred. It can later complement tracking for `out_for_delivery` and `delivered` without Firebase.
- There are no online payments, phone-only order lookup, SMS, CRM, inventory ledger, delivery-partner app, or full payment reconciliation.
