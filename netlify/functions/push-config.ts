import type { Config } from "@netlify/functions";

async function handlePushConfig() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_SUBJECT) {
    return Response.json({ error: "Background notifications are not configured on this deployment." }, { status: 503 });
  }
  return Response.json({ publicKey }, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}

export default handlePushConfig;

export const config: Config = {
  path: "/api/push/config",
  method: ["GET"],
};

