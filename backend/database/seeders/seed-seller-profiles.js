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
const PROFILE_IMAGES_DIR = path.resolve(__dirname, "images", "profile");
const PROFILE_UPLOAD_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "uploads",
  "seller",
  "uploadProfile",
);
const ALLOWED_IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function parseCliArgs(argv = process.argv.slice(2)) {
  const options = {
    url: "",
    studentIds: [],
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

function loadProfileImagePaths() {
  if (!fs.existsSync(PROFILE_IMAGES_DIR)) {
    throw new Error(`Profile images folder not found: ${PROFILE_IMAGES_DIR}`);
  }
  const files = fs
    .readdirSync(PROFILE_IMAGES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && ALLOWED_IMAGE_EXTS.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => path.join(PROFILE_IMAGES_DIR, entry.name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

  if (!files.length) {
    throw new Error(`No profile images found in ${PROFILE_IMAGES_DIR}`);
  }
  return files;
}

async function processAndStoreProfileImage(studentId, sourceImagePath) {
  const fileName = `seed-seller-${studentId}-${Date.now()}.webp`;
  const compressed = await sharp(sourceImagePath, { failOn: "error" })
    .rotate()
    .resize(600, 600, { fit: "cover" })
    .webp({ quality: 90 })
    .toBuffer();

  if (isB2Configured()) {
    await uploadToB2({
      key: `app-uploads/seller/uploadProfile/${fileName}`,
      body: compressed,
      contentType: "image/webp",
    });
  }

  await fs.promises.mkdir(PROFILE_UPLOAD_DIR, { recursive: true });
  await fs.promises.writeFile(path.join(PROFILE_UPLOAD_DIR, fileName), compressed);

  return fileName;
}

const isDefaultOrEmptyProfile = (value) => {
  const trimmed = String(value || "").trim().toLowerCase();
  return !trimmed || trimmed === "profile.jpg";
};

async function main() {
  const options = parseCliArgs(process.argv.slice(2));
  const profileImages = loadProfileImagePaths();
  const { connection, target } = await resolveDbConnection(options);

  try {
    console.log(
      `Connected to MySQL: ${target} | B2: ${isB2Configured() ? "enabled" : "local-only"}${options.dryRun ? " [DRY RUN]" : ""}`,
    );

    let sql = `
      SELECT student_id, first_name, last_name, student_number, profile_image
      FROM student
    `;
    const params = [];
    if (options.studentIds.length > 0) {
      sql += ` WHERE student_id IN (${options.studentIds.map(() => "?").join(", ")})`;
      params.push(...options.studentIds);
    }
    sql += " ORDER BY student_id ASC";

    const [students] = await connection.query(sql, params);
    if (!students.length) {
      console.log("No matching students found.");
      return;
    }

    const targets = options.force
      ? students
      : students.filter((student) => isDefaultOrEmptyProfile(student.profile_image));

    const plan = targets.map((student, index) => {
      const sourcePath = profileImages[index % profileImages.length];
      return {
        studentId: student.student_id,
        name: `${student.first_name || ""} ${student.last_name || ""}`.trim(),
        studentNumber: student.student_number,
        previousImage: student.profile_image || null,
        sourceFile: path.basename(sourcePath),
        sourcePath,
      };
    });

    console.log(
      JSON.stringify(
        {
          totalStudents: students.length,
          alreadyHasProfileSkipped: students.length - targets.length,
          toUpdate: plan.length,
          availableProfileImages: profileImages.map((p) => path.basename(p)),
          preview: plan.map(({ sourcePath, ...rest }) => rest),
        },
        null,
        2,
      ),
    );

    if (options.dryRun || !plan.length) {
      if (!plan.length) {
        console.log("All students already have profile images. Use --force to overwrite.");
      } else {
        console.log("Dry run complete — no files or database rows were modified.");
      }
      return;
    }

    const updated = [];
    for (const item of plan) {
      const savedFilename = await processAndStoreProfileImage(item.studentId, item.sourcePath);
      await connection.query(
        "UPDATE student SET profile_image = ? WHERE student_id = ?",
        [savedFilename, item.studentId],
      );
      updated.push({
        studentId: item.studentId,
        name: item.name,
        sourceFile: item.sourceFile,
        profile_image: savedFilename,
      });
    }

    console.log("\nSeller profile seeding complete:");
    console.table(updated);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("Seller profile seeder failed:", error.message || error);
  process.exitCode = 1;
});
