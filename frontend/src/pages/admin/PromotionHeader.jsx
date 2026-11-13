import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SearchIcon from "@mui/icons-material/Search";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import ViewListIcon from "@mui/icons-material/ViewList";
import RateReviewOutlinedIcon from "@mui/icons-material/RateReviewOutlined";

import PromotionHeaderCard from "../../components/admin/Event/PromotionHeaderCard";
import PromotionHeaderTable from "../../components/admin/Event/PromotionHeaderTable";
import PromotionHeaderForm from "../../components/admin/Event/PromotionHeaderForm";
import PromotionHeaderReviewDialog from "../../components/admin/Event/PromotionHeaderReviewDialog";
import {
  fetchPromotionHeaderRequests,
  fetchPromotionHeader,
  reviewPromotionHeaderRequest,
  savePromotionHeader,
} from "../../api/admin/systemSettingsAPI";

const initialHeader = {
  message: "",
  button_label: "",
  button_url: "",
};

const canEditPromotionHeader = () => {
  const role = String(localStorage.getItem("admin_role") || "")
    .toLowerCase()
    .trim();
  if (role === "super admin" || role === "admin" || role === "moderator") {
    return true;
  }
  return ["1", "true"].includes(
    String(localStorage.getItem("admin_can_edit") || "").toLowerCase(),
  );
};

