const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "cards");
const allowedLangs = ["en", "ru", "es", "fr"];

// Get only language folders that are allowed
const languages = fs
  .readdirSync(root)
  .filter(
    (f) =>
      fs.statSync(path.join(root, f)).isDirectory() && allowedLangs.includes(f)
  );

languages.forEach((lang) => {
  const folder = path.join(root, lang);
  const files = fs.readdirSync(folder);
  const cardMap = {};

  files.forEach((file) => {
    const match = file.match(/(card\d+)_(front|back)\.webp$/);
    if (!match) return;
    const [_, id, side] = match;
    cardMap[id] = cardMap[id] || { id };
    cardMap[id][side] = file;
  });

  const cards = Object.values(cardMap);

  // Check if instructions.json exists
  const instructionsFile = "instructions.json";
  const hasInstructions = fs.existsSync(path.join(folder, instructionsFile));

  // Create the full object
  const output = {
    instructionsPath: hasInstructions ? instructionsFile : null,
    cards: cards,
  };

  const indexPath = path.join(folder, "index.json");
  fs.writeFileSync(indexPath, JSON.stringify(output, null, 2));
  console.log(
    `✅ index.json generated for '${lang}' with ${cards.length} cards.`
  );
});
