import { useEffect, useState, useCallback } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  IconButton,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import BackupIcon from "@mui/icons-material/Backup";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { Helmet } from "react-helmet-async";
import ThemeModeSetting from "../../components/settings/ThemeModeSetting";
import ConnectionErrorPanel from "../../components/admin/ConnectionErrorPanel";
import {
  fetchAccountExpirationDate,
  downloadSystemBackup,
  saveAccountExpirationDate,
} from "../../api/admin/systemSettingsAPI";
import { useNavigate } from "react-router-dom";
import {
  fetchProgramContent,
  saveProgramContent,
} from "../../api/programContentAPI";

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
    focus: ["Furniture studies", "Light and atmosphere", "Human-centered spaces"],
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

export default function SystemSettingsPlaceholder({ title }) {
  const theme = useTheme();
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
  const [programPasswordDialogOpen, setProgramPasswordDialogOpen] = useState(false);
  const [expirationDate, setExpirationDate] = useState("");
  const [loadingExpiration, setLoadingExpiration] = useState(true);
  const [savingExpiration, setSavingExpiration] = useState(false);
  const [expirationError, setExpirationError] = useState("");
  const [expirationNotice, setExpirationNotice] = useState("");
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [backupError, setBackupError] = useState("");
  const [backupNotice, setBackupNotice] = useState("");

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
      .catch((error) => setProgramError(error.message || "Unable to load program content."))
      .finally(() => setProgramLoading(false));
  }, [title]);

  const handleSaveExpiration = async (event) => {
    event.preventDefault();
    if (!expirationDate) {
      setExpirationError("Choose an expiration date.");
      setExpirationNotice("");
      return;
    }

    setSavingExpiration(true);
    setExpirationError("");
    setExpirationNotice("");
    try {
      const result = await saveAccountExpirationDate(expirationDate);
      setExpirationDate(result.date);
      setExpirationNotice(
        `Expiration date saved. ${result.updatedAccounts} existing account(s) updated. All student/seller accounts remain active through ${result.date}.`,
      );
    } catch (error) {
      setExpirationError(error.message);
    } finally {
      setSavingExpiration(false);
    }
  };

  const handleDownloadBackup = async () => {
    setCreatingBackup(true);
    setBackupError("");
    setBackupNotice("");
    try {
      const { blob, filename } = await downloadSystemBackup();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setBackupNotice("System backup downloaded.");
    } catch (error) {
      setBackupError(error.message || "Unable to download the system backup.");
    } finally {
      setCreatingBackup(false);
    }
  };

  const updateProgramField = (field, value) => {
    setProgramContent((current) => ({
      ...current,
      [activeProgram]: { ...current[activeProgram], [field]: value },
    }));
  };

  const updateProgramFocus = (index, value) => {
    setProgramContent((current) => ({
      ...current,
      [activeProgram]: {
        ...current[activeProgram],
        focus: current[activeProgram].focus.map((item, itemIndex) =>
          itemIndex === index ? value : item,
        ),
      },
    }));
  };

  const handleProgramImageChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setProgramError("Upload a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProgramError("Program image must be 5MB or smaller.");
      return;
    }
    setProgramError("");
    const preview = URL.createObjectURL(file);
    setProgramUpload((current) => {
      if (current?.preview) URL.revokeObjectURL(current.preview);
      return { file, program: activeProgram, preview };
    });
  };

  const addProgramFocus = () => {
    updateProgramField("focus", [...programContent[activeProgram].focus, ""]);
  };

  const removeProgramFocus = (index) => {
    updateProgramField(
      "focus",
      programContent[activeProgram].focus.filter(
        (_item, itemIndex) => itemIndex !== index,
      ),
    );
  };

  const handleProgramSave = () => {
    const selectedProgram = programContent[activeProgram];
    setProgramHasAttemptedSave(true);
    if (
      !selectedProgram.title.trim() ||
      !selectedProgram.eyebrow.trim() ||
      !selectedProgram.subtitle.trim() ||
      !selectedProgram.description.trim() ||
      !selectedProgram.image.trim() ||
      !selectedProgram.stat.trim() ||
      !selectedProgram.statLabel.trim() ||
      !selectedProgram.focus.length ||
      selectedProgram.focus.some((item) => !item.trim())
    ) {
      setProgramError("Complete all required fields and add at least one focus point before saving.");
      setProgramNotice("");
      return;
    }
    setProgramError("");
    setProgramNotice("");
    setProgramPassword("");
    setProgramPasswordDialogOpen(true);
  };

  const confirmProgramSave = async () => {
    if (!programPassword) {
      setProgramError("Enter your admin password to save Program changes.");
      return;
    }
    setProgramSaving(true);
    setProgramError("");
    setProgramNotice("");
    try {
      const saved = await saveProgramContent(
        { ...programContent, _upload: programUpload },
        programPassword,
      );
      setProgramContent(saved);
      if (programUpload?.preview) URL.revokeObjectURL(programUpload.preview);
      setProgramUpload(null);
      setProgramNotice("Program content saved successfully.");
      setProgramPasswordDialogOpen(false);
      setProgramPassword("");
    } catch (error) {
      setProgramError(error.message || "Unable to save program content.");
    } finally {
      setProgramSaving(false);
    }
  };

  if (title === "Mechanicals" && expirationError && !expirationDate) {
    return (
      <Box sx={{ minWidth: 0 }}>
        <Helmet titleTemplate="%s - ArtMatch">
          <title>{title}</title>
        </Helmet>
        <ConnectionErrorPanel
          title={`${title} Settings Unavailable`}
          message={expirationError}
          onRetry={loadExpiration}
        />
      </Box>
    );
  }

  if (title === "Program") {
    const selectedProgram = programContent[activeProgram] || programSlides[0];
    const selectedImage =
      programUpload?.program === activeProgram
        ? programUpload.preview
        : selectedProgram.image;

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
          <title>Program</title>
        </Helmet>
        <Typography
          sx={{
            fontSize: { xs: 28, sm: 38 },
            fontWeight: 800,
            lineHeight: 1.1,
          }}
        >
          Program
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 0.75, fontSize: 13 }}>
          Edit the content shown on the customer-facing program pages.
        </Typography>
        {programError && <Alert severity="error" sx={{ mt: 2 }}>{programError}</Alert>}
        {programNotice && <Alert severity="success" sx={{ mt: 2 }}>{programNotice}</Alert>}

        <Tabs
          value={activeProgram}
          onChange={(_event, value) => setActiveProgram(value)}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="Programs"
          sx={{ mt: 3, mb: 3 }}
        >
          {programSlides.map((program) => (
            <Tab
              key={program.slug}
              value={program.slug}
              label={program.title}
              sx={{ minHeight: 48, textTransform: "none", fontWeight: 700 }}
            />
          ))}
        </Tabs>

        {programLoading ? <CircularProgress sx={{ mt: 4 }} /> : <Paper
          variant="outlined"
          sx={{
            overflow: "hidden",
            borderRadius: 4,
            borderColor: "divider",
            backgroundColor: "background.paper",
          }}
        >
          <Box
            component="img"
            src={selectedImage}
            alt={`${selectedProgram.title} program`}
            sx={{
              display: "block",
              width: "100%",
              height: { xs: 220, sm: 320 },
              objectFit: "cover",
            }}
          />
          <Stack spacing={2} sx={{ p: { xs: 2, sm: 3 } }}>
            <Stack spacing={2}>
              <TextField label="Title" value={selectedProgram.title} onChange={(event) => updateProgramField("title", event.target.value)} error={programHasAttemptedSave && !selectedProgram.title.trim()} helperText={programHasAttemptedSave && !selectedProgram.title.trim() ? "This field is required." : ""} fullWidth />
              <TextField label="Eyebrow" value={selectedProgram.eyebrow} onChange={(event) => updateProgramField("eyebrow", event.target.value)} error={programHasAttemptedSave && !selectedProgram.eyebrow.trim()} helperText={programHasAttemptedSave && !selectedProgram.eyebrow.trim() ? "This field is required." : ""} fullWidth />
              <TextField label="Subtitle" value={selectedProgram.subtitle} onChange={(event) => updateProgramField("subtitle", event.target.value)} error={programHasAttemptedSave && !selectedProgram.subtitle.trim()} helperText={programHasAttemptedSave && !selectedProgram.subtitle.trim() ? "This field is required." : ""} fullWidth />
              <TextField label="Description" value={selectedProgram.description} onChange={(event) => updateProgramField("description", event.target.value)} error={programHasAttemptedSave && !selectedProgram.description.trim()} helperText={programHasAttemptedSave && !selectedProgram.description.trim() ? "This field is required." : ""} fullWidth multiline minRows={4} />
              <Stack spacing={1}>
                <Typography variant="h6" fontWeight={700}>Program image</Typography>
                <Button
                  component="label"
                  variant="outlined"
                  disabled={programSaving}
                  sx={{ alignSelf: "flex-start", textTransform: "none" }}
                >
                  {programUpload?.program === activeProgram ? "Replace image" : "Upload image"}
                  <input
                    hidden
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleProgramImageChange}
                  />
                </Button>
                <Typography variant="body2" color="text.secondary">
                  JPEG, PNG, or WebP up to 5MB. The image is published after password confirmation.
                </Typography>
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField label="Statistic" value={selectedProgram.stat} onChange={(event) => updateProgramField("stat", event.target.value)} error={programHasAttemptedSave && !selectedProgram.stat.trim()} helperText={programHasAttemptedSave && !selectedProgram.stat.trim() ? "This field is required." : ""} fullWidth />
                <TextField label="Statistic label" value={selectedProgram.statLabel} onChange={(event) => updateProgramField("statLabel", event.target.value)} error={programHasAttemptedSave && !selectedProgram.statLabel.trim()} helperText={programHasAttemptedSave && !selectedProgram.statLabel.trim() ? "This field is required." : ""} fullWidth />
              </Stack>
              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="h6" fontWeight={700}>Focus points</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Add, edit, or remove the points shown on the public page.
                    </Typography>
                  </Box>
                  <Button startIcon={<AddRoundedIcon />} onClick={addProgramFocus}>
                    Add focus point
                  </Button>
                </Stack>
                {selectedProgram.focus.map((item, index) => (
                  <Stack direction="row" spacing={1.5} alignItems="flex-start" key={`${selectedProgram.slug}-focus-${index}`}>
                    <TextField label={`Focus point ${index + 1}`} value={item} onChange={(event) => updateProgramFocus(index, event.target.value)} error={programHasAttemptedSave && !item.trim()} helperText={programHasAttemptedSave && !item.trim() ? "This entry is required." : ""} fullWidth />
                    <IconButton aria-label={`Delete focus point ${index + 1}`} color="error" onClick={() => removeProgramFocus(index)} disabled={selectedProgram.focus.length <= 1}>
                      <DeleteOutlineRoundedIcon />
                    </IconButton>
                  </Stack>
                ))}
                {!selectedProgram.focus.length && (
                  <Typography variant="body2" color="text.secondary">
                    No focus points added.
                  </Typography>
                )}
              </Stack>
            </Stack>
            <Button
              variant="outlined"
              onClick={() => navigate(`/buyer/programs/${selectedProgram.slug}`)}
              sx={{ alignSelf: "flex-start", textTransform: "none" }}
            >
              View public page
            </Button>
          </Stack>
        </Paper>}
        {!programLoading && (
          <Button
            variant="contained"
            size="large"
            startIcon={
              programSaving ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <SaveRoundedIcon />
              )
            }
            onClick={handleProgramSave}
            disabled={programSaving}
            sx={{
              position: "fixed",
              color: "#fff",
              right: { xs: 16, sm: 28 },
              bottom: { xs: 16, sm: 28 },
              zIndex: (currentTheme) => currentTheme.zIndex.snackbar + 1,
              px: 3,
              py: 1.5,
              borderRadius: 2,
            }}
          >
            {programSaving ? "Saving…" : "Save changes"}
          </Button>
        )}
        <Dialog open={programPasswordDialogOpen} onClose={() => !programSaving && setProgramPasswordDialogOpen(false)} fullWidth maxWidth="xs">
          <DialogTitle>Confirm Program changes</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>
              Enter your admin password to publish these changes to the customer side.
            </DialogContentText>
            <TextField
              autoFocus
              label="Admin password"
              type="password"
              value={programPassword}
              onChange={(event) => setProgramPassword(event.target.value)}
              fullWidth
              disabled={programSaving}
              onKeyDown={(event) => {
                if (event.key === "Enter") confirmProgramSave();
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setProgramPasswordDialogOpen(false)} disabled={programSaving}>Cancel</Button>
            <Button onClick={confirmProgramSave} variant="contained" disabled={programSaving}>
              {programSaving ? "Saving..." : "Confirm and save"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

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
        <title>{title}</title>
      </Helmet>
      <Box>
        <Typography
          sx={{
            fontSize: { xs: 28, sm: 38 },
            fontWeight: 800,
            lineHeight: 1.1,
            color: theme.palette.text.primary,
          }}
        >
          {title}
        </Typography>
      </Box>
      {title === "Mechanicals" && (
        <Stack
          spacing={2.5}
          sx={{
            mt: 3,
            "& .MuiPaper-root": {
              borderRadius: 4,
              borderColor: "divider",
              background: (currentTheme) =>
                currentTheme.palette.mode === "dark"
                  ? "linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(15, 23, 42, 0.86))"
                  : "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.94))",
              boxShadow: (currentTheme) =>
                currentTheme.palette.mode === "dark"
                  ? "0 22px 48px rgba(2, 6, 23, 0.28)"
                  : "0 18px 36px rgba(15, 23, 42, 0.08)",
            },
          }}
        >
          <ThemeModeSetting />
          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
            <Stack
              component="form"
              onSubmit={handleSaveExpiration}
              direction={{ xs: "column", sm: "row" }}
              alignItems={{ xs: "stretch", sm: "center" }}
              spacing={2}
            >
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h6" fontWeight={700}>
                  Reactivation Time Frame
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Set the shared expiration date for student/seller accounts.
                  Saving applies it to existing accounts and future registrations.
                </Typography>
              </Box>
              <TextField
                label="Expiration date"
                type="date"
                value={expirationDate}
                onChange={(event) => setExpirationDate(event.target.value)}
                slotProps={{
                  htmlInput: {
                    min: getTodayDateValue(),
                  },
                  inputLabel: { shrink: true },
                }}
                helperText="Accounts remain active through this date"
                disabled={loadingExpiration || savingExpiration}
                sx={{ width: { xs: "100%", sm: 220 } }}
              />
              <Button
                type="submit"
                variant="contained"
                disabled={loadingExpiration || savingExpiration}
                sx={{ textTransform: "none" }}
              >
                {savingExpiration ? "Saving..." : "Save"}
              </Button>
              {loadingExpiration && <CircularProgress size={24} />}
            </Stack>
            {expirationError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {expirationError}
              </Alert>
            )}
            {expirationNotice && (
              <Alert severity="success" sx={{ mt: 2 }}>
                {expirationNotice}
              </Alert>
            )}
          </Paper>
          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              alignItems={{ xs: "stretch", sm: "center" }}
              spacing={2}
            >
              <BackupIcon color="action" />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="body1" fontWeight={700}>
                  Backup
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Download a ZIP of the application, database, and uploaded files,
                  including configured cloud storage. Credentials are excluded.
                </Typography>
              </Box>
              <Button
                variant="outlined"
                onClick={handleDownloadBackup}
                disabled={creatingBackup}
                startIcon={creatingBackup ? <CircularProgress size={16} /> : <BackupIcon />}
                sx={{ textTransform: "none" }}
              >
                {creatingBackup ? "Preparing..." : "Download backup"}
              </Button>
            </Stack>
            {backupError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {backupError}
              </Alert>
            )}
            {backupNotice && (
              <Alert severity="success" sx={{ mt: 2 }}>
                {backupNotice}
              </Alert>
            )}
          </Paper>
        </Stack>
      )}
    </Box>
  );
}
