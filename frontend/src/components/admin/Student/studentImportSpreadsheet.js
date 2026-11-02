import * as XLSX from "xlsx";
import Papa from "papaparse";

export const MAX_IMPORT_FILE_SIZE = 5 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 10000;

const MAX_ROWS_WITH_HEADER = MAX_IMPORT_ROWS + 30;

export function normalizeStudentBirthdate(value) {
  const text = String(value || "").trim();
  if (!text) return "";

  const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const slashMatch = text.match(/^(\d{1,4})\/(\d{1,2})\/(\d{1,4})$/);
  let year;
  let month;
  let day;

  if (isoMatch) {
    [, year, month, day] = isoMatch;
  } else if (slashMatch) {
    const [, first, second, third] = slashMatch;
    if (first.length === 4) {
      year = first;
      month = second;
      day = third;
    } else {
      const firstValue = Number(first);
      const dayFirst = firstValue > 12;
      month = dayFirst ? second : first;
      day = dayFirst ? first : second;
      year = third.length === 2
        ? String(Number(third) >= 50 ? 1900 + Number(third) : 2000 + Number(third))
        : third;
    }
  } else {
    throw new Error("Birthdates must use YYYY-MM-DD or a slash-separated date.");
  }

  const yearNumber = Number(year);
  const monthNumber = Number(month);
  const dayNumber = Number(day);
  const date = new Date(Date.UTC(yearNumber, monthNumber - 1, dayNumber));
  if (
    !Number.isInteger(yearNumber)
    || yearNumber < 1000
    || date.getUTCFullYear() !== yearNumber
    || date.getUTCMonth() !== monthNumber - 1
    || date.getUTCDate() !== dayNumber
  ) {
    throw new Error("Enter a valid birthdate.");
  }

  return `${yearNumber}-${String(monthNumber).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`;
}

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
