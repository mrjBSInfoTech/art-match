import { useState } from "react";
import { Box, Button, Card, CardContent, Chip, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import StorefrontInfo from "../Storefront/StorefrontInfo";

const getArtworkImage = (image) => {
  if (!image) return "";
  if (/^https?:\/\//i.test(image)) return image;
  if (image.startsWith("/")) return `http://localhost:5000${image}`;
  return `http://localhost:5000/uploads/seller/uploadArtwork/${encodeURIComponent(image)}`;
};

export default function ProfileCard({ artwork, isPinned = false }) {
  const theme = useTheme();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [failedImage, setFailedImage] = useState("");
  const image = getArtworkImage(artwork.image || artwork.image_url);
  const status = String(artwork.request_status || artwork.status || "Unverified").trim();
  const statusColor = ["verified", "approved"].includes(status.toLowerCase())
    ? "success"
    : status.toLowerCase() === "rejected" ? "error"
      : ["pending", "requested"].includes(status.toLowerCase())
        ? "warning" : "default";

  return (
    <>
      <Card sx={{
        height: "100%", minWidth: 0, display: "flex", flexDirection: "column",
        overflow: "hidden", border: "1px solid", borderColor: isPinned ? "primary.main" : "divider",
        borderRadius: 2.5, boxShadow: "none",
        transition: "border-color 0.2s, box-shadow 0.2s",
        "&:hover": { borderColor: "text.secondary", boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)" },
      }}>
        <Box sx={{
          aspectRatio: "5 / 4", position: "relative", overflow: "hidden",
          bgcolor: "background.default", display: "grid", placeItems: "center",
        }}>
          {image && failedImage !== image ? (
            <Box component="img" src={image} alt={artwork.title || "Artwork"}
              onError={() => setFailedImage(image)}
              sx={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} />
          ) : (
            <Typography variant="body2" color="text.secondary">No image available</Typography>
          )}
          {isPinned && <Chip label="PINNED" size="small" color="primary" sx={{
            position: "absolute", left: 10, bottom: 10,
            fontSize: 10, fontWeight: 700, color: "#fff",
          }} />}
          <Chip label={status.toUpperCase()} color={statusColor} size="small" sx={{
            position: "absolute", top: 10, right: 10,
            maxWidth: "calc(100% - 20px)", height: 22, fontSize: 10, fontWeight: 700,
            bgcolor: "#fff",
            color: statusColor === "success" ? "#2e7d32"
              : statusColor === "error" ? "#d32f2f"
                : statusColor === "warning" ? "#8a4b00" : "#475569",
          }} />
        </Box>
        <CardContent sx={{ p: 2, "&:last-child": { pb: 2 }, flex: 1,
          display: "flex", flexDirection: "column", gap: 1.25 }}>
          <Typography variant="subtitle2" title={artwork.title} noWrap sx={{ fontWeight: 700, lineHeight: 1.25 }}>
            {artwork.title || "Untitled artwork"}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {artwork.genre || "General"}
          </Typography>
          <Typography variant="caption" sx={{ color: "#ff5a5f", fontWeight: 700 }}>
            {new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(Number(artwork.price) || 0)}
          </Typography>
          <Button variant="contained" size="small" fullWidth
            startIcon={<VisibilityOutlinedIcon />}
            onClick={() => setDetailsOpen(true)} sx={{
              mt: "auto", py: 0.55, bgcolor: theme.palette.mode === "dark" ? "#1e293b" : "#f1f5f9",
              color: "text.primary", border: "1px solid", borderColor: "divider", boxShadow: "none", fontSize: 11,
              "& .MuiButton-startIcon": { color: "error.main" },
              "&:hover": { bgcolor: "action.hover", borderColor: "text.secondary", boxShadow: "none" },
            }}>
            View Details
          </Button>
        </CardContent>
      </Card>
      {detailsOpen && <StorefrontInfo open handleClose={() => setDetailsOpen(false)} selectedArtwork={artwork} />}
    </>
  );
}
