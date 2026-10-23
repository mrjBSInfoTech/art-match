import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";
import {
  deleteFromB2,
  getFromB2,
  isB2Configured,
  uploadToB2,
} from "./b2Storage.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localUploadRoot = path.resolve(__dirname, "..", "uploads");
const parcelPhotoMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const validParcelPhotoKey = (orderId, key) =>
  new RegExp(
    `^orders/${orderId}/parcel/[0-9a-f-]{36}\\.(?:jpg|png|webp)$`,
  ).test(key);

export function resolveLocalParcelPhotoPath(orderId, key) {
  if (
    !Number.isSafeInteger(Number(orderId)) ||
    Number(orderId) <= 0 ||
    typeof key !== "string" ||
    !validParcelPhotoKey(orderId, key)
  ) {
    throw new Error("Invalid parcel photo key");
  }
  return path.resolve(localUploadRoot, ...key.split("/"));
}

export async function saveParcelPhoto({ orderId, buffer, contentType, extension }) {
  if (!parcelPhotoMimeTypes.has(contentType)) {
    throw new Error("Unsupported parcel photo type");
  }
  if (!["jpg", "png", "webp"].includes(extension)) {
    throw new Error("Unsupported parcel photo extension");
  }

  const key = `orders/${orderId}/parcel/${randomUUID()}.${extension}`;
  if (isB2Configured()) {
    const b2Key = `app-uploads/${key}`;
    await uploadToB2({ key: b2Key, body: buffer, contentType });
    return { storage: "b2", key: b2Key, contentType };
  }

  const filePath = resolveLocalParcelPhotoPath(orderId, key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buffer, { flag: "wx" });
  return { storage: "local", key, contentType };
}

export async function deleteParcelPhoto(photo, orderId) {
  if (
    photo.storage === "b2" ||
    (!photo.storage && photo.key?.startsWith("app-uploads/orders/"))
  ) {
    await deleteFromB2(photo.key);
    return;
  }
  if (photo.storage === "local") {
    await fs.unlink(resolveLocalParcelPhotoPath(orderId, photo.key));
    return;
  }
  throw new Error("Unknown parcel photo storage");
}

export async function readParcelPhoto(photo, orderId) {
  if (!photo || typeof photo.key !== "string") {
    throw new Error("Invalid parcel photo");
  }
  if (!parcelPhotoMimeTypes.has(photo.contentType)) {
    throw new Error("Invalid parcel photo type");
  }
  if (
    (photo.storage === "b2" ||
      (!photo.storage && photo.key.startsWith("app-uploads/orders/"))) &&
    photo.key.startsWith("app-uploads/orders/")
  ) {
    const object = await getFromB2(photo.key);
    return Buffer.from(await object.Body.transformToByteArray());
  }
  if (photo.storage === "local") {
    return fs.readFile(resolveLocalParcelPhotoPath(orderId, photo.key));
  }
  throw new Error("Invalid parcel photo storage");
}
