import { useCallback, useEffect, useState } from "react";
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
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
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

export default function PromotionHeader() {
  const [header, setHeader] = useState(initialHeader);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [requests, setRequests] = useState([]);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [reviewingRequestId, setReviewingRequestId] = useState(null);
  const [requestError, setRequestError] = useState("");
  const canEdit = canEditPromotionHeader();

  const loadRequests = useCallback(async () => {
    setRequestsLoading(true);
    setRequestError("");
    try {
      setRequests(await fetchPromotionHeaderRequests());
    } catch (loadError) {
      setRequestError(
        loadError.message || "Unable to load promo header requests.",
      );
    } finally {
      setRequestsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    let active = true;
    fetchPromotionHeader()
      .then((loadedHeader) => {
        if (active) {
          setHeader({
            message: loadedHeader.message || "",
            button_label: loadedHeader.button_label || "",
            button_url: loadedHeader.button_url || "",
          });
        }
      })
      .catch((loadError) => {
        if (active) {
          setError(loadError.message || "Unable to load promo header.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const updateField = (field) => (event) => {
    setHeader((current) => ({ ...current, [field]: event.target.value }));
    setNotice("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);
    try {
      const savedHeader = await savePromotionHeader(header);
      setHeader(savedHeader);
      setNotice("Promo header updated. Buyers will see the new content.");
    } catch (saveError) {
      setError(saveError.message || "Unable to save promo header.");
    } finally {
      setSaving(false);
    }
  };

  const handleReviewRequest = async (request, decision) => {
    setReviewingRequestId(request.request_id);
    setRequestError("");
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
        setNotice("Promo header request approved and now displayed to buyers.");
      } else {
        setNotice("Promo header request rejected.");
      }
    } catch (reviewError) {
      setRequestError(
        reviewError.message || "Unable to review promo header request.",
      );
    } finally {
      setReviewingRequestId(null);
    }
  };

  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="h5" fontWeight={800} sx={{ mb: 0.75 }}>
        Promo Header
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Edit the red announcement strip shown above the buyer navigation.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert>}
      {!canEdit && (
        <Alert severity="info" sx={{ mb: 2 }}>
          You have view-only access to this setting.
        </Alert>
      )}
      <Button
        variant="outlined"
        onClick={() => {
          setRequestsOpen(true);
          loadRequests();
        }}
        sx={{ mb: 2 }}
      >
        Header requests
        {requests.length > 0 && (
          <Chip
            size="small"
            color="warning"
            label={requests.length}
            sx={{ ml: 1 }}
          />
        )}
      </Button>

      <Paper
        component="form"
        variant="outlined"
        onSubmit={handleSubmit}
        sx={{ p: { xs: 2, sm: 3 }, maxWidth: 760 }}
      >
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={2.5}>
            <TextField
              label="Announcement message"
              value={header.message}
              onChange={updateField("message")}
              required
              fullWidth
              multiline
              minRows={2}
              inputProps={{ maxLength: 200 }}
              helperText={`${header.message.length}/200 characters`}
              disabled={!canEdit || saving}
            />
            <TextField
              label="Button label"
              value={header.button_label}
              onChange={updateField("button_label")}
              required
              fullWidth
              inputProps={{ maxLength: 60 }}
              helperText="Text shown on the right side of the red strip."
              disabled={!canEdit || saving}
            />
            <TextField
              label="Button destination"
              value={header.button_url}
              onChange={updateField("button_url")}
              required
              fullWidth
              placeholder="/buyer/shop"
              helperText="Enter a site path, for example /buyer/shop."
              disabled={!canEdit || saving}
            />
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
                flexWrap: "wrap",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 2,
                  px: 2,
                  py: 1.25,
                  borderRadius: 1,
                  bgcolor: "background.footer",
                  color: "common.white",
                  flex: 1,
                  minWidth: 220,
                }}
              >
                <Typography variant="body2">{header.message}</Typography>
                  <Button
                    type="button"
                    size="small"
                    sx={{
                      color: "inherit",
                      textTransform: "none",
                      whiteSpace: "nowrap",
                    }}
                    endIcon={<span aria-hidden="true">›</span>}
                  >
                    {header.button_label}
                  </Button>
                </Box>
                <Button
                  type="submit"
                variant="contained"
                disabled={!canEdit || saving}
                startIcon={
                  saving ? <CircularProgress size={18} color="inherit" /> : null
                }
              >
                {saving ? "Saving..." : "Save header"}
              </Button>
            </Box>
          </Stack>
        )}
      </Paper>
      <Dialog
        open={requestsOpen}
        onClose={() => reviewingRequestId === null && setRequestsOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Promo header requests ({requests.length})</DialogTitle>
        <DialogContent dividers>
          {requestError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {requestError}
            </Alert>
          )}
          {requestsLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress />
            </Box>
          ) : requests.length === 0 ? (
            <Alert severity="info">There are no pending promo header requests.</Alert>
          ) : (
            <Stack spacing={2}>
              {requests.map((request) => (
                <Card key={request.request_id} variant="outlined">
                  <CardContent>
                    <Stack spacing={1.5}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="flex-start"
                        spacing={1}
                      >
                        <Typography fontWeight={700}>
                          {request.first_name} {request.last_name}
                          {request.student_number
                            ? ` (${request.student_number})`
                            : ""}
                        </Typography>
                        <Chip size="small" color="warning" label="Pending" />
                      </Stack>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 2,
                          flexWrap: "wrap",
                          px: 2,
                          py: 1.25,
                          borderRadius: 1,
                          bgcolor: "background.footer",
                          color: "common.white",
                        }}
                      >
                        <Typography variant="body2">{request.message}</Typography>
                        <Button
                          type="button"
                          size="small"
                          sx={{ color: "inherit", textTransform: "none" }}
                          endIcon={<span aria-hidden="true">›</span>}
                        >
                          {request.button_label}
                        </Button>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        Destination: {request.button_url}
                      </Typography>
                      <Stack
                        direction="row"
                        justifyContent="flex-end"
                        spacing={1}
                      >
                        <Button
                          color="error"
                          onClick={() => handleReviewRequest(request, "reject")}
                          disabled={!canEdit || reviewingRequestId !== null}
                        >
                          {reviewingRequestId === request.request_id
                            ? "Reviewing..."
                            : "Reject"}
                        </Button>
                        <Button
                          variant="contained"
                          color="success"
                          onClick={() => handleReviewRequest(request, "accept")}
                          disabled={!canEdit || reviewingRequestId !== null}
                        >
                          {reviewingRequestId === request.request_id
                            ? "Reviewing..."
                            : "Approve & display"}
                        </Button>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => setRequestsOpen(false)}
            disabled={reviewingRequestId !== null}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
