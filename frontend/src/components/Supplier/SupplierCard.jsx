import React, { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardMedia,
  CardContent,
  IconButton,
  Link,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

export default function SupplierCard({ supplier, onEdit, onDelete }) {
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
      {/* 🖼 Supplier Image */}
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
            objectFit: "cover",
            objectPosition: "center",
          }}
          image={
            supplier.image
              ? `http://localhost:5000/uploads/uploadSupplier/${supplier.image}`
              : `http://localhost:5000/uploads/uploadSupplier/profile.jpg`
          }
          alt={supplier.name}
          onError={(e) => {
            console.error("Image failed to load:", supplier.image);
            e.target.onerror = null;
            e.target.src = "https://via.placeholder.com/250x150?text=No+Image";
          }}
        />
      </Box>
      {/*  "https://via.placeholder.com/250x150?text=No+Image" //Alternative image if no image is found*/} 
      {/* 🧾 Supplier Details */}
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
            {supplier.name}
          </Typography>
          <IconButton
            size="small"
            onClick={handleMenuOpen}
            sx={{
              ml: "auto",
              "&:hover": {
                backgroundColor: "action.hover",
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
            vertical: "bottom",
            horizontal: "right",
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "right",
          }}
        >
          <MenuItem
            onClick={() => {
              onEdit(supplier);
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
              onDelete(supplier);
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
          Number: {supplier.number}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1, mr: 1, mt: 1 }}>
          Email:{supplier.email}
        </Typography>
        <Button
          variant="contained"
          color="primary"
          sx={{ mt: 2, width: "100%" }}
          component="a"
          href={supplier.facebook_link}
          target="_blank"
          rel="noopener noreferrer"
        >
          Link
        </Button>
      </CardContent>
    </Card>
  );
}
