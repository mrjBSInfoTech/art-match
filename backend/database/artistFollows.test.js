import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { artistFollowTableSql } from "./artistFollows.js";

test("artist follow schema is unique per buyer and artist and cascades deleted accounts", () => {
  assert.match(artistFollowTableSql, /CREATE TABLE IF NOT EXISTS customer_artist_follow/);
  assert.match(artistFollowTableSql, /customer_id INT NOT NULL/);
  assert.match(artistFollowTableSql, /student_id INT NOT NULL/);
  assert.match(artistFollowTableSql, /UNIQUE KEY uq_customer_artist_follow \(customer_id, student_id\)/);
  assert.match(artistFollowTableSql, /REFERENCES customer \(customer_id\) ON DELETE CASCADE/);
  assert.match(artistFollowTableSql, /REFERENCES student \(student_id\) ON DELETE CASCADE/);
  assert.match(artistFollowTableSql, /INDEX idx_customer_artist_follow_student \(student_id, created_at\)/);
});

test("server startup initializes the artist follow table after student schema", () => {
  const server = readFileSync(new URL("../server.js", import.meta.url), "utf8");
  assert.match(server, /import \{ ensureArtistFollowTable \} from "\.\/database\/artistFollows\.js"/);
  assert.match(server, /\.then\(\(\) => ensureStudentAccountSchema\(\)\)\s*\.then\(\(\) => ensureArtistFollowTable\(\)\)/);
});
