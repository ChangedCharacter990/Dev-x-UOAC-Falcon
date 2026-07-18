import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const googleClientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN");

if (!supabaseUrl || !serviceRoleKey || !googleClientId || !allowedOrigin) {
  throw new Error("Missing required Edge Function environment variables.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin === allowedOrigin ? allowedOrigin : "null",
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

type GoogleTokenInfo = {
  aud?: string;
  user_id?: string;
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
  expires_in?: string;
};

Deno.serve(async (request) => {
  const origin = request.headers.get("Origin");

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(origin) });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, origin);
  }

  if (origin !== allowedOrigin) {
    return json({ error: "Forbidden origin" }, 403, origin);
  }

  const authorization = request.headers.get("Authorization");
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) {
    return json({ error: "Missing Google OAuth access token" }, 401, origin);
  }

  let payload: { netWorth?: unknown; shortsWatched?: unknown };
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON request body" }, 400, origin);
  }

  const netWorth = payload.netWorth;
  const shortsWatched = payload.shortsWatched;
  if (
    !Number.isInteger(netWorth) ||
    !Number.isInteger(shortsWatched) ||
    (netWorth as number) < -500000 ||
    (shortsWatched as number) < 0
  ) {
    return json({ error: "Invalid net-worth state" }, 400, origin);
  }

  const tokenInfoResponse = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,
  );
  if (!tokenInfoResponse.ok) {
    return json({ error: "Invalid or expired Google OAuth access token" }, 401, origin);
  }

  const tokenInfo = (await tokenInfoResponse.json()) as GoogleTokenInfo;
  const googleUserId = tokenInfo.user_id || tokenInfo.sub;
  const isVerified = tokenInfo.email_verified === true || tokenInfo.email_verified === "true";

  if (tokenInfo.aud !== googleClientId || !googleUserId || !tokenInfo.email || !isVerified) {
    return json({ error: "Google OAuth token is not valid for this extension" }, 401, origin);
  }

  const { data, error } = await supabase
    .from("user_net_worth")
    .upsert(
      {
        google_user_id: googleUserId,
        email: tokenInfo.email,
        net_worth: netWorth,
        shorts_watched: shortsWatched,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "google_user_id" },
    )
    .select("net_worth, shorts_watched, updated_at")
    .single();

  if (error) {
    console.error("Database write failed:", error);
    return json({ error: "Could not save net-worth state" }, 500, origin);
  }

  return json({ state: data }, 200, origin);
});
