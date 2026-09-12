import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  Divider,
  Alert,
  CircularProgress,
  Paper,
  Radio,
  RadioGroup,
  FormControlLabel,
  Stack,
  Typography,
  Chip,
  Grid,
} from "@mui/material";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import PaymentOutlinedIcon from "@mui/icons-material/PaymentOutlined";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import LocalAtmOutlinedIcon from "@mui/icons-material/LocalAtmOutlined";
import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined";

import { fetchCart } from "../../api/buyer/cartAPI";
import { fetchAddresses } from "../../api/buyer/addressAPI";

export default function Checkout() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [currentAddress, setCurrentAddress] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("gcash");
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadCheckoutData = async () => {
      try {
        setPageLoading(true);
        const [cart, addresses] = await Promise.all([
          fetchCart(),
          fetchAddresses(),
        ]);
        setCartItems(Array.isArray(cart) ? cart : []);
        const addressList = Array.isArray(addresses) ? addresses : [];
        setCurrentAddress(
          addressList.find((address) => Boolean(address.is_current)) ||
            addressList[0] ||
            null
        );
      } catch (loadError) {
        setError(loadError.message || "Unable to load checkout data");
      } finally {
        setPageLoading(false);
      }
    };

    loadCheckoutData();
  }, []);

  const profile = {
    firstName: localStorage.getItem("buyer_first_name") || "Customer",
    lastName: localStorage.getItem("buyer_last_name") || "",
    email: localStorage.getItem("buyer_email") || "",
  };

  const subtotal = cartItems.reduce(
    (sum, item) => sum + Number(item.price || 0),
    0
  );
  const shipping = cartItems.length > 0 ? 150 : 0;
  const total = subtotal + shipping;

  const handlePlaceOrder = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate("/buyer/profile/orders");
    }, 1000);
  };

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 3, md: 6 }, px: { md: 5 } }}>
      <Helmet titleTemplate="%s - ArtMatch">
        <title>Checkout</title>
      </Helmet>

      <Typography variant="h4" sx={{ fontWeight: 800, mb: 4, letterSpacing: -0.5 }}>
        Checkout
      </Typography>

      {pageLoading && (
        <Box sx={{ display: "grid", placeItems: "center", minHeight: 300 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {!pageLoading && !error && (
        <Grid
          container
          spacing={4}
          sx={{
            display: { xs: "flex", lg: "grid" },
            gridTemplateColumns: { lg: "minmax(0, 7fr) minmax(0, 3fr)" },
          }}
        >
          <Grid item xs={12} md={8}>
            <Stack spacing={3}>
              {/* Shipping Information Card */}
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 3, sm: 4 },
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 3.5,
                  bgcolor: "#ffffff",
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 2,
                      bgcolor: "primary.50",
                      color: "primary.main",
                      display: "flex",
                    }}
                  >
                    <LocalShippingOutlinedIcon />
                  </Box>
                  <Typography variant="h6" fontWeight={700}>
                    Shipping Information
                  </Typography>
                </Stack>

                {/* Recipient Snapshot */}
                <Box
                  sx={{
                    p: 2.5,
                    mb: 3,
                    borderRadius: 2.5,
                    bgcolor: "grey.50",
                    border: "1px solid",
                    borderColor: "grey.200",
                  }}
                >
                  <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Recipient Details
                  </Typography>
                  <Typography variant="body1" fontWeight={700} sx={{ mt: 0.5 }}>
                    {profile.firstName} {profile.lastName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {profile.email || "No email provided"}
                  </Typography>
                </Box>

                {/* Delivery Address */}
                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Delivery Address
                </Typography>

                {currentAddress ? (
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2.5,
                      mt: 1,
                      borderRadius: 2.5,
                      borderColor: "primary.main",
                      bgcolor: "rgba(175, 79, 79, 0.02)",
                    }}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="flex-start">
                      <LocationOnOutlinedIcon color="primary" sx={{ mt: 0.3 }} />
                      <Box sx={{ flexGrow: 1 }}>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                          <Typography variant="subtitle2" fontWeight={700}>
                            Shipping Destination
                          </Typography>
                          {currentAddress.is_current && (
                            <Chip
                              icon={<CheckCircleIcon sx={{ fontSize: "12px !important" }} />}
                              label="Default"
                              size="small"
                              color="primary"
                              sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700 }}
                            />
                          )}
                        </Stack>
                        <Typography variant="body2" color="text.primary" sx={{ lineHeight: 1.5 }}>
                          {[
                            currentAddress.street_name,
                            currentAddress.barangay,
                            currentAddress.city,
                            currentAddress.province,
                            currentAddress.region,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5, fontWeight: 600 }}>
                          ZIP Code: {currentAddress.postal_code || "N/A"}
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                ) : (
                  <Alert severity="warning" sx={{ mt: 1, borderRadius: 2 }}>
                    No address selected. Please configure a default delivery address in your profile.
                  </Alert>
                )}
              </Paper>

              {/* Payment Method Card */}
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 3, sm: 4 },
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 3.5,
                  bgcolor: "#ffffff",
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 2,
                      bgcolor: "primary.50",
                      color: "primary.main",
                      display: "flex",
                    }}
                  >
                    <PaymentOutlinedIcon />
                  </Box>
                  <Typography variant="h6" fontWeight={700}>
                    Payment Options
                  </Typography>
                </Stack>

                <RadioGroup
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  sx={{ gap: 1.5 }}
                >
                  <PaymentOptionCard
                    value="gcash"
                    title="GCash"
                    subtitle="Fast and secure e-wallet transaction"
                    icon={<AccountBalanceWalletOutlinedIcon color="primary" />}
                    selectedValue={paymentMethod}
                  />

                  <PaymentOptionCard
                    value="cod"
                    title="Cash on Delivery"
                    subtitle="Pay in cash upon artwork delivery"
                    icon={<LocalAtmOutlinedIcon color="primary" />}
                    selectedValue={paymentMethod}
                  />

                  <PaymentOptionCard
                    value="bank"
                    title="Bank Transfer"
                    subtitle="Direct deposit or online bank transfer"
                    icon={<AccountBalanceOutlinedIcon color="primary" />}
                    selectedValue={paymentMethod}
                  />
                </RadioGroup>
              </Paper>
            </Stack>
          </Grid>

          {/* Right Sidebar: Compact Summary (4 columns out of 12) */}
          <Grid item xs={12} md={4}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 3, sm: 3.5 },
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 3.5,
                position: { md: "sticky" },
                top: 96,
                bgcolor: "#ffffff",
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2.5 }}>
                <ShoppingBagOutlinedIcon color="action" />
                <Typography variant="h6" fontWeight={700}>
                  Order Details
                </Typography>
              </Stack>

              <Stack spacing={2} sx={{ my: 2, maxHeight: 320, overflowY: "auto", pr: 0.5 }}>
                {cartItems.map((item) => (
                  <Stack
                    key={item.cart_item_id || item.artwork_id}
                    direction="row"
                    spacing={2}
                    alignItems="center"
                  >
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 2.5,
                        flexShrink: 0,
                        backgroundImage: `url(${
                          item.image?.startsWith("http")
                            ? item.image
                            : `http://localhost:5000/uploads/seller/uploadArtwork/${encodeURIComponent(
                                item.image || ""
                              )}`
                        })`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        border: "1px solid",
                        borderColor: "divider",
                      }}
                    />

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle2" fontWeight={700} noWrap>
                        {item.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Original Artwork
                      </Typography>
                    </Box>

                    <Typography variant="subtitle2" fontWeight={700}>
                      ₱{Number(item.price || 0).toLocaleString()}
                    </Typography>
                  </Stack>
                ))}
              </Stack>

              <Divider sx={{ my: 2.5 }} />

              <Stack spacing={1.5}>
                <SummaryRow label="Subtotal" value={`₱${subtotal.toLocaleString()}`} />
                <SummaryRow label="Estimated Shipping" value={`₱${shipping.toLocaleString()}`} />
                <Divider sx={{ my: 1 }} />
                <SummaryRow label="Total Amount" value={`₱${total.toLocaleString()}`} bold />
              </Stack>

              <Button
                variant="contained"
                fullWidth
                size="large"
                disableElevation
                sx={{
                  mt: 3.5,
                  borderRadius: 3,
                  textTransform: "none",
                  py: 1.5,
                  fontSize: "1rem",
                  fontWeight: 700,
                }}
                disabled={cartItems.length === 0 || !currentAddress || loading}
                onClick={handlePlaceOrder}
              >
                {loading ? "Processing Order..." : "Place Order"}
              </Button>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Container>
  );
}

