/**
 * sortPhotos.js
 * ---------------------------------------------------------------
 * Sorts newly-added dog photos (from one or more "FOTOS N" folders,
 * named like "Breed Name x Author.jpg") into the correct breed
 * subfolder under public/perros, renumbering them to continue after
 * whatever's already there, and merges the result into
 * imagenesLocales.json.
 *
 * USAGE
 *   1. Drop your new photo folders (e.g. "FOTOS 1", "FOTOS 2") into
 *      the project root (or edit SOURCE_DIRS below to point at them).
 *   2. From the project root, run:
 *          node sortPhotos.js
 *   3. Check the console summary + the two report files it writes:
 *          sort-report-added.json     -> what got filed where
 *          sort-report-review.json    -> anything it couldn't place
 *                                        confidently (best guess + score)
 *   4. For anything in sort-report-review.json, move the file into
 *      public/perros/<BREED>/ by hand and re-run with SKIP_EXISTING
 *      handling (default) so it just adds the leftovers next time.
 *
 * Nothing is deleted or overwritten: existing photos and existing
 * imagenesLocales.json entries are left alone; new entries are appended.
 * ---------------------------------------------------------------
 */

const fs = require("fs");
const path = require("path");

// ── CONFIG ─────────────────────────────────────────────────────
const SOURCE_DIRS = ["FOTOS 1", "FOTOS 2"]; // adjust/add paths as needed
const PERROS_DIR = path.join("public", "perros");
const MANIFEST_PATH = path.join("src", "imagenesLocales.json");
const RAZAS_PATH = path.join("src", "razas.json"); // optional, used as a matching aid
const BREED_MAP_PATH = path.join("src", "BREED_NAME_MAP.js"); // optional, used as a matching aid
const AUTO_ACCEPT_THRESHOLD = 0.8; // below this, file goes to the review list instead of being copied
// ────────────────────────────────────────────────────────────────

// ---- string normalization helpers ----
function stripAccents(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function norm(s) {
  return stripAccents(s)
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

// ---- Levenshtein-ratio style similarity (simple, dependency-free) ----
function similarity(a, b) {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  const dist = dp[m][n];
  return 1 - dist / Math.max(m, n);
}

// ---- known tricky cases (confirmed by testing against real filenames) ----
// normalized hint -> exact folder name
const ALIASES = {
  "akbash dog": "AKBASH SHEPHERD DOG (NO ACEPTADA FCI)*",
  "aksaray malaklisi dog": "AKSARAY MALAKI DOG (NO ACEPTADA FCI)*",
  "basset d artois": "BASSET D'ARTOIS",
  "braco fraces tipo pirineos": "BRACO FRANCES - TIPO PIRINEOS",
  "braco frances tipo pirineos": "BRACO FRANCES - TIPO PIRINEOS",
  "braco hungaro pc": "BRACO HUNGARO DE PELO CORTO",
  "cocker spnaiel": "COCKER SPANIEL INGLES",
  "galgo afgano": "AFGAN HOUND",
  "irish soft c w t": "IRISH SOFT COATED WHEATEN TERRIER",
  "pastor belga groenendael": "PERRO DE PASTOR BELGA",
  "pastor belga lakenois": "PERRO DE PASTOR BELGA",
  "pastor belga malinois": "PERRO DE PASTOR BELGA",
  "pastor belga tervuren": "PERRO DE PASTOR BELGA",
  "griffon a poil laineux": "GRIFFON D'ARRET A POIL DUR",
  bobtail: "ANTIGUO PERRO DE PASTOR INGLES",
};

// ---- load candidate breed names: real folders on disk + razas.json + BREED_NAME_MAP ----
function loadCandidates() {
  const candidates = []; // { norm, folder }
  const seenFolders = new Set();

  // 1) Real folders already on disk (ground truth for what exists)
  if (fs.existsSync(PERROS_DIR)) {
    for (const entry of fs.readdirSync(PERROS_DIR, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        candidates.push({ norm: norm(entry.name), folder: entry.name });
        seenFolders.add(entry.name);
      }
    }
  }

  // 2) razas.json Spanish names (covers folders not yet created on disk)
  if (fs.existsSync(RAZAS_PATH)) {
    const razas = JSON.parse(fs.readFileSync(RAZAS_PATH, "utf-8"));
    for (const r of razas) {
      if (!seenFolders.has(r.nombre)) {
        candidates.push({ norm: norm(r.nombre), folder: r.nombre });
        seenFolders.add(r.nombre);
      }
    }
  }

  // 3) BREED_NAME_MAP English names (helps match Wikimedia-style filenames)
  if (fs.existsSync(BREED_MAP_PATH)) {
    const src = fs.readFileSync(BREED_MAP_PATH, "utf-8");
    const pairs = [...src.matchAll(/"([^"]+)":\s*"([^"]+)"/g)];
    for (const [, es, en] of pairs) {
      if (seenFolders.has(es)) {
        candidates.push({ norm: norm(en), folder: es });
      }
    }
  }

  return candidates;
}

function extractHintVariants(filename) {
  const base = filename.replace(/\.[^.]+$/, "");
  const variants = new Set();

  const beforeX = base.split(/\s+[xX]\s+/)[0];
  variants.add(beforeX);
  variants.add(beforeX.split(/\s+-\s+/)[0]);
  variants.add(base.split(/\s+-\s+/)[0]);

  // also add versions with trailing numbers stripped (e.g. "Teckel 6" -> "Teckel")
  const stripped = [...variants].map((v) => v.replace(/\s*\d+\s*$/, "").trim());
  stripped.forEach((v) => variants.add(v));

  return [...variants].filter(Boolean);
}

function bestMatch(filename, candidates) {
  const variants = extractHintVariants(filename);

  // 1) alias override takes priority
  for (const v of variants) {
    const key = norm(v);
    if (ALIASES[key]) return { folder: ALIASES[key], score: 1, hint: v };
  }

  // 2) fuzzy match across all variants and candidates
  let best = { folder: null, score: 0, hint: variants[0] || "" };
  for (const v of variants) {
    const h = norm(v);
    if (!h) continue;
    for (const c of candidates) {
      let score = similarity(h, c.norm);
      if (h === c.norm) score = 1;
      else if (h.includes(c.norm) || c.norm.includes(h)) score = Math.max(score, 0.9);
      if (score > best.score) best = { folder: c.folder, score, hint: v };
    }
  }
  return best;
}

function loadManifest() {
  if (fs.existsSync(MANIFEST_PATH)) {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));
  }
  return {};
}

