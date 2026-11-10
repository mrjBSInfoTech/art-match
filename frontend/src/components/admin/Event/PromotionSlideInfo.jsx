import React from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Slide,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import ViewCarouselOutlinedIcon from "@mui/icons-material/ViewCarouselOutlined";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function PromotionSlideInfo({
  open,
  onClose,
  selectedSlide,
}) {
  const theme = useTheme();
  const slide = selectedSlide;
  const isPublished = slide?.status === "Published";

  const detailLabelSx = {
    display: "block",
    color: theme.palette.text.secondary,
    fontSize: 11,
    lineHeight: 1.2,
    mb: 0.35,
  };

  const detailValueSx = {
    color: theme.palette.text.primary,
    fontSize: 12,
    fontWeight: 600,
    lineHeight: 1.35,
    overflowWrap: "anywhere",
    whiteSpace: "pre-wrap",
  };

  const renderDetail = (label, value, sx = {}) => (
    <Box sx={sx}>
      <Typography sx={detailLabelSx}>{label}</Typography>
      <Typography sx={detailValueSx}>
        {value === null || value === undefined || value === ""
          ? "Not provided"
          : value}
      </Typography>
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      TransitionComponent={Transition}
      keepMounted
      fullWidth
      maxWidth={false}
      aria-labelledby="promotion-slide-info-title"
      PaperProps={{
        sx: {
          width: "min(100% - 24px, 520px)",
          maxWidth: "520px",
          maxHeight: "calc(100% - 32px)",
          borderRadius: 3,
          overflow: "hidden",
          backgroundColor: theme.palette.background.paper,
        },
      }}
    >
      <DialogTitle
        id="promotion-slide-info-title"
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
        <ViewCarouselOutlinedIcon sx={{ color: theme.palette.error.main, fontSize: 20 }} />
        Promotion Slide Information
        <Button
          aria-label="Close promotion slide information"
          onClick={onClose}
          sx={{
            minWidth: 44,
            width: 44,
            height: 44,
            ml: "auto",
            p: 0,
            color: theme.palette.text.secondary,
          }}
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </Button>
      </DialogTitle>

      <DialogContent dividers sx={{ overflowY: "auto" }}>
        {slide ? (
          <Box>
            <Box
              sx={{
                position: "relative",
                width: "100%",
                aspectRatio: "16 / 7",
                overflow: "hidden",
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                backgroundColor: theme.palette.background.default,
                mt: 1.5,
                display: "grid",
                placeItems: "center",
              }}
            >
              {slide.image_url ? (
                <Box
                  component="img"
                  src={slide.image_url}
                  alt={slide.title || "Promotion slide preview"}
                  sx={{
                    width: "100%",
                    height: "100%",
                    display: "block",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <Typography color="text.secondary" variant="body2">
                  No image available
                </Typography>
              )}
              <Chip
                label={(slide.status || "Draft").toUpperCase()}
                size="small"
                sx={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  height: 22,
                  backgroundColor: isPublished
                    ? theme.palette.success.main
                    : theme.palette.action.selected,
                  color: isPublished
                    ? theme.palette.success.contrastText
                    : theme.palette.text.secondary,
                  border: `1px solid ${
                    isPublished
                      ? theme.palette.success.main
                      : theme.palette.divider
                  }`,
                  fontSize: 10,
                  fontWeight: 700,
                  boxShadow: "0 1px 4px rgba(15, 23, 42, 0.16)",
                }}
              />
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 1.5,
                mt: 1.75,
                p: 1.5,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
                backgroundColor: theme.palette.background.default,
              }}
            >
              {renderDetail("Headline", slide.title)}
              {renderDetail("Position", slide.sort_order)}
              {renderDetail("Status", slide.status || "Draft")}
              {renderDetail(
                "Created by",
                slide.student_id ? slide.student_name || "Student" : "Admin",
              )}
              {slide.student_number &&
                renderDetail("Student number", slide.student_number)}
              {renderDetail("Button label", slide.button_label)}
              {renderDetail("Button URL", slide.button_url, {
                gridColumn: { xs: "auto", sm: "1 / -1" },
              })}
              {renderDetail("Description", slide.description, {
                gridColumn: { xs: "auto", sm: "1 / -1" },
              })}
              {slide.review_status &&
                renderDetail("Review status", slide.review_status)}
              {slide.created_at &&
                renderDetail(
                  "Created",
                  Number.isNaN(new Date(slide.created_at).getTime())
                    ? "Not provided"
                    : new Date(slide.created_at).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      }),
                )}
            </Box>
          </Box>
        ) : (
          <Typography sx={{ color: theme.palette.text.secondary, py: 2 }}>
            No promotion slide selected.
          </Typography>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          justifyContent: "flex-end",
          gap: 1,
          px: 2.5,
          py: 1.5,
          borderTop: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Button
          onClick={onClose}
          sx={{
            minHeight: 44,
            backgroundColor: theme.palette.action.hover,
            color: theme.palette.text.primary,
            fontSize: 11,
            fontWeight: 600,
            "&:hover": { backgroundColor: theme.palette.action.selected },
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
