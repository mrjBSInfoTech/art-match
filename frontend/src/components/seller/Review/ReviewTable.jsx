import { useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Rating,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import RateReviewOutlinedIcon from "@mui/icons-material/RateReviewOutlined";
import ReviewResponseForm from "./ReviewResponseForm";
import { formatReviewDate } from "./reviewPresentation";
import { sellerTableButtonSx } from "../sellerTableStyles";

function getResponseStatusStyle(theme, hasResponse) {
  const isDark = theme.palette.mode === "dark";
  const shade = isDark ? "light" : "dark";
  const paletteKey = hasResponse ? "success" : "warning";
  const baseColor = theme.palette[paletteKey]?.main || theme.palette.text.secondary;

  return {
    bgcolor: alpha(baseColor, isDark ? 0.18 : 0.12),
    color: theme.palette[paletteKey]?.[shade] || baseColor,
    border: "1px solid",
    borderColor: alpha(baseColor, 0.35),
  };
}

export default function ReviewTable({
  reviews = [],
  averageRating = 0,
  onResponseSaved,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [selectedReviewId, setSelectedReviewId] = useState(null);

  const selectedReview =
    reviews.find((review) => review.id === selectedReviewId) || null;

  return (
    <>
      <Paper
        component="section"
        variant="outlined"
        aria-label="Seller reviews table"
        sx={{
          borderRadius: 3.5,
          borderColor: "divider",
          overflow: "hidden",
          bgcolor: "background.paper",
        }}
      >
        <Box
          sx={{
            px: { xs: 2, sm: 3 },
            py: 2,
            borderBottom: "1px solid",
            borderColor: "divider",
            display: "flex",
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "center" },
            flexDirection: { xs: "column", sm: "row" },
            gap: 1.5,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" fontWeight={800} sx={{ fontSize: 16 }}>
              Customer reviews & ratings
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
              Inspect buyer ratings, comments, and manage your seller replies.
            </Typography>
          </Box>

          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{
              px: 1.5,
              py: 0.75,
              borderRadius: 2,
              bgcolor: theme.palette.action.hover,
              border: "1px solid",
              borderColor: "divider",
              flexShrink: 0,
            }}
          >
            <Rating
              value={averageRating}
              precision={0.1}
              readOnly
              size="small"
              aria-label={
                reviews.length
                  ? `Average rating: ${averageRating.toFixed(1)} out of 5`
                  : "No ratings yet"
              }
            />
            <Typography
              variant="body2"
              fontWeight={800}
              sx={{ fontVariantNumeric: "tabular-nums" }}
            >
              {reviews.length ? averageRating.toFixed(1) : "—"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ({reviews.length})
            </Typography>
          </Stack>
        </Box>

        {isMobile ? (
          <Stack
            divider={<Box sx={{ borderBottom: "1px solid", borderColor: "divider" }} />}
          >
            {reviews.map((review) => {
              const hasResponse = Boolean(review.sellerResponse);
              const dateLabel = formatReviewDate(review.createdAt);
              const responseDateLabel = formatReviewDate(review.sellerResponseAt);
              const pillStyle = getResponseStatusStyle(theme, hasResponse);

              return (
                <Box key={review.id} sx={{ p: 2 }}>
                  <Stack spacing={1.25}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 1,
                      }}
                    >
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography
                          variant="subtitle2"
                          fontWeight={700}
                          sx={{ overflowWrap: "anywhere" }}
                        >
                          {review.artworkTitle || "Artwork"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Reviewed by {review.reviewerName || "Buyer"}
                          {dateLabel ? ` • ${dateLabel}` : ""}
                        </Typography>
                      </Box>

                      <Chip
                        size="small"
                        label={hasResponse ? "Responded" : "Needs Reply"}
                        sx={{
                          ...pillStyle,
                          fontWeight: 800,
                          fontSize: 11,
                          flexShrink: 0,
                        }}
                      />
                    </Box>

                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Rating
                        value={Number(review.rating) || 0}
                        readOnly
                        size="small"
                        aria-label={`${review.rating} out of 5 stars`}
                      />
                      <Typography
                        variant="caption"
                        fontWeight={700}
                        color="text.secondary"
                        sx={{ fontVariantNumeric: "tabular-nums" }}
                      >
                        {(Number(review.rating) || 0).toFixed(1)}
                      </Typography>
                    </Stack>

                    <Typography
                      variant="body2"
                      color={review.comment?.trim() ? "text.primary" : "text.secondary"}
                      sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
                    >
                      {review.comment?.trim() || "No written comment provided."}
                    </Typography>

                    {hasResponse && (
                      <Box
                        sx={{
                          p: 1.25,
                          borderRadius: 2,
                          bgcolor: "action.hover",
                          borderLeft: "3px solid",
                          borderColor: "primary.main",
                        }}
                      >
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          spacing={1}
                          flexWrap="wrap"
                        >
                          <Typography variant="caption" fontWeight={800}>
                            Your response
                          </Typography>
                          {responseDateLabel && (
                            <Typography variant="caption" color="text.secondary">
                              {responseDateLabel}
                            </Typography>
                          )}
                        </Stack>
                        <Typography
                          variant="body2"
                          sx={{ mt: 0.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
                        >
                          {review.sellerResponse}
                        </Typography>
                      </Box>
                    )}

                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => setSelectedReviewId(review.id)}
                      sx={sellerTableButtonSx}
                    >
                      {hasResponse ? "Edit response" : "Respond to review"}
                    </Button>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        ) : (
          <TableContainer sx={{ maxHeight: { xs: 580, md: 720 }, overflowX: "auto" }}>
            <Table
              stickyHeader
              size="small"
              aria-label="Seller reviews table"
              sx={{ minWidth: 940 }}
            >
              <TableHead>
                <TableRow
                  sx={{
                    "& th": {
                      bgcolor: theme.palette.mode === "dark" ? "background.paper" : "#f8fafc",
                      fontWeight: 800,
                      fontSize: 11,
                      letterSpacing: 0.5,
                      textTransform: "uppercase",
                      color: "text.secondary",
                      py: 1.5,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      whiteSpace: "nowrap",
                    },
                  }}
                >
                  <TableCell>Artwork & Buyer</TableCell>
                  <TableCell>Rating</TableCell>
                  <TableCell>Review Comment</TableCell>
                  <TableCell>Your Response</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reviews.map((review) => {
                  const hasResponse = Boolean(review.sellerResponse);
                  const dateLabel = formatReviewDate(review.createdAt);
                  const responseDateLabel = formatReviewDate(review.sellerResponseAt);
                  const pillStyle = getResponseStatusStyle(theme, hasResponse);

                  return (
                    <TableRow
                      key={review.id}
                      hover
                      sx={{
                        "& td": { py: 1.75, verticalAlign: "middle" },
                        "&:last-child td": { borderBottom: 0 },
                      }}
                    >
                      <TableCell sx={{ minWidth: 200, maxWidth: 260 }}>
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          noWrap
                          title={review.artworkTitle || "Artwork"}
                        >
                          {review.artworkTitle || "Artwork"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" noWrap>
                          Reviewed by {review.reviewerName || "Buyer"}
                        </Typography>
                        {dateLabel && (
                          <Typography variant="caption" color="text.secondary" display="block" noWrap>
                            {dateLabel}
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <Stack direction="row" alignItems="center" spacing={0.75}>
                          <Rating
                            value={Number(review.rating) || 0}
                            readOnly
                            size="small"
                            aria-label={`${review.rating} out of 5 stars`}
                          />
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            sx={{ fontVariantNumeric: "tabular-nums" }}
                          >
                            {(Number(review.rating) || 0).toFixed(1)}
                          </Typography>
                        </Stack>
                      </TableCell>

                      <TableCell sx={{ minWidth: 220, maxWidth: 320 }}>
                        <Typography
                          variant="body2"
                          color={review.comment?.trim() ? "text.primary" : "text.secondary"}
                          sx={{
                            display: "-webkit-box",
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            whiteSpace: "pre-wrap",
                            overflowWrap: "anywhere",
                          }}
                          title={review.comment?.trim() || "No written comment provided."}
                        >
                          {review.comment?.trim() || "No written comment provided."}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ minWidth: 210, maxWidth: 300 }}>
                        {hasResponse ? (
                          <Box>
                            <Typography
                              variant="body2"
                              sx={{
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                                whiteSpace: "pre-wrap",
                                overflowWrap: "anywhere",
                              }}
                              title={review.sellerResponse}
                            >
                              {review.sellerResponse}
                            </Typography>
                            {responseDateLabel && (
                              <Typography variant="caption" color="text.secondary" display="block" noWrap>
                                {responseDateLabel}
                              </Typography>
                            )}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Not responded yet
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <Chip
                          size="small"
                          label={hasResponse ? "Responded" : "Needs Reply"}
                          sx={{
                            ...pillStyle,
                            fontWeight: 800,
                            fontSize: 11,
                          }}
                        />
                      </TableCell>

                      <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                        <Button
                          variant="outlined"
                          onClick={() => setSelectedReviewId(review.id)}
                          sx={sellerTableButtonSx}
                        >
                          {hasResponse ? "Edit response" : "Respond"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog
        open={Boolean(selectedReview)}
        onClose={() => setSelectedReviewId(null)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="seller-review-response-dialog-title"
        PaperProps={{
          sx: {
            borderRadius: 3,
            bgcolor: "background.paper",
          },
        }}
      >
        {selectedReview && (
          <>
            <DialogTitle
              id="seller-review-response-dialog-title"
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
                pr: 1.5,
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                <RateReviewOutlinedIcon color="error" />
                <Typography variant="h6" fontWeight={800} noWrap sx={{ fontSize: 17 }}>
                  {selectedReview.sellerResponse ? "Edit response" : "Respond to review"}
                </Typography>
              </Stack>
              <IconButton
                aria-label="Close review response dialog"
                onClick={() => setSelectedReviewId(null)}
                size="small"
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <Stack spacing={1.5} sx={{ mb: 2 }}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ overflowWrap: "anywhere" }}>
                    {selectedReview.artworkTitle || "Artwork"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Reviewed by {selectedReview.reviewerName || "Buyer"}
                    {formatReviewDate(selectedReview.createdAt)
                      ? ` • ${formatReviewDate(selectedReview.createdAt)}`
                      : ""}
                  </Typography>
                </Box>
                <Rating
                  value={Number(selectedReview.rating) || 0}
                  readOnly
                  size="small"
                  aria-label={`${selectedReview.rating} out of 5 stars`}
                />
                <Typography
                  variant="body2"
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: "action.hover",
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                  }}
                >
                  {selectedReview.comment?.trim() || "No written comment provided."}
                </Typography>
              </Stack>

              <Divider sx={{ mb: 2 }} />

              <ReviewResponseForm
                key={selectedReview.id}
                review={selectedReview}
                onResponseSaved={onResponseSaved}
                onCancel={() => setSelectedReviewId(null)}
              />
            </DialogContent>
          </>
        )}
      </Dialog>
    </>
  );
}
