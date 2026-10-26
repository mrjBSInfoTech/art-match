import {
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  Divider,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import WatermarkedArtworkImage from "../Artwork/WatermarkedArtworkImage";
const BIO_FALLBACK = "The seller currently doesn't have a bio.";

export default function ArtistCard({ artist, onViewProfile }) {
  const tags = artist.specialties.length
    ? artist.specialties
    : [artist.department || "Contemporary Art"];
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const colors = {
    page: isDark ? "#020817" : "#f4efe9",
    card: isDark ? "#111827" : "#f8f4f0",
    cardAlt: isDark ? "#1e293b" : "#fffaf7",
    sideCard: isDark ? "#111827" : "#f7f2eb",
    border: isDark ? "#334155" : "#e6d8cd",
    text: isDark ? "#f8fafc" : "#1b1917",
    muted: isDark ? "#cbd5e1" : "#5f514b",
    subtle: isDark ? "#94a3b8" : "#6f625b",
    chip: isDark ? "#334155" : "#f3e7dc",
    chipBorder: isDark ? "#475569" : "#e3d3c2",
    accent: isDark ? "#f87171" : "#d95454",
  };

  return (
    <Card
      sx={{
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        minHeight: { xs: 0, sm: 340 },
        p: { xs: 2, sm: 2.5 },
        borderRadius: 2.5,
        backgroundColor: "background.paper",
        borderColor: "rgba(35, 31, 28, 0.12)",
        boxShadow: "0 2px 8px rgba(35, 31, 28, 0.04)",
        transition: "transform 180ms ease, box-shadow 180ms ease",
        "&:hover": {
          transform: "translateY(-3px)",
          boxShadow: "0 10px 24px rgba(35, 31, 28, 0.12)",
        },
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Avatar
          src={artist.image || "http://localhost:5000/uploads/profile.jpg"}
          alt={artist.name}
          sx={{ width: 52, height: 52, border: "2px solid #f2eee8" }}
        />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{ fontSize: "1rem", fontWeight: 800, lineHeight: 1.2 }}
            noWrap
          >
            {artist.name}
          </Typography>
          <Typography
            sx={{ color: "text.secondary", fontSize: "0.72rem", mt: 0.45 }}
            noWrap
          >
            {artist.artistName} · {artist.department}
          </Typography>
        </Box>
        <Typography
          sx={{
            alignSelf: "flex-start",
            px: 1,
            py: 0.4,
            borderRadius: 1,
            color: "#d91f3d",
            backgroundColor: "#fff0f1",
            fontSize: "0.66rem",
            fontWeight: 800,
            whiteSpace: "nowrap",
          }}
        >
          {tags[0]}
        </Typography>
      </Stack>

      <Typography
        sx={{
          color: "text.secondary",
          fontSize: "0.8rem",
          lineHeight: 1.5,
          minHeight: 60,
          mt: 1.75,
          display: "-webkit-box",
          WebkitBoxOrient: "vertical",
          WebkitLineClamp: 3,
          overflow: "hidden",
        }}
      >
        {artist.bio?.trim() || BIO_FALLBACK}
      </Typography>

      <Typography
        sx={{
          color: "text.secondary",
          fontSize: "0.62rem",
          fontWeight: 800,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          mt: 1.5,
          mb: 0.75,
        }}
      >
        Exhibition studies
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 0.75,
          mt: 1.25,
        }}
      >
        {artist.artworks.map((artwork) => (
          <Box
            key={artwork.artwork_id || artwork.id || artwork.image}
            sx={{
              width: "100%",
              height: { xs: 82, sm: 112 },
              borderRadius: 0.8,
              overflow: "hidden",
              background: "linear-gradient(135deg, #eee9e3 0%, #f8f5f1 100%)",
            }}
          >
            <WatermarkedArtworkImage
              image={artwork.image}
              alt={artwork.title || "Artwork"}
              variant="thumb"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
              sx={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          </Box>
        ))}
        {Array.from({ length: Math.max(0, 3 - artist.artworks.length) }).map(
          (_, index) => (
            <Box
              key={`placeholder-${index}`}
              sx={{
                height: { xs: 82, sm: 112 },
                borderRadius: 0.8,
                background: "linear-gradient(135deg, #eee9e3 0%, #f8f5f1 100%)",
              }}
            />
          ),
        )}
      </Box>
      <Stack
        direction="row"
        spacing={0.6}
        sx={{ minHeight: 20, overflow: "hidden", mt: 0.9 }}
      >
        {tags.map((tag) => (
          <Chip
            key={tag}
            label={tag}
            size="small"
            sx={{
              background: colors.chip,
              color: colors.muted,
              borderRadius: 999,
              fontWeight: 600,
              fontSize: "0.62rem",
              border: `1px solid ${colors.chipBorder}`,
            }}
          />
        ))}
      </Stack>

      <Divider sx={{ my: 1.5, borderColor: "rgba(35, 31, 28, 0.1)" }} />
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Typography sx={{ color: "text.secondary", fontSize: "0.72rem" }}>
            {artist.works} works
          </Typography>
          <Typography
            sx={{ color: "#e22847", fontSize: "0.72rem", fontWeight: 800 }}
          >
            4.8 <span style={{ color: "#f3a51d" }}>★</span>
          </Typography>
        </Stack>
        <Typography sx={{ color: "text.secondary", fontSize: "0.72rem" }}>
          {Math.max(8, artist.works * 3)} followers
        </Typography>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
        <Button
          variant="outlined"
          aria-label={`Follow ${artist.name}`}
          sx={{
            minWidth: 0,
            px: 1.25,
            borderColor: "#d8d0c8",
            color: "text.secondary",
            fontSize: "0.72rem",
          }}
        >
          <FavoriteBorderIcon sx={{ fontSize: 16, mr: 0.35 }} />
          Follow
        </Button>
        <Button
          fullWidth
          variant="contained"
          endIcon={<ArrowForwardIcon sx={{ fontSize: "16px !important" }} />}
          onClick={() => onViewProfile(artist.student_id)}
          sx={{
            backgroundColor: "#1d2433",
            color: "#fff",
            fontSize: "0.78rem",
            fontWeight: 800,
            "&:hover": { backgroundColor: "#313b4e" },
          }}
        >
          View Profile
        </Button>
      </Stack>
    </Card>
  );
}
