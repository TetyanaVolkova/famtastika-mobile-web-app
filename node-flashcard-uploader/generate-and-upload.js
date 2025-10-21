/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const sharp = require("sharp");
const AWS = require("aws-sdk");

// ====== CONFIG ======
const rootDir = path.join(__dirname, "cards");
const bucketName = "famtastika-cards";
const region = "us-east-1";
const PDF_DPI = 300;
const WEBP_WIDTH = 500;
const WEBP_QUALITY = 60;

// Keep instruction images alongside JSON
const KEEP_INSTRUCTION_IMAGES = true;
// ====================

AWS.config.update({ region });
const s3 = new AWS.S3();

const NAME_RE =
  /^([a-z0-9-]+)_(?:([a-z0-9-]+)_)?([a-z0-9-]+)_([a-z]{2})\.pdf$/i;

// Find all matching PDFs at cards/ root
const pdfs = fs
  .readdirSync(rootDir)
  .filter((f) => f.toLowerCase().endsWith(".pdf") && NAME_RE.test(f));

// ---------- helpers ----------
function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

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

function normalizeText(s) {
  if (!s) return "";
  return s
    .replace(/\r/g, "")
    .replace(/-\n/g, "") // join hyphenated line breaks
    .replace(/[ \t]+\n/g, "\n") // trim trailing spaces on lines
    .replace(/\n{3,}/g, "\n\n") // collapse big gaps
    .trim();
}

// Extract a single page of text using pdftotext (Poppler)
function extractPdfPageText(pdfPath, pageNum) {
  try {
    const cmd = `pdftotext -f ${pageNum} -l ${pageNum} -enc UTF-8 -q "${pdfPath}" -`;
    const buf = execSync(cmd, { maxBuffer: 10 * 1024 * 1024 });
    return buf.toString("utf8");
  } catch (e) {
    console.warn(`⚠️  pdftotext failed for page ${pageNum}:`, e.message || e);
    return "";
  }
}

// Build instructions.json from PDF pages 1 & 2
function buildInstructionsJson(pdfPath, langFolder) {
  const titleRaw = extractPdfPageText(pdfPath, 1);
  const descRaw = extractPdfPageText(pdfPath, 2);

  const title = normalizeText(titleRaw).split(/\n+/).find(Boolean) || "";
  const description = normalizeText(descRaw);

  const payload = { title, description };
  const out = path.join(langFolder, "instructions.json");
  fs.writeFileSync(out, JSON.stringify(payload, null, 2), "utf8");
  console.log(`📝 instructions.json written`);
}

// ---------- core steps ----------
function cleanLangFolder(langFolder) {
  const keep = new Set(["instructions.json"]);
  if (!fs.existsSync(langFolder)) {
    ensureDir(langFolder);
    return;
  }
  for (const file of fs.readdirSync(langFolder)) {
    if (!keep.has(file)) fs.unlinkSync(path.join(langFolder, file));
  }
}

function pdfToPng(inputPdfPath, outputFolder) {
  ensureDir(outputFolder);
  const out = path.join(outputFolder, "page");
  const cmd = `pdftocairo -png -r ${PDF_DPI} "${inputPdfPath}" "${out}"`;
  execSync(cmd, { stdio: "inherit" });
}