export default function PromotionHeader({ registerActions, onNotify }) {
  const theme = useTheme();
  const [header, setHeader] = useState(initialHeader);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("card");
  const [formOpen, setFormOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewingRequestId, setReviewingRequestId] = useState(null);
  const retryActionsRef = useRef({});

  const canEdit = canEditPromotionHeader();

  const loadHeader = useCallback(async () => {
    try {
      setLoading(true);
      const loadedHeader = await fetchPromotionHeader();
      setHeader({
        message: loadedHeader?.message || "",
        button_label: loadedHeader?.button_label || "",
        button_url: loadedHeader?.button_url || "",
      });
    } catch (loadError) {
      onNotify?.(loadError.message || "Unable to load promo header.", "error", {
        label: "Retry",
        onClick: () => retryActionsRef.current.loadHeader?.(),
      });
    } finally {
      setLoading(false);
    }
  }, [onNotify]);

  const loadRequests = useCallback(async () => {
    try {
      setRequestsLoading(true);
      const loadedRequests = await fetchPromotionHeaderRequests();
      setRequests(Array.isArray(loadedRequests) ? loadedRequests : []);
    } catch (loadError) {
      onNotify?.(
        loadError.message || "Unable to load promo header requests.",
        "error",
        {
          label: "Retry",
          onClick: () => retryActionsRef.current.loadRequests?.(),
        },
      );
    } finally {
      setRequestsLoading(false);
    }
  }, [onNotify]);
  retryActionsRef.current.loadHeader = loadHeader;
  retryActionsRef.current.loadRequests = loadRequests;

  useEffect(() => {
    loadHeader();
    loadRequests();
  }, [loadHeader, loadRequests]);

  useEffect(() => {
    if (!canEdit) {
      onNotify?.("You have view-only access to promo header management.", "info");
    }
  }, [canEdit, onNotify]);

  useEffect(() => {
    if (typeof registerActions === "function") {
      registerActions({
        openEdit: () => setFormOpen(true),
        openReview: () => {
          setReviewOpen(true);
          loadRequests();
        },
        requestsCount: requests.length,
        canEdit,
      });
    }
  }, [registerActions, requests.length, canEdit, loadRequests]);

  const handleSaveHeader = async (headerData) => {
    setSaving(true);
    try {
      const savedHeader = await savePromotionHeader(headerData);
      setHeader(savedHeader);
      onNotify?.("Promo header updated successfully. Live for buyers.", "success");
      setFormOpen(false);
    } catch (saveError) {
      throw saveError;
    } finally {
      setSaving(false);
    }
  };

  const handleReviewRequest = async (request, decision) => {
    setReviewingRequestId(request.request_id);
    try {
      await reviewPromotionHeaderRequest(request.request_id, decision);
      setRequests((current) =>
        current.filter((item) => item.request_id !== request.request_id),
      );
      if (decision === "accept") {
        setHeader({
          message: request.message,
          button_label: request.button_label,
          button_url: request.button_url,
        });
        onNotify?.(
          "Promo header request approved and now live on buyer banner.",
          "success",
        );
      } else {
        onNotify?.("Promo header request rejected.", "success");
      }
    } catch (reviewError) {
      onNotify?.(
        reviewError.message || "Unable to review promo header request.",
        "error",
      );
    } finally {
      setReviewingRequestId(null);
    }
  };

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return requests;
    return requests.filter((r) =>
      [r.first_name, r.last_name, r.student_number, r.message, r.button_label, r.button_url]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [requests, search]);

  return (
    <Box>
      {/* Search Bar */}
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 1.5, sm: 2 },
          borderRadius: 2.5,
          backgroundColor: theme.palette.background.paper,
          borderColor: theme.palette.divider,
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", md: "center" }}
          gap={1.5}
          sx={{ minWidth: 0 }}
        >
          <TextField
            size="small"
            placeholder="Search student header requests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            fullWidth={Boolean(registerActions)}
            sx={{
              width: registerActions ? "100%" : { xs: "100%", md: 340 },
              maxWidth: "100%",
              minWidth: 0,
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

          {!registerActions && (
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Button
                variant="outlined"
                startIcon={<RateReviewOutlinedIcon />}
                onClick={() => {
                  setReviewOpen(true);
                  loadRequests();
                }}
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
                Requests ({requests.length})
              </Button>
              {canEdit && (
                <Button
                  variant="contained"
                  startIcon={<EditOutlinedIcon />}
                  onClick={() => setFormOpen(true)}
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
                  Edit Promo Header
                </Button>
              )}
            </Stack>
          )}
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
          mt: 2,
          mb: 1,
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          aria-live="polite"
          sx={{ fontWeight: 600 }}
        >
          {requests.length > 0
            ? `Showing active header banner and ${filteredRequests.length} pending student requests`
            : "Showing active header banner"}
        </Typography>

        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(e, next) => {
            if (next) setViewMode(next);
          }}
          size="small"
          aria-label="Promo header presentation mode"
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
          <CircularProgress aria-label="Loading promo header" />
        </Box>
      ) : viewMode === "card" ? (
        <PromotionHeaderCard
          header={header}
          requests={filteredRequests}
          canEdit={canEdit}
          onEdit={() => setFormOpen(true)}
          onOpenRequests={() => setReviewOpen(true)}
          onReviewRequest={handleReviewRequest}
          reviewingRequestId={reviewingRequestId}
        />
      ) : (
        <PromotionHeaderTable
          header={header}
          requests={filteredRequests}
          canEdit={canEdit}
          onEdit={() => setFormOpen(true)}
          onReviewRequest={handleReviewRequest}
          reviewingRequestId={reviewingRequestId}
        />
      )}

      {/* Edit Header Dialog (Strictly designed to match ArtworkForm.jsx) */}
      <PromotionHeaderForm
        open={formOpen}
        onClose={() => {
          if (!saving) setFormOpen(false);
        }}
        onSubmit={handleSaveHeader}
        initialData={header}
        saving={saving}
      />

      {/* Review Header Requests Dialog (Strictly designed to match ArtworkForm.jsx) */}
      <PromotionHeaderReviewDialog
        open={reviewOpen}
        onClose={() => {
          if (reviewingRequestId === null) setReviewOpen(false);
        }}
        requests={requests}
        loading={requestsLoading}
        onReview={handleReviewRequest}
        reviewingRequestId={reviewingRequestId}
        canEdit={canEdit}
      />
    </Box>
  );
}
