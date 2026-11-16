import { getStore } from "@netlify/blobs";
import type { Context } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  const store = getStore("lumina-analytics");
  const currentRaw = await store.get("site_clicks");
  let count = currentRaw ? parseInt(currentRaw, 10) : 0;

  if (req.method === "POST") {
    count += 1;
    await store.set("site_clicks", count.toString());
  }

  return new Response(JSON.stringify({ clicks: count }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
