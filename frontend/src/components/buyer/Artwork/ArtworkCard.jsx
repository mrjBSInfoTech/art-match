import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Box,
  CircularProgress,
  IconButton,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";

import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import RemoveShoppingCartOutlinedIcon from "@mui/icons-material/RemoveShoppingCartOutlined";
import StarRateRoundedIcon from "@mui/icons-material/StarRateRounded";

import { addToCart } from "../../../api/buyer/cartAPI";
import { toggleFavorite } from "../../../api/buyer/favoriteAPI";
import { sendOrderNoteToSeller } from "../../../utils/orderNoteMessaging";
import WatermarkedArtworkImage from "./WatermarkedArtworkImage";
import { isArtworkSoldOut } from "../../../utils/artworkAvailability";
import ProductSelectionDialog from "./ProductSelectionDialog";
import CustomizeOrderDialog from "./CustomizeOrderDialog";
import { getSavedProductOptions } from "../../../utils/productOptions";
import { isAuthenticated } from "../../../../utils/auth";

export default function ArtworkCard({
  artwork,
  showAddToCart = true,
  onAddToCart,
  isInCart = false,
  onRemoveFromCart,
  onOpen,
  isFavorite: propIsFavorite,
  onToggleFavorite,
}) {
  const navigate = useNavigate();
  const theme = useTheme();
  const darkMode = theme.palette.mode === "dark";

  if (!artwork) return null;

  const artworkId = artwork?.id || artwork?.artwork_id;
  const hasImage = Boolean(artwork.image);
  const status = String(artwork.status || "").toLowerCase();
  const soldOut = isArtworkSoldOut(artwork) || Number(artwork.is_sold_out) === 1;
  const badge = soldOut
    ? "Sold out"
    : status === "available" || status === "for sale"
      ? "For Sale"
      : artwork.genre || "Artwork";

  const rawRating = Number(artwork.average_rating ?? artwork.rating);
  const hasRating = Number.isFinite(rawRating) && rawRating > 0;
  const ratingCount = Number(artwork.rating_count ?? artwork.total_reviews);

  const artistName =
    artwork.shop_name?.trim() || artwork.artist?.trim() || "Independent Artist";
  const deptOrGenre = artwork.department || artwork.course || artwork.genre;
  const subtitle = deptOrGenre ? `${artistName} (${deptOrGenre})` : artistName;

  // Favorites state: controlled via prop or managed internally
  const [internalFavorite, setInternalFavorite] = useState(false);
  const isFavorite = propIsFavorite !== undefined ? propIsFavorite : internalFavorite;

  const [isAdding, setIsAdding] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [customizeDialogOpen, setCustomizeDialogOpen] = useState(false);

  const isCustomize =
    String(artwork?.product_type || "").trim().toLowerCase() === "customize";
  const isProduct =
    String(artwork?.art_type || "").trim().toLowerCase() === "product";
  const productOptions = getSavedProductOptions(artwork);

  const handleFavoriteClick = async (e) => {
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(artworkId);
      return;
    }
    if (!isAuthenticated("buyer")) {
      navigate("/buyer/login");
      return;
    }
    try {
      const result = await toggleFavorite(artworkId);
      setInternalFavorite(Boolean(result?.isFavorite));
    } catch (err) {
      console.error("Unable to update favorite:", err);
    }
  };

  const handleCardClick = () => {
    if (onOpen) {
      onOpen(artwork);
    } else {
      navigate(`/buyer/artwork/view/${artworkId}`);
    }
  };

  const submitOrder = async (quantity, selectedProducts, orderNote) => {
    if (onAddToCart) {
      return onAddToCart(artworkId, quantity, selectedProducts, orderNote, artwork);
    }

    const result = await addToCart(artworkId, quantity, selectedProducts, orderNote);
    if (typeof orderNote === "string" && orderNote.trim()) {
      try {
        await sendOrderNoteToSeller({
          artwork,
          artworkId,
          quantity,
          selectedProducts,
          orderNote,
        });
      } catch (error) {
        console.error("Unable to send order note to seller chat:", error);
      }
    }
    return result;
  };

  const handleAddSelectedProducts = async (
    selectedProducts,
    totalQuantity,
    orderNote,
  ) => {
    try {
      setIsAdding(true);
      await submitOrder(totalQuantity, selectedProducts, orderNote);
      setProductDialogOpen(false);
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddPremadeSelection = async (orderNote) => {
    setIsAdding(true);
    try {
      await submitOrder(1, undefined, orderNote);
    } finally {
      setIsAdding(false);
    }
  };

  const handleCartClick = (e) => {
    e.stopPropagation();
    if (isAdding || soldOut) return;
    if (!isAuthenticated("buyer")) {
      navigate("/buyer/login");
      return;
    }
    if (isInCart && onRemoveFromCart) {
      setIsAdding(true);
      Promise.resolve(onRemoveFromCart(artworkId)).finally(() => setIsAdding(false));
      return;
    }
    if (isProduct && productOptions.length > 0) {
      setProductDialogOpen(true);
      return;
    }
    if (isCustomize) {
      setCustomizeDialogOpen(true);
      return;
    }
    handleAddPremadeSelection();
  };

  return (
    <>
      <Box
        sx={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          overflow: "hidden",
          border: "1px solid",
          borderColor: darkMode
            ? "rgba(255, 255, 255, 0.08)"
            : "rgba(15, 23, 42, 0.08)",
          borderRadius: 3,
          backgroundColor: "background.paper",
          boxShadow: darkMode
            ? "0 4px 16px rgba(0, 0, 0, 0.28)"
            : "0 4px 16px rgba(15, 23, 42, 0.04)",
          transition:
            "border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease",
          cursor: "pointer",
          "&:focus-within": {
            outline: "2px solid",
            outlineColor: "primary.main",
            outlineOffset: 2,
          },
          "@media (hover: hover)": {
            "&:hover": {
              transform: "translateY(-4px)",
              boxShadow: darkMode
                ? "0 10px 28px rgba(0, 0, 0, 0.45)"
                : "0 10px 24px rgba(15, 23, 42, 0.08)",
              borderColor: darkMode
                ? "rgba(255, 255, 255, 0.16)"
                : "rgba(15, 23, 42, 0.16)",
            },
          },
          "@media (prefers-reduced-motion: reduce)": {
            transition: "none",
          },
        }}
        onClick={handleCardClick}
      >
        {/* Artwork Image Container */}
        <Box
          sx={{
            position: "relative",
            display: "flex",
            width: "100%",
            aspectRatio: "1.05 / 1",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            backgroundColor: darkMode ? "#1e293b" : "#f1ede7",
          }}
        >
          <WatermarkedArtworkImage
            image={artwork.image}
            alt={artwork.title || "Artwork"}
            variant="thumb"
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

          {/* Badge (e.g. For Sale, Sold out) on upper left */}
          <Typography
            component="span"
            sx={{
              position: "absolute",
              top: 10,
              left: 10,
              maxWidth: "calc(100% - 70px)",
              overflow: "hidden",
              px: 1.25,
              py: 0.4,
              borderRadius: 999,
              backgroundColor: soldOut ? "text.secondary" : "#ef3340",
              color: "#fff",
              fontSize: 11,
              fontWeight: 800,
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
              zIndex: 1,
            }}
          >
            {badge}
          </Typography>

          {/* Favorite Pill Button on Upper Right */}
          <Box
            sx={{
              position: "absolute",
              top: 10,
              right: 10,
              zIndex: 2,
            }}
          >
            <IconButton
              aria-label={
                isFavorite ? "Remove from favorites" : "Add to favorites"
              }
              title={isFavorite ? "Remove from favorites" : "Add to favorites"}
              onClick={handleFavoriteClick}
              sx={{
                width: 36,
                height: 36,
                borderRadius: 999,
                backgroundColor: darkMode
                  ? "rgba(30, 41, 59, 0.92)"
                  : "#ffffff",
                color: isFavorite ? "#ef3340" : "text.secondary",
                boxShadow: "0 3px 10px rgba(0, 0, 0, 0.14)",
                backdropFilter: "blur(4px)",
                border: "1px solid",
                borderColor: darkMode
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(15, 23, 42, 0.06)",
                transition:
                  "transform 150ms ease, background-color 150ms ease, color 150ms ease",
                "&:hover": {
                  transform: "scale(1.08)",
                  backgroundColor: darkMode ? "#1e293b" : "#ffffff",
                  color: "#ef3340",
                },
              }}
            >
              {isFavorite ? (
                <FavoriteIcon sx={{ fontSize: 20, color: "#ef3340" }} />
              ) : (
                <FavoriteBorderIcon sx={{ fontSize: 20 }} />
              )}
            </IconButton>
          </Box>
        </Box>

        {/* Card Content Area */}
        <Box
          sx={{
            p: { xs: 1.5, sm: 2 },
            display: "flex",
            flex: 1,
            flexDirection: "column",
            gap: 0.5,
          }}
        >
          {/* Row 1: Title on the left, Rating on the right */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={1}
          >
            <Typography
              title={artwork.title || "Untitled artwork"}
              sx={{
                minWidth: 0,
                flex: 1,
                color: "text.primary",
                fontSize: { xs: 15, sm: 16 },
                fontWeight: 800,
                lineHeight: 1.3,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {artwork.title || "Untitled artwork"}
            </Typography>

            {hasRating && (
              <Stack
                direction="row"
                alignItems="center"
                spacing={0.4}
                sx={{ flexShrink: 0 }}
                title={
                  ratingCount > 0
                    ? `${ratingCount} review${ratingCount > 1 ? "s" : ""}`
                    : undefined
                }
              >
                <StarRateRoundedIcon sx={{ color: "#f59e0b", fontSize: 20 }} />
                <Typography
                  sx={{
                    fontSize: 13.5,
                    fontWeight: 700,
                    color: "text.primary",
                  }}
                >
                  {rawRating.toFixed(1)}
                </Typography>
              </Stack>
            )}
          </Stack>

          {/* Row 2: Artist & Department/Genre */}
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontSize: 12.5,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {subtitle}
          </Typography>

          {/* Spacer */}
          <Box sx={{ flex: 1, minHeight: 10 }} />

          {/* Row 3: Price on the left, Add to Cart icon button on the lower right */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ pt: 1 }}
          >
            <Typography
              sx={{
                color: "#ef3340",
                fontSize: { xs: 17, sm: 18 },
                fontWeight: 800,
              }}
              noWrap
            >
              ₱{Number(artwork.price || 0).toLocaleString()}
            </Typography>

            {showAddToCart && (
              <IconButton
                aria-label={isInCart ? "Remove from cart" : "Add to cart"}
                title={soldOut && !isInCart ? "Sold out" : isInCart ? "Remove from cart" : "Add to cart"}
                disabled={(soldOut && !isInCart) || isAdding}
                onClick={handleCartClick}
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2.5,
                  border: "1px solid",
                  borderColor: darkMode
                    ? "rgba(255, 255, 255, 0.15)"
                    : "rgba(15, 23, 42, 0.12)",
                  backgroundColor: darkMode
                    ? "rgba(30, 41, 59, 0.6)"
                    : "#ffffff",
                  color: "text.primary",
                  boxShadow: darkMode
                    ? "0 2px 6px rgba(0,0,0,0.2)"
                    : "0 2px 6px rgba(15, 23, 42, 0.04)",
                  transition: "all 150ms ease",
                  "&:hover": {
                    backgroundColor: darkMode
                      ? "rgba(51, 65, 85, 0.8)"
                      : "#f8fafc",
                    borderColor: "#ef3340",
                    color: "#ef3340",
                    transform: "scale(1.05)",
                  },
                  "&:disabled": {
                    opacity: 0.45,
                  },
                }}
              >
                {isAdding ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  isInCart
                    ? <RemoveShoppingCartOutlinedIcon sx={{ fontSize: 20 }} />
                    : <ShoppingCartOutlinedIcon sx={{ fontSize: 20 }} />
                )}
              </IconButton>
            )}
          </Stack>
        </Box>
      </Box>

      {/* Product Selection & Customization Dialogs */}
      <ProductSelectionDialog
        open={productDialogOpen}
        artwork={artwork}
        onClose={() => setProductDialogOpen(false)}
        onConfirm={handleAddSelectedProducts}
        isSubmitting={isAdding}
      />
      <CustomizeOrderDialog
        open={customizeDialogOpen}
        artwork={artwork}
        isCustomizable={isCustomize}
        onClose={() => setCustomizeDialogOpen(false)}
        onConfirm={handleAddPremadeSelection}
        isSubmitting={isAdding}
      />
    </>
  );
}
