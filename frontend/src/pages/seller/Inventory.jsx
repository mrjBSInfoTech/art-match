import {
  createElement,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useTheme } from "@mui/material/styles";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Slide,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import ColorLensRoundedIcon from "@mui/icons-material/ColorLensRounded";
import CreditScoreIcon from "@mui/icons-material/CreditScore";
import SellRoundedIcon from "@mui/icons-material/SellRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import AddIcon from "@mui/icons-material/Add";
import InventoryCard from "../../components/seller/Inventory/InventoryCard";
import {
  adjustProductOptionStock,
  adjustInventoryStock,
  fetchSellerInventory,
} from "../../api/seller/inventoryAPI";
import { getStockStatus, toStockQuantity } from "../../utils/inventory";

function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function Inventory() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [sortOption, setSortOption] = useState("az");
  const [savingProductId, setSavingProductId] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const loadInventory = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      setProducts(await fetchSellerInventory());
    } catch (error) {
      setProducts([]);
      setErrorMessage(error.message || "Unable to load inventory.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = products.filter((product) => {
      const matchesSearch =
        !query ||
        [product.title, product.product].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(query),
        );
      const matchesStatus =
        stockFilter === "all" ||
        getStockStatus(product.stock_quantity) === stockFilter;
      return matchesSearch && matchesStatus;
    });

    return [...filtered].sort((left, right) => {
      if (sortOption === "stock-low") {
        return (
          toStockQuantity(left.stock_quantity) -
          toStockQuantity(right.stock_quantity)
        );
      }
      if (sortOption === "stock-high") {
        return (
          toStockQuantity(right.stock_quantity) -
          toStockQuantity(left.stock_quantity)
        );
      }
      if (sortOption === "za") {
        return String(right.title || "").localeCompare(
          String(left.title || ""),
        );
      }
      return String(left.title || "").localeCompare(String(right.title || ""));
    });
  }, [products, searchQuery, stockFilter, sortOption]);

  // Matches the dashboard's direct count pattern: data is loaded once, then
  // the displayed totals are derived from that current list.
  const productCount = products.length;
  const inStockCount = products.filter(
    (product) => getStockStatus(product.stock_quantity) === "in-stock",
  ).length;
  const lowStockCount = products.filter(
    (product) => getStockStatus(product.stock_quantity) === "low-stock",
  ).length;
  const outOfStockCount = products.filter(
    (product) => getStockStatus(product.stock_quantity) === "out-of-stock",
  ).length;

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const saveStock = async (artworkId, direction, quantity) => {
    setSavingProductId(artworkId);
    try {
      const savedProduct = await adjustInventoryStock(artworkId, direction, quantity);
      setProducts((current) =>
        current.map((product) =>
          product.artwork_id === artworkId ? savedProduct : product,
        ),
      );
      showSnackbar(`Stock ${direction === "add" ? "increased" : "reduced"} successfully.`);
    } finally {
      setSavingProductId(null);
    }
  };

  const adjustOptionStock = async (artworkId, optionId, direction, quantity) => {
    setSavingProductId(artworkId);
    try {
      const savedProduct = await adjustProductOptionStock(
        artworkId,
        optionId,
        direction,
        quantity,
      );
      setProducts((current) =>
        current.map((product) =>
          product.artwork_id === artworkId ? savedProduct : product,
        ),
      );
      showSnackbar(
        `${direction === "add" ? "Added to" : "Reduced"} ${savedProduct.product_options.find(
          (option) => option.id === optionId,
        )?.name || "product"} stock successfully.`,
      );
    } finally {
      setSavingProductId(null);
    }
  };

  const summaryCards = [
    {
      label: "TOTAL PRODUCTS",
      value: loading ? "..." : productCount,
      caption: "Your total products",
      icon: ColorLensRoundedIcon,
      tint: "rgba(244, 114, 182, 0.15)",
      accent: "primary.main",
    },
    {
      label: "IN STOCK",
      value: loading ? "..." : inStockCount,
      caption: "More than 5 units",
      icon: CheckCircleRoundedIcon,
      tint: "rgba(34, 197, 94, 0.18)",
      accent: "success.main",
    },
    {
      label: "LOW STOCK",
      value: loading ? "..." : lowStockCount,
      caption: "5 units or fewer",
      icon: SellRoundedIcon,
      tint: "rgba(154, 197, 34, 0.18)",
      accent: "warning.main",
    },
    {
      label: "OUT OF STOCK",
      value: loading ? "..." : outOfStockCount,
      caption: "0 units available",
      icon: CreditScoreIcon,
      tint: "rgba(246, 59, 84, 0.18)",
      accent: "error.main",
    },
  ];

  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2.5 },
        minHeight: "100vh",
        backgroundColor: theme.palette.background.default,
        color: theme.palette.text.primary,
      }}
    >
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Inventory</title>
      </Helmet>

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 2,
          mb: 2.5,
          flexDirection: { xs: "column", sm: "row" },
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: { xs: 28, sm: 38 },
              fontWeight: 800,
              lineHeight: 1.1,
              color: theme.palette.text.primary,
            }}
          >
            Inventory
          </Typography>
          <Typography
            sx={{
              mt: 0.75,
              color: theme.palette.text.secondary,
              fontSize: 13,
            }}
          >
            Manage the stock available for your product listings.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="error"
          startIcon={<AddIcon />}
          onClick={() => navigate("/seller/artwork")}
          sx={{
            width: { xs: "100%", sm: 150 },
            height: { xs: 38, sm: 44 },
            minWidth: { xs: 45, sm: 50 },
            fontSize: { xs: 12, sm: 16 },
            padding: 0,
            borderRadius: 1.5,
            textTransform: "none",
            fontWeight: 700,
          }}
        >
          Add Product
        </Button>
      </Box>

      {errorMessage && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {errorMessage}
        </Alert>
      )}

      <Box
        sx={{
          mt: 3,
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(4, 1fr)",
          },
          gap: 2,
          mb: 2.5,
        }}
      >
        {summaryCards.map(
          ({ label, value, caption, icon: SummaryIcon, tint, accent }) => (
            <Card
              key={label}
              variant="outlined"
              sx={{
                backgroundColor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2.5,
                boxShadow: "none",
              }}
            >
              <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography
                      sx={{
                        color: theme.palette.text.secondary,
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: 1,
                      }}
                    >
                      {label}
                    </Typography>
                    <Typography
                      sx={{
                        mt: 1,
                        color: "text.primary",
                        fontSize: 30,
                        fontWeight: 800,
                        lineHeight: 1,
                      }}
                    >
                      {value}
                    </Typography>
                    <Typography
                      sx={{
                        mt: 1,
                        color: "text.secondary",
                        fontSize: 12,
                      }}
                    >
                      {caption}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      display: "grid",
                      placeItems: "center",
                      borderRadius: 3,
                      background: (theme) =>
                        theme.palette.mode === "dark"
                          ? `linear-gradient(135deg, ${tint}, rgba(15,23,42,0.3))`
                          : `linear-gradient(135deg, ${tint}, rgba(255,255,255,0.7))`,
                      color: accent,
                      border: (theme) =>
                        `1px solid ${
                          theme.palette.mode === "dark"
                            ? "rgba(255,255,255,0.08)"
                            : "rgba(15,23,42,0.06)"
                        }`,
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)",
                    }}
                  >
                    {createElement(SummaryIcon)}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ),
        )}
      </Box>

      <Paper
        sx={{
          p: { xs: 2, md: 2.5 },
          borderRadius: 2.5,
          backgroundColor: theme.palette.background.paper,
          borderColor: theme.palette.divider,
          containerType: "inline-size",
          containerName: "inventory-filters",
          minWidth: 0,
        }}
        variant="outlined"
      >
        <Typography
          variant="caption"
          color="text.secondary"
          aria-live="polite"
          sx={{ display: "block", mb: 1.5 }}
        >
          <strong>{filteredProducts.length}</strong> products shown
        </Typography>
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
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            sx={{
              minWidth: 0,
              gridColumn: "1 / -1",
              "@container inventory-filters (min-width: 900px)": {
                gridColumn: "auto",
              },
              "& .MuiInputBase-input::placeholder": {
                color: theme.palette.text.secondary,
                opacity: 1,
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            inputProps={{ "aria-label": "Search products" }}
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
              fullWidth
              sx={{
                gridColumn: "1 / -1",
                "@container inventory-filters (min-width: 600px)": {
                  gridColumn: "auto",
                },
              }}
            >
              <InputLabel id="seller-inventory-status-label">Status</InputLabel>
              <Select
                value={stockFilter}
                labelId="seller-inventory-status-label"
                id="seller-inventory-status"
                name="status"
                label="Status"
                onChange={(event) => setStockFilter(event.target.value)}
              >
                <MenuItem value="all">All Stock</MenuItem>
                <MenuItem value="in-stock">In Stock</MenuItem>
                <MenuItem value="low-stock">Low Stock</MenuItem>
                <MenuItem value="out-of-stock">Out of Stock</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel id="seller-inventory-sort-label">Sort</InputLabel>
              <Select
                value={sortOption}
                labelId="seller-inventory-sort-label"
                id="seller-inventory-sort"
                name="sort"
                label="Sort"
                onChange={(event) => setSortOption(event.target.value)}
                startAdornment={
                  <SwapVertIcon
                    sx={{ mr: 0.5, fontSize: 17, color: "text.secondary" }}
                  />
                }
              >
                <MenuItem value="az">Name: A to Z</MenuItem>
                <MenuItem value="za">Name: Z to A</MenuItem>
                <MenuItem value="stock-low">Stock: Low to High</MenuItem>
                <MenuItem value="stock-high">Stock: High to Low</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Paper>

      <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }} variant="outlined">
        {loading ? (
          <Box sx={{ width: "80%", margin: "0 auto" }}>
            <LinearProgress color="primary" />
          </Box>
        ) : products.length === 0 ? (
          <Typography align="center">No product listings found.</Typography>
        ) : filteredProducts.length === 0 ? (
          <Typography align="center">
            No products match the current filters.
          </Typography>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
                lg: "repeat(3, minmax(0, 1fr))",
              },
              gap: 3,
              px: { xs: 0, sm: 2 },
            }}
          >
            {filteredProducts.map((product) => (
              <InventoryCard
                key={product.artwork_id}
                product={product}
                onSaveStock={saveStock}
                onAdjustOptionStock={adjustOptionStock}
                saving={savingProductId === product.artwork_id}
              />
            ))}
          </Box>
        )}
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={(_event, reason) => {
          if (reason !== "clickaway") {
            setSnackbar((current) => ({ ...current, open: false }));
          }
        }}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        TransitionComponent={SlideTransition}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() =>
            setSnackbar((current) => ({ ...current, open: false }))
          }
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
