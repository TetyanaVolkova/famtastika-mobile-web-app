// flashcard-uploader/index.js
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const AWS = require("aws-sdk");

const s3 = new AWS.S3({ region: process.env.AWS_REGION || "us-east-1" });

const bucketName = "famtastika-cards";
const root = path.join(__dirname, "cards");

// Accept any two-letter language folder (e.g., en, ru, uk, es, fr, ...)
// If you want to restrict, set allowedLangs = ["en","ru","uk",...]
const allowedLangs = []; // empty = accept any two-letter code
const isTwoLetter = (s) => /^[a-z]{2}$/i.test(s);
const isAllowedLang = (s) =>
  isTwoLetter(s) && (allowedLangs.length === 0 || allowedLangs.includes(s));

function listDirs(p) {
  return fs.existsSync(p)
    ? fs
        .readdirSync(p, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
    : [];
}

// Recursively yield every <lang> folder under cards/
function* findLangDirs(startDir) {
  if (!fs.existsSync(startDir)) return;
  const base = path.basename(startDir);
  if (isAllowedLang(base)) {
    yield startDir;
    return;
  }
  for (const name of listDirs(startDir)) {
    yield* findLangDirs(path.join(startDir, name));
  }
}

// Build index.json from files in a single lang folder
function buildIndexForLangDir(langDir) {
  const files = fs.readdirSync(langDir);
  const cardMap = {};
  for (const f of files) {
    const m = f.match(/^(card\d+)_(front|back)\.webp$/i);
    if (!m) continue;
    const [, id, side] = m;
    if (!cardMap[id]) cardMap[id] = { id };
    cardMap[id][side] = f;
  }
  const cards = Object.values(cardMap).sort((a, b) => {
    const na = parseInt(a.id.replace("card", ""), 10) || 0;
    const nb = parseInt(b.id.replace("card", ""), 10) || 0;
    return na - nb;
  });

  const hasInstructions = fs.existsSync(
    path.join(langDir, "instructions.json")
  );
  const payload = {
    instructionsPath: hasInstructions ? "instructions.json" : null,
    cards,
  };
  const indexPath = path.join(langDir, "index.json");
  fs.writeFileSync(indexPath, JSON.stringify(payload, null, 2));
  return indexPath;
}

function detectContentType(fp) {
  const ext = path.extname(fp).toLowerCase();
  if (ext === ".webp") return "image/webp";
  if (ext === ".json") return "application/json";
  return "application/octet-stream";
}

function cacheControlFor(fp) {
  const ext = path.extname(fp).toLowerCase();
  if (ext === ".json") return "no-cache";
  if (ext === ".webp") return "public, max-age=31536000, immutable";
  return "public, max-age=2592000";
}

async function uploadFile(localPath, s3Key) {
  const Body = fs.readFileSync(localPath);
  const ContentType = detectContentType(localPath);
  const CacheControl = cacheControlFor(localPath);
  await s3
    .putObject({
      Bucket: bucketName,
      Key: s3Key,
      Body,
      ContentType,
      CacheControl,
    })
    .promise();
  console.log("↑", s3Key);
}

async function uploadLangDir(langDir) {
  // 1) Ensure index.json exists/updated
  const indexPath = buildIndexForLangDir(langDir);

  // 2) Upload all .webp and .json files in this lang folder
  const files = fs
    .readdirSync(langDir)
    .filter((f) => /\.(webp|json)$/i.test(f));

  for (const f of files) {
    const localPath = path.join(langDir, f);
    // Preserve full relative path from /cards for the S3 key
    const rel = path.relative(root, localPath);
    const key = `cards/${rel.split(path.sep).join("/")}`;
    await uploadFile(localPath, key);
  }
}

(async function main() {
  if (!fs.existsSync(root)) {
    console.error("cards/ folder not found:", root);
    process.exit(1);
  }

  let count = 0;
  for (const langDir of findLangDirs(root)) {
    const rel = path.relative(root, langDir);
    console.log(`\nProcessing: ${rel}`);
    await uploadLangDir(langDir);
    count++;
  }

  if (count === 0) {
    console.warn(
      "No language folders found. Expected: cards/<category>/[theme]/<deck>/<lang>/"
    );
  } else {
    console.log(`\n✅ Uploaded ${count} language folder(s).`);
  }
})().catch((e) => {
  console.error("Upload failed:", e);
  process.exit(1);
});
