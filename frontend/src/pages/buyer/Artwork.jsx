import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  CircularProgress,
  MenuItem,
  Paper,
  Select,
  Typography,
} from "@mui/material";
import ArtworkCard from "../../components/buyer/Artwork/ArtworkCard";
import { fetchArtworks } from "../../api/buyer/artworkAPI";

export default function Artwork() {
  const { genre } = useParams();
  const [searchParams] = useSearchParams();
  const searchQuery = (searchParams.get("q") || "").toLowerCase().trim();
  const selectedGenre = genre ? decodeURIComponent(genre).toLowerCase() : "";
  const [artworks, setArtworks] = useState([]);
  const [sortOption, setSortOption] = useState("az");
  const [priceOption, setPriceOption] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadArtworks = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetchArtworks();
      if (response && Array.isArray(response)) {
        setArtworks(response);
      } else if (response && response.data && Array.isArray(response.data)) {
        setArtworks(response.data);
      } else {
        setArtworks([]);
        setError("No data received from server.");
      }
    } catch (err) {
      setArtworks([]);
      setError("Failed to load artworks: " + err.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadArtworks();
  }, []);

  const visibleArtworks = useMemo(() => {
    let list = artworks.filter((artwork) => {
      // 1. Genre Filter (from URL path parameter)
      const matchesGenre =
        !selectedGenre ||
        String(artwork.genre || "").toLowerCase() === selectedGenre;

      // 2. Comprehensive Search Query Filter
      const title = String(artwork.title || "").toLowerCase();
      const artist = String(artwork.artist || artwork.student_name || "").toLowerCase();
      const itemGenre = String(artwork.genre || "").toLowerCase();
      const colors = String(artwork.color_used || artwork.colors_used || "").toLowerCase();
      const mediums = String(artwork.mediums_used || artwork.mediums || "").toLowerCase();
      const features = String(artwork.feature_scanned || artwork.features || "").toLowerCase();

      const matchesQuery =
        !searchQuery ||
        title.includes(searchQuery) ||
        artist.includes(searchQuery) ||
        itemGenre.includes(searchQuery) ||
        colors.includes(searchQuery) ||
        mediums.includes(searchQuery) ||
        features.includes(searchQuery);

      return matchesGenre && matchesQuery;
    });

    // Sort by Title
    list = [...list].sort((a, b) => {
      const titleA = String(a.title || "");
      const titleB = String(b.title || "");
      return sortOption === "az"
        ? titleA.localeCompare(titleB)
        : titleB.localeCompare(titleA);
    });

    // Sort by Price
    if (priceOption === "lthPrice") {
      list.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    } else if (priceOption === "htlPrice") {
      list.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    }

    return list;
  }, [artworks, priceOption, selectedGenre, sortOption, searchQuery]);

  return (
    <Box sx={{ p: 3, backgroundColor: "#f5f5f5", minHeight: "100vh" }}>
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Artwork</title>
      </Helmet>

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
          mb: 3,
          px: { xs: 7, sm: 10 },
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: "bold" }}>
          {searchQuery
            ? `Search results for "${searchQuery}"`
            : `Genre: ${genre ? decodeURIComponent(genre) : "All"}`}
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Select
            size="small"
            value={sortOption}
            onChange={(event) => setSortOption(event.target.value)}
          >
            <MenuItem value="az">A-Z</MenuItem>
            <MenuItem value="za">Z-A</MenuItem>
          </Select>
          <Select
            size="small"
            displayEmpty
            value={priceOption}
            onChange={(event) => setPriceOption(event.target.value)}
          >
            <MenuItem value="">Price</MenuItem>
            <MenuItem value="lthPrice">Lowest to Highest</MenuItem>
            <MenuItem value="htlPrice">Highest to Lowest</MenuItem>
          </Select>
        </Box>
      </Box>

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      )}
      {error && <Alert severity="error">{error}</Alert>}
      {!loading && !error && visibleArtworks.length === 0 && (
        <Typography color="text.secondary" sx={{ textAlign: "center" }}>
          {searchQuery
            ? `No artworks found for "${searchQuery}"`
            : genre
              ? `No artworks found in the "${decodeURIComponent(genre)}" genre.`
              : "No artworks found."}
        </Typography>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, 1fr)",
            sm: "repeat(3, 1fr)",
            md: "repeat(4, 1fr)",
            lg: "repeat(4, 1fr)",
          },
          gap: 3,
          px: { xs: 7, sm: 10 },
        }}
      >
        {visibleArtworks.map((artwork) => (
          <ArtworkCard
            key={artwork.artwork_id || artwork.id}
            artwork={artwork}
          />
        ))}
      </Box>
    </Box>
  );
}
