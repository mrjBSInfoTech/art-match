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

export const downloadPdfReport = async (rows, columns, filename) => {
  if (!rows.length) return false;

  const [jspdfModule, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const jsPDF = jspdfModule.jsPDF || jspdfModule.default;
  const autoTable =
    typeof autoTableModule.default === "function"
      ? autoTableModule.default
      : autoTableModule.default?.default ||
        autoTableModule.default?.autoTable ||
        autoTableModule.autoTable;
  const doc = new jsPDF({
    orientation: columns.length > 6 ? "landscape" : "portrait",
    unit: "mm",
    format: "a4",
  });
  const title = filename
    .replace(/\.pdf$/i, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
  const pageWidth = doc.internal.pageSize.getWidth();

  autoTable(doc, {
    head: [columns.map(({ label }) => label)],
    body: rows.map((row) =>
      columns.map(({ key }) => {
        const value = row[key];
        return value == null
          ? ""
          : typeof value === "object"
            ? JSON.stringify(value)
            : String(value);
      }),
    ),
    startY: 24,
    margin: { top: 24, right: 8, bottom: 12, left: 8 },
    styles: { fontSize: columns.length > 10 ? 5 : 7, cellPadding: 1.5 },
    headStyles: { fillColor: [34, 69, 197] },
    didDrawPage: () => {
      doc.setFontSize(12);
      doc.text(title, 8, 15);
      doc.setFontSize(8);
      doc.text(`Generated ${new Date().toLocaleString()}`, pageWidth - 8, 15, {
        align: "right",
      });
    },
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - 8, doc.internal.pageSize.getHeight() - 5, {
      align: "right",
    });
  }

  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
  return true;
};

export const getReportDateStamp = (date = new Date()) =>
  date.toISOString().slice(0, 10);
