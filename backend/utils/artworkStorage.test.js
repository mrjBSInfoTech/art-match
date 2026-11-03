import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import test from "node:test";

test("stores and removes artwork sources locally when B2 is not configured", async () => {
  const b2Variables = [
    "B2_KEY_ID",
    "B2_APPLICATION_KEY",
    "B2_BUCKET",
    "B2_REGION",
    "B2_ENDPOINT",
  ];
  const previousValues = new Map(
    b2Variables.map((name) => [name, process.env[name]]),
  );
  for (const name of b2Variables) process.env[name] = "";

  try {
    const { artworkUploadDir, removeArtworkSource, writeArtworkSource } =
      await import("./artworkStorage.js");
    const fileName = `artwork-storage-test-${randomUUID()}.webp`;
    const filePath = path.join(artworkUploadDir, fileName);
    const body = Buffer.from("local artwork source");

    try {
      await writeArtworkSource(body, fileName);
      assert.deepEqual(await fs.readFile(filePath), body);
      await removeArtworkSource(fileName);
      await assert.rejects(fs.access(filePath), { code: "ENOENT" });
    } finally {
      await fs.unlink(filePath).catch((error) => {
        if (error.code !== "ENOENT") throw error;
      });
    }
  } finally {
    for (const [name, value] of previousValues) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
