import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Slide,
  Alert,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
} from "@mui/material";

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

function AddressForm({ open, handleClose, onSubmit, selectedAddress }) {
  const [formData, setFormData] = useState({
    region: "",
    province: "",
    city: "",
    barangay: "",
    postal_code: "",
    street_name: "",
    is_current: true,
  });

  const [error, setError] = useState("");

  // Prefill data when editing
  useEffect(() => {
    if (selectedAddress) {
      setFormData({
        region: selectedAddress.region || "",
        province: selectedAddress.province || "",
        city: selectedAddress.city || "",
        barangay: selectedAddress.barangay || "",
        postal_code: selectedAddress.postal_code || "",
        street_name: selectedAddress.street_name || "",
        is_current: Boolean(selectedAddress.is_current),
      });
    } else {
      setFormData({
        region: "",
        province: "",
        city: "",
        barangay: "",
        postal_code: "",
        street_name: "",
        is_current: true,
      });
    }

    setError("");
  }, [selectedAddress, open]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
  };

  const handleDefaultChange = (event) => {
    setFormData((prev) => ({ ...prev, is_current: event.target.checked }));
    setError("");
  };

  // Handle form submission
  const handleSubmit = () => {
    // Required fields
    if (!formData.region.trim()) {
      setError("Region is required");
      return;
    }

    if (!formData.city.trim()) {
      setError("City is required");
      return;
    }

    if (!formData.barangay.trim()) {
      setError("Barangay is required");
      return;
    }

    if (!formData.postal_code.trim()) {
      setError("Postal code is required");
      return;
    }

    if (!formData.street_name.trim()) {
      setError("Street name is required");
      return;
    }

    onSubmit(formData);
    handleClose();
  };

  // Enter key
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Enter" && open) {
        // Prevent Enter from submitting while typing
        if (event.target.tagName === "INPUT") {
          return;
        }

        event.preventDefault();
        handleSubmit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, formData]);

  // Escape key
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && open) {
        event.preventDefault();
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      TransitionComponent={Transition}
      keepMounted
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle sx={{ fontWeight: "bold" }}>
        {selectedAddress ? "Edit Address" : "Add Address"}
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "1fr 1fr",
            },
            gap: 2,
            mt: 1,
          }}
        >
          {/* Region */}
          <TextField
            label="Region"
            name="region"
            value={formData.region}
            onChange={handleChange}
            fullWidth
            required
          />

          {/* Province */}
          <TextField
            label="Province"
            name="province"
            value={formData.province}
            onChange={handleChange}
            fullWidth
          />

          {/* City */}
          <TextField
            label="City / Municipality"
            name="city"
            value={formData.city}
            onChange={handleChange}
            fullWidth
            required
          />

          {/* Barangay */}
          <TextField
            label="Barangay"
            name="barangay"
            value={formData.barangay}
            onChange={handleChange}
            fullWidth
            required
          />

          {/* Postal Code */}
          <TextField
            label="Postal Code"
            name="postal_code"
            value={formData.postal_code}
            onChange={handleChange}
            fullWidth
            required
          />

          {/* Street */}
          <TextField
            label="Street Name, Building, House No."
            name="street_name"
            value={formData.street_name}
            onChange={handleChange}
            fullWidth
            required
          />

          <FormControlLabel
            control={
              <Switch
                checked={formData.is_current}
                onChange={handleDefaultChange}
                color="primary"
              />
            }
            label="Use as default address"
            sx={{ gridColumn: { sm: "1 / -1" }, mt: 0.5 }}
          />

        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} color="secondary">
          Cancel
        </Button>

        <Button onClick={handleSubmit} variant="contained" color="primary">
          {selectedAddress ? "Update" : "Add Address"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AddressForm;
