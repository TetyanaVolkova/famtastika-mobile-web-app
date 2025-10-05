const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const sharp = require("sharp");

const rootDir = path.join(__dirname, "cards");

// Get all PDF files named like mighty_dad_en.pdf, mighty_dad_ru.pdf, etc.
const pdfs = fs
  .readdirSync(rootDir)
  .filter((f) => f.endsWith(".pdf") && f.match(/mighty_dad_(\w+)\.pdf/i));

// Clean language folder but keep instructions.json
function cleanFolder(folder) {
  const filesToKeep = ["instructions.json"];
  if (fs.existsSync(folder)) {
    fs.readdirSync(folder).forEach((file) => {
      if (!filesToKeep.includes(file)) {
        fs.unlinkSync(path.join(folder, file));
      }
    });
  } else {
    fs.mkdirSync(folder, { recursive: true });
  }
}

// Convert PDF to PNG using pdftocairo
function convertPdfToPng(inputPdfPath, outputFolder) {
  const cmd = `pdftocairo -png -r 300 "${inputPdfPath}" "${path.join(
    outputFolder,
    "page"
  )}"`;
  execSync(cmd, { stdio: "inherit" });
}

// Convert PNGs to WebP using sharp
async function convertPngToWebp(outputFolder) {
  const pngFiles = fs
    .readdirSync(outputFolder)
    .filter((f) => f.endsWith(".png") && f.startsWith("page-"))
    .sort((a, b) => {
      const aNum = parseInt(a.match(/page-(\d+)/)?.[1] || "0", 10);
      const bNum = parseInt(b.match(/page-(\d+)/)?.[1] || "0", 10);
      return aNum - bNum;
    });

  for (const png of pngFiles) {
    const pngPath = path.join(outputFolder, png);
    const webpPath = pngPath.replace(".png", ".webp");
    await sharp(pngPath)
      .resize({ width: 800 }) // or 600/700 depending on the card size
      .webp({ quality: 80 }) // adjust quality for size vs clarity
      .toFile(webpPath);

    fs.unlinkSync(pngPath);
  }
}

// Rename and build index.json, skip instructions.json creation
function renameAndBuildIndex(langFolder) {
  const files = fs
    .readdirSync(langFolder)
    .filter((f) => f.endsWith(".webp") && f.startsWith("page-"))
    .sort((a, b) => {
      const aNum = parseInt(a.match(/page-(\d+)/)?.[1] || "0", 10);
      const bNum = parseInt(b.match(/page-(\d+)/)?.[1] || "0", 10);
      return aNum - bNum;
    });

  if (files.length < 2) throw new Error("Not enough pages");

  // First two pages are instruction images
  fs.renameSync(
    path.join(langFolder, files[0]),
    path.join(langFolder, "instructions_title.webp")
  );
  fs.renameSync(
    path.join(langFolder, files[1]),
    path.join(langFolder, "instructions_description.webp")
  );

  // The rest are cards
  const index = [];
  let cardIndex = 1;

  for (let i = 2; i < files.length; i += 2) {
    const front = `card${cardIndex}_front.webp`;
    const back = `card${cardIndex}_back.webp`;

    if (files[i] && files[i + 1]) {
      fs.renameSync(
        path.join(langFolder, files[i]),
        path.join(langFolder, front)
      );
      fs.renameSync(
        path.join(langFolder, files[i + 1]),
        path.join(langFolder, back)
      );

      index.push({ id: `card${cardIndex}`, front, back });
      cardIndex++;
    }
  }

  // Create index.json (instructions.json already exists)
  fs.writeFileSync(
    path.join(langFolder, "index.json"),
    JSON.stringify(
      { instructionsPath: "instructions.json", cards: index },
      null,
      2
    )
  );
}

// Main process
(async () => {
  for (const pdf of pdfs) {
    const match = pdf.match(/mighty_dad_(\w+)\.pdf/i);
    const lang = match[1];
    const pdfPath = path.join(rootDir, pdf);
    const outputFolder = path.join(rootDir, lang);

    console.log(`\n🌐 Processing language: ${lang}`);
    cleanFolder(outputFolder);
    convertPdfToPng(pdfPath, outputFolder);
    await convertPngToWebp(outputFolder);
    renameAndBuildIndex(outputFolder);
    console.log(`✅ Done: ${lang}`);
  }

  console.log("\n🎉 All languages processed!");
})();

// This script loops through all matching PDF files like mighty_dad_en.pdf, mighty_dad_ru.pdf, etc., and automatically:

// 1. Detects the language from the filename.

// 2. Converts the PDF pages to WebP.

// 3. Creates the instructions.json and index.json for each language.

// 4. Saves everything to the appropriate cards/{lang} folder.
