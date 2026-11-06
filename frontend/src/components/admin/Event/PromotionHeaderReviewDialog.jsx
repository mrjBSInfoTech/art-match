import React from "react";
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
  Slide,
  Stack,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import RateReviewOutlinedIcon from "@mui/icons-material/RateReviewOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";

const Transition = React.forwardRef(function Transition(props, ref) {
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

export default function PromotionHeaderReviewDialog({
  open,
  onClose,
  requests = [],
  loading = false,
  error = "",
  onReview,
  reviewingRequestId = null,
  canEdit = true,
}) {
  const theme = useTheme();

  return (
    <Dialog
      open={open}
      onClose={reviewingRequestId ? undefined : onClose}
      TransitionComponent={Transition}
      keepMounted
      fullWidth
      maxWidth={false}
      PaperProps={{
        sx: {
          width: "min(100% - 24px, 580px)",
          maxWidth: "580px",
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
        <RateReviewOutlinedIcon sx={{ color: "#ef3340", fontSize: 20 }} />
        Promo Header Requests ({requests.length})
        <Button
          aria-label="Close header requests review dialog"
          onClick={onClose}
          disabled={Boolean(reviewingRequestId)}
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

      <DialogContent dividers sx={{ p: { xs: 2, sm: 2.5 } }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress size={36} />
          </Box>
        ) : requests.length === 0 ? (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <RateReviewOutlinedIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
            <Typography variant="body1" fontWeight={700}>
              No pending header requests
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
              Student requests to feature announcements on the top header will appear here.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={2}>
            {requests.map((request) => {
              const isReviewing = reviewingRequestId === request.request_id;

              return (
                <Card
                  key={request.request_id}
                  variant="outlined"
                  sx={{
                    borderRadius: 2.5,
                    borderColor: "divider",
                    bgcolor: "background.paper",
                  }}
                >
                  <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                    <Stack spacing={1.5}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Box>
                          <Typography variant="subtitle2" fontWeight={700}>
                            {request.first_name} {request.last_name}
                          </Typography>
                          {request.student_number && (
                            <Typography variant="caption" color="text.secondary">
                              Student ID: {request.student_number}
                            </Typography>
                          )}
                        </Box>
                        <Chip
                          size="small"
                          label="Pending Review"
                          sx={{
                            fontWeight: 700,
                            fontSize: 11,
                            bgcolor: theme.palette.mode === "dark" ? "rgba(245, 158, 11, 0.16)" : "#fffbeb",
                            color: "#d97706",
                            border: "1px solid #fde68a",
                          }}
                        />
                      </Box>

                      {/* Header Preview Strip */}
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 1.5,
                          px: 2,
                          py: 1.25,
                          borderRadius: 2,
                          bgcolor: "#ef3340",
                          color: "#fff",
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            fontSize: 12.5,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {request.message}
                        </Typography>
                        <Button
                          type="button"
                          size="small"
                          sx={{
                            color: "#fff",
                            bgcolor: "rgba(255, 255, 255, 0.2)",
                            textTransform: "none",
                            fontWeight: 700,
                            fontSize: 11,
                            px: 1.25,
                            py: 0.2,
                            borderRadius: 1.5,
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                          }}
                          endIcon={<span aria-hidden="true">›</span>}
                        >
                          {request.button_label}
                        </Button>
                      </Box>

                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                        Destination: <strong>{request.button_url}</strong>
                      </Typography>

                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "flex-end",
                          gap: 1,
                          pt: 1,
                          borderTop: `1px solid ${theme.palette.divider}`,
                        }}
                      >
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<CancelOutlinedIcon fontSize="small" />}
                          onClick={() => onReview(request, "reject")}
                          disabled={!canEdit || isReviewing}
                          sx={{
                            borderRadius: 1.5,
                            textTransform: "none",
                            fontWeight: 700,
                            fontSize: 12,
                          }}
                        >
                          Reject
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={
                            isReviewing ? (
                              <CircularProgress size={14} color="inherit" />
                            ) : (
                              <CheckCircleOutlineIcon fontSize="small" />
                            )
                          }
                          onClick={() => onReview(request, "accept")}
                          disabled={!canEdit || isReviewing}
                          sx={{
                            borderRadius: 1.5,
                            textTransform: "none",
                            fontWeight: 700,
                            fontSize: 12,
                            bgcolor: "success.main",
                            color: "#fff",
                            "&:hover": {
                              bgcolor: "success.dark",
                            },
                          }}
                        >
                          {isReviewing ? "Processing..." : "Approve & Display"}
                        </Button>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.75, borderTop: `1px solid ${theme.palette.divider}` }}>
        <Button
          onClick={onClose}
          disabled={Boolean(reviewingRequestId)}
          sx={{
            color: "text.secondary",
            textTransform: "none",
            fontWeight: 600,
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

