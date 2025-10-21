// lambda/cards-service-with-theme.js
const axios = require("axios");

const CLOUDFRONT_URL = process.env.CLOUDFRONT_URL; // e.g. https://cdn.example.com
const BASE_PREFIX = process.env.BASE_PREFIX || "cards"; // leading path in your bucket/cdn
const SECRET_HEADER = process.env.SECRET_HEADER || ""; // optional - sent as Referer

const IMG_RE = /\.(webp|png|jpe?g|gif|svg)$/i;

function contentTypeFor(pathPart) {
  const lower = pathPart.toLowerCase();
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".json")) return "application/json";
  return "text/plain";
}

function corsHeaders(ct) {
  return {
    "Content-Type": ct,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Referer",
  };
}

/**
 * ONLY WITH THEME:
 * GET /api/cards/{category}/{theme}/{deck}/{lang}/{fileName}
 */
exports.cardsService = async (event) => {
  try {
    const p = event.pathParameters || {};
    const { category, theme, deck, lang, fileName } = p;

    if (!category || !theme || !deck || !lang || !fileName) {
      return {
        statusCode: 400,
        headers: corsHeaders("text/plain"),
        body: "Missing path parameters",
      };
    }

    // Build CDN URL: <CLOUDFRONT_URL>/<BASE_PREFIX>/<category>/<theme>/<deck>/<lang>/<fileName>
    const safe = (s) => encodeURIComponent(s);
    const pathPart = `${safe(category)}/${safe(theme)}/${safe(deck)}/${safe(
      lang
    )}/${safe(fileName)}`;
    const targetUrl = `${CLOUDFRONT_URL}/${BASE_PREFIX}/${pathPart}`;

    const isImage = IMG_RE.test(fileName);
    const responseType = isImage ? "arraybuffer" : "text";
    const contentType = contentTypeFor(fileName);

    const upstream = await axios.get(targetUrl, {
      responseType,
      headers: SECRET_HEADER ? { Referer: SECRET_HEADER } : undefined,
      validateStatus: () => true, // we’ll map status ourselves
    });

    if (upstream.status >= 400) {
      console.error("Upstream error", upstream.status, targetUrl);
      return {
        statusCode: upstream.status,
        headers: corsHeaders("text/plain"),
        body: "Not found",
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders(contentType),
      isBase64Encoded: !!isImage,
      body: isImage
        ? Buffer.from(upstream.data).toString("base64")
        : upstream.data,
    };
  } catch (err) {
    console.error("Proxy error:", err?.message || err);
    return {
      statusCode: 502,
      headers: corsHeaders("text/plain"),
      body: "Upstream fetch error",
    };
  }
};
