import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Typography } from "@mui/material";
import ArtistCard from "./ArtistCard";
import {
  fetchArtistSummaries,
  followArtist,
  unfollowArtist,
} from "../../../api/buyer/artworkAPI";

const getProfileImage = (artist) => {
  const image = artist.profile_image;
  if (typeof image === "string" && image.trim()) {
    if (image.startsWith("http")) return image;
    return `http://localhost:5000/uploads/seller/uploadProfile/${encodeURIComponent(image)}`;
  }
  return "http://localhost:5000/uploads/seller/profile.jpg";
};

export default function RelatedArtists({
  artists = [], sellerName, description, eyebrow = "Similar specialties",
}) {
  const navigate = useNavigate();
  const [summaries, setSummaries] = useState(new Map());
  const [pendingArtists, setPendingArtists] = useState(new Set());
  const [followError, setFollowError] = useState("");
  const artistIds = artists.map((artist) => artist.student_id).join(",");

  useEffect(() => {
    let active = true;
    if (!artistIds) {
      setSummaries(new Map());
      return () => { active = false; };
    }

    fetchArtistSummaries()
      .then((response) => {
        if (!active) return;
        setSummaries(new Map((Array.isArray(response) ? response : []).map((summary) => [
          String(summary.student_id),
          {
            averageRating: Number(summary.averageRating) || 0,
            followerCount: Number(summary.followerCount) || 0,
            isFollowing: Boolean(summary.isFollowing),
          },
        ])));
        setFollowError("");
      })
      .catch((error) => {
        if (active) setFollowError(error.message || "Unable to load artist details.");
      });

    return () => { active = false; };
  }, [artistIds]);

  const toggleFollow = async (artist) => {
    const artistId = String(artist.student_id);
    if (pendingArtists.has(artistId)) return;
    setPendingArtists((current) => new Set(current).add(artistId));
    setFollowError("");
    try {
      const result = artist.isFollowing
        ? await unfollowArtist(artist.student_id)
        : await followArtist(artist.student_id);
      setSummaries((current) => new Map(current).set(artistId, {
        averageRating: artist.averageRating,
        followerCount: Number(result.followerCount),
        isFollowing: Boolean(result.isFollowing),
      }));
    } catch (error) {
      setFollowError(error.message || "Unable to update artist follow.");
    } finally {
      setPendingArtists((current) => {
        const next = new Set(current);
        next.delete(artistId);
        return next;
      });
    }
  };

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
        {eyebrow}
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
        {description || `Discover artists with artworks related to ${sellerName || "this seller"}'s specialties.`}
      </Typography>
      {followError && <Alert severity="error" sx={{ mb: 2 }}>{followError}</Alert>}
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
            artist={{
              ...artist,
              ...(summaries.get(String(artist.student_id)) || {}),
              followPending: pendingArtists.has(String(artist.student_id)) ||
                !summaries.has(String(artist.student_id)),
              image: getProfileImage(artist),
            }}
            onToggleFollow={summaries.has(String(artist.student_id)) ? toggleFollow : undefined}
            onViewProfile={(id) => navigate(`/buyer/seller/${id}`)}
          />
        ))}
      </Box>
    </Box>
  );
}
