import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControlLabel,
  InputAdornment,
  Paper,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import ViewListIcon from "@mui/icons-material/ViewList";
import ViewCarouselOutlinedIcon from "@mui/icons-material/ViewCarouselOutlined";
import RateReviewOutlinedIcon from "@mui/icons-material/RateReviewOutlined";

import PromotionSlideCard from "../../components/admin/Event/PromotionSlideCard";
import PromotionSlideTable from "../../components/admin/Event/PromotionSlideTable";
import PromotionSlideForm from "../../components/admin/Event/PromotionSlideForm";
import PromotionSlideReviewDialog from "../../components/admin/Event/PromotionSlideReviewDialog";
import {
  addPromotionSlide,
  deletePromotionSlide,
  fetchPromotionSlides,
  fetchPromotionSlideRequests,
  reviewPromotionSlideRequest,
  unpublishStudentPromotionSlide,
  updatePromotionSlide,
} from "../../api/admin/promotionSlideAPI";
import {
  fetchPromotionHeroEnabled,
  savePromotionHeroEnabled,
} from "../../api/admin/systemSettingsAPI";

const hasPermission = (permission) => {
  const role = String(localStorage.getItem("admin_role") || "")
    .toLowerCase()
    .trim();
  if (role === "super admin" || role === "admin") return true;
  if (role === "moderator") return permission !== "can_delete";
  return ["1", "true"].includes(
    String(localStorage.getItem(`admin_${permission}`) || "").toLowerCase(),
  );
};

