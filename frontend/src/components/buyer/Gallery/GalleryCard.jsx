import {
  Box,
  IconButton,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import WatermarkedArtworkImage from "../Artwork/WatermarkedArtworkImage";

export default function GalleryCard({
  artwork,
  onOpen,
  isFavorite,
  onToggleFavorite,
}) {
  const theme = useTheme();
  const darkMode = theme.palette.mode === "dark";
  const hasImage = Boolean(artwork?.image);
  const status = String(artwork?.status || "").toLowerCase();
  const soldOut = Number(artwork?.is_sold_out) === 1;
  const badge = soldOut
    ? "Sold out"
    : status === "available" || status === "for sale"
      ? "For Sale"
      : artwork?.genre || "Artwork";
  const rating = Number(artwork?.average_rating ?? artwork?.rating);
  const ratingCount = Number(artwork?.rating_count ?? artwork?.total_reviews);
  const artworkId = artwork?.artwork_id || artwork?.id;

  if (!artwork) return null;

  return (
    <Box
      sx={{
        minWidth: 0,
        overflow: "hidden",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        backgroundColor: "background.paper",
        transition: "transform 180ms ease, box-shadow 180ms ease",
        "&:focus-within": {
          outline: "2px solid",
          outlineColor: "primary.main",
          outlineOffset: 2,
        },
        "@media (hover: hover)": {
          "&:hover": {
            transform: "translateY(-2px)",
            boxShadow: darkMode
              ? "0 8px 24px rgba(0, 0, 0, 0.42)"
              : "0 8px 20px rgba(68, 41, 15, 0.07)",
          },
        },
        "@media (prefers-reduced-motion: reduce)": {
          transition: "none",
        },
      }}
    >
      <Box
        component="button"
        type="button"
        onClick={() => onOpen(artworkId)}
        aria-label={`View ${artwork.title || "artwork"}`}
        sx={{
          position: "relative",
          display: "flex",
          width: "100%",
          aspectRatio: "1.2 / 1",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          border: 0,
          p: 0,
          backgroundColor: darkMode ? "#1e293b" : "#eeeae4",
          backgroundPosition: "center",
          backgroundSize: "cover",
          cursor: "pointer",
        }}
      >
        <WatermarkedArtworkImage
          image={artwork.image}
          alt={artwork.title || "Artwork"}
          sx={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            pointerEvents: "none",
          }}
        />
        {!hasImage && (
          <ImageOutlinedIcon
            sx={{
              color: darkMode ? "text.secondary" : "#d2c8bb",
              fontSize: 38,
            }}
          />
        )}
        <Typography
          component="span"
          sx={{
            position: "absolute",
            top: 7,
            left: 7,
            maxWidth: "calc(100% - 52px)",
            overflow: "hidden",
            px: 1,
            py: 0.5,
            borderRadius: 999,
            backgroundColor: soldOut ? "text.secondary" : "error.main",
            color: "#fff",
            fontSize: 11,
            fontWeight: 800,
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {badge}
        </Typography>
      </Box>

      <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
        <Stack
          direction="row"
          alignItems="flex-start"
          justifyContent="space-between"
          gap={1}
        >
          <Typography
            component="button"
            type="button"
            onClick={() => onOpen(artworkId)}
            title={artwork.title || "Untitled artwork"}
            sx={{
              minWidth: 0,
              border: 0,
              p: 0,
              background: "none",
              color: "text.primary",
              font: "inherit",
              fontSize: { xs: 14, sm: 15 },
              fontWeight: 800,
              lineHeight: 1.35,
              textAlign: "left",
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 2,
              overflow: "hidden",
              cursor: "pointer",
              "&:focus-visible": {
                outline: "2px solid",
                outlineColor: "primary.main",
                outlineOffset: 3,
              },
            }}
          >
            {artwork.title || "Untitled artwork"}
          </Typography>
          {Number.isFinite(rating) && rating > 0 && (
            <Typography
              variant="caption"
              sx={{ flexShrink: 0, color: "text.secondary", fontSize: 11 }}
            >
              ★ {rating.toFixed(2)}
              {Number.isFinite(ratingCount) && ratingCount > 0
                ? ` (${ratingCount})`
                : ""}
            </Typography>
          )}
        </Stack>
        <Typography
          variant="caption"
          display="block"
          noWrap
          sx={{ mt: 0.75, color: "text.secondary", fontSize: 12 }}
        >
          {[artwork.artist || "Independent Artist", artwork.genre]
            .filter(Boolean)
            .join(" · ")}
        </Typography>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mt: 1, pt: 0.5 }}
        >
          <Typography
            sx={{ color: "error.main", fontSize: 16, fontWeight: 800 }}
            noWrap
          >
            ₱{Number(artwork.price || 0).toLocaleString()}
          </Typography>
          <IconButton
            aria-label={
              isFavorite ? "Remove from favorites" : "Add to favorites"
            }
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            onClick={() => onToggleFavorite(artworkId)}
            sx={{
              width: 44,
              height: 44,
              flexShrink: 0,
              color: isFavorite ? "error.main" : "text.primary",
              backgroundColor: darkMode ? "#1e293b" : "#fff2dc",
              "&:hover": {
                backgroundColor: darkMode ? "#334155" : "#ffebcc",
              },
            }}
          >
            {isFavorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
          </IconButton>
        </Stack>
      </Box>
    </Box>
  );
}

