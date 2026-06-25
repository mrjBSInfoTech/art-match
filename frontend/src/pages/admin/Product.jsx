import React, { useState, useEffect } from "react";
import {
  Alert,
  Box,
  Card,
  CardMedia,
  CardContent,
  Paper,
  Typography,
  Button,
  LinearProgress,
  Grid,
  TextField,
  InputAdornment,
  Select,
  Slide,
  Snackbar,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import {
  fetchProducts,
  addProduct,
  updateProduct,
  deleteProduct,
} from "../api/productAPI";
import { fetchCategories } from "../api/categoryAPI";
import SearchIcon from "@mui/icons-material/Search";
import ProductForm from "../components/Products/ProductForm";
import ProductCard from "../components/Products/ProductCard";
//Icons
import InventoryIcon from "@mui/icons-material/Inventory";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

// Slide Transition for Snackbar
function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function Product() {
  const [products, setProducts] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("");
  const [sortCategory, setSortCategory] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  // 🟢 Load all categories
  const getCategories = async () => {
    try {
      const res = await fetchCategories();
      setCategories(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };
  useEffect(() => {
    getCategories();
  }, []);

  // 🟢 Load all products
  const loadProducts = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const response = await fetchProducts();
      if (response && response.data) {
        setProducts(Array.isArray(response.data) ? response.data : []);
      } else {
        setProducts([]);
        setErrorMessage("⚠️ No data received from server.");
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
      setProducts([]);
      setErrorMessage("⚠️ Failed to fetch products. Please try again later.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadProducts();
  }, []);

  const totalProducts = products.length;
  const lowStockProducts = products.filter((product) => {
    const stock = parseInt(product.stock) || 0;
    return stock > 0 && stock <= 50; // Low stock if between 1 and 50
  }).length;
  const outOfStockProducts = products.filter((product) => {
    const stock = parseInt(product.stock) || 0;
    return stock === 0; // Out of stock if 0
  }).length;


  // ➕ Open Add Modal
  const handleOpenAdd = () => {
    setSelectedProduct(null);
    setOpenModal(true);
  };

  // ✏️ Open Edit Modal
  const handleOpenEdit = (product) => {
    setSelectedProduct(product);
    setOpenModal(true);
  };

  // 🗑️ Open Delete Modal
  const handleOpenDelete = (productId) => {
    setSelectedProduct(productId);
    setOpenDeleteModal(true);
  };

  const handleClose = () => setOpenModal(false);

  // 💾 Submit (Add or Edit)
  const handleSubmit = async (formData) => {
    try {
      setLoading(true);

      // Create a new FormData object with all the form values
      const productData = {
        ...formData,
        price: parseFloat(formData.price) || 0,
        stock: parseInt(formData.stock) || 0,
      };

      if (selectedProduct && selectedProduct.product_id) {
        await updateProduct(selectedProduct.product_id, productData);
        showSnackbar("✓ Editing Complete");
      } else {
        await addProduct(productData);
        showSnackbar("✓ Adding Complete");
      }
      await loadProducts();
      setOpenModal(false);
    } catch (err) {
      console.error("Error saving product:", err);
      setErrorMessage(
        err.message || "Failed to save product. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // 🗑️ Confirm Delete
  const handleDelete = async (id) => {
    try {
      await deleteProduct(id);
      await loadProducts();
      setOpenDeleteModal(false);
      showSnackbar("✓ Deletion Complete");
    } catch (err) {
      console.error("Error deleting product:", err);
    }
  };

  // 🧠 Filter and Sort Logic
  const filteredProducts = products
    .filter((product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    // Sort by category
    .filter((product) => {
      if (!sortCategory) return true;
      return product.category_id === parseInt(sortCategory);
    })
    // Sort by price
    .sort((a, b) => {
      if (sortOption === "highToLow") {
        return (b.price || 0) - (a.price || 0);
      } else if (sortOption === "lowToHigh") {
        return (a.price || 0) - (b.price || 0);
      }
      return 0;
    });

  // Snackbar handlers
  const showSnackbar = (message) => {
    setSnackbarMessage(message);
    setSnackbarOpen(true);
  };

  const closeSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: "bold" }}>
            Product
          </Typography>
          <Typography variant="body1" sx={{ mt: -1 }}>
            Welcome to the Product management page.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          onClick={handleOpenAdd}
          sx={{
            width: { xs: 150, sm: 150 },
            height: { xs: 45, sm: 45 },
            minWidth: { xs: 45, sm: 50 },
            fontSize: { xs: 12, sm: 16 },
            padding: 0,
          }}
        >
          Add Product
        </Button>
      </Box>
      <Box
        sx={{
          mt: 3,
          display: "flex",
          gap: 3,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <Card
          variant="outlined"
          sx={{
            flex: "1 1 calc(33.333% - 24px)",
            minWidth: 280,
            // Remove maxWidth or make it responsive
            maxWidth: { xs: 350, md: "none" }, // Responsive maxWidth
            width: "100%", // Add this to ensure it stretches
            height: 150,
            padding: 2,
            borderRadius: 2,
            bgcolor: "#C1FFA9",
          }}
        >
          <CardContent>
            <Typography gutterBottom variant="h5" sx={{ fontWeight: "bold", color: "#2C8508" }}>
              Products
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 2 }}>
              <InventoryIcon color="success" sx={{ fontSize: 30 }} />
              <Typography variant="h4" sx={{ fontWeight: "bold", color: "#2C8508", fontSize: 30 }}>
                {totalProducts}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Card
          variant="outlined"
          sx={{
            flex: "1 1 calc(33.333% - 24px)",
            minWidth: 280,
            maxWidth: { xs: 350, md: "none" }, // Responsive maxWidth
            width: "100%", // Add this to ensure it stretches
            height: 150,
            padding: 2,
            borderRadius: 2,
            bgcolor: "#FDCB80",
          }}
        >
          <CardContent>
            <Typography gutterBottom variant="h5" sx={{ fontWeight: "bold", color: "#9B5F03" }}>
              Low Stocks
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 2 }}>
              <WarningAmberIcon color="warning" sx={{ fontSize: 30 }} />
              <Typography variant="h4" sx={{ fontWeight: "bold", color: "#9B5F03", fontSize: 30 }}>
                {lowStockProducts}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Card
          variant="outlined"
          sx={{
            flex: "1 1 calc(33.333% - 24px)",
            minWidth: 280,
            maxWidth: { xs: 350, md: "none" }, // Responsive maxWidth
            width: "100%", // Add this to ensure it stretches
            height: 150,
            padding: 2,
            borderRadius: 2,
            bgcolor: "#FC9495",
          }}
        >
          <CardContent>
            <Typography gutterBottom variant="h5" sx={{ fontWeight: "bold", color: "#880506" }}>
              Low Stocks
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 2 }}>
              <ErrorOutlineIcon color="error" sx={{ fontSize: 30 }} />
              <Typography variant="h4" sx={{ fontWeight: "bold", color: "#880506", fontSize: 30 }}>
                {outOfStockProducts}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
      {/* Filter Section */}
      <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }} variant="outlined">
        <Typography variant="h6">Filter</Typography>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "stretch", md: "center" },
            gap: 2,
            mb: 2,
            mt: 2,
          }}
        >
          <TextField
            variant="outlined"
            placeholder="Search products..."
            size="small"
            sx={{
              width: { xs: "100%", sm: 250 },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 2,
              width: { xs: "100%", md: "auto" },
            }}
          >
            <FormControl
              size="small"
              sx={{
                width: { xs: "100%", sm: 180 },
              }}
            >
              <InputLabel>Sort by Category</InputLabel>
              <Select
                value={sortCategory}
                label="Sort by Category"
                onChange={(e) => setSortCategory(e.target.value)}
              >
                <MenuItem value="">All Categories</MenuItem>
                {categories.map((category) => (
                  <MenuItem
                    value={category.category_id}
                    key={category.category_id}
                  >
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl
              size="small"
              sx={{
                width: { xs: "100%", sm: 180 },
              }}
            >
              <InputLabel>Sort by Price</InputLabel>
              <Select
                value={sortOption}
                label="Sort by Price"
                onChange={(e) => setSortOption(e.target.value)}
              >
                <MenuItem value="highToLow">High to Low</MenuItem>
                <MenuItem value="lowToHigh">Low to High</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Paper>

      {/* 🧾 Product Lists */}
      <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }} variant="outlined">
        <Typography variant="h6" sx={{ mb: 2 }}>
          Product List
        </Typography>

        {loading ? (
          <Box sx={{ width: "80%", margin: "0 auto" }}>
            <LinearProgress color="primary" />
          </Box>
        ) : errorMessage ? (
          <Typography sx={{ color: "red", textAlign: "center" }}>
            {errorMessage}
          </Typography>
        ) : products.length > 0 ? (
          <Grid container spacing={3} justifyContent="center" sx={{ px: 2 }}>
            {filteredProducts.map((product) => (
              <Grid
                key={product.product_id}
                sx={{
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <ProductCard
                  product={product}
                  onEdit={handleOpenEdit}
                  onDelete={handleOpenDelete}
                />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Typography align="center">No products found.</Typography>
        )}
      </Paper>

      {/* Add/Edit Product Form */}
      <ProductForm
        open={openModal}
        handleClose={handleClose}
        onSubmit={handleSubmit}
        selectedProduct={selectedProduct}
        categories={categories}
      />
      {/* Delete Confirmation Modal */}
      <ProductForm
        open={openDeleteModal}
        handleClose={() => setOpenDeleteModal(false)}
        onConfirm={() => handleDelete(selectedProduct.product_id)}
        productName={selectedProduct?.name}
        mode="delete"
      />
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        TransitionComponent={SlideTransition}
      >
        <Alert
          onClose={closeSnackbar}
          severity="success"
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
