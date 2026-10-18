import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://levyjumamasinde-cmd.github.io",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
]);
const accessCodePattern = /^[A-Za-z0-9_-]{32,128}$/;
const signedUrlLifetimeSeconds = 60;

function corsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Headers": "apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Origin": origin,
    "Cache-Control": "no-store",
    "Vary": "Origin",
  };
}

function jsonResponse(status: number, payload: Record<string, string>, origin: string) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function matchesInConstantTime(candidate: string, expected: string) {
  const encoder = new TextEncoder();
  const candidateBytes = encoder.encode(candidate);
  const expectedBytes = encoder.encode(expected);
  let difference = candidateBytes.length ^ expectedBytes.length;
  const length = Math.max(candidateBytes.length, expectedBytes.length);

  for (let index = 0; index < length; index += 1) {
    difference |= (candidateBytes[index] ?? 0) ^ (expectedBytes[index] ?? 0);
  }

  return difference === 0;
}

function getDefaultSecretKey() {
  const secretKeysJson = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (secretKeysJson) {
    try {
      const secretKeys: unknown = JSON.parse(secretKeysJson);
      if (
        typeof secretKeys === "object" &&
        secretKeys !== null &&
        "default" in secretKeys &&
        typeof secretKeys.default === "string"
      ) {
        return secretKeys.default;
      }
    } catch {
      return null;
    }
  }

  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? null;
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin") ?? "";
  if (!allowedOrigins.has(origin)) {
    return new Response(null, { status: 403, headers: { "Cache-Control": "no-store" } });
  }

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." }, origin);
  }

  const expectedAccessCode = Deno.env.get("RESULT_SLIP_ACCESS_CODE") ?? "";
  if (!accessCodePattern.test(expectedAccessCode)) {
    return jsonResponse(503, { error: "Private access is not configured." }, origin);
  }

  let body: unknown;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 2048) {
      return jsonResponse(413, { error: "Request is too large." }, origin);
    }
    body = JSON.parse(rawBody);
  } catch {
    return jsonResponse(400, { error: "Invalid request." }, origin);
  }

  const candidate =
    typeof body === "object" && body !== null && "passcode" in body &&
    typeof body.passcode === "string"
      ? body.passcode
      : "";

  if (!accessCodePattern.test(candidate) || !matchesInConstantTime(candidate, expectedAccessCode)) {
    return jsonResponse(401, { error: "Passcode not accepted." }, origin);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const secretApiKey = getDefaultSecretKey();
  if (!supabaseUrl || !secretApiKey) {
    return jsonResponse(503, { error: "Private access is not configured." }, origin);
  }

  try {
    const supabase = createClient(supabaseUrl, secretApiKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await supabase.storage
      .from("private-documents")
      .createSignedUrl("img20261009_11064047.pdf", signedUrlLifetimeSeconds);

    if (error || !data?.signedUrl) {
      return jsonResponse(502, { error: "Could not create a private document link." }, origin);
    }

    const signedUrl = new URL(data.signedUrl, `${supabaseUrl}/`);
    if (signedUrl.origin !== new URL(supabaseUrl).origin) {
      return jsonResponse(502, { error: "Could not create a private document link." }, origin);
    }
    if (!signedUrl.pathname.startsWith("/storage/v1/")) {
      signedUrl.pathname = `/storage/v1${signedUrl.pathname.startsWith("/") ? "" : "/"}${signedUrl.pathname}`;
    }

    return jsonResponse(
      200,
      {
        signedUrl: signedUrl.toString(),
        expiresIn: String(signedUrlLifetimeSeconds),
      },
      origin,
    );
  } catch {
    return jsonResponse(502, { error: "Could not create a private document link." }, origin);
  }
});
