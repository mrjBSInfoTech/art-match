import { Link as RouterLink } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Card,
  CardMedia,
  CardContent,
  Typography,
  Box,
  IconButton,
  Button,
  Stack,
  Chip,
} from "@mui/material";

import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import { addToCart } from "../../../api/buyer/cartAPI";
import WatermarkedArtworkImage from "./WatermarkedArtworkImage";
import { isArtworkSoldOut } from "../../../utils/artworkAvailability";
import ProductSelectionDialog from "./ProductSelectionDialog";
import { getSavedProductOptions } from "../../../utils/productOptions";

export default function ArtworkCard({
  artwork,
  showAddToCart = true,
  onAddToCart,
}) {
  const artworkId = artwork?.id || artwork?.artwork_id;
  const isSoldOut = isArtworkSoldOut(artwork);
  const productOptions = getSavedProductOptions(artwork);
  const [isAdding, setIsAdding] = useState(false);
  const [cartMessage, setCartMessage] = useState("");
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  useEffect(() => {
    if (!cartMessage) return;
    const timeoutId = setTimeout(() => setCartMessage(""), 1000);
    return () => clearTimeout(timeoutId);
  }, [cartMessage]);

  const handleAddToCart = async () => {
    if (isAdding || isSoldOut) return;
    if (productOptions.length) {
      setProductDialogOpen(true);
      return;
    }
    try {
      setIsAdding(true);
      await (onAddToCart ? onAddToCart(artworkId) : addToCart(artworkId));
      setCartMessage("Added");
    } catch (error) {
      setCartMessage(
        error.status === 409
          ? /sold out/i.test(error.message)
            ? "Sold out"
            : "Already in cart"
          : "Try again",
      );
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddSelectedProducts = async (selectedProducts, totalQuantity, orderNote) => {
    try {
      setIsAdding(true);
      await (onAddToCart
        ? onAddToCart(artworkId, totalQuantity, selectedProducts, orderNote)
        : addToCart(artworkId, totalQuantity, selectedProducts, orderNote));
      setProductDialogOpen(false);
      setCartMessage("Added");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <>
    <Card
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        borderRadius: 2,
        transition: "transform 200ms ease, box-shadow 200ms ease",
        cursor: "pointer",
        "&:hover": {
          transform: "translateY(-6px) scale(1.02)",
          boxShadow: 6,
        },
      }}
    >
      <Box sx={{ position: "relative" }}>
        <CardMedia
          component={RouterLink}
          to={`/buyer/artwork/view/${artworkId}`}
          sx={{
            position: "relative",
            display: "block",
            width: "100%",
            height: 280,
            bgcolor: "#f2f2f2",
            overflow: "hidden",
          }}
        >
          <WatermarkedArtworkImage
            image={artwork.image}
            alt={artwork.title || "Artwork"}
            variant="thumb"
            sx={{
              display: "block",
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </CardMedia>
      </Box>

      <CardContent
        sx={{
          p: 2.5,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 0.5,
        }}
      >
        <Typography
          component={RouterLink}
          to={`/buyer/artwork/view/${artworkId}`}
          sx={{
            fontWeight: 600,
            color: "text.primary",
            textDecoration: "none",
            lineHeight: 1.3,
          }}
        >
          {artwork.title}
        </Typography>

        <Typography variant="body2" color="text.secondary">
          {artwork.artist}
        </Typography>

        <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
          <Chip
            label={artwork.genre}
            size="small"
            variant="outlined"
            component={RouterLink}
            to={`/buyer/shop/${encodeURIComponent(artwork.genre || "")}`}
            clickable
            sx={{
              fontWeight: "bold",
              borderRadius: 2,
              px: 1,
              textDecoration: "none",
            }}
          />
        </Stack>

        <Box sx={{ flex: 1 }} />

        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mt: 2 }}
        >
          <Typography variant="subtitle1" fontWeight="bold">
            ₱{Number(artwork.price || 0).toLocaleString()}
          </Typography>

          {showAddToCart ? (
            <Button
              size="small"
              variant="outlined"
              onClick={handleAddToCart}
              disabled={isAdding || isSoldOut}
              sx={{ fontSize: 10 }}
            >
              {isSoldOut
                ? "Sold out"
                : isAdding
                  ? "Adding..."
                  : cartMessage || (productOptions.length ? "Choose options" : "Add to cart")}
            </Button>
          ) : (
            <Button
              sx={{ fontSize: 10 }}
              variant="text"
              component={RouterLink}
              to={`/buyer/artwork/view/${artworkId}`}
            >
              View Details
            </Button>
          )}
        </Stack>
      </CardContent>
    </Card>
    <ProductSelectionDialog
      open={productDialogOpen}
      artwork={artwork}
      onClose={() => setProductDialogOpen(false)}
      onConfirm={handleAddSelectedProducts}
      isSubmitting={isAdding}
    />
    </>
  );
}
