const protectSpreadsheetFormula = (value) => {
  if (typeof value !== "string") return value;
  return /^[\s]*[=+\-@\t\r]/.test(value) ? `'${value}` : value;
};

const formatCell = (value) => {
  const normalized = value == null
    ? ""
    : typeof value === "object"
      ? JSON.stringify(value)
      : String(protectSpreadsheetFormula(value));
  return `"${normalized.replace(/"/g, '""')}"`;
};

export const serializeCsvReport = (rows, columns) => {
  const header = columns.map(({ label }) => formatCell(label)).join(",");
  const records = rows.map((row) =>
    columns.map(({ key }) => formatCell(row[key])).join(","),
  );
  return `\uFEFF${[header, ...records].join("\r\n")}`;
};

export const downloadCsvReport = (rows, columns, filename) => {
  if (!rows.length) return false;
  const blob = new Blob([serializeCsvReport(rows, columns)], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  return true;
};

export const getReportDateStamp = (date = new Date()) =>
  date.toISOString().slice(0, 10);
