import assert from "node:assert/strict";
import test from "node:test";
import * as XLSX from "xlsx";
import {
  MAX_IMPORT_ROWS,
  readStudentSpreadsheet,
} from "./studentImportSpreadsheet.js";

test("student spreadsheet reader handles xlsx and quoted CSV values", async () => {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([
    ["Student Number", "First Name", "Last Name", "Unexpected Field"],
    ["2026-001", "Ana", "Santos", "ignored"],
  ]);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
  const xlsxData = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  const sheets = await readStudentSpreadsheet(xlsxData, ".xlsx");
  assert.deepEqual(sheets[0].rows[1], ["2026-001", "Ana", "Santos", "ignored"]);

  const csvSheets = await readStudentSpreadsheet(
    new TextEncoder().encode(
      'Student Number,First Name,Last Name\n2026-002,"Ana, Maria",Cruz',
    ),
    ".csv",
  );
  assert.deepEqual(csvSheets[0].rows[1], ["2026-002", "Ana, Maria", "Cruz"]);
});

test("student spreadsheet reader enforces extension and row limits", async () => {
  await assert.rejects(
    readStudentSpreadsheet(new Uint8Array(), ".xls"),
    /Choose an \.xlsx or \.csv file/,
  );

  const rows = Array.from({ length: MAX_IMPORT_ROWS + 31 }, (_, index) =>
    `2026-${index},First,Last`,
  );
  await assert.rejects(
    readStudentSpreadsheet(
      new TextEncoder().encode(`Student Number,First Name,Last Name\n${rows.join("\n")}`),
      ".csv",
    ),
    /cannot contain more than/,
  );
});
