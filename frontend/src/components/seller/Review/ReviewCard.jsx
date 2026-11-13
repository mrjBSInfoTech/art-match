import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Rating,
  Stack,
  Typography,
} from "@mui/material";
import ReviewResponseForm from "./ReviewResponseForm";
import { formatReviewDate } from "./reviewPresentation";

export default function ReviewCard({ review, onResponseSaved }) {
  const [editing, setEditing] = useState(false);

  const dateLabel = formatReviewDate(review.createdAt);
  const responseDateLabel = formatReviewDate(review.sellerResponseAt);

  return (
    <Card
      component="article"
      variant="outlined"
      sx={{
        borderRadius: 3,
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <CardContent sx={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          spacing={1}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="subtitle1"
              fontWeight={700}
              sx={{ overflowWrap: "anywhere" }}
            >
              {review.artworkTitle || "Artwork"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Reviewed by {review.reviewerName || "Buyer"}
            </Typography>
          </Box>
          {dateLabel && (
            <Typography
              component="time"
              dateTime={new Date(review.createdAt).toISOString()}
              variant="caption"
              color="text.secondary"
              sx={{ flexShrink: 0 }}
            >
              {dateLabel}
            </Typography>
          )}
        </Stack>

        <Rating
          value={Number(review.rating) || 0}
          readOnly
          size="small"
          aria-label={`${review.rating} out of 5 stars`}
          sx={{ mt: 1 }}
        />

        <Divider sx={{ my: 1.5 }} />

        <Typography
          variant="body2"
          sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
        >
          {review.comment?.trim() || "No written comment provided."}
        </Typography>

        {review.sellerResponse && !editing && (
          <Box
            sx={{
              mt: 2,
              p: 1.5,
              borderRadius: 2,
              bgcolor: "action.hover",
              borderLeft: "3px solid",
              borderColor: "primary.main",
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              spacing={1}
              flexWrap="wrap"
            >
              <Typography variant="subtitle2" fontWeight={700}>
                Your response
              </Typography>
              {responseDateLabel && (
                <Typography
                  component="time"
                  dateTime={new Date(review.sellerResponseAt).toISOString()}
                  variant="caption"
                  color="text.secondary"
                >
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

        <Box sx={{ mt: "auto", pt: 1.5 }}>
          {editing ? (
            <Box sx={{ mt: 0.5 }}>
              <ReviewResponseForm
                review={review}
                onResponseSaved={onResponseSaved}
                onCancel={() => setEditing(false)}
              />
            </Box>
          ) : (
            <Button
              size="small"
              onClick={() => setEditing(true)}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              {review.sellerResponse ? "Edit response" : "Respond to review"}
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
