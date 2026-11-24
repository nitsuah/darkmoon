import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
// @ts-expect-error plain JS Pages Function
import { onRequestGet } from "../../functions/health.js";

const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

describe("Cloudflare Pages config", () => {
  it("sets HSTS for every path and immutable caching for hashed assets", () => {
    const headers = read("public/_headers");
    expect(headers).toMatch(/^\/\*\n(?:\s+.+\n)*?\s+Strict-Transport-Security: max-age=31536000; includeSubDomains/m);
    expect(headers).toMatch(/^\/assets\/\*\n\s+Cache-Control: public, max-age=31536000, immutable/m);
  });

  it("serves a real 404 and rewrites only the SPA routes", () => {
    expect(existsSync(resolve(__dirname, "../../public/404.html"))).toBe(true);
    const redirects = read("public/_redirects");
    expect(redirects).toMatch(/^\/play \/index\.html 200$/m);
    expect(redirects).toMatch(/^\/solo \/index\.html 200$/m);
    expect(redirects).not.toMatch(/^\/\*/m);
  });

  it("GET /health returns JSON instead of the SPA shell", async () => {
    const res = onRequestGet();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await res.json()).toMatchObject({ status: "ok", service: "darkmoon-client" });
  });
});
