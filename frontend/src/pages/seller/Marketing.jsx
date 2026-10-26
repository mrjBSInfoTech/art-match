import { useCallback, useEffect, useState } from "react";
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
  IconButton,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import PublishOutlinedIcon from "@mui/icons-material/PublishOutlined";
import {
  createSellerPromotionSlide,
  deleteSellerPromotionSlide,
  fetchSellerPromotionSlides,
  requestSellerPromotionSlideReview,
  updateSellerPromotionSlide,
  withdrawSellerPromotionSlideRequest,
} from "../../api/seller/promotionSlideAPI";

const emptyForm = { title: "", description: "", button_label: "", button_url: "", file: null };
const slideLimit = 3;

const statusDetails = (slide) => {
  if (slide.review_status === "pending") return ["Awaiting admin review", "warning"];
  if (slide.review_status === "rejected") return ["Rejected - edit and resubmit", "error"];
  if (slide.review_status === "accepted") {
    const end = new Date(slide.published_until);
    if (Number(slide.is_currently_published) === 1) {
      return [
        `Approved until ${end.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}`,
        "success",
      ];
    }
    return ["Publication ended", "default"];
  }
  return ["Draft", "default"];
};

export default function Marketing() {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSlide, setSelectedSlide] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [preview, setPreview] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busySlideId, setBusySlideId] = useState(null);
  const [notice, setNotice] = useState("");

  const loadSlides = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setSlides(await fetchSellerPromotionSlides());
    } catch (loadError) {
      setError(loadError.message || "Unable to load your promotional slides.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSlides();
  }, [loadSlides]);

  useEffect(
    () => () => {
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const openCreate = () => {
    setSelectedSlide(null);
    setForm(emptyForm);
    setPreview("");
    setFormError("");
    setDialogOpen(true);
  };

  const openEdit = (slide) => {
    setSelectedSlide(slide);
    setForm({
      title: slide.title || "",
      description: slide.description || "",
      button_label: slide.button_label || "",
      button_url: slide.button_url || "",
      file: null,
    });
    setPreview(slide.image_url || "");
    setFormError("");
    setDialogOpen(true);
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
    setPreview(URL.createObjectURL(file));
    setForm((current) => ({ ...current, file }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!selectedSlide && !form.file) {
      setFormError("Choose an image for your promotion.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      if (selectedSlide) {
        await updateSellerPromotionSlide(selectedSlide.slide_id, form);
      } else {
        await createSellerPromotionSlide(form);
      }
      setDialogOpen(false);
      setNotice(selectedSlide ? "Promotion slide updated." : "Promotion slide saved as a draft.");
      await loadSlides();
    } catch (saveError) {
      setFormError(saveError.message || "Unable to save your promotion.");
    } finally {
      setSaving(false);
    }
  };

  const handleRequestReview = async (slide) => {
    setBusySlideId(slide.slide_id);
    try {
      await requestSellerPromotionSlideReview(slide.slide_id);
      setNotice("Your slide was sent to the admin for review.");
      await loadSlides();
    } catch (requestError) {
      setNotice(requestError.message || "Unable to request admin review.");
    } finally {
      setBusySlideId(null);
    }
  };

  const handleWithdrawRequest = async (slide) => {
    setBusySlideId(slide.slide_id);
    try {
      await withdrawSellerPromotionSlideRequest(slide.slide_id);
      setNotice("Your promotion request was withdrawn. You can submit it again when ready.");
      await loadSlides();
    } catch (withdrawError) {
      setNotice(withdrawError.message || "Unable to withdraw your promotion request.");
    } finally {
      setBusySlideId(null);
    }
  };

  const handleDelete = async (slide) => {
    if (!window.confirm(`Delete "${slide.title}"?`)) return;
    setBusySlideId(slide.slide_id);
    try {
      await deleteSellerPromotionSlide(slide.slide_id);
      setNotice("Promotion slide deleted.");
      await loadSlides();
    } catch (deleteError) {
      setNotice(deleteError.message || "Unable to delete promotion slide.");
    } finally {
      setBusySlideId(null);
    }
  };

  const canEditSlide = (slide) => {
    if (slide.review_status === "pending") return false;
    if (slide.review_status !== "accepted") return true;
    return Number(slide.is_currently_published) !== 1;
  };

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, width: "100%", minWidth: 0 }}>
      <Helmet><title>Marketing | Red Nexus Seller</title></Helmet>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>Marketing</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Create up to 3 promotional slides and request admin approval. Approved
            promotions appear in the Buyer Panel for 3 days.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          disabled={slides.length >= slideLimit || loading}
          onClick={openCreate}
        >
          Create slide ({slides.length}/{slideLimit})
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : slides.length === 0 ? (
        <Alert severity="info">You have no promotional slides yet.</Alert>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" },
            gap: 2,
          }}
        >
          {slides.map((slide) => {
            const [statusLabel, statusColor] = statusDetails(slide);
            const locked = !canEditSlide(slide);
            return (
              <Card key={slide.slide_id} variant="outlined" sx={{ overflow: "hidden" }}>
                <Box
                  component="img"
                  src={slide.image_url}
                  alt={slide.title}
                  sx={{ width: "100%", height: 190, objectFit: "cover", display: "block" }}
                />
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="flex-start">
                    <Typography variant="h6" fontWeight={700}>{slide.title}</Typography>
                    <Chip size="small" color={statusColor} label={statusLabel} />
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, minHeight: 40 }}>
                    {slide.description || "No description"}
                  </Typography>
                  {slide.review_status === "rejected" && slide.reviewed_at && (
                    <Typography variant="caption" color="text.secondary">
                      You can edit the slide and submit it for review again.
                    </Typography>
                  )}
                  {slide.review_status === "accepted" && slide.published_until && (
                    <Typography variant="caption" color="text.secondary">
                      Published for three days after admin approval.
                    </Typography>
                  )}
                  <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 1 }}>
                    {slide.review_status === "pending" && (
                      <Button
                        size="small"
                        color="warning"
                        onClick={() => handleWithdrawRequest(slide)}
                        disabled={busySlideId === slide.slide_id}
                      >
                        {busySlideId === slide.slide_id
                          ? "Withdrawing..."
                          : "Withdraw request"}
                      </Button>
                    )}
                    {!locked && (
                      <>
                        <Button
                          size="small"
                          startIcon={<EditOutlinedIcon />}
                          onClick={() => openEdit(slide)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<PublishOutlinedIcon />}
                          onClick={() => handleRequestReview(slide)}
                          disabled={busySlideId === slide.slide_id}
                        >
                          Request publish
                        </Button>
                        <IconButton
                          aria-label={`Delete ${slide.title}`}
                          color="error"
                          onClick={() => handleDelete(slide)}
                          disabled={busySlideId === slide.slide_id}
                        >
                          <DeleteOutlineIcon />
                        </IconButton>
                      </>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => !saving && setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ component: "form", onSubmit: handleSave }}
      >
        <DialogTitle>{selectedSlide ? "Edit promotional slide" : "Create promotional slide"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <TextField
              label="Headline"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              required
              inputProps={{ maxLength: 200 }}
            />
            <TextField
              label="Description"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              multiline
              minRows={3}
            />
            <TextField
              label="Button label (optional)"
              value={form.button_label}
              onChange={(event) => setForm((current) => ({ ...current, button_label: event.target.value }))}
              inputProps={{ maxLength: 60 }}
            />
            <TextField
              label="Button link (optional)"
              value={form.button_url}
              onChange={(event) => setForm((current) => ({ ...current, button_url: event.target.value }))}
              placeholder="/buyer/shop"
            />
            <Button component="label" variant="outlined" startIcon={<ImageOutlinedIcon />} sx={{ alignSelf: "flex-start" }}>
              {selectedSlide ? "Replace image" : "Choose slide image"}
              <input hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImage} />
            </Button>
            {preview && (
              <Box component="img" src={preview} alt="Promotion preview" sx={{ maxHeight: 240, width: "100%", objectFit: "cover" }} />
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? "Saving..." : selectedSlide ? "Save changes" : "Create draft"}
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={Boolean(notice)} autoHideDuration={4000} onClose={() => setNotice("")}>
        <Alert severity="info" variant="filled" onClose={() => setNotice("")}>{notice}</Alert>
      </Snackbar>
    </Box>
  );
}
