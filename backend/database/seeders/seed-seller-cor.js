import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import sharp from "sharp";
import { uploadToB2, isB2Configured } from "../../utils/b2Storage.js";

dotenv.config({ path: fileURLToPath(new URL("../../.env", import.meta.url)), quiet: true });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COR_IMAGES_DIR = path.resolve(__dirname, "images", "cor");
const COR_UPLOAD_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "uploads",
  "seller",
  "uploadCOR",
);
const ALLOWED_IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function parseCliArgs(argv = process.argv.slice(2)) {
  const options = {
    url: "",
    studentIds: [],
    limit: 10,
    dryRun: false,
    local: false,
    force: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--local") {
      options.local = true;
    } else if (arg === "--force") {
      options.force = true;
    } else if (arg.startsWith("--limit=")) {
      const parsed = Number(arg.slice("--limit=".length));
      if (Number.isSafeInteger(parsed) && parsed > 0) options.limit = parsed;
    } else if (arg.startsWith("--url=")) {
      options.url = arg.slice("--url=".length).trim();
    } else if (arg === "--url" && argv[i + 1]) {
      options.url = argv[i + 1].trim();
      i += 1;
    } else if (arg.startsWith("--student-ids=")) {
      options.studentIds = arg
        .slice("--student-ids=".length)
        .split(",")
        .map((id) => Number(id.trim()))
        .filter((id) => Number.isSafeInteger(id) && id > 0);
    } else if (!arg.startsWith("--") && !options.url) {
      options.url = arg.trim();
    }
  }

  return options;
}

function buildConnectionConfigFromUrl(connectionUrl) {
  const parsed = new URL(connectionUrl.trim());
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username || "root"),
    password: decodeURIComponent(parsed.password || ""),
    database: parsed.pathname.replace(/^\//, ""),
    multipleStatements: false,
  };
}

async function resolveDbConnection(options) {
  const envUrl = options.local
    ? ""
    : (process.env.MYSQL_PUBLIC_URL || process.env.MYSQL_URL || process.env.DATABASE_URL || "").trim();
  const candidateUrl = options.url || envUrl;

  if (candidateUrl.startsWith("mysql://")) {
    const cfg = buildConnectionConfigFromUrl(candidateUrl);
    const connection = await mysql.createConnection(cfg);
    return { connection, target: `${cfg.host}:${cfg.port}/${cfg.database}` };
  }

  if (process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME) {
    const cfg = {
      host: process.env.DB_HOST.trim(),
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
      user: process.env.DB_USER.trim(),
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME.trim(),
    };
    const connection = await mysql.createConnection(cfg);
    return { connection, target: `${cfg.host}:${cfg.port}/${cfg.database}` };
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (
      await rl.question("Paste MYSQL_PUBLIC_URL (mysql://root:...@host:port/railway): ")
    ).trim();
    if (!answer.startsWith("mysql://")) {
      throw new Error("Invalid or missing mysql:// connection URL.");
    }
    const cfg = buildConnectionConfigFromUrl(answer);
    const connection = await mysql.createConnection(cfg);
    return { connection, target: `${cfg.host}:${cfg.port}/${cfg.database}` };
  } finally {
    rl.close();
  }
}

function loadCorImagePaths() {
  if (!fs.existsSync(COR_IMAGES_DIR)) {
    throw new Error(`COR images folder not found: ${COR_IMAGES_DIR}`);
  }
  const files = fs
    .readdirSync(COR_IMAGES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && ALLOWED_IMAGE_EXTS.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => path.join(COR_IMAGES_DIR, entry.name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

  if (!files.length) {
    throw new Error(`No COR images found in ${COR_IMAGES_DIR}`);
  }
  return files;
}

async function processAndStoreCorImage(studentId, sourceImagePath) {
  const fileName = `seed-cor-${studentId}-${Date.now()}.webp`;
  const compressed = await sharp(sourceImagePath, { failOn: "error" })
    .rotate()
    .webp({ quality: 90 })
    .toBuffer();

  if (isB2Configured()) {
    await uploadToB2({
      key: `app-uploads/seller/uploadCOR/${fileName}`,
      body: compressed,
      contentType: "image/webp",
    });
  }

  await fs.promises.mkdir(COR_UPLOAD_DIR, { recursive: true });
  await fs.promises.writeFile(path.join(COR_UPLOAD_DIR, fileName), compressed);

  return fileName;
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2));
  const corImages = loadCorImagePaths();
  const { connection, target } = await resolveDbConnection(options);

  try {
    console.log(
      `Connected to MySQL: ${target} | B2: ${isB2Configured() ? "enabled" : "local-only"}${options.dryRun ? " [DRY RUN]" : ""}`,
    );

    let sql;
    const params = [];
    if (options.studentIds.length > 0) {
      sql = `
        SELECT
          s.student_id,
          s.first_name,
          s.last_name,
          s.student_number,
          s.cor,
          COUNT(a.artwork_id) AS artwork_count
        FROM student s
        LEFT JOIN artwork a ON a.student_id = s.student_id
        WHERE s.student_id IN (${options.studentIds.map(() => "?").join(", ")})
        GROUP BY s.student_id
        ORDER BY artwork_count DESC, s.student_id ASC
      `;
      params.push(...options.studentIds);
    } else {
      sql = `
        SELECT
          s.student_id,
          s.first_name,
          s.last_name,
          s.student_number,
          s.cor,
          COUNT(a.artwork_id) AS artwork_count
        FROM student s
        INNER JOIN artwork a ON a.student_id = s.student_id
        GROUP BY s.student_id
        ORDER BY artwork_count DESC, s.student_id ASC
        LIMIT ?
      `;
      params.push(options.limit);
    }

    const [students] = await connection.query(sql, params);
    if (!students.length) {
      console.log("No matching students with artworks found.");
      return;
    }

    const targets = options.force
      ? students
      : students.filter((student) => !String(student.cor || "").trim());

    const plan = targets.map((student, index) => {
      const sourcePath = corImages[index % corImages.length];
      return {
        studentId: student.student_id,
        name: `${student.first_name || ""} ${student.last_name || ""}`.trim(),
        studentNumber: student.student_number,
        artworkCount: Number(student.artwork_count || 0),
        previousCor: student.cor || null,
        sourceFile: path.basename(sourcePath),
        sourcePath,
      };
    });

    console.log(
      JSON.stringify(
        {
          matchedAccountsWithArtworks: students.length,
          alreadyHasCorSkipped: students.length - targets.length,
          toUpdate: plan.length,
          availableCorImages: corImages.map((p) => path.basename(p)),
          preview: plan.map(({ sourcePath, ...rest }) => rest),
        },
        null,
        2,
      ),
    );

    if (options.dryRun || !plan.length) {
      if (!plan.length) {
        console.log("All target students already have COR images. Use --force to overwrite.");
      } else {
        console.log("Dry run complete — no files or database rows were modified.");
      }
      return;
    }

    const updated = [];
    for (const item of plan) {
      const savedFilename = await processAndStoreCorImage(item.studentId, item.sourcePath);
      await connection.query(
        "UPDATE student SET cor = ? WHERE student_id = ?",
        [savedFilename, item.studentId],
      );
      updated.push({
        studentId: item.studentId,
        name: item.name,
        artworkCount: item.artworkCount,
        sourceFile: item.sourceFile,
        cor: savedFilename,
      });
    }

    console.log("\nSeller COR seeding complete:");
    console.table(updated);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("Seller COR seeder failed:", error.message || error);
  process.exitCode = 1;
});
