import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import WatermarkedArtworkImage from "../../components/buyer/Artwork/WatermarkedArtworkImage";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Chip,
  Paper,
  Grid,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Stack,
  Container,
} from "@mui/material";
// Icons
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import IconButton from "@mui/material/IconButton";
import { fetchCart, removeFromCart } from "../../api/buyer/cartAPI";

export default function Cart() {
  const [items, setItems] = useState([]);
  const [cartErrorMessage, setCartErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const navigate = useNavigate();

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
        if (previousIds !== null && previousIds !== ids) {
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

  const subtotal = cartItems.reduce((s, i) => s + i.subtotal, 0);
  const shipping = cartItems.length > 0 ? 100 : 0;
  const total = subtotal + shipping;

  const onRemove = async (artworkId) => {
    try {
      await removeFromCart(artworkId);
      setItems((prev) => prev.filter((item) => item.artwork_id !== artworkId));
    } catch (err) {
      setCartErrorMessage(err.message);
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
            <Grid>
              <Paper
                elevation={0}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 3,
                  overflow: "hidden",
                  p: { xs: 1, md: 0 },
                }}
              >
                <Box sx={{ overflowX: "auto" }}>
                  <Table
                    sx={{ minWidth: { xs: 100, md: 500, lg: 750 } }}
                    size="small"
                  >
                    <TableHead>
                      <TableRow>
                        <TableCell>Artwork</TableCell>
                        <TableCell align="right">Price</TableCell>
                        <TableCell align="right"> </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {cartItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell sx={{ py: { xs: 1.5, md: 2 } }}>
                            <Stack
                              direction="row"
                              spacing={2}
                              sx={{ alignItems: "center" }}
                            >
                              <WatermarkedArtworkImage
                                image={item.image}
                                alt={item.title || "Artwork"}
                                sx={{
                                  width: { xs: 56, sm: 72 },
                                  height: { xs: 56, sm: 72 },
                                  borderRadius: 2,
                                  objectFit: "cover",
                                  flexShrink: 0,
                                  bgcolor: "action.hover",
                                }}
                              />
                              <Box>
                                <Typography
                                  variant="subtitle2"
                                  sx={{
                                    fontWeight: 600,
                                    fontSize: { xs: 14, md: 15 },
                                  }}
                                >
                                  {item.title}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  {item.artist}
                                </Typography>
                                <Chip
                                  label={
                                    Number(item.is_sold_out) === 1
                                      ? "Sold out"
                                      : "Available"
                                  }
                                  size="small"
                                  color={
                                    Number(item.is_sold_out) === 1
                                      ? "default"
                                      : "success"
                                  }
                                  sx={{
                                    mt: 0.5,
                                    height: 22,
                                    color:
                                      Number(item.is_sold_out) === 1
                                        ? undefined
                                        : "#fff",
                                  }}
                                />
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell align="right">₱{item.price}</TableCell>
                          <TableCell align="right">
                            <IconButton
                              onClick={() => onRemove(item.artwork_id)}
                            >
                              <DeleteOutlineIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </Paper>
            </Grid>

            <Grid>
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 3, md: 4 },
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 3,
                  width: "100%",
                  maxWidth: { xs: "100%", md: 500, lg: 520 },
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  Order summary
                </Typography>
                <Stack spacing={1.5} sx={{ mt: 2 }}>
                  <Row label="Subtotal" value={`₱${subtotal}`} />
                  <Row label="Shipping" value={`₱${shipping}`} />
                  <Divider />
                  <Row label="Total" value={`₱${total}`} bold />
                </Stack>
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  onClick={() => navigate("/buyer/checkout")}
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
