const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors"); // ✅ Import cors
const cardRoutes = require("./routes/cards");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors()); // ✅ Enable CORS globally

app.use("/api/cards", cardRoutes);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
