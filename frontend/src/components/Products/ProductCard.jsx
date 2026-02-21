import React, { useState } from "react";
import {
  Box,
  Card,
  CardMedia,
  CardContent,
  Typography,
  IconButton,
  Menu,
  MenuItem,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

export default function ProductCard({ product, onEdit, onDelete }) {
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
    <Card sx={{ 
        maxWidth: 300,
        height: '100%',
        position: "relative",
        display: "flex",
        flexDirection: "column",
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: (theme) => theme.shadows[4],
        }
      }} >
      {/* 🖼 Product Image */}
      <Box
        sx={{
          width: '100%',
          height: 200,
          position: 'relative',
          backgroundColor: '#f5f5f5',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <CardMedia
          component="img"
          sx={{
            width: '100%',
            height: '100%',
            objectFit: "cover", // This will make the image cover the entire space
            objectPosition: 'center', // Center the image
          }}
          image={
            product.image
              ? `http://localhost:5000/uploads/uploadProducts/${encodeURIComponent(product.image)}`
              : "https://via.placeholder.com/250x150?text=No+Image"
          }
          onError={(e) => {
            console.error('Image failed to load:', product.image);
            e.target.onerror = null; // Prevent infinite loop
            e.target.src = "https://via.placeholder.com/250x150?text=No+Image";
          }}
          alt={product.name}
        />
      </Box>

      {/* 🧾 Product Details */}
      <CardContent sx={{ flex: 1, overflow: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h5" sx={{ flex: 1, mr: 1, fontWeight: 'bold' }}>
            {product.name}
          </Typography>
          <IconButton
            size="small"
            onClick={handleMenuOpen}
            sx={{
              ml: 'auto',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Options Menu */}
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <MenuItem 
            onClick={() => {
              onEdit(product);
              handleMenuClose();
            }}
            sx={{ 
              color: "success.main",
              "&:hover": {
                backgroundColor: "success.light",
                color: "success.contrastText",
              },
            }}
            >
            <EditIcon sx={{ mr: 1, fontSize: "20px" }} />
            Edit
          </MenuItem>
          <MenuItem 
            onClick={() => {
              onDelete(product);
              handleMenuClose();
            }}
            sx={{ 
              color: "error.main",
              "&:hover": {
                backgroundColor: "error.light",
                color: "error.contrastText",
              },
            }}
          >
            <DeleteIcon sx={{ mr: 1, fontSize: "20px" }} />
            Delete
          </MenuItem>
        </Menu>
        <Typography variant="body2" color="text.secondary">
          Category: {product.category_name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Stock: {product.stock}
        </Typography>
        <Typography variant="h6" sx={{ flex: 1, mr: 1, mt: 1 }}>
            {product.price}
        </Typography>
      </CardContent>
    </Card>
  );
}
