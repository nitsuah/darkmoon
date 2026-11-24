import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
// @ts-expect-error plain JS Pages Function
import { onRequestGet } from "../../functions/health.js";

const NL = String.fromCharCode(10);
const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

// Parse _headers into { pattern: [header lines] } without regex backtracking.
function headerBlocks(text: string): Record<string, string[]> {
  const blocks: Record<string, string[]> = {};
  let current = "";
  for (const raw of text.split(NL)) {
    if (!raw.trim() || raw.trim().startsWith("#")) continue;
    if (!/^\s/.test(raw)) {
      current = raw.trim();
      blocks[current] = [];
    } else if (current) {
      blocks[current].push(raw.trim());
    }
  }
  return blocks;
}

describe("Cloudflare Pages config", () => {
  it("sets HSTS for every path and immutable caching for hashed assets", () => {
    const blocks = headerBlocks(read("public/_headers"));
    expect(blocks["/*"]).toContain("Strict-Transport-Security: max-age=31536000; includeSubDomains");
    expect(blocks["/assets/*"]).toContain("Cache-Control: public, max-age=31536000, immutable");
  });

  it("serves a real 404 and rewrites only the SPA routes", () => {
    expect(existsSync(resolve(__dirname, "../../public/404.html"))).toBe(true);
    const rules = read("public/_redirects")
      .split(NL)
      .filter((l) => l.trim() && !l.startsWith("#"))
      .map((l) => l.trim());
    expect(rules).toEqual(["/play / 200", "/play/ / 200", "/solo / 200", "/solo/ / 200"]);
  });

  it("GET /health returns JSON with security headers instead of the SPA shell", async () => {
    const res = onRequestGet();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(res.headers.get("strict-transport-security")).toContain("max-age=31536000");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await res.json()).toMatchObject({ status: "ok", service: "darkmoon-client" });
  });
});
