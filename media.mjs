import { getUser } from "@netlify/identity";
import { getStore } from "@netlify/blobs";

const ADMIN_EMAIL = "raointeriorworks@gmail.com";
const STORE = getStore("rao-site-content", { region: "ap-southeast-1" });
async function authorized() {
  const user = await getUser();
  return !!user && (user.email || "").trim().toLowerCase() === ADMIN_EMAIL;
}

export default async (req) => {
  const url = new URL(req.url);
  const id = url.searchParams.get("id") || "";
  if (!/^media-[a-f0-9-]{20,}$/i.test(id)) return new Response("Not found", { status: 404 });

  if (req.method === "GET") {
    const blob = await STORE.get(id, { type: "blob" });
    if (!blob) return new Response("Not found", { status: 404 });
    const type = blob.type || "application/octet-stream";
    if (!type.startsWith("image/")) return new Response("Not found", { status: 404 });
    return new Response(blob, { headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
  }
  if (!(await authorized())) return new Response("Forbidden", { status: 403 });

  if (req.method === "POST") {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file.arrayBuffer !== "function") return Response.json({ error: "Choose an image first." }, { status: 400 });
    const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
    if (!allowed.has(file.type) || file.size > 8 * 1024 * 1024) return Response.json({ error: "Use JPG, PNG, WEBP or GIF up to 8 MB." }, { status: 400 });
    const key = `media-${crypto.randomUUID()}`;
    await STORE.set(key, new Blob([await file.arrayBuffer()], { type: file.type }));
    return Response.json({ id: key, url: `/.netlify/functions/media?id=${key}` });
  }
  if (req.method === "DELETE") {
    await STORE.delete(id);
    return Response.json({ ok: true });
  }
  return new Response("Method not allowed", { status: 405 });
};
