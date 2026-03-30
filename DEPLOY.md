# Deployment

## Environment Variables

Use `.env.example` as the baseline production checklist.

Required:

- `NODE_ENV=production`
- `PORT`
- `RETURN_LOGIN_CODE=0`
- `FRONTEND_URL`
- `CORS_ORIGIN`
- `TRUST_PROXY=1`
- `SESSION_COOKIE_NAME`
- `SESSION_COOKIE_SAMESITE`
- `SESSION_COOKIE_SECURE=1`
- `SESSION_COOKIE_MAX_AGE_MS`
- `SQLITE_DB_DIR` or `SQLITE_DB_PATH`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

## Build

```bash
npm install
npm run build
```

## Start

```bash
npm start
```

The Express server will serve the built Vite app from `dist/` when `NODE_ENV=production`.

## Stripe Webhook

Configure Stripe to send events to:

```text
https://your-domain.example/api/stripe/webhook
```

Required event:

- `checkout.session.completed`

## Launch Checklist

1. Set all production environment variables from `.env.example`.
2. Make sure the SQLite path points to persistent storage.
3. Run `npm install`.
4. Run `npm run build`.
5. Start the backend with `npm start`.
6. Confirm `GET /api/health` returns `{ ok: true }`.
7. Verify the built frontend loads from the same origin.
8. Test login and confirm the session cookie is `HttpOnly` and `Secure`.
9. Test one full Stripe checkout in test mode.
10. Confirm the webhook marks the order as paid.
