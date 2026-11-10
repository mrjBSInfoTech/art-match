import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PublishOutlinedIcon from "@mui/icons-material/PublishOutlined";
import PromotionSlideInfo from "./PromotionSlideInfo";

export default function PromotionSlideCard({
  slides = [],
  canEdit = true,
  canDelete = true,
  onEdit,
  onDelete,
  onPublish,
  onUnpublish,
  publishingSlideId = null,
  unpublishingSlideId = null,
}) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedSlide, setSelectedSlide] = useState(null);
  const [infoOpen, setInfoOpen] = useState(false);

  const handleMenuOpen = (event, slide) => {
    setAnchorEl(event.currentTarget);
    setSelectedSlide(slide);
  };

  const handleMenuClose = () => setAnchorEl(null);

  const handleInfoOpen = (slide) => {
    setSelectedSlide(slide);
    setInfoOpen(true);
  };

  if (!slides.length) return null;

  return (
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
      }}
    >
      {slides.map((slide) => {
        const isPublished = slide.status === "Published";
        const isStudent = Boolean(slide.student_id);
        const isPublishing = publishingSlideId === slide.slide_id;
        const isUnpublishing = unpublishingSlideId === slide.slide_id;
        const hasActions = canEdit || canDelete;

        return (
          <Card
            key={slide.slide_id}
            sx={{
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2.5,
              boxShadow: "none",
              transition: "border-color 0.2s, box-shadow 0.2s",
              "&:hover": {
                borderColor: "text.secondary",
                boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
              },
            }}
          >
            <Box
              sx={{
                width: "100%",
                aspectRatio: "5 / 4",
                position: "relative",
                backgroundColor: theme.palette.background.default,
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {slide.image_url ? (
                <Box
                  component="img"
                  src={slide.image_url}
                  alt={slide.title || "Promotion slide"}
                  sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <Typography variant="caption" color="text.secondary">
                  No image available
                </Typography>
              )}
              <Box
                sx={{
                  position: "absolute",
                  top: 10,
                  left: 10,
                  right: 10,
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 0.75,
                }}
              >
                <Chip
                  size="small"
                  label={`Position ${slide.sort_order ?? "—"}`}
                  sx={{
                    height: 22,
                    borderRadius: 2,
                    backgroundColor: theme.palette.background.paper,
                    color: theme.palette.text.secondary,
                    fontSize: 10,
                    fontWeight: 700,
                    boxShadow: "0 1px 4px rgba(15, 23, 42, 0.14)",
                  }}
                />
                <Chip
                  size="small"
                  label={(slide.status || "Draft").toUpperCase()}
                  sx={{
                    height: 22,
                    borderRadius: 2,
                    backgroundColor: isPublished
                      ? theme.palette.success.main
                      : theme.palette.action.selected,
                    color:"#fff",
                    border: `1px solid ${
                      isPublished
                        ? theme.palette.success.main
                        : theme.palette.divider
                    }`,
                    fontSize: 10,
                    fontWeight: 700,
                    boxShadow: "0 1px 4px rgba(15, 23, 42, 0.14)",
                  }}
                />
              </Box>
              {isStudent && (
                <Chip
                  size="small"
                  label={`By ${slide.student_name || "Student"}`}
                  sx={{
                    position: "absolute",
                    bottom: 10,
                    left: 10,
                    maxWidth: "calc(100% - 20px)",
                    height: 22,
                    backgroundColor: "rgba(15, 23, 42, 0.78)",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 700,
                    "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" },
                  }}
                />
              )}
            </Box>

            <CardContent
              sx={{
                p: 2,
                "&:last-child": { pb: 2 },
                flex: 1,
                minHeight: 150,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  mb: 1,
                  minWidth: 0,
                  gap: 1,
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      color: theme.palette.text.primary,
                      fontWeight: 700,
                      lineHeight: 1.25,
                    }}
                    noWrap
                    title={slide.title}
                  >
                    {slide.title || "Untitled promotion"}
                  </Typography>
                  {slide.button_label && (
                    <Typography
                      variant="caption"
                      sx={{
                        display: "block",
                        mt: 1.25,
                        color: theme.palette.error.main,
                        fontWeight: 700,
                      }}
                      noWrap
                      title={slide.button_label}
                    >
                      {slide.button_label}
                    </Typography>
                  )}
                </Box>
                {hasActions && (
                  <IconButton
                    size="small"
                    aria-label={`Actions for ${slide.title || "promotion slide"}`}
                    onClick={(event) => handleMenuOpen(event, slide)}
                    sx={{ ml: "auto", flexShrink: 0, "&:hover": { backgroundColor: "action.hover" } }}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>

              <Button
                variant="contained"
                size="small"
                fullWidth
                startIcon={<VisibilityOutlinedIcon sx={{ fontSize: 15 }} />}
                onClick={() => handleInfoOpen(slide)}
                sx={{
                  mt: "auto",
                  minHeight: 40,
                  py: 0.55,
                  backgroundColor:
                    theme.palette.mode === "dark" ? "#1e293b" : "#f1f5f9",
                  color: theme.palette.text.primary,
                  border: `1px solid ${theme.palette.divider}`,
                  boxShadow: "none",
                  fontSize: 11,
                  textTransform: "none",
                  "& .MuiButton-startIcon": { color: theme.palette.error.main },
                  "&:hover": {
                    backgroundColor: theme.palette.action.hover,
                    borderColor: theme.palette.text.secondary,
                    boxShadow: "none",
                  },
                }}
              >
                View Information
              </Button>

              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl) && selectedSlide?.slide_id === slide.slide_id}
                onClose={handleMenuClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
              >
                {canEdit && (
                  <MenuItem
                    onClick={() => {
                      onEdit?.(selectedSlide);
                      handleMenuClose();
                    }}
                    sx={{ color: "success.main" }}
                  >
                    <EditOutlinedIcon sx={{ mr: 1, fontSize: 20 }} />
                    Edit
                  </MenuItem>
                )}
                {canEdit && (
                  <MenuItem
                    disabled={isPublishing || isUnpublishing}
                    onClick={() => {
                      (isPublished ? onUnpublish : onPublish)?.(selectedSlide);
                      handleMenuClose();
                    }}
                    sx={{ color: "warning.main" }}
                  >
                    <PublishOutlinedIcon sx={{ mr: 1, fontSize: 20 }} />
                    {isPublishing
                      ? "Publishing..."
                      : isUnpublishing
                        ? "Unpublishing..."
                        : isPublished
                          ? "Unpublish"
                          : "Publish to Buyer"}
                  </MenuItem>
                )}
                {canDelete && (
                  <MenuItem
                    onClick={() => {
                      onDelete?.(selectedSlide);
                      handleMenuClose();
                    }}
                    sx={{ color: "error.main" }}
                  >
                    <DeleteOutlineIcon sx={{ mr: 1, fontSize: 20 }} />
                    Delete
                  </MenuItem>
                )}
              </Menu>
            </CardContent>
          </Card>
        );
      })}

      <PromotionSlideInfo
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        selectedSlide={selectedSlide}
      />
    </Box>
  );
}
