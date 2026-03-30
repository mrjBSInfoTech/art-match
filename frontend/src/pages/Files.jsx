import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Alert,
  Slide,
  IconButton,
  TextField,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Card,
  CardContent,
  Divider,
  LinearProgress,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import DeleteIcon from "@mui/icons-material/Delete";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import FilesForm from "../components/Files/FilesForm";
import FilesDelete from "../components/Files/FilesDelete";
import { fetchFiles, addFile, deleteFile } from "../api/fileApi";

// Slide Transition for Snackbar
function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function Files() {
  const [files, setFiles] = useState([]);
  const [filesErrorMessage, setFilesErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [openFilesForm, setOpenFilesForm] = useState(false);
  const [openFilesDelete, setOpenFilesDelete] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [sortOption, setSortOption] = useState("all");

  // ========== FILES HANDLERS ==========
  // ➕ Open Add Files Modal
  const handleOpenFilesAdd = () => {
    setSelectedFiles(null);
    setOpenFilesForm(true);
  };

  // 🗑️ Open Delete Files Modal
  const handleOpenFilesDelete = (files) => {
    setSelectedFiles(files);
    setOpenFilesDelete(true);
  };

  // 🟢 Load all files
  const loadFiles = async () => {
    try {
      setLoading(true);
      setFilesErrorMessage("");
      console.log("Loading all files...");
      const response = await fetchFiles();
      console.log("Files response:", response);
      if (response && response.data) {
        setFiles(Array.isArray(response.data) ? response.data : []);
      } else if (Array.isArray(response)) {
        setFiles(response);
      } else {
        setFiles([]);
        setFilesErrorMessage("⚠️ No data received from server.");
      }
    } catch (err) {
      console.error("Failed to fetch files:", err);
      setFiles([]);
      setFilesErrorMessage("Failed to load files: " + err.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadFiles();
  }, []);

  // ========== FILE HANDLERS ==========

  // 💾 Submit Add Files
  const handleSubmitFiles = async (formData) => {
    try {
      if (selectedFiles) {
        await updateFile(selectedFiles.file_id, formData);
        showSnackbar("✓ File Editing Complete");
      } else {
        await addFile(formData);
        showSnackbar("✓ File Adding Complete");
      }
      await loadFiles();
      setOpenFilesForm(false);
    } catch (err) {
      console.error("Error saving file:", err);
    }
  };

  // 🗑️ Submit Delete for Files
  const handleDeleteFiles = async (id) => {
    try {
      console.log("Deleting file with ID:", id);
      await deleteFile(id);
      showSnackbar("✓ File Deletion Complete");
      await loadFiles();
      setOpenFilesDelete(false);
    } catch (err) {
      console.error("Error deleting file:", err);
      showSnackbar("❌ Failed to delete file: " + err.message);
    }
  };

  // Filter and Sort Logic
  const filteredFiles = files
    .filter((file) => {
      // Filter by search query (search in file_id or file_name)
      if (
        searchQuery &&
        !file.file_id?.toString().includes(searchQuery) &&
        !file.file_name?.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      // Filter by file format/type
      if (sortOption !== "all") {
        const fileExtension = file.file_type?.toLowerCase();
        if (!fileExtension?.includes(sortOption.toLowerCase())) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      // Sort alphabetically by file name
      return a.file_name?.localeCompare(b.file_name || "");
    });

  const accountType = localStorage.getItem("account_type");
  const isAdmin = accountType === "Admin";
  const isStaff = accountType === "Staff";
  const canAdd =
    (isAdmin || isStaff) && localStorage.getItem("can_add") === "1";
  const canDelete =
    (isAdmin || isStaff) && localStorage.getItem("can_delete") === "1";

  // Snackbar handlers
  const showSnackbar = (message) => {
    setSnackbarMessage(message);
    setSnackbarOpen(true);
  };

  const closeSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };
  return (
    <Box p={3}>
      <Helmet titleTemplate="%s - Barangay Management System">
        <title>Files</title>
      </Helmet>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h4" gutterBottom sx={{ fontWeight: "bold" }}>
          Files
        </Typography>
        {canAdd && (
          <Button
            variant="contained"
            color="primary"
            onClick={handleOpenFilesAdd}
            sx={{
              width: { xs: 150, sm: 150 },
              height: { xs: 45, sm: 45 },
              minWidth: { xs: 45, sm: 50 },
              fontSize: { xs: 12, sm: 16 },
              padding: 0,
            }}
          >
            Add Files
          </Button>
        )}
      </Box>
      {/* Filter Section */}
      <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }} variant="outlined">
        <Typography variant="h6">Filter</Typography>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "stretch", md: "center" },
            gap: 2,
            mb: 2,
            mt: 2,
          }}
        >
          <TextField
            variant="outlined"
            placeholder="Search files..."
            size="small"
            sx={{
              width: { xs: "100%", md: 250 },
              minWidth: { xs: "100%", md: 250 },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 2,
              width: { xs: "100%", md: "auto" },
            }}
          >
            <FormControl
              size="small"
              sx={{
                width: { xs: "100%", sm: 180 },
              }}
            >
              <InputLabel>Filter by Format</InputLabel>
              <Select
                value={sortOption}
                label="Filter by Format"
                onChange={(e) => setSortOption(e.target.value)}
              >
                <MenuItem value="all">All Formats</MenuItem>
                <MenuItem value="pdf">PDF</MenuItem>
                <MenuItem value="doc">Docs</MenuItem>
                <MenuItem value="jpg">JPEG</MenuItem>
                <MenuItem value="png">PNG</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Paper>
      <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }} variant="outlined">
        <Typography variant="h6" sx={{ mb: 2 }}>
          File List
        </Typography>
        {loading && (
          <LinearProgress
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
            }}
          />
        )}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : filesErrorMessage ? (
          <Typography color="error" sx={{ py: 3, textAlign: "center" }}>
            {filesErrorMessage}
          </Typography>
        ) : filteredFiles.length === 0 ? (
          <Typography color="textSecondary" sx={{ py: 3, textAlign: "center" }}>
            No files found
          </Typography>
        ) : (
          <TableContainer>
            <Table>
              <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: "bold" }}>File Name</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>File Type</TableCell>
                  <TableCell sx={{ fontWeight: "bold", textAlign: "center" }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredFiles.map((file) => (
                  <TableRow
                    key={file.file_id}
                    sx={{ "&:hover": { backgroundColor: "#f9f9f9" } }}
                  >
                    <TableCell>{file.file_name}</TableCell>
                    <TableCell>
                      <Typography
                        sx={{
                          display: "inline-block",
                          px: 2,
                          py: 1,
                          backgroundColor: "#e3f2fd",
                          borderRadius: 1,
                          fontSize: "0.85rem",
                          fontWeight: "bold",
                          color: "#1976d2",
                        }}
                      >
                        {file.file_type?.toUpperCase()}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ textAlign: "center" }}>
                      <Tooltip title="Download">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => {
                            const fileUrl = `http://localhost:5000/uploads/uploadFiles/pdf/${file.file_name}`;
                            window.open(fileUrl, "_blank");
                          }}
                        >
                          <FileDownloadIcon />
                        </IconButton>
                      </Tooltip>
                      {canDelete && (
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleOpenFilesDelete(file)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
      {/* ========== FILES MODALS ========== */}
      <FilesForm
        open={openFilesForm}
        handleClose={() => setOpenFilesForm(false)}
        onSubmit={handleSubmitFiles}
        selectedFiles={selectedFiles}
        files={files}
      />
      <FilesDelete
        open={openFilesDelete}
        handleClose={() => setOpenFilesDelete(false)}
        onSubmit={handleDeleteFiles}
        selectedFiles={selectedFiles}
        mode="delete"
      />
      {/* Snackbar Notification */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        TransitionComponent={SlideTransition}
      >
        <Alert
          onClose={closeSnackbar}
          severity="success"
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