function nextIndexFor(folder, manifest) {
  const existing = manifest[folder] || [];
  let max = 0;
  for (const entry of existing) {
    const m = entry.match(/\/(\d+)\.[a-zA-Z]+$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  // also check disk in case manifest is behind reality
  const dir = path.join(PERROS_DIR, folder);
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir)) {
      const m = f.match(/^(\d+)\.[a-zA-Z]+$/);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
  }
  return max + 1;
}

function main() {
  const candidates = loadCandidates();
  if (candidates.length === 0) {
    console.error(
      "No breed folders/data found. Check PERROS_DIR / RAZAS_PATH / BREED_MAP_PATH paths at the top of this script."
    );
    process.exit(1);
  }

  const manifest = loadManifest();
  const added = {}; // folder -> [added filenames]
  const review = []; // { file, sourceDir, suggestion, score }

  for (const sourceDir of SOURCE_DIRS) {
    if (!fs.existsSync(sourceDir)) {
      console.warn(`Skipping missing source folder: ${sourceDir}`);
      continue;
    }
    const files = fs.readdirSync(sourceDir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));

    for (const file of files) {
      const match = bestMatch(file, candidates);

      if (!match.folder || match.score < AUTO_ACCEPT_THRESHOLD) {
        review.push({
          file,
          sourceDir,
          suggestion: match.folder,
          score: Number(match.score.toFixed(2)),
        });
        continue;
      }

      const targetDir = path.join(PERROS_DIR, match.folder);
      fs.mkdirSync(targetDir, { recursive: true });

      const ext = path.extname(file);
      const idx = nextIndexFor(match.folder, manifest);
      const destName = `${idx}${ext}`;
      const destPath = path.join(targetDir, destName);

      fs.copyFileSync(path.join(sourceDir, file), destPath);

      const manifestKey = `${match.folder}/${destName}`;
      manifest[match.folder] = manifest[match.folder] || [];
      manifest[match.folder].push(manifestKey);

      added[match.folder] = added[match.folder] || [];
      added[match.folder].push(file);
    }
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf-8");
  fs.writeFileSync("sort-report-added.json", JSON.stringify(added, null, 2), "utf-8");
  fs.writeFileSync("sort-report-review.json", JSON.stringify(review, null, 2), "utf-8");

  const totalAdded = Object.values(added).reduce((a, arr) => a + arr.length, 0);
  console.log(`Done.`);
  console.log(`  Added:  ${totalAdded} photos across ${Object.keys(added).length} breed folders`);
  console.log(`  Review: ${review.length} photos need a manual look (see sort-report-review.json)`);
  console.log(`  Manifest updated: ${MANIFEST_PATH}`);
}

main();
