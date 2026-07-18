# Net Worth backend (Supabase)

This template stores each extension user's current net worth in Supabase Postgres.

The extension sends its Google OAuth access token to the `sync-net-worth` Edge Function. The function verifies that token belongs to this extension's Google OAuth client, obtains the stable Google user ID, and then updates only that user's row. Access tokens are never stored.

## 1. Create the database table

Create a Supabase project, open its SQL Editor, and run:

```sql
-- supabase/migrations/20260718000000_create_user_net_worth.sql
```

## 2. Install and configure the Supabase CLI

From `backend/`:

```sh
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set GOOGLE_OAUTH_CLIENT_ID=660825695384-cjg5jte7arnjn6mo6lprvv763c4r7v4c.apps.googleusercontent.com
supabase secrets set ALLOWED_ORIGIN=chrome-extension://bnhdekapogmichkaimhfiknfngkdchpc
supabase functions deploy sync-net-worth
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are supplied automatically to deployed Edge Functions. Never place a service-role key in the extension.

For local development, copy `.env.example` to `.env` and replace the values before running `supabase functions serve sync-net-worth --env-file .env`.

## 3. Extension request shape

After `chrome.identity.getAuthToken()` succeeds, send the token and state to the function:

```js
await fetch("https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-net-worth", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({ netWorth, shortsWatched }),
});
```

Add the function host to `host_permissions` in the extension manifest:

```json
"host_permissions": [
  "https://YOUR_PROJECT_REF.supabase.co/*"
]
```

The function expects the Chrome identity access token, not a Supabase token. It validates the token's OAuth audience against `GOOGLE_OAUTH_CLIENT_ID` and uses Google's stable user ID as the database key.
