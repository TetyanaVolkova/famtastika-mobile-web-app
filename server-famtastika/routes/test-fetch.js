const axios = require("axios");

axios
  .get("https://d31aryko38q4pa.cloudfront.net/cards/ru/index.json", {
    headers: { Referer: "famtastika123" },
  })
  .then((res) => {
    console.log("Success:", res.data);
  })
  .catch((err) => {
    console.error("Error:", err.response?.status, err.response?.data);
  });
