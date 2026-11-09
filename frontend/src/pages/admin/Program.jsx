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
  Divider,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import CloseIcon from "@mui/icons-material/Close";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import ConnectionErrorPanel from "../../components/admin/ConnectionErrorPanel";
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
  const [saveError, setSaveError] = useState("");
  const [saveNotice, setSaveNotice] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [password, setPassword] = useState("");
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
      setSaveError("Program image must be 5MB or smaller.");
      return;
    }
    setUploadFile(file);
    const previewUrl = URL.createObjectURL(file);
    handleProgramFieldChange("image", previewUrl);
  };

  const handleProgramSave = () => {
    setSaveError("");
    setSaveNotice("");
    setPassword("");
    setPasswordDialogOpen(true);
  };

  const confirmProgramSave = async () => {
    if (!password.trim()) {
      setSaveError("Admin password is required to save program content.");
      return;
    }
    try {
      setSaving(true);
      setSaveError("");
      setSaveNotice("");
      await saveProgramContent(programContent, password, uploadFile);
      setSaveNotice("Program content saved and published successfully.");
      setPasswordDialogOpen(false);
      setPassword("");
      setUploadFile(null);
    } catch (error) {
      setSaveError(error.message || "Unable to save program content.");
    } finally {
      setSaving(false);
    }
  };

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

      {saveError && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {saveError}
        </Alert>
      )}
      {saveNotice && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
          {saveNotice}
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
              disabled={saving}
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
              {saving ? "Saving..." : "Save Program Changes"}
            </Button>
          </Box>
        </Stack>
      </Paper>

      {/* Password Confirmation Dialog */}
      <Dialog
        open={passwordDialogOpen}
        onClose={() => !saving && setPasswordDialogOpen(false)}
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
            onClick={() => setPasswordDialogOpen(false)}
            disabled={saving}
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            size="small"
            disabled={saving}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmProgramSave();
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => setPasswordDialogOpen(false)}
            disabled={saving}
            color="inherit"
            sx={{ textTransform: "none", color: "text.secondary" }}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmProgramSave}
            variant="contained"
            disabled={saving || !password.trim()}
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
            {saving ? "Saving..." : "Confirm & Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

