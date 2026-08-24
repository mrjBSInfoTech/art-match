import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ArtworkCard from "../../components/buyer/Artwork/ArtworkCard";
import { fetchArtworks } from "../../api/buyer/artworkAPI";
import artGenres from "../../data/artGenres";

export default function Artwork() {
  const { genre } = useParams();
  const [searchParams] = useSearchParams();
  const searchQuery = (searchParams.get("q") || "").toLowerCase().trim();
  const selectedGenre = genre ? decodeURIComponent(genre).toLowerCase() : "";
  const [artworks, setArtworks] = useState([]);
  const [keyword, setKeyword] = useState(searchQuery);
  const [sortField, setSortField] = useState("title");
  const [sortDirection, setSortDirection] = useState("asc");
  const [filterGenre, setFilterGenre] = useState(selectedGenre);
  const [mediumFilter, setMediumFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
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

  useEffect(() => {
    setFilterGenre(selectedGenre);
  }, [selectedGenre]);

  useEffect(() => {
    setKeyword(searchQuery);
  }, [searchQuery]);

  const mediums = useMemo(() => {
    const values = artworks.flatMap((artwork) =>
      String(artwork.mediums_used || artwork.mediums || "")
        .split(",")
        .map((medium) => medium.trim())
        .filter(Boolean),
    );
    return [...new Set(values)].sort((a, b) => a.localeCompare(b));
  }, [artworks]);

  const clearFilters = () => {
    setFilterGenre(selectedGenre);
    setMediumFilter("");
    setStatusFilter("");
    setMinPrice("");
    setMaxPrice("");
    setKeyword("");
  };

  const visibleArtworks = useMemo(() => {
    let list = artworks.filter((artwork) => {
      const itemPrice = Number(artwork.price || 0);
      const matchesGenre =
        !filterGenre ||
        String(artwork.genre || "").toLowerCase() === filterGenre;
      const artworkMediums = String(
        artwork.mediums_used || artwork.mediums || "",
      ).toLowerCase();
      const matchesMedium =
        !mediumFilter || artworkMediums.includes(mediumFilter.toLowerCase());
      const matchesMinPrice = !minPrice || itemPrice >= Number(minPrice);
      const matchesMaxPrice = !maxPrice || itemPrice <= Number(maxPrice);
      const artworkStatus = String(artwork.status || "available").toLowerCase();
      const matchesStatus =
        !statusFilter || artworkStatus === statusFilter.toLowerCase();

      const title = String(artwork.title || "").toLowerCase();
      const artist = String(artwork.artist || artwork.student_name || "").toLowerCase();
      const artworkId = String(artwork.artwork_id || artwork.id || "").toLowerCase();
      const itemGenre = String(artwork.genre || "").toLowerCase();
      const colors = String(artwork.color_used || artwork.colors_used || "").toLowerCase();
      const features = String(artwork.feature_scanned || artwork.features || "").toLowerCase();
      const artworkDate = String(artwork.date_created || artwork.approved_date || "").toLowerCase();

      const matchesQuery =
        !keyword ||
        title.includes(keyword.toLowerCase()) ||
        artist.includes(keyword.toLowerCase()) ||
        artworkId.includes(keyword.toLowerCase()) ||
        itemGenre.includes(keyword.toLowerCase()) ||
        colors.includes(keyword.toLowerCase()) ||
        artworkMediums.includes(keyword.toLowerCase()) ||
        features.includes(keyword.toLowerCase()) ||
        artworkDate.includes(keyword.toLowerCase()) ||
        artworkStatus.includes(keyword.toLowerCase());

      return (
        matchesGenre &&
        matchesMedium &&
        matchesStatus &&
        matchesMinPrice &&
        matchesMaxPrice &&
        matchesQuery
      );
    });

    list = [...list].sort((a, b) => {
      const titleA = String(a.title || "");
      const titleB = String(b.title || "");
      let comparison;
      if (sortField === "price") {
        comparison = Number(a.price || 0) - Number(b.price || 0);
      } else if (sortField === "date") {
        comparison = new Date(a.date_created || 0) - new Date(b.date_created || 0);
      } else {
        comparison = titleA.localeCompare(titleB);
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return list;
  }, [artworks, filterGenre, keyword, maxPrice, mediumFilter, minPrice, sortDirection, sortField, statusFilter]);

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
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          <TextField
            size="small"
            label="Search keyword, ID, date"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            sx={{ minWidth: 220 }}
          />
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="genre-filter-label">Genre</InputLabel>
            <Select
              labelId="genre-filter-label"
              label="Genre"
              value={filterGenre}
              onChange={(event) => setFilterGenre(event.target.value)}
            >
              <MenuItem value="">All genres</MenuItem>
              {artGenres.map((item) => (
                <MenuItem key={item} value={item.toLowerCase()}>
                  {item}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="status-filter-label">Status</InputLabel>
            <Select
              labelId="status-filter-label"
              label="Status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <MenuItem value="">All statuses</MenuItem>
              <MenuItem value="available">Available</MenuItem>
              <MenuItem value="verified">Verified</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="medium-filter-label">Medium</InputLabel>
            <Select
              labelId="medium-filter-label"
              label="Medium"
              value={mediumFilter}
              onChange={(event) => setMediumFilter(event.target.value)}
            >
              <MenuItem value="">All mediums</MenuItem>
              {mediums.map((medium) => (
                <MenuItem key={medium} value={medium}>
                  {medium}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            size="small"
            label="Min price"
            type="number"
            value={minPrice}
            onChange={(event) => setMinPrice(event.target.value)}
            slotProps={{ htmlInput: { min: 0 } }}
            sx={{ width: 120 }}
          />
          <TextField
            size="small"
            label="Max price"
            type="number"
            value={maxPrice}
            onChange={(event) => setMaxPrice(event.target.value)}
            slotProps={{ htmlInput: { min: 0 } }}
            sx={{ width: 120 }}
          />
          <Select
            size="small"
            value={sortField}
            onChange={(event) => setSortField(event.target.value)}
          >
            <MenuItem value="title">Title</MenuItem>
            <MenuItem value="price">Price</MenuItem>
            <MenuItem value="date">Date</MenuItem>
          </Select>
          <Select
            size="small"
            value={sortDirection}
            onChange={(event) => setSortDirection(event.target.value)}
          >
            <MenuItem value="asc">Ascending</MenuItem>
            <MenuItem value="desc">Descending</MenuItem>
          </Select>
          <Button variant="text" onClick={clearFilters}>
            Clear filters
          </Button>
        </Box>
      </Box>

      <Stack direction="row" spacing={1} sx={{ mb: 2, px: { xs: 7, sm: 10 } }}>
        <Typography variant="body2" color="text.secondary">
          Showing {visibleArtworks.length} of {artworks.length} artworks
        </Typography>
      </Stack>

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
