import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

dotenv.config({ path: fileURLToPath(new URL("../../.env", import.meta.url)), quiet: true });
import sharp from "sharp";
import { uploadToB2, isB2Configured } from "../../utils/b2Storage.js";
import { encryptPayoutAccount } from "../../utils/payoutAccount.js";
import { listPayoutInstitutions } from "../../utils/payoutProvider.js";
import { payoutAccountTableSql } from "../payouts.js";
import { compressArtworkImage } from "../../utils/compressArtworkImage.js";
import {
  baseNameOf,
  writeArtworkSource,
  writeDerivatives,
} from "../../utils/artworkStorage.js";
import {
  normalizeArtworkProductSettings,
  resolveArtworkDetails,
} from "../../utils/artworkDetails.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SEED_ASSETS_ROOT = path.resolve(__dirname, "images");
const PROFILE_UPLOAD_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "uploads",
  "seller",
  "uploadProfile",
);
const ALLOWED_IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const DEFAULT_SEED_SELLER_PASSWORD = process.env.SEED_SELLER_PASSWORD || "ArtMatch@2026";
const DEFAULT_SEED_GCASH_NUMBER = "999999990001";
const DEFAULT_GCASH_INSTITUTION = Object.freeze({
  code: "GXCHPHM2XXX",
  name: "G-Xchange, Inc. (GCash Demo)",
  provider: "instapay",
  destinationType: "ewallet",
});

export function parseSeedCliArgs(argv = process.argv.slice(2), defaults = {}) {
  const options = {
    url: "",
    studentIds: [],
    offset: Number.isSafeInteger(defaults.offset) && defaults.offset >= 0 ? defaults.offset : 0,
    artworksPerSeller: defaults.artworksPerSeller || 20,
    dryRun: false,
    sellerPassword: DEFAULT_SEED_SELLER_PASSWORD,
    sellerPasswordExplicit: false,
    gcashNumber: DEFAULT_SEED_GCASH_NUMBER,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") {
      options.dryRun = true;
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
    } else if (arg.startsWith("--offset=")) {
      const parsed = Number(arg.slice("--offset=".length));
      if (Number.isSafeInteger(parsed) && parsed >= 0) options.offset = parsed;
    } else if (arg.startsWith("--artworks=")) {
      const parsed = Number(arg.slice("--artworks=".length));
      if (Number.isSafeInteger(parsed) && parsed > 0) options.artworksPerSeller = parsed;
    } else if (arg.startsWith("--seller-password=")) {
      const value = arg.slice("--seller-password=".length).trim();
      if (value.length >= 8) {
        options.sellerPassword = value;
        options.sellerPasswordExplicit = true;
      }
    } else if (arg.startsWith("--gcash=")) {
      const value = arg.slice("--gcash=".length).trim();
      if (/^\d{6,34}$/.test(value)) options.gcashNumber = value;
    } else if (!arg.startsWith("--") && !options.url) {
      options.url = arg.trim();
    }
  }

  return options;
}

function buildConnectionConfig(connectionUrl) {
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

export async function resolveDbConnection(cliUrl = "") {
  const candidate = cliUrl || process.env.MYSQL_PUBLIC_URL || process.env.MYSQL_URL || "";
  if (candidate.startsWith("mysql://")) {
    return mysql.createConnection(buildConnectionConfig(candidate));
  }

  if (process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME) {
    return mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME,
    });
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (
      await rl.question("Paste MYSQL_PUBLIC_URL (mysql://root:...@host:port/railway): ")
    ).trim();
    if (!answer.startsWith("mysql://")) {
      throw new Error("Invalid or missing mysql:// connection URL.");
    }
    return mysql.createConnection(buildConnectionConfig(answer));
  } finally {
    rl.close();
  }
}

