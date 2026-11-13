import React from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import RateReviewOutlinedIcon from "@mui/icons-material/RateReviewOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import PromotionHeaderPreview from "../../common/PromotionHeaderPreview";

export default function PromotionHeaderCard({
  header = { message: "", button_label: "", button_url: "" },
  requests = [],
  canEdit = true,
  onEdit,
  onOpenRequests,
  onReviewRequest,
  reviewingRequestId = null,
}) {
  const theme = useTheme();
  const isDark = theme?.palette?.mode === "dark";

  return (
    <Stack spacing={3}>
      {/* Active Promo Header Banner Card */}
      <Card
        elevation={0}
        sx={{
          borderRadius: 3.5,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            p: { xs: 2, sm: 2.5 },
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 1.5,
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: isDark ? "background.paper" : "#fafbfc",
          }}
        >
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: 2,
                display: "grid",
                placeItems: "center",
                bgcolor: isDark ? "rgba(239, 51, 64, 0.15)" : "#fff5f5",
                color: "#ef3340",
              }}
            >
              <CampaignOutlinedIcon sx={{ fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.2 }}>
                Active Announcement Strip
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Site-wide banner strip displayed at the top of buyer navigation
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              size="small"
              label={header.message ? "Live & Active" : "Empty / Inactive"}
              sx={{
                fontWeight: 700,
                fontSize: 12,
                bgcolor: header.message
                  ? isDark
                    ? "rgba(34, 197, 94, 0.16)"
                    : "#f0fdf4"
                  : isDark
                  ? "rgba(100, 116, 139, 0.16)"
                  : "#f1f5f9",
                color: header.message ? "success.main" : "text.secondary",
                border: "1px solid",
                borderColor: header.message ? "success.light" : "divider",
              }}
            />
            {canEdit && (
              <Button
                variant="contained"
                size="small"
                startIcon={<EditOutlinedIcon fontSize="small" />}
                onClick={onEdit}
                sx={{
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: 13,
                  bgcolor: "#ef3340",
                  color: "#fff",
                  boxShadow: "none",
                  "&:hover": {
                    bgcolor: "#d6202e",
                    boxShadow: "none",
                  },
                }}
              >
                Edit Header
              </Button>
            )}
          </Stack>
        </Box>

        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack spacing={2.5}>
            {/* Live Interactive Strip Preview */}
            <Box>
              <Typography
                variant="caption"
                fontWeight={700}
                color="text.secondary"
                sx={{ display: "block", mb: 1, textTransform: "uppercase", letterSpacing: 0.5 }}
              >
                Live Buyer Preview
              </Typography>
              <Box sx={{ overflow: "hidden", borderRadius: 1 }}>
                <PromotionHeaderPreview
                  message={header.message}
                  buttonLabel={header.button_label}
                  messageFallback="No announcement text configured."
                />
              </Box>
            </Box>

            {/* Banner Details Breakdown */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "minmax(0, 1fr)",
                  sm: "repeat(2, minmax(0, 1fr))",
                  lg: "repeat(3, minmax(0, 1fr))",
                },
                gap: 2,
                pt: 1,
                minWidth: 0,
              }}
            >
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: isDark ? "background.default" : "#f8fafc", border: "1px solid", borderColor: "divider", minWidth: 0, overflow: "hidden" }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  BUTTON LABEL
                </Typography>
                <Typography variant="body2" fontWeight={700} sx={{ mt: 0.5, overflowWrap: "break-word" }}>
                  {header.button_label || "—"}
                </Typography>
              </Box>

              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: isDark ? "background.default" : "#f8fafc", border: "1px solid", borderColor: "divider", minWidth: 0, overflow: "hidden" }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  DESTINATION URL
                </Typography>
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5, minWidth: 0 }}>
                  <LinkOutlinedIcon sx={{ fontSize: 16, color: "text.secondary", flexShrink: 0 }} />
                  <Typography variant="body2" fontWeight={600} sx={{ overflowWrap: "anywhere", minWidth: 0 }}>
                    {header.button_url || "—"}
                  </Typography>
                </Stack>
              </Box>

              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: isDark ? "background.default" : "#f8fafc", border: "1px solid", borderColor: "divider", minWidth: 0, overflow: "hidden" }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  MESSAGE LENGTH
                </Typography>
                <Typography variant="body2" fontWeight={700} sx={{ mt: 0.5 }}>
                  {header.message ? `${header.message.length} / 200 characters` : "0 / 200 characters"}
                </Typography>
              </Box>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Pending Student Header Requests Cards */}
      <Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 1.5,
            mb: 2,
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <RateReviewOutlinedIcon sx={{ color: "#ef3340", fontSize: 22 }} />
            <Typography variant="h6" fontWeight={800}>
              Student Header Requests
            </Typography>
            <Chip
              size="small"
              label={requests.length}
              color={requests.length > 0 ? "warning" : "default"}
              sx={{ fontWeight: 800, fontSize: 12 }}
            />
          </Stack>

          {requests.length > 0 && (
            <Button
              variant="outlined"
              size="small"
              onClick={onOpenRequests}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 700,
                fontSize: 12.5,
              }}
            >
              Open Review Dialog
            </Button>
          )}
        </Box>

        {requests.length === 0 ? (
          <Paper
            variant="outlined"
            sx={{
              py: 5,
              px: 3,
              borderRadius: 3.5,
              textAlign: "center",
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
            }}
          >
            <RateReviewOutlinedIcon sx={{ fontSize: 44, color: "text.disabled", mb: 1 }} />
            <Typography variant="body1" fontWeight={700} color="text.secondary">
              No pending promo header requests
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
              When students submit requests for announcement banners, they will appear here for admin review.
            </Typography>
          </Paper>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "minmax(0, 1fr)",
                md: "repeat(2, minmax(0, 1fr))",
              },
              gap: 2,
              minWidth: 0,
            }}
          >
            {requests.map((request) => {
              const isReviewing = reviewingRequestId === request.request_id;

              return (
                <Card
                  key={request.request_id}
                  variant="outlined"
                  sx={{
                    borderRadius: 3,
                    borderColor: "divider",
                    bgcolor: "background.paper",
                    display: "flex",
                    flexDirection: "column",
                    minWidth: 0,
                    overflow: "hidden",
                  }}
                >
                  <CardContent sx={{ p: { xs: 2, sm: 2.5 }, flex: 1, display: "flex", flexDirection: "column", gap: 1.5 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 1, minWidth: 0 }}>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="subtitle2" fontWeight={800} sx={{ overflowWrap: "break-word" }}>
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
                        label="Pending"
                        sx={{
                          fontWeight: 700,
                          fontSize: 11,
                          bgcolor: isDark ? "rgba(245, 158, 11, 0.16)" : "#fffbeb",
                          color: "#d97706",
                          border: "1px solid #fde68a",
                        }}
                      />
                    </Box>

                    {/* Strip Preview inside Card */}
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1.5,
                        px: 1.75,
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
                        mt: "auto",
                        pt: 1.5,
                        borderTop: `1px solid ${theme.palette.divider}`,
                      }}
                    >
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<CancelOutlinedIcon fontSize="small" />}
                        onClick={() => onReviewRequest && onReviewRequest(request, "reject")}
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
                        startIcon={<CheckCircleOutlineIcon fontSize="small" />}
                        onClick={() => onReviewRequest && onReviewRequest(request, "accept")}
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
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        )}
      </Box>
    </Stack>
  );
}
