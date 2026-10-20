import fs from "fs";
import path from "path";

import { uploadToB2 } from "../utils/b2Storage.js";

const adminFolder = path.resolve("uploads", "admin", "uploadAdmin");

const getContentType = (fileName) => {
  const ext = path.extname(fileName).toLowerCase();

  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";

    case ".png":
      return "image/png";

    case ".webp":
      return "image/webp";

    case ".gif":
      return "image/gif";

    default:
      return "application/octet-stream";
  }
};

const migrate = async () => {
  if (!fs.existsSync(adminFolder)) {
    console.error("Admin upload folder not found:", adminFolder);

    process.exit(1);
  }

  const files = fs.readdirSync(adminFolder);

  let uploaded = 0;

  console.log(`Found ${files.length} admin file(s).`);

  for (const fileName of files) {
    const localPath = path.join(adminFolder, fileName);

    const stats = fs.statSync(localPath);

    if (!stats.isFile()) {
      continue;
    }

    const key = `app-uploads/admin/uploadAdmin/${fileName}`;

    console.log(`Uploading: ${fileName}`);

    await uploadToB2({
      key,

      body: fs.readFileSync(localPath),

      contentType: getContentType(fileName),
    });

    uploaded += 1;
  }

  console.log("");

  console.log(`Migration complete. ${uploaded} admin file(s) uploaded.`);

  console.log("Local files were NOT deleted.");
};

migrate().catch((error) => {
  console.error("Migration failed:", error);

  process.exit(1);
});
