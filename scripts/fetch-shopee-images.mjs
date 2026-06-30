// One-shot script: for each Shopee product in the CSV, fetch the public
// Shopee API to get the real image hash and cache it locally.
//
//   node scripts/fetch-shopee-images.mjs
//
// Then re-run `node scripts/generate-shopee-seed.mjs` to regenerate the
// migration SQL using the cached real image URLs (placeholder is used as
// fallback for items that the API blocked or doesn't return).
//
// The cache (scripts/shopee-images-cache.json) is reused across runs so
// you can interrupt with Ctrl+C and resume without re-fetching everything.
import fs from "node:fs";
import path from "node:path";

const CSV_PATH = String.raw`C:\Users\Cresci\Downloads\BatchProductLinks20260628224001-d012e36042ab41b8bd76384f5e7e53c0.csv`;
const CACHE_PATH = path.resolve("scripts/shopee-images-cache.json");
const REQUEST_DELAY_MS = 350; // be polite
const MAX_RETRIES = 2;

// --- Tiny CSV parser ---------------------------------------------------------
function parseCSV(text) {
  const rows = [];
  let cur = [];
  let cell = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQ = false;
      } else cell += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") {
        cur.push(cell);
        cell = "";
      } else if (c === "\n") {
        cur.push(cell);
        rows.push(cur);
        cur = [];
        cell = "";
      } else if (c === "\r") {
        /* skip */
      } else cell += c;
    }
  }
  if (cell.length || cur.length) {
    cur.push(cell);
    rows.push(cur);
  }
  return rows;
}

// --- Cache I/O ---------------------------------------------------------------
function loadCache() {
  try {
    return JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
  } catch {
    return {};
  }
}
function saveCache(cache) {
  fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), "utf8");
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- Shopee SSR scrape -------------------------------------------------------
// Shopee's internal /api/v4/item/get is anti-bot blocked (error 90309999).
// Instead, request the canonical product URL with a WhatsApp / FB crawler UA —
// Shopee serves a static SSR page with <meta property="og:image"> pointing
// to the real product image on down-br.img.susercontent.com/file/<hash>.
async function fetchShopeeItem(shopId, itemId) {
  const url = `https://shopee.com.br/product/${shopId}/${itemId}`;
  const headers = {
    // WhatsApp UA gives the smallest payload (~13KB) with the og:image we need.
    "User-Agent": "WhatsApp/2.23.20.0 A",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
  };
  const res = await fetch(url, { headers, redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const og = html.match(
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i,
  );
  if (!og) throw new Error("no og:image");
  const ogUrl = og[1];
  // Extract the bare hash/filename after "/file/" so we store the same shape
  // (just the path segment) the legacy code expected. e.g.
  //   https://down-br.img.susercontent.com/file/sg-11134201-7rce4-lsnl...
  // -> "sg-11134201-7rce4-lsnl..."
  const m = ogUrl.match(/\/file\/([^?#]+)/);
  const hash = m ? m[1] : null;
  if (!hash) throw new Error("og:image not on susercontent");
  return { image: hash, images: [hash] };
}

// --- Main --------------------------------------------------------------------
(async () => {
  const raw = fs.readFileSync(CSV_PATH, "utf8");
  const rows = parseCSV(raw);
  rows.shift(); // header

  const cache = loadCache();
  let fetched = 0;
  let cached = 0;
  let failed = 0;

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    if (!row || row.length < 9) continue;
    const itemId = row[0]?.trim();
    const productLink = row[7]?.trim();
    if (!itemId || !productLink) continue;

    // product link looks like https://shopee.com.br/product/<shopId>/<itemId>
    const m = productLink.match(/\/product\/(\d+)\/(\d+)/);
    if (!m) {
      failed++;
      continue;
    }
    const shopId = m[1];

    if (cache[itemId]?.image) {
      cached++;
      continue;
    }

    let ok = false;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const data = await fetchShopeeItem(shopId, itemId);
        cache[itemId] = { shopId, ...data, fetchedAt: new Date().toISOString() };
        fetched++;
        ok = true;
        // Persist often so Ctrl+C doesn't lose progress
        if (fetched % 10 === 0) saveCache(cache);
        break;
      } catch (e) {
        if (attempt === MAX_RETRIES) {
          console.warn(`[${idx + 1}/${rows.length}] ${itemId} FAIL: ${e.message}`);
          failed++;
        } else {
          await sleep(800 * (attempt + 1));
        }
      }
    }

    if (ok && (idx + 1) % 5 === 0) {
      console.log(`[${idx + 1}/${rows.length}] fetched=${fetched} cached=${cached} failed=${failed}`);
    }
    await sleep(REQUEST_DELAY_MS);
  }

  saveCache(cache);
  console.log(`\nDone. Total fetched=${fetched} from-cache=${cached} failed=${failed}`);
  console.log(`Cache: ${CACHE_PATH}`);
})();
