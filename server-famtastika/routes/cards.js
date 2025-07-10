const express = require("express");
const axios = require("axios");
require("dotenv").config(); // ✅ LOAD .env HERE

const router = express.Router();

const CLOUDFRONT_URL = process.env.CLOUDFRONT_URL;
const SECRET_HEADER = process.env.SECRET_HEADER;

// GET /api/cards/:lang/:fileName
router.get("/:lang/:fileName", async (req, res) => {
  const { lang, fileName } = req.params;

  console.log(SECRET_HEADER);

  const url = `${CLOUDFRONT_URL}/cards/${lang}/${fileName}`;

  try {
    const response = await axios.get(url, {
      headers: {
        Referer: SECRET_HEADER,
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

module.exports = router;
