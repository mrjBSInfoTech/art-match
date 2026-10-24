import { useNavigate } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import ArtistCard from "./ArtistCard";

const getProfileImage = (artist) => {
  const image = artist.profile_image;
  if (typeof image === "string" && image.trim()) {
    if (image.startsWith("http")) return image;
    return `http://localhost:5000/uploads/seller/uploadProfile/${encodeURIComponent(image)}`;
  }
  return "http://localhost:5000/uploads/profile.jpg";
};

export default function RelatedArtists({ artists = [], sellerName }) {
  const navigate = useNavigate();

  if (artists.length === 0) return null;

  return (
    <Box
      component="section"
      aria-labelledby="related-artists-title"
      sx={{ mt: 5, width: "100%", minWidth: 0 }}
    >
      <Typography
        variant="overline"
        sx={{ color: "error.main", fontWeight: 800, letterSpacing: 1.5 }}
      >
        Similar specialties
      </Typography>
      <Typography
        id="related-artists-title"
        component="h2"
        variant="h4"
        sx={{ fontSize: { xs: 22, sm: 26, md: 30 }, fontWeight: 800 }}
      >
        Related artists
      </Typography>
      <Typography color="text.secondary" variant="body2" sx={{ mt: 1, mb: 3 }}>
        Discover artists with artworks related to {sellerName || "this seller"}&apos;s specialties.
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            sm: "repeat(2, minmax(0, 1fr))",
            lg: "repeat(3, minmax(0, 1fr))",
          },
          gap: 3,
        }}
      >
        {artists.map((artist) => (
          <ArtistCard
            key={artist.student_id}
            artist={{ ...artist, image: getProfileImage(artist) }}
            onViewProfile={(id) => navigate(`/buyer/seller/${id}`)}
          />
        ))}
      </Box>
    </Box>
  );
}
