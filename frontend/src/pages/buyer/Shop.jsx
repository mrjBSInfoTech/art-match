import { createElement, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  ButtonBase,
  CircularProgress,
  Container,
  IconButton,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import ForumOutlinedIcon from "@mui/icons-material/ForumOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import { fetchArtworks } from "../../api/buyer/artworkAPI";

const PAGE_SIZE = 8;

const shortcuts = [
  {
    title: "Orders",
    description: "Order status, cancellations, receipts",
    icon: Inventory2OutlinedIcon,
    path: "/buyer/profile/orders",
  },
  {
    title: "Message",
    description: "Contact artists or buyer support in one safe inbox",
    icon: ForumOutlinedIcon,
    path: "/buyer/messages",
  },
  {
    title: "Shipping",
    description: "Packaging, tracking, delivery timing",
    icon: LocalShippingOutlinedIcon,
    path: "/buyer/profile/orders",
  },
  {
    title: "Manage Address",
    description: "Delivery address and unit details",
    icon: LocationOnOutlinedIcon,
    path: "/buyer/profile/addresses",
  },
];

const artworkImageUrl = (image) =>
  image?.startsWith("http")
    ? image
    : image
      ? `http://localhost:5000/uploads/seller/uploadArtwork/${encodeURIComponent(image)}`
      : "";

function ShopArtworkCard({ artwork, onOpen }) {
  const theme = useTheme();
  const darkMode = theme.palette.mode === "dark";
  const [isFavorite, setIsFavorite] = useState(false);
  const imageUrl = artworkImageUrl(artwork.image);
  const status = String(artwork.status || "").toLowerCase();
  const badge =
    status === "available" || status === "for sale"
      ? "For Sale"
      : artwork.genre || "Artwork";
  const rating = Number(artwork.rating);

  return (
    <Box
      sx={{
        minWidth: 0,
        overflow: "hidden",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1.5,
        backgroundColor: "background.paper",
        transition: "transform 180ms ease, box-shadow 180ms ease",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: darkMode
            ? "0 8px 24px rgba(0, 0, 0, 0.42)"
            : "0 8px 20px rgba(68, 41, 15, 0.07)",
        },
      }}
    >
      <Box
        component="button"
        type="button"
        onClick={() => onOpen(artwork)}
        aria-label={`View ${artwork.title || "artwork"}`}
        sx={{
          position: "relative",
          display: "flex",
          width: "100%",
          aspectRatio: "1.35 / 1",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          border: 0,
          p: 0,
          backgroundColor: darkMode ? "#1e293b" : "#eeeae4",
          backgroundImage: imageUrl ? `url("${imageUrl}")` : "none",
          backgroundPosition: "center",
          backgroundSize: "cover",
          cursor: "pointer",
        }}
      >
        {!imageUrl && (
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
            px: 0.8,
            py: 0.25,
            borderRadius: 0.5,
            backgroundColor: "error.main",
            color: "#fff",
            fontSize: 9,
            fontWeight: 800,
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {badge}
        </Typography>
      </Box>

      <Box sx={{ p: { xs: 1, sm: 1.25 } }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          gap={0.5}
        >
          <Typography
            component="button"
            onClick={() => onOpen(artwork)}
            title={artwork.title || "Untitled artwork"}
            sx={{
              minWidth: 0,
              overflow: "hidden",
              border: 0,
              p: 0,
              background: "none",
              color: "text.primary",
              font: "inherit",
              fontSize: 12,
              fontWeight: 800,
              textAlign: "left",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              cursor: "pointer",
            }}
          >
            {artwork.title || "Untitled artwork"}
          </Typography>
          {Number.isFinite(rating) && rating > 0 && (
            <Typography
              variant="caption"
              sx={{ flexShrink: 0, color: "text.secondary", fontSize: 9 }}
            >
              ★ {rating.toFixed(1)}
            </Typography>
          )}
        </Stack>
        <Typography
          variant="caption"
          display="block"
          noWrap
          sx={{ mt: 0.25, color: "text.secondary", fontSize: 10 }}
        >
          {[artwork.artist || "Independent Artist", artwork.genre]
            .filter(Boolean)
            .join(" · ")}
        </Typography>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mt: 0.5 }}
        >
          <Typography
            sx={{ color: "error.main", fontSize: 13, fontWeight: 800 }}
            noWrap
          >
            ₱{Number(artwork.price || 0).toLocaleString()}
          </Typography>
          <IconButton
            aria-label={
              isFavorite ? "Remove from favorites" : "Add to favorites"
            }
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            size="small"
            onClick={() => setIsFavorite((favorite) => !favorite)}
            sx={{
              width: 28,
              height: 28,
              color: isFavorite ? "error.main" : "text.primary",
              backgroundColor: darkMode ? "#1e293b" : "#fff2dc",
              "&:hover": {
                backgroundColor: darkMode ? "#334155" : "#ffebcc",
              },
            }}
          >
            {isFavorite ? (
              <FavoriteIcon sx={{ fontSize: 15 }} />
            ) : (
              <FavoriteBorderIcon sx={{ fontSize: 15 }} />
            )}
          </IconButton>
        </Stack>
      </Box>
    </Box>
  );
}

export default function Shop() {
  const theme = useTheme();
  const darkMode = theme.palette.mode === "dark";
  const navigate = useNavigate();
  const { genre } = useParams();
  const [searchParams] = useSearchParams();
  const searchQuery = (searchParams.get("q") || "").trim().toLowerCase();
  const selectedGenre = genre ? decodeURIComponent(genre).toLowerCase() : "";
  const [artworks, setArtworks] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadArtworks = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await fetchArtworks();
        const list = Array.isArray(response) ? response : response?.data || [];
        if (active) setArtworks(list);
      } catch (loadError) {
        if (active) setError(loadError.message || "Failed to load artworks.");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadArtworks();
    return () => {
      active = false;
    };
  }, []);

  const visibleArtworks = useMemo(
    () =>
      artworks.filter((artwork) => {
        const matchesGenre =
          !selectedGenre ||
          String(artwork.genre || "").toLowerCase() === selectedGenre;
        const searchableText = [
          artwork.title,
          artwork.artist,
          artwork.student_name,
          artwork.genre,
          artwork.artwork_id,
          artwork.id,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return (
          matchesGenre && (!searchQuery || searchableText.includes(searchQuery))
        );
      }),
    [artworks, searchQuery, selectedGenre],
  );
  const pageCount = Math.max(1, Math.ceil(visibleArtworks.length / PAGE_SIZE));
  const pageArtworks = visibleArtworks.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedGenre]);

  const openArtwork = (artwork) =>
    navigate(`/buyer/artwork/view/${artwork.artwork_id || artwork.id}`);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: darkMode ? "background.default" : "#fffaf2",
        py: { xs: 2, md: 3 },
      }}
    >
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Shop</title>
      </Helmet>
      <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3, lg: 5 } }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(2, minmax(0, 1fr))",
              md: "repeat(4, minmax(0, 1fr))",
            },
            gap: { xs: 1, sm: 1.5 },
            mb: { xs: 2.5, md: 4 },
          }}
        >
          {shortcuts.map(({ title, description, icon, path }) => (
            <ButtonBase
              key={title}
              onClick={() => navigate(path)}
              sx={{
                minWidth: 0,
                minHeight: { xs: 68, sm: 76 },
                display: "flex",
                justifyContent: "flex-start",
                gap: { xs: 1, sm: 1.5 },
                px: { xs: 1, sm: 1.5 },
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1.5,
                backgroundColor: "background.paper",
                textAlign: "left",
                "&:hover": {
                  backgroundColor: darkMode ? "#1e293b" : "#fff6e8",
                  borderColor: darkMode ? "#475569" : "#e8cda6",
                },
              }}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  flexShrink: 0,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: "50%",
                  backgroundColor: darkMode
                    ? "rgba(239, 68, 68, 0.14)"
                    : "#fff2dc",
                  color: "error.main",
                }}
              >
                {createElement(icon, { sx: { fontSize: 17 } })}
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  sx={{
                    color: "text.primary",
                    fontSize: 12,
                    fontWeight: 800,
                    lineHeight: 1.2,
                  }}
                  noWrap
                >
                  {title}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    display: "-webkit-box",
                    overflow: "hidden",
                    color: "text.secondary",
                    fontSize: 9,
                    lineHeight: 1.25,
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {description}
                </Typography>
              </Box>
              <Typography
                aria-hidden="true"
                sx={{ flexShrink: 0, color: "text.primary", fontSize: 19 }}
              >
                ›
              </Typography>
            </ButtonBase>
          ))}
        </Box>

        {(selectedGenre || searchQuery) && (
          <Typography
            sx={{
              mb: 1.5,
              color: "text.primary",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {selectedGenre
              ? `Shop / ${genre}`
              : `Search results for “${searchParams.get("q") || ""}”`}
            <Typography
              component="span"
              sx={{
                ml: 1,
                color: "text.secondary",
                fontSize: 11,
                fontWeight: 400,
              }}
            >
              {visibleArtworks.length} artworks
            </Typography>
          </Typography>
        )}

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        )}
        {error && <Alert severity="error">{error}</Alert>}
        {!loading && !error && visibleArtworks.length === 0 && (
          <Typography
            sx={{ py: 8, color: "text.secondary", textAlign: "center" }}
          >
            No artworks found.
          </Typography>
        )}

        {!loading && !error && visibleArtworks.length > 0 && (
          <>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "repeat(1, minmax(0, 1fr))",
                  sm: "repeat(2, minmax(0, 1fr))",
                  md: "repeat(4, minmax(0, 1fr))",
                },
                gap: { xs: 1.5, sm: 2 },
              }}
            >
              {pageArtworks.map((artwork) => (
                <ShopArtworkCard
                  key={artwork.artwork_id || artwork.id}
                  artwork={artwork}
                  onOpen={openArtwork}
                />
              ))}
            </Box>

            {pageCount > 1 && (
              <Stack
                direction="row"
                justifyContent="center"
                alignItems="center"
                flexWrap="wrap"
                gap={0.75}
                sx={{ mt: 2.5 }}
              >
                <ButtonBase
                  disabled={page === 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  sx={{
                    minWidth: 70,
                    height: 34,
                    px: 1.5,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 999,
                    backgroundColor: darkMode ? "#1e293b" : "#fff2dc",
                    color: "text.primary",
                    fontSize: 11,
                    fontWeight: 700,
                    "&:disabled": { opacity: 0.45 },
                  }}
                >
                  Previous
                </ButtonBase>
                {Array.from({ length: pageCount }, (_, index) => index + 1).map(
                  (pageNumber) => (
                    <ButtonBase
                      key={pageNumber}
                      aria-label={`Page ${pageNumber}`}
                      aria-current={page === pageNumber ? "page" : undefined}
                      onClick={() => setPage(pageNumber)}
                      sx={{
                        width: 34,
                        height: 34,
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: "50%",
                        backgroundColor:
                          page === pageNumber
                            ? "error.main"
                            : "background.paper",
                        color: page === pageNumber ? "#fff" : "text.primary",
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {pageNumber}
                    </ButtonBase>
                  ),
                )}
                <ButtonBase
                  disabled={page === pageCount}
                  onClick={() =>
                    setPage((current) => Math.min(pageCount, current + 1))
                  }
                  sx={{
                    minWidth: 70,
                    height: 34,
                    px: 1.5,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 999,
                    backgroundColor: darkMode ? "#1e293b" : "#fff2dc",
                    color: "text.primary",
                    fontSize: 11,
                    fontWeight: 700,
                    "&:disabled": { opacity: 0.45 },
                  }}
                >
                  Next
                </ButtonBase>
              </Stack>
            )}
          </>
        )}
      </Container>
    </Box>
  );
}
