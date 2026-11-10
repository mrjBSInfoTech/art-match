import React from "react";
import {
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
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
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

export default function PromotionSlideReviewDialog({
  open,
  onClose,
  slideRequests = [],
  onReview,
  reviewingSlideId = null,
}) {
  const theme = useTheme();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      TransitionComponent={Transition}
      keepMounted
      fullWidth
      maxWidth={false}
      PaperProps={{
        sx: {
          width: "min(100% - 24px, 640px)",
          maxWidth: "640px",
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
          gap: 1,
          px: 2.5,
          py: 1.75,
          color: theme.palette.text.primary,
          fontSize: 16,
          fontWeight: 700,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <RateReviewOutlinedIcon sx={{ color: "#ef3340", fontSize: 20 }} />
        Student Promotion Requests
        <Chip
          size="small"
          label={slideRequests.length}
          color={slideRequests.length > 0 ? "error" : "default"}
          sx={{ height: 20, fontSize: 11, fontWeight: 700, ml: 0.5 }}
        />
        <Button
          aria-label="Close review dialog"
          onClick={onClose}
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
        {slideRequests.length === 0 ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              There are no pending promotion requests at this time.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={2}>
            {slideRequests.map((slide) => {
              const isReviewing = reviewingSlideId === slide.slide_id;

              return (
                <Card
                  key={`request-${slide.slide_id}`}
                  variant="outlined"
                  sx={{
                    borderRadius: 2.5,
                    overflow: "hidden",
                    borderColor: "divider",
                  }}
                >
                  <Stack direction={{ xs: "column", sm: "row" }}>
                    {slide.image_url && (
                      <Box
                        component="img"
                        src={slide.image_url}
                        alt={slide.title}
                        sx={{
                          display: "block",
                          width: { xs: "100%", sm: 200 },
                          height: { xs: 160, sm: "auto" },
                          minHeight: { sm: 160 },
                          objectFit: "cover",
                          bgcolor: "action.hover",
                        }}
                      />
                    )}

                    <CardContent sx={{ p: 2, flex: 1, display: "flex", flexDirection: "column" }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
                        <Chip
                          size="small"
                          label={`By ${slide.student_name || "Student"}`}
                          color="primary"
                          variant="outlined"
                          sx={{ height: 22, fontSize: 11, fontWeight: 700 }}
                        />
                        <Chip
                          size="small"
                          label={`Position ${slide.sort_order || 2}`}
                          sx={{ height: 22, fontSize: 11, fontWeight: 700 }}
                        />
                      </Stack>

                      <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.3 }}>
                        {slide.title}
                      </Typography>

                      {slide.description && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            fontSize: 12.5,
                            mt: 0.5,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {slide.description}
                        </Typography>
                      )}

                      {slide.button_label && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                          Button: <strong>{slide.button_label}</strong> ({slide.button_url || "No URL"})
                        </Typography>
                      )}

                      <Stack direction="row" spacing={1} sx={{ mt: "auto", pt: 1.5 }}>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<CheckCircleOutlinedIcon />}
                          disabled={isReviewing}
                          onClick={() => onReview(slide, "accept")}
                          sx={{ fontWeight: 700, borderRadius: 1.5, textTransform: "none" }}
                        >
                          Approve
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<CancelOutlinedIcon />}
                          disabled={isReviewing}
                          onClick={() => onReview(slide, "reject")}
                          sx={{ fontWeight: 700, borderRadius: 1.5, textTransform: "none" }}
                        >
                          Reject
                        </Button>
                      </Stack>
                    </CardContent>
                  </Stack>
                </Card>
              );
            })}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.75 }}>
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
