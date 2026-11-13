import React, { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Link as RouterLink, useParams, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Skeleton,
  Slide,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import CloseIcon from "@mui/icons-material/Close";
import RemoveShoppingCart from "@mui/icons-material/RemoveShoppingCart";
import ShoppingBag from "@mui/icons-material/ShoppingBag";
import { fetchArtworks, fetchArtworkById } from "../../api/buyer/artworkAPI";
import { addToCart, fetchCart, removeFromCart } from "../../api/buyer/cartAPI";
import ArtworkCard from "../../components/buyer/Artwork/ArtworkCard";
import RelatedArtists from "../../components/buyer/Artist/RelatedArtists";
import {
  fetchRecentlyViewedArtworks,
  getRecommendationSessionId,
  recordRecommendationEvent,
} from "../../api/buyer/recommendationAPI";
import WatermarkedArtworkImage from "../../components/buyer/Artwork/WatermarkedArtworkImage";
import ArtworkReviews from "../../components/buyer/Artwork/ArtworkReviews";
import ArtworkAdditionalDetails from "../../components/buyer/Artwork/ArtworkAdditionalDetails";
import ProductSelectionDialog from "../../components/buyer/Artwork/ProductSelectionDialog";
import CustomizeOrderDialog from "../../components/buyer/Artwork/CustomizeOrderDialog";
import { getSavedProductOptions } from "../../utils/productOptions";
import { getArtworkDetailCategory } from "../../utils/artworkDetails";
import { isArtworkSoldOut, getArtworkRemainingStock, getArtworkOrderLimit } from "../../utils/artworkAvailability";
import { getSimilarArtworks } from "../../utils/artworkSimilarity";
import { getArtworkRelatedArtists } from "../../utils/artworkRelatedArtists";
import { sendOrderNoteToSeller } from "../../utils/orderNoteMessaging";
import ConnectionErrorPanel from "../../components/buyer/ConnectionErrorPanel";
import { isAuthenticated } from "../../../utils/auth";

const unavailableImageSrc =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect width="100%" height="100%" fill="#e2e8f0"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#64748b" font-family="sans-serif" font-size="24">Image unavailable</text></svg>',
  );

