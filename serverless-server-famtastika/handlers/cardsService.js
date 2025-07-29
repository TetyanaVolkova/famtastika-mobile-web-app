const axios = require("axios");
require("dotenv").config();

const CLOUDFRONT_URL = process.env.CLOUDFRONT_URL;
const SECRET_HEADER = process.env.SECRET_HEADER;

exports.cardsService = async (event) => {
  const { lang, fileName } = event.pathParameters || {};
  const url = `${CLOUDFRONT_URL}/cards/${lang}/${fileName}`;

  // Determine if it's an image (for base64 encoding)
  const isImage = fileName.match(/\.(webp|png|jpe?g)$/i);

  try {
    const response = await axios.get(url, {
      headers: {
        Referer: SECRET_HEADER,
      },
      responseType: isImage ? "arraybuffer" : "text",
    });

    const contentType = isImage
      ? fileName.endsWith(".webp")
        ? "image/webp"
        : fileName.endsWith(".png")
        ? "image/png"
        : "image/jpeg"
      : "application/json";

    return {
      statusCode: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Referer",
      },
      isBase64Encoded: !!isImage,
      body: isImage
        ? Buffer.from(response.data).toString("base64") // ✅ raw binary to base64
        : response.data, // ✅ text/json passed through
    };
  } catch (error) {
    console.error(
      "Fetch failed:",
      error.response?.status,
      error.response?.data || error.message
    );

    return {
      statusCode: 403,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Referer",
      },
      body: "Access denied or file not found.",
    };
  }
};
