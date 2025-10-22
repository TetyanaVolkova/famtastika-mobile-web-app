// handlers/catalogService.js
const axios = require("axios");

const CLOUDFRONT_URL = process.env.CLOUDFRONT_URL; // e.g. https://d31aryko38q4pa.cloudfront.net
const BASE_PREFIX = process.env.BASE_PREFIX || "cards"; // leading path in CDN (usually 'cards')
const SECRET_HEADER = process.env.SECRET_HEADER || ""; // optional: sent as Referer to CloudFront

function corsHeaders() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Referer",
    "Cache-Control": "no-cache",
  };
}

/**
 * GET /api/cards/catalog.json
 */
exports.getCatalog = async () => {
  const targetUrl = `${CLOUDFRONT_URL.replace(
    /\/+$/,
    ""
  )}/${BASE_PREFIX}/catalog.json`;

  try {
    const res = await axios.get(targetUrl, {
      responseType: "text", // it's JSON text
      headers: SECRET_HEADER ? { Referer: SECRET_HEADER } : undefined,
      validateStatus: () => true,
    });

    if (res.status >= 400) {
      console.error("Upstream error", res.status, targetUrl);
      return {
        statusCode: res.status,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "Not found" }),
      };
    }

    // If origin forgot the right header, enforce JSON here
    return {
      statusCode: 200,
      headers: corsHeaders(),
      isBase64Encoded: false,
      body: typeof res.data === "string" ? res.data : JSON.stringify(res.data),
    };
  } catch (err) {
    console.error("Catalog proxy error:", err?.message || err);
    return {
      statusCode: 502,
      headers: corsHeaders(),
      body: JSON.stringify({ error: "Upstream fetch error" }),
    };
  }
};
