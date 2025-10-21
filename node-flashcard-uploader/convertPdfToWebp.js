/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const sharp = require("sharp");

// ====== CONFIG ======
const rootDir = path.join(__dirname, "cards");
const PDF_DPI = 300;
const WEBP_WIDTH = 500; // card dimensions
const WEBP_QUALITY = 60; // tweak for size vs clarity
// ====================

// Matches:
// 1) <category>_<theme>_<deck>_<lang>.pdf
// 2) <category>_<deck>_<lang>.pdf  (no theme)
// Allowed tokens: a-z 0-9 and dash (-)
const NAME_RE =
  /^([a-z0-9-]+)_(?:([a-z0-9-]+)_)?([a-z0-9-]+)_([a-z]{2})\.pdf$/i;

// Find all PDFs that match either pattern
const pdfs = fs
  .readdirSync(rootDir)
  .filter((f) => f.toLowerCase().endsWith(".pdf") && NAME_RE.test(f));

if (pdfs.length === 0) {
  console.log("No matching PDFs found in", rootDir);
}

// ---------- helpers ----------
function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

// Shorthand: list only directories within a path
function listDirs(p) {
  return fs.existsSync(p)
    ? fs
        .readdirSync(p, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
    : [];
}

const isTwoLetterLang = (s) => /^[a-z]{2}$/i.test(s);
const titleCase = (s) =>
  s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// Clean a folder but preserve instructions.json
function cleanLangFolder(langFolder) {
  const keep = new Set(["instructions.json"]);
  if (!fs.existsSync(langFolder)) {
    ensureDir(langFolder);
    return;
  }
  for (const file of fs.readdirSync(langFolder)) {
    if (!keep.has(file)) {
      fs.unlinkSync(path.join(langFolder, file));
    }
  }
}

// Convert PDF → PNG via pdftocairo
function pdfToPng(inputPdfPath, outputFolder) {
  ensureDir(outputFolder);
  const out = path.join(outputFolder, "page");
  const cmd = `pdftocairo -png -r ${PDF_DPI} "${inputPdfPath}" "${out}"`;
  execSync(cmd, { stdio: "inherit" });
}

// Convert all generated PNGs → WebP (resized), remove PNGs
async function pngsToWebp(outputFolder) {
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
    const webpPath = pngPath.replace(/\.png$/i, ".webp");
    await sharp(pngPath)
      .resize({ width: WEBP_WIDTH })
      .webp({ quality: WEBP_QUALITY })
      .toFile(webpPath);
    fs.unlinkSync(pngPath);
  }
}

// Rename, pair fronts/backs, and build index.json for a single lang folder
function renameAndIndex(langFolder) {
  const files = fs
    .readdirSync(langFolder)
    .filter((f) => f.endsWith(".webp") && f.startsWith("page-"))
    .sort((a, b) => {
      const aNum = parseInt(a.match(/page-(\d+)/)?.[1] || "0", 10);
      const bNum = parseInt(b.match(/page-(\d+)/)?.[1] || "0", 10);
      return aNum - bNum;
    });

  if (files.length < 2) {
    throw new Error(
      `Not enough pages to allocate instruction images in ${langFolder}`
    );
  }

  // First two pages: instructions (title + description)
  const instrTitle = path.join(langFolder, "instructions_title.webp");
  const instrDesc = path.join(langFolder, "instructions_description.webp");
  fs.renameSync(path.join(langFolder, files[0]), instrTitle);
  fs.renameSync(path.join(langFolder, files[1]), instrDesc);

  // Remaining pages: pair as card front/back
  const index = [];
  let cardIndex = 1;
  for (let i = 2; i < files.length; i += 2) {
    const frontSrc = files[i];
    const backSrc = files[i + 1];

    // If odd final page, skip incomplete pair
    if (!frontSrc || !backSrc) break;

    const front = `card${cardIndex}_front.webp`;
    const back = `card${cardIndex}_back.webp`;

    fs.renameSync(
      path.join(langFolder, frontSrc),
      path.join(langFolder, front)
    );
    fs.renameSync(path.join(langFolder, backSrc), path.join(langFolder, back));

    index.push({ id: `card${cardIndex}`, front, back });
    cardIndex++;
  }

  // Create index.json (keep instructions.json if user maintains it)
  const indexJsonPath = path.join(langFolder, "index.json");
  const payload = {
    instructionsPath: "instructions.json",
    cards: index,
  };
  fs.writeFileSync(indexJsonPath, JSON.stringify(payload, null, 2));
}

