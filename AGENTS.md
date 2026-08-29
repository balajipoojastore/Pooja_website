# The Pooja House Engineering Guide

## Structure

- `apps/customer`: public React storefront and customer tests.
- `apps/admin`: separate Auth-protected React CMS/order dashboard and tests.
- `packages`: shared database types, validation, and safe utilities only.
- `supabase`: SQL migrations, seed, shared Edge helpers, and Edge Functions.
- `scripts`, `catalog`, `reports`: repeatable catalog tooling, source assets, and reports.
- `design-reference`: approved storefront visual/interaction source of truth.

## Commands

- `npm run dev:customer`, `npm run dev:admin`
- `npm run build:customer`, `npm run build:admin`
- `npm run typecheck`, `npm run lint`, `npm test`
- `npm run catalog:validate -- [paths]`, `npm run catalog:import -- [paths]`

## Conventions

- Keep customer and admin entry points, routes, services, UI, env files, and output directories separate.
- Share only database types, pure validation, formatting, and safe lifecycle constants.
- Use strict TypeScript and keep Supabase queries in each app's `src/services`.
- Store money as integer paise; never calculate trusted order totals from browser prices.
- Preserve the updated reference's bone/ink/gold visual language and mobile-first storefront behavior.

## Security

- Never expose or commit service-role, Meta, database, or worker secrets.
- Admin Auth sessions are insufficient alone: require an active authorized `admin_profiles` row and RLS.
- COD creation and tracking pass through origin-checked Edge Functions; order creation is an atomic service-only RPC.
- Status changes use the locking transition RPC; browsers never write orders, history, or invoice jobs directly.
- Treat workbook, form, tracking token, and Realtime payloads as untrusted input.

## Completion checklist

- Both app typechecks/tests/builds plus root lint and server tests pass.
- Customer bundles contain no admin routes/modules; admin bundles contain no storefront routes/modules.
- RLS, storage policies, Edge Functions, Realtime cleanup, status history, tracking hashes, and invoice idempotency are present.
- Catalog validation passes and missing-image/invalid-price products remain unpublished.
- Inspect both applications responsively before declaring visual completion.
