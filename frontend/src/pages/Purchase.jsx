import React, { useState, useEffect } from "react";
import {
  Alert,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Drawer,
  Paper,
  Typography,
  Button,
  LinearProgress,
  Grid,
  TextField,
  InputAdornment,
  Select,
  Snackbar,
  Slide,
  MenuItem,
  FormControl,
  InputLabel,
  Badge,
  Card,
  CardContent,
  CardMedia,
  IconButton,
} from "@mui/material";
import { fetchProducts } from "../api/productAPI";
import { fetchCategories } from "../api/categoryAPI";
import SearchIcon from "@mui/icons-material/Search";
import PurchaseCard from "../components/Purchase/PurchaseCard";
import { createTransaction } from "../api/purchaseAPI";
//Icons
import MenuIcon from "@mui/icons-material/Menu";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import DeleteIcon from "@mui/icons-material/Delete";

// Animation transition
const Transition = React.forwardRef(function Transition(props, ref) {
  return (
    <Slide
      direction="up"
      ref={ref}
      {...props}
      timeout={500}
      easing={{
        enter: "cubic-bezier(0.4, 0, 0.2, 1)",
        exit: "ease-out",
      }}
    />
  );
});

// Slide Transition for Snackbar
function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function Purchase() {
  const [products, setProducts] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("");
  const [sortCategory, setSortCategory] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [cartItems, setCartItems] = useState([]);
  const [openWarningDialog, setOpenWarningDialog] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [orderLoading, setOrderLoading] = useState(false);

  const dialogOpen = (productId) => {
    setSelectedItemId(productId);
    setOpenWarningDialog(true);
  };

  const dialogClose = () => {
    setOpenWarningDialog(false);
    setSelectedItemId(null);
  };

  // Snackbar handlers
  const showSnackbar = (message) => {
    setSnackbarMessage(message);
    setSnackbarOpen(true);
  };

  const closeSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };

  // 🛒 Add product to cart
  const addToCart = (product) => {
    setCartItems((prevCart) => {
      const existingItem = prevCart.find(
        (item) => item.product_id === product.product_id
      );

      if (existingItem) {
        // Update quantity if product already exists
        return prevCart.map((item) =>
          item.product_id === product.product_id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        // Add new product to cart
        return [...prevCart, { ...product, quantity: 1 }];
      }
    });

    showSnackbar(`✓ Adding Complete`);
  };

  // 🛒 Update cart item quantity
  const updateCartQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      dialogOpen(productId);
    } else {
      setCartItems((prevCart) =>
        prevCart.map((item) =>
          item.product_id === productId
            ? { ...item, quantity: newQuantity }
            : item
        )
      );
    }
  };

  // 🛒 Remove product from cart
  const removeFromCart = (productId) => {
    setCartItems((prevCart) =>
      prevCart.filter((item) => item.product_id !== productId)
    );
    dialogClose();
    showSnackbar("✓ Item Removed");
  };

  // 💰 Calculate total price
  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const toggleDrawer = (open) => () => {
    setDrawerOpen(open);
  };
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

  const handleClose = () => setOpenModal(false);

  // 🧠 Filter and Sort Logic
  const filteredProducts = products
    .filter((product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter((product) => {
      if (!sortCategory) return true;
      return product.category_id === parseInt(sortCategory);
    })
    .sort((a, b) => {
      if (sortOption === "highToLow") {
        return (b.price || 0) - (a.price || 0);
      } else if (sortOption === "lowToHigh") {
        return (a.price || 0) - (b.price || 0);
      }
      return 0;
    });

  // Handle Order
  const handleOrder = async () => {
    if (cartItems.length === 0) {
      showSnackbar("❌ Cart is empty");
      return;
    }

    setOrderLoading(true);

    try {
      const transactionData = {
        total_amount: calculateTotal(),
        products: cartItems.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          subtotal: item.price * item.quantity,
        })),
      };

      const response = await createTransaction(transactionData);

      if (response.status === 201) {
        showSnackbar(
          `✓ Order Created Successfully (ID: #${String(response.data.transaction_id).padStart(5, "0")})`
        );
        setCartItems([]);
        toggleDrawer(false)();
        // Reload products to reflect updated stock
        loadProducts();
      }
    } catch (error) {
      console.error("Order error:", error);
      showSnackbar("❌ Failed to create order");
    } finally {
      setOrderLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={toggleDrawer(false)}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 9999,
          "& .MuiDrawer-paper": {
            width: 350,
            padding: 2,
          },
        }}
      >
        <Box
          sx={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {/* Top content - Cart Items */}
          <Box sx={{ flex: 1, overflow: "auto" }}>
            <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2 }}>
              Orders ({cartItems.length})
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {cartItems.length === 0 ? (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ textAlign: "center", mt: 3 }}
              >
                No items in cart
              </Typography>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {cartItems.map((item) => (
                  <Card
                    key={item.product_id}
                    variant="outlined"
                    sx={{
                      mb: 1,
                      borderRadius: 2,
                    }}
                  >
                    <CardContent
                      sx={{
                        p: 2,
                        "&:last-child": { pb: 2 },
                        display: "flex",
                        flexDirection: "column",
                        gap: 1.5,
                      }}
                    >
                      {/* Product Info Row */}
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                        }}
                      >
                        <Box
                          sx={{
                            width: 60,
                            height: 60,
                            backgroundColor: "#f5f5f5",
                            borderRadius: 1,
                            overflow: "hidden",
                            flexShrink: 0,
                          }}
                        >
                          <img
                            src={
                              item.image
                                ? `http://localhost:5000/uploads/uploadProducts/${encodeURIComponent(item.image)}`
                                : "https://via.placeholder.com/60x60?text=No+Image"
                            }
                            alt={item.name}
                            onError={(e) => {
                              e.target.src =
                                "https://via.placeholder.com/60x60?text=No+Image";
                            }}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              objectPosition: "center",
                            }}
                          />
                        </Box>

                        <Box sx={{ flex: 1 }}>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: "bold" }}
                          >
                            {item.name}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ fontWeight: "bold", ml: "auto" }}
                          >
                            ₱{(item.price * item.quantity).toFixed(2)}
                          </Typography>
                        </Box>
                        <Box>
                          {/* Quantity Control Row */}
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              justifyContent: "space-between",
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                                mb: 1,
                              }}
                            >
                              <IconButton
                                size="small"
                                onClick={() =>
                                  updateCartQuantity(
                                    item.product_id,
                                    item.quantity - 1
                                  )
                                }
                                sx={{ color: "error.main", padding: "4px" }}
                              >
                                <RemoveIcon fontSize="small" />
                              </IconButton>

                              <TextField
                                type="number"
                                value={item.quantity}
                                onChange={(e) => {
                                  const newQty = parseInt(e.target.value) || 1;
                                  updateCartQuantity(item.product_id, newQty);
                                }}
                                size="small"
                                sx={{
                                  width: 40,
                                  "& input": {
                                    textAlign: "center",
                                    padding: "4px 2px",
                                    fontSize: "0.875rem",
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
                                onClick={() =>
                                  updateCartQuantity(
                                    item.product_id,
                                    item.quantity + 1
                                  )
                                }
                                sx={{ color: "primary.main", padding: "4px" }}
                              >
                                <AddIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </Box>
                          <Button
                            variant="contained"
                            color="error"
                            size="small"
                            onClick={() => dialogOpen(item.product_id)}
                            sx={{
                              width: "100%",
                              padding: "2px 8px",
                              fontSize: "0.70rem",
                              minHeight: "24px",
                            }}
                          >
                            Remove
                          </Button>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </Box>

          {/* Bottom content - Total and Buttons */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            <Divider />
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                Total:
              </Typography>
              <Typography
                variant="h6"
                sx={{ fontWeight: "bold", color: "primary.main" }}
              >
                ₱{calculateTotal().toFixed(2)}
              </Typography>
            </Box>
            <Button
              variant="contained"
              color="success"
              onClick={handleOrder}
              fullWidth
              disabled={cartItems.length === 0 || orderLoading}
              sx={{ position: "relative" }}
            >
              {orderLoading ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <LinearProgress
                    sx={{ width: 20, height: 4, mr: 1 }}
                    color="inherit"
                  />
                  Processing...
                </Box>
              ) : (
                "Order"
              )}
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={toggleDrawer(false)}
              fullWidth
            >
              Close
            </Button>
          </Box>
        </Box>
      </Drawer>
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
            Purchase
          </Typography>
          <Typography variant="body1" sx={{ mt: -1 }}>
            Welcome to the Purchase management page.
          </Typography>
        </Box>

        <Button
          variant="contained"
          color="primary"
          onClick={toggleDrawer(true)}
          sx={{
            width: { xs: 45, sm: 45 },
            height: { xs: 45, sm: 45 },
            minWidth: { xs: 45, sm: 50 },
            padding: 0,
            position: "relative",
          }}
        >
          <Badge badgeContent={cartItems.length} color="error">
            <MenuIcon sx={{ color: "white" }}/>
          </Badge>
        </Button>
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
                <PurchaseCard
                  product={product}
                  onAddToCart={(prod, qty) => {
                    setCartItems((prevCart) => {
                      const existingItem = prevCart.find(
                        (item) => item.product_id === prod.product_id
                      );
                      if (existingItem) {
                        return prevCart.map((item) =>
                          item.product_id === prod.product_id
                            ? { ...item, quantity: item.quantity + qty }
                            : item
                        );
                      } else {
                        return [...prevCart, { ...prod, quantity: qty }];
                      }
                    });
                    showSnackbar("✓ Adding Complete");
                  }}
                />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Typography align="center">No products found.</Typography>
        )}
      </Paper>
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
      <Dialog
        open={openWarningDialog}
        onClose={dialogClose}
        TransitionComponent={Transition}
        keepMounted
        sx={{ zIndex: 999999 }}
      >
        <DialogTitle>Remove Item</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to remove this item from the cart?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={dialogClose} color="success">
            Cancel
          </Button>
          <Button
            onClick={() => removeFromCart(selectedItemId)}
            variant="contained"
            color="error"
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>
      
    </Box>
  );
}
