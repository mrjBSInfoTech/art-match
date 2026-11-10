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
import PromotionSlideInfo from "../../admin/Event/PromotionSlideInfo";

const getStatusDetails = (slide) => {
  if (slide.review_status === "pending") {
    return "PENDING";
  }
  if (slide.review_status === "rejected") {
    return "REJECTED";
  }
  if (slide.review_status === "accepted") {
    if (Number(slide.is_currently_published) === 1) {
      return "PUBLISHED";
    }
    return "ENDED";
  }
  return "DRAFT";
};

export default function PromotionHeaderCard({
  slide,
  canEdit,
  busy,
  onEdit,
  onRequestReview,
  onWithdrawRequest,
  onDelete,
}) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const statusLabel = getStatusDetails(slide);
  const isPublished =
    slide.review_status === "accepted" &&
    Number(slide.is_currently_published) === 1;
  const hasActions = canEdit || slide.review_status === "pending";
  const infoSlide = { ...slide, student_name: "Seller" };

  const handleAction = (action) => {
    setAnchorEl(null);
    action?.();
  };

  return (
    <>
      <Card
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
              label={statusLabel}
              sx={{
                height: 22,
                borderRadius: 2,
                backgroundColor: isPublished
                  ? theme.palette.success.main
                  : theme.palette.action.selected,
                color: "#fff",
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
                onClick={(event) => setAnchorEl(event.currentTarget)}
                sx={{
                  ml: "auto",
                  flexShrink: 0,
                  "&:hover": { backgroundColor: "action.hover" },
                }}
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
            onClick={() => setInfoOpen(true)}
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
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
          >
            {canEdit && (
              <MenuItem
                onClick={() => handleAction(onEdit)}
                sx={{ color: "success.main" }}
              >
                <EditOutlinedIcon sx={{ mr: 1, fontSize: 20 }} />
                Edit
              </MenuItem>
            )}
            {canEdit && (
              <MenuItem
                disabled={busy}
                onClick={() => handleAction(onRequestReview)}
                sx={{ color: "warning.main" }}
              >
                <PublishOutlinedIcon sx={{ mr: 1, fontSize: 20 }} />
                {busy ? "Submitting..." : "Request publish"}
              </MenuItem>
            )}
            {slide.review_status === "pending" && (
              <MenuItem
                disabled={busy}
                onClick={() => handleAction(onWithdrawRequest)}
                sx={{ color: "warning.main" }}
              >
                <PublishOutlinedIcon sx={{ mr: 1, fontSize: 20 }} />
                {busy ? "Withdrawing..." : "Withdraw request"}
              </MenuItem>
            )}
            {canEdit && (
              <MenuItem
                disabled={busy}
                onClick={() => handleAction(onDelete)}
                sx={{ color: "error.main" }}
              >
                <DeleteOutlineIcon sx={{ mr: 1, fontSize: 20 }} />
                Delete
              </MenuItem>
            )}
          </Menu>
        </CardContent>
      </Card>

      <PromotionSlideInfo
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        selectedSlide={infoSlide}
      />
    </>
  );
}