// Animation transition
const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function getColorChipStyles(value) {
  const hex = String(value).match(/#(?:[a-f\d]{6}|[a-f\d]{3})\b/i)?.[0];
  if (!hex) {
    return { backgroundColor: "background.default", color: "text.primary" };
  }

  const raw = hex.slice(1);
  const full = raw.length === 3 ? [...raw].map((c) => c + c).join("") : raw;
  const channels = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  const isNearWhite = channels.every((channel) => channel >= 220);

  return {
    backgroundColor: hex,
    color: isNearWhite ? "#000" : "#fff",
  };
}

export default function ArtworkDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [artworks, setArtworks] = useState([]);
  const [artwork, setArtwork] = useState(null);
  const relatedArtists = useMemo(
    () => getArtworkRelatedArtists(artwork, artworks),
    [artwork, artworks],
  );
  const productOptions = useMemo(
    () => getSavedProductOptions(artwork || {}),
    [artwork],
  );
  const [loading, setLoading] = useState(false);
  const [artworkErrorMessage, setArtworkErrorMessage] = useState("");
  const [addingToCart, setAddingToCart] = useState(false);
  const [isRemovingFromCart, setIsRemovingFromCart] = useState(false);
  const [isInCart, setIsInCart] = useState(false);
  const [cartMessage, setCartMessage] = useState("");
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [customizeDialogOpen, setCustomizeDialogOpen] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [, setRecentHistory] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  useEffect(() => {
    if (!cartMessage) return;
    const timeoutId = setTimeout(() => setCartMessage(""), 1000);
    return () => clearTimeout(timeoutId);
  }, [cartMessage]);

  useEffect(() => {
    if (!isAuthenticated("buyer")) {
      setIsInCart(false);
      return undefined;
    }

    let active = true;
    const refreshCartState = async () => {
      try {
        const items = await fetchCart();
        if (active) {
          setIsInCart(
            (Array.isArray(items) ? items : []).some(
              (item) => String(item.artwork_id) === String(id),
            ),
          );
        }
      } catch (error) {
        if (active) {
          console.error("Unable to check whether artwork is in cart:", error);
        }
      }
    };

    refreshCartState();
    window.addEventListener("cart-updated", refreshCartState);
    return () => {
      active = false;
      window.removeEventListener("cart-updated", refreshCartState);
    };
  }, [id]);

  // Fetch artwork detail and also the list for related items
  useEffect(() => {
    let mounted = true;
    const loadRecentlyViewed = async () => {
      try {
        const customerId =
          isAuthenticated("buyer") && localStorage.getItem("buyer_customer_id");
        const viewer = customerId
          ? `buyer-${customerId}`
          : `guest-${getRecommendationSessionId()}`;
        const viewKey = `recommendation_view_${viewer}_${id}`;
        const now = Date.now();
        const lastView = Number(sessionStorage.getItem(viewKey) || 0);
        if (now - lastView >= 30000) {
          const result = await recordRecommendationEvent({
            event_type: "view",
            artwork_id: Number(id),
            source_page: "artwork_detail",
          });
          if (
            result?.duplicate ||
            (result?.recorded && result.interaction_id != null)
          ) {
            sessionStorage.setItem(viewKey, String(now));
          }
        }
      } catch {
        // Storage restrictions should not prevent loading server-side history.
      }
      if (!mounted) return;
      try {
        const items = await fetchRecentlyViewedArtworks(id);
        if (mounted)
          setRecentHistory({ artworkId: id, artworks: items, error: "" });
      } catch {
        if (mounted)
          setRecentHistory({
            artworkId: id,
            artworks: [],
            error: "Recently viewed artworks could not be loaded.",
          });
      }
    };
    const load = async () => {
      try {
        setLoading(true);
        setArtworkErrorMessage("");

        const [detail, listResp] = await Promise.all([
          fetchArtworkById(id),
          // Related items are optional and must not hide the detail or history.
          fetchArtworks().catch(() => []),
        ]);

        const list = Array.isArray(listResp)
          ? listResp
          : listResp && listResp.data && Array.isArray(listResp.data)
            ? listResp.data
            : [];

        if (!mounted) return;
        setArtworks(list);
        setArtwork(detail || null);
        setOrderQuantity(1);
        if (detail) void loadRecentlyViewed();
      } catch (err) {
        if (!mounted) return;
        setArtworks([]);
        setArtworkErrorMessage(
          "Failed to load artwork details: " + err.message,
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  const formatAndCapitalize = (data) => {
    if (!data) return "N/A";

    const list = Array.isArray(data)
      ? data
      : typeof data === "string"
        ? data.split(",")
        : [];

    if (list.length === 0) return "N/A";

    const formatted = list
      .map((item) => {
        if (typeof item !== "string") return "";
        const trimmed = item.trim();
        if (!trimmed) return "";

        return trimmed
          .replace(/_/g, " ")
          .split(/\s+/)
          .map(
            (word) =>
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
          )
          .join(" ");
      })
      .filter(Boolean); // Remove empty strings

    return formatted.length > 0 ? formatted.join(", ") : "N/A";
  };

  const toList = (data) => {
    if (!data) return [];
    if (Array.isArray(data))
      return data.map((d) => String(d).trim()).filter(Boolean);
    if (typeof data === "string")
      return data
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    return [];
  };

  const mediumsList = artwork ? toList(artwork.mediums_used) : [];
  const featuresList = artwork ? toList(artwork.feature_scanned) : [];
  const colorsList = artwork ? toList(artwork.color_used) : [];

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
        <Grid container spacing={{ xs: 2, md: 4 }}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Skeleton
              variant="rounded"
              sx={{ aspectRatio: { xs: "1 / 1", md: "4 / 5" }, maxHeight: 760 }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <Skeleton variant="rounded" height={430} />
          </Grid>
        </Grid>
      </Container>
    );
  }

  if (artworkErrorMessage) {
    return <ConnectionErrorPanel title="Artwork Unavailable" />;
  }

  if (!artwork) {
    return (
      <Container sx={{ py: 8 }}>
        <Button sx={{ mt: 2 }} onClick={() => navigate(-1)}>
          Back
        </Button>
        <Typography textAlign="center" sx={{ mt: 2 }}>
          Artwork not found.
        </Typography>
      </Container>
    );
  }

  const imageUrl = artwork.image
    ? artwork.image.startsWith("http")
      ? artwork.image
      : artwork.image
    : "https://via.placeholder.com/600x800?text=No+Image";
  const isSoldOut = isArtworkSoldOut(artwork);
  const isProduct =
    String(artwork?.art_type || "")
      .trim()
      .toLowerCase() === "product";
  const productPriceMode = (() => {
    try {
      const details =
        typeof artwork.artwork_details === "string"
          ? JSON.parse(artwork.artwork_details)
          : artwork.artwork_details;
      return details?.product_price_mode || "shared";
    } catch {
      return "shared";
    }
  })();
  const optionPrices = productOptions
    .map((option) => Number(option.price))
    .filter((price) => Number.isFinite(price) && price > 0);
  const displayedUnitPrice =
    isProduct && productPriceMode === "manual" && optionPrices.length
      ? Math.min(...optionPrices)
      : Number(artwork.price || 0);
  const hasPriceRange =
    isProduct &&
    productPriceMode === "manual" &&
    optionPrices.some((price) => price !== displayedUnitPrice);
  const isOutOfStock =
    isSoldOut ||
    (isProduct &&
      productOptions.length > 0 &&
      productOptions.every(
        (option) => Number(option.remaining_stock ?? option.quantity ?? 0) <= 0,
      ));
  const remainingStock = getArtworkRemainingStock(artwork);
  const orderLimit = getArtworkOrderLimit(artwork);
  const isCustom =
    String(artwork?.product_type || "")
      .trim()
      .toLowerCase() === "customize";
  const maxBuyable = orderLimit !== null && !isCustom ? orderLimit : 999999;
  const detailCategory = getArtworkDetailCategory(
    artwork.art_type,
    artwork.product,
  );

  const similarArtworks = getSimilarArtworks(artwork, artworks);

  const handleAddToCart = async (
    artworkId,
    quantity = 1,
    selectedProducts = undefined,
    orderNote = undefined,
    targetArtwork = artwork,
  ) => {
    try {
      setAddingToCart(true);
      const result = await addToCart(
        artworkId,
        quantity,
        selectedProducts,
        orderNote,
      );
      setIsInCart(true);
      setCartMessage("Added to cart");
      let chatNotice = "";
      let chatSeverity = "success";
      if (typeof orderNote === "string" && orderNote.trim()) {
        try {
          const { previewFailed } = await sendOrderNoteToSeller({
            artwork: targetArtwork,
            artworkId,
            quantity,
            selectedProducts,
            orderNote,
          });
          if (previewFailed) {
            chatNotice = " The order note was sent to the seller, but its preview could not be attached.";
            chatSeverity = "warning";
          } else {
            chatNotice = " The order note and product preview were sent to the seller chat.";
          }
        } catch (chatError) {
          console.error("Unable to send order note to seller chat:", chatError);
          chatNotice = ` The note was saved in your cart but could not be sent to seller chat: ${chatError.message}`;
          chatSeverity = "warning";
        }
      }
      showSnackbar(`${result?.message || "Artwork added to cart"}${chatNotice}`, chatSeverity);
      return result;
    } catch (error) {
      const soldOut = error.status === 409 && /sold out/i.test(error.message);
      if (soldOut) {
        setArtwork((current) =>
          current ? { ...current, is_sold_out: 1 } : current,
        );
      }
      setCartMessage(
        error.status === 409 ? (soldOut ? "Sold out" : "Already in cart") : "",
      );
      showSnackbar(
        error.message || "Unable to add artwork to cart",
        error.status === 409 ? "warning" : "error",
      );
      throw error;
    } finally {
      setAddingToCart(false);
    }
  };

  const handleRemoveFromCart = async () => {
    if (isRemovingFromCart) return;
    try {
      setIsRemovingFromCart(true);
      await removeFromCart(artwork.artwork_id || artwork.id);
      setIsInCart(false);
      setCartMessage("Removed from cart");
      showSnackbar("Artwork removed from cart", "success");
    } catch (error) {
      showSnackbar(
        error.message || "Unable to remove artwork from cart",
        "error",
      );
    } finally {
      setIsRemovingFromCart(false);
    }
  };

  // Snackbar handlers
  const showSnackbar = (message, severity = "success") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const closeSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "success":
        return "success.light";
      case "warning":
        return "warning.light";
      case "error":
        return "error.light";
      default:
        return "primary.light";
    }
  };

  return (
    <Container
      maxWidth="xl"
      sx={{ py: { xs: 2.5, sm: 4, md: 6 }, px: { xs: 2, sm: 3, lg: 5 } }}
    >
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Details</title>
      </Helmet>
      <Grid container spacing={{ xs: 2.5, md: 4 }} alignItems="flex-start">
        <Grid size={{ xs: 12, md: 7 }}>
          <WatermarkedArtworkImage
            image={artwork.image || imageUrl}
            alt={artwork.title}
            variant="web"
            fallbackSrc={unavailableImageSrc}
            hideWhenBlurred
            sx={{
              width: "100%",
              height: {
                xs: "min(72vh, 560px)",
                sm: "min(78vh, 700px)",
                md: "min(82vh, 760px)",
              },
              maxWidth: "100%",
              mx: "auto",
              borderRadius: { xs: 2, md: 3 },
              border: "1px solid",
              borderColor: "divider",
              backgroundColor: "action.hover",
              objectFit: "contain",
              display: "block",
              cursor: "zoom-in",
              "&:focus-visible": {
                outline: "3px solid",
                outlineColor: "primary.main",
                outlineOffset: 3,
              },
            }}
            onClick={() => setImageViewerOpen(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                setImageViewerOpen(true);
              }
            }}
          />
          {String(artwork.product_type || "")
            .trim()
            .toLowerCase() === "customize" && (
            <Box
              sx={{
                mt: 2,
                p: { xs: 1.5, sm: 2 },
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                backgroundColor: "background.paper",
              }}
            >
              <WatermarkedArtworkImage
                image={
                  artwork.product_sample_image || artwork.image || imageUrl
                }
                alt={`${artwork.title} product sample`}
                variant="web"
                sx={{
                  width: "100%",
                  maxHeight: { xs: 280, sm: 380 },
                  borderRadius: 2,
                  objectFit: "contain",
                  display: "block",
                  bgcolor: "action.hover",
                }}
              />
            </Box>
          )}
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Box
            sx={{
              width: "100%",
              maxWidth: 600,
              mx: { xs: "auto", md: 0 },
              p: { xs: 2, sm: 2.5, md: 3 },
              border: "1px solid",
              borderColor: "divider",
              borderRadius: { xs: 2, md: 3 },
              backgroundColor: "background.paper",
              boxShadow: { xs: 0, md: 1 },
            }}
          >
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip
                label={artwork.genre}
                size="small"
                variant="outlined"
                sx={{ fontWeight: "bold", borderRadius: 2, px: 1 }}
              />
              <Chip
                label={
                  isOutOfStock
                    ? "Sold out"
                    : isCustom
                      ? "Made to order"
                      : "Available"
                }
                size="small"
                color={
                  isOutOfStock ? "default" : isCustom ? "info" : "success"
                }
                sx={{
                  fontWeight: "bold",
                  color: isOutOfStock ? undefined : "#fff",
                }}
              />
              {!isOutOfStock && remainingStock !== null && !isCustom && (
                <Chip
                  label={`${remainingStock} in stock`}
                  size="small"
                  variant="outlined"
                  color={remainingStock <= 5 ? "warning" : "default"}
                  sx={{ fontWeight: "bold" }}
                />
              )}
            </Stack>
            <Typography
              variant="h3"
              fontWeight={800}
              sx={{
                mt: 2,
                mb: 1,
                lineHeight: 1.1,
                fontSize: { xs: "2rem", sm: "2.5rem", md: "2.8rem" },
                overflowWrap: "anywhere",
              }}
            >
              {artwork.title}
            </Typography>
            <Typography variant="subtitle2" color="text.secondary">
              By{" "}
              <Tooltip
                arrow
                placement="top"
                title={
                  <Box sx={{ maxWidth: 280, py: 0.25 }}>
                    <Typography
                      variant="subtitle2"
                      fontWeight={700}
                      color="inherit"
                    >
                      {artwork.shop_name || artwork.artist || "Unknown artist"}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="inherit"
                      sx={{ mt: 0.5 }}
                    >
                      {artwork.shop_description?.trim() ||
                        [artwork.course, artwork.year_level]
                          .filter(Boolean)
                          .join(" · ") ||
                        "View this artist’s profile to learn more about their work."}
                    </Typography>
                  </Box>
                }
              >
                <Box
                  component={RouterLink}
                  to={`/buyer/seller/${encodeURIComponent(artwork.student_id)}`}
                  sx={{
                    color: "inherit",
                    minHeight: 32,
                    display: "inline-flex",
                    alignItems: "center",
                    fontWeight: 700,
                    textDecoration: "none",
                    "&:hover": {
                      color: "primary.main",
                      textDecoration: "underline",
                    },
                  }}
                >
                  {artwork.shop_name || artwork.artist || "Unknown artist"}
                </Box>
              </Tooltip>
            </Typography>
            {artwork.art_type === "customize" && artwork.exact_art_type && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                Art type: {artwork.exact_art_type}
              </Typography>
            )}

            <Typography
              variant="h4"
              sx={{
                mt: 2,
                mb: 2,
                fontWeight: 700,
                fontSize: { xs: "1.8rem", sm: "2rem", md: "2.2rem" },
              }}
            >
              {hasPriceRange ? "From " : ""}₱
              {displayedUnitPrice.toLocaleString()}
            </Typography>
            <Box
              sx={{ borderTop: "1px solid", borderColor: "divider", pt: 2.5 }}
            >
              <Stack spacing={1.5}>
                <Row
                  label="Medium"
                  value={formatAndCapitalize(artwork.mediums_used)}
                />
                <Row label="Size" value={artwork.art_size || "Unknown"} />
                <Row label="Style" value={artwork.genre || "Unknown"} />
                {detailCategory && (
                  <ArtworkAdditionalDetails
                    artwork={artwork}
                    category={detailCategory}
                    RowComponent={Row}
                  />
                )}
              </Stack>
              {isProduct && isOutOfStock && (
                <Typography
                  variant="body2"
                  sx={{
                    mt: 2,
                    mb: 1,
                    color: "error.main",
                    fontWeight: 600,
                    textAlign: "center",
                  }}
                >
                  Out of Stock
                </Typography>
              )}
              {!isOutOfStock && !isInCart && !(isProduct && productOptions.length > 0) && (
                <Box
                  sx={{
                    mt: 2,
                    p: 1.5,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark"
                        ? "rgba(255, 255, 255, 0.03)"
                        : "rgba(0, 0, 0, 0.02)",
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Box>
                      <Typography variant="body2" fontWeight={700}>
                        Quantity
                      </Typography>
                      {remainingStock !== null && !isCustom ? (
                        <Typography variant="caption" color="text.secondary">
                          {remainingStock} available
                          {orderLimit !== null && orderLimit < remainingStock
                            ? ` (Limit: ${orderLimit} per order)`
                            : ` (Max: ${remainingStock})`}
                        </Typography>
                      ) : isCustom ? (
                        <Typography variant="caption" color="text.secondary">
                          Custom order (Made to order)
                        </Typography>
                      ) : null}
                    </Box>
                    <Stack direction="row" alignItems="center" spacing={0.75}>
                      <IconButton
                        size="small"
                        disabled={orderQuantity <= 1 || addingToCart}
                        onClick={() =>
                          setOrderQuantity((prev) => Math.max(1, prev - 1))
                        }
                        sx={{
                          border: "1px solid",
                          borderColor: "divider",
                          width: 32,
                          height: 32,
                        }}
                        aria-label="Decrease quantity"
                      >
                        <RemoveIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                      <TextField
                        size="small"
                        type="number"
                        value={orderQuantity}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === "") {
                            setOrderQuantity(1);
                            return;
                          }
                          const val = Number(raw);
                          if (Number.isSafeInteger(val)) {
                            setOrderQuantity(
                              Math.min(Math.max(1, val), maxBuyable),
                            );
                          }
                        }}
                        inputProps={{
                          min: 1,
                          max: maxBuyable,
                          style: {
                            textAlign: "center",
                            width: 38,
                            padding: "4px 4px",
                            fontWeight: 700,
                            fontSize: "0.95rem",
                          },
                        }}
                        sx={{
                          width: 52,
                          "& .MuiOutlinedInput-root": {
                            borderRadius: 1.5,
                            height: 32,
                          },
                          "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button":
                            {
                              display: "none",
                            },
                          "& input[type=number]": {
                            MozAppearance: "textfield",
                          },
                        }}
                      />
                      <IconButton
                        size="small"
                        disabled={
                          (maxBuyable < 999999 &&
                            orderQuantity >= maxBuyable) ||
                          addingToCart
                        }
                        onClick={() => {
                          setOrderQuantity((prev) =>
                            Math.min(maxBuyable, prev + 1),
                          );
                        }}
                        sx={{
                          border: "1px solid",
                          borderColor: "divider",
                          width: 32,
                          height: 32,
                        }}
                        aria-label="Increase quantity"
                      >
                        <AddIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Stack>
                  </Stack>
                </Box>
              )}
              <Stack direction="column" spacing={1} sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  color="error"
                  fullWidth
                  disabled={
                    addingToCart ||
                    isRemovingFromCart ||
                    (isOutOfStock && !isInCart)
                  }
                  onClick={() => {
                    if (isInCart) {
                      void handleRemoveFromCart();
                      return;
                    }
                    if (isProduct && productOptions.length > 0) {
                      setProductDialogOpen(true);
                      return;
                    }
                    setCustomizeDialogOpen(true);
                  }}
                  startIcon={
                    addingToCart || isRemovingFromCart ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : isInCart ? (
                      <RemoveShoppingCart />
                    ) : (
                      <ShoppingBag />
                    )
                  }
                  sx={{
                    minHeight: 48,
                    py: 1.5,
                    borderRadius: 999,
                    textTransform: "none",
                    fontWeight: 600,
                    color: "#fff",
                  }}
                >
                  {addingToCart
                    ? "Adding to cart..."
                    : isRemovingFromCart
                      ? "Removing..."
                      : isInCart
                        ? "Remove from cart"
                        : cartMessage || "Add to cart"}
                </Button>
              </Stack>
            </Box>
          </Box>
        </Grid>
        <Grid size={12}>
          <Paper
            variant="outlined"
            sx={{
              mt: 0,
              p: { xs: 2, sm: 3 },
              borderRadius: { xs: 2, md: 3 },
              borderColor: "divider",
              backgroundColor: "background.paper",
            }}
          >
            <Stack spacing={2.5} divider={<Divider flexItem />}>
              {/* Description Section */}
              <Box>
                <Typography
                  variant="caption"
                  fontWeight={700}
                  color="text.secondary"
                  sx={{
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    display: "block",
                  }}
                >
                  Description
                </Typography>
                <Typography
                  variant="body2"
                  color="text.primary"
                  sx={{
                    mt: 0.75,
                    fontSize: { xs: "0.95rem", sm: "1rem" },
                    lineHeight: 1.75,
                    whiteSpace: "pre-line",
                  }}
                >
                  {artwork.description || "No description provided."}
                </Typography>
              </Box>

              <Box>
                <Typography
                  variant="caption"
                  fontWeight={700}
                  color="text.secondary"
                  sx={{
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    display: "block",
                  }}
                >
                  How to Handle with Care
                </Typography>
                <Typography
                  variant="body2"
                  color="text.primary"
                  sx={{
                    mt: 0.75,
                    fontSize: { xs: "0.95rem", sm: "1rem" },
                    lineHeight: 1.75,
                    whiteSpace: "pre-line",
                  }}
                >
                  {artwork.care_instructions?.trim()
                    ? artwork.care_instructions
                    : "No handling instructions provided."}
                </Typography>
              </Box>

              {/* Colors Section */}
              <Box>
                <Typography
                  variant="caption"
                  fontWeight={700}
                  color="text.secondary"
                  sx={{
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    display: "block",
                  }}
                >
                  Colors Used
                </Typography>
                {colorsList.length > 0 ? (
                  <Stack
                    direction="row"
                    flexWrap="wrap"
                    gap={0.8}
                    sx={{ mt: 1 }}
                  >
                    {colorsList.map((c) => (
                      <Chip
                        key={`color-${formatAndCapitalize(c)}`}
                        label={formatAndCapitalize(c)}
                        size="small"
                        variant="outlined"
                        sx={{
                          borderRadius: 999,
                          fontSize: "0.75rem",
                          ...getColorChipStyles(c),
                          fontWeight: "bold",
                        }}
                      />
                    ))}
                  </Stack>
                ) : (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.5 }}
                  >
                    N/A
                  </Typography>
                )}
              </Box>

              {/* Mediums Section */}
              <Box>
                <Typography
                  variant="caption"
                  fontWeight={700}
                  color="text.secondary"
                  sx={{
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    display: "block",
                  }}
                >
                  Mediums Used
                </Typography>
                {mediumsList.length > 0 ? (
                  <Stack
                    direction="row"
                    flexWrap="wrap"
                    gap={0.8}
                    sx={{ mt: 1 }}
                  >
                    {mediumsList.map((m) => (
                      <Chip
                        key={`medium-${formatAndCapitalize(m)}`}
                        label={formatAndCapitalize(m)}
                        size="small"
                        variant="outlined"
                        sx={{
                          borderRadius: 999,
                          fontSize: "0.75rem",
                          backgroundColor: "theme.palette.background.chip",
                          fontWeight: "bold",
                        }}
                      />
                    ))}
                  </Stack>
                ) : (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.5 }}
                  >
                    N/A
                  </Typography>
                )}
              </Box>

              {/* Detected Features Section */}
              <Box>
                <Typography
                  variant="caption"
                  fontWeight={700}
                  color="text.secondary"
                  sx={{
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    display: "block",
                  }}
                >
                  Detected Features
                </Typography>
                {featuresList.length > 0 ? (
                  <Stack
                    direction="row"
                    flexWrap="wrap"
                    gap={0.8}
                    sx={{ mt: 1 }}
                  >
                    {featuresList.map((f) => (
                      <Chip
                        key={`feature-${formatAndCapitalize(f)}`}
                        label={formatAndCapitalize(f)}
                        size="small"
                        variant="outlined"
                        sx={{
                          borderRadius: 999,
                          fontSize: "0.75rem",
                          backgroundColor: "theme.palette.background.chip",
                          fontWeight: "bold",
                        }}
                      />
                    ))}
                  </Stack>
                ) : (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.5 }}
                  >
                    N/A
                  </Typography>
                )}
              </Box>
            </Stack>
          </Paper>
        </Grid>
        <ProductSelectionDialog
          open={productDialogOpen}
          artwork={artwork}
          onClose={() => setProductDialogOpen(false)}
          onConfirm={async (selectedProducts, totalQuantity, orderNote) => {
            await handleAddToCart(
              artwork.artwork_id || artwork.id,
              totalQuantity,
              selectedProducts,
              orderNote,
            );
            setProductDialogOpen(false);
          }}
          isSubmitting={addingToCart}
        />
        <CustomizeOrderDialog
          open={customizeDialogOpen}
          artwork={artwork}
          initialQuantity={orderQuantity}
          isCustomizable={
            String(artwork?.product_type || "")
              .trim()
              .toLowerCase() === "customize"
          }
          onClose={() => setCustomizeDialogOpen(false)}
          onConfirm={(orderNote, qty) =>
            handleAddToCart(
              artwork.artwork_id || artwork.id,
              qty || orderQuantity || 1,
              undefined,
              orderNote,
            )
          }
          isSubmitting={addingToCart}
        />
      </Grid>

      <ArtworkReviews artworkId={artwork.artwork_id || artwork.id} />

      <Dialog
        TransitionComponent={Transition}
        open={imageViewerOpen}
        onClose={() => setImageViewerOpen(false)}
        maxWidth="lg"
        fullWidth
        aria-labelledby="artwork-image-dialog-title"
      >
        <DialogTitle
          id="artwork-image-dialog-title"
          sx={{
            position: "relative",
            px: { xs: 2, sm: 3 },
            py: 2.5,
            color: "text.primary",
            fontSize: { xs: 15, sm: 16 },
            fontWeight: 700,
          }}
        >
          <IconButton
            onClick={() => setImageViewerOpen(false)}
            aria-label="Close artwork image"
            sx={{
              position: "absolute",
              top: "50%",
              right: 8,
              transform: "translateY(-50%)",
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            p: { xs: 1, sm: 2 },
            overflow: "hidden",
          }}
        >
          <WatermarkedArtworkImage
            image={artwork.image || imageUrl}
            alt={artwork.title}
            variant="web"
            hideWhenBlurred
            sx={{
              display: "block",
              maxWidth: "100%",
              maxHeight: "calc(100vh - 140px)",
              objectFit: "contain",
            }}
          />
        </DialogContent>
      </Dialog>

      {similarArtworks.length > 0 && (
        <Box
          component="section"
          aria-labelledby="similar-artworks-title"
          sx={{ mt: { xs: 5, md: 7 } }}
        >
          <Typography
            id="similar-artworks-title"
            variant="h5"
            fontWeight={700}
            mb={3}
          >
            Similar artworks
          </Typography>

          <Grid container spacing={3}>
            {similarArtworks.map((item) => (
              <Grid
                size={{ xs: 12, sm: 6, md: 3 }}
                key={item.id || item.artwork_id}
              >
                <ArtworkCard artwork={item} onAddToCart={handleAddToCart} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
      <RelatedArtists
        artists={relatedArtists}
        eyebrow="Similar style and medium"
        description="Discover artists whose artworks share this artwork’s style or medium. Artists matching both appear first."
      />
      {/* Snackbar Notification */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        TransitionComponent={Transition}
      >
        <Alert
          onClose={closeSnackbar}
          severity={snackbarSeverity}
          variant="filled"
          sx={{
            width: { xs: 280, sm: 360 },
            minHeight: 48,
            borderRadius: 2,
            boxShadow: "0 10px 28px rgba(15, 23, 42, 0.18)",
            backgroundColor: getSeverityColor(snackbarSeverity),
            color: "#fff",
            alignItems: "center",
            "& .MuiAlert-icon": {
              color: "#fff",
              mr: 1,
            },
            "& .MuiAlert-message": {
              fontWeight: 600,
              fontSize: 14,
              display: "flex",
              alignItems: "center",
            },
            "& .MuiAlert-action": {
              alignItems: "center",
              paddingLeft: 1,
              color: "#fff",
            },
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}

function Row({ label, value }) {
  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      columnGap={{ xs: 2, sm: 3 }}
    >
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ flexShrink: 0, fontSize: { xs: "0.85rem", sm: "0.9rem" } }}
      >
        {label}
      </Typography>

      <Typography
        component="div"
        variant="body2"
        fontWeight={600}
        sx={{
          textAlign: "right",
          minWidth: 0,
          overflowWrap: "anywhere",
          fontSize: { xs: "0.85rem", sm: "0.9rem" },
        }}
      >
        {value || "-"}
      </Typography>
    </Stack>
  );
}
