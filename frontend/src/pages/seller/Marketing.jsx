import { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import SellerStorefront from "./Storefront";
import ConnectionErrorPanel from "../../components/seller/ConnectionErrorPanel";
import SellerLoadingPanel from "../../components/seller/SellerLoadingPanel";
import PromotionSlideForm from "../../components/seller/Marketing/PromotionSlideForm";
import PromotionHeaderForm from "../../components/seller/Marketing/PromotionHeaderForm";
import PromotionHeaderCard from "../../components/seller/Marketing/PromotionHeaderCard";
import PromotionSliderDelete from "../../components/seller/Marketing/PromotionSliderDelete";
import {
  createSellerPromotionSlide,
  deleteSellerPromotionSlide,
  createSellerPromotionHeaderRequest,
  fetchSellerPromotionHeaderRequests,
  fetchSellerPromotionSlides,
  requestSellerPromotionSlideReview,
  updateSellerPromotionSlide,
  withdrawSellerPromotionSlideRequest,
} from "../../api/seller/promotionSlideAPI";
// Icons
import AddIcon from "@mui/icons-material/Add";
import PublishOutlinedIcon from "@mui/icons-material/PublishOutlined";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import RateReviewOutlinedIcon from "@mui/icons-material/RateReviewOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import ViewCarouselOutlinedIcon from "@mui/icons-material/ViewCarouselOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import PromotionHeaderPreview from "../../components/common/PromotionHeaderPreview";
import MarketingSectionBanner from "../../components/seller/Marketing/MarketingSectionBanner";

const emptyForm = { title: "", description: "", button_label: "", button_url: "", file: null };
const emptyHeaderForm = {
  message: "",
  button_label: "",
  button_url: "/buyer/shop",
};
const slideLimit = 3;

export default function Marketing() {
  const theme = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const activeTab = ["slides", "header", "store-profile"].includes(requestedTab)
    ? requestedTab
    : "store-profile";
  const [slides, setSlides] = useState([]);
  const [headerRequests, setHeaderRequests] = useState([]);
  const [headerForm, setHeaderForm] = useState(emptyHeaderForm);
  const [loading, setLoading] = useState(true);
  const [headerLoading, setHeaderLoading] = useState(true);
  const [headerSaving, setHeaderSaving] = useState(false);
  const [error, setError] = useState("");
  const [headerLoadError, setHeaderLoadError] = useState("");
  const [headerFormError, setHeaderFormError] = useState("");
  const [headerDialogOpen, setHeaderDialogOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [slideToDelete, setSlideToDelete] = useState(null);
  const [selectedSlide, setSelectedSlide] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [preview, setPreview] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busySlideId, setBusySlideId] = useState(null);
  const [notice, setNotice] = useState("");
  const [noticeSeverity, setNoticeSeverity] = useState("success");

  const showNotice = (message, severity = "success") => {
    setNoticeSeverity(severity);
    setNotice(message);
  };

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

  const loadHeaderRequests = useCallback(async () => {
    setHeaderLoading(true);
    setHeaderLoadError("");
    try {
      setHeaderRequests(await fetchSellerPromotionHeaderRequests());
    } catch (loadError) {
      setHeaderLoadError(
        loadError.message || "Unable to load your promo header requests.",
      );
    } finally {
      setHeaderLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHeaderRequests();
  }, [loadHeaderRequests]);

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
    const isFile = typeof File !== "undefined" && event instanceof File;
    const file = isFile ? event : event.target.files?.[0];
    if (!isFile) event.target.value = "";
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
      showNotice(
        selectedSlide
          ? "Promotion slide updated."
          : "Promotion slide saved as a draft.",
      );
      await loadSlides();
    } catch (saveError) {
      setFormError(saveError.message || "Unable to save your promotion.");
    } finally {
      setSaving(false);
    }
  };

  const handleHeaderRequest = async (event) => {
    event.preventDefault();
    setHeaderFormError("");
    setHeaderSaving(true);
    try {
      const request = await createSellerPromotionHeaderRequest(headerForm);
      setHeaderRequests((current) => [request, ...current]);
      showNotice("Promo header request sent to the admin for review.");
      setHeaderDialogOpen(false);
    } catch (requestError) {
      setHeaderFormError(
        requestError.message || "Unable to request a promo header.",
      );
    } finally {
      setHeaderSaving(false);
    }
  };

  const handleRequestReview = async (slide) => {
    setBusySlideId(slide.slide_id);
    try {
      await requestSellerPromotionSlideReview(slide.slide_id);
      showNotice("Your slide was sent to the admin for review.");
      await loadSlides();
    } catch (requestError) {
      showNotice(
        requestError.message || "Unable to request admin review.",
        "error",
      );
    } finally {
      setBusySlideId(null);
    }
  };

  const handleWithdrawRequest = async (slide) => {
    setBusySlideId(slide.slide_id);
    try {
      await withdrawSellerPromotionSlideRequest(slide.slide_id);
      showNotice(
        "Your promotion request was withdrawn. You can submit it again when ready.",
      );
      await loadSlides();
    } catch (withdrawError) {
      showNotice(
        withdrawError.message || "Unable to withdraw your promotion request.",
        "error",
      );
    } finally {
      setBusySlideId(null);
    }
  };

  const openDelete = (slide) => {
    setSlideToDelete(slide);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async (slide) => {
    if (!slide?.slide_id) return;
    setBusySlideId(slide.slide_id);
    try {
      await deleteSellerPromotionSlide(slide.slide_id);
      showNotice("Promotion slide deleted.");
      setDeleteDialogOpen(false);
      setSlideToDelete(null);
      await loadSlides();
    } catch (deleteError) {
      showNotice(
        deleteError.message || "Unable to delete promotion slide.",
        "error",
      );
    } finally {
      setBusySlideId(null);
    }
  };

  const canEditSlide = (slide) => {
    if (slide.review_status === "pending") return false;
    if (slide.review_status !== "accepted") return true;
    return Number(slide.is_currently_published) !== 1;
  };

  const pendingReviewCount =
    slides.filter((slide) => slide.review_status === "pending").length +
    headerRequests.filter((request) => request.status === "pending").length;
  const activeSection =
    activeTab === "store-profile"
      ? "Store Profile"
      : activeTab === "header"
        ? "Promo Header"
        : "Slides";
  const metrics = [
    {
      label: "PROMOTION SLIDES",
      value: loading ? "—" : `${slides.length}/${slideLimit}`,
      caption: `Custom slides for your storefront (up to ${slideLimit})`,
      icon: CampaignOutlinedIcon,
      color: theme.palette.error.main,
      background:
        theme.palette.mode === "dark" ? "rgba(239, 68, 68, 0.14)" : "#fff5f5",
    },
    {
      label: "PENDING REVIEWS",
      value: loading || headerLoading ? "—" : pendingReviewCount,
      caption: "Slide and promo header requests awaiting review",
      icon: RateReviewOutlinedIcon,
      color: theme.palette.info.main,
      background:
        theme.palette.mode === "dark" ? "rgba(2, 136, 209, 0.14)" : "#f0f9ff",
    },
    {
      label: "ACTIVE SECTION",
      value: activeSection,
      caption: "Current marketing workspace",
      icon: StorefrontOutlinedIcon,
      color: theme.palette.success.main,
      background:
        theme.palette.mode === "dark" ? "rgba(34, 197, 94, 0.14)" : "#f0fdf4",
    },
  ];

  if (loading && headerLoading && !slides.length && !headerRequests.length) {
    return (
      <SellerLoadingPanel
        title="Marketing"
        subtitle="Manage your storefront profile, promotion slides, and announcement banner requests."
      />
    );
  }

  if (error || (activeTab === "header" && headerLoadError)) {
    return (
      <Box sx={{ minWidth: 0 }}>
        <Helmet titleTemplate="%s - ArtMatch">
          <title>Marketing</title>
        </Helmet>
        <ConnectionErrorPanel
          title="Promotions Unavailable"
          message={error || headerLoadError}
          onRetry={() => {
            loadSlides();
            loadHeaderRequests();
          }}
        />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2.5 },
        minHeight: "100vh",
        width: "100%",
        minWidth: 0,
        backgroundColor: theme.palette.background.default,
        color: theme.palette.text.primary,
      }}
    >
      <Helmet><title>Marketing | Red Nexus Seller</title></Helmet>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 2.5, flexWrap: "wrap" }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: { xs: 28, sm: 38 },
              fontWeight: 800,
              lineHeight: 1.1,
              color: theme.palette.text.primary,
            }}
          >
            Marketing
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75, fontSize: 13 }}>
            Create promotional slides or request a custom buyer promo header.
          </Typography>
        </Box>
        {activeTab === "slides" ? (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            disabled={slides.length >= slideLimit || loading}
            onClick={openCreate}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 700,
              fontSize: 13,
              height: 44,
              width: { xs: "100%", sm: "auto" },
              backgroundColor: "error.main",
              color:"#fff",
            }}
          >
            Create slide ({slides.length}/{slideLimit})
          </Button>
        ) : activeTab === "header" ? (
          <Button
            variant="contained"
            startIcon={<PublishOutlinedIcon />}
            disabled={
              headerLoading ||
              headerRequests.some((request) => request.status === "pending")
            }
            onClick={() => {
              setHeaderFormError("");
              setHeaderDialogOpen(true);
            }}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 700,
              fontSize: 13,
              height: 44,
              width: { xs: "100%", sm: "auto" },
              backgroundColor: "error.main",
              color: "#fff",
              boxShadow: "none",
              "&:hover": { backgroundColor: "error.dark", boxShadow: "none" },
            }}
          >
            {headerRequests.some((request) => request.status === "pending")
              ? "Request pending review"
              : "Request promo header"}
          </Button>
        ) : null}
      </Stack>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            md: "repeat(3, minmax(0, 1fr))",
          },
          gap: 2,
          mb: 2.5,
        }}
      >
        {metrics.map((metric) => {
          const MetricIcon = metric.icon;
          return (
            <Card
              key={metric.label}
              sx={{
                backgroundColor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2.5,
                boxShadow: "none",
              }}
            >
              <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      sx={{
                        color: theme.palette.text.secondary,
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: 1,
                      }}
                    >
                      {metric.label}
                    </Typography>
                    <Typography
                      sx={{
                        mt: 0.5,
                        color: theme.palette.text.primary,
                        fontSize: 28,
                        fontWeight: 800,
                        lineHeight: 1.15,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {metric.value}
                    </Typography>
                    <Typography
                      sx={{
                        mt: 1,
                        color: theme.palette.text.secondary,
                        fontSize: 12,
                      }}
                    >
                      {metric.caption}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 50,
                      height: 50,
                      flexShrink: 0,
                      display: "grid",
                      placeItems: "center",
                      borderRadius: 2,
                      backgroundColor: metric.background,
                      color: metric.color,
                    }}
                  >
                    <MetricIcon sx={{ fontSize: 24 }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>

      <Tabs
        value={activeTab}
        onChange={(_, value) => {
          const nextParams = new URLSearchParams(searchParams);
          nextParams.set("tab", value);
          setSearchParams(nextParams);
        }}
        aria-label="Seller marketing options"
        sx={{ mb: 2 }}
      >
        <Tab value="store-profile" label="Store Profile" />
        <Tab value="slides" label="Promotion Slides" />
        <Tab value="header" label="Promo Header" />
      </Tabs>

      {activeTab === "store-profile" ? (
        <Box sx={{ minWidth: 0 }}>
          <SellerStorefront />
        </Box>
      ) : activeTab === "header" ? (
        <Stack spacing={2.5}>
          <MarketingSectionBanner
            icon={AutoAwesomeOutlinedIcon}
            title="Promo header"
            description="Create a buyer-facing announcement for your storefront."
          />
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr)",
              gap: { xs: 1.5, sm: 2 },
            }}
          >
            <Paper
              variant="outlined"
              sx={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: 170,
                p: 2.5,
                borderRadius: 3,
                borderColor: theme.palette.divider,
                backgroundColor: theme.palette.background.paper,
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: "text.secondary" }}>
                  BUYER PANEL PREVIEW
                </Typography>
                <Chip size="small" label="LIVE PREVIEW" color="error" variant="outlined" />
              </Stack>
              <Box sx={{ mt: 2, overflow: "hidden", borderRadius: 1 }}>
                <PromotionHeaderPreview
                  message={headerForm.message}
                  buttonLabel={headerForm.button_label}
                />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1.25 }}>
                Preview only · Requires admin approval
              </Typography>
            </Paper>
          </Box>

          {headerLoading ? (
            <Paper
              variant="outlined"
              sx={{
                display: "grid",
                placeItems: "center",
                minHeight: 180,
                borderRadius: 3,
                borderColor: theme.palette.divider,
              }}
            >
              <CircularProgress />
            </Paper>
          ) : (
            <>
              {headerRequests[0]?.status === "pending" && (
                <Alert severity="warning">
                  Your latest promo header request is awaiting admin review.
                </Alert>
              )}
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", sm: "center" }}
                spacing={0.75}
                sx={{ mt: 1 }}
              >
                <Box>
                  <Typography variant="h6" fontWeight={800}>
                    Request history
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Track admin decisions for your buyer announcements.
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  variant="outlined"
                  label={`${headerRequests.length} ${headerRequests.length === 1 ? "request" : "requests"}`}
                />
              </Stack>
              {headerRequests.length === 0 ? (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    borderRadius: 2.5,
                    borderColor: theme.palette.divider,
                    borderLeft: `4px solid ${theme.palette.warning.main}`,
                    backgroundColor: theme.palette.background.paper,
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <RateReviewOutlinedIcon color="error" />
                    <Box>
                      <Typography fontWeight={700}>No announcements submitted yet</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Your submitted messages and review updates will appear here.
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              ) : (
                <Stack spacing={1.5}>
                  {headerRequests.map((request) => (
                    <Card
                      key={request.request_id}
                      variant="outlined"
                      sx={{
                        borderRadius: 2.5,
                        borderColor: theme.palette.divider,
                        borderLeft: `4px solid ${
                          request.status === "accepted"
                            ? theme.palette.success.main
                            : request.status === "rejected"
                              ? theme.palette.error.main
                              : theme.palette.warning.main
                        }`,
                        backgroundColor: theme.palette.background.paper,
                      }}
                    >
                      <CardContent sx={{ p: { xs: 2, sm: 2.5 }, "&:last-child": { pb: { xs: 2, sm: 2.5 } } }}>
                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          justifyContent="space-between"
                          alignItems={{ xs: "flex-start", sm: "center" }}
                          spacing={1}
                        >
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, letterSpacing: 0.8 }}>
                              ANNOUNCEMENT
                            </Typography>
                            <Typography fontWeight={700}>
                              {request.message}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {request.button_label} · {request.button_url}
                            </Typography>
                          </Box>
                          <Chip
                            size="small"
                            label={request.status}
                            color={
                              request.status === "accepted"
                                ? "success"
                                : request.status === "rejected"
                                  ? "error"
                                  : "warning"
                            }
                          />
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}
            </>
          )}
        </Stack>
      ) : (
        <>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <MarketingSectionBanner
        icon={ViewCarouselOutlinedIcon}
        title="Promotion carousel"
        description="Build a visual moment for buyers on the shop home."
        aside={
          <Box sx={{ width: { xs: "100%", sm: 180 }, flexShrink: 0 }}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.6 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                SLIDE CAPACITY
              </Typography>
              <Typography variant="caption" aria-live="polite" sx={{ fontWeight: 800 }}>
                {loading ? "Loading..." : `${slides.length}/${slideLimit}`}
              </Typography>
            </Stack>
            <Box
              role="progressbar"
              aria-label="Promotion slide capacity"
              aria-valuemin={0}
              aria-valuemax={slideLimit}
              aria-valuenow={Math.min(slides.length, slideLimit)}
              sx={{
                display: "flex",
                gap: 0.6,
                "& > span": {
                  height: 6,
                  flex: 1,
                  borderRadius: 99,
                  backgroundColor: "action.disabledBackground",
                },
              }}
            >
              {[0, 1, 2].map((slot) => (
                <Box
                  key={slot}
                  component="span"
                  sx={{
                    backgroundColor:
                      slot < slides.length
                        ? theme.palette.error.main
                        : theme.palette.action.disabledBackground,
                  }}
                />
              ))}
            </Box>
          </Box>
        }
      />
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : slides.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{
            borderColor: theme.palette.divider,
            overflow: "hidden",
            position: "relative",
            borderRadius: 3,
            py: { xs: 5, sm: 7 },
            px: 3,
            textAlign: "center",
            backgroundColor: theme.palette.background.paper,
            "&::before, &::after": {
              content: '""',
              position: "absolute",
              width: 180,
              height: 180,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: "50%",
              pointerEvents: "none",
            },
            "&::before": { top: -110, left: -90 },
            "&::after": { bottom: -120, right: -80 },
          }}
        >
          <Box sx={{ position: "relative", zIndex: 1 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                display: "grid",
                placeItems: "center",
                mx: "auto",
                mb: 2,
                borderRadius: 2.5,
                color: theme.palette.error.main,
                backgroundColor:
                  theme.palette.mode === "dark"
                    ? "rgba(239,68,68,0.14)"
                    : "#fff5f5",
                transform: "rotate(-4deg)",
              }}
            >
              <CampaignOutlinedIcon sx={{ fontSize: 31 }} />
            </Box>
            <Typography
              sx={{
                mb: 0.75,
                color: "text.secondary",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 1.1,
              }}
            >
              YOUR NEXT FEATURE STARTS HERE
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              The carousel is yours to fill.
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.75, fontSize: 14 }}>
              Add a strong image and a short message to introduce your work to buyers.
            </Typography>
          </Box>
        </Paper>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
              md: "repeat(3, minmax(0, 1fr))",
              lg: "repeat(5, minmax(0, 1fr))",
            },
            gap: 2,
            mt: 2.5,
          }}
        >
          {slides.map((slide) => (
            <PromotionHeaderCard
              key={slide.slide_id}
              slide={slide}
              canEdit={canEditSlide(slide)}
              busy={busySlideId === slide.slide_id}
              onEdit={() => openEdit(slide)}
              onRequestReview={() => handleRequestReview(slide)}
              onWithdrawRequest={() => handleWithdrawRequest(slide)}
              onDelete={() => openDelete(slide)}
            />
          ))}
        </Box>
      )}

      <PromotionSlideForm
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSave}
        selectedSlide={selectedSlide}
        form={form}
        setForm={setForm}
        preview={preview}
        formError={formError}
        saving={saving}
        onImageChange={handleImage}
      />
      <PromotionSliderDelete
        open={deleteDialogOpen}
        handleClose={() => {
          setDeleteDialogOpen(false);
          setSlideToDelete(null);
        }}
        onSubmit={handleDelete}
        selectedSlide={slideToDelete}
        deleting={busySlideId === slideToDelete?.slide_id}
      />
        </>
      )}
      <PromotionHeaderForm
        open={headerDialogOpen}
        onClose={() => setHeaderDialogOpen(false)}
        onSubmit={handleHeaderRequest}
        form={headerForm}
        setForm={setHeaderForm}
        error={headerFormError}
        setError={setHeaderFormError}
        saving={headerSaving}
      />
      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={4000}
        onClose={() => setNotice("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={noticeSeverity}
          variant="filled"
          onClose={() => setNotice("")}
          sx={{
            width: { xs: 280, sm: 360 },
            minHeight: 48,
            borderRadius: 2,
            boxShadow: "0 10px 28px rgba(15, 23, 42, 0.18)",
            backgroundColor: theme.palette[noticeSeverity].main,
            color: "#fff",
            alignItems: "center",
            "& .MuiAlert-icon": {
              color: "#fff",
              mr: 1,
            },
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
          {notice}
        </Alert>
      </Snackbar>
    </Box>
  );
}
