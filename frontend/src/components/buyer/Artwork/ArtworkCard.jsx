import { Link as RouterLink } from "react-router-dom";
import { useState } from "react";
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

export default function ArtworkCard({ artwork, showAddToCart = true, onAddToCart }) {
  const artworkId = artwork?.id || artwork?.artwork_id;
  const [isAdding, setIsAdding] = useState(false);
  const [cartMessage, setCartMessage] = useState("");

  const handleAddToCart = async () => {
    if (isAdding) return;
    try {
      setIsAdding(true);
      await (onAddToCart ? onAddToCart(artworkId) : addToCart(artworkId));
      setCartMessage("Added");
    } catch (error) {
      setCartMessage(error.message || "Failed");
    } finally {
      setIsAdding(false);
    }
  };
  
  return (
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
          image={`http://localhost:5000/uploads/seller/uploadArtwork/${encodeURIComponent(artwork.image)}`}
          sx={{
            display: "block",
            aspectRatio: "4 / 5",
            bgcolor: "#f2f2f2",
          }}
        />

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

        <Stack direction="row" spacing={1} sx={{ mt: 0.5}}>
          <Chip
            label={artwork.genre}
            size="small"
            variant="outlined"
            component={RouterLink}
            to={`/buyer/artwork/${encodeURIComponent(artwork.genre || "")}`}
            clickable
            sx={{ fontWeight: "bold", borderRadius: 2, px: 1, textDecoration: "none" }}
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
              disabled={isAdding}
              sx={{ fontSize: 10 }}
            >
              {isAdding ? "Adding..." : cartMessage || "Add to Cart"}
            </Button>
          ) : (
            <Button
              sx={{fontSize: 10}}
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
  );
}