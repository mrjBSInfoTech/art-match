import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Slide,
  Alert,
  Box,
  Typography,
  IconButton,
  CircularProgress,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import { styled } from "@mui/material/styles";

// Animation transition
const Transition = React.forwardRef(function Transition(props, ref) {
  return (
    <Slide
      direction="up"
      ref={ref}
      {...props}
      timeout={500}
      easing={{
        enter: "cubic-bezier(0.4, 0, 0.2, 1)",
        exit: "ease-out",
      }}
    />
  );
});

// Helper function to get local date string (YYYY-MM-DD) without timezone conversion
const getLocalDateString = (dateValue = null) => {
  let date;

  if (dateValue) {
    // If a date value is provided, parse it
    if (dateValue instanceof Date) {
      date = dateValue;
    } else {
      // If it's a string like "2024-03-13" or "2024-03-13T00:00:00", just extract the date part
      const dateStr = String(dateValue);
      if (dateStr.includes("T")) {
        return dateStr.split("T")[0]; // Already in correct format, just extract
      }
      return dateStr; // Already in YYYY-MM-DD format
    }
  } else {
    // Use today's local date
    date = new Date();
  }

  // Get local date components (not UTC)
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

function CitizenForm({
  open,
  handleClose,
  onSubmit,
  selectedCitizen,
  residents = [],
  mode = "form",
}) {
  const [formData, setFormData] = useState({
    type: "",
    resident_id: "",
  });
  const [error, setError] = useState("");

  // Prefill data when editing
  useEffect(() => {
    if (selectedCitizen) {
      setFormData({
        type: selectedCitizen.type ? String(selectedCitizen.type).toLocaleLowerCase() : "",
        resident_id: selectedCitizen.resident_id || "",
      });
    } else {
      setFormData({
        type: "",
        resident_id: "",
      });
    }
    setError(""); // Clear error when opening dialog
  }, [selectedCitizen, open]);

  // Handle Enter key for submit
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Enter" && open) {
        event.preventDefault();
        handleSubmit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, formData]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setError(""); // Clear error when user types
  };

  const handleSubmit = () => {
    // Validate required fields
    if (!formData.type) {
      setError("Type is required");
      return;
    }

    // Clean up formData - only send resident_id if it's selected
    const submitData = {
      type: formData.type,
    };

    // Only include resident_id if a resident is selected (non-empty)
    if (formData.resident_id && formData.resident_id !== "") {
      submitData.resident_id = formData.resident_id;
    }

    // Pass both citizen and formData to parent
    onSubmit(selectedCitizen, submitData);
    handleClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      TransitionComponent={Transition}
      keepMounted
      PaperProps={{
        sx: { minWidth: "250px" },
      }}
    >
      <>
        <DialogTitle>Edit Citizen</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {/* Type */}
            <FormControl fullWidth margin="dense">
              <InputLabel>Type</InputLabel>
              <Select
                label="Type"
                name="type"
                value={formData.type || ""}
                onChange={handleChange}
              >
                <MenuItem value="">Please Select</MenuItem>
                <MenuItem value="resident">Resident</MenuItem>
                <MenuItem value="visitor">Visitor</MenuItem>
              </Select>
            </FormControl>
            {/* Resident */}
            <FormControl fullWidth margin="dense">
              <InputLabel>Resident</InputLabel>
              <Select
                label="Resident"
                name="resident_id"
                value={formData.resident_id || ""}
                onChange={handleChange}
              >
                <MenuItem value="">
                  <em>No Resident</em>
                </MenuItem>
                {residents.map((resident) => (
                  <MenuItem
                    key={resident.resident_id}
                    value={resident.resident_id}
                  >
                    {resident.first_name} {resident.last_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </>
    </Dialog>
  );
}

export default CitizenForm;