// Build the destination path from parsed tokens
// cards/<category>/[<theme>/]<deck>/<lang>/
function buildDestPath({ category, theme, deck, lang }) {
  const safe = (s) => s.toLowerCase();
  const parts = [rootDir, safe(category)];
  if (theme) parts.push(safe(theme));
  parts.push(safe(deck), safe(lang));
  return path.join(...parts);
}

// ---------- catalog.json builder ----------
function buildCatalog(root = rootDir) {
  const categories = [];

  // Sort for stable output
  const catNames = listDirs(root).sort((a, b) => a.localeCompare(b));

  for (const category of catNames) {
    const categoryPath = path.join(root, category);
    const firstLevel = listDirs(categoryPath).sort((a, b) =>
      a.localeCompare(b)
    );

    const catEntry = {
      id: category,
      label: titleCase(category),
      themes: [],
      decks: [],
    };

    if (firstLevel.length === 0) {
      categories.push(catEntry);
      continue;
    }

    // Decide if first level is themes or decks:
    // If any child has a two-letter subfolder inside, that first level is "decks" (no theme).
    const looksLikeDeckLevel = firstLevel.some((name) => {
      const maybeDeckPath = path.join(categoryPath, name);
      return listDirs(maybeDeckPath).some(isTwoLetterLang);
    });

    if (looksLikeDeckLevel) {
      // Structure: cards/<category>/<deck>/<lang>/
      for (const deck of firstLevel) {
        const langs = listDirs(path.join(categoryPath, deck))
          .filter(isTwoLetterLang)
          .sort((a, b) => a.localeCompare(b));
        catEntry.decks.push({
          id: deck,
          label: titleCase(deck),
          languages: langs,
        });
      }
    } else {
      // Structure: cards/<category>/<theme>/<deck>/<lang>/
      for (const theme of firstLevel) {
        const themePath = path.join(categoryPath, theme);
        const deckNames = listDirs(themePath).sort((a, b) =>
          a.localeCompare(b)
        );
        const decks = deckNames.map((deck) => {
          const langs = listDirs(path.join(themePath, deck))
            .filter(isTwoLetterLang)
            .sort((a, b) => a.localeCompare(b));
          return { id: deck, label: titleCase(deck), languages: langs };
        });
        catEntry.themes.push({
          id: theme,
          label: titleCase(theme),
          decks,
        });
      }
    }

    categories.push(catEntry);
  }

  const catalog = { basePath: "cards", categories };
  const outPath = path.join(root, "catalog.json");
  fs.writeFileSync(outPath, JSON.stringify(catalog, null, 2));
  console.log(`🗂️  catalog.json written at ${outPath}`);
}

// ---------- main pipeline for one PDF ----------
async function processPdf(pdfFile) {
  const match = pdfFile.match(NAME_RE);
  if (!match) return;

  const [, category, themeMaybe, deck, lang] = match;
  const details = {
    category,
    theme: themeMaybe || null,
    deck,
    lang,
  };

  const pdfPath = path.join(rootDir, pdfFile);
  const langFolder = buildDestPath(details);

  console.log(
    `\n📦 Deck: ${details.category}${
      details.theme ? "/" + details.theme : ""
    }/${details.deck} [${details.lang}]`
  );
  console.log("   →", langFolder);

  // 1) Prepare folder (preserve instructions.json)
  ensureDir(langFolder);
  cleanLangFolder(langFolder);

  // 2) PDF → PNG
  pdfToPng(pdfPath, langFolder);

  // 3) PNG → WebP
  await pngsToWebp(langFolder);

  // 4) Rename + index
  renameAndIndex(langFolder);

  console.log(`✅ Done: ${pdfFile}`);
}

// ---------- orchestrate ----------
(async () => {
  if (pdfs.length) {
    console.log(`Found ${pdfs.length} deck PDF(s).`);
  }
  for (const pdf of pdfs) {
    try {
      await processPdf(pdf);
    } catch (err) {
      console.error(`❌ Failed for ${pdf}:`, err?.message || err);
    }
  }

  // Always (re)build catalog from the final folder structure
  try {
    buildCatalog();
  } catch (e) {
    console.error("Failed to build catalog.json:", e?.message || e);
  }

  console.log("\n🎉 All decks processed!");
})();
