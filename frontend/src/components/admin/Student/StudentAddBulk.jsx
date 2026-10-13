import React, { useRef, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Slide,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import * as XLSX from "xlsx";
import { bulkAddStudents } from "../../../api/admin/studentAPI";
import { useTheme } from "@mui/material/styles";
// Icons
import CloseIcon from "@mui/icons-material/Close";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const normalizeHeader = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[._-]+/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ");

const COLUMN_ALIASES = {
  student_number: [
    "student number",
    "student no",
    "student no.",
    "student id",
    "id number",
    "school id",
  ],

  first_name: ["first name", "firstname", "given name", "given names"],

  middle_name: ["middle name", "middlename", "middle"],

  last_name: ["last name", "lastname", "surname", "family name"],

  course: ["course", "program", "degree", "degree program"],

  year_level: ["year level", "year", "level", "yearlevel"],
};

const NORMALIZED_ALIASES = Object.fromEntries(
  Object.entries(COLUMN_ALIASES).map(([field, aliases]) => [
    field,

    new Set(aliases.map(normalizeHeader)),
  ]),
);

const getFieldForHeader = (header) => {
  const normalized = normalizeHeader(header);

  for (const [field, aliases] of Object.entries(NORMALIZED_ALIASES)) {
    if (aliases.has(normalized)) {
      return field;
    }
  }

  return null;
};

const analyzeHeaderRow = (row) => {
  const columnMap = {};
  let score = 0;

  row.forEach((cell, index) => {
    const field = getFieldForHeader(cell);

    if (field && columnMap[field] === undefined) {
      columnMap[field] = index;

      score += 1;
    }
  });

  // These are the strongest
  // indicators that this really
  // is a student-list header.
  if (columnMap.student_number !== undefined) {
    score += 3;
  }

  if (columnMap.first_name !== undefined) {
    score += 2;
  }

  if (columnMap.last_name !== undefined) {
    score += 2;
  }

  return {
    score,
    columnMap,
  };
};

const findHeaderRow = (rows) => {
  let best = null;

  rows.slice(0, 30).forEach((row, index) => {
    const analysis = analyzeHeaderRow(row);

    if (!best || analysis.score > best.score) {
      best = {
        rowIndex: index,
        ...analysis,
      };
    }
  });

  if (
    !best ||
    best.score < 7 ||
    best.columnMap.student_number === undefined ||
    best.columnMap.first_name === undefined ||
    best.columnMap.last_name === undefined
  ) {
    return null;
  }

  return best;
};

const getCellValue = (row, columnMap, field) => {
  const index = columnMap[field];

  if (index === undefined) {
    return "";
  }

  return String(row[index] ?? "").trim();
};

const normalizeYearLevel = (value) => {
  const text = normalizeHeader(value);

  if (["1", "1st", "1st year", "first", "first year"].includes(text)) {
    return "First Year";
  }

  if (["2", "2nd", "2nd year", "second", "second year"].includes(text)) {
    return "Second Year";
  }

  if (["3", "3rd", "3rd year", "third", "third year"].includes(text)) {
    return "Third Year";
  }

  if (["4", "4th", "4th year", "fourth", "fourth year"].includes(text)) {
    return "Fourth Year";
  }

  if (["5", "5th", "5th year", "fifth", "fifth year"].includes(text)) {
    return "Fifth Year";
  }

  return String(value || "").trim();
};

const normalizeCourse = (value) => {
  const text = normalizeHeader(value);

  const courseAliases = {
    "bfa painting": "Bachelor of Fine Arts in Painting",

    "bfa ptg": "Bachelor of Fine Arts in Painting",

    "bachelor of fine arts in painting": "Bachelor of Fine Arts in Painting",

    "bs architecture": "Bachelor of Science in Architecture",

    "bachelor of science in architecture":
      "Bachelor of Science in Architecture",

    "bfa advertising arts": "Bachelor of Fine Arts in Advertising Arts",

    "bachelor of fine arts in advertising arts":
      "Bachelor of Fine Arts in Advertising Arts",

    "bs interior design": "Bachelor of Science in Interior Design",

    "bachelor of science in interior design":
      "Bachelor of Science in Interior Design",

    "bfa industrial design": "Bachelor of Fine Arts in Industrial Design",

    "bachelor of fine arts in industrial design":
      "Bachelor of Fine Arts in Industrial Design",
  };

  return courseAliases[text] || String(value || "").trim();
};

const formatPersonName = (value) => {
  const text = String(value || "").trim();

  if (!text) {
    return "";
  }

  return text
    .split(/([ '-])/)
    .map((part) => {
      // Keep spaces, hyphens,
      // and apostrophes unchanged.
      if (/^[ '-]$/.test(part)) {
        return part;
      }

      if (!part) {
        return part;
      }

      // If already mixed-case,
      // preserve it.
      const hasUpper = /[A-Z]/.test(part);

      const hasLower = /[a-z]/.test(part);

      if (hasUpper && hasLower) {
        return part;
      }

      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join("");
};

export default function StudentBulkAdd({
  open,
  handleClose,
  onSuccess,
  showSnackbar,
}) {
  const theme = useTheme();
  const fileInputRef = useRef(null);
  const [parsedData, setParsedData] = useState([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setFileName(file.name);
    setError("");
    setParsedData([]);

    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = evt.target.result;

        const workbook = XLSX.read(data, {
          type: "array",
        });

        let bestSheet = null;

        // Search every worksheet.
        // Beneficiaries do not have
        // to move the correct sheet
        // to the first position.
        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];

          const rows = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            raw: false,
            defval: "",
            blankrows: false,
          });

          const header = findHeaderRow(rows);

          if (header && (!bestSheet || header.score > bestSheet.header.score)) {
            bestSheet = {
              sheetName,
              rows,
              header,
            };
          }
        }

        if (!bestSheet) {
          throw new Error(
            "Could not automatically find the student columns in this file.",
          );
        }

        const { rows, header } = bestSheet;

        const { rowIndex, columnMap } = header;

        const students = rows
          .slice(rowIndex + 1)
          .map((row) => {
            const studentNumber = getCellValue(
              row,
              columnMap,
              "student_number",
            );

            const firstName = formatPersonName(
              getCellValue(row, columnMap, "first_name"),
            );

            const middleName = formatPersonName(
              getCellValue(row, columnMap, "middle_name"),
            );

            const lastName = formatPersonName(
              getCellValue(row, columnMap, "last_name"),
            );

            const course = normalizeCourse(
              getCellValue(row, columnMap, "course"),
            );

            const yearLevel = normalizeYearLevel(
              getCellValue(row, columnMap, "year_level"),
            );

            return {
              student_number: studentNumber,

              first_name: firstName,

              middle_name: middleName,

              last_name: lastName,

              course,

              year_level: yearLevel,
            };
          })

          // Ignore empty/footer rows.
          .filter(
            (student) =>
              student.student_number && student.first_name && student.last_name,
          );

        if (!students.length) {
          throw new Error(
            "Student columns were found, but no valid student rows were detected.",
          );
        }

        // Remove duplicated student
        // numbers inside the same file.
        const uniqueStudents = [
          ...new Map(
            students.map((student) => [
              student.student_number.toLowerCase(),

              student,
            ]),
          ).values(),
        ];

        setParsedData(uniqueStudents);
      } catch (err) {
        console.error("Bulk student file error:", err);

        setParsedData([]);

        setError(err.message || "Unable to read this Excel or CSV file.");
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleSubmit = async () => {
    if (parsedData.length === 0) {
      setError("No valid data found to import.");
      return;
    }

    setIsSubmitting(true);
    try {
      await bulkAddStudents(parsedData);
      showSnackbar(
        `Successfully imported ${parsedData.length} students`,
        "success",
      );
      onSuccess();
      handleCloseDialog();
    } catch (err) {
      setError(err.message || "Failed to import students.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseDialog = () => {
    setParsedData([]);
    setFileName("");
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    handleClose();
  };

  const downloadTemplate = () => {
    const template = [
      {
        "First Name": "Juan",
        "Middle Name": "Rizal",
        "Last Name": "Dela Cruz",
        "Date of Birth": "2001-01-15",
        Email: "juan@example.com",
        Address: "123 Sampaguita St",
        "Phone Number": "09123456789",
        "Year Level": "2nd Year",
        Course: "BS Computer Science",
        "Student Number": "2021-12345",
        "COR Image": "",
        "Profile Picture": "",
      },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Student_Bulk_Import_Template.xlsx");
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      TransitionComponent={Transition}
      keepMounted
      PaperProps={{
        sx: {
          width: "min(100% - 24px, 470px)",
          maxWidth: "470px",
          borderRadius: 3,
          overflow: "hidden",
          backgroundColor: theme.palette.background.paper,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          px: 2.5,
          py: 1.75,
          color: theme.palette.text.primary,
          fontSize: 16,
          fontWeight: 700,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <SchoolOutlinedIcon sx={{ color: "#ef3340", fontSize: 20 }} />
        Bulk Import Students
        <Button
          aria-label="Close student information"
          onClick={handleClose}
          sx={{
            minWidth: 28,
            width: 28,
            height: 28,
            ml: "auto",
            p: 0,
            color: theme.palette.text.secondary,
          }}
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </Button>
      </DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Typography variant="body2" color="textSecondary" paragraph>
          Upload an Excel (.xlsx, .xls) or CSV file to add multiple students at
          once. Ensure your column headers match the required format.
        </Typography>

        <Button
          variant="text"
          size="small"
          onClick={downloadTemplate}
          sx={{ mb: 3 }}
        >
          Download Template
        </Button>

        <Box
          onClick={() => fileInputRef.current.click()}
          sx={{
            border: "2px dashed",
            borderColor: "primary.main",
            borderRadius: 2,
            p: 4,
            textAlign: "center",
            cursor: "pointer",
            bgcolor: "background.default",
            "&:hover": { bgcolor: "action.hover" },
          }}
        >
          <CloudUploadIcon color="primary" sx={{ fontSize: 48, mb: 1 }} />
          <Typography variant="h6" color="primary">
            {fileName ? fileName : "Click to select a file"}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {parsedData.length > 0 &&
              `${parsedData.length} students ready to import`}
          </Typography>
        </Box>

        <input
          type="file"
          accept=".xlsx, .xls, .csv"
          hidden
          ref={fileInputRef}
          onChange={handleFileChange}
        />
      </DialogContent>
      <DialogActions>
        <Button
          onClick={handleCloseDialog}
          color="text.secondary"
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={parsedData.length === 0 || isSubmitting}
          sx={{
            color: theme.palette.text.primary,
            borderRadius: 1.5,
            px: 2.5,
            textTransform: "none",
            fontWeight: 700,
          }}
        >
          {isSubmitting ? <CircularProgress size={24} /> : "Import Data"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