async function pngsToWebp(outputFolder) {
  const pngFiles = fs
    .readdirSync(outputFolder)
    .filter((f) => f.endsWith(".png") && f.startsWith("page-"))
    .sort(
      (a, b) =>
        parseInt(a.match(/page-(\d+)/)?.[1] || "0", 10) -
        parseInt(b.match(/page-(\d+)/)?.[1] || "0", 10)
    );

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

function renameAndIndex(langFolder) {
  const files = fs
    .readdirSync(langFolder)
    .filter((f) => f.endsWith(".webp") && f.startsWith("page-"))
    .sort(
      (a, b) =>
        parseInt(a.match(/page-(\d+)/)?.[1] || "0", 10) -
        parseInt(b.match(/page-(\d+)/)?.[1] || "0", 10)
    );

  if (files.length < 2)
    throw new Error(`Not enough pages in ${langFolder} to create deck`);

  // First two pages → instruction images (or discard)
  const first = path.join(langFolder, files[0]);
  const second = path.join(langFolder, files[1]);

  if (KEEP_INSTRUCTION_IMAGES) {
    fs.renameSync(first, path.join(langFolder, "instructions_title.webp"));
    fs.renameSync(
      second,
      path.join(langFolder, "instructions_description.webp")
    );
  } else {
    fs.unlinkSync(first);
    fs.unlinkSync(second);
  }

  // Remaining pages: pair as card front/back, starting from page-3
  const index = [];
  let cardIndex = 1;
  for (let i = 2; i < files.length; i += 2) {
    const frontSrc = files[i];
    const backSrc = files[i + 1];
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

  // Only reference instructions.json if it exists
  const hasInstructionsJson = fs.existsSync(
    path.join(langFolder, "instructions.json")
  );
  fs.writeFileSync(
    path.join(langFolder, "index.json"),
    JSON.stringify(
      {
        instructionsPath: hasInstructionsJson ? "instructions.json" : null,
        cards: index,
      },
      null,
      2
    )
  );

  // Defensive cleanup: remove any leftover page-*.webp (shouldn't remain after renames)
  for (const f of fs.readdirSync(langFolder)) {
    if (/^page-\d+\.webp$/i.test(f)) {
      try {
        fs.unlinkSync(path.join(langFolder, f));
      } catch {}
    }
  }
}

function buildDestPath({ category, theme, deck, lang }) {
  const safe = (s) => s.toLowerCase();
  const parts = [rootDir, safe(category)];
  if (theme) parts.push(safe(theme));
  parts.push(safe(deck), safe(lang));
  return path.join(...parts);
}

// ---------- catalog builder ----------
function buildCatalog(root = rootDir) {
  const categories = [];

  for (const category of listDirs(root).sort()) {
    const categoryPath = path.join(root, category);
    const firstLevel = listDirs(categoryPath).sort();
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

    const looksLikeDeckLevel = firstLevel.some((name) => {
      const maybeDeckPath = path.join(categoryPath, name);
      return listDirs(maybeDeckPath).some(isTwoLetterLang);
    });

    if (looksLikeDeckLevel) {
      for (const deck of firstLevel) {
        const langs = listDirs(path.join(categoryPath, deck))
          .filter(isTwoLetterLang)
          .sort();
        catEntry.decks.push({
          id: deck,
          label: titleCase(deck),
          languages: langs,
        });
      }
    } else {
      for (const theme of firstLevel) {
        const themePath = path.join(categoryPath, theme);
        const deckNames = listDirs(themePath).sort();
        const decks = deckNames.map((deck) => {
          const langs = listDirs(path.join(themePath, deck))
            .filter(isTwoLetterLang)
            .sort();
          return { id: deck, label: titleCase(deck), languages: langs };
        });
        catEntry.themes.push({ id: theme, label: titleCase(theme), decks });
      }
    }

    categories.push(catEntry);
  }

  const catalog = { basePath: "cards", categories };
  const outPath = path.join(root, "catalog.json");
  fs.writeFileSync(outPath, JSON.stringify(catalog, null, 2));
  console.log(`🗂 catalog.json written`);
  return outPath;
}

// ---------- S3 upload ----------
async function uploadFile(localPath, s3Key) {
  const ext = path.extname(localPath).toLowerCase();
  const contentType =
    ext === ".webp"
      ? "image/webp"
      : ext === ".json"
      ? "application/json"
      : "application/octet-stream";
  const cacheControl =
    ext === ".json" ? "no-cache" : "public, max-age=31536000, immutable";
  const fileContent = fs.readFileSync(localPath);

  await s3
    .putObject({
      Bucket: bucketName,
      Key: s3Key,
      Body: fileContent,
      ContentType: contentType,
      CacheControl: cacheControl,
    })
    .promise();

  console.log(`↑ Uploaded: ${s3Key}`);
}

async function uploadAllCards() {
  const allFiles = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(webp|json)$/i.test(entry.name)) allFiles.push(full);
    }
  }
  walk(rootDir);

  for (const file of allFiles) {
    const rel = path.relative(rootDir, file).replace(/\\/g, "/");
    const key = `cards/${rel}`;
    await uploadFile(file, key);
  }

  console.log(
    `✅ Uploaded ${allFiles.length} files to s3://${bucketName}/cards/`
  );
}

// ---------- main ----------
async function processPdf(pdfFile) {
  const match = pdfFile.match(NAME_RE);
  if (!match) return;

  const [, category, themeMaybe, deck, lang] = match;
  const details = { category, theme: themeMaybe || null, deck, lang };
  const pdfPath = path.join(rootDir, pdfFile);
  const langFolder = buildDestPath(details);

  console.log(
    `\n📦 Deck: ${details.category}${
      details.theme ? "/" + details.theme : ""
    }/${details.deck} [${details.lang}]`
  );

  ensureDir(langFolder);
  cleanLangFolder(langFolder);

  // Build instructions.json from PDF (pages 1 & 2)
  buildInstructionsJson(pdfPath, langFolder);

  // Images
  pdfToPng(pdfPath, langFolder);
  await pngsToWebp(langFolder);
  renameAndIndex(langFolder);

  console.log(`✅ Done: ${pdfFile}`);
}

// ---------- orchestrate ----------
(async () => {
  if (pdfs.length) console.log(`Found ${pdfs.length} deck PDF(s).`);
  for (const pdf of pdfs) {
    try {
      await processPdf(pdf);
    } catch (err) {
      console.error(`❌ Failed for ${pdf}:`, err?.message || err);
    }
  }

  // Always rebuild catalog
  buildCatalog();

  // Upload everything (cards + catalog)
  await uploadAllCards();

  console.log("\n🎉 All decks processed and uploaded!");
})();