export default function PromotionSlides() {
  const theme = useTheme();
  const [slides, setSlides] = useState([]);
  const [slideRequests, setSlideRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("card");

  const [formOpen, setFormOpen] = useState(false);
  const [selectedSlide, setSelectedSlide] = useState(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [notice, setNotice] = useState("");
  const [noticeSeverity, setNoticeSeverity] = useState("success");

  const [publishingSlideId, setPublishingSlideId] = useState(null);
  const [unpublishingSlideId, setUnpublishingSlideId] = useState(null);
  const [reviewingSlideId, setReviewingSlideId] = useState(null);

  const [heroEnabled, setHeroEnabled] = useState(true);
  const [placementLoading, setPlacementLoading] = useState(true);
  const [placementSaving, setPlacementSaving] = useState(false);

  const canAdd = hasPermission("can_add");
  const canEdit = hasPermission("can_edit");
  const canDelete = hasPermission("can_delete");

  const loadSlides = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError("");
      const loadedSlides = await fetchPromotionSlides();
      setSlides(
        loadedSlides.filter(
          (slide) => !slide.student_id || slide.review_status === "accepted",
        ),
      );
      setSlideRequests(await fetchPromotionSlideRequests());
    } catch (error) {
      setLoadError(error.message || "Unable to load promotion slides.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSlides();
  }, [loadSlides]);

  useEffect(() => {
    let active = true;
    fetchPromotionHeroEnabled()
      .then(({ enabled }) => {
        if (active) setHeroEnabled(enabled);
      })
      .catch((error) => {
        if (active) {
          setNotice(error.message || "Unable to load the default hero setting.");
          setNoticeSeverity("error");
        }
      })
      .finally(() => {
        if (active) setPlacementLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleHeroChange = async (_event, enabled) => {
    setPlacementSaving(true);
    try {
      const result = await savePromotionHeroEnabled(enabled);
      setHeroEnabled(result.enabled);
      setNotice(
        result.enabled
          ? "The default hero slide is enabled."
          : "The default hero slide is hidden.",
      );
      setNoticeSeverity("success");
    } catch (error) {
      setNotice(error.message || "Unable to update the default hero setting.");
      setNoticeSeverity("error");
    } finally {
      setPlacementSaving(false);
    }
  };

  const handleSave = async (formData) => {
    setSaving(true);
    try {
      if (selectedSlide) {
        await updatePromotionSlide(selectedSlide.slide_id, formData);
        setNotice("Promotion slide updated successfully.");
      } else {
        await addPromotionSlide(formData);
        setNotice("Promotion slide created successfully.");
      }
      setNoticeSeverity("success");
      setFormOpen(false);
      setSelectedSlide(null);
      await loadSlides();
    } catch (error) {
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (slide) => {
    if (!window.confirm(`Delete the promotion slide "${slide.title}"?`)) return;
    try {
      await deletePromotionSlide(slide.slide_id);
      setNotice("Promotion slide deleted.");
      setNoticeSeverity("success");
      await loadSlides();
    } catch (error) {
      setNotice(error.message || "Unable to delete promotion slide.");
      setNoticeSeverity("error");
    }
  };

  const handlePublish = async (slide) => {
    setPublishingSlideId(slide.slide_id);
    try {
      const publishedSlide = await updatePromotionSlide(slide.slide_id, {
        title: slide.title,
        description: slide.description || "",
        button_label: slide.button_label || "",
        button_url: slide.button_url || "",
        status: "Published",
        sort_order: slide.sort_order,
      });
      setSlides((current) =>
        current.map((item) =>
          item.slide_id === publishedSlide.slide_id ? publishedSlide : item,
        ),
      );
      setNotice("Promotion slide published to buyer panel.");
      setNoticeSeverity("success");
    } catch (error) {
      setNotice(error.message || "Unable to publish promotion slide.");
      setNoticeSeverity("error");
    } finally {
      setPublishingSlideId(null);
    }
  };

  const handleUnpublish = async (slide) => {
    setUnpublishingSlideId(slide.slide_id);
    try {
      if (slide.student_id) {
        await unpublishStudentPromotionSlide(slide.slide_id);
      } else {
        await updatePromotionSlide(slide.slide_id, {
          title: slide.title,
          description: slide.description || "",
          button_label: slide.button_label || "",
          button_url: slide.button_url || "",
          status: "Draft",
          sort_order: slide.sort_order,
        });
      }
      setNotice("Promotion slide unpublished from buyer panel.");
      setNoticeSeverity("success");
      await loadSlides();
    } catch (error) {
      setNotice(error.message || "Unable to unpublish promotion slide.");
      setNoticeSeverity("error");
    } finally {
      setUnpublishingSlideId(null);
    }
  };

  const handleReviewRequest = async (slide, decision) => {
    setReviewingSlideId(slide.slide_id);
    try {
      await reviewPromotionSlideRequest(slide.slide_id, decision);
      setNotice(
        decision === "accept"
          ? "Student promotion accepted and published for 3 days."
          : "Student promotion request rejected.",
      );
      setNoticeSeverity("success");
      setSlideRequests((requests) =>
        requests.filter((request) => request.slide_id !== slide.slide_id),
      );
      await loadSlides();
    } catch (error) {
      setNotice(error.message || "Unable to review student promotion.");
      setNoticeSeverity("error");
    } finally {
      setReviewingSlideId(null);
    }
  };

  const filteredSlides = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return slides;
    return slides.filter((s) =>
      [s.title, s.description, s.button_label, s.button_url]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [slides, search]);

  return (
    <Box>
      {/* Notice & Error Alerts */}
      {notice && (
        <Alert
          severity={noticeSeverity}
          onClose={() => setNotice("")}
          sx={{ mb: 2 }}
        >
          {notice}
        </Alert>
      )}

      {loadError && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={loadSlides}>
              Retry
            </Button>
          }
        >
          {loadError}
        </Alert>
      )}

      {/* Hero Slide Placement Control Card */}
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2, sm: 2.25 },
          borderRadius: 2.5,
          borderColor: theme.palette.divider,
          backgroundColor: theme.palette.background.paper,
          mb: 2,
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          gap={1.5}
        >
          <Box>
            <Typography variant="subtitle2" fontWeight={800}>
              Default Welcome Hero Slide
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Keep the ArtMatch default introduction slide active at the start of the buyer carousel.
            </Typography>
          </Box>
          <FormControlLabel
            control={
              <Switch
                checked={heroEnabled}
                onChange={handleHeroChange}
                disabled={placementLoading || placementSaving || !canEdit}
                color="error"
              />
            }
            label={
              <Typography variant="body2" fontWeight={700}>
                {heroEnabled ? "Active" : "Hidden"}
              </Typography>
            }
          />
        </Stack>
      </Paper>

      {/* Search & Actions Bar matching Event calendar and other admin pages */}
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 1.5, sm: 2 },
          borderRadius: 2.5,
          backgroundColor: theme.palette.background.paper,
          borderColor: theme.palette.divider,
          mb: 2,
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", sm: "center" }}
          gap={1.5}
        >
          <TextField
            size="small"
            placeholder="Search slides by headline, details, or CTA..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{
              width: { xs: "100%", sm: 360 },
              "& .MuiInputBase-input": { fontSize: 13 },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
                </InputAdornment>
              ),
            }}
          />

          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button
              variant="outlined"
              startIcon={<RateReviewOutlinedIcon />}
              onClick={() => setReviewOpen(true)}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 700,
                fontSize: 13,
                height: 40,
                borderColor: theme.palette.divider,
                color: theme.palette.text.primary,
                "&:hover": {
                  borderColor: theme.palette.text.secondary,
                },
              }}
            >
              Requests ({slideRequests.length})
            </Button>
            {canAdd && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setSelectedSlide(null);
                  setFormOpen(true);
                }}
                sx={{
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: 13,
                  height: 40,
                  backgroundColor: "error.main",
                  color: "#fff",
                  boxShadow: "none",
                  "&:hover": {
                    backgroundColor: "error.dark",
                    boxShadow: "none",
                  },
                }}
              >
                Add Slide
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>

      {/* View Mode Switcher & Summary Count */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1.5,
          mt: 0.5,
          mb: 1.5,
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          aria-live="polite"
          sx={{ fontWeight: 600 }}
        >
          Showing {filteredSlides.length} of {slides.length} promotion slides
        </Typography>

        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(e, next) => {
            if (next) setViewMode(next);
          }}
          size="small"
          aria-label="Promotion slides presentation mode"
          sx={{
            backgroundColor: theme.palette.background.paper,
            borderRadius: 2.5,
            border: `1px solid ${theme.palette.divider}`,
            p: 0.3,
            "& .MuiToggleButton-root": {
              border: "none",
              borderRadius: 2,
              px: 1.5,
              py: 0.5,
              fontSize: 12,
              fontWeight: 700,
              textTransform: "none",
              color: theme.palette.text.secondary,
              gap: 0.75,
              transition: "all 150ms ease",
            },
            "& .MuiToggleButton-root.Mui-selected": {
              backgroundColor: theme.palette.error.main,
              color: "#fff",
              "&:hover": {
                backgroundColor: theme.palette.error.dark,
              },
            },
          }}
        >
          <ToggleButton value="card" aria-label="Card view">
            <ViewModuleIcon sx={{ fontSize: 18 }} />
            Cards
          </ToggleButton>
          <ToggleButton value="table" aria-label="Table view">
            <ViewListIcon sx={{ fontSize: 18 }} />
            Table
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Main Content Area: Cards vs Table */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress aria-label="Loading promotion slides" />
        </Box>
      ) : slides.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{
            border: "1px dashed",
            borderColor: "divider",
            borderRadius: 2.5,
            py: 8,
            px: 3,
            textAlign: "center",
          }}
        >
          <ViewCarouselOutlinedIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            No promotion slides configured
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: 13 }}>
            Add your first custom promotion slide to feature exhibitions or seasonal offers.
          </Typography>
        </Paper>
      ) : filteredSlides.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{
            border: "1px dashed",
            borderColor: "divider",
            borderRadius: 2.5,
            py: 8,
            px: 3,
            textAlign: "center",
          }}
        >
          <ViewCarouselOutlinedIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            No matching promotion slides found
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: 13 }}>
            Try adjusting your search keywords.
          </Typography>
        </Paper>
      ) : viewMode === "card" ? (
        <PromotionSlideCard
          slides={filteredSlides}
          canEdit={canEdit}
          canDelete={canDelete}
          onEdit={(slide) => {
            setSelectedSlide(slide);
            setFormOpen(true);
          }}
          onDelete={handleDelete}
          onPublish={handlePublish}
          onUnpublish={handleUnpublish}
          publishingSlideId={publishingSlideId}
          unpublishingSlideId={unpublishingSlideId}
        />
      ) : (
        <PromotionSlideTable
          slides={filteredSlides}
          canEdit={canEdit}
          canDelete={canDelete}
          onEdit={(slide) => {
            setSelectedSlide(slide);
            setFormOpen(true);
          }}
          onDelete={handleDelete}
          onPublish={handlePublish}
          onUnpublish={handleUnpublish}
          publishingSlideId={publishingSlideId}
          unpublishingSlideId={unpublishingSlideId}
        />
      )}

      {/* Add / Edit Slide Dialog (Designed strictly to match ArtworkForm.jsx) */}
      <PromotionSlideForm
        open={formOpen}
        onClose={() => {
          if (!saving) {
            setFormOpen(false);
            setSelectedSlide(null);
          }
        }}
        onSubmit={handleSave}
        selectedSlide={selectedSlide}
        totalSlides={slides.length}
        saving={saving}
      />

      {/* Student Slide Requests Review Dialog (Designed strictly to match ArtworkForm.jsx) */}
      <PromotionSlideReviewDialog
        open={reviewOpen}
        onClose={() => {
          if (reviewingSlideId === null) setReviewOpen(false);
        }}
        requests={slideRequests}
        onReview={handleReviewRequest}
        reviewingSlideId={reviewingSlideId}
        canEdit={canEdit}
      />
    </Box>
  );
}
