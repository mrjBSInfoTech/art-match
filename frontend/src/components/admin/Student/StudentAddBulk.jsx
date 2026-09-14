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
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setError("");

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { raw: false });

        const formattedData = data.map((row) => ({
          first_name: row["First Name"] || row.first_name || "",
          middle_name: row["Middle Name"] || row.middle_name || "",
          last_name: row["Last Name"] || row.last_name || "",
          birthdate: row["Date of Birth"] || row.birthdate || row.dob || "",
          email: row["Email"] || row.email || "",
          address: row["Address"] || row.address || "",
          phone_number: String(row["Phone Number"] || row.phone_number || ""),
          cor: row["COR Image"] || row.cor || "",
          year_level: row["Year Level"] || row.year_level || "",
          student_number: row["Student Number"] || row.student_number || "",
          course: row["Course"] || row.course || "",
          profile_image: row["Profile Picture"] || row.profile_image || "",
        }));

        setParsedData(formattedData);
      } catch (err) {
        setError(
          "Failed to parse the file. Ensure it is a valid Excel or CSV file.",
        );
      }
    };
    reader.readAsBinaryString(file);
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
            border: "2px dashed #1976d2",
            borderRadius: 2,
            p: 4,
            textAlign: "center",
            cursor: "pointer",
            backgroundColor: "#f5f9ff",
            "&:hover": { backgroundColor: "#e3f2fd" },
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
