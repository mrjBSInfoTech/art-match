import {
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import WatermarkedArtworkImage from "../Artwork/WatermarkedArtworkImage";
import { formatArtistRating } from "../../../utils/artistEngagement.js";
const BIO_FALLBACK = "The seller currently doesn't have a bio.";

export default function ArtistCard({ artist, onViewProfile, onToggleFollow }) {
  const tags = artist.specialties.length
    ? artist.specialties
    : [artist.department || "Contemporary Art"];
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const followerCount = Math.max(0, Number(artist.followerCount) || 0);
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
        height: "100%",
        p: { xs: 2, sm: 2.5 },
        borderRadius: 3,
        backgroundColor: "background.paper",
        borderColor: "divider",
        boxShadow: "0 2px 12px rgba(35, 31, 28, 0.06)",
        transition: "box-shadow 180ms ease, border-color 180ms ease",
        "&:focus-within": {
          outline: "2px solid",
          outlineColor: "primary.main",
          outlineOffset: 2,
        },
        "@media (prefers-reduced-motion: reduce)": {
          transition: "none",
        },
        "@media (hover: hover)": {
          "&:hover": {
            borderColor: "text.disabled",
            boxShadow: "0 10px 28px rgba(35, 31, 28, 0.12)",
            transform: "translateY(-3px)",
          },
        },
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
        <Avatar
          src={artist.image || "http://localhost:5000/uploads/seller/profile.jpg"}
          alt={artist.name}
          sx={{
            width: 60,
            height: 60,
            flexShrink: 0,
            border: "2px solid",
            borderColor: "divider",
          }}
        />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            component="h3"
            sx={{
              fontSize: { xs: "1rem", sm: "1.1rem" },
              fontWeight: 800,
              lineHeight: 1.25,
              overflowWrap: "anywhere",
            }}
          >
            {artist.name}
          </Typography>
          <Typography
            sx={{ color: "text.secondary", fontSize: "0.82rem", mt: 0.45 }}
          >
            {[artist.artistName, artist.department].filter(Boolean).join(" · ")}
          </Typography>
        </Box>
      </Stack>

      <Typography
        sx={{
          color: "text.secondary",
          fontSize: "0.9rem",
          lineHeight: 1.5,
          minHeight: 62,
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
          fontSize: "0.75rem",
          fontWeight: 800,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          mt: 1.5,
          mb: 0.75,
        }}
      >
        Selected works
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 1,
          mt: 1,
        }}
      >
        {artist.artworks.map((artwork) => (
          <Box
            key={artwork.artwork_id || artwork.id || artwork.image}
            sx={{
              width: "100%",
              aspectRatio: "1 / 1",
              minWidth: 0,
              borderRadius: 1.5,
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
                aspectRatio: "1 / 1",
                minWidth: 0,
                borderRadius: 1.5,
                background: "linear-gradient(135deg, #eee9e3 0%, #f8f5f1 100%)",
              }}
            />
          ),
        )}
      </Box>
      <Stack
        direction="row"
        spacing={0.75}
        useFlexGap
        flexWrap="wrap"
        sx={{ minHeight: 28, mt: 1 }}
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
              fontSize: "0.75rem",
              border: `1px solid ${colors.chipBorder}`,
            }}
          />
        ))}
      </Stack>

      <Divider sx={{ my: 1.5, borderColor: "rgba(35, 31, 28, 0.1)" }} />
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={1}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
          <Typography sx={{ color: "text.secondary", fontSize: "0.82rem" }}>
            {artist.works} works
          </Typography>
          <Typography
            sx={{ color: "error.main", fontSize: "0.82rem", fontWeight: 800 }}
          >
            {formatArtistRating(artist.averageRating)} <span style={{ color: "#f3a51d" }}>★</span>
          </Typography>
        </Stack>
        <Typography sx={{ color: "text.secondary", fontSize: "0.82rem" }}>
          {followerCount} {followerCount === 1 ? "follower" : "followers"}
        </Typography>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
        <Button
          variant="outlined"
          aria-label={`${artist.isFollowing ? "Unfollow" : "Follow"} ${artist.name}`}
          aria-busy={artist.followPending || undefined}
          disabled={artist.followPending || !onToggleFollow}
          onClick={() => onToggleFollow?.(artist)}
          sx={{
            minHeight: 44,
            minWidth: 0,
            px: 1.25,
            flex: { xs: "0 0 auto", sm: "0 0 auto" },
            borderColor: "divider",
            color: "text.secondary",
            fontSize: "0.82rem",
          }}
        >
          {artist.followPending ? (
            <CircularProgress size={18} aria-label="Updating follow status" />
          ) : (
            <>
              <FavoriteBorderIcon sx={{ fontSize: 18, mr: 0.5 }} />
              {artist.isFollowing ? "Following" : "Follow"}
            </>
          )}
        </Button>
        <Button
          fullWidth
          variant="contained"
          endIcon={<ArrowForwardIcon sx={{ fontSize: "16px !important" }} />}
          onClick={() => onViewProfile(artist.student_id)}
          sx={{
            backgroundColor: "#1d2433",
            color: "#fff",
            fontSize: "0.9rem",
            fontWeight: 800,
            minHeight: 44,
            "&:hover": { backgroundColor: "#313b4e" },
          }}
        >
          View Profile
        </Button>
      </Stack>
    </Card>
  );
}
