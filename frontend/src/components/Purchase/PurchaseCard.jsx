import React, { useState } from "react";
import {
  Box,
  Card,
  Button,
  CardMedia,
  CardContent,
  Typography,
  TextField,
  IconButton,
  Menu,
  MenuItem,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";

export default function ProductCard({ product, onEdit, onDelete, onAddToCart }) {
  const [count, setCount] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  // Open/Close menu handlers
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <Card
      sx={{
        maxWidth: 300,
        height: "100%",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: (theme) => theme.shadows[4],
        },
      }}
    >
      {/* 🖼 Product Image */}
      <Box
        sx={{
          width: "100%",
          height: 200,
          position: "relative",
          backgroundColor: "#f5f5f5",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CardMedia
          component="img"
          sx={{
            width: "100%",
            height: "100%",
            objectFit: "cover", // This will make the image cover the entire space
            objectPosition: "center", // Center the image
          }}
          image={
            product.image
              ? `http://localhost:5000/uploads/uploadProducts/${encodeURIComponent(product.image)}`
              : "https://via.placeholder.com/250x150?text=No+Image"
          }
          onError={(e) => {
            console.error("Image failed to load:", product.image);
            e.target.onerror = null; // Prevent infinite loop
            e.target.src = "https://via.placeholder.com/250x150?text=No+Image";
          }}
          alt={product.name}
        />
      </Box>

      {/* 🧾 Product Details */}
      <CardContent sx={{ flex: 1, overflow: "auto" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            mb: 1,
          }}
        >
          <Typography variant="h5" sx={{ flex: 1, mr: 1, fontWeight: "bold" }}>
            {product.name}
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary">
          Category: {product.category_name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Stock: {product.stock}
        </Typography>
        <Typography variant="h6" sx={{ flex: 1, mr: 1, mt: 1 }}>
          {product.price}
        </Typography>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            width: "100%", // important to center inside the page or container
            mt: 2,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              padding: "8px 16px",
              borderRadius: "8px",
              width: "fit-content",
            }}
          >
            <IconButton
              color="error"
              onClick={() => setCount((prev) => Math.max(prev - 1, 0))}
            >
              <RemoveIcon />
            </IconButton>

            <TextField
              value={count}
              onChange={(e) => {
                const num = Number(e.target.value);
                if (!isNaN(num) && num >= 0) setCount(num);
              }}
              type="number"
              size="small"
              sx={{
                width: "100px",
                "& input": {
                  textAlign: "center",
                },
                // 🔥 Remove arrows (Chrome, Edge, Safari)
                "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button":
                  {
                    display: "none",
                  },
                // 🔥 Remove arrows (Firefox)
                "& input[type=number]": {
                  MozAppearance: "textfield",
                },
              }}
            />

            <IconButton
              color="primary"
              onClick={() => setCount((prev) => prev + 1)}
            >
              <AddIcon />
            </IconButton>
          </Box>
          <Button
            variant="contained"
            color="primary"
            sx={{ mt: 2, width: "100%" }}
            onClick={() => {
              if (count > 0 && onAddToCart) {
                onAddToCart(product, count);
                setCount(0);
              }
            }}
            disabled={count < 1}
          >
            Add to Cart
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
