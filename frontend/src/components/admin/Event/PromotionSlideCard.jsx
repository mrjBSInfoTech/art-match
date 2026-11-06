import React from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PublishOutlinedIcon from "@mui/icons-material/PublishOutlined";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";

const safeAlpha = (color, opacity) =>
  typeof alpha === "function" ? alpha(color, opacity) : color;

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

  if (!slides || slides.length === 0) {
    return null;
  }

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          sm: "repeat(2, minmax(0, 1fr))",
          lg: "repeat(3, minmax(0, 1fr))",
        },
        gap: 2.5,
      }}
    >
      {slides.map((slide) => {
        const isPublished = slide.status === "Published";
        const isStudent = Boolean(slide.student_id);
        const isPublishing = publishingSlideId === slide.slide_id;
        const isUnpublishing = unpublishingSlideId === slide.slide_id;

        return (
          <Card
            key={slide.slide_id}
            elevation={0}
            sx={{
              borderRadius: 3.5,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              transition: "all 180ms cubic-bezier(0.4, 0, 0.2, 1)",
              "&:hover": {
                boxShadow: "0 12px 28px rgba(15, 23, 42, 0.08)",
                borderColor: "primary.light",
                transform: "translateY(-1px)",
              },
            }}
          >
            {/* Slide Cover Image */}
            <Box sx={{ position: "relative", width: "100%", height: 190, bgcolor: "background.default" }}>
              {slide.image_url ? (
                <Box
                  component="img"
                  src={slide.image_url}
                  alt={slide.title}
                  sx={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              ) : (
                <Box
                  sx={{
                    width: "100%",
                    height: "100%",
                    display: "grid",
                    placeItems: "center",
                    color: "text.secondary",
                  }}
                >
                  <Typography variant="caption">No image available</Typography>
                </Box>
              )}

              {/* Floating Position and Status Badges */}
              <Box
                sx={{
                  position: "absolute",
                  top: 10,
                  left: 10,
                  display: "flex",
                  gap: 0.75,
                  flexWrap: "wrap",
                }}
              >
                <Chip
                  size="small"
                  label={`Position ${slide.sort_order}`}
                  sx={{
                    bgcolor: "rgba(15, 23, 42, 0.75)",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 10.5,
                    backdropFilter: "blur(4px)",
                  }}
                />
                <Chip
                  size="small"
                  label={slide.status}
                  color={isPublished ? "success" : "default"}
                  sx={{
                    fontWeight: 700,
                    fontSize: 10.5,
                    backdropFilter: "blur(4px)",
                    ...(isPublished
                      ? { bgcolor: "rgba(22, 163, 74, 0.9)", color: "#fff" }
                      : { bgcolor: "rgba(100, 116, 139, 0.8)", color: "#fff" }),
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
                    bgcolor: "rgba(15, 23, 42, 0.75)",
                    color: "#fff",
                    fontSize: 10,
                    backdropFilter: "blur(4px)",
                  }}
                />
              )}
            </Box>

            {/* Card Content */}
            <CardContent sx={{ p: 2, flex: 1, display: "flex", flexDirection: "column" }}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 800,
                  color: "text.primary",
                  lineHeight: 1.3,
                  mb: 0.75,
                }}
              >
                {slide.title}
              </Typography>

              {slide.description && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    fontSize: 12.5,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    mb: 1.5,
                    flex: 1,
                  }}
                >
                  {slide.description}
                </Typography>
              )}

              {/* Action Button Link Preview */}
              {slide.button_label && (
                <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1.5 }}>
                  <LinkOutlinedIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                  <Typography variant="caption" sx={{ fontWeight: 600, color: "primary.main" }}>
                    {slide.button_label}
                  </Typography>
                  {slide.button_url && (
                    <Typography variant="caption" color="text.secondary">
                      ({slide.button_url})
                    </Typography>
                  )}
                </Stack>
              )}

              {/* Card Action Buttons */}
              <Box
                sx={{
                  pt: 1.5,
                  mt: "auto",
                  borderTop: "1px solid",
                  borderColor: "divider",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                {canEdit && (
                  <Button
                    size="small"
                    variant={isPublished ? "outlined" : "contained"}
                    color={isPublished ? "inherit" : "primary"}
                    disabled={isPublishing || isUnpublishing}
                    onClick={() => (isPublished ? onUnpublish(slide) : onPublish(slide))}
                    sx={{
                      fontSize: 11.5,
                      fontWeight: 700,
                      borderRadius: 2,
                      textTransform: "none",
                      color: isPublished ? "text.primary" : "#fff",
                    }}
                  >
                    {isPublishing
                      ? "Publishing..."
                      : isUnpublishing
                      ? "Unpublishing..."
                      : isPublished
                      ? "Unpublish"
                      : "Publish to Buyer"}
                  </Button>
                )}

                <Stack direction="row" spacing={0.5} sx={{ ml: "auto" }}>
                  {canEdit && (
                    <Tooltip title="Edit Slide">
                      <IconButton
                        size="small"
                        onClick={() => onEdit(slide)}
                        sx={{ color: "text.secondary", "&:hover": { color: "primary.main" } }}
                      >
                        <EditOutlinedIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                  {canDelete && (
                    <Tooltip title="Delete Slide">
                      <IconButton
                        size="small"
                        onClick={() => onDelete(slide)}
                        sx={{ color: "text.secondary", "&:hover": { color: "error.main" } }}
                      >
                        <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
              </Box>
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
}

