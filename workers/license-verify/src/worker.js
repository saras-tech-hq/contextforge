/**
 * Lemon Squeezy license validation proxy.
 * Keeps the store API key off the client. Extension POSTs { licenseKey }.
 */

const LS_VALIDATE = "https://api.lemonsqueezy.com/v1/licenses/validate";

function corsHeaders(origin, env) {
  const allowed = (env.ALLOWED_ORIGINS || "*")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const allow =
    allowed.includes("*") || (origin && allowed.includes(origin))
      ? origin || "*"
      : allowed[0] || "*";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function json(body, status, origin, env) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(origin, env),
    },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin, env) });
    }

    const url = new URL(request.url);
    if (request.method !== "POST" || (url.pathname !== "/" && url.pathname !== "/validate")) {
      return json({ ok: false, error: "POST /validate with JSON { licenseKey }" }, 404, origin, env);
    }

    if (!env.LEMON_SQUEEZY_API_KEY) {
      return json({ ok: false, error: "Server is not configured" }, 500, origin, env);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ ok: false, error: "Invalid JSON" }, 400, origin, env);
    }

    const licenseKey = String(payload.licenseKey || payload.license_key || "").trim();
    if (licenseKey.length < 8 || licenseKey.length > 256) {
      return json({ ok: false, valid: false, error: "Invalid license key" }, 400, origin, env);
    }

    const instanceName = String(payload.instanceName || "ContextForge").slice(0, 64);

    const form = new URLSearchParams();
    form.set("license_key", licenseKey);
    form.set("instance_name", instanceName);

    const lsRes = await fetch(LS_VALIDATE, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${env.LEMON_SQUEEZY_API_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });

    let data;
    try {
      data = await lsRes.json();
    } catch {
      return json({ ok: false, error: "License service unavailable" }, 502, origin, env);
    }

    const valid = Boolean(data.valid);
    const status = data.license_key?.status || (valid ? "active" : "invalid");

    return json(
      {
        ok: true,
        valid,
        status,
        instanceId: data.instance?.id ?? null,
        error: valid ? null : data.error || "License is not valid",
      },
      200,
      origin,
      env
    );
  },
};