export function scanSellerAssetFolder(folderRelativePath) {
  const folderPath = path.join(SEED_ASSETS_ROOT, folderRelativePath);
  if (!fs.existsSync(folderPath)) {
    return { folderPath, artworkImages: [], profileImage: null };
  }

  const artworkImages = [];
  let profileImage = null;

  const walkDir = (currentDir, isRoot = true) => {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath, false);
        continue;
      }
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (!ALLOWED_IMAGE_EXTS.has(ext)) continue;

      if (isRoot && path.parse(entry.name).name.toLowerCase() === "profile") {
        profileImage = fullPath;
      } else {
        artworkImages.push(fullPath);
      }
    }
  };

  walkDir(folderPath, true);
  artworkImages.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
  return { folderPath, artworkImages, profileImage };
}

async function processAndStoreProfileImage(studentId, profileImagePath) {
  const fileName = `seed-seller-${studentId}-${Date.now()}.webp`;
  const compressed = await sharp(profileImagePath, { failOn: "error" })
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
  } else {
    await fs.promises.mkdir(PROFILE_UPLOAD_DIR, { recursive: true });
    await fs.promises.writeFile(path.join(PROFILE_UPLOAD_DIR, fileName), compressed);
  }

  return fileName;
}

async function processAndStoreArtworkImage(studentId, index, sourcePath, suffix = "") {
  const tag = suffix ? `-${suffix}` : "";
  const fileName = `seed-s${studentId}-a${String(index + 1).padStart(2, "0")}${tag}-${Date.now()}.webp`;
  const compressed = await compressArtworkImage(sourcePath);
  await writeArtworkSource(compressed, fileName);
  await writeDerivatives(compressed, baseNameOf(fileName));
  return fileName;
}

function buildStaggeredDate(dayOffset) {
  const date = new Date(Date.now() - dayOffset * 86_400_000);
  return date.toISOString().slice(0, 10);
}

async function ensureVerifiedRegistration(connection, studentId, adminId) {
  const [existing] = await connection.query(
    "SELECT registration_id FROM accregistration WHERE student_id = ? LIMIT 1",
    [studentId],
  );
  if (existing.length > 0) {
    await connection.query(
      `UPDATE accregistration
       SET register_status = 'Verified',
           admin_id = COALESCE(admin_id, ?),
           approved_date = COALESCE(approved_date, CURRENT_TIMESTAMP)
       WHERE student_id = ?`,
      [adminId, studentId],
    );
    return;
  }

  await connection.query(
    `INSERT INTO accregistration (student_id, admin_id, registered_date, register_status, approved_date)
     VALUES (?, ?, CURRENT_TIMESTAMP, 'Verified', CURRENT_TIMESTAMP)`,
    [studentId, adminId],
  );
}

async function ensureStudentOnboarded(connection, student, sellerPassword, forcePasswordUpdate = false) {
  const defaultLastNamePassword = String(student.last_name || "").trim().toUpperCase();
  let isUsingDefaultPassword = false;
  if (defaultLastNamePassword && student.password) {
    try {
      isUsingDefaultPassword = await bcrypt.compare(defaultLastNamePassword, student.password);
    } catch {
      isUsingDefaultPassword = false;
    }
  }

  const shouldUpdatePassword = forcePasswordUpdate || isUsingDefaultPassword || !student.password;
  if (shouldUpdatePassword) {
    const nextPassword = String(sellerPassword || DEFAULT_SEED_SELLER_PASSWORD);
    if (defaultLastNamePassword && nextPassword.trim().toUpperCase() === defaultLastNamePassword) {
      throw new Error("Seeded seller password cannot match the student's default last-name password.");
    }
    const passwordHash = await bcrypt.hash(nextPassword, 10);
    await connection.query(
      `UPDATE student
       SET password = ?,
           must_change_password = 0,
           consent_given_at = COALESCE(consent_given_at, CURRENT_TIMESTAMP),
           consent_version = COALESCE(consent_version, '1.0')
       WHERE student_id = ?`,
      [passwordHash, student.student_id],
    );
    return true;
  }

  await connection.query(
    `UPDATE student
     SET must_change_password = 0,
         consent_given_at = COALESCE(consent_given_at, CURRENT_TIMESTAMP),
         consent_version = COALESCE(consent_version, '1.0')
     WHERE student_id = ?`,
    [student.student_id],
  );
  return false;
}

