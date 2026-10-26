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
  CircularProgress,
  Paper,
  Grid,
  Divider,
  Typography,
  Stack,
  Container,
} from "@mui/material";
import { fetchCart, removeFromCart } from "../../api/buyer/cartAPI";

export default function Cart() {
  const [items, setItems] = useState([]);
  const [cartErrorMessage, setCartErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [selection, setSelection] = useState(null);
  const navigate = useNavigate();
  const [selectedCart, setSelectedCart] = useState(null);
  const [confirmingOrder, setConfirmingOrder] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const deletingRef = useRef(false);

  const closeDelete = () => {
    if (deletingRef.current) return;
    setSelectedCart(null);
    setDeleteError("");
  };
  const closeOrderConfirmation = () => setConfirmingOrder(false);
  const continueToCheckout = (artworkIds) => {
    if (!artworkIds.length) return;
    setConfirmingOrder(false);
    navigate(`/buyer/checkout?artwork_ids=${artworkIds.join(",")}`);
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

  const cartItems = items.map((item) => ({
    ...item,
    id: item.artwork_id,
    qty: 1,
    subtotal: Number(item.price || 0),
  }));

  const selectedItems = cartItems.filter((item) => Number(item.is_sold_out) !== 1 &&
    (selection === null || selection.includes(String(item.artwork_id))));
  const selectedIds = selectedItems.map((item) => String(item.artwork_id));
  const subtotal = selectedItems.reduce((s, i) => s + i.subtotal, 0);
  // No shipping fee: delivery is arranged with a third-party courier.
  const total = subtotal;

  const onRemove = async (artworkId) => {
    if (deletingRef.current) return;
    deletingRef.current = true;
    setDeleting(true);
    setDeleteError("");
    try {
      await removeFromCart(artworkId);
      setItems((prev) => prev.filter((item) => String(item.artwork_id) !== String(artworkId)));
      setSelectedCart(null);
    } catch (err) {
      setDeleteError(err.message || "Unable to remove this artwork. Please try again.");
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
          <Box role="status" aria-label="Loading cart" sx={{ display: "grid", placeItems: "center", py: 6 }}><CircularProgress /></Box>
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
                <Typography variant="body2" color="text.secondary">{selectedItems.length} of {cartItems.length} artworks selected</Typography>
                <Stack spacing={1.5} sx={{ mt: 2 }}>
                  <Row label="Subtotal" value={`₱${subtotal}`} />
                  <Divider />
                  <Row label="Total" value={`₱${total}`} bold />
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
      </Container>
    </Box>
  );
}
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
