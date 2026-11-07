import { useEffect, useState, useCallback, forwardRef } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Slide,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  IconButton,
  Chip,
  Divider,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import BackupIcon from "@mui/icons-material/Backup";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import CloseIcon from "@mui/icons-material/Close";
import BuildCircleOutlinedIcon from "@mui/icons-material/BuildCircleOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import CloudDownloadOutlinedIcon from "@mui/icons-material/CloudDownloadOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import { Helmet } from "react-helmet-async";
import ThemeModeSetting from "../../components/admin/Settings/ThemeModeSetting";
import ConnectionErrorPanel from "../../components/admin/ConnectionErrorPanel";
import {
  fetchAccountExpirationDate,
  downloadSystemBackup,
  importSystemBackup,
  saveAccountExpirationDate,
} from "../../api/admin/systemSettingsAPI";
import { useNavigate } from "react-router-dom";
import {
  fetchProgramContent,
  saveProgramContent,
} from "../../api/programContentAPI";

const Transition = forwardRef(function Transition(props, ref) {
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

const programSlides = [
  {
    slug: "architecture",
    title: "Architecture",
    description:
      "Explore architectural studies, models, and visual experiments shaped by students who think carefully about people, place, and possibility.",
    image:
      "https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=1200&q=85",
    eyebrow: "CAFA Program",
    subtitle: "Spaces that give ideas a place to live.",
    focus: ["Spatial storytelling", "Material studies", "Urban futures"],
    stat: "32+",
    statLabel: "studio projects",
  },
  {
    slug: "interior-design",
    title: "Interior Design",
    description:
      "Meet the makers exploring how light, texture, furniture, and human movement can transform an interior into an experience.",
    image:
      "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=85",
    eyebrow: "CAFA Program",
    subtitle: "Objects, rooms, and moods in conversation.",
    focus: [
      "Furniture studies",
      "Light and atmosphere",
      "Human-centered spaces",
    ],
    stat: "24+",
    statLabel: "design studies",
  },
  {
    slug: "fine-arts",
    title: "Fine Arts",
    description:
      "Discover paintings, sculpture, printmaking, and mixed media works from artists developing their own visual language inside the academy.",
    image:
      "https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?auto=format&fit=crop&w=1200&q=85",
    eyebrow: "CAFA Program",
    subtitle: "A direct line from studio practice to collection.",
    focus: ["Painting and color", "Sculptural form", "Experimental media"],
    stat: "86+",
    statLabel: "original works",
  },
];

const getTodayDateValue = () => {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
};

const MAX_BACKUP_SIZE_MB = 2048;

export default function Mechanicals({ title = "Mechanicals" }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const navigate = useNavigate();

  const [activeProgram, setActiveProgram] = useState(programSlides[0].slug);
  const [programContent, setProgramContent] = useState(
    Object.fromEntries(programSlides.map((program) => [program.slug, program])),
  );
  const [programLoading, setProgramLoading] = useState(true);
  const [programSaving, setProgramSaving] = useState(false);
  const [programError, setProgramError] = useState("");
  const [programNotice, setProgramNotice] = useState("");
  const [programHasAttemptedSave, setProgramHasAttemptedSave] = useState(false);
  const [programUpload, setProgramUpload] = useState(null);
  const [programPassword, setProgramPassword] = useState("");
  const [programPasswordDialogOpen, setProgramPasswordDialogOpen] =
    useState(false);

  const [expirationDate, setExpirationDate] = useState("");
  const [loadingExpiration, setLoadingExpiration] = useState(true);
  const [savingExpiration, setSavingExpiration] = useState(false);
  const [expirationError, setExpirationError] = useState("");
  const [expirationNotice, setExpirationNotice] = useState("");

  const [creatingBackup, setCreatingBackup] = useState(false);
  const [backupError, setBackupError] = useState("");
  const [backupNotice, setBackupNotice] = useState("");
  const [importingBackup, setImportingBackup] = useState(false);
  const [backupFile, setBackupFile] = useState(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [backupPassword, setBackupPassword] = useState("");
  const [backupAction, setBackupAction] = useState("");

  const cardSx = {
    width: "100%",
    p: { xs: 2, sm: 2.5, md: 3 },
    borderRadius: 3,
    bgcolor: isDark ? "rgba(30, 41, 59, 0.4)" : "#ffffff",
    border: "1px solid",
    borderColor: isDark
      ? "rgba(255, 255, 255, 0.08)"
      : "rgba(15, 23, 42, 0.08)",
    boxShadow: isDark
      ? "0 4px 20px rgba(0, 0, 0, 0.25)"
      : "0 4px 20px rgba(15, 23, 42, 0.04)",
  };

  const loadExpiration = useCallback(async () => {
    if (title !== "Mechanicals") return;
    try {
      setLoadingExpiration(true);
      setExpirationError("");
      const { date } = await fetchAccountExpirationDate();
      setExpirationDate(date || "");
    } catch (error) {
      setExpirationError(error.message || "Unable to load expiration date.");
    } finally {
      setLoadingExpiration(false);
    }
  }, [title]);

  useEffect(() => {
    loadExpiration();
  }, [loadExpiration]);

  useEffect(() => {
    if (title !== "Program") return;
    fetchProgramContent()
      .then((savedContent) => {
        setProgramContent((current) =>
          Object.fromEntries(
            Object.entries(current).map(([key, fallback]) => [
              key,
              { ...fallback, ...savedContent[key] },
            ]),
          ),
        );
      })
      .catch((error) =>
        setProgramError(error.message || "Unable to load program content."),
      )
      .finally(() => setProgramLoading(false));
  }, [title]);

  const handleSaveExpiration = async (event) => {
    event.preventDefault();
    if (!expirationDate) {
      setExpirationError("Choose an expiration date.");
      setExpirationNotice("");
      return;
    }
    try {
      setSavingExpiration(true);
      setExpirationError("");
      setExpirationNotice("");
      await saveAccountExpirationDate(expirationDate);
      setExpirationNotice("Shared expiration date updated successfully.");
    } catch (error) {
      setExpirationError(error.message || "Unable to save expiration date.");
    } finally {
      setSavingExpiration(false);
    }
  };

  const openExportDialog = () => {
    setBackupError("");
    setBackupNotice("");
    setBackupPassword("");
    setBackupAction("export");
    setImportDialogOpen(true);
  };

  const handleDownloadBackup = async () => {
    if (!backupPassword.trim()) {
      setBackupError("Admin password is required to export backup.");
      return;
    }
    try {
      setCreatingBackup(true);
      setBackupError("");
      setBackupNotice("");
      const { blob, filename } = await downloadSystemBackup(backupPassword);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setBackupNotice("System backup downloaded successfully.");
      setImportDialogOpen(false);
      setBackupPassword("");
      setBackupAction("");
    } catch (error) {
      setBackupError(error.message || "Unable to create backup.");
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleBackupFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_BACKUP_SIZE_MB * 1024 * 1024) {
      setBackupError(
        `Backup file exceeds the ${MAX_BACKUP_SIZE_MB}MB size limit.`,
      );
      event.target.value = "";
      return;
    }
    setBackupFile(file);
    setBackupError("");
    setBackupNotice("");
    setBackupPassword("");
    setBackupAction("import");
    setImportDialogOpen(true);
    event.target.value = "";
  };

  const handleImportBackup = async () => {
    if (!backupFile) {
      setBackupError("Choose a backup ZIP file first.");
      return;
    }
    if (!backupPassword.trim()) {
      setBackupError("Admin password is required to restore backup.");
      return;
    }
    try {
      setImportingBackup(true);
      setBackupError("");
      setBackupNotice("");
      const result = await importSystemBackup(backupFile, backupPassword);
      setBackupNotice(
        result.message || "System backup restored successfully. Reloading...",
      );
      setImportDialogOpen(false);
      setBackupFile(null);
      setBackupPassword("");
      setBackupAction("");
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      setBackupError(error.message || "Unable to restore backup.");
    } finally {
      setImportingBackup(false);
    }
  };

  const handleProgramFieldChange = (field, value) => {
    setProgramContent((current) => ({
      ...current,
      [activeProgram]: {
        ...current[activeProgram],
        [field]: value,
      },
    }));
  };

  const handleAddFocusPoint = () => {
    setProgramContent((current) => {
      const currentProgram = current[activeProgram];
      return {
        ...current,
        [activeProgram]: {
          ...currentProgram,
          focus: [...(currentProgram.focus || []), ""],
        },
      };
    });
  };

  const handleRemoveFocusPoint = (index) => {
    setProgramContent((current) => {
      const currentProgram = current[activeProgram];
      const updatedFocus = [...(currentProgram.focus || [])];
      updatedFocus.splice(index, 1);
      return {
        ...current,
        [activeProgram]: {
          ...currentProgram,
          focus: updatedFocus,
        },
      };
    });
  };

  const handleFocusChange = (index, value) => {
    setProgramContent((current) => {
      const currentProgram = current[activeProgram];
      const updatedFocus = [...(currentProgram.focus || [])];
      updatedFocus[index] = value;
      return {
        ...current,
        [activeProgram]: {
          ...currentProgram,
          focus: updatedFocus,
        },
      };
    });
  };

  const handleProgramImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setProgramError("Program image must be 5MB or smaller.");
      return;
    }
    setProgramUpload(file);
    const previewUrl = URL.createObjectURL(file);
    handleProgramFieldChange("image", previewUrl);
  };

  const handleProgramSave = () => {
    setProgramHasAttemptedSave(true);
    setProgramError("");
    setProgramNotice("");
    setProgramPassword("");
    setProgramPasswordDialogOpen(true);
  };

  const confirmProgramSave = async () => {
    if (!programPassword.trim()) {
      setProgramError("Admin password is required to save program content.");
      return;
    }
    try {
      setProgramSaving(true);
      setProgramError("");
      setProgramNotice("");
      await saveProgramContent(programContent, programPassword, programUpload);
      setProgramNotice("Program content saved and published successfully.");
      setProgramPasswordDialogOpen(false);
      setProgramPassword("");
      setProgramUpload(null);
    } catch (error) {
      setProgramError(error.message || "Unable to save program content.");
    } finally {
      setProgramSaving(false);
    }
  };

  const selectedProgram = programContent[activeProgram] || programSlides[0];

  if (title === "Program") {
    return (
      <Box
        sx={{
          p: { xs: 1.5, sm: 2.5 },
          minHeight: "100vh",
          width: "100%",
          boxSizing: "border-box",
          backgroundColor: theme.palette.background.default,
          color: theme.palette.text.primary,
        }}
      >
        <Helmet titleTemplate="%s - ArtMatch">
          <title>Program Content</title>
        </Helmet>

        {/* Standard Admin Header */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", sm: "flex-start" }}
          spacing={2}
          sx={{ mb: 3 }}
        >
          <Box>
            <Typography
              sx={{
                fontSize: { xs: 28, sm: 38 },
                fontWeight: 800,
                lineHeight: 1.1,
                color: "text.primary",
              }}
            >
              CAFA Programs
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.75, fontSize: 13 }}>
              Manage promotional landing pages, curriculum focus points, and
              showcases for college departments.
            </Typography>
          </Box>
        </Stack>

        {programError && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {programError}
          </Alert>
        )}
        {programNotice && (
          <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
            {programNotice}
          </Alert>
        )}

        <Paper elevation={0} sx={cardSx}>
          <Tabs
            value={activeProgram}
            onChange={(_, value) => setActiveProgram(value)}
            sx={{
              mb: 3,
              borderBottom: "1px solid",
              borderColor: "divider",
              "& .MuiTab-root": {
                fontWeight: 700,
                textTransform: "none",
                fontSize: 15,
                minHeight: 48,
              },
              "& .Mui-selected": {
                color: "#ef3340 !important",
              },
              "& .MuiTabs-indicator": {
                backgroundColor: "#ef3340",
                height: 3,
                borderRadius: "3px 3px 0 0",
              },
            }}
          >
            {programSlides.map((program) => (
              <Tab
                key={program.slug}
                value={program.slug}
                label={program.title}
              />
            ))}
          </Tabs>

          <Stack spacing={3}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 2.5,
              }}
            >
              <TextField
                label="Department Eyebrow"
                value={selectedProgram.eyebrow || ""}
                onChange={(e) =>
                  handleProgramFieldChange("eyebrow", e.target.value)
                }
                size="small"
                fullWidth
              />
              <TextField
                label="Program Title"
                value={selectedProgram.title || ""}
                onChange={(e) =>
                  handleProgramFieldChange("title", e.target.value)
                }
                size="small"
                fullWidth
              />
              <TextField
                label="Headline Subtitle"
                value={selectedProgram.subtitle || ""}
                onChange={(e) =>
                  handleProgramFieldChange("subtitle", e.target.value)
                }
                size="small"
                fullWidth
                sx={{ gridColumn: { xs: "auto", sm: "1 / -1" } }}
              />
              <TextField
                label="Detailed Description"
                value={selectedProgram.description || ""}
                onChange={(e) =>
                  handleProgramFieldChange("description", e.target.value)
                }
                size="small"
                fullWidth
                multiline
                rows={3}
                sx={{ gridColumn: { xs: "auto", sm: "1 / -1" } }}
              />
              <TextField
                label="Display Stat (e.g. 32+)"
                value={selectedProgram.stat || ""}
                onChange={(e) =>
                  handleProgramFieldChange("stat", e.target.value)
                }
                size="small"
                fullWidth
              />
              <TextField
                label="Stat Label (e.g. studio projects)"
                value={selectedProgram.statLabel || ""}
                onChange={(e) =>
                  handleProgramFieldChange("statLabel", e.target.value)
                }
                size="small"
                fullWidth
              />
            </Box>

            <Divider
              sx={{
                borderColor: isDark
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(0,0,0,0.06)",
              }}
            />

            {/* Showcase Image */}
            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                Showcase Cover Image
              </Typography>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2.5}
                alignItems="center"
              >
                {selectedProgram.image && (
                  <Box
                    component="img"
                    src={selectedProgram.image}
                    alt={selectedProgram.title}
                    sx={{
                      width: { xs: "100%", sm: 180 },
                      height: 110,
                      objectFit: "cover",
                      borderRadius: 2.5,
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  />
                )}
                <Box>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<UploadFileRoundedIcon />}
                    sx={{
                      borderRadius: 2,
                      textTransform: "none",
                      fontWeight: 700,
                      borderColor: isDark
                        ? "rgba(255,255,255,0.2)"
                        : "rgba(15,23,42,0.2)",
                    }}
                  >
                    Change Program Image
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleProgramImageChange}
                    />
                  </Button>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    sx={{ mt: 1 }}
                  >
                    High-resolution horizontal photograph up to 5MB
                  </Typography>
                </Box>
              </Stack>
            </Box>

            <Divider
              sx={{
                borderColor: isDark
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(0,0,0,0.06)",
              }}
            />

            {/* Curriculum Focus Points */}
            <Box>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 1.5 }}
              >
                <Typography variant="subtitle2" fontWeight={700}>
                  Curriculum &amp; Studio Focus Points
                </Typography>
                <Button
                  size="small"
                  startIcon={<AddRoundedIcon />}
                  onClick={handleAddFocusPoint}
                  sx={{
                    textTransform: "none",
                    fontWeight: 700,
                    color: "#ef3340",
                  }}
                >
                  Add Focus Point
                </Button>
              </Stack>

              <Stack spacing={1.5}>
                {(selectedProgram.focus || []).map((point, index) => (
                  <Stack
                    key={index}
                    direction="row"
                    spacing={1}
                    alignItems="center"
                  >
                    <TextField
                      size="small"
                      fullWidth
                      value={point}
                      onChange={(e) => handleFocusChange(index, e.target.value)}
                      placeholder={`Focus area ${index + 1}`}
                    />
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemoveFocusPoint(index)}
                      sx={{ p: 1 }}
                    >
                      <DeleteOutlineRoundedIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
            </Box>

            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                pt: 2,
              }}
            >
              <Button
                variant="outlined"
                onClick={() =>
                  navigate(`/buyer/programs/${selectedProgram.slug}`)
                }
                sx={{
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 700,
                  borderColor: isDark
                    ? "rgba(255,255,255,0.2)"
                    : "rgba(15,23,42,0.2)",
                }}
              >
                View Public Page
              </Button>

              <Button
                variant="contained"
                onClick={handleProgramSave}
                disabled={programSaving}
                sx={{
                  borderRadius: 2,
                  px: 3,
                  py: 1,
                  bgcolor: "#ef3340",
                  color: "#fff",
                  textTransform: "none",
                  fontWeight: 700,
                  boxShadow: "0 2px 10px rgba(239, 51, 64, 0.3)",
                  "&:hover": { bgcolor: "#d62835" },
                }}
              >
                {programSaving ? "Saving..." : "Save Program Changes"}
              </Button>
            </Box>
          </Stack>
        </Paper>

        {/* Password Confirmation Dialog */}
        <Dialog
          open={programPasswordDialogOpen}
          onClose={() => !programSaving && setProgramPasswordDialogOpen(false)}
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
            Confirm Program Changes
            <Button
              aria-label="Close"
              onClick={() => setProgramPasswordDialogOpen(false)}
              disabled={programSaving}
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
          <DialogContent dividers sx={{ px: 3, py: 2.5 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Enter your admin password to publish these updates to the student
              and public catalogue.
            </Typography>
            <TextField
              autoFocus
              label="Admin password"
              type="password"
              value={programPassword}
              onChange={(e) => setProgramPassword(e.target.value)}
              fullWidth
              size="small"
              disabled={programSaving}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmProgramSave();
              }}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button
              onClick={() => setProgramPasswordDialogOpen(false)}
              disabled={programSaving}
              color="inherit"
              sx={{ textTransform: "none", color: "text.secondary" }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmProgramSave}
              variant="contained"
              disabled={programSaving || !programPassword.trim()}
              sx={{
                borderRadius: 1.5,
                px: 2.5,
                textTransform: "none",
                fontWeight: 700,
                color: "#fff",
                backgroundColor: "#ef3340",
                "&:hover": { backgroundColor: "#d62835" },
              }}
            >
              {programSaving ? "Saving..." : "Confirm & Save"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  // Mechanicals View (Default)
  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2.5 },
        minHeight: "100vh",
        width: "100%",
        boxSizing: "border-box",
        backgroundColor: theme.palette.background.default,
        color: theme.palette.text.primary,
      }}
    >
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Mechanicals</title>
      </Helmet>

      {/* Standard Admin Header Banner */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "flex-start" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: { xs: 28, sm: 38 },
              fontWeight: 800,
              lineHeight: 1.1,
              color: "text.primary",
            }}
          >
            Mechanicals
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75, fontSize: 13 }}>
            System maintenance, shared semester reactivation schedules, and
            database disaster recovery.
          </Typography>
        </Box>
      </Stack>

      <Stack spacing={2.5}>
        {/* Appearance & Theme Section */}
        <ThemeModeSetting />

        {/* Reactivation Time Frame Section */}
        <Paper elevation={0} sx={cardSx}>
          <Box
            sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5 }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                display: "grid",
                placeItems: "center",
                bgcolor: "rgba(239, 51, 64, 0.1)",
                color: "#ef3340",
                flexShrink: 0,
              }}
            >
              <CalendarMonthOutlinedIcon sx={{ fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
                Reactivation Time Frame &amp; Semester Expiration
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Set the shared semester expiration date for student artist
                accounts across ArtMatch
              </Typography>
            </Box>
          </Box>

          <Box component="form" onSubmit={handleSaveExpiration} noValidate>
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                alignItems: { xs: "stretch", sm: "center" },
                gap: 2,
                justifyContent: "space-between",
              }}
            >
              <TextField
                label="Shared Expiration Date"
                type="date"
                size="small"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                slotProps={{
                  htmlInput: { min: getTodayDateValue() },
                  inputLabel: { shrink: true },
                }}
                helperText="Accounts remain active through this date"
                disabled={loadingExpiration || savingExpiration}
                sx={{ minWidth: 260 }}
              />
              <Button
                type="submit"
                variant="contained"
                disabled={loadingExpiration || savingExpiration}
                sx={{
                  borderRadius: 2,
                  px: 3,
                  py: 1,
                  bgcolor: "#ef3340",
                  color: "#fff",
                  textTransform: "none",
                  fontWeight: 700,
                }}
              >
                {savingExpiration ? "Saving..." : "Save Expiration Date"}
              </Button>
              {loadingExpiration && (
                <CircularProgress size={24} sx={{ color: "#ef3340" }} />
              )}
            </Box>

            {expirationError && (
              <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
                {expirationError}
              </Alert>
            )}
            {expirationNotice && (
              <Alert severity="success" sx={{ mt: 2, borderRadius: 2 }}>
                {expirationNotice}
              </Alert>
            )}
          </Box>
        </Paper>

        {/* System Backup and Disaster Recovery Section */}
        <Paper elevation={0} sx={cardSx}>
          <Box
            sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5 }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                display: "grid",
                placeItems: "center",
                bgcolor: "rgba(239, 51, 64, 0.1)",
                color: "#ef3340",
                flexShrink: 0,
              }}
            >
              <BackupIcon sx={{ fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
                System Backup &amp; Disaster Recovery
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Generate an encrypted full-system snapshot (database + uploads)
                or restore from an existing backup archive
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "stretch", sm: "center" },
              gap: 2,
              justifyContent: "space-between",
            }}
          >
            <Button
              variant="outlined"
              onClick={openExportDialog}
              disabled={creatingBackup}
              startIcon={
                creatingBackup ? (
                  <CircularProgress size={16} />
                ) : (
                  <CloudDownloadOutlinedIcon />
                )
              }
              sx={{
                borderRadius: 2,
                px: 2.5,
                py: 1,
                textTransform: "none",
                fontWeight: 700,
                borderColor: isDark
                  ? "rgba(255,255,255,0.2)"
                  : "rgba(15,23,42,0.2)",
                color: "text.primary",
                "&:hover": { borderColor: "#ef3340", color: "#ef3340" },
              }}
            >
              {creatingBackup
                ? "Preparing Archive..."
                : "Download System Backup (ZIP)"}
            </Button>

            <Button
              component="label"
              variant="outlined"
              color="error"
              disabled={importingBackup}
              startIcon={
                importingBackup ? (
                  <CircularProgress size={16} />
                ) : (
                  <UploadFileRoundedIcon />
                )
              }
              sx={{
                borderRadius: 2,
                px: 2.5,
                py: 1,
                textTransform: "none",
                fontWeight: 700,
              }}
            >
              {importingBackup
                ? "Restoring Archive..."
                : "Import System Backup"}
              <input
                type="file"
                accept=".zip,application/zip"
                hidden
                onChange={handleBackupFileChange}
              />
            </Button>
          </Box>

          {backupError && (
            <Alert severity="error" sx={{ mt: 2.5, borderRadius: 2 }}>
              {backupError}
            </Alert>
          )}
          {backupNotice && (
            <Alert severity="success" sx={{ mt: 2.5, borderRadius: 2 }}>
              {backupNotice}
            </Alert>
          )}
        </Paper>
      </Stack>

      {/* Backup Import / Export Confirmation Dialog */}
      <Dialog
        open={importDialogOpen}
        onClose={() => {
          if (!creatingBackup && !importingBackup) {
            setImportDialogOpen(false);
            setBackupPassword("");
            setBackupAction("");
          }
        }}
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
          <BackupIcon sx={{ color: "#ef3340", fontSize: 20 }} />
          {backupAction === "export"
            ? "Export System Backup"
            : "Confirm Backup Restoration"}
          <Button
            aria-label="Close"
            onClick={() => setImportDialogOpen(false)}
            disabled={creatingBackup || importingBackup}
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
        <DialogContent dividers sx={{ px: 3, py: 2.5 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {backupAction === "export"
              ? "Confirm your admin master credentials to export a complete system snapshot containing active database collections and uploaded portfolios."
              : "Restoring an archive overwrites existing database state and restores uploaded media. Only proceed with trusted ArtMatch system backups."}
          </Typography>

          {backupFile && (
            <Chip
              label={`Selected File: ${backupFile.name}`}
              size="small"
              sx={{ mb: 2, fontWeight: 600 }}
            />
          )}

          <TextField
            autoFocus
            fullWidth
            required
            type="password"
            label="Admin Master Password"
            value={backupPassword}
            onChange={(e) => {
              setBackupPassword(e.target.value);
              setBackupError("");
            }}
            size="small"
            autoComplete="current-password"
          />

          {backupError && (
            <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
              {backupError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => setImportDialogOpen(false)}
            disabled={creatingBackup || importingBackup}
            color="inherit"
            sx={{ textTransform: "none", color: "text.secondary" }}
          >
            Cancel
          </Button>
          <Button
            color={backupAction === "export" ? "primary" : "error"}
            variant="contained"
            onClick={
              backupAction === "export"
                ? handleDownloadBackup
                : handleImportBackup
            }
            disabled={
              creatingBackup || importingBackup || !backupPassword.trim()
            }
            sx={{
              borderRadius: 1.5,
              px: 2.5,
              textTransform: "none",
              fontWeight: 700,
              ...(backupAction === "export"
                ? {
                    color: "#fff",
                    bgcolor: "#ef3340",
                    "&:hover": { bgcolor: "#d62835" },
                  }
                : {}),
            }}
          >
            {backupAction === "export"
              ? creatingBackup
                ? "Preparing..."
                : "Export Backup"
              : importingBackup
                ? "Restoring..."
                : "Replace & Restore"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
