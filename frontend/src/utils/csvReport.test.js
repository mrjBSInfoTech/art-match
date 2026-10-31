import assert from "node:assert/strict";
import test from "node:test";
import { serializeCsvReport } from "./csvReport.js";

test("CSV reports quote cells and preserve embedded delimiters and line breaks", () => {
  const csv = serializeCsvReport(
    [{ name: 'Student, "One"', note: "First line\nsecond line" }],
    [{ key: "name", label: "Name" }, { key: "note", label: "Note" }],
  );
  assert.equal(csv, '\uFEFF"Name","Note"\r\n"Student, ""One""","First line\nsecond line"');
});

test("CSV reports neutralize spreadsheet formulas from user-controlled text", () => {
  const csv = serializeCsvReport(
    [{ name: " =HYPERLINK(\"https://example.invalid\")" }],
    [{ key: "name", label: "Name" }],
  );
  assert.equal(csv, '\uFEFF"Name"\r\n"\' =HYPERLINK(""https://example.invalid"")"');
});
