import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import PublishOutlinedIcon from "@mui/icons-material/PublishOutlined";
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

const emptySlide = {
  title: "",
  description: "",
  button_label: "",
  button_url: "",
  status: "Draft",
  sort_order: 1,
  file: null,
};

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
  const [slides, setSlides] = useState([]);
  const [slideRequests, setSlideRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSlide, setSelectedSlide] = useState(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [formData, setFormData] = useState(emptySlide);
  const [imagePreview, setImagePreview] = useState("");
  const [formError, setFormError] = useState("");
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

  const loadSlides = async () => {
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
  };

  useEffect(() => {
    loadSlides();
  }, []);

  useEffect(() => {
    let active = true;
    fetchPromotionHeroEnabled()
      .then(({ enabled }) => {
        if (active) setHeroEnabled(enabled);
      })
      .catch((error) => {
        if (active) {
          setNotice(
            error.message || "Unable to load the default hero setting.",
          );
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

  useEffect(
    () => () => {
      if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    },
    [imagePreview],
  );

  const openCreate = () => {
    setSelectedSlide(null);
    setFormData({ ...emptySlide, sort_order: slides.length + 2 });
    setImagePreview("");
    setFormError("");
    setDialogOpen(true);
  };

  const openEdit = (slide) => {
    setSelectedSlide(slide);
    setFormData({
      title: slide.title || "",
      description: slide.description || "",
      button_label: slide.button_label || "",
      button_url: slide.button_url || "",
      status: slide.status || "Draft",
      sort_order: slide.sort_order ?? 1,
      file: null,
    });
    setImagePreview(slide.image_url || "");
    setFormError("");
    setDialogOpen(true);
  };

  const closeForm = () => {
    if (saving) return;
    setDialogOpen(false);
    setSelectedSlide(null);
    setFormError("");
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleImage = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setFormError("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFormError("Promotion image must be 5MB or smaller.");
      return;
    }
    setFormError("");
    setImagePreview(URL.createObjectURL(file));
    setFormData((current) => ({ ...current, file }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;
    if (!selectedSlide && !formData.file) {
      setFormError("Choose an image for the promotion slide.");
      return;
    }
    setFormError("");
    setSaving(true);
    try {
      if (selectedSlide) {
        await updatePromotionSlide(selectedSlide.slide_id, formData);
      } else {
        await addPromotionSlide(formData);
      }
      setDialogOpen(false);
      setSelectedSlide(null);
      setNotice(
        selectedSlide ? "Promotion slide updated." : "Promotion slide created.",
      );
      setNoticeSeverity("success");
      await loadSlides();
    } catch (error) {
      setFormError(error.message || "Unable to save promotion slide.");
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
      setNotice("Promotion slide published to the Buyer Panel.");
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
      setNotice("Promotion slide unpublished from the Buyer Panel.");
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

  const closeReviewRequest = () => {
    if (reviewingSlideId !== null) return;
    setReviewDialogOpen(false);
  };

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

  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2.5 },
        minHeight: "100vh",
        backgroundColor: (theme) => theme.palette.background.default,
        color: (theme) => theme.palette.text.primary,
      }}
    >
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Promotion Slides</title>
      </Helmet>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "stretch", sm: "center" },
          gap: 2,
          mb: 2,
        }}
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
            Promotion Slides
          </Typography>
          <Typography sx={{ mt: 0.75, color: "text.secondary", fontSize: 13 }}>
            Create and order the promotions shown in the Buyer Panel.
          </Typography>
        </Box>
        <Box
          sx={{ display: "flex", gap: 1, width: { xs: "100%", sm: "auto" } }}
        >
          {canEdit && (
            <Button
              variant="outlined"
              onClick={() => setReviewDialogOpen(true)}
              sx={{
                width: { xs: "100%", sm: 150 },
                height: { xs: 38, sm: 44 },
                minWidth: { xs: 45, sm: 50 },
                fontSize: { xs: 12, sm: 16 },
                padding: 0,
                borderRadius: 1.5,
                textTransform: "none",
                fontWeight: 700,
              }}
            >
              Review{slideRequests.length ? ` (${slideRequests.length})` : ""}
            </Button>
          )}
          {canAdd && (
            <Button
              variant="contained"
              color="error"
              startIcon={<AddIcon />}
              onClick={openCreate}
              sx={{
                width: { xs: "100%", sm: 150 },
                height: { xs: 38, sm: 44 },
                minWidth: { xs: 45, sm: 50 },
                fontSize: { xs: 12, sm: 16 },
                padding: 0,
                borderRadius: 1.5,
                textTransform: "none",
                fontWeight: 700,
              }}
            >
              Add slide
            </Button>
          )}
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8, mt: 3 }}>
          <CircularProgress />
        </Box>
      ) : loadError ? (
        <Alert
          severity="error"
          action={<Button onClick={loadSlides}>Retry</Button>}
          sx={{ mt: 3 }}
        >
          {loadError}
        </Alert>
      ) : (
        <>
          <Box
            sx={{
              mt: 3,
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
                lg: "repeat(3, minmax(0, 1fr))",
              },
              gap: 2,
            }}
          >
            <Card
              variant="outlined"
              sx={{
                overflow: "hidden",
                borderRadius: 4,
                gridColumn: { md: "1 / -1" },
                borderColor: heroEnabled ? "success.main" : "divider",
                background: (theme) =>
                  theme.palette.mode === "dark"
                    ? "linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(15, 23, 42, 0.86))"
                    : "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.94))",
                boxShadow: (theme) =>
                  theme.palette.mode === "dark"
                    ? "0 22px 48px rgba(2, 6, 23, 0.28)"
                    : "0 18px 36px rgba(15, 23, 42, 0.08)",
              }}
            >
              <CardContent>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  alignItems={{ xs: "stretch", sm: "center" }}
                  justifyContent="space-between"
                  spacing={2}
                >
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="h6" fontWeight={700}>
                        Default Buyer Panel Hero
                      </Typography>
                      <Chip size="small" label="Position 1" color="primary" />
                      <Chip
                        size="small"
                        label={heroEnabled ? "Enabled" : "Disabled"}
                        color={heroEnabled ? "success" : "default"}
                      />
                    </Stack>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.75 }}
                    >
                      The original Buyer Panel hero appears as the first
                      carousel slide. Custom promotions begin at position 2.
                    </Typography>
                  </Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={heroEnabled}
                        onChange={handleHeroChange}
                        disabled={
                          !canEdit || placementLoading || placementSaving
                        }
                      />
                    }
                    label={heroEnabled ? "On" : "Off"}
                    sx={{ m: 0, alignSelf: { xs: "flex-start", sm: "center" } }}
                  />
                </Stack>
              </CardContent>
            </Card>
            {slides.map((slide) => (
              <Card
                key={slide.slide_id}
                variant="outlined"
                sx={{
                  overflow: "hidden",
                  borderRadius: 4,
                  borderColor: "divider",
                  background: (theme) =>
                    theme.palette.mode === "dark"
                      ? "linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(15, 23, 42, 0.86))"
                      : "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.94))",
                  boxShadow: (theme) =>
                    theme.palette.mode === "dark"
                      ? "0 22px 48px rgba(2, 6, 23, 0.28)"
                      : "0 18px 36px rgba(15, 23, 42, 0.08)",
                }}
              >
                <Box
                  component="img"
                  src={slide.image_url || undefined}
                  alt={slide.title}
                  sx={{
                    display: "block",
                    width: "100%",
                    height: 190,
                    objectFit: "cover",
                    bgcolor: "action.hover",
                  }}
                />
                <CardContent>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    spacing={1}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="h6" fontWeight={700} noWrap>
                        {slide.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Order {slide.sort_order}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={slide.status}
                      color={
                        slide.status === "Published" ? "success" : "default"
                      }
                    />
                  </Stack>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mt: 1,
                      minHeight: 40,
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitBoxOrient: "vertical",
                      WebkitLineClamp: 2,
                    }}
                  >
                    {slide.description || "No description"}
                  </Typography>
                  <Stack
                    direction="row"
                    justifyContent="flex-end"
                    spacing={1}
                    sx={{ mt: 1 }}
                  >
                    {!slide.student_id &&
                      canEdit &&
                      slide.status !== "Published" && (
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<PublishOutlinedIcon />}
                          onClick={() => handlePublish(slide)}
                          disabled={publishingSlideId === slide.slide_id}
                        >
                          {publishingSlideId === slide.slide_id
                            ? "Publishing..."
                            : "Publish"}
                        </Button>
                      )}
                    {canEdit && slide.status === "Published" && (
                      <Button
                        size="small"
                        color="warning"
                        onClick={() => handleUnpublish(slide)}
                        disabled={unpublishingSlideId === slide.slide_id}
                      >
                        {unpublishingSlideId === slide.slide_id
                          ? "Unpublishing..."
                          : "Unpublish"}
                      </Button>
                    )}
                    {!slide.student_id && canEdit && (
                      <Button
                        size="small"
                        startIcon={<EditOutlinedIcon />}
                        onClick={() => openEdit(slide)}
                      >
                        Edit
                      </Button>
                    )}
                    {canDelete && (
                      <IconButton
                        aria-label={`Delete ${slide.title}`}
                        color="error"
                        onClick={() => handleDelete(slide)}
                      >
                        <DeleteOutlineIcon />
                      </IconButton>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Box>
        </>
      )}

      <Dialog
        open={dialogOpen}
        onClose={closeForm}
        fullWidth
        maxWidth="sm"
        PaperProps={{ component: "form", onSubmit: handleSubmit }}
      >
        <DialogTitle>
          {selectedSlide ? "Edit promotion slide" : "Add promotion slide"}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <TextField
              label="Headline"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              inputProps={{ maxLength: 200 }}
            />
            <TextField
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              multiline
              minRows={3}
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Button label (optional)"
                name="button_label"
                value={formData.button_label}
                onChange={handleChange}
                fullWidth
                inputProps={{ maxLength: 60 }}
              />
              <TextField
                label="Button link (optional)"
                name="button_url"
                value={formData.button_url}
                onChange={handleChange}
                fullWidth
                placeholder="/buyer/shop"
              />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                select
                label="Visibility"
                name="status"
                value={formData.status}
                onChange={handleChange}
                fullWidth
              >
                <MenuItem value="Draft">Draft</MenuItem>
                <MenuItem value="Published">Published</MenuItem>
              </TextField>
              <TextField
                select
                label="Display order"
                name="sort_order"
                value={formData.sort_order}
                onChange={handleChange}
                fullWidth
                helperText="Other slides move automatically to keep positions unique."
              >
                {Array.from(
                  { length: slides.length + (selectedSlide ? 0 : 1) },
                  (_, index) => index + 2,
                ).map((position) => (
                  <MenuItem key={position} value={position}>
                    Position {position}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <Button
              component="label"
              variant="outlined"
              startIcon={<ImageOutlinedIcon />}
              sx={{ alignSelf: "flex-start" }}
            >
              {selectedSlide ? "Replace image" : "Choose slide image"}
              <input
                hidden
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImage}
              />
            </Button>
            {imagePreview && (
              <Box
                component="img"
                src={imagePreview}
                alt="Promotion preview"
                sx={{
                  width: "100%",
                  maxHeight: 240,
                  objectFit: "cover",
                  borderRadius: 1,
                }}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeForm} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving
              ? "Saving..."
              : selectedSlide
                ? "Save changes"
                : "Create slide"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={reviewDialogOpen}
        onClose={closeReviewRequest}
        fullWidth
        maxWidth="lg"
        aria-labelledby="promotion-review-queue-title"
      >
        <DialogTitle id="promotion-review-queue-title">
          Student promotion requests ({slideRequests.length})
        </DialogTitle>
        <DialogContent dividers>
          {slideRequests.length === 0 ? (
            <Alert severity="info">
              There are no pending promotion requests.
            </Alert>
          ) : (
            <Stack spacing={2}>
              {slideRequests.map((slide) => (
                <Card
                  key={`request-${slide.slide_id}`}
                  variant="outlined"
                  sx={{ overflow: "hidden" }}
                >
                  <Stack direction={{ xs: "column", sm: "row" }}>
                    <Box
                      component="img"
                      src={slide.image_url || undefined}
                      alt={slide.title}
                      sx={{
                        display: "block",
                        width: { xs: "100%", sm: 240 },
                        height: { xs: 190, sm: "auto" },
                        minHeight: { sm: 190 },
                        objectFit: "cover",
                        bgcolor: "action.hover",
                      }}
                    />
                    <CardContent sx={{ flex: 1 }}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="flex-start"
                        spacing={1}
                      >
                        <Typography variant="h6" fontWeight={700}>
                          {slide.title}
                        </Typography>
                        <Chip
                          size="small"
                          color="warning"
                          label="Pending review"
                        />
                      </Stack>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.5 }}
                      >
                        Submitted by{" "}
                        {`${slide.first_name || ""} ${slide.last_name || ""}`.trim() ||
                          slide.student_number}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ mt: 1, whiteSpace: "pre-wrap" }}
                      >
                        {slide.description || "No description provided."}
                      </Typography>
                      {slide.button_label && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          {slide.button_label} — {slide.button_url}
                        </Typography>
                      )}
                      <Stack
                        direction="row"
                        justifyContent="flex-end"
                        spacing={1}
                        sx={{ mt: 2 }}
                      >
                        <Button
                          color="error"
                          onClick={() => handleReviewRequest(slide, "reject")}
                          disabled={!canEdit || reviewingSlideId !== null}
                        >
                          {reviewingSlideId === slide.slide_id
                            ? "Reviewing..."
                            : "Reject"}
                        </Button>
                        <Button
                          variant="contained"
                          color="success"
                          onClick={() => handleReviewRequest(slide, "accept")}
                          disabled={!canEdit || reviewingSlideId !== null}
                        >
                          {reviewingSlideId === slide.slide_id
                            ? "Reviewing..."
                            : "Accept & publish"}
                        </Button>
                      </Stack>
                    </CardContent>
                  </Stack>
                </Card>
              ))}
              <Alert severity="info">
                Accepted promotions appear in the Buyer Panel for 3 days.
              </Alert>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={closeReviewRequest}
            disabled={reviewingSlideId !== null}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={3500}
        onClose={() => setNotice("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={noticeSeverity}
          variant="filled"
          onClose={() => setNotice("")}
        >
          {notice}
        </Alert>
      </Snackbar>
    </Box>
  );
}
