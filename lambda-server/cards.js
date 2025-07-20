const express = require("express");
const axios = require("axios");
const cors = require("cors");
const serverless = require("serverless-http");

const CLOUDFRONT_URL = "https://d31aryko38q4pa.cloudfront.net";
const SECRET_HEADER = "famtastika123";

const app = express();

// ✅ Configure allowed origins
const allowedOrigins = ["http://localhost:4200"];
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like curl or Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
  })
);
app.use(express.json());

// GET /api/cards/:lang/:fileName — Proxy file fetch from CloudFront
app.get("/api/cards/:lang/:fileName", async (req, res) => {
  const { lang, fileName } = req.params;
  const url = `${CLOUDFRONT_URL}/cards/${lang}/${fileName}`;

  try {
    const response = await axios.get(url, {
      headers: {
        Accept: "image/webp,*/*",
        "User-Agent": "Mozilla/5.0",
        // Referer: SECRET_HEADER,
      },
      responseType: "arraybuffer",
    });

    const contentType = fileName.endsWith(".webp")
      ? "image/webp"
      : "application/json";

    res.set("Content-Type", contentType);
    res.send(response.data);
  } catch (error) {
    console.error(
      "Fetch failed:",
      error.response?.status,
      error.response?.data || error.message
    );
    res.status(403).send("Access denied or file not found.");
  }
});

// Fallback 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// ✅ Lambda export with binary support
exports.cards = serverless(app, {
  binary: ["*/*"],
});
