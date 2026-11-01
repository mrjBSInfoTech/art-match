import * as XLSX from "xlsx";
import Papa from "papaparse";

export const MAX_IMPORT_FILE_SIZE = 5 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 10000;

const MAX_ROWS_WITH_HEADER = MAX_IMPORT_ROWS + 30;

export async function readStudentSpreadsheet(data, extension) {
  const normalizedExtension = extension.toLowerCase();
  if (normalizedExtension === ".csv") {
    const parsed = Papa.parse(new TextDecoder().decode(data), {
      skipEmptyLines: true,
    });
    if (parsed.errors.length) {
      throw new Error("The CSV file contains invalid rows.");
    }
    if (parsed.data.length > MAX_ROWS_WITH_HEADER) {
      throw new Error(`The file cannot contain more than ${MAX_IMPORT_ROWS} student rows.`);
    }
    return [{ sheetName: "CSV", rows: parsed.data }];
  }

  if (normalizedExtension !== ".xlsx") {
    throw new Error("Choose an .xlsx or .csv file.");
  }

  const workbook = XLSX.read(data, { type: "array" });
  const sheets = [];
  let totalRows = 0;

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const range = worksheet["!ref"]
      ? XLSX.utils.decode_range(worksheet["!ref"])
      : { s: { r: 0 }, e: { r: -1 } };
    const rowCount = range.e.r - range.s.r + 1;
    totalRows += Math.max(0, rowCount);
    if (totalRows > MAX_ROWS_WITH_HEADER) {
      throw new Error(`The file cannot contain more than ${MAX_IMPORT_ROWS} student rows.`);
    }
    const rows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: false,
      defval: "",
      blankrows: false,
    });
    sheets.push({ sheetName, rows });
  }

  return sheets;
}
