import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Grid,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Snackbar,
  Slide,
  Stack,
  Container,
} from "@mui/material";
// Icons
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import HomeIcon from "@mui/icons-material/Home";
import PersonIcon from "@mui/icons-material/Person";
import RemoveIcon from "@mui/icons-material/Remove";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import IconButton from "@mui/material/IconButton";
import { fetchCart, removeFromCart } from "../../api/buyer/cartAPI";

// Slide Transition for Snackbar
function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function Cart() {
  const [items, setItems] = useState([]);
  const [cartErrorMessage, setCartErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const navigate = useNavigate();


  const loadCart = async () => {
    try {
      setLoading(true);
      setCartErrorMessage("");
      const response = await fetchCart();
      setItems(Array.isArray(response) ? response : []);
    } catch (err) {
      setItems([]);
      setCartErrorMessage("Failed to load cart: " + err.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadCart();
  }, []);

  const cartItems = items.map((item) => ({
    ...item,
    id: item.artwork_id,
    qty: 1,
    subtotal: Number(item.price || 0),
    imageUrl: item.image?.startsWith("http")
      ? item.image
      : `http://localhost:5000/uploads/seller/uploadArtwork/${encodeURIComponent(item.image || "")}`,
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

  // Snackbar handlers
  const showSnackbar = (message, severity = "success") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity); // Set it to "success" or "error"
    setSnackbarOpen(true);
  };

  const closeSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "success":
        return "success.light"; // Green
      case "error":
        return "error.light"; // Red
      default:
        return "primary.light"; //
    }
  };

  return (
    <Box sx={{ py: { xs: 2, md: 3 } }}>
      <Container maxWidth="lg">
        <Helmet titleTemplate="%s - ArtMatch">
          <title>Cart</title>
        </Helmet>
        <Typography
          variant="h3"
          sx={{
            fontSize: { xs: 28, sm: 32, md: 40 },
            fontWeight: 700,
            mb: { xs: 2, md: 4 },
            textAlign: { xs: "left", md: "left" },
          }}
        >
          Shopping cart
        </Typography>

        {cartItems.length === 0 ? (
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
              variant="contained"
              component={Link}
              to="/artworks"
              sx={{ mt: 3, borderRadius: 999, textTransform: "none", px: 3 }}
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
                              <Box
                                sx={{
                                  width: { xs: 56, sm: 72 },
                                  height: { xs: 56, sm: 72 },
                                  borderRadius: 2,
                                  backgroundImage: `url(${item.imageUrl})`,
                                  backgroundSize: "cover",
                                  backgroundPosition: "center",
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
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell align="right">₱{item.price}</TableCell>
                          <TableCell align="right">
                            <IconButton onClick={() => onRemove(item.artwork_id)}>
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
        {/* Snackbar Notification */}
        {/* //For Future Use 
          <Snackbar
            open={snackbarOpen}
            severity={snackbarSeverity}
            variant="filled"
            autoHideDuration={3000}
            onClose={closeSnackbar}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            TransitionComponent={SlideTransition}
          >
            <Alert
              onClose={closeSnackbar}
              severity={snackbarSeverity}
              sx={{
                width: "100%",
                backgroundColor: getSeverityColor(snackbarSeverity),
                color: "#fff",
                "& .MuiAlert-icon": {
                  color: "#fff",
                },
              }}
            >
              {snackbarMessage}
            </Alert>
          </Snackbar>
          */}
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