async function resolveGcashInstitution() {
  try {
    const institutions = await listPayoutInstitutions();
    const gcash = institutions.find(
      (value) => value.code === "GXCHPHM2XXX" && value.provider === "instapay",
    ) || institutions.find((value) => value.code === "GXCHPHM2XXX");
    if (gcash) return gcash;
  } catch {
    // PayMongo credentials may not be present when running seeders against demo/local env.
  }
  return DEFAULT_GCASH_INSTITUTION;
}

async function ensureGcashPayoutAccount(connection, student, profile, institution, accountNumber) {
  const number = String(accountNumber || DEFAULT_SEED_GCASH_NUMBER).trim();
  if (!/^\d{6,34}$/.test(number)) {
    throw new Error(`Invalid GCash account number "${number}". Expected 6 to 34 digits.`);
  }
  const rawName = [student.first_name, student.last_name].filter(Boolean).join(" ").trim()
    || profile.shopName
    || `Seller ${student.student_id}`;
  const accountName = rawName.slice(0, 180);
  const ciphertext = encryptPayoutAccount(number, student.student_id);

  await connection.query(
    `INSERT INTO seller_payout_account (
       student_id, destination_type, institution_code, institution_name,
       institution_provider, account_name, account_number_ciphertext
     )
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       destination_type = VALUES(destination_type),
       institution_code = VALUES(institution_code),
       institution_name = VALUES(institution_name),
       institution_provider = VALUES(institution_provider),
       account_name = VALUES(account_name),
       account_number_ciphertext = VALUES(account_number_ciphertext),
       updated_at = CURRENT_TIMESTAMP`,
    [
      student.student_id,
      institution.destinationType || "ewallet",
      institution.code,
      institution.name,
      institution.provider,
      accountName,
      ciphertext,
    ],
  );
}

async function upsertStorefront(connection, studentId, profile, pinnedIds) {
  const specialtiesJson = JSON.stringify(profile.specialties.slice(0, 3));
  const pinnedJson = JSON.stringify(pinnedIds);
  const [existing] = await connection.query(
    "SELECT storefront_id FROM storefront WHERE student_id = ? LIMIT 1",
    [studentId],
  );

  if (existing.length > 0) {
    await connection.query(
      `UPDATE storefront
       SET shop_name = ?,
           shop_description = ?,
           specialties = ?,
           pinned_artwork_ids = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE student_id = ?`,
      [profile.shopName, profile.shopDescription, specialtiesJson, pinnedJson, studentId],
    );
    return;
  }

  await connection.query(
    `INSERT INTO storefront (student_id, shop_name, shop_description, specialties, pinned_artwork_ids)
     VALUES (?, ?, ?, ?, ?)`,
    [studentId, profile.shopName, profile.shopDescription, specialtiesJson, pinnedJson],
  );
}

export function validateCatalogItem(item) {
  const artType = item.art_type || "Digital";
  const product = item.product || "painting";
  const productSettings = normalizeArtworkProductSettings({
    product_type: item.product_type || "Digital",
  });
  const validatedDetails = resolveArtworkDetails({
    rawDetails: item.artwork_details,
    artType,
    product,
    productType: productSettings.productType,
  });

  return {
    artType,
    product,
    ...productSettings,
    validatedDetails,
  };
}

