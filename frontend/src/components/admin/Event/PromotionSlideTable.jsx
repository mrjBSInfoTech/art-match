import React from "react";
import {
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

const safeAlpha = (color, opacity) =>
  typeof alpha === "function" ? alpha(color, opacity) : color;

export default function PromotionSlideTable({
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
  const isDark = theme?.palette?.mode === "dark";

  if (!slides || slides.length === 0) {
    return (
      <Paper
        variant="outlined"
        sx={{
          py: 5,
          px: 3,
          borderRadius: 3.5,
          textAlign: "center",
          border: "1px dashed",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Typography variant="body1" fontWeight={700} color="text.secondary">
          No promotion slides created yet.
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
          Add custom promotional slides to showcase exhibitions, sales, or featured collections.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 3.5,
        borderColor: "divider",
        overflow: "hidden",
        bgcolor: "background.paper",
      }}
    >
      <TableContainer sx={{ overflowX: "auto" }}>
        <Table size="small" aria-label="Promotion slides table" sx={{ minWidth: 850 }}>
          <TableHead>
            <TableRow
              sx={{
                "& th": {
                  bgcolor: isDark ? "background.paper" : "#f8fafc",
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
              <TableCell>Headline & Details</TableCell>
              <TableCell>Position</TableCell>
              <TableCell>Button & Link</TableCell>
              <TableCell>Creator</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {slides.map((slide) => {
              const isPublished = slide.status === "Published";
              const isStudent = Boolean(slide.student_id);
              const isPublishing = publishingSlideId === slide.slide_id;
              const isUnpublishing = unpublishingSlideId === slide.slide_id;

              return (
                <TableRow
                  key={slide.slide_id}
                  hover
                  sx={{
                    "& td": { py: 1.75, verticalAlign: "middle" },
                    "&:last-child td": { borderBottom: 0 },
                  }}
                >
                  {/* Headline & Details (No image per instructions) */}
                  <TableCell sx={{ minWidth: 220, maxWidth: 340 }}>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 700, color: "text.primary" }}
                    >
                      {slide.title}
                    </Typography>
                    {slide.description && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: "-webkit-box",
                          WebkitLineClamp: 1,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          mt: 0.25,
                        }}
                      >
                        {slide.description}
                      </Typography>
                    )}
                  </TableCell>

                  {/* Position */}
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    <Chip
                      size="small"
                      label={`Position ${slide.sort_order}`}
                      sx={{ fontWeight: 700, fontSize: 11 }}
                    />
                  </TableCell>

                  {/* Button & Link */}
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    {slide.button_label ? (
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {slide.button_label}
                        </Typography>
                        {slide.button_url && (
                          <Typography variant="caption" color="text.secondary">
                            {slide.button_url}
                          </Typography>
                        )}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        —
                      </Typography>
                    )}
                  </TableCell>

                  {/* Creator */}
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {isStudent ? slide.student_name || "Student" : "Admin"}
                    </Typography>
                  </TableCell>

                  {/* Status */}
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    <Chip
                      size="small"
                      label={slide.status}
                      color={isPublished ? "success" : "default"}
                      sx={{ fontWeight: 700, fontSize: 11 }}
                    />
                  </TableCell>

                  {/* Actions */}
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                    <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
                      {canEdit && (
                        <Button
                          size="small"
                          variant={isPublished ? "outlined" : "contained"}
                          color={isPublished ? "inherit" : "primary"}
                          disabled={isPublishing || isUnpublishing}
                          onClick={() => (isPublished ? onUnpublish(slide) : onPublish(slide))}
                          sx={{
                            fontSize: 11,
                            fontWeight: 700,
                            borderRadius: 1.5,
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
                            : "Publish"}
                        </Button>
                      )}

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
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