function PaymentOptionCard({ value, title, subtitle, icon, selectedValue }) {
  const isSelected = selectedValue === value;
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 2.5,
        cursor: "pointer",
        borderColor: isSelected ? "primary.main" : "divider",
        borderWidth: isSelected ? 2 : 1,
        bgcolor: isSelected ? "rgba(175, 79, 79, 0.02)" : "#fff",
        transition: "all 0.2s ease-in-out",
        "&:hover": {
          borderColor: "primary.main",
        },
      }}
    >
      <FormControlLabel
        value={value}
        control={<Radio size="small" />}
        sx={{ width: "100%", m: 0, alignItems: "center" }}
        label={
          <Stack direction="row" spacing={2} alignItems="center" sx={{ ml: 1, width: "100%" }}>
            <Box sx={{ display: "flex" }}>{icon}</Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                {title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            </Box>
          </Stack>
        }
      />
    </Paper>
  );
}

function SummaryRow({ label, value, bold = false }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Typography
        variant={bold ? "subtitle1" : "body2"}
        color={bold ? "text.primary" : "text.secondary"}
        fontWeight={bold ? 800 : 500}
      >
        {label}
      </Typography>

      <Typography
        variant={bold ? "subtitle1" : "body2"}
        color={bold ? "primary.main" : "text.primary"}
        fontWeight={bold ? 800 : 600}
      >
        {value}
      </Typography>
    </Stack>
  );
}