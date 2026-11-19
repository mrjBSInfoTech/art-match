import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import CartTable from "../../components/buyer/Cart/CartTable";
import CartConfirm from "../../components/buyer/Cart/CartConfirm";
import CartDelete from "../../components/buyer/Cart/CartDelete";
import {
  Alert,
  Box,
  Button,
  Paper,
  Grid,
  Divider,
  Skeleton,
  Typography,
  Stack,
  Container,
} from "@mui/material";
import { fetchCart, removeFromCart, updateCartItemQuantity } from "../../api/buyer/cartAPI";
import ConnectionErrorPanel from "../../components/buyer/ConnectionErrorPanel";
import AppSnackbar from "../../components/common/AppSnackbar";
import { getSelectedProductsTotalQuantity } from "../../utils/productOptions";
import { getArtworkRemainingStock } from "../../utils/artworkAvailability";

export default function Cart() {
  const [items, setItems] = useState([]);
  const [cartErrorMessage, setCartErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [selection, setSelection] = useState([]);
  const [cartQuantities, setCartQuantities] = useState({});
  const navigate = useNavigate();
  const [selectedCart, setSelectedCart] = useState(null);
  const [confirmingOrder, setConfirmingOrder] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const deletingRef = useRef(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  // Snackbar handlers
  const showSnackbar = (message, severity = "success") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const closeSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };

  const isProductItem = (item) => {
    const artType = String(item?.art_type || "").trim().toLowerCase();
    const product = String(item?.product || "").trim().toLowerCase();
    const productValues = ["product", "3d_object", "3d object", "sculpture", "physical_product", "physical product"];
    return productValues.includes(artType) || productValues.includes(product);
  };

  const closeDelete = () => {
    if (deletingRef.current) return;
    setSelectedCart(null);
    setDeleteError("");
  };
  const closeOrderConfirmation = () => setConfirmingOrder(false);
  const continueToCheckout = (artworkIds) => {
    if (!artworkIds.length) return;
    setConfirmingOrder(false);
    const quantitiesMap = {};
    const quantityParamParts = [];
    artworkIds.forEach((id) => {
      const matchedItem = items.find((item) => String(item.artwork_id) === String(id));
      const selections = Array.isArray(matchedItem?.selected_products) ? matchedItem.selected_products : [];
      const isMultiOption = selections.length > 1;
      const remainingStock = matchedItem ? getArtworkRemainingStock(matchedItem) : null;
      const maxStock = remainingStock !== null ? Math.max(1, remainingStock) : 999999;
      const rawQty = matchedItem && isProductItem(matchedItem)
        ? Math.max(1, Number(cartQuantities[String(id)] ?? matchedItem.quantity ?? 1) || 1)
        : 1;
      const qty = Math.min(rawQty, maxStock);
      quantitiesMap[String(id)] = qty;
      quantityParamParts.push(`${id}:${qty}`);
      if (matchedItem && isProductItem(matchedItem) && !isMultiOption &&
          Number(matchedItem.quantity || 1) !== qty) {
        updateCartItemQuantity(id, qty).catch(() => {});
      }
    });
    const hasCustomQty = quantityParamParts.some((part) => !part.endsWith(":1"));
    const quantitiesParam = hasCustomQty ? `&quantities=${encodeURIComponent(quantityParamParts.join(","))}` : "";
    navigate(
      `/buyer/checkout?artwork_ids=${artworkIds.join(",")}${quantitiesParam}`,
      { state: { quantities: quantitiesMap } },
    );
  };

  useEffect(() => {
    let active = true;
    let controller;
    let timer;
    let currentItems = [];
    let previousIds = null;
    let pollUntil = Date.now() + 60000;

    const schedulePoll = () => {
      clearTimeout(timer);
      if (!active || document.visibilityState === "hidden" || !currentItems.length ||
        Date.now() + 5000 > pollUntil) return;
      timer = setTimeout(loadCart, 5000);
    };
    const loadCart = async () => {
      clearTimeout(timer);
      controller?.abort();
      const request = new AbortController();
      controller = request;
      try {
        const response = await fetchCart({ signal: request.signal });
        if (!active || request.signal.aborted) return;
        currentItems = Array.isArray(response) ? response : [];
        const ids = currentItems.map((item) => String(item.artwork_id)).sort().join(",");
        setItems(currentItems);
        setCartErrorMessage("");
        if (previousIds !== ids) {
          window.dispatchEvent(new CustomEvent("cart-updated", {
            detail: { source: "cart-page", count: currentItems.length },
          }));
        }
        previousIds = ids;
      } catch (error) {
        if (active && !request.signal.aborted) setCartErrorMessage("Failed to load cart: " + error.message);
      } finally {
        if (active && !request.signal.aborted) {
          setLoading(false);
          schedulePoll();
        }
      }
    };
    const refreshCart = (event) => {
      if (event?.detail?.source === "cart-page") return;
      if (document.visibilityState === "hidden") {
        clearTimeout(timer);
        controller?.abort();
        return;
      }
      pollUntil = Date.now() + 60000;
      loadCart();
    };
    setLoading(true);
    setCartErrorMessage("");
    loadCart();
    const events = ["cart-updated", "focus", "pageshow"];
    events.forEach((event) => window.addEventListener(event, refreshCart));
    document.addEventListener("visibilitychange", refreshCart);
    return () => {
      active = false;
      controller?.abort();
      clearTimeout(timer);
      events.forEach((event) => window.removeEventListener(event, refreshCart));
      document.removeEventListener("visibilitychange", refreshCart);
    };
  }, [refresh]);

  useEffect(() => {
    setCartQuantities((previous) => {
      const next = {};
      items.forEach((item) => {
        const id = String(item.artwork_id);
        const isProduct = isProductItem(item);
        const selections = Array.isArray(item.selected_products) ? item.selected_products : [];
        const isMultiOption = selections.length > 1;
        const dbQuantity = selections.length
          ? getSelectedProductsTotalQuantity(selections)
          : Math.max(1, Number(item.quantity) || 1);
        const currentValue = previous[id] !== undefined ? Number(previous[id]) : dbQuantity;
        next[id] = isProduct && !isMultiOption
          ? Math.max(1, Number.isFinite(currentValue) ? currentValue : dbQuantity)
          : isProduct ? dbQuantity : 1;
      });
      return next;
    });
  }, [items]);

  const getItemQuantity = (item) => {
    if (!isProductItem(item)) return 1;
    const id = String(item.artwork_id);
    const selections = Array.isArray(item.selected_products) ? item.selected_products : [];
    if (selections.length > 1) {
      return getSelectedProductsTotalQuantity(selections);
    }
    const value = Number(cartQuantities[id] ?? item.quantity ?? (selections[0]?.quantity || 1));
    return Number.isFinite(value) ? Math.max(1, value) : 1;
  };

  const cartItems = items.map((item) => {
    const selectedProducts = Array.isArray(item.selected_products) ? item.selected_products : [];
    const isSingleVariant = selectedProducts.length === 1;
    const qty = getItemQuantity(item);
    const unitPrice = isSingleVariant
      ? Number(selectedProducts[0].unit_price || item.price || 0)
      : Number(item.price || 0);
    const subtotal = selectedProducts.length > 1
      ? selectedProducts.reduce((sum, option) =>
        sum + Number(option.unit_price || item.price || 0) * Number(option.quantity || 0), 0)
      : isSingleVariant
        ? unitPrice * qty
        : Number(item.price || 0) * qty;
    return {
      ...item,
      id: item.artwork_id,
      image: (isSingleVariant && selectedProducts[0].image) ? selectedProducts[0].image : item.image,
      qty,
      unitPrice,
      subtotal,
    };
  });

  const selectedItems = cartItems.filter((item) => Number(item.is_sold_out) !== 1 &&
    Array.isArray(selection) && selection.includes(String(item.artwork_id)));
  const selectedIds = selectedItems.map((item) => String(item.artwork_id));
  const subtotal = selectedItems.reduce((s, i) => s + i.subtotal, 0);
  // No shipping fee: delivery is arranged with a third-party courier.
  const total = subtotal;

  if (cartErrorMessage && !loading) {
    return (
      <Box sx={{ minWidth: 0 }}>
        <Helmet titleTemplate="%s - ArtMatch">
          <title>Cart</title>
        </Helmet>
        <ConnectionErrorPanel title="Cart Unavailable" onRetry={() => setRefresh((value) => value + 1)} />
      </Box>
    );
  }

  const onRemove = async (artworkId) => {
    if (deletingRef.current) return;
    deletingRef.current = true;
    setDeleting(true);
    setDeleteError("");
    try {
      const result = await removeFromCart(artworkId);
      setItems((prev) => prev.filter((item) => String(item.artwork_id) !== String(artworkId)));
      setSelectedCart(null);
      showSnackbar(result?.message || "Artwork removed from cart", "success");
    } catch (err) {
      const message = err.message || "Unable to remove this artwork. Please try again.";
      setDeleteError(message);
      showSnackbar(message, "error");
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  };

  return (
    <Box
      sx={{
        py: { xs: 2, md: 3, lg: 4 },
        minHeight: "100vh",
        backgroundColor: "background.default",
        color: "text.primary",
      }}
    >
      <Container maxWidth="lg">
        <Helmet titleTemplate="%s - ArtMatch">
          <title>Cart</title>
        </Helmet>

        {cartErrorMessage && (
          <Alert severity="error" action={<Button color="inherit" onClick={() => setRefresh((value) => value + 1)}>Retry</Button>} sx={{ mb: 2 }}>
            {cartErrorMessage}
          </Alert>
        )}
        {loading ? (
          <CartLoadingSkeleton />
        ) : cartItems.length === 0 ? !cartErrorMessage && (
          <Paper
            elevation={0}
            sx={{
              mt: { xs: 4, md: 6 },
              p: { xs: 3, md: 6 },
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 3,
              textAlign: "center",
            }}
          >
            <Typography variant="h6">Your cart is empty</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Browse artworks and add your favorites to the cart.
            </Typography>
            <Button
              color="error"
              variant="contained"
              component={Link}
              to="/artworks"
              sx={{
                mt: 3,
                borderRadius: 999,
                textTransform: "none",
                
                px: 3,
                color: "white",
                fontWeight: "bold",
              }}
            >
              Explore artworks
            </Button>
          </Paper>
        ) : (
          <Grid container spacing={4} sx={{ mt: 2, alignItems: "flex-start" }}>
            <Grid size={{ xs: 12, md: 8 }} sx={{ minWidth: 0 }}>
              <CartTable
                items={cartItems}
                selectedIds={selectedIds}
                onSelectionChange={setSelection}
                removing={deleting}
                cartQuantities={cartQuantities}
                onQuantityChange={async (artworkId, quantity) => {
                  const matchedItem = items.find((item) => String(item.artwork_id) === String(artworkId));
                  const remainingStock = matchedItem ? getArtworkRemainingStock(matchedItem) : null;
                  const maxStock = remainingStock !== null ? Math.max(1, remainingStock) : 999999;
                  const nextQuantity = Math.min(Math.max(1, Number(quantity) || 1), maxStock);
                  setCartQuantities((current) => ({
                    ...current,
                    [String(artworkId)]: nextQuantity,
                  }));
                  setItems((current) =>
                    current.map((item) => {
                      if (String(item.artwork_id) !== String(artworkId)) return item;
                      const selections = Array.isArray(item.selected_products) ? item.selected_products : [];
                      const updatedSelections = selections.length === 1
                        ? [{ ...selections[0], quantity: nextQuantity }]
                        : selections;
                      return {
                        ...item,
                        quantity: nextQuantity,
                        selected_products: updatedSelections,
                      };
                    }),
                  );

                  try {
                    await updateCartItemQuantity(artworkId, nextQuantity);
                  } catch (error) {
                    setCartErrorMessage(error.message || "Unable to update quantity.");
                  }
                }}
                onRemove={(item) => { setDeleteError(""); setSelectedCart(item); }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }} sx={{ minWidth: 0 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 3,
                  width: "100%",
                  boxSizing: "border-box",
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  Order summary
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedItems.length} of {cartItems.length} artworks selected ({selectedItems.reduce((sum, item) => sum + item.qty, 0)} {selectedItems.reduce((sum, item) => sum + item.qty, 0) === 1 ? "unit" : "units"})
                </Typography>
                <Stack spacing={1.5} sx={{ mt: 2 }}>
                  <Row label="Subtotal" value={`₱${subtotal.toLocaleString()}`} />
                  <Divider />
                  <Row label="Total" value={`₱${total.toLocaleString()}`} bold />
                </Stack>
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  disabled={selectedItems.length === 0 || deleting}
                  onClick={() => setConfirmingOrder(true)}
                  color="error"
                  sx={{
                    mt: 4,
                    borderRadius: 999,
                    textTransform: "none",
                    py: 1.25,
                    fontWeight: 600,
                    color: "#fff",
                  }}
                >
                  Checkout
                </Button>
                <Button
                  component={Link}
                  to="/artworks"
                  fullWidth
                  sx={{
                    mt: 1.5,
                    textTransform: "none",
                    color: "text.secondary",
                  }}
                >
                  Continue shopping
                </Button>
              </Paper>
            </Grid>
          </Grid>
        )}
        <CartConfirm
          open={confirmingOrder}
          selectedItems={selectedItems}
          total={total}
          handleClose={closeOrderConfirmation}
          onSubmit={continueToCheckout}
        />
        <CartDelete
          open={Boolean(selectedCart)}
          selectedCart={selectedCart}
          handleClose={closeDelete}
          onSubmit={onRemove}
          deleting={deleting}
          error={deleteError}
        />
        {/* Snackbar Notification */}
        <AppSnackbar
          open={snackbarOpen}
          message={snackbarMessage}
          severity={snackbarSeverity}
          onClose={closeSnackbar}
        />
      </Container>
    </Box>
  );
}
const CartLoadingSkeleton = () => (
  <Grid
    container
    spacing={4}
    sx={{ mt: 2, alignItems: "flex-start" }}
    role="status"
    aria-label="Loading cart"
  >
    <Grid size={{ xs: 12, md: 8 }} sx={{ minWidth: 0 }}>
      <Paper
        variant="outlined"
        sx={{ borderRadius: 3, overflow: "hidden", minWidth: 0 }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ px: { xs: 2, sm: 3 }, py: 2.5 }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Skeleton width={110} height={28} />
            <Skeleton width={210} height={20} sx={{ mt: 0.5, maxWidth: "100%" }} />
          </Box>
          <Skeleton
            variant="rounded"
            width={68}
            height={24}
            sx={{ borderRadius: 999, flexShrink: 0, ml: 1 }}
          />
        </Stack>

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            px: { xs: 2, sm: 3 },
            py: 1.5,
            bgcolor: "action.hover",
            borderTop: "1px solid",
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Skeleton width={96} height={20} />
          <Skeleton width={104} height={20} />
        </Stack>

        <Stack divider={<Divider />}>
          {[0, 1, 2].map((index) => (
            <Stack
              key={`cart-skeleton-row-${index}`}
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              spacing={2}
              sx={{ px: { xs: 2, sm: 3 }, py: 2.5 }}
            >
              <Stack
                direction="row"
                spacing={1.5}
                alignItems="center"
                sx={{ minWidth: 0, flex: 1 }}
              >
                <Skeleton
                  variant="rounded"
                  width={18}
                  height={18}
                  sx={{ borderRadius: 0.75, flexShrink: 0 }}
                />
                <Skeleton
                  variant="rounded"
                  sx={{
                    width: { xs: 64, sm: 88 },
                    height: { xs: 64, sm: 88 },
                    borderRadius: 2,
                    flexShrink: 0,
                  }}
                />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Skeleton width="68%" height={22} />
                  <Skeleton width="42%" height={18} sx={{ mt: 0.5 }} />
                  <Skeleton
                    variant="rounded"
                    width={76}
                    height={22}
                    sx={{ mt: 1, borderRadius: 999 }}
                  />
                </Box>
              </Stack>

              <Stack
                direction="row"
                spacing={1.5}
                alignItems="center"
                sx={{ flexShrink: 0 }}
              >
                <Box sx={{ textAlign: "right" }}>
                  <Skeleton width={76} height={22} sx={{ ml: "auto" }} />
                  <Skeleton
                    variant="rounded"
                    width={72}
                    height={28}
                    sx={{ mt: 0.75, ml: "auto", borderRadius: 1.5 }}
                  />
                </Box>
                <Skeleton variant="circular" width={28} height={28} />
              </Stack>
            </Stack>
          ))}
        </Stack>
      </Paper>
    </Grid>

    <Grid size={{ xs: 12, md: 4 }} sx={{ minWidth: 0 }}>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 3,
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <Skeleton width={140} height={28} />
        <Skeleton width="78%" height={20} sx={{ mt: 1 }} />
        <Stack spacing={1.5} sx={{ mt: 2.5 }}>
          <Stack direction="row" justifyContent="space-between">
            <Skeleton width={64} height={20} />
            <Skeleton width={84} height={20} />
          </Stack>
          <Divider />
          <Stack direction="row" justifyContent="space-between">
            <Skeleton width={52} height={22} />
            <Skeleton width={96} height={22} />
          </Stack>
        </Stack>
        <Skeleton
          variant="rounded"
          height={46}
          sx={{ mt: 4, borderRadius: 999 }}
        />
        <Skeleton width="52%" height={22} sx={{ mt: 2, mx: "auto" }} />
      </Paper>
    </Grid>
  </Grid>
);

const Row = ({ label, value, bold }) => {
  return (
    <Stack direction="row" sx={{ justifyContent: "space-between" }}>
      <Typography
        variant="body2"
        color={bold ? "text.primary" : "text.secondary"}
        sx={{ fontWeight: bold ? 700 : 400 }}
      >
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: bold ? 700 : 500 }}>
        {value}
      </Typography>
    </Stack>
  );
};
