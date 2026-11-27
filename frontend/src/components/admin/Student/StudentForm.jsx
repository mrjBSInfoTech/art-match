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
import { courseOptions, yearLevelOptions } from "./studentOptions";
import { getCanonicalCourseName } from "../../../utils/courseFilter.js";
import { API_BASE_URL } from "../../../api/apiBase.js";
import { getToken } from "../../../../utils/auth.js";
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

const MIN_STUDENT_AGE = 17;

const getMaxStudentBirthdate = () => {
  const today = new Date();
  const cutoff = new Date(
    today.getFullYear() - MIN_STUDENT_AGE,
    today.getMonth(),
    today.getDate(),
  );
  const year = cutoff.getFullYear();
  const month = String(cutoff.getMonth() + 1).padStart(2, "0");
  const day = String(cutoff.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const isAtLeastStudentAge = (birthdateString, minAge = MIN_STUDENT_AGE) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(
    String(birthdateString || "").trim(),
  );
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const birthDate = new Date(year, month - 1, day);
  if (
    birthDate.getFullYear() !== year ||
    birthDate.getMonth() !== month - 1 ||
    birthDate.getDate() !== day
  ) {
    return false;
  }
  const today = new Date();
  let age = today.getFullYear() - year;
  const monthDiff = today.getMonth() + 1 - month;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) {
    age -= 1;
  }
  return age >= minAge;
};

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
  const [loadingCorPreview, setLoadingCorPreview] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    let active = true;
    let objectUrl = null;

    if (selectedStudent) {
      const normalizedBirthdate = selectedStudent.birthdate
        ? String(selectedStudent.birthdate).slice(0, 10)
        : "";
      setFormData({
        first_name: selectedStudent.first_name || "",
        middle_name: selectedStudent.middle_name || "",
        last_name: selectedStudent.last_name || "",
        birthdate: normalizedBirthdate,
        email: selectedStudent.email || "",
        address: selectedStudent.address || "",
        phone_number: selectedStudent.phone_number || "",
        year_level: selectedStudent.year_level || "",
        course: getCanonicalCourseName(selectedStudent.course),
        student_number: selectedStudent.student_number || "",
        cor: selectedStudent.cor || "",
        profile_image: selectedStudent.profile_image || "",
      });

      const rawCor = String(selectedStudent.cor || "").trim();
      if (!rawCor) {
        setImagePreview(null);
        setLoadingCorPreview(false);
      } else if (/^(data:|blob:)/i.test(rawCor)) {
        setImagePreview(rawCor);
        setLoadingCorPreview(false);
      } else {
        const corUrl = /^https?:\/\//i.test(rawCor)
          ? rawCor
          : `${API_BASE_URL}/uploads/seller/uploadCOR/${encodeURIComponent(rawCor)}`;
        const token = getToken("admin");
        setImagePreview(null);
        setLoadingCorPreview(true);
        fetch(corUrl, {
          credentials: "include",
          ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
        })
          .then(async (res) => {
            if (!res.ok) {
              throw new Error(
                res.status === 404
                  ? "Existing COR image file was not found."
                  : "Unable to load existing COR preview.",
              );
            }
            return res.blob();
          })
          .then((blob) => {
            if (!active) return;
            objectUrl = URL.createObjectURL(blob);
            setImagePreview(objectUrl);
          })
          .catch((previewErr) => {
            if (!active) return;
            setUploadError(previewErr.message || "Unable to load existing COR preview.");
          })
          .finally(() => {
            if (active) setLoadingCorPreview(false);
          });
      }
    } else {
      setFormData(initialFormData);
      setImagePreview(null);
      setLoadingCorPreview(false);
    }

    setError("");
    setUploadError("");
    setIsSubmitting(false);

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, selectedStudent]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setUploadError("COR image must be a PNG, JPG, or WEBP file.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setUploadError(
        `File size exceeds 2MB limit. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`,
      );
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

    if (!isAtLeastStudentAge(formData.birthdate, MIN_STUDENT_AGE)) {
      setError(`Student must be at least ${MIN_STUDENT_AGE} years old.`);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!/^[0-9+\-() ]{7,20}$/.test(formData.phone_number.trim())) {
      setError("Please enter a valid phone number.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      const trimmedCor = formData.cor.trim();
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
        ...(selectedStudent || trimmedCor ? { cor: trimmedCor } : {}),
        profile_image: formData.profile_image.trim(),
      };
      if (!selectedStudent && !trimmedCor) {
        delete payload.cor;
      }

      await onSubmit?.(payload);
      handleClose();
    } catch (submissionError) {
      setError(submissionError.message || "Unable to save student");
    } finally {
      setIsSubmitting(false);
    }
  };

  const ageWarning =
    Boolean(formData.birthdate) &&
    !isAtLeastStudentAge(formData.birthdate, MIN_STUDENT_AGE)
      ? `Student must be at least ${MIN_STUDENT_AGE} years old.`
      : "";

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
        {!selectedStudent && (
          <Alert severity="info" sx={{ mb: 2 }}>
            The initial password will be the student's surname in uppercase.
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
              id="student-first-name"
              label="First Name"
              name="first_name"
              autoComplete="given-name"
              value={formData.first_name}
              onChange={handleChange}
              fullWidth
              autoFocus
            />
            <TextField
              id="student-middle-name"
              label="Middle Name"
              name="middle_name"
              autoComplete="additional-name"
              value={formData.middle_name}
              onChange={handleChange}
              fullWidth
            />
            <TextField
              id="student-last-name"
              label="Last Name"
              name="last_name"
              autoComplete="family-name"
              value={formData.last_name}
              onChange={handleChange}
              fullWidth
            />
            <TextField
              id="student-birthdate"
              label="Date of Birth"
              name="birthdate"
              type="date"
              autoComplete="bday"
              value={formData.birthdate}
              onChange={handleChange}
              fullWidth
              InputLabelProps={{ shrink: true }}
              inputProps={{ max: getMaxStudentBirthdate() }}
              error={Boolean(ageWarning)}
              helperText={ageWarning}
            />
            <TextField
              id="student-email"
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              fullWidth
            />
            <TextField
              id="student-phone-number"
              label="Phone Number"
              name="phone_number"
              autoComplete="tel"
              value={formData.phone_number}
              onChange={handleChange}
              fullWidth
            />
            <TextField
              id="student-number"
              label="Student Number"
              name="student_number"
              autoComplete="off"
              value={formData.student_number}
              onChange={handleChange}
              fullWidth
            />
            <TextField
              id="student-year-level"
              select
              label="Year Level"
              name="year_level"
              autoComplete="off"
              value={formData.year_level}
              onChange={handleChange}
              fullWidth
            >
              <MenuItem value="">
                <em>Select school year</em>
              </MenuItem>
              {yearLevelOptions.map((year) => (
                <MenuItem key={year} value={year}>
                  {year}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              id="student-course"
              select
              label="Course"
              name="course"
              autoComplete="off"
              value={formData.course}
              onChange={handleChange}
              fullWidth
              sx={{ gridColumn: { xs: "auto", md: "1 / -1" } }}
            >
              <MenuItem value="">
                <em>Select course</em>
              </MenuItem>
              {(formData.course && !courseOptions.includes(formData.course)
                ? [...courseOptions, formData.course]
                : courseOptions
              ).map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              id="student-address"
              label="Address"
              name="address"
              autoComplete="street-address"
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
                {loadingCorPreview ? (
                  <CircularProgress size={32} />
                ) : imagePreview ? (
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
                htmlFor="student-cor-file-input"
                sx={{ width: "100%", mt: 1.5 }}
              >
                Choose COR image
                <input
                  id="student-cor-file-input"
                  name="corFile"
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
