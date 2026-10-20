import fs from "fs";
import path from "path";

import { uploadToB2 } from "../utils/b2Storage.js";

const chatFolder = path.resolve("uploads", "chat");

const getContentType = (fileName) => {
  const ext = path.extname(fileName).toLowerCase();

  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";

    case ".png":
      return "image/png";

    case ".gif":
      return "image/gif";

    case ".webp":
      return "image/webp";

    case ".mp4":
      return "video/mp4";

    case ".webm":
      return "video/webm";

    case ".mov":
      return "video/quicktime";

    default:
      return "application/octet-stream";
  }
};

const migrate = async () => {
  if (!fs.existsSync(chatFolder)) {
    console.error("Chat folder not found:", chatFolder);

    process.exit(1);
  }

  const files = fs.readdirSync(chatFolder);

  let uploaded = 0;

  console.log(`Found ${files.length} chat file(s).`);

  for (const fileName of files) {
    const localPath = path.join(chatFolder, fileName);

    const stats = fs.statSync(localPath);

    if (!stats.isFile()) {
      continue;
    }

    const key = `app-uploads/chat/${fileName}`;

    console.log(`Uploading: ${fileName}`);

    await uploadToB2({
      key,

      body: fs.readFileSync(localPath),

      contentType: getContentType(fileName),
    });

    uploaded += 1;
  }

  console.log("");

  console.log(`Migration complete. ${uploaded} chat file(s) uploaded.`);

  console.log("Local files were NOT deleted.");
};

migrate().catch((error) => {
  console.error("Migration failed:", error);

  process.exit(1);
});
