// Cloudflare Pages Function: GET /health.
// The static client has no server of its own, so without this the SPA fallback
// answered /health with index.html and 200. This reports only that the client
// deployment is up; the multiplayer socket server serves its own /health.
export function onRequestGet() {
  return new Response(
    JSON.stringify({
      status: "ok",
      service: "darkmoon-client",
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        // Pages does not apply _headers to Function responses.
        "strict-transport-security": "max-age=31536000; includeSubDomains",
        "x-content-type-options": "nosniff",
      },
    },
  );
}
