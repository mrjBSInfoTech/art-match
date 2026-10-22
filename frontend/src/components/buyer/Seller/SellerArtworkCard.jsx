import { Link as RouterLink } from "react-router-dom";
import { Box, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import WatermarkedArtworkImage from "../Artwork/WatermarkedArtworkImage";

function SellerArtworkImage({ artwork, background }) {
  return (
    <Box sx={{ width: "100%", aspectRatio: "4 / 3", bgcolor: background, display: "grid", placeItems: "center", overflow: "hidden" }}>
      {artwork?.image ? (
        <WatermarkedArtworkImage
          image={artwork.image}
          alt={artwork.title || "Artwork"}
          sx={{ width: "100%", height: "100%", minHeight: 0, objectFit: "contain", display: "block" }}
        />
      ) : (
        <Typography variant="body2" color="text.secondary">Image unavailable</Typography>
      )}
    </Box>
  );
}

const formatPrice = (value) =>
  `₱${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function SellerArtworkCard({ artwork, artistName, isPinned = false, colors }) {
  return (
    <Card
      component={RouterLink}
      to={`/buyer/artwork/view/${artwork.artwork_id}`}
      elevation={0}
      sx={{
        borderRadius: 3,
        overflow: "hidden",
        border: `1px solid ${colors.border}`,
        background: colors.cardAlt,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        textDecoration: "none",
        color: "inherit",
        transition: "box-shadow 160ms ease, border-color 160ms ease",
        "&:hover": { borderColor: colors.accent, boxShadow: 3 },
        "&:focus-visible": { outline: `2px solid ${colors.accent}`, outlineOffset: 3 },
        boxShadow: "none",
      }}
    >
      <Box sx={{ position: "relative" }}>
        {isPinned && (
          <Chip
            label="Pinned"
            size="small"
            color="primary"
            sx={{
              position: "absolute",
              top: 12,
              left: 12,
              zIndex: 1,
              fontWeight: 700,
              color:"#fff",
            }}
          />
        )}
        <SellerArtworkImage artwork={artwork} background={colors.card} />
      </Box>

      <CardContent sx={{ p: 2.25, flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Typography
          variant="h6"
          sx={{ fontWeight: 800, mb: 0.5, overflowWrap: "anywhere" }}
        >
          {artwork.title}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 1.5, overflowWrap: "anywhere" }}
        >
          {artistName}
          {artwork.genre ? ` · ${artwork.genre}` : ""}
        </Typography>
        {artwork.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
          >
            {artwork.description}
          </Typography>
        )}

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mt: "auto", gap: 1, flexWrap: "wrap", overflowWrap: "anywhere" }}
        >
          <Typography
            variant="h6"
            sx={{ fontWeight: 800, color: colors.accent }}
          >
            {formatPrice(artwork.price)}
          </Typography>
          {artwork.art_size && (
            <Typography variant="caption" color="text.secondary">
              {artwork.art_size}
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
