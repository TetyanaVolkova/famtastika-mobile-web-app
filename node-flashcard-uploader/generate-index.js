/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "cards");

// Configure languages; set to [] to accept any two-letter code
const allowedLangs = ["en", "ru", "es", "fr"]; // or []

const isTwoLetter = (s) => /^[a-z]{2}$/i.test(s);
const isAllowedLang = (s) =>
  isTwoLetter(s) && (allowedLangs.length === 0 || allowedLangs.includes(s));

/**
 * Recursively find all language leaf folders that match:
 * cards/<category>/[<theme>/]<deck>/<lang>/
 */
function* findLangDirs(startDir) {
  if (!fs.existsSync(startDir)) return;

  const entries = fs.readdirSync(startDir, { withFileTypes: true });

  // If current folder name itself is a lang folder, yield and stop descending
  const base = path.basename(startDir);
  if (isAllowedLang(base)) {
    yield startDir;
    return; // don't descend further
  }

  // Otherwise, walk children
  for (const e of entries) {
    if (e.isDirectory()) {
      yield* findLangDirs(path.join(startDir, e.name));
    }
  }
}

/** Build index.json within a single <lang> folder */
function buildIndexForLangDir(langDir) {
  const files = fs.readdirSync(langDir);

  // Pair card fronts/backs like card1_front.webp / card1_back.webp
  const cardMap = {};
  for (const file of files) {
    const m = file.match(/^(card\d+)_(front|back)\.webp$/i);
    if (!m) continue;
    const [, id, side] = m;
    if (!cardMap[id]) cardMap[id] = { id };
    cardMap[id][side] = file;
  }

  const cards = Object.values(cardMap).sort((a, b) => {
    const na = parseInt(a.id.replace("card", ""), 10) || 0;
    const nb = parseInt(b.id.replace("card", ""), 10) || 0;
    return na - nb;
  });

  const hasInstructionsJson = fs.existsSync(
    path.join(langDir, "instructions.json")
  );

  const output = {
    instructionsPath: hasInstructionsJson ? "instructions.json" : null,
    cards,
  };

  const indexPath = path.join(langDir, "index.json");
  fs.writeFileSync(indexPath, JSON.stringify(output, null, 2));
  const rel = path.relative(root, langDir) || path.basename(langDir);
  console.log(`✅ index.json written for '${rel}' with ${cards.length} cards.`);
}

function main() {
  if (!fs.existsSync(root)) {
    console.error("cards/ folder not found:", root);
    process.exit(1);
  }

  let count = 0;
  for (const langDir of findLangDirs(root)) {
    buildIndexForLangDir(langDir);
    count++;
  }

  if (count === 0) {
    console.warn(
      "No language folders found. Expected structure like cards/<category>/[theme]/<deck>/<lang>/"
    );
  } else {
    console.log(`\n🎉 Rebuilt indexes for ${count} language folder(s).`);
  }
}

main();
