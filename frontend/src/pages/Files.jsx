import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
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
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FilesForm from "../components/Files/FilesForm";
import FilesDelete from "../components/Files/FilesDelete";

export default function Files() {
  const [files, setFiles] = useState([]);
  const [openFilesForm, setOpenFilesForm] = useState(false);
  const [openFilesDelete, setOpenFilesDelete] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState(null);
  const [filesErrorMessage, setFilesErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

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
  return (
    <Box p={3}>
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
      </Box>
      <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }} variant="outlined">
        <Typography variant="h6" sx={{ mb: 2 }}>
          File List
        </Typography>
      </Paper>
      {/* ========== FILES MODALS ========== */}
      <FilesForm
        open={openFilesForm}
        handleClose={() => setOpenFilesForm(false)}
        //onSubmit={handleSubmitFiles} ON HOLD FOR NOW
        selectedFiles={selectedFiles}
        files={files}
      />
      <FilesDelete
        open={openFilesDelete}
        handleClose={() => setOpenFilesDelete(false)}
        //onSubmit={handleDeleteFiles} ON HOLD FOR NOW
        selectedFiles={selectedFiles}
        mode="delete"
      />
    </Box>
  );
}
