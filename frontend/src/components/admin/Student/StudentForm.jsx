import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Slide,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { useTheme } from "@mui/material/styles";
// Icons
import CloseIcon from "@mui/icons-material/Close";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const DropZone = styled(Box, {
  shouldForwardProp: (prop) => prop !== "isDragActive" && prop !== "hasError",
})(({ theme, isDragActive, hasError }) => ({
  width: "100%",
  minHeight: 180,
  border: `2px dashed ${
    hasError
      ? theme.palette.error.main
      : isDragActive
        ? theme.palette.primary.main
        : theme.palette.grey[400]
  }`,
  borderRadius: theme.shape.borderRadius,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: theme.spacing(3),
  cursor: "pointer",
  transition: "all 0.3s ease-in-out",
  backgroundColor: isDragActive ? theme.palette.action.hover : "transparent",
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));

const courseOptions = [
  "Bachelor of Science in Architecture",
  "Bachelor of Fine Arts in Painting",
  "Bachelor of Fine Arts in Advertising Arts",
  "Bachelor of Science in Interior Design",
  "Bachelor of Fine Arts in Industrial Design",
];

const initialFormData = {
  first_name: "",
  middle_name: "",
  last_name: "",
  birthdate: "",
  email: "",
  address: "",
  phone_number: "",
  year_level: "",
  course: "",
  student_number: "",
  cor: "",
  profile_image: "",
};

export default function StudentForm({
  open,
  handleClose,
  onSubmit,
  selectedStudent = null,
}) {
  const theme = useTheme();
  const [formData, setFormData] = useState(initialFormData);
  const [error, setError] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (selectedStudent) {
        setFormData({
          first_name: selectedStudent.first_name || "",
          middle_name: selectedStudent.middle_name || "",
          last_name: selectedStudent.last_name || "",
          birthdate: selectedStudent.birthdate || "",
          email: selectedStudent.email || "",
          address: selectedStudent.address || "",
          phone_number: selectedStudent.phone_number || "",
          year_level: selectedStudent.year_level || "",
          course: selectedStudent.course || "",
          student_number: selectedStudent.student_number || "",
          cor: selectedStudent.cor || "",
          profile_image: selectedStudent.profile_image || "",
        });
        setImagePreview(selectedStudent.cor || null);
      } else {
        setFormData(initialFormData);
        setImagePreview(null);
      }
      setError("");
      setUploadError("");
      setIsSubmitting(false);
    }
  }, [open, selectedStudent]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setUploadError(
        `File size exceeds 2MB limit. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`,
      );
      setImagePreview(null);
      setFormData((prev) => ({ ...prev, cor: "" }));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({ ...prev, cor: reader.result }));
      setImagePreview(reader.result);
      setUploadError("");
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    const requiredFields = [
      "first_name",
      "last_name",
      "birthdate",
      "email",
      "address",
      "phone_number",
      "year_level",
      "course",
      "student_number",
    ];

    const missingField = requiredFields.find(
      (field) => !String(formData[field] || "").trim(),
    );

    if (missingField) {
      setError(`Missing required field: ${missingField.replace(/_/g, " ")}`);
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      const payload = {
        ...formData,
        first_name: formData.first_name.trim(),
        middle_name: formData.middle_name.trim(),
        last_name: formData.last_name.trim(),
        birthdate: formData.birthdate,
        email: formData.email.trim(),
        address: formData.address.trim(),
        phone_number: formData.phone_number.trim(),
        year_level: formData.year_level.trim(),
        course: formData.course.trim(),
        student_number: formData.student_number.trim(),
        cor: formData.cor.trim(),
        profile_image: formData.profile_image.trim(),
      };

      await onSubmit?.(payload);
      handleClose();
    } catch (submissionError) {
      setError(submissionError.message || "Unable to save student");
    } finally {
      setIsSubmitting(false);
    }
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
        {selectedStudent ? "Edit Student" : "Add Student"}
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
        {uploadError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {uploadError}
          </Alert>
        )}

        <Stack spacing={2.5}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 2,
            }}
          >
            <TextField
              label="First Name"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              fullWidth
              autoFocus
            />
            <TextField
              label="Middle Name"
              name="middle_name"
              value={formData.middle_name}
              onChange={handleChange}
              fullWidth
            />
            <TextField
              label="Last Name"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              fullWidth
            />
            <TextField
              label="Date of Birth"
              name="birthdate"
              type="date"
              value={formData.birthdate}
              onChange={handleChange}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              fullWidth
            />
            <TextField
              label="Phone Number"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              fullWidth
            />
            <TextField
              label="Student Number"
              name="student_number"
              value={formData.student_number}
              onChange={handleChange}
              fullWidth
            />
            <TextField
              select
              label="Year Level"
              name="year_level"
              value={formData.year_level}
              onChange={handleChange}
              fullWidth
            >
              <MenuItem value="">
                <em>Select school year</em>
              </MenuItem>
              <MenuItem value="First Year">First Year</MenuItem>
              <MenuItem value="Second Year">Second Year</MenuItem>
              <MenuItem value="Third Year">Third Year</MenuItem>
              <MenuItem value="Fourth Year">Fourth Year</MenuItem>
            </TextField>

            <TextField
              select
              label="Course"
              name="course"
              value={formData.course}
              onChange={handleChange}
              fullWidth
              sx={{ gridColumn: { xs: "auto", md: "1 / -1" } }}
            >
              <MenuItem value="">
                <em>Select course</em>
              </MenuItem>
              {courseOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              fullWidth
              multiline
              rows={3}
              sx={{ gridColumn: { xs: "auto", md: "1 / -1" } }}
            />

            <Box sx={{ gridColumn: { xs: "auto", md: "1 / -1" } }}>
              <DropZone
                isDragActive={isDragActive}
                hasError={Boolean(uploadError)}
                onDragEnter={() => setIsDragActive(true)}
                onDragLeave={() => setIsDragActive(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragActive(false);
                  const file = event.dataTransfer.files?.[0];
                  if (!file) return;
                  const input = document.createElement("input");
                  Object.defineProperty(input, "files", { value: [file] });
                  handleFileChange({ target: input });
                }}
                onDragOver={(event) => event.preventDefault()}
              >
                {imagePreview ? (
                  <Box
                    component="img"
                    src={imagePreview}
                    alt="Student COR preview"
                    sx={{
                      maxWidth: "100%",
                      maxHeight: 180,
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  <>
                    <Typography variant="h6" fontWeight={700}>
                      Upload COR image
                    </Typography>
                    <Typography color="text.secondary">
                      PNG, JPG, or WEBP up to 2MB
                    </Typography>
                  </>
                )}
              </DropZone>

              <Button
                variant="outlined"
                component="label"
                sx={{ width: "100%", mt: 1.5 }}
              >
                Choose COR image
                <input
                  hidden
                  accept="image/*"
                  type="file"
                  onChange={handleFileChange}
                />
              </Button>
            </Box>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={handleClose}
          color="text.secondary"
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isSubmitting}
          sx={{
            color: theme.palette.text.primary,
            borderRadius: 1.5,
            px: 2.5,
            textTransform: "none",
            fontWeight: 700,
            color: "#fff",
          }}
        >
          {isSubmitting && (
            <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />
          )}
          {isSubmitting
            ? selectedStudent
              ? "Saving"
              : "Creating"
            : selectedStudent
              ? "Save changes"
              : "Create student"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
