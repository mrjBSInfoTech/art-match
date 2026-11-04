import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import {
  createDatabaseDump,
  restoreDatabaseDump,
  splitSqlStatements,
} from "./systemBackup.js";

test("database backup exports table definitions and streamed rows without generated columns", async () => {
  const queries = [];
  const connection = {
    promise: () => ({
      query: async (sql) => {
        queries.push(sql);
        if (sql === "SHOW CREATE TABLE `order``items`") {
          return [[{
            "Create Table": "CREATE TABLE `order``items` (`id` int, `note` text)",
          }]];
        }
        if (sql === "SHOW COLUMNS FROM `order``items`") {
          return [[
            { Field: "id", Extra: "" },
            { Field: "note", Extra: "" },
            { Field: "calculated", Extra: "VIRTUAL GENERATED" },
          ]];
        }
        throw new Error(`Unexpected SQL query: ${sql}`);
      },
    }),
    query: (sql) => {
      queries.push(sql);
      return {
        stream: () => Readable.from([
          { id: 42, note: "buyer's request\nnext line", calculated: 43 },
        ]),
      };
    },
  };
  const chunks = [];
  for await (const chunk of createDatabaseDump(connection, [
    { name: "order`items", type: "BASE TABLE" },
  ])) {
    chunks.push(chunk);
  }
  const dump = chunks.join("");

  assert.match(dump, /CREATE TABLE IF NOT EXISTS `order``items`/);
  assert.match(dump, /DROP TABLE IF EXISTS `order``items`/);
  assert.match(dump, /INSERT INTO `order``items` \(`id`, `note`\) VALUES \(42, 'buyer\\'s request\\nnext line'\)/);
  assert.doesNotMatch(dump, /`calculated`/);
  assert.deepEqual(queries, [
    "SHOW CREATE TABLE `order``items`",
    "SHOW COLUMNS FROM `order``items`",
    "SELECT * FROM `order``items`",
  ]);
});

test("backup SQL splitting preserves semicolons inside values", () => {
  assert.deepEqual(
    splitSqlStatements("SET NAMES utf8mb4; INSERT INTO `notes` VALUES ('a; b', 'it''s');"),
    ["SET NAMES utf8mb4", "INSERT INTO `notes` VALUES ('a; b', 'it''s')"],
  );
});

test("database restore executes every statement in order", async () => {
  const statements = [];
  const connection = {
    promise: () => ({
      query: async (statement) => {
        statements.push(statement);
      },
    }),
  };
  await restoreDatabaseDump(connection, "SET FOREIGN_KEY_CHECKS=0;\nDROP TABLE `users`;");
  assert.deepEqual(statements, ["SET FOREIGN_KEY_CHECKS=0", "DROP TABLE `users`"]);
});

test("database backup exports views without treating them as tables", async () => {
  const connection = {
    promise: () => ({
      query: async (sql) => {
        assert.equal(sql, "SHOW CREATE VIEW `public_view`");
        return [[{ "Create View": "CREATE VIEW `public_view` AS SELECT 1" }]];
      },
    }),
    query: () => {
      throw new Error("Views must not be queried as tables");
    },
  };
  const chunks = [];
  for await (const chunk of createDatabaseDump(connection, [
    { name: "public_view", type: "VIEW" },
  ])) {
    chunks.push(chunk);
  }

  assert.match(chunks.join(""), /DROP VIEW IF EXISTS `public_view`/);
  assert.match(chunks.join(""), /CREATE VIEW `public_view` AS SELECT 1/);
});