export async function runCatalogSeeder(profiles, cliOptions) {
  const requiredSellers = profiles.length;
  const connection = await resolveDbConnection(cliOptions.url);

  try {
    let students;
    if (cliOptions.studentIds.length > 0) {
      if (cliOptions.studentIds.length < requiredSellers) {
        throw new Error(
          `Provide at least ${requiredSellers} student IDs via --student-ids.`,
        );
      }
      const targetIds = cliOptions.studentIds.slice(0, requiredSellers);
      const placeholders = targetIds.map(() => "?").join(", ");
      const [rows] = await connection.query(
        `SELECT student_id, first_name, last_name, student_number, course, password
         FROM student
         WHERE student_id IN (${placeholders})
         ORDER BY FIELD(student_id, ${placeholders})`,
        [...targetIds, ...targetIds],
      );
      students = rows;
    } else {
      const [rows] = await connection.query(
        `SELECT student_id, first_name, last_name, student_number, course, password
         FROM student
         ORDER BY student_id ASC
         LIMIT ? OFFSET ?`,
        [requiredSellers, cliOptions.offset],
      );
      students = rows;
    }

    if (students.length < requiredSellers) {
      throw new Error(
        `Found only ${students.length} student row(s) at offset ${cliOptions.offset}, but ${requiredSellers} are required. Add students first.`,
      );
    }

    const [[adminRow]] = await connection.query(
      "SELECT admin_id FROM admin ORDER BY admin_id ASC LIMIT 1",
    );
    const adminId = adminRow?.admin_id || null;

    const gcashInstitution = cliOptions.dryRun ? DEFAULT_GCASH_INSTITUTION : await resolveGcashInstitution();
    if (!cliOptions.dryRun) {
      await connection.query(payoutAccountTableSql);
    }

    console.log(
      `Storage target: ${
        isB2Configured()
          ? "Backblaze B2 configured (uploading compressed source + web/thumb WebP derivatives)"
          : "LOCAL uploads/seller fallback (B2 keys missing or placeholder — images won't appear on Railway unless B2 is configured)"
      }`,
    );

    for (let sIdx = 0; sIdx < profiles.length; sIdx += 1) {
      const student = students[sIdx];
      const profile = profiles[sIdx];
      const { folderPath, artworkImages, profileImage } = scanSellerAssetFolder(profile.folder);
      const subFolderCache = new Map();
      const subFolderCursors = new Map();

      const getImagesForFolder = (relativeFolder) => {
        const key = relativeFolder || profile.folder;
        if (!subFolderCache.has(key)) {
          subFolderCache.set(key, scanSellerAssetFolder(key));
        }
        return subFolderCache.get(key);
      };

      const itemsToSeed = profile.artworks.slice(0, cliOptions.artworksPerSeller);
      const hasAnyImages =
        artworkImages.length > 0 ||
        itemsToSeed.some((item) => getImagesForFolder(item.assetFolder || profile.folder).artworkImages.length > 0);

      if (!hasAnyImages) {
        throw new Error(
          `No sample artwork images found in ${folderPath}. Add PNG, JPG, or WebP files first.`,
        );
      }
      const [existingTitlesRows] = await connection.query(
        "SELECT artwork_id, title FROM artwork WHERE student_id = ?",
        [student.student_id],
      );
      const existingByTitle = new Map(
        existingTitlesRows.map((row) => [row.title.toLowerCase(), row.artwork_id]),
      );

      console.log(
        `\n[${sIdx + 1}/${profiles.length}] Student #${student.student_id} (${student.student_number || "no-number"} — ${student.first_name} ${student.last_name}) -> Shop: "${profile.shopName}"`,
      );
      console.log(
        `  Specialties: ${profile.specialties.join(", ")} | Sample artwork images found: ${artworkImages.length} | Profile image: ${profileImage ? path.basename(profileImage) : "none (keep existing/initials)"}`,
      );

      if (cliOptions.dryRun) {
        for (const item of itemsToSeed) validateCatalogItem(item);
        console.log(`  [dry-run] Validated ${itemsToSeed.length} artworks.`);
        continue;
      }

      await ensureVerifiedRegistration(connection, student.student_id, adminId);
      const passwordUpdated = await ensureStudentOnboarded(
        connection,
        student,
        cliOptions.sellerPassword,
        cliOptions.sellerPasswordExplicit,
      );
      await ensureGcashPayoutAccount(
        connection,
        student,
        profile,
        gcashInstitution,
        cliOptions.gcashNumber,
      );
      console.log(
        `  Account verified, policy consent recorded, GCash payout (${cliOptions.gcashNumber}) saved${passwordUpdated ? `, password set to "${cliOptions.sellerPassword}"` : " (existing password kept)"}.`,
      );

      if (profileImage) {
        const storedProfileName = await processAndStoreProfileImage(
          student.student_id,
          profileImage,
        );
        await connection.query(
          "UPDATE student SET profile_image = ? WHERE student_id = ?",
          [storedProfileName, student.student_id],
        );
      } else {
        await connection.query(
          "UPDATE student SET profile_image = COALESCE(NULLIF(TRIM(profile_image), ''), 'profile.jpg') WHERE student_id = ?",
          [student.student_id],
        );
      }

      const seededIds = [];
      let insertedCount = 0;

      for (let aIdx = 0; aIdx < itemsToSeed.length; aIdx += 1) {
        const item = itemsToSeed[aIdx];
        const existingId = existingByTitle.get(item.title.toLowerCase());
        if (existingId) {
          seededIds.push(existingId);
          continue;
        }

        const {
          artType,
          product,
          productType,
          paymentMode,
          upfrontPercentage,
          validatedDetails,
        } = validateCatalogItem(item);

        const targetFolder = item.assetFolder || profile.folder;
        const folderAssets = getImagesForFolder(targetFolder);
        const pool = folderAssets.artworkImages.length > 0 ? folderAssets.artworkImages : artworkImages;
        const cursor = subFolderCursors.get(targetFolder) || 0;
        subFolderCursors.set(targetFolder, cursor + 1);
        const sourceImage = pool[cursor % pool.length];
        const storedImageName = await processAndStoreArtworkImage(
          student.student_id,
          aIdx,
          sourceImage,
        );

        if (Array.isArray(validatedDetails.product_options) && validatedDetails.product_options.length > 0) {
          for (let optIdx = 0; optIdx < validatedDetails.product_options.length; optIdx += 1) {
            const option = validatedDetails.product_options[optIdx];
            if (option.image) continue;
            if (optIdx === 0) {
              option.image = storedImageName;
            } else {
              const optSource = pool[(cursor + optIdx) % pool.length];
              option.image = await processAndStoreArtworkImage(
                student.student_id,
                aIdx,
                optSource,
                `v${optIdx + 1}`,
              );
            }
          }
        }

        const dateCreated = buildStaggeredDate(itemsToSeed.length - aIdx);

        const [insertResult] = await connection.query(
          `INSERT INTO artwork
            (student_id, title, price, description, image, genre, color_used, art_size, art_type, exact_art_type, product, product_type, payment_mode, upfront_percentage, product_sample_image, artwork_details, care_instructions, stock_quantity, status, is_sold, date_created)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, 'Available', 0, ?)`,
          [
            student.student_id,
            item.title,
            item.price,
            item.description,
            storedImageName,
            item.genre,
            item.color_used,
            item.art_size,
            artType,
            item.exact_art_type || null,
            product,
            productType,
            paymentMode,
            upfrontPercentage,
            JSON.stringify(validatedDetails),
            item.care_instructions,
            Number.isSafeInteger(validatedDetails.stock_available)
              ? validatedDetails.stock_available
              : (item.stock_quantity ?? 0),
            dateCreated,
          ],
        );

        const artworkId = insertResult.insertId;
        await connection.query(
          `INSERT INTO artupload (artwork_id, admin_id, request_status, request_date, approved_date)
           VALUES (?, ?, 'Verified', NOW(), NOW())`,
          [artworkId, adminId],
        );
        await connection.query(
          `INSERT INTO feature (artwork_id, feature_scanned, mediums_used)
           VALUES (?, ?, ?)`,
          [artworkId, item.feature_scanned, item.mediums_used || null],
        );

        seededIds.push(artworkId);
        insertedCount += 1;
      }

      await upsertStorefront(connection, student.student_id, profile, seededIds.slice(0, 4));
      console.log(
        `  Done: inserted ${insertedCount} new verified artworks (${seededIds.length} total pinned/linked) + storefront updated.`,
      );
    }
  } finally {
    await connection.end();
  }
}
