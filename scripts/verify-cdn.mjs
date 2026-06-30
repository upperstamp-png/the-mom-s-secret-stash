// Validate that the cached hashes actually serve images on the CDN.
import fs from "node:fs";
const cache = JSON.parse(fs.readFileSync("scripts/shopee-images-cache.json", "utf8"));
const entries = Object.entries(cache);
console.log("cache size:", entries.length);
for (const [id, v] of entries.slice(0, 5)) {
  const url = `https://down-br.img.susercontent.com/file/${v.image}`;
  const r = await fetch(url, { method: "HEAD" });
  console.log(`${id} -> ${r.status} ${r.headers.get("content-type")} (${url})`);
}
