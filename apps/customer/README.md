# Customer application

Public storefront for The Pooja House. It has its own Vite entry point, React Router routes, environment, build output, and Vercel SPA configuration. It contains no administrator routes or CMS services.

## Local verification

```bash
npm run dev:customer
npm run test:customer
npm run build:customer
npm run verify:customer-deploy
```

Set only these browser-safe values in `apps/customer/.env.local`:

```env
VITE_SUPABASE_URL=https://PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=publishable-or-anon-key
```

Production builds fail immediately if either value is missing, the URL is not HTTPS, or a service-role/secret key is supplied. Public access is constrained by RLS; checkout, tracking, and invoice downloads use origin-checked Supabase Edge Functions.

## Vercel project

Import this repository as one Vercel project with:

| Setting | Value |
|---|---|
| Root Directory | `apps/customer` |
| Framework Preset | Vite |
| Include source files outside Root Directory | Enabled |
| Install Command | From `vercel.json` |
| Build Command | From `vercel.json` |
| Output Directory | `dist` |

Outside-root source access is required for the npm workspace packages and the read-only local catalog report imported as a development fallback. Production does not copy the 126 MB local catalog image directory; product imagery is served from Supabase Storage.

Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` separately to Vercel's **Production** and **Preview** environments. Do not add `SUPABASE_SERVICE_ROLE_KEY`, database credentials, SMTP secrets, or any Meta credential.

After assigning the production domain, configure Supabase:

1. Set the Authentication Site URL to the customer production URL.
2. Add the exact customer production URL to allowed Auth redirect URLs.
3. Allow the exact deployed origin in Edge Functions:

   ```bash
   supabase secrets set CUSTOMER_APP_ORIGINS="https://balaji-pooja-store.com,https://www.balaji-pooja-store.com"
   ```

4. Add an exact stable Vercel preview URL to that secret only if checkout must work on Preview deployments. Do not use a wildcard origin.
5. Confirm both OTP email templates still use `{{ .Token }}` and perform one real production-domain OTP test.

`vercel.json` supplies the customer-only build, immutable caching for hashed assets, security headers, and the SPA fallback needed when refreshing routes such as `/product/:slug`, `/checkout`, or `/track/:orderNumber`.
