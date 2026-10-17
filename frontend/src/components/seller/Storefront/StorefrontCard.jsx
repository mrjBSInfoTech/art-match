import { useState } from "react";
import { Box, Button, Card, CardContent, CardMedia, Chip, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import PushPinOutlinedIcon from "@mui/icons-material/PushPinOutlined";
import StorefrontInfo from "./StorefrontInfo";

const placeholder = "https://placehold.co/1200x900/111827/ffffff?text=Artwork";
const formatCurrency = (value) => new Intl.NumberFormat("en-PH", {
  style: "currency", currency: "PHP", maximumFractionDigits: 0,
}).format(Number(value || 0));

function imageUrl(artwork) {
  const image = artwork.image || artwork.image_url;
  if (!image) return placeholder;
  return /^https?:\/\//i.test(image)
    ? image
    : `http://localhost:5000/uploads/seller/uploadArtwork/${encodeURIComponent(image)}`;
}

export default function StorefrontCard({ artworks, pinnedArtworkIds, savingPinId, onPinToggle }) {
  const theme = useTheme();
  const [selectedArtwork, setSelectedArtwork] = useState(null);

  return (
    <>
      <Box sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))", lg: "repeat(5, minmax(0, 1fr))" },
        gap: 2,
      }}>
        {artworks.map((artwork) => {
          const id = String(artwork.artwork_id ?? artwork.id);
          const pinned = pinnedArtworkIds.some((pinnedId) => String(pinnedId) === id);
          const status = String(artwork.request_status || artwork.status || "Unverified").trim();
          const statusColor = ["verified", "approved"].includes(status.toLowerCase())
            ? "success" : status.toLowerCase() === "rejected" ? "error"
              : ["pending", "requested"].includes(status.toLowerCase()) ? "warning" : "default";
          const saving = savingPinId !== null && String(savingPinId) === id;
          return (
            <Card key={id} sx={{
              overflow: "hidden", display: "flex", flexDirection: "column",
              border: "1px solid", borderColor: pinned ? "primary.main" : "divider",
              borderRadius: 2.5, boxShadow: "none", minWidth: 0,
              transition: "border-color 0.2s, box-shadow 0.2s",
              "&:hover": { borderColor: "text.secondary", boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)" },
            }}>
              <Box sx={{ position: "relative", aspectRatio: "5 / 4", overflow: "hidden", bgcolor: "background.default" }}>
                <CardMedia component="img" image={imageUrl(artwork)} alt={artwork.title || "Artwork"}
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    if (event.currentTarget.src !== placeholder) event.currentTarget.src = placeholder;
                  }}
                  sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <Chip label={status.toUpperCase()} color={statusColor} size="small"
                  sx={{
                    position: "absolute", top: 10, right: 10, height: 22, fontSize: 10, fontWeight: 700,
                    bgcolor: "#fff",
                    color: statusColor === "success" ? "#2e7d32"
                      : statusColor === "error" ? "#d32f2f"
                        : statusColor === "warning" ? "#8a4b00" : "#475569",
                  }} />
                {pinned && <Chip label="PINNED" size="small" color="primary"
                  sx={{ position: "absolute", left: 10, bottom: 10, fontSize: 10, fontWeight: 700, color: "#fff" }} />}
              </Box>
              <CardContent sx={{ p: 2, "&:last-child": { pb: 2 }, flex: 1, display: "flex", flexDirection: "column", gap: 1.25 }}>
                <Typography variant="subtitle2" title={artwork.title} noWrap sx={{ fontWeight: 700, lineHeight: 1.25 }}>
                  {artwork.title || "Untitled artwork"}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>{artwork.genre || "General"}</Typography>
                <Typography variant="caption" sx={{ color: "#ff5a5f", fontWeight: 700 }}>
                  {formatCurrency(artwork.price)}
                </Typography>
                <Button variant="contained" size="small" fullWidth startIcon={<VisibilityOutlinedIcon />}
                  onClick={() => setSelectedArtwork(artwork)} sx={{
                    mt: "auto", py: 0.55, fontSize: 11, boxShadow: "none",
                    bgcolor: theme.palette.mode === "dark" ? "#1e293b" : "#f1f5f9",
                    color: "text.primary", border: "1px solid", borderColor: "divider",
                    "& .MuiButton-startIcon": { color: "error.main" },
                    "&:hover": { bgcolor: "action.hover", boxShadow: "none", borderColor: "text.secondary" },
                  }}>
                  View Details
                </Button>
                <Button fullWidth size="small" variant={pinned ? "contained" : "outlined"}
                  startIcon={<PushPinOutlinedIcon />} disabled={savingPinId !== null}
                  aria-pressed={pinned} onClick={() => onPinToggle(id)}
                  sx={{ fontSize: 11, fontWeight: 700, ...(pinned && { color: "#f1f5f9" }) }}>
                  {saving ? "Saving..." : pinned ? "Unpin artwork" : "Pin to storefront"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </Box>
      <StorefrontInfo open={Boolean(selectedArtwork)} selectedArtwork={selectedArtwork}
        handleClose={() => setSelectedArtwork(null)} />
    </>
  );
}
