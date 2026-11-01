import { getStore } from "@netlify/blobs";
import type { Config } from "@netlify/functions";

const MAX_BODY_BYTES = 2_000_000;
const MAX_ENVELOPE_BYTES = 1_500_000;
const encoder = new TextEncoder();

function store() {
  const context = process.env.CONTEXT || "local";
  const safeContext = /^[a-z0-9-]{1,20}$/i.test(context) ? context.toLowerCase() : "other";
  return getStore(`lotwise-encrypted-vault-${safeContext}`);
}

async function vaultBlobKey(accessKey: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(accessKey));
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `vaults/${hex}`;
}

export default async function handleVault(request: Request) {
  if (request.method !== "POST") return Response.json({ error: "Method not allowed." }, { status: 405 });
  const origin = request.headers.get("origin");
  if (origin) {
    try { if (new URL(origin).host !== new URL(request.url).host) return Response.json({ error: "Cross-origin request rejected." }, { status: 403 }); }
    catch { return Response.json({ error: "Invalid origin." }, { status: 403 }); }
  }
  const bodyText = await request.text();
  if (encoder.encode(bodyText).byteLength > MAX_BODY_BYTES) return Response.json({ error: "Request is too large." }, { status: 413 });
  let body: Record<string, unknown>;
  try { body = JSON.parse(bodyText); }
  catch { return Response.json({ error: "Invalid JSON." }, { status: 400 }); }
  if (typeof body.accessKey !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(body.accessKey)) {
    return Response.json({ error: "Invalid vault recovery key." }, { status: 400 });
  }
  const key = await vaultBlobKey(body.accessKey);
  const blobs = store();
  if (body.action === "delete") {
    await blobs.delete(key);
    return Response.json({ ok: true });
  }
  if (body.action === "load") {
    const envelope = await blobs.get(key, { type: "json", consistency: "strong" });
    if (!envelope) return Response.json({ error: "No snapshot exists for this recovery key yet." }, { status: 404 });
    return Response.json({ envelope });
  }
  if (body.action !== "save") return Response.json({ error: "Unsupported action." }, { status: 400 });
  const envelope = body.envelope as Record<string, unknown> | undefined;
  if (!envelope || envelope.format !== "lotwise-encrypted" || envelope.version !== 1 || envelope.purpose !== "vault" ||
      typeof envelope.iv !== "string" || typeof envelope.ciphertext !== "string" ||
      encoder.encode(JSON.stringify(envelope)).byteLength > MAX_ENVELOPE_BYTES) {
    return Response.json({ error: "Invalid or oversized encrypted snapshot." }, { status: 400 });
  }
  await blobs.setJSON(key, envelope);
  return Response.json({ ok: true });
}

export const config: Config = {
  path: "/api/sync-vault",
  method: ["POST"],
  rateLimit: { action: "rate_limit", aggregateBy: "ip", windowSize: 60, windowLimit: 20 },
};
