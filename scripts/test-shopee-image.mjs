// Probe one Shopee product to see what we can scrape.
const shopId = "983645094";
const itemId = "24017726923";

// Try a few URL shapes + UAs.
const variants = [
  {
    name: "canonical desktop UA",
    url: `https://shopee.com.br/product/${shopId}/${itemId}`,
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  },
  {
    name: "i.-suffix",
    url: `https://shopee.com.br/-i.${shopId}.${itemId}`,
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  },
  {
    name: "Googlebot UA",
    url: `https://shopee.com.br/product/${shopId}/${itemId}`,
    ua: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  },
  {
    name: "Facebook crawler UA",
    url: `https://shopee.com.br/product/${shopId}/${itemId}`,
    ua: "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
  },
  {
    name: "WhatsApp UA",
    url: `https://shopee.com.br/product/${shopId}/${itemId}`,
    ua: "WhatsApp/2.23.20.0 A",
  },
];

for (const v of variants) {
  try {
    const r = await fetch(v.url, {
      redirect: "follow",
      headers: {
        "User-Agent": v.ua,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
    });
    const html = await r.text();
    const og = html.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i,
    );
    const tw = html.match(
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)/i,
    );
    const sus = html.match(
      /https?:\/\/[^"'\s<>]*susercontent[^"'\s<>]*\.(?:jpg|jpeg|png|webp)/i,
    );
    const imgKey = html.match(/["']image["']\s*:\s*["']([a-f0-9]{32})["']/);
    console.log(
      `[${v.name}] status=${r.status} size=${html.length} og=${og?.[1] || "-"} tw=${tw?.[1] || "-"} sus=${sus?.[0] || "-"} key=${imgKey?.[1] || "-"} final=${r.url.slice(0, 80)}`,
    );
  } catch (e) {
    console.log(`[${v.name}] ERR ${e.message}`);
  }
}
