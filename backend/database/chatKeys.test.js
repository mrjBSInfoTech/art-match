import assert from "node:assert/strict";
import test from "node:test";
import db from "./db.js";
import { saveChatKeyRecovery } from "./chatKeys.js";

test("chat recovery rejects legacy version 1 backups", async () => {
  const originalQuery = db.query;
  let queryCalled = false;
  db.query = () => {
    queryCalled = true;
  };

  try {
    await new Promise((resolve) => {
      saveChatKeyRecovery(
        "buyer",
        1,
        {
          backupVersion: 1,
          publicKey: "{}",
          encryptedPrivateKey: "encrypted",
          salt: "salt",
          iv: "iv",
        },
        (error) => {
          assert.match(error.message, /only version 2/i);
          resolve();
        },
      );
    });
    assert.equal(queryCalled, false);
  } finally {
    db.query = originalQuery;
  }
});
