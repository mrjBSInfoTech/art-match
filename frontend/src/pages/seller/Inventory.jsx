import {
  createElement,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { alpha, useTheme } from "@mui/material/styles";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
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
import ConnectionErrorPanel from "../../components/seller/ConnectionErrorPanel";
import SellerLoadingPanel from "../../components/seller/SellerLoadingPanel";
import {
  adjustProductOptionStock,
  adjustInventoryStock,
  fetchSellerInventory,
} from "../../api/seller/inventoryAPI";
import {
  getStockStatus,
  isStockableInventoryProduct,
  toStockQuantity,
} from "../../utils/inventory";

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

  const stockableProducts = useMemo(
    () => products.filter(isStockableInventoryProduct),
    [products],
  );

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = stockableProducts.filter((product) => {
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
  }, [stockableProducts, searchQuery, stockFilter, sortOption]);

  // Matches the dashboard's direct count pattern: data is loaded once, then
  // the displayed totals are derived from that current list.
  const productCount = stockableProducts.length;
  const inStockCount = stockableProducts.filter(
    (product) => getStockStatus(product.stock_quantity) === "in-stock",
  ).length;
  const lowStockCount = stockableProducts.filter(
    (product) => getStockStatus(product.stock_quantity) === "low-stock",
  ).length;
  const outOfStockCount = stockableProducts.filter(
    (product) => getStockStatus(product.stock_quantity) === "out-of-stock",
  ).length;

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const saveStock = async (artworkId, direction, quantity) => {
    setSavingProductId(artworkId);
    try {
      const savedProduct = await adjustInventoryStock(
        artworkId,
        direction,
        quantity,
      );
      setProducts((current) =>
        current.map((product) =>
          product.artwork_id === artworkId ? savedProduct : product,
        ),
      );
      showSnackbar(
        `Stock ${direction === "add" ? "increased" : "reduced"} successfully.`,
      );
    } finally {
      setSavingProductId(null);
    }
  };

  const adjustOptionStock = async (
    artworkId,
    optionId,
    direction,
    quantity,
  ) => {
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
        `${direction === "add" ? "Added to" : "Reduced"} ${
          savedProduct.product_options.find((option) => option.id === optionId)
            ?.name || "product"
        } stock successfully.`,
      );
    } finally {
      setSavingProductId(null);
    }
  };

  const summaryCards = [
    {
      label: "TOTAL ARTWORK",
      value: loading ? "..." : productCount,
      caption: "Your total artworks",
      icon: ColorLensRoundedIcon,
      tint: alpha(
        theme.palette.primary.main,
        theme.palette.mode === "dark" ? 0.18 : 0.1,
      ),
      accent: theme.palette.primary.main,
    },
    {
      label: "IN STOCK",
      value: loading ? "..." : inStockCount,
      caption: "More than 5 units",
      icon: CheckCircleRoundedIcon,
      tint: alpha(
        theme.palette.success.main,
        theme.palette.mode === "dark" ? 0.18 : 0.1,
      ),
      accent: theme.palette.success.main,
    },
    {
      label: "LOW STOCK",
      value: loading ? "..." : lowStockCount,
      caption: "5 units or fewer",
      icon: SellRoundedIcon,
      tint: alpha(
        theme.palette.warning.main,
        theme.palette.mode === "dark" ? 0.18 : 0.1,
      ),
      accent: theme.palette.warning.main,
    },
    {
      label: "OUT OF STOCK",
      value: loading ? "..." : outOfStockCount,
      caption: "0 units available",
      icon: CreditScoreIcon,
      tint: alpha(
        theme.palette.error.main,
        theme.palette.mode === "dark" ? 0.18 : 0.1,
      ),
      accent: theme.palette.error.main,
    },
  ];

  if (loading && !products.length) {
    return (
      <SellerLoadingPanel
        title="Inventory"
        subtitle="Manage the stock available for your artwork listings."
      />
    );
  }

  if (errorMessage && !products.length) {
    return (
      <Box sx={{ minWidth: 0 }}>
        <Helmet titleTemplate="%s - ArtMatch">
          <title>Inventory</title>
        </Helmet>
        <ConnectionErrorPanel
          title="Inventory Unavailable"
          message={errorMessage}
          onRetry={loadInventory}
        />
      </Box>
    );
  }

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
            Manage the stock available for your artwork listings.
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
          Add artwork
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
              sx={{
                borderRadius: 3,
                backgroundColor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                boxShadow: "none",
                overflow: "hidden",
              }}
            >
              <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
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
                        letterSpacing: 1.2,
                      }}
                    >
                      {label}
                    </Typography>
                    <Typography
                      sx={{
                        mt: 1,
                        color: theme.palette.text.primary,
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
                        color: theme.palette.text.secondary,
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
                      backgroundColor: tint,
                      color: accent,
                    }}
                  >
                    {createElement(SummaryIcon, { sx: { fontSize: 26 } })}
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
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "stretch", md: "center" },
            gap: 2,
          }}
        >
          <TextField
            variant="outlined"
            placeholder="Search artworks..."
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
            inputProps={{ "aria-label": "Search artworks" }}
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
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
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
          variant="filled"
          onClose={() =>
            setSnackbar((current) => ({ ...current, open: false }))
          }
          sx={{
            width: { xs: 280, sm: 360 },
            minHeight: 48,
            borderRadius: 2,
            boxShadow: "0 10px 28px rgba(15, 23, 42, 0.18)",
            backgroundColor:
              snackbar.severity === "error"
                ? theme.palette.error.main
                : snackbar.severity === "warning"
                  ? theme.palette.warning.main
                  : snackbar.severity === "info"
                    ? theme.palette.info.main
                    : theme.palette.success.main,
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
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
