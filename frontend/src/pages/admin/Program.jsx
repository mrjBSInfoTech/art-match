import { useEffect, useState, useCallback } from "react";
import {
  Alert,
  Box,
  Button,
  Paper,
  Slide,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  IconButton,
  Divider,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import ConnectionErrorPanel from "../../components/admin/ConnectionErrorPanel";
import AdminLoadingPanel from "../../components/admin/AdminLoadingPanel";
import ProgramConfirm from "../../components/admin/Program/ProgramConfirm";
import {
  fetchProgramContent,
  saveProgramContent,
} from "../../api/programContentAPI";

function SnackbarTransition(props) {
  return <Slide {...props} direction="up" />;
}

const programSlides = [
  {
    slug: "architecture",
    title: "Bachelor of Science in Architecture",
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
    slug: "fine-arts",
    title: "Bachelor of Fine Arts in Painting",
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
  {
    slug: "advertising-arts",
    title: "Bachelor of Fine Arts in Advertising Arts",
    description:
      "Explore visual communication, campaign concepts, and creative work shaped by students turning ideas into memorable messages.",
    image:
      "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=1200&q=85",
    eyebrow: "CAFA Program",
    subtitle: "Ideas made visible, compelling, and clear.",
    focus: ["Visual communication", "Campaign concepts", "Creative direction"],
    stat: "18+",
    statLabel: "creative projects",
  },
  {
    slug: "interior-design",
    title: "Bachelor of Science in Interior Design",
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
    slug: "industrial-design",
    title: "Bachelor of Fine Arts in Industrial Design",
    description:
      "Discover product and object studies that bring thoughtful form, materials, and everyday use together.",
    image:
      "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=1200&q=85",
    eyebrow: "CAFA Program",
    subtitle: "Useful objects, considered from every angle.",
    focus: ["Product development", "Materials and form", "Human-centered design"],
    stat: "20+",
    statLabel: "design studies",
  },
];

export default function Program() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const navigate = useNavigate();

  const [activeProgram, setActiveProgram] = useState(programSlides[0].slug);
  const [programContent, setProgramContent] = useState(
    Object.fromEntries(programSlides.map((program) => [program.slug, program])),
  );
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [uploadFile, setUploadFile] = useState(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

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

  const loadProgramContent = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError("");
      const savedContent = await fetchProgramContent();
      if (savedContent) {
        setProgramContent((current) =>
          Object.fromEntries(
            Object.entries(current).map(([key, fallback]) => [
              key,
              { ...fallback, ...savedContent[key] },
            ]),
          ),
        );
      }
      setDataLoaded(true);
    } catch (error) {
      setLoadError(error.message || "Unable to load program content.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProgramContent();
  }, [loadProgramContent]);

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
      showSnackbar("Program image must be 5MB or smaller.", "error");
      return;
    }
    setUploadFile(file);
    const previewUrl = URL.createObjectURL(file);
    handleProgramFieldChange("image", previewUrl);
  };

  const handleProgramSave = () => {
    setPasswordDialogOpen(true);
  };

  const confirmProgramSave = async (confirmationPassword) => {
    try {
      setSaving(true);
      await saveProgramContent(programContent, confirmationPassword, uploadFile);
      showSnackbar("Program content saved and published successfully.");
      setPasswordDialogOpen(false);
      setUploadFile(null);
    } finally {
      setSaving(false);
    }
  };

  const showSnackbar = (message, severity = "success") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const closeSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "success":
        return "success.light";
      case "error":
        return "error.light";
      default:
        return "primary.light";
    }
  };

  if (loading && !dataLoaded) {
    return (
      <AdminLoadingPanel
        title="CAFA Programs"
        subtitle="Manage promotional landing pages, curriculum focus points, and showcases for college departments."
        helmetTitle="Program Content"
        showMetrics={false}
        showFilters={false}
      />
    );
  }

  if (loadError && !loading && !dataLoaded) {
    return (
      <Box sx={{ minWidth: 0 }}>
        <Helmet titleTemplate="%s - ArtMatch">
          <title>Program Content Unavailable</title>
        </Helmet>
        <ConnectionErrorPanel
          title="Program Content Unavailable"
          message={loadError}
          onRetry={loadProgramContent}
        />
      </Box>
    );
  }

  const selectedProgram = programContent[activeProgram] || programSlides[0];

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

      <Paper elevation={0} sx={cardSx}>
        <Tabs
          value={activeProgram}
          onChange={(_, value) => setActiveProgram(value)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
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
              disabled={saving}
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
              {saving ? "Saving..." : "Save Program Changes"}
            </Button>
          </Box>
        </Stack>
      </Paper>

      <ProgramConfirm
        open={passwordDialogOpen}
        handleClose={() => setPasswordDialogOpen(false)}
        onSubmit={confirmProgramSave}
        submitting={saving}
        title="Confirm Program Changes"
        message="Enter your admin password to publish these updates to the student and public catalogue."
      />

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        TransitionComponent={SnackbarTransition}
      >
        <Alert
          onClose={closeSnackbar}
          severity={snackbarSeverity}
          variant="filled"
          sx={{
            width: { xs: 280, sm: 360 },
            minHeight: 48,
            borderRadius: 2,
            boxShadow: "0 10px 28px rgba(15, 23, 42, 0.18)",
            backgroundColor: getSeverityColor(snackbarSeverity),
            color: "#fff",
            alignItems: "center",
            "& .MuiAlert-icon": { color: "#fff", mr: 1 },
            "& .MuiAlert-message": {
              fontWeight: 600,
              fontSize: 14,
              display: "flex",
              alignItems: "center",
            },
            "& .MuiAlert-action": {
              alignItems: "center",
              paddingLeft: 1,
              color: "#fff",
            },
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}

