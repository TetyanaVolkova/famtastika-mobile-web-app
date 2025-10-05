// flashcard-uploader/index.js

const fs = require("fs");
const path = require("path");
const AWS = require("aws-sdk");

const s3 = new AWS.S3();

const bucketName = "famtastika-cards";
const localRoot = path.join(__dirname, "cards");
const supportedLanguages = fs.readdirSync(localRoot);

// Helper to extract card image info from file names
function getCardIndexForLang(langPath) {
  const files = fs.readdirSync(langPath);
  const cards = {};

  files.forEach((file) => {
    const match = file.match(/(card\d+)_(front|back)\.webp$/);
    if (!match) return;
    const [_, id, side] = match;
    if (!cards[id]) cards[id] = { id };
    cards[id][side] = file;
  });

  return Object.values(cards);
}

// Upload a single file to S3
async function uploadFileToS3(filePath, key) {
  const fileContent = fs.readFileSync(filePath);
  const params = {
    Bucket: bucketName,
    Key: key,
    Body: fileContent,
    ContentType: key.endsWith(".webp") ? "image/webp" : "application/json",
    CacheControl: "public, max-age=2592000", // 30 days
  };

  await s3.putObject(params).promise();
  console.log(`✅ Uploaded: ${key}`);
}

// Main build and upload function
async function buildAndUpload() {
  for (const lang of supportedLanguages) {
    const langPath = path.join(localRoot, lang);
    if (!fs.lstatSync(langPath).isDirectory()) continue;

    const index = getCardIndexForLang(langPath);

    const instructionsFile = "instructions.json";
    const instructionsPath = path.join(langPath, instructionsFile);
    const hasInstructions = fs.existsSync(instructionsPath);

    const indexWithInstructions = {
      instructionsPath: hasInstructions ? instructionsFile : null,
      cards: index,
    };

    const indexPath = path.join(langPath, "index.json");
    fs.writeFileSync(indexPath, JSON.stringify(indexWithInstructions, null, 2));

    // Upload index.json
    await uploadFileToS3(indexPath, `cards/${lang}/index.json`);

    // Upload instructions.json if it exists
    if (hasInstructions) {
      await uploadFileToS3(
        instructionsPath,
        `cards/${lang}/${instructionsFile}`
      );
    }

    // Upload card images
    for (const card of index) {
      for (const side of ["front", "back"]) {
        const fileName = card[side];
        const filePath = path.join(langPath, fileName);
        const key = `cards/${lang}/${fileName}`;
        await uploadFileToS3(filePath, key);
      }
    }
  }
}

buildAndUpload().catch(console.error);
